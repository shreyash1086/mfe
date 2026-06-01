import React from 'react';
import { motion } from 'framer-motion';

const AccessDenied = () => {
    return (
        <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-100 font-['Poppins',sans-serif] transition-colors duration-500">
            <div className="flex-1 flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-lg bg-white dark:bg-[#0d0d0d] rounded-[32px] p-12 text-center border border-gray-100 dark:border-white/10 shadow-xl shadow-gray-200/20 dark:shadow-black/40"
                >
                    <div className="w-24 h-24 bg-red-500/10 rounded-[28px] flex items-center justify-center mx-auto mb-8">
                        <span className="material-symbols-outlined text-5xl text-red-500">lock</span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">Access Denied</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 leading-relaxed">
                        You do not have permission to access this section. Please contact your administrator for access.
                    </p>

                </motion.div>
            </div>
        </div>
    );
};

export default AccessDenied;
