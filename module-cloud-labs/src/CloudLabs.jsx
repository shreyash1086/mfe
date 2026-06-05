import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "./ThemeContext";
import { useAuth } from "./AuthContext";
import AccessDenied from "./AccessDenied";
import PageHeader from "sharedDesignSystem/PageHeader";
import Card from "sharedDesignSystem/Card";

function CloudLabs() {
  const { theme } = useTheme();
  const { loading: authLoading, accessFlags } = useAuth();

  if (authLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-brand-dark">
        <div className="w-12 h-12 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!accessFlags.labs_access) {
    return <AccessDenied />;
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-brand-dark text-gray-800 dark:text-gray-100 font-['Poppins',sans-serif] transition-colors duration-500 relative">
      <div className="px-6 pt-6 pb-3 w-full flex-1 flex flex-col mx-auto">
        <PageHeader title="Kloud Labs" />

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg"
          >
            <Card className="p-12 text-center">
              <div className="w-24 h-24 bg-brand-accent/10 rounded-[28px] flex items-center justify-center mx-auto mb-8">
                <span className="material-symbols-outlined text-4xl text-brand-accent">
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
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default CloudLabs;
