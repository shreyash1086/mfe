import React from "react";
import { BrowserRouter, useInRouterContext } from "react-router-dom";
import "./styles.css";
import Logs from "./Logs";
import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";

function LogsProviders() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Logs />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default function App() {
  const inRouter = useInRouterContext();

  const content = <LogsProviders />;

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
