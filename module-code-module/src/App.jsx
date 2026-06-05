import React from "react";
import { BrowserRouter, useInRouterContext } from "react-router-dom";
import "./styles.css";
import CodeModule from "./CodeModule";
import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";

function CodeModuleProviders() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CodeModule />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default function App() {
  const inRouter = useInRouterContext();

  const content = <CodeModuleProviders />;

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
