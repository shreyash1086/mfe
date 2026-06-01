import React, { Suspense, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";
import "./styles.css";
import { loadRemoteComponent, loadRemoteModule } from "./remotes/remoteLoader";
import { getRemoteUrl } from "./config/remoteConfig";

// ─── Remote Module Imports ────────────────────────────────────────────────────
// These are NOT local files. At runtime, Webpack fetches:
//   auth/AuthApp       → http://localhost:3001/remoteEntry.js
//   dashboard/DashboardApp → http://localhost:3002/remoteEntry.js
//   profile/ProfileApp → http://localhost:3003/remoteEntry.js
// Each module ships its own React bundle; the shell only loads them on demand.
// ─────────────────────────────────────────────────────────────────────────────

// Create lazily-loaded remote components using runtime loader + runtime config
const AuthApp = React.lazy(
  loadRemoteComponent({
    remoteName: "auth",
    exposedModule: "./AuthApp",
    getRemoteUrl,
  }),
);
const DashboardApp = React.lazy(
  loadRemoteComponent({
    remoteName: "dashboard",
    exposedModule: "./DashboardApp",
    getRemoteUrl,
  }),
);
const ProfileApp = React.lazy(
  loadRemoteComponent({
    remoteName: "profile",
    exposedModule: "./ProfileApp",
    getRemoteUrl,
  }),
);

// ─── Error Boundary ───────────────────────────────────────────────────────────
// If a remote module is offline, this catches the failure gracefully.
class RemoteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  reset() {
    this.setState({ error: null });
    if (this.props.onRetry) this.props.onRetry();
  }
  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <div className="error-icon">⚡</div>
          <h3>Module Unavailable</h3>
          <p>
            The <strong>{this.props.name}</strong> module could not be loaded.
          </p>
          <p className="error-hint">
            Check the container or network; then retry.
          </p>
          <code className="error-detail">{this.state.error.message}</code>
          <div style={{ marginTop: 12 }}>
            <button onClick={() => this.reset()}>Retry</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Loading Fallback ─────────────────────────────────────────────────────────
function ModuleLoader({ name }) {
  return (
    <div className="module-loader">
      <div className="loader-ring" />
      <p>
        Loading <strong>{name}</strong> module...
      </p>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Sidebar({ isOpen, onClose }) {
  const links = [
    { to: "/dashboard", label: "Dashboard", icon: "📊", },
    { to: "/auth", label: "Kloud Labs", icon: "🔐",},
    { to: "/profile", label: "Virtual Machine", icon: "👤", },
  ];

  return (
    <>
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">LabsKraft</span>
        </div>
        <div className="sidebar-label">MODULES</div>
        <nav className="sidebar-nav">
          {links.map(({ to, label, icon, port }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        {/* <div className="sidebar-footer">
          <div className="shell-badge">SHELL · PORT 3000</div>
          <p className="footer-note">
            Each module runs in its own Docker container and is loaded at
            runtime via Webpack Module Federation.
          </p>
        </div> */}
      </aside>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
    </>
  );
}

// ─── Shell App ────────────────────────────────────────────────────────────────
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <div className="shell-root">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="shell-main">
          <header className="topbar">
            <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
              ☰
            </button>
            <div className="topbar-title">Micro-Frontend Shell</div>
            <div className="topbar-status">
              <span className="status-dot" />
              All modules live
            </div>
          </header>

          <main className="content-area">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/auth"
                element={
                  <RemoteWrapper
                    name="Auth"
                    remoteName="auth"
                    component={AuthApp}
                  />
                }
              />
              <Route
                path="/dashboard"
                element={
                  <RemoteWrapper
                    name="Dashboard"
                    remoteName="dashboard"
                    component={DashboardApp}
                  />
                }
              />
              <Route
                path="/profile"
                element={
                  <RemoteWrapper
                    name="Profile"
                    remoteName="profile"
                    component={ProfileApp}
                  />
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

// RemoteWrapper: wraps lazy remote component with error boundary, suspense and retry
function RemoteWrapper({ name, remoteName, component: Component }) {
  // key is used to force remount on retry
  const [key, setKey] = useState(0);

  function handleRetry() {
    // attempt to remove script so loader will re-fetch; best-effort
    try {
      const url = getRemoteUrl(remoteName);
      const scripts = [...document.scripts];
      scripts.forEach((s) => {
        if (s.src && s.src.indexOf(url) !== -1) s.parentNode.removeChild(s);
      });
    } catch (e) {
      // ignore
    }
    setKey((k) => k + 1);
  }

  return (
    <RemoteErrorBoundary name={name} onRetry={handleRetry}>
      <Suspense fallback={<ModuleLoader name={name} />}>
        {/* key forces React to re-create lazy component on retry */}
        <div key={key} className="remote-host">
          <Component />
        </div>
      </Suspense>
    </RemoteErrorBoundary>
  );
}
