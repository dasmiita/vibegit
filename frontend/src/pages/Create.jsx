import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { DOMAINS, DOMAIN_TAGS } from "../utils/domains";
import "./Create.css";

export default function Create() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", codeSnippet: "" });
  const [domain, setDomain] = useState("");
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
      files.forEach(f => data.append("files", f));
      await api.post("/projects", data, { headers: { "Content-Type": "multipart/form-data" } });
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
            placeholder="Describe your project or idea..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={4}
            required
          />
          <textarea
            placeholder="Paste a code snippet (optional)"
            value={form.codeSnippet}
            onChange={e => setForm({ ...form, codeSnippet: e.target.value })}
            rows={4}
            className="code-input"
          />

          <div className="create-section">
            <label>Project Domain</label>
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

          <div className="create-section">
            <label>Upload Files <span className="optional">(optional, max 10MB each)</span></label>
            <input
              type="file"
              multiple
              onChange={e => setFiles(Array.from(e.target.files))}
              className="file-input"
            />
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
