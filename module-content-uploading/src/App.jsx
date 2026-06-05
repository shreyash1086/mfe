import React from "react";
import { BrowserRouter, useInRouterContext, Routes, Route } from "react-router-dom";
import "./styles.css";
import Content from "./Content";
import CohortContent from "./CohortContent";
import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";

function ContentUploadingProviders() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<Content />} />
          <Route path="/cohort-content" element={<CohortContent />} />
          <Route path="/cohort-content/:cohortId" element={<CohortContent />} />
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default function App() {
  const inRouter = useInRouterContext();

  const content = <ContentUploadingProviders />;

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
