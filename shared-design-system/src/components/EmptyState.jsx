import React from "react";

export function EmptyState({
  title = "No data found",
  description = "There are no items to display at the moment.",
  icon = null,
  action = null,
  className = "",
  ...props
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-3xl ${className}`}
      {...props}
    >
      <div className="p-4 mb-4 rounded-full bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500">
        {icon ? (
          icon
        ) : (
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        )}
      </div>
      <h3 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="max-w-xs mb-6 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}

export default EmptyState;
