import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import api from "../api/axios";
import ProjectCard from "../components/ProjectCard";
import "./Search.css";

const AVATAR_BASE = "http://localhost:5000/uploads/";

export default function Search() {
  const location = useLocation();
  const q = new URLSearchParams(location.search).get("q") || "";
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    api.get(`/users/search?q=${encodeURIComponent(q)}`)
      .then(res => {
        setUsers(res.data.users || []);
        setProjects(res.data.projects || []);
      })
      .finally(() => setLoading(false));
  }, [q]);

  if (!q) return <div className="search-page"><p className="empty">Type something to search.</p></div>;

  return (
    <div className="search-page">
      <h1 className="page-title">Results for "{q}"</h1>

      {loading ? (
        <p className="loading">Searching...</p>
      ) : (
        <>
          <section className="search-section">
            <h2>Users</h2>
            {users.length === 0 ? (
              <p className="empty">No users found.</p>
            ) : (
              <div className="search-users">
                {users.map(u => (
                  <Link key={u._id} to={`/profile/${u._id}`} className="search-user-card">
                    {u.avatar
                      ? <img src={`${AVATAR_BASE}${u.avatar}`} alt="" className="search-avatar" />
                      : <div className="search-avatar-placeholder">{u.username[0].toUpperCase()}</div>
                    }
                    <span>@{u.username}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="search-section">
            <h2>Projects</h2>
            {projects.length === 0 ? (
              <p className="empty">No projects found.</p>
            ) : (
              <div className="search-projects">
                {projects.map(p => (
                  <ProjectCard key={p._id} project={p} compact />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
