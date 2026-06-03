import React, { Suspense, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./styles.css";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./ProtectedRoute";
import { loadRemoteComponent } from "./remotes/remoteLoader";
import { getRemoteUrl } from "./config/remoteConfig";

// Remote Module Imports
const CloudLabsApp = React.lazy(
  loadRemoteComponent({
    remoteName: "cloud_labs",
    exposedModule: "./CloudLabsApp",
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
const VirtualMachineApp = React.lazy(
  loadRemoteComponent({
    remoteName: "virtual_machine",
    exposedModule: "./VirtualMachineApp",
    getRemoteUrl,
  }),
);

// Error Boundary
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

// Loading Fallback
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

// Remote Wrapper
function RemoteWrapper({ name, remoteName, component: Component }) {
  const [key, setKey] = useState(0);

  function handleRetry() {
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
        <div key={key} className="remote-host">
          <Component />
        </div>
      </Suspense>
    </RemoteErrorBoundary>
  );
}

// Main App Layout
function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
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
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RemoteWrapper
                    name="Dashboard"
                    remoteName="dashboard"
                    component={DashboardApp}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cloud-labs"
              element={
                <ProtectedRoute>
                  <RemoteWrapper
                    name="Cloud Labs"
                    remoteName="cloud_labs"
                    component={CloudLabsApp}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/virtual-machine"
              element={
                <ProtectedRoute>
                  <RemoteWrapper
                    name="Virtual Machine"
                    remoteName="virtual_machine"
                    component={VirtualMachineApp}
                  />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// Root App
export default function App() {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
