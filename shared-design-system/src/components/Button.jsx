import React from "react";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon = null,
  children,
  className = "",
  disabled = false,
  ...props
}) {
  const baseStyles = "inline-flex items-center justify-center font-bold transition-all active:scale-95 whitespace-nowrap focus:outline-none disabled:opacity-50 disabled:pointer-events-none";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
    md: "px-5 py-2 text-sm rounded-xl gap-2",
    lg: "px-6 py-3 text-base rounded-2xl gap-2.5",
  };

  const variantStyles = {
    primary: "bg-brand-accent hover:bg-brand-accent-hover text-white shadow-lg shadow-brand-accent/20 dark:bg-brand-accent dark:hover:bg-brand-accent-hover",
    secondary: "bg-gray-100 hover:bg-gray-250 text-gray-800 dark:bg-white/5 dark:hover:bg-white/10 dark:text-gray-100 border border-gray-200 dark:border-white/5",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20",
    ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300",
  };

  const variantStylesWithBrand = {
    ...variantStyles,
    // Add blue variants to mimic the standard blue-600 buttons used across the dashboard
    blue: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20",
  };

  const selectedVariant = variantStylesWithBrand[variant] || variantStylesWithBrand.primary;

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size]} ${selectedVariant} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        <span className="flex items-center justify-center shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

export default Button;
