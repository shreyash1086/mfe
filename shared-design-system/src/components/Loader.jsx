import React from "react";

export function Loader({
  size = "md",
  fullscreen = false,
  message = "Loading...",
  className = "",
  ...props
}) {
  const sizeStyles = {
    sm: "w-5 h-5 border-2",
    md: "w-10 h-10 border-[3px]",
    lg: "w-16 h-16 border-[4px]",
  };

  const loaderContent = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`} {...props}>
      <div className="relative">
        {/* Outer Glow Spinner */}
        <div
          className={`rounded-full border-t-brand-accent border-r-brand-accent border-b-transparent border-l-transparent animate-spin ${sizeStyles[size]}`}
        />
        {/* Inner static border */}
        <div
          className={`absolute inset-0 rounded-full border-white/5 pointer-events-none ${sizeStyles[size]}`}
        />
      </div>
      {message && (
        <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80 dark:bg-brand-dark/80 backdrop-blur-md">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}

export default Loader;
