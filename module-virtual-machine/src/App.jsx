import React from "react";
import { BrowserRouter, useInRouterContext } from "react-router-dom";
import "./styles.css";
import VirtualMachine from "./VirtualMachine";
import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";

function VMProviders() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <VirtualMachine />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default function App() {
  const inRouter = useInRouterContext();

  const content = <VMProviders />;

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
