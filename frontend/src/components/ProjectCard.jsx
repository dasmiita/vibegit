import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./ProjectCard.css";

const STATUS_BADGE = {
  "completed":   { icon: "✅", label: "Completed",   cls: "status-completed" },
  "in-progress": { icon: "🚧", label: "In Progress", cls: "status-in-progress" },
  "idea":        { icon: "💡", label: "Idea",         cls: "status-idea" }
};

export default function ProjectCard({ project, compact = false, tile = false, onDelete }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likes, setLikes] = useState(project.likes?.length || 0);
  const [liked, setLiked] = useState(
    user ? project.likes?.map(id => id.toString()).includes(user.id) : false
  );

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return navigate("/login");
    try {
      const res = await api.post(`/projects/${project._id}/like`);
      setLikes(res.data.likes);
      setLiked(res.data.liked);
    } catch {}
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this project?")) return;
    try {
      await api.delete(`/projects/${project._id}`);
      onDelete && onDelete(project._id);
    } catch {}
  };

  const handleTagClick = (e, tag) => {
    e.stopPropagation();
    navigate(`/?tag=${encodeURIComponent(tag)}`);
  };

  const username = project.userId?.username || "unknown";
  const userId = project.userId?._id || project.userId;
  const isOwner = user && user.id === (project.userId?._id || project.userId)?.toString();
  const badge = STATUS_BADGE[project.status] || STATUS_BADGE["idea"];

  return (
    <div
      className={`project-card ${tile ? "tile" : ""}`}
      onClick={() => navigate(`/projects/${project._id}`)}
    >
      {tile && (
        <div className="tile-overlay">
          <span>♥ {likes}</span>
          <span>💬 {project.comments?.length || 0}</span>
        </div>
      )}

      <div className="card-header">
        <div className="card-header-left">
          {project.userId?.avatar ? (
            <img src={`http://localhost:5000/uploads/${project.userId.avatar}`} alt="" className="card-avatar" />
          ) : (
            <div className="card-avatar-placeholder">{username[0].toUpperCase()}</div>
          )}
          <Link to={`/profile/${userId}`} className="card-username" onClick={e => e.stopPropagation()}>
            @{username}
          </Link>
        </div>
        <div className="card-header-right">
          <span className={`status-badge ${badge.cls}`}>{badge.icon} {badge.label}</span>
          {isOwner && <button className="edit-btn" onClick={e => { e.stopPropagation(); navigate(`/projects/${project._id}/edit`); }}>✏️</button>}
          {isOwner && <button className="delete-btn" onClick={handleDelete}>✕</button>}
        </div>
      </div>

      <h3 className="card-title">{project.title}</h3>

      {project.remixedFrom && (
        <p className="remix-label">🔀 Remixed from <em>{project.remixedFrom.title || "a project"}</em></p>
      )}

      <p className="card-desc">{project.description}</p>

      {project.tags?.length > 0 && (
        <div className="card-tags">
          {project.tags.slice(0, 4).map(tag => (
            <span key={tag} className="tag clickable-tag" onClick={e => handleTagClick(e, tag)}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {!compact && !tile && project.codeSnippet && (
        <pre className="card-snippet">{project.codeSnippet}</pre>
      )}

      <div className="card-footer">
        <div className="card-actions">
          <button className={`like-btn ${liked ? "liked" : ""}`} onClick={handleLike}>♥ {likes}</button>
          <span className="comment-count">💬 {project.comments?.length || 0}</span>
          {project.remixCount > 0 && <span className="remix-count">🔀 {project.remixCount}</span>}
        </div>
        <span className="card-date">{new Date(project.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
