import React from "react";
import { BrowserRouter, useInRouterContext } from "react-router-dom";
import "./styles.css";
import CodeEnvironment from "./CodeEnvironment";
import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";

function CodeEnvironmentProviders() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CodeEnvironment />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default function App() {
  const inRouter = useInRouterContext();

  const content = <CodeEnvironmentProviders />;

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
