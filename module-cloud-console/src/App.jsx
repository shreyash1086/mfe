import React from "react";
import { BrowserRouter, useInRouterContext } from "react-router-dom";
import "./styles.css";
import CloudConsole from "./CloudConsole";
import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";

function CloudConsoleProviders() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CloudConsole />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default function App() {
  const inRouter = useInRouterContext();

  const content = <CloudConsoleProviders />;

  // Standalone module-profile needs its own router for useNavigate,
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
