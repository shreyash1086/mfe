import React from "react";
import { BrowserRouter, useInRouterContext } from "react-router-dom";
import "./styles.css";
import Dashboard from "./Dashboard";
import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";

function DashboardProviders() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Dashboard />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default function App() {
  const inRouter = useInRouterContext();

  const content = <DashboardProviders />;

  // Standalone module-dashboard needs its own router for useNavigate,
  // but the shell already provides one when the remote is mounted there.
  return inRouter ? (
    content
  ) : (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      {content}
    </BrowserRouter>
  );
}
