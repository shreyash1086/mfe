import React from "react";
import { motion } from "framer-motion";

const LoginLoader = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-950 dark:via-black dark:to-gray-950 z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-black tracking-tight text-[#B11917] dark:text-[#ff5555]"
          style={{ fontFamily: "'Averia Serif Libre', serif" }}
        >
          LabsKraft
        </motion.div>

        {/* Spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900/30 border-t-blue-600 dark:border-t-blue-400 rounded-full"
        />

        {/* Status Text */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-600 dark:text-gray-400 text-sm font-medium"
        >
          Authenticating...
        </motion.p>
      </div>
    </div>
  );
};

export default LoginLoader;
