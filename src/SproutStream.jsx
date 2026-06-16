import { useState, useEffect, useRef } from "react";
import {
  supabase, SUPABASE_CONFIGURED,
  signIn, signUp, signOut, onAuthChange,
  loadChildren, saveChild, deleteChild,
} from "./lib/supabase";
import { STRIPE_CONFIGURED, redirectToCheckout } from "./lib/stripe";

/* ─────────────────────────────────────────────
   CONSTANTS & SEED DATA
───────────────────────────────────────────── */
const CHILD_COLORS = [
  "#FF6B6B","#FFD93D","#6BCB77","#4D96FF",
  "#FF922B","#CC5DE8","#20C997","#F06595",
];

const DEMO_VIDEOS = [
  { id:1,  title:"The Magic Forest",        duration:"12:34", thumb:"🌲", tags:["nature","adventure"],  age:3  },
  { id:2,  title:"Dino Discovery",          duration:"08:22", thumb:"🦕", tags:["dinosaurs","learning"], age:4  },
  { id:3,  title:"Space Explorers",         duration:"15:10", thumb:"🚀", tags:["space","science"],      age:5  },
  { id:4,  title:"Ocean Friends",           duration:"10:45", thumb:"🐠", tags:["ocean","animals"],      age:3  },
  { id:5,  title:"Rainbow Art Class",       duration:"18:30", thumb:"🎨", tags:["art","creativity"],     age:4  },
  { id:6,  title:"Farm Animal Parade",      duration:"07:55", thumb:"🐄", tags:["animals","farm"],       age:3  },
  { id:7,  title:"Robot Builders",          duration:"22:14", thumb:"🤖", tags:["technology","stem"],    age:6  },
  { id:8,  title:"Story Time: Dragons",     duration:"13:02", thumb:"🐉", tags:["stories","fantasy"],    age:5  },
  { id:9,  title:"Silly Songs Compilation", duration:"09:18", thumb:"🎵", tags:["music","fun"],          age:3  },
  { id:10, title:"Volcano Science",         duration:"11:44", thumb:"🌋", tags:["science","nature"],     age:7  },
  { id:11, title:"Superhero Training",      duration:"16:30", thumb:"⚡", tags:["adventure","fun"],      age:5  },
  { id:12, title:"Cooking for Kids",        duration:"20:05", thumb:"🍳", tags:["cooking","learning"],   age:6  },
];

const DEMO_CHILDREN = [
  { id:1, name:"Emma", age:6, color:CHILD_COLORS[0], allowedTags:["nature","art","animals"],  pinOverride:null },
  { id:2, name:"Liam", age:4, color:CHILD_COLORS[1], allowedTags:["dinosaurs","music","fun"], pinOverride:null },
];

const DEFAULT_PIN = "1234";

