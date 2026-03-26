import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "./Navbar.css";

const ACCENTS = ["#a78bfa", "#f472b6", "#34d399", "#60a5fa", "#fb923c", "#facc15"];
const FONTS = [
  { key: "inter", label: "Sans" },
  { key: "mono", label: "Mono" },
  { key: "serif", label: "Serif" }
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle, accent, setAccent, font, setFont, layout, setLayout } = useTheme();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showPrefs, setShowPrefs] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">⚡ VibeGit</Link>

      <form className="navbar-search" onSubmit={handleSearch}>
        <input
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </form>

      <div className="navbar-links">
        <Link to="/">Explore</Link>
        <Link to="/feed">Feed</Link>
        {user && <Link to="/create">+ Create</Link>}
        {user ? (
          <>
            <Link to={`/profile/${user.id}`}>@{user.username}</Link>
            <button onClick={() => logout() || navigate("/login")} className="nav-btn">Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}

        <div className="prefs-wrapper">
          <button className="nav-btn" onClick={() => setShowPrefs(p => !p)} title="Preferences">⚙️</button>
          {showPrefs && (
            <div className="prefs-panel">
              <div className="prefs-row">
                <span>Theme</span>
                <button className="nav-btn" onClick={toggle}>{theme === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
              </div>
              <div className="prefs-row">
                <span>Accent</span>
                <div className="accent-swatches">
                  {ACCENTS.map(c => (
                    <button
                      key={c}
                      className={`swatch ${accent === c ? "active" : ""}`}
                      style={{ background: c }}
                      onClick={() => setAccent(c)}
                    />
                  ))}
                  <input type="color" value={accent} onChange={e => setAccent(e.target.value)} className="color-input" title="Custom color" />
                </div>
              </div>
              <div className="prefs-row">
                <span>Font</span>
                <div className="font-btns">
                  {FONTS.map(f => (
                    <button key={f.key} className={`nav-btn ${font === f.key ? "active-pref" : ""}`} onClick={() => setFont(f.key)}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="prefs-row">
                <span>Layout</span>
                <div className="font-btns">
                  <button className={`nav-btn ${layout === "grid" ? "active-pref" : ""}`} onClick={() => setLayout("grid")}>⊞ Grid</button>
                  <button className={`nav-btn ${layout === "list" ? "active-pref" : ""}`} onClick={() => setLayout("list")}>☰ List</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
