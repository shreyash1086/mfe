import React from "react";

export function Badge({
  variant = "neutral",
  size = "md",
  children,
  className = "",
  dot = false,
  ...props
}) {
  const baseStyles = "inline-flex items-center font-bold tracking-wider uppercase whitespace-nowrap rounded-full";
  
  const sizeStyles = {
    sm: "px-2 py-0.5 text-[9px]",
    md: "px-2.5 py-1 text-[10px]",
    lg: "px-3.5 py-1.5 text-xs",
  };

  const variantStyles = {
    neutral: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300",
    info: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    success: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    warning: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
    error: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    accent: "bg-brand-accent/10 text-brand-accent dark:bg-brand-accent/20 dark:text-brand-accent",
  };

  const dotColors = {
    neutral: "bg-gray-400",
    info: "bg-blue-500",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    accent: "bg-brand-accent",
  };

  const selectedVariant = variantStyles[variant] || variantStyles.neutral;
  const selectedDotColor = dotColors[variant] || dotColors.neutral;

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${selectedVariant} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${selectedDotColor}`} />
      )}
      {children}
    </span>
  );
}

export default Badge;
