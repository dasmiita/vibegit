import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./ProjectDetail.css";

const BASE = "http://localhost:5000/uploads/";
const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
const CODE_EXTS  = ["js", "jsx", "ts", "tsx", "py", "html", "css", "json", "md", "txt", "sh", "java", "c", "cpp", "go", "rs"];

const STATUS_BADGE = {
  "completed":   { icon: "✅", label: "Completed",   cls: "status-completed" },
  "in-progress": { icon: "🚧", label: "In Progress", cls: "status-in-progress" },
  "idea":        { icon: "💡", label: "Idea",         cls: "status-idea" }
};

function getExt(name) { return name.split(".").pop().toLowerCase(); }
function isImage(name) { return IMAGE_EXTS.includes(getExt(name)); }
function isCode(name)  { return CODE_EXTS.includes(getExt(name)); }

function FileViewer({ file }) {
  const [expanded, setExpanded] = useState(false);
  const [codeContent, setCodeContent] = useState(null);
  const ext = getExt(file.name);
  const url = `${BASE}${file.path}`;

  const loadCode = async () => {
    if (codeContent !== null) { setExpanded(e => !e); return; }
    try {
      const res = await fetch(url);
      const text = await res.text();
      setCodeContent(text);
      setExpanded(true);
    } catch { setCodeContent("Could not load file."); setExpanded(true); }
  };

  const fmt = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  return (
    <div className="file-viewer-item">
      <div className="file-row">
        <span className="file-icon">{isImage(file.name) ? "🖼️" : isCode(file.name) ? "📝" : "📄"}</span>
        <span className="file-name">{file.name}</span>
        <span className="file-ext">.{ext}</span>
        <span className="file-size">{fmt(file.size)}</span>
        <div className="file-actions">
          {(isCode(file.name) || isImage(file.name)) && (
            <button className="file-action-btn" onClick={loadCode}>
              {expanded ? "▲ Hide" : "▼ Preview"}
            </button>
          )}
          <a href={url} download={file.name} className="file-action-btn">⬇ Download</a>
        </div>
      </div>
      {expanded && (
        <div className="file-preview-area">
          {isImage(file.name)
            ? <img src={url} alt={file.name} className="file-img-preview" />
            : <pre className="file-code-preview">{codeContent}</pre>
          }
        </div>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [remixing, setRemixing] = useState(false);
  const [activeVersion, setActiveVersion] = useState(null); // null = latest

  useEffect(() => {
    api.get(`/projects/${id}`).then(res => {
      setProject(res.data);
      setLikes(res.data.likes?.length || 0);
      setLiked(user ? res.data.likes?.map(i => i.toString()).includes(user.id) : false);
    }).finally(() => setLoading(false));
  }, [id, user]);

  const handleLike = async () => {
    if (!user) return navigate("/login");
    const res = await api.post(`/projects/${id}/like`);
    setLikes(res.data.likes);
    setLiked(res.data.liked);
  };

  const handleRemix = async () => {
    if (!user) return navigate("/login");
    setRemixing(true);
    try {
      const res = await api.post(`/projects/${id}/remix`);
      navigate(`/projects/${res.data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Could not remix");
    } finally {
      setRemixing(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const res = await api.post(`/projects/${id}/comments`, { text: comment });
    setProject(prev => ({ ...prev, comments: res.data }));
    setComment("");
  };

  const handleDeleteComment = async (commentId) => {
    await api.delete(`/projects/${id}/comments/${commentId}`);
    setProject(prev => ({ ...prev, comments: prev.comments.filter(c => c._id !== commentId) }));
  };

  if (loading) return <p className="loading">Loading project...</p>;
  if (!project) return <p className="loading">Project not found.</p>;

  const username = project.userId?.username || "unknown";
  const userId = project.userId?._id || project.userId;
  const avatarUrl = project.userId?.avatar ? `${BASE}${project.userId.avatar}` : null;
  const badge = STATUS_BADGE[project.status] || STATUS_BADGE["idea"];
  const isOwner = user && user.id === userId?.toString();

  return (
    <div className="detail-page">
      <div className="detail-main">

        {/* Header */}
        <div className="detail-header">
          <div className="detail-author">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="detail-avatar" />
              : <div className="detail-avatar-placeholder">{username[0].toUpperCase()}</div>
            }
            <div>
              <Link to={`/profile/${userId}`} className="detail-username">@{username}</Link>
              <p className="detail-date">{new Date(project.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          </div>
          <div className="detail-actions">
            <span className={`status-badge ${badge.cls}`}>{badge.icon} {badge.label}</span>
            <button className={`like-btn-lg ${liked ? "liked" : ""}`} onClick={handleLike}>♥ {likes}</button>
            {isOwner && (
              <button className="edit-project-btn" onClick={() => navigate(`/projects/${id}/edit`)}>✏️ Edit</button>
            )}
            {!isOwner && (
              <button className="remix-btn" onClick={handleRemix} disabled={remixing}>
                {remixing ? "Remixing..." : "🔀 Remix"}
              </button>
            )}
          </div>
        </div>

        <div className="detail-body">
        <h1 className="detail-title">{project.title}</h1>

        {project.remixedFrom && (
          <p className="detail-remix-label">
            🔀 Remixed from{" "}
            <Link to={`/projects/${project.remixedFrom._id}`} className="remix-source-link">
              {project.remixedFrom.title || "a project"}
            </Link>
          </p>
        )}

        {/* Tags */}
        {project.tags?.length > 0 && (
          <div className="detail-tags">
            {project.tags.map(tag => (
              <span
                key={tag}
                className="tag clickable-tag"
                onClick={() => navigate(`/?tag=${encodeURIComponent(tag)}`)}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <p className="detail-desc">{project.description}</p>

        {/* About section */}
        {(project.about?.features || project.about?.howItWorks || project.about?.futurePlans) && (
          <div className="detail-section about-block">
            <h3>📋 About This Project</h3>
            {project.about.features && (
              <div className="about-item">
                <span className="about-label">✨ Features</span>
                <p>{project.about.features}</p>
              </div>
            )}
            {project.about.howItWorks && (
              <div className="about-item">
                <span className="about-label">⚙️ How it works</span>
                <p>{project.about.howItWorks}</p>
              </div>
            )}
            {project.about.futurePlans && (
              <div className="about-item">
                <span className="about-label">🚀 Future plans</span>
                <p>{project.about.futurePlans}</p>
              </div>
            )}
          </div>
        )}

        {/* Code snippet */}
        {project.codeSnippet && (
          <div className="detail-section">
            <h3>Code Snippet</h3>
            <pre className="detail-snippet">{project.codeSnippet}</pre>
          </div>
        )}

        {/* Files */}
        {project.files?.length > 0 && (
          <div className="detail-section">
            <h3>📁 Files ({project.files.length})</h3>
            <div className="file-viewer-list">
              {project.files.map((file, i) => <FileViewer key={i} file={file} />)}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="detail-section">
          <h3>💬 Comments ({project.comments?.length || 0})</h3>
          {user && (
            <form onSubmit={handleComment} className="comment-form">
              <input placeholder="Add a comment..." value={comment} onChange={e => setComment(e.target.value)} />
              <button type="submit">Post</button>
            </form>
          )}
          <div className="comments-list">
            {project.comments?.length === 0 && <p className="no-comments">No comments yet. Be the first!</p>}
            {project.comments?.map(c => (
              <div key={c._id} className="comment-item">
                <div className="comment-top">
                  <Link to={`/profile/${c.userId?._id}`} className="comment-user">@{c.userId?.username || "unknown"}</Link>
                  <span className="comment-date">{new Date(c.createdAt).toLocaleDateString()}</span>
                  {user && user.id === c.userId?._id?.toString() && (
                    <button className="delete-comment-btn" onClick={() => handleDeleteComment(c._id)}>✕</button>
                  )}
                </div>
                <p className="comment-text">{c.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Version History */}
        {project.versions?.length > 0 && (
          <div className="detail-section">
            <h3>🕓 Version History ({project.versions.length + 1} versions)</h3>
            <div className="version-list">
              {/* Current version */}
              <div className={`version-item current ${activeVersion === null ? "active" : ""}`}
                onClick={() => setActiveVersion(null)}>
                <div className="version-meta">
                  <span className="version-badge">v{project.currentVersion} · Latest</span>
                  <span className="version-date">
                    {new Date(project.updatedAt || project.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="version-title">{project.title}</p>
              </div>

              {/* Previous versions — newest first */}
              {[...project.versions].reverse().map((v) => (
                <div
                  key={v.versionNumber}
                  className={`version-item ${activeVersion?.versionNumber === v.versionNumber ? "active" : ""}`}
                  onClick={() => setActiveVersion(prev =>
                    prev?.versionNumber === v.versionNumber ? null : v
                  )}
                >
                  <div className="version-meta">
                    <span className="version-badge">v{v.versionNumber}</span>
                    <span className="version-date">{new Date(v.editedAt).toLocaleString()}</span>
                  </div>
                  <p className="version-title">{v.title}</p>

                  {activeVersion?.versionNumber === v.versionNumber && (
                    <div className="version-preview">
                      <p className="version-desc">{v.description}</p>
                      {v.codeSnippet && <pre className="version-snippet">{v.codeSnippet}</pre>}
                      {(v.about?.features || v.about?.howItWorks || v.about?.futurePlans) && (
                        <div className="version-about">
                          {v.about.features    && <p><strong>✨ Features:</strong> {v.about.features}</p>}
                          {v.about.howItWorks  && <p><strong>⚙️ How it works:</strong> {v.about.howItWorks}</p>}
                          {v.about.futurePlans && <p><strong>🚀 Future plans:</strong> {v.about.futurePlans}</p>}
                        </div>
                      )}
                      {v.tags?.length > 0 && (
                        <div className="version-tags">
                          {v.tags.map(t => <span key={t} className="tag">#{t}</span>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        </div>{/* end detail-body */}

      </div>
    </div>
  );
}
