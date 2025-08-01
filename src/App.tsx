import React, { useState, useEffect, useContext, createContext } from 'react';
import './App.css';

interface Repo {
  name: string;
  full_name: string;
  description: string;
}

interface User {
  login: string;
  avatar_url: string;
}

interface AppState {
  username: string;
  setUsername: (name: string) => void;
  projects: Repo[];
  setProjects: (repos: Repo[]) => void;
  selectedRepo: string | null;
  setSelectedRepo: (repoName: string | null) => void;
  suggestedUsers: User[];
  setSuggestedUsers: (users: User[]) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState('');
  const [projects, setProjects] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);

  return (
    <AppContext.Provider
      value={{
        username,
        setUsername,
        projects,
        setProjects,
        selectedRepo,
        setSelectedRepo,
        suggestedUsers,
        setSuggestedUsers,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

const SearchBar: React.FC = () => {
  const { setSuggestedUsers, setUsername, setProjects, setSelectedRepo } = useAppContext();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const searchUsers = async () => {
    if (!input) return;
    setSuggestedUsers([]);
    setLoading(true);
    setUsername('');
    setProjects([]);
    setSelectedRepo(null);

    try {
      const res = await fetch(`https://api.github.com/search/users?q=${input}`, {
        headers: { Authorization: GITHUB_TOKEN },
      });
      const data = await res.json();
      setSuggestedUsers(data.items || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="search-bar">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter GitHub username"
        />
        <button onClick={searchUsers}>Search</button>
      </div>
      {loading && <p className="loading-text">Loading users...</p>}
    </>
  );
};

const UserSuggestionList: React.FC<{
  results: User[];
  onSelect: (login: string) => void;
}> = ({ results, onSelect }) => {
  return (
    <ul className="user-list">
      {results.map((user) => (
        <li key={user.login} onClick={() => onSelect(user.login)}>
          <img src={user.avatar_url} alt={user.login} />
          <span>{user.login}</span>
        </li>
      ))}
    </ul>
  );
};

const ReadmeViewer: React.FC<{ repo: Repo }> = ({ repo }) => {
  const { username } = useAppContext();
  const [readme, setReadme] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReadme = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api.github.com/repos/${username}/${repo.name}/readme`, {
          headers: {
            Accept: 'application/vnd.github.v3.raw',
            Authorization: GITHUB_TOKEN,
          },
        });
        const text = await res.text();
        setReadme(res.ok ? text : 'README not found.');
      } catch (err) {
        setReadme('Error loading README.');
      } finally {
        setLoading(false);
      }
    };

    fetchReadme();
  }, [repo.name, username]);

  return (
    <div className="readme-box">
      <h4>README</h4>
      {loading ? <p>Loading README...</p> : <pre>{readme}</pre>}
    </div>
  );
};

const ProjectList: React.FC = () => {
  const { projects, selectedRepo, setSelectedRepo } = useAppContext();

  const toggleReadme = (repoName: string) => {
    setSelectedRepo(selectedRepo === repoName ? null : repoName);
  };

  return (
    <div className="project-wrapper">
      {projects.map((repo) => (
        <div key={repo.name} className="repo-card">
          <div className="project-list-item">
            <strong>{repo.name}</strong>
            <p>{repo.description}</p>
            <button onClick={() => toggleReadme(repo.name)}>
              {selectedRepo === repo.name ? 'Hide README' : 'Show README'}
            </button>
          </div>
          {selectedRepo === repo.name && <ReadmeViewer repo={repo} />}
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const { suggestedUsers, setSuggestedUsers, setUsername, setProjects } = useAppContext();
  const [loadingProjects, setLoadingProjects] = useState(false);

  const handleSelectUser = async (login: string) => {
    setUsername(login);
    setSuggestedUsers([]);
    setLoadingProjects(true);
    try {
      const res = await fetch(`https://api.github.com/users/${login}/repos`, {
        headers: { Authorization: GITHUB_TOKEN },
      });
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error('Error loading repos');
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  return (
    <div className="container">
      <h1>GitHub Project Viewer</h1>
      <SearchBar />
      <div className="content">
        {suggestedUsers.length > 0 ? (
          <UserSuggestionList results={suggestedUsers} onSelect={handleSelectUser} />
        ) : loadingProjects ? (
          <p className="loading-text">Loading repositories...</p>
        ) : (
          <ProjectList />
        )}
      </div>
    </div>
  );
};

export default () => (
  <AppProvider>
    <App />
  </AppProvider>
);
