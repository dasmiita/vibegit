import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { DOMAINS, DOMAIN_TAGS } from "../utils/domains";
import "./Create.css";

const STATUS_OPTIONS = [
  { value: "idea",        label: "💡 Idea",        desc: "Just an idea, not started yet" },
  { value: "in-progress", label: "🚧 In Progress",  desc: "Currently working on it" },
  { value: "completed",   label: "✅ Completed",    desc: "Finished and ready to share" }
];

export default function Create() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", codeSnippet: "" });
  const [about, setAbout] = useState({ features: "", howItWorks: "", futurePlans: "" });
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("idea");
  const [extraTags, setExtraTags] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) { navigate("/login"); return null; }

  const autoTags = domain ? DOMAIN_TAGS[domain] : [];
  const allTags = [
    ...autoTags,
    ...extraTags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean)
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = new FormData();
      data.append("title", form.title);
      data.append("description", form.description);
      data.append("codeSnippet", form.codeSnippet);
      data.append("tags", JSON.stringify(allTags));
      data.append("domain", domain);
      data.append("status", status);
      data.append("features", about.features);
      data.append("howItWorks", about.howItWorks);
      data.append("futurePlans", about.futurePlans);
      files.forEach(f => data.append("files", f));
      await api.post("/projects", data);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-page">
      <div className="create-card">
        <h1>New Project</h1>
        <form onSubmit={handleSubmit} className="create-form">

          <input
            placeholder="Project title"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Short description of your project..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            required
          />

          {/* Status */}
          <div className="create-section">
            <label>Project Status</label>
            <div className="status-picker">
              {STATUS_OPTIONS.map(s => (
                <button
                  type="button"
                  key={s.value}
                  className={`status-btn status-${s.value} ${status === s.value ? "selected" : ""}`}
                  onClick={() => setStatus(s.value)}
                  title={s.desc}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Domain */}
          <div className="create-section">
            <label>Domain <span className="optional">(auto-assigns tags)</span></label>
            <div className="domain-picker">
              {DOMAINS.map(d => (
                <button
                  type="button"
                  key={d}
                  className={`domain-btn ${domain === d ? "selected" : ""}`}
                  onClick={() => setDomain(prev => prev === d ? "" : d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {autoTags.length > 0 && (
            <div className="auto-tags">
              <span className="auto-tags-label">Auto tags:</span>
              {autoTags.map(t => <span key={t} className="tag">#{t}</span>)}
            </div>
          )}

          <div className="create-section">
            <label>Extra Tags <span className="optional">(comma separated)</span></label>
            <input
              placeholder="e.g. react, beginner, portfolio"
              value={extraTags}
              onChange={e => setExtraTags(e.target.value)}
            />
          </div>

          {/* About section */}
          <div className="create-section about-section">
            <label>About Project <span className="optional">(optional but recommended)</span></label>
            <textarea
              placeholder="✨ Key features of your project..."
              value={about.features}
              onChange={e => setAbout({ ...about, features: e.target.value })}
              rows={2}
            />
            <textarea
              placeholder="⚙️ How does it work?"
              value={about.howItWorks}
              onChange={e => setAbout({ ...about, howItWorks: e.target.value })}
              rows={2}
            />
            <textarea
              placeholder="🚀 Future plans or ideas..."
              value={about.futurePlans}
              onChange={e => setAbout({ ...about, futurePlans: e.target.value })}
              rows={2}
            />
          </div>

          <textarea
            placeholder="Paste a code snippet (optional)"
            value={form.codeSnippet}
            onChange={e => setForm({ ...form, codeSnippet: e.target.value })}
            rows={4}
            className="code-input"
          />

          <div className="create-section">
            <label>Upload Files <span className="optional">(optional, max 10MB each)</span></label>
            <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files))} className="file-input" />
            {files.length > 0 && (
              <ul className="file-preview">
                {files.map((f, i) => (
                  <li key={i}>📄 {f.name} <span>({(f.size / 1024).toFixed(1)} KB)</span></li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="create-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Posting..." : "Post Project"}
          </button>
        </form>
      </div>
    </div>
  );
}
