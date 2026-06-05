import React from "react";
import { BrowserRouter, useInRouterContext, Routes, Route, Navigate } from "react-router-dom";
import "./styles.css";
import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";
import AccessDenied from "./AccessDenied";

// Import all page components
import Assessment from "./pages/Assessment";
import AssessmentsList from "./pages/AssessmentsList";
import CreateAssessment from "./pages/CreateAssessment";
import AssessmentTaker from "./pages/AssessmentTaker";
import AssessmentReports from "./pages/AssessmentReports";
import AssessmentResult from "./pages/AssessmentResult";
import AssessmentDatasets from "./pages/AssessmentDatasets";
import AssessmentMCQ from "./pages/AssessmentMCQ";
import AvailableDatabases from "./pages/AvailableDatabases";
import AvailableMCQDatasets from "./pages/AvailableMCQDatasets";
import QuescodeManager from "./pages/QuescodeManager";

function AssessmentProviders() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Routes>
          {/* Relative routes inside the module. 
              When mounted under "/assessment/*" in the shell, 
              these match "/assessment", "/assessment/assessments-list", etc. */}
          <Route path="/" element={<Assessment />} />
          <Route path="/assessments-list" element={<AssessmentsList />} />
          <Route path="/create-assessment" element={<CreateAssessment />} />
          <Route path="/:id/take" element={<AssessmentTaker />} />
          <Route path="/reports" element={<AssessmentReports />} />
          <Route path="/results/:attemptId" element={<AssessmentResult />} />
          <Route path="/assessment-datasets" element={<AssessmentDatasets />} />
          <Route path="/assessment-mcq" element={<AssessmentMCQ />} />
          <Route path="/available-databases" element={<AvailableDatabases />} />
          <Route path="/available-mcq-datasets" element={<AvailableMCQDatasets />} />
          <Route path="/quescode-manager" element={<QuescodeManager />} />
          {/* Catch-all redirect to hub */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default function App() {
  const inRouter = useInRouterContext();
  const content = <AssessmentProviders />;

  return inRouter ? (
    content
  ) : (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {content}
    </BrowserRouter>
  );
}
