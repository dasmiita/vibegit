import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./ProjectCard.css";

export default function ProjectCard({ project, compact = false, onDelete }) {
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

  const username = project.userId?.username || "unknown";
  const userId = project.userId?._id || project.userId;
  const isOwner = user && user.id === (project.userId?._id || project.userId)?.toString();

  return (
    <div className={`project-card ${compact ? "compact" : ""}`} onClick={() => navigate(`/projects/${project._id}`)}>
      <div className="card-header">
        <Link to={`/profile/${userId}`} className="card-username" onClick={e => e.stopPropagation()}>
          @{username}
        </Link>
        {isOwner && <button className="delete-btn" onClick={handleDelete}>✕</button>}
      </div>

      <h3 className="card-title">{project.title}</h3>
      <p className="card-desc">{project.description}</p>

      {project.tags?.length > 0 && (
        <div className="card-tags">
          {project.tags.map(tag => <span key={tag} className="tag">#{tag}</span>)}
        </div>
      )}

      {!compact && project.codeSnippet && (
        <pre className="card-snippet">{project.codeSnippet}</pre>
      )}

      <div className="card-footer">
        <div className="card-actions">
          <button className={`like-btn ${liked ? "liked" : ""}`} onClick={handleLike}>
            ♥ {likes}
          </button>
          <span className="comment-count">💬 {project.comments?.length || 0}</span>
        </div>
        <span className="card-date">{new Date(project.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
