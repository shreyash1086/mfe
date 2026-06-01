import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "./ThemeContext";
import { useAuth } from "./AuthContext";
import AccessDenied from "./AccessDenied";

function CloudLabs() {
  const { theme, toggleTheme } = useTheme();
  const { userRole, loading: authLoading, accessFlags } = useAuth();
  const darkMode = theme === "dark";

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!accessFlags.labs_access) {
    return <AccessDenied />;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)] w-full bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-100 font-['Poppins',sans-serif] transition-colors duration-500 relative">
      <div className="px-6 pt-6 pb-3 w-full flex-1 flex flex-col mx-auto">
        {/* Header Area - Pill Style/Sticky */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 mt-2 sticky top-4 z-30 bg-white dark:bg-brand-card rounded-2xl p-2 pr-4 shadow-sm mx-2 md:mx-0 border border-gray-100 dark:border-white/5 transition-all shrink-0">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none px-4 whitespace-nowrap">
              Kloud Labs
            </h1>
            <div className="h-8 w-[1px] bg-gray-100 dark:bg-white/10 mx-2" />
          </div>

          <div className="flex-1 px-4" />

          <div className="flex items-center gap-3 pl-4 border-l border-gray-100 dark:border-white/10">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center justify-center pt-0.5"
              title="Toggle Theme"
            >
              <span className="material-symbols-outlined text-[22px]">
                {theme === "dark" ? "dark_mode" : "light_mode"}
              </span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-220px)] py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg bg-white dark:bg-brand-card rounded-[32px] p-12 text-center border border-gray-100 dark:border-white/5 shadow-xl shadow-gray-200/20 dark:shadow-black/40"
          >
            <div className="w-24 h-24 bg-blue-500/10 rounded-[28px] flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-4xl text-blue-500">
                cloud
              </span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
              Kloud Labs Experience
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 leading-relaxed">
              We're building a seamless cloud training environment. This feature
              will be available in the next release.
            </p>
            {/* <div className="inline-flex items-center gap-2 px-6 py-2 bg-gray-50 dark:bg-white/5 rounded-full text-sm font-bold text-blue-600 dark:text-blue-400 border border-blue-500/10">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              DEVELOPMENT IN PROGRESS
            </div> */}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default CloudLabs;
