import React from "react";

export function Card({
  children,
  className = "",
  hoverEffect = true,
  gridBg = true,
  accentColor = "#06b6d4", // Default cyan highlight
  ...props
}) {
  return (
    <div
      className={`bg-white dark:bg-brand-card p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-white/5 transition-all duration-300 relative overflow-hidden group ${
        hoverEffect
          ? "hover:shadow-lg hover:shadow-brand-accent/5 hover:border-brand-accent/20 dark:hover:border-brand-accent/30 hover:scale-[1.02]"
          : ""
      } ${className}`}
      {...props}
    >
      {/* Decorative Grid Background */}
      {gridBg && (
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none transition-opacity duration-500 group-hover:opacity-[0.08]"
          style={{
            backgroundImage: `radial-gradient(circle, ${accentColor} 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      )}
      <div className="relative z-10 h-full flex flex-col">{children}</div>
    </div>
  );
}

export default Card;
