import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const TYPING_WORDS = [
  "Ship your code.",
  "Share your vibe.",
  "Build in public.",
  "Code with soul.",
  "Make it yours."
];

const FLOATING_SYMBOLS = [
  { text: "{}", x: "8%",  y: "15%", delay: "0s",   dur: "6s",  size: "1.4rem", opacity: 0.18 },
  { text: "</>", x: "88%", y: "10%", delay: "1s",   dur: "8s",  size: "1.1rem", opacity: 0.14 },
  { text: "//",  x: "5%",  y: "70%", delay: "2s",   dur: "7s",  size: "1.2rem", opacity: 0.16 },
  { text: "=>",  x: "92%", y: "65%", delay: "0.5s", dur: "9s",  size: "1rem",   opacity: 0.13 },
  { text: "[ ]", x: "15%", y: "85%", delay: "3s",   dur: "6s",  size: "1.1rem", opacity: 0.15 },
  { text: "&&",  x: "80%", y: "80%", delay: "1.5s", dur: "7s",  size: "1rem",   opacity: 0.12 },
  { text: "fn()", x: "75%", y: "30%", delay: "2.5s", dur: "8s",  size: "0.95rem",opacity: 0.14 },
  { text: "git",  x: "20%", y: "40%", delay: "4s",   dur: "10s", size: "0.9rem", opacity: 0.11 },
  { text: "npm",  x: "60%", y: "88%", delay: "1s",   dur: "7s",  size: "0.9rem", opacity: 0.12 },
  { text: "★",    x: "45%", y: "12%", delay: "3.5s", dur: "9s",  size: "1rem",   opacity: 0.1  },
];

function TypingText() {
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = TYPING_WORDS[wordIdx];
    let timeout;
    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80);
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 45);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setWordIdx(i => (i + 1) % TYPING_WORDS.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, deleting, wordIdx]);

  return (
    <span className="typing-text">
      {displayed}<span className="cursor">|</span>
    </span>
  );
}

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = isSignup ? "/auth/signup" : "/auth/login";
      const payload = isSignup ? form : { email: form.email, password: form.password };
      const res = await api.post(endpoint, payload);
      login(res.data.user, res.data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="login-page">

      {/* Orbs hidden via CSS — kept in DOM for backwards compat */}
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />

      {/* Scanline overlay */}
      <div className="noise-overlay" />

      {/* Floating code symbols */}
      {FLOATING_SYMBOLS.map((s, i) => (
        <span
          key={i}
          className="float-symbol"
          style={{
            left: s.x, top: s.y,
            animationDelay: s.delay,
            animationDuration: s.dur,
            fontSize: s.size,
            opacity: s.opacity
          }}
        >
          {s.text}
        </span>
      ))}

      {/* ── Hero Section ── */}
      <section className="hero-section">
        <div className="hero-content">

          <div className="hero-badge">for vibe coders</div>

          <h1 className="hero-title">
            <span className="hero-title-vibe">Vibe</span>
            <span className="hero-title-git">Git</span>
          </h1>

          <p className="hero-tagline">
            <TypingText />
          </p>

          <p className="hero-desc">
            A social platform where developers share projects,<br />
            remix ideas, and build in public — with style.
          </p>

          <div className="hero-actions">
            <button className="hero-cta" onClick={scrollToForm}>
              Get Started
              <span className="hero-cta-arrow">→</span>
            </button>
            <div className="hero-stats">
              <span>Projects</span>
              <span>Remixes</span>
              <span>Vibes</span>
            </div>
          </div>
        </div>

        <div className="hero-scroll-hint" onClick={scrollToForm}>
          <span>scroll to enter</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* ── Auth Section ── */}
      <section className="auth-section" ref={formRef}>
        <div className="auth-card">

          <div className="auth-card-glow" />

          <div className="auth-header">
            <h2 className="auth-logo">⚡ VibeGit</h2>
            <p className="auth-sub">
              {isSignup ? "// join the vibe." : "// welcome back."}
            </p>
          </div>

          {/* Toggle tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${!isSignup ? "active" : ""}`}
              onClick={() => { setIsSignup(false); setError(""); }}
            >
              Login
            </button>
            <button
              className={`auth-tab ${isSignup ? "active" : ""}`}
              onClick={() => { setIsSignup(true); setError(""); }}
            >
              Sign Up
            </button>
            <div className={`auth-tab-indicator ${isSignup ? "right" : "left"}`} />
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {isSignup && (
              <div className="input-group">
                <span className="input-icon">@</span>
                <input
                  placeholder="username"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  required
                  autoComplete="off"
                />
              </div>
            )}
            <div className="input-group">
              <span className="input-icon">~</span>
              <input
                type="email"
                placeholder="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="input-group">
              <span className="input-icon">#</span>
              <input
                type="password"
                placeholder="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <span className="auth-loading">
                  <span /><span /><span />
                </span>
              ) : (
                isSignup ? "create account →" : "sign in →"
              )}
            </button>
          </form>

          <p className="auth-toggle">
            {isSignup ? "already have an account?" : "new to vibegit?"}{" "}
            <span onClick={() => { setIsSignup(s => !s); setError(""); }}>
              {isSignup ? "sign in" : "sign up"}
            </span>
          </p>
        </div>
      </section>

    </div>
  );
}
