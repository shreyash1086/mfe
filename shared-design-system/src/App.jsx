import React, { useState } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import PageHeader from "./components/PageHeader";
import Button from "./components/Button";
import Card from "./components/Card";
import Badge from "./components/Badge";
import Loader from "./components/Loader";
import EmptyState from "./components/EmptyState";
import Toast from "./components/Toast";
import "./styles/global.css";

function AppContent() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const triggerToast = (type, message) => {
    setToast({ type, message });
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-brand-dark text-slate-800 dark:text-brand-text p-6 transition-colors duration-300 font-sans">
      <PageHeader
        title="Design System Showcase"
        loading={loading}
        onRefresh={handleRefresh}
        actions={
          <Button
            variant="blue"
            size="sm"
            onClick={() => triggerToast("success", "Welcome to Design System!")}
          >
            Show Welcome Toast
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Buttons card */}
        <Card title="Buttons" accentColor="#6366f1">
          <h2 className="text-lg font-bold mb-4">Button Showcase</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="blue">Blue Variant</Button>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <Button loading={true}>Loading</Button>
            <Button disabled={true}>Disabled</Button>
          </div>
        </Card>

        {/* Badges card */}
        <Card title="Badges" accentColor="#22c55e">
          <h2 className="text-lg font-bold mb-4">Badge Showcase</h2>
          <div className="flex flex-wrap gap-3">
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="accent">Accent</Badge>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <Badge variant="neutral" dot={true}>Neutral Dot</Badge>
            <Badge variant="info" dot={true}>Info Dot</Badge>
            <Badge variant="success" dot={true}>Success Dot</Badge>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <Badge size="sm">Small</Badge>
            <Badge size="md">Medium</Badge>
            <Badge size="lg">Large</Badge>
          </div>
        </Card>

        {/* Loaders card */}
        <Card title="Loaders" accentColor="#3b82f6">
          <h2 className="text-lg font-bold mb-4">Loader Showcase</h2>
          <div className="flex flex-col gap-6 justify-center items-center h-full min-h-[150px]">
            <Loader size="sm" message="Small Loader" />
            <Loader size="md" message="Medium Loader" />
          </div>
        </Card>
      </div>

      <div className="mt-8 max-w-7xl mx-auto">
        <EmptyState
          title="Empty State Showcase"
          description="This is a clean, reusable empty state component with an action button."
          action={
            <Button variant="primary" onClick={() => triggerToast("info", "Action Triggered!")}>
              Try Action
            </Button>
          }
        />
      </div>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