/* ─────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }

  :root {
    --primary:    #6C63FF;
    --primary-lt: #EAE9FF;
    --accent:     #FF6B6B;
    --green:      #6BCB77;
    --yellow:     #FFD93D;
    --bg:         #F7F8FC;
    --card:       #FFFFFF;
    --text:       #1A1A2E;
    --muted:      #7B7F9E;
    --border:     #E8E9F3;
    --radius:     16px;
    --shadow:     0 4px 24px rgba(108,99,255,.12);
    --shadow-sm:  0 2px 8px  rgba(108,99,255,.08);
  }

  body { font-family:'Nunito',sans-serif; background:var(--bg); color:var(--text); min-height:100vh; }
  button { cursor:pointer; border:none; background:none; font-family:inherit; }
  input  { font-family:inherit; }

  .btn-primary {
    background:var(--primary); color:#fff; font-weight:800; font-size:1rem;
    padding:.75rem 1.5rem; border-radius:12px;
    transition:transform .15s,box-shadow .15s,opacity .15s;
    box-shadow:0 4px 14px rgba(108,99,255,.35);
  }
  .btn-primary:hover  { transform:translateY(-1px); box-shadow:0 6px 20px rgba(108,99,255,.4); }
  .btn-primary:active { transform:translateY(0); }
  .btn-primary:disabled { opacity:.5; cursor:not-allowed; transform:none; }

  .btn-ghost {
    color:var(--primary); font-weight:700; font-size:.9rem;
    padding:.5rem 1rem; border-radius:10px; transition:background .15s;
  }
  .btn-ghost:hover { background:var(--primary-lt); }

  .btn-danger {
    background:var(--accent); color:#fff; font-weight:800; font-size:1rem;
    padding:.75rem 1.5rem; border-radius:12px;
    box-shadow:0 4px 14px rgba(255,107,107,.3);
    transition:transform .15s,opacity .15s;
  }
  .btn-danger:hover { transform:translateY(-1px); }

  .input-field {
    width:100%; padding:.75rem 1rem;
    border:2px solid var(--border); border-radius:12px;
    font-size:1rem; font-family:inherit; font-weight:600;
    color:var(--text); background:#fff; outline:none;
    transition:border-color .2s;
  }
  .input-field:focus { border-color:var(--primary); }

  /* ── Auth ── */
  .auth-wrap {
    min-height:100vh; display:flex; flex-direction:column;
    align-items:center; justify-content:center; padding:1.5rem;
    background:linear-gradient(135deg,#EAE9FF 0%,#F7F8FC 60%,#FFE9E9 100%);
  }
  .auth-card {
    background:#fff; border-radius:24px;
    box-shadow:0 8px 40px rgba(108,99,255,.18);
    padding:2.5rem 2rem; width:100%; max-width:420px;
  }
  .auth-logo { text-align:center; margin-bottom:1.75rem; }
  .auth-logo .logo-icon  { font-size:3rem; display:block; margin-bottom:.4rem; }
  .auth-logo .logo-name  { font-size:1.75rem; font-weight:900; color:var(--primary); letter-spacing:-.5px; }
  .auth-logo .logo-tag   { font-size:.85rem; color:var(--muted); font-weight:600; margin-top:.15rem; }
  .auth-field-group { display:flex; flex-direction:column; gap:1rem; margin-bottom:1.25rem; }
  .auth-label { font-size:.82rem; font-weight:700; color:var(--muted); margin-bottom:.3rem; display:block; text-transform:uppercase; letter-spacing:.5px; }
  .auth-error { color:var(--accent); font-size:.88rem; font-weight:700; text-align:center; margin-top:.5rem; min-height:1.2rem; }
  .auth-link-row { text-align:center; margin-top:1.25rem; font-size:.9rem; color:var(--muted); font-weight:600; }
  .auth-link { color:var(--primary); font-weight:800; cursor:pointer; }
  .auth-link:hover { text-decoration:underline; }
  .demo-badge {
    background:#FFF3E0; color:#FF922B; font-size:.75rem; font-weight:800;
    padding:.25rem .6rem; border-radius:8px; display:inline-block; margin-bottom:1rem;
  }

  /* ── PIN ── */
  .pin-wrap {
    min-height:100vh; display:flex; flex-direction:column;
    align-items:center; justify-content:center; padding:2rem;
    background:linear-gradient(135deg,#6C63FF 0%,#4834D4 100%);
  }
  .pin-card {
    background:#fff; border-radius:28px; padding:2.5rem 2rem;
    width:100%; max-width:360px; text-align:center;
    box-shadow:0 12px 50px rgba(0,0,0,.25);
  }
  .pin-icon  { font-size:2.5rem; margin-bottom:.5rem; }
  .pin-title { font-size:1.4rem; font-weight:900; color:var(--text); margin-bottom:.35rem; }
  .pin-sub   { font-size:.9rem; color:var(--muted); font-weight:600; margin-bottom:1.75rem; }
  .pin-dots  { display:flex; gap:14px; justify-content:center; margin-bottom:1.75rem; }
  .pin-dot   { width:18px; height:18px; border-radius:50%; background:#E8E9F3; transition:background .2s,transform .2s; }
  .pin-dot.filled { background:var(--primary); transform:scale(1.1); }
  .pin-dot.error  { background:var(--accent); }

  @keyframes shake {
    0%,100%{ transform:translateX(0); }
    20%    { transform:translateX(-8px); }
    40%    { transform:translateX(8px); }
    60%    { transform:translateX(-6px); }
    80%    { transform:translateX(6px); }
  }
  .shake { animation:shake .4s ease; }

  .pin-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:1rem; }
  .pin-btn {
    width:72px; height:72px; border-radius:50%;
    font-size:1.6rem; font-weight:900; color:#fff; margin:auto;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; border:none;
    transition:transform .1s,box-shadow .1s;
    box-shadow:0 4px 14px rgba(0,0,0,.18);
  }
  .pin-btn:hover  { transform:scale(1.08); }
  .pin-btn:active { transform:scale(.95); }
  .pin-btn.del { background:#E8E9F3!important; color:var(--text)!important; font-size:1.2rem; box-shadow:none; }
  .pin-back { color:#fff; font-size:.9rem; font-weight:700; cursor:pointer; margin-top:.5rem; opacity:.8; }
  .pin-back:hover { opacity:1; }

  /* ── App shell ── */
  .app-shell { display:flex; flex-direction:column; min-height:100vh; }
  .topbar {
    background:#fff; border-bottom:2px solid var(--border);
    padding:.75rem 1.25rem;
    display:flex; align-items:center; justify-content:space-between;
    position:sticky; top:0; z-index:100; box-shadow:var(--shadow-sm);
  }
  .topbar-logo { font-size:1.35rem; font-weight:900; color:var(--primary); }
  .topbar-logo span { color:var(--accent); }
  .mode-badge { font-size:.75rem; font-weight:800; padding:.3rem .75rem; border-radius:20px; background:var(--primary-lt); color:var(--primary); letter-spacing:.4px; }
  .mode-badge.kid { background:#FFF3E0; color:#FF922B; }

  .main-content { flex:1; padding:1.25rem; max-width:900px; margin:0 auto; width:100%; }

  .bottom-nav { background:#fff; border-top:2px solid var(--border); display:flex; position:sticky; bottom:0; box-shadow:0 -4px 16px rgba(108,99,255,.08); }
  .nav-item { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:.7rem .5rem; font-size:.72rem; font-weight:700; color:var(--muted); cursor:pointer; transition:color .15s; gap:3px; }
  .nav-item .nav-icon { font-size:1.4rem; }
  .nav-item.active { color:var(--primary); }

  /* ── Section ── */
  .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; }
  .section-title  { font-size:1.15rem; font-weight:800; }

  /* ── Video grid ── */
  .video-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:1rem; margin-bottom:1.5rem; }
  .video-card { background:#fff; border-radius:14px; overflow:hidden; box-shadow:var(--shadow-sm); cursor:pointer; transition:transform .2s,box-shadow .2s; }
  .video-card:hover { transform:translateY(-3px); box-shadow:var(--shadow); }
  .video-thumb { background:var(--primary-lt); height:100px; display:flex; align-items:center; justify-content:center; font-size:2.5rem; }
  .video-info  { padding:.6rem .75rem .75rem; }
  .video-title { font-size:.85rem; font-weight:800; margin-bottom:.25rem; line-height:1.25; }
  .video-meta  { font-size:.75rem; color:var(--muted); font-weight:600; }
  .video-tags  { display:flex; flex-wrap:wrap; gap:4px; margin-top:.4rem; }
  .video-tag   { font-size:.65rem; font-weight:700; padding:.15rem .4rem; border-radius:6px; background:var(--primary-lt); color:var(--primary); }

  /* ── Upload zone ── */
  .upload-zone {
    border:2.5px dashed var(--border); border-radius:18px;
    padding:2.5rem 1rem; text-align:center; cursor:pointer;
    transition:border-color .2s, background .2s; margin-bottom:1rem;
  }
  .upload-zone:hover, .upload-zone.drag-over { border-color:var(--primary); background:var(--primary-lt); }
  .upload-zone-icon { font-size:2.5rem; margin-bottom:.5rem; }
  .upload-zone-text { font-size:.95rem; font-weight:700; color:var(--muted); }
  .upload-zone-sub  { font-size:.8rem; color:var(--border); font-weight:600; margin-top:.25rem; }
  .progress-bar-wrap { background:var(--border); border-radius:8px; height:8px; overflow:hidden; margin-top:.75rem; }
  .progress-bar { background:var(--primary); height:100%; border-radius:8px; transition:width .3s; }

  /* ── Profile chips ── */
  .profile-strip { display:flex; gap:.75rem; overflow-x:auto; padding-bottom:.25rem; margin-bottom:1.25rem; }
  .profile-chip  { display:flex; flex-direction:column; align-items:center; gap:.3rem; cursor:pointer; flex-shrink:0; }
  .profile-avatar { width:52px; height:52px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.4rem; font-weight:900; color:#fff; border:3px solid transparent; transition:border-color .2s,transform .2s; }
  .profile-chip.active .profile-avatar { border-color:var(--text); transform:scale(1.08); }
  .profile-chip-name { font-size:.75rem; font-weight:700; color:var(--muted); }
  .profile-chip.active .profile-chip-name { color:var(--text); }

  /* ── Children ── */
  .child-list { display:flex; flex-direction:column; gap:.75rem; margin-bottom:1rem; }
  .child-row  { background:#fff; border-radius:14px; padding:1rem 1.25rem; display:flex; align-items:center; justify-content:space-between; box-shadow:var(--shadow-sm); }
  .child-row-left  { display:flex; align-items:center; gap:.75rem; }
  .child-mini-avatar { width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.1rem; font-weight:900; color:#fff; }
  .child-row-name  { font-size:1rem; font-weight:800; }
  .child-row-age   { font-size:.8rem; color:var(--muted); font-weight:600; }
  .child-row-right { display:flex; gap:.5rem; }
  .icon-btn { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1rem; cursor:pointer; border:none; background:var(--bg); transition:background .15s; }
  .icon-btn:hover { background:var(--border); }
  .icon-btn.danger:hover { background:#FFE9E9; }

  /* ── Settings ── */
  .settings-section { margin-bottom:1.5rem; }
  .settings-section-title { font-size:.78rem; font-weight:800; color:var(--muted); text-transform:uppercase; letter-spacing:.8px; margin-bottom:.75rem; }
  .settings-row { background:#fff; border-radius:14px; padding:1rem 1.25rem; display:flex; align-items:center; justify-content:space-between; box-shadow:var(--shadow-sm); margin-bottom:.5rem; }
  .settings-row-label { font-size:.95rem; font-weight:700; }
  .settings-row-sub   { font-size:.8rem; color:var(--muted); font-weight:600; margin-top:.1rem; }
  .toggle { width:46px; height:26px; border-radius:13px; background:var(--border); border:none; cursor:pointer; position:relative; transition:background .2s; }
  .toggle.on { background:var(--primary); }
  .toggle::after { content:''; position:absolute; top:3px; left:3px; width:20px; height:20px; border-radius:50%; background:#fff; transition:transform .2s; box-shadow:0 2px 6px rgba(0,0,0,.2); }
  .toggle.on::after { transform:translateX(20px); }

  /* ── PIN display ── */
  .pin-display-dots { display:flex; gap:8px; }
  .pin-display-dot  { width:10px; height:10px; border-radius:50%; background:var(--primary); }

  /* ── Modal ── */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:500; padding:1.5rem; }
  .modal { background:#fff; border-radius:24px; padding:2rem 1.75rem; width:100%; max-width:380px; box-shadow:0 12px 50px rgba(0,0,0,.25); }
  .modal-title { font-size:1.2rem; font-weight:900; margin-bottom:.5rem; text-align:center; }
  .modal-sub   { font-size:.88rem; color:var(--muted); font-weight:600; text-align:center; margin-bottom:1.5rem; }
  .modal-actions { display:flex; gap:.75rem; margin-top:1.5rem; }

  /* ── Kid portal ── */
  .kid-portal { padding:1.25rem; max-width:900px; margin:0 auto; }
  .kid-header { text-align:center; margin-bottom:1.5rem; }
  .kid-header h1 { font-size:1.6rem; font-weight:900; }
  .kid-header p  { color:var(--muted); font-weight:600; }
  .kid-video-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:1rem; }
  .kid-video-card { background:#fff; border-radius:18px; overflow:hidden; cursor:pointer; box-shadow:var(--shadow-sm); transition:transform .2s,box-shadow .2s; text-align:center; }
  .kid-video-card:hover { transform:translateY(-4px) scale(1.02); box-shadow:var(--shadow); }
  .kid-video-thumb { height:90px; display:flex; align-items:center; justify-content:center; font-size:3rem; }
  .kid-video-title { font-size:.85rem; font-weight:800; padding:.6rem .6rem .8rem; line-height:1.25; }

  /* ── Welcome banner ── */
  .welcome-banner { background:linear-gradient(135deg,var(--primary),#4834D4); color:#fff; border-radius:20px; padding:1.5rem; margin-bottom:1.5rem; box-shadow:0 6px 24px rgba(108,99,255,.3); }
  .welcome-banner h2 { font-size:1.3rem; font-weight:900; margin-bottom:.25rem; }
  .welcome-banner p  { font-size:.9rem; opacity:.85; font-weight:600; }

  /* ── Empty state ── */
  .empty-state { text-align:center; padding:3rem 1rem; color:var(--muted); }
  .empty-state .empty-icon { font-size:3rem; margin-bottom:.75rem; }
  .empty-state p { font-weight:700; }

  /* ── Toast ── */
  .toast {
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    background:#1A1A2E; color:#fff; font-weight:700; font-size:.9rem;
    padding:.65rem 1.25rem; border-radius:12px;
    box-shadow:0 6px 24px rgba(0,0,0,.25); z-index:999;
    animation:fadeInUp .25s ease;
  }
  @keyframes fadeInUp { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }

  ::-webkit-scrollbar { width:6px; height:6px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
`;

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function StyleInjector() {
  useEffect(() => {
    const tag = document.createElement("style");
    tag.id = "ss-styles";
    tag.textContent = GLOBAL_CSS;
    if (!document.getElementById("ss-styles")) document.head.appendChild(tag);
    return () => document.getElementById("ss-styles")?.remove();
  }, []);
  return null;
}

function Toast({ message }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}

/* ─────────────────────────────────────────────
   PIN NUMPAD
───────────────────────────────────────────── */
function PINNumpad({ onChange, onDelete }) {
  const DIGITS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const COLORS = [
    CHILD_COLORS[0],CHILD_COLORS[1],CHILD_COLORS[2],
    CHILD_COLORS[3],CHILD_COLORS[4],CHILD_COLORS[5],
    CHILD_COLORS[6],CHILD_COLORS[7],CHILD_COLORS[0],
    null, CHILD_COLORS[2], null,
  ];
  return (
    <div className="pin-grid">
      {DIGITS.map((d,i) => {
        if (d === "") return <div key={i} />;
        if (d === "⌫") return <button key={i} className="pin-btn del" onClick={onDelete}>⌫</button>;
        return (
          <button key={i} className="pin-btn" style={{ background:COLORS[i] }} onClick={() => onChange(d)}>
            {d}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   LOGIN SCREEN
───────────────────────────────────────────── */
function LoginScreen({ onLogin, onGoSignup }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); return; }
    setLoading(true);
    setError("");
    try {
      if (SUPABASE_CONFIGURED) {
        await signIn(email.trim(), password);
        // onAuthChange listener in root will pick up the session
      } else {
        // Demo mode — simulate auth
        const name = email.split("@")[0].replace(/[._+]/g," ").split(" ").map(w=>w[0].toUpperCase()+w.slice(1)).join(" ");
        onLogin({ name, email: email.trim() });
      }
    } catch (err) {
      setError(err.message || "Sign in failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🌱</span>
          <div className="logo-name">SproutStream</div>
          <div className="logo-tag">Private family streaming</div>
        </div>
        {!SUPABASE_CONFIGURED && <div className="demo-badge">⚡ Demo Mode — add Supabase keys to enable real auth</div>}
        <form onSubmit={handleSubmit}>
          <div className="auth-field-group">
            <div>
              <label className="auth-label">Email</label>
              <input className="input-field" type="email" placeholder="you@family.com"
                value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                autoComplete="email" />
            </div>
            <div>
              <label className="auth-label">Password</label>
              <input className="input-field" type="password" placeholder="••••••••"
                value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                autoComplete="current-password" />
            </div>
          </div>
          <div className="auth-error">{error}</div>
          <button type="submit" className="btn-primary" style={{ width:"100%", marginTop:".5rem" }} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <div className="auth-link-row">
          New to SproutStream?{" "}
          <span className="auth-link" onClick={onGoSignup}>Create Account</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SIGNUP SCREEN
───────────────────────────────────────────── */
function SignupScreen({ onSignup, onGoLogin }) {
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [childName, setChildName] = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim() || !childName.trim()) { setError("Please fill in all fields."); return; }
    if (password !== confirm)    { setError("Passwords don't match."); return; }
    if (password.length < 6)     { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError("");
    try {
      if (SUPABASE_CONFIGURED) {
        await signUp(email.trim(), password, name.trim());
        // onAuthChange will fire; pass childName so root can create first child
        onSignup({ name: name.trim(), email: email.trim(), childName: childName.trim(), useSupabase: true });
      } else {
        onSignup({ name: name.trim(), email: email.trim(), childName: childName.trim(), useSupabase: false });
      }
    } catch (err) {
      setError(err.message || "Sign up failed. Try a different email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth:440 }}>
        <div className="auth-logo">
          <span className="logo-icon">🌱</span>
          <div className="logo-name">SproutStream</div>
          <div className="logo-tag">Create your family account</div>
        </div>
        {!SUPABASE_CONFIGURED && <div className="demo-badge">⚡ Demo Mode</div>}
        <form onSubmit={handleSubmit}>
          <div className="auth-field-group">
            <div>
              <label className="auth-label">Your Name</label>
              <input className="input-field" type="text" placeholder="Jane Smith"
                value={name} onChange={e=>{ setName(e.target.value); setError(""); }} />
            </div>
            <div>
              <label className="auth-label">Email</label>
              <input className="input-field" type="email" placeholder="you@family.com"
                value={email} onChange={e=>{ setEmail(e.target.value); setError(""); }} autoComplete="email" />
            </div>
            <div>
              <label className="auth-label">Password</label>
              <input className="input-field" type="password" placeholder="Min. 6 characters"
                value={password} onChange={e=>{ setPassword(e.target.value); setError(""); }} autoComplete="new-password" />
            </div>
            <div>
              <label className="auth-label">Confirm Password</label>
              <input className="input-field" type="password" placeholder="Re-enter password"
                value={confirm} onChange={e=>{ setConfirm(e.target.value); setError(""); }} autoComplete="new-password" />
            </div>
            <div style={{ borderTop:"2px solid var(--border)", paddingTop:"1rem" }}>
              <label className="auth-label">👶 First Child's Name</label>
              <input className="input-field" type="text" placeholder="e.g. Emma"
                value={childName} onChange={e=>{ setChildName(e.target.value); setError(""); }} />
              <div style={{ fontSize:".78rem", color:"var(--muted)", marginTop:".4rem", fontWeight:600 }}>
                We'll create their profile automatically.
              </div>
            </div>
          </div>
          <div className="auth-error">{error}</div>
          <button type="submit" className="btn-primary" style={{ width:"100%", marginTop:".5rem" }}
            disabled={loading || !name.trim() || !email.trim() || !password.trim() || !childName.trim()}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>
        <div className="auth-link-row">
          Already have an account?{" "}
          <span className="auth-link" onClick={onGoLogin}>Sign In</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   KID PIN ENTRY
───────────────────────────────────────────── */
function KidPINEntry({ correctPin, onSuccess, onBack }) {
  const [input,   setInput]   = useState("");
  const [shake,   setShake]   = useState(false);
  const [errored, setErrored] = useState(false);

  function handleDigit(d) {
    if (input.length >= 4) return;
    const next = input + d;
    setInput(next);
    if (next.length === 4) {
      if (next === correctPin) {
        setTimeout(onSuccess, 200);
      } else {
        setErrored(true); setShake(true);
        setTimeout(() => { setShake(false); setErrored(false); setInput(""); }, 500);
      }
    }
  }

  return (
    <div className="pin-wrap">
      <div className="pin-card">
        <div className="pin-icon">🔒</div>
        <div className="pin-title">Kid Mode</div>
        <div className="pin-sub">Enter your PIN to continue</div>
        <div className={`pin-dots ${shake ? "shake" : ""}`}>
          {[0,1,2,3].map(i => (
            <div key={i} className={`pin-dot ${i < input.length ? (errored ? "error" : "filled") : ""}`} />
          ))}
        </div>
        <PINNumpad onChange={handleDigit} onDelete={() => { setInput(v=>v.slice(0,-1)); setErrored(false); }} />
      </div>
      <div className="pin-back" onClick={onBack}>← Back to Parent Mode</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CHANGE PIN MODAL
───────────────────────────────────────────── */
function ChangePINModal({ onSave, onClose }) {
  const [step,    setStep]    = useState(1);
  const [newPin,  setNewPin]  = useState("");
  const [confPin, setConfPin] = useState("");
  const [shake,   setShake]   = useState(false);
  const [error,   setError]   = useState("");
  const active = step === 1 ? newPin : confPin;

  function handleDigit(d) {
    if (active.length >= 4) return;
    const next = active + d;
    if (step === 1) {
      setNewPin(next);
      if (next.length === 4) setStep(2);
    } else {
      setConfPin(next);
      if (next.length === 4) {
        if (next === newPin) { onSave(next); }
        else {
          setShake(true);
          setTimeout(() => { setShake(false); setConfPin(""); setError("PINs didn't match. Try again."); }, 500);
        }
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-title">🔐 Change Kid PIN</div>
        <div className="modal-sub">{step === 1 ? "Enter a new 4-digit PIN" : "Confirm your new PIN"}</div>
        <div className={`pin-dots ${shake ? "shake" : ""}`} style={{ justifyContent:"center", marginBottom:"1.25rem" }}>
          {[0,1,2,3].map(i => <div key={i} className={`pin-dot ${i < active.length ? "filled" : ""}`} />)}
        </div>
        {error && <div className="auth-error" style={{ marginBottom:".75rem" }}>{error}</div>}
        <PINNumpad onChange={handleDigit} onDelete={() => { if(step===1) setNewPin(v=>v.slice(0,-1)); else setConfPin(v=>v.slice(0,-1)); setError(""); }} />
        <div style={{ marginTop:"1rem", textAlign:"center" }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ADD / EDIT CHILD MODAL
───────────────────────────────────────────── */
const ALL_TAGS = ["nature","adventure","dinosaurs","learning","space","science","ocean","animals","art","creativity","farm","technology","stem","stories","fantasy","music","fun","cooking"];

function ChildModal({ child, onSave, onClose }) {
  const [name,  setName]  = useState(child?.name  ?? "");
  const [age,   setAge]   = useState(child?.age   ?? "");
  const [color, setColor] = useState(child?.color ?? CHILD_COLORS[0]);
  const [tags,  setTags]  = useState(child?.allowedTags ?? []);

  function toggleTag(t) { setTags(ts => ts.includes(t) ? ts.filter(x=>x!==t) : [...ts,t]); }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:440 }}>
        <div className="modal-title">{child ? "Edit Profile" : "New Child Profile"}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:".85rem", marginBottom:"1rem" }}>
          <div>
            <label className="auth-label">Name</label>
            <input className="input-field" value={name} onChange={e=>setName(e.target.value)} placeholder="Child's name" />
          </div>
          <div>
            <label className="auth-label">Age</label>
            <input className="input-field" type="number" min={1} max={17} value={age} onChange={e=>setAge(e.target.value)} placeholder="e.g. 5" />
          </div>
          <div>
            <label className="auth-label">Color</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {CHILD_COLORS.map(c => (
                <div key={c} onClick={()=>setColor(c)} style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", border:color===c?"3px solid var(--text)":"3px solid transparent", transition:"border-color .15s" }} />
              ))}
            </div>
          </div>
          <div>
            <label className="auth-label">Allowed Content Tags</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {ALL_TAGS.map(t => (
                <div key={t} onClick={()=>toggleTag(t)} style={{ padding:".25rem .6rem", borderRadius:8, cursor:"pointer", fontSize:".8rem", fontWeight:700, background:tags.includes(t)?"var(--primary)":"var(--bg)", color:tags.includes(t)?"#fff":"var(--muted)", transition:"background .15s,color .15s" }}>{t}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose} style={{ flex:1 }}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave({ name:name.trim(), age:parseInt(age), color, allowedTags:tags })}
            style={{ flex:2 }} disabled={!name.trim() || !age}>
            {child ? "Save Changes" : "Add Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   KID PORTAL
───────────────────────────────────────────── */
function KidPortal({ child, videos, onExit }) {
  const allowed = child ? videos.filter(v => child.allowedTags.some(t => v.tags.includes(t))) : videos;

  return (
    <div style={{ minHeight:"100vh", background:child ? child.color+"22" : "var(--bg)" }}>
      <div style={{ background:child?child.color:"var(--primary)", padding:"1rem 1.25rem", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ color:"#fff", fontWeight:900, fontSize:"1.25rem" }}>🌱 Hi, {child?.name ?? "Friend"}!</div>
        <button onClick={onExit} style={{ background:"rgba(255,255,255,.25)", color:"#fff", borderRadius:10, padding:".4rem .85rem", fontWeight:700, fontSize:".82rem", cursor:"pointer", border:"none" }}>👋 Exit</button>
      </div>
      <div className="kid-portal" style={{ paddingTop:"1.25rem" }}>
        <div className="kid-header">
          <h1>🎬 Your Videos</h1>
          <p>{allowed.length} videos just for you!</p>
        </div>
        {allowed.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🎠</div><p>Ask a parent to add some videos for you!</p></div>
        ) : (
          <div className="kid-video-grid">
            {allowed.map(v => (
              <div key={v.id} className="kid-video-card">
                <div className="kid-video-thumb" style={{ background:(child?.color??"#6C63FF")+"22" }}>{v.thumb}</div>
                <div className="kid-video-title">{v.title}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HOME TAB
───────────────────────────────────────────── */
function HomeTab({ user, videos, children, setTab }) {
  return (
    <>
      <div className="welcome-banner">
        <h2>Welcome back, {user.name.split(" ")[0]}! 👋</h2>
        <p>{children.length} {children.length===1?"child":"children"} · {videos.length} videos available</p>
      </div>
      <div className="section-header"><span className="section-title">Recently Added</span></div>
      <div className="video-grid">
        {videos.slice(0,6).map(v => (
          <div key={v.id} className="video-card">
            <div className="video-thumb">{v.thumb}</div>
            <div className="video-info">
              <div className="video-title">{v.title}</div>
              <div className="video-meta">⏱ {v.duration} · Age {v.age}+</div>
              <div className="video-tags">{v.tags.slice(0,2).map(t=><span key={t} className="video-tag">{t}</span>)}</div>
            </div>
          </div>
        ))}
      </div>
      {children.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop:".5rem" }}>
            <span className="section-title">Children</span>
            <button className="btn-ghost" onClick={()=>setTab("kids")}>Manage →</button>
          </div>
          <div className="profile-strip">
            {children.map(c => (
              <div key={c.id} className="profile-chip">
                <div className="profile-avatar" style={{ background:c.color }}>{c.name.charAt(0)}</div>
                <span className="profile-chip-name">{c.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   VIDEOS TAB (with upload)
───────────────────────────────────────────── */
function VideosTab({ videos, onUpload }) {
  const [search,    setSearch]    = useState("");
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const fileInputRef = useRef();

  const filtered = videos.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.tags.some(t => t.includes(search.toLowerCase()))
  );

  function handleFiles(files) {
    const file = files[0];
    if (!file) return;
    onUpload(file, setProgress, setUploading);
  }

  return (
    <>
      <div style={{ marginBottom:"1rem" }}>
        <input className="input-field" placeholder="🔍 Search videos…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {/* Upload zone */}
      <div
        className={`upload-zone ${dragging ? "drag-over" : ""}`}
        onDragOver={e=>{ e.preventDefault(); setDragging(true); }}
        onDragLeave={()=>setDragging(false)}
        onDrop={e=>{ e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={()=>fileInputRef.current?.click()}
      >
        <div className="upload-zone-icon">{uploading ? "⏳" : "📤"}</div>
        <div className="upload-zone-text">{uploading ? `Uploading… ${progress}%` : "Drop a video here, or click to browse"}</div>
        <div className="upload-zone-sub">MP4, MOV, WebM · Max 2GB per video</div>
        {uploading && (
          <div className="progress-bar-wrap" style={{ marginTop:".75rem" }}>
            <div className="progress-bar" style={{ width:`${progress}%` }} />
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="video/*" style={{ display:"none" }} onChange={e=>handleFiles(e.target.files)} />

      <div style={{ fontSize:".85rem", color:"var(--muted)", fontWeight:700, margin:"1rem 0 .75rem" }}>
        {filtered.length} video{filtered.length!==1?"s":""}
      </div>
      <div className="video-grid">
        {filtered.map(v => (
          <div key={v.id} className="video-card">
            <div className="video-thumb">{v.thumb}</div>
            <div className="video-info">
              <div className="video-title">{v.title}</div>
              <div className="video-meta">⏱ {v.duration} · Age {v.age}+</div>
              <div className="video-tags">{v.tags.map(t=><span key={t} className="video-tag">{t}</span>)}</div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length===0 && <div className="empty-state"><div className="empty-icon">🔍</div><p>No videos match "{search}"</p></div>}
    </>
  );
}

/* ─────────────────────────────────────────────
   KIDS TAB
───────────────────────────────────────────── */
function KidsTab({ children, onAdd, onEdit, onDelete, onSwitchKid }) {
  return (
    <>
      <div className="section-header">
        <span className="section-title">Child Profiles</span>
        <button className="btn-primary" onClick={onAdd} style={{ fontSize:".85rem", padding:".5rem 1rem" }}>+ Add Child</button>
      </div>
      {children.length===0 ? (
        <div className="empty-state"><div className="empty-icon">👶</div><p>No child profiles yet. Add one to get started!</p></div>
      ) : (
        <div className="child-list">
          {children.map(c => (
            <div key={c.id} className="child-row">
              <div className="child-row-left">
                <div className="child-mini-avatar" style={{ background:c.color }}>{c.name.charAt(0)}</div>
                <div>
                  <div className="child-row-name">{c.name}</div>
                  <div className="child-row-age">Age {c.age} · {c.allowedTags.length} content tags</div>
                </div>
              </div>
              <div className="child-row-right">
                <button className="icon-btn" title="Kid view" onClick={()=>onSwitchKid(c)}>🎮</button>
                <button className="icon-btn" title="Edit" onClick={()=>onEdit(c)}>✏️</button>
                <button className="icon-btn danger" title="Delete" onClick={()=>onDelete(c.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   SETTINGS TAB
───────────────────────────────────────────── */
function SettingsTab({ user, kidPin, onChangePin, onSignOut, notifications, setNotifications, autoplay, setAutoplay }) {
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinSaved,     setPinSaved]     = useState(false);

  function handlePinSave(pin) {
    onChangePin(pin);
    setShowPinModal(false);
    setPinSaved(true);
    setTimeout(() => setPinSaved(false), 2500);
  }

  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title">Account</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">👤 {user.name}</div>
            <div className="settings-row-sub">{user.email}</div>
          </div>
          {!SUPABASE_CONFIGURED && <div className="demo-badge">Demo</div>}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Subscription</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">💳 Family Plan · $9.99/mo</div>
            <div className="settings-row-sub">{STRIPE_CONFIGURED ? "Active" : "Add Stripe keys to enable billing"}</div>
          </div>
          {STRIPE_CONFIGURED && <button className="btn-ghost">Manage</button>}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Playback</div>
        <div className="settings-row">
          <div><div className="settings-row-label">Autoplay Next Video</div><div className="settings-row-sub">Automatically play the next video</div></div>
          <button className={`toggle ${autoplay?"on":""}`} onClick={()=>setAutoplay(v=>!v)} />
        </div>
        <div className="settings-row">
          <div><div className="settings-row-label">Notifications</div><div className="settings-row-sub">New content alerts</div></div>
          <button className={`toggle ${notifications?"on":""}`} onClick={()=>setNotifications(v=>!v)} />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Security</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">🔐 Kid Mode PIN</div>
            <div className="settings-row-sub" style={{ marginTop:".4rem" }}>
              <div className="pin-display-dots">{kidPin.split("").map((_,i)=><div key={i} className="pin-display-dot"/>)}</div>
            </div>
          </div>
          <button className="btn-ghost" onClick={()=>setShowPinModal(true)}>Change PIN</button>
        </div>
        {pinSaved && (
          <div style={{ background:"#EDFFF3", color:"#20C997", border:"1.5px solid #20C997", borderRadius:10, padding:".6rem 1rem", fontSize:".88rem", fontWeight:700, textAlign:"center" }}>
            ✅ PIN updated successfully!
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Session</div>
        <div className="settings-row">
          <div><div className="settings-row-label">Sign Out</div><div className="settings-row-sub">Return to login screen</div></div>
          <button className="btn-danger" onClick={onSignOut} style={{ fontSize:".85rem", padding:".45rem 1rem" }}>Sign Out</button>
        </div>
      </div>

      {showPinModal && <ChangePINModal onSave={handlePinSave} onClose={()=>setShowPinModal(false)} />}
    </>
  );
}

/* ─────────────────────────────────────────────
   ROOT COMPONENT
───────────────────────────────────────────── */
export default function SproutStream() {
  const [authState,   setAuthState]   = useState({ loggedIn:false, name:"", email:"", userId:null });
  const [showSignup,  setShowSignup]  = useState(false);
  const [authLoading, setAuthLoading] = useState(SUPABASE_CONFIGURED); // only show loading if Supabase is live

  const [mode,        setMode]        = useState("parent");
  const [kidUnlocked, setKidUnlocked] = useState(false);
  const [activeKid,   setActiveKid]   = useState(null);

  const [kidPin,         setKidPin]         = useState(DEFAULT_PIN);
  const [children,       setChildren]       = useState(DEMO_CHILDREN);
  const [videos]                            = useState(DEMO_VIDEOS);
  const [tab,            setTab]            = useState("home");
  const [notifications,  setNotifications]  = useState(true);
  const [autoplay,       setAutoplay]       = useState(true);
  const [childModal,     setChildModal]     = useState(false);
  const [editingChild,   setEditingChild]   = useState(null);
  const [toast,          setToast]          = useState("");

  const nextId = useRef(100);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  /* ── Supabase session listener ── */
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;

    // Check for existing session on load
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const u = session.user;
        setAuthState({ loggedIn:true, name:u.user_metadata?.name || u.email.split("@")[0], email:u.email, userId:u.id });
      }
      setAuthLoading(false);
    })();

    // Live listener for login/logout events
    const unsub = onAuthChange((session) => {
      if (session) {
        const u = session.user;
        setAuthState({ loggedIn:true, name:u.user_metadata?.name || u.email.split("@")[0], email:u.email, userId:u.id });
      } else {
        setAuthState({ loggedIn:false, name:"", email:"", userId:null });
        setKidUnlocked(false);
        setMode("parent");
      }
      setAuthLoading(false);
    });

    return unsub;
  }, []);

  /* ── Auth handlers ── */
  function handleLogin({ name, email }) {
    // Only called in demo mode; Supabase login fires onAuthChange automatically
    setAuthState({ loggedIn:true, name, email, userId:null });
  }

  function handleSignup({ name, email, childName }) {
    const newChild = {
      id: ++nextId.current,
      name: childName,
      age: 5,
      color: CHILD_COLORS[children.length % CHILD_COLORS.length],
      allowedTags: ["fun","animals","nature"],
      pinOverride: null,
    };
    setChildren(cs => [...cs, newChild]);
    setAuthState({ loggedIn:true, name, email, userId:null });
    setShowSignup(false);
    showToast(`Welcome, ${name}! 🌱`);
  }

  async function handleSignOut() {
    if (SUPABASE_CONFIGURED) await signOut();
    setAuthState({ loggedIn:false, name:"", email:"", userId:null });
    setKidUnlocked(false);
    setMode("parent");
    setActiveKid(null);
    setTab("home");
  }

  /* ── Kid mode ── */
  function switchToKidMode(child) {
    setActiveKid(child ?? children[0] ?? null);
    setMode("kid");
    setKidUnlocked(false);
  }
  function switchToParentMode() {
    setMode("parent");
    setKidUnlocked(false);
    setActiveKid(null);
  }

  /* ── Children CRUD ── */
  function handleSaveChild(data) {
    if (editingChild) {
      setChildren(cs => cs.map(c => c.id===editingChild.id ? { ...c, ...data } : c));
      showToast("Profile updated ✓");
    } else {
      setChildren(cs => [...cs, { id:++nextId.current, ...data, pinOverride:null }]);
      showToast(`${data.name}'s profile created ✓`);
    }
    setChildModal(false);
    setEditingChild(null);
  }

  /* ── Video upload ── */
  function handleUpload(file, setProgress, setUploading) {
    if (!SUPABASE_CONFIGURED) {
      showToast("⚠️ Add Cloudflare Stream keys to enable uploads");
      return;
    }
    // Real upload via cloudflareStream.uploadVideo — wired in Phase 1
    showToast("Upload coming soon — add Cloudflare Stream keys!");
  }

  /* ── Loading screen ── */
  if (authLoading) {
    return (
      <>
        <StyleInjector />
        <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#EAE9FF,#F7F8FC)" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>🌱</div>
            <div style={{ fontSize:"1.2rem", fontWeight:800, color:"var(--primary)" }}>SproutStream</div>
            <div style={{ color:"var(--muted)", fontWeight:600, marginTop:".5rem" }}>Loading…</div>
          </div>
        </div>
      </>
    );
  }

  /* ── Not logged in ── */
  if (!authState.loggedIn) {
    return (
      <>
        <StyleInjector />
        {showSignup
          ? <SignupScreen onSignup={handleSignup} onGoLogin={()=>setShowSignup(false)} />
          : <LoginScreen  onLogin={handleLogin}   onGoSignup={()=>setShowSignup(true)} />
        }
      </>
    );
  }

  /* ── Kid PIN gate ── */
  if (mode === "kid" && !kidUnlocked) {
    return (
      <>
        <StyleInjector />
        <KidPINEntry correctPin={kidPin} onSuccess={()=>setKidUnlocked(true)} onBack={switchToParentMode} />
      </>
    );
  }

  /* ── Kid portal ── */
  if (mode === "kid" && kidUnlocked) {
    return (
      <>
        <StyleInjector />
        <KidPortal child={activeKid} videos={videos} onExit={switchToParentMode} />
      </>
    );
  }

  /* ── Parent app ── */
  const NAV = [
    { id:"home",     icon:"🏠", label:"Home"     },
    { id:"videos",   icon:"🎬", label:"Videos"   },
    { id:"kids",     icon:"👶", label:"Kids"     },
    { id:"settings", icon:"⚙️",  label:"Settings" },
  ];

  return (
    <>
      <StyleInjector />
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-logo">Sprout<span>Stream</span></div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span className="mode-badge">Parent Mode</span>
            {children.length > 0 && (
              <button className="btn-primary" style={{ fontSize:".8rem", padding:".4rem .9rem" }} onClick={()=>switchToKidMode(children[0])}>
                🎮 Kid Mode
              </button>
            )}
          </div>
        </header>

        <main className="main-content">
          {tab==="home"     && <HomeTab user={authState} videos={videos} children={children} setTab={setTab} />}
          {tab==="videos"   && <VideosTab videos={videos} onUpload={handleUpload} />}
          {tab==="kids"     && (
            <KidsTab
              children={children}
              onAdd={()=>{ setEditingChild(null); setChildModal(true); }}
              onEdit={c=>{ setEditingChild(c); setChildModal(true); }}
              onDelete={id=>{ setChildren(cs=>cs.filter(c=>c.id!==id)); showToast("Profile deleted"); }}
              onSwitchKid={switchToKidMode}
            />
          )}
          {tab==="settings" && (
            <SettingsTab
              user={authState} kidPin={kidPin} onChangePin={setKidPin}
              onSignOut={handleSignOut}
              notifications={notifications} setNotifications={setNotifications}
              autoplay={autoplay} setAutoplay={setAutoplay}
            />
          )}
        </main>

        <nav className="bottom-nav">
          {NAV.map(item => (
            <div key={item.id} className={`nav-item ${tab===item.id?"active":""}`} onClick={()=>setTab(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
      </div>

      {childModal && (
        <ChildModal
          child={editingChild}
          onSave={handleSaveChild}
          onClose={()=>{ setChildModal(false); setEditingChild(null); }}
        />
      )}

      <Toast message={toast} />
    </>
  );
}
