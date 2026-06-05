import React from "react";
import { useTheme } from "../contexts/ThemeContext";

export function PageHeader({
  title,
  actions = null,
  loading = false,
  onRefresh = null,
  showThemeToggle = true,
  className = "",
  ...props
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      className={`flex flex-col md:flex-row items-center justify-between mb-8 mt-2 sticky top-4 z-30 bg-white/95 dark:bg-brand-card/95 backdrop-blur-md rounded-2xl p-2 pr-4 shadow-sm border border-gray-150/50 dark:border-white/5 transition-all shrink-0 ${className}`}
      {...props}
    >
      <div className="flex items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none px-4 whitespace-nowrap">
          {title}
        </h1>
        <div className="h-8 w-[1px] bg-gray-100 dark:bg-white/10 mx-2" />
      </div>

      <div className="flex-1 px-4" />

      <div className="flex items-center gap-3 pl-4 border-l border-gray-100 dark:border-white/10">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="w-10 h-10 rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center justify-center"
            title="Refresh"
            disabled={loading}
          >
            <svg
              className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18"
              />
            </svg>
          </button>
        )}

        {showThemeToggle && (
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center justify-center"
            title="Toggle Theme"
          >
            <span className="material-symbols-outlined text-[22px]">
              {theme === "dark" ? "dark_mode" : "light_mode"}
            </span>
          </button>
        )}

        {actions && (
          <>
            {(onRefresh || showThemeToggle) && (
              <div className="h-8 w-[1px] bg-gray-100 dark:bg-white/10 mx-2" />
            )}
            <div className="flex items-center gap-2">{actions}</div>
          </>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
