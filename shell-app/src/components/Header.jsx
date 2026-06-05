import React from 'react';
import { useLocation } from 'react-router-dom';

function Header({ onToggleSidebar }) {
    const location = useLocation();

    // Helper to determine page title
    const getPageTitle = (pathname) => {
        if (pathname === '/dashboard') return 'Overview';
        if (pathname === '/virtual-machine') return 'Virtual Machine';
        if (pathname === '/cloud-console') return 'Cloud Console';
        if (pathname === '/cloud-labs') return 'Cloud Labs';
        if (pathname === '/content-uploading') return 'Content Bank';
        if (pathname.startsWith('/cohort-content')) return 'Cohort Content';
        if (pathname === '/assessment') return 'Assessments';
        if (pathname === '/create-assessment') return 'New Assessment';
        if (pathname === '/assessments-list') return 'Assessments List';
        if (pathname === '/reports') return 'Reports';
        if (pathname === '/assessment-datasets') return 'Upload SQL DB';
        if (pathname === '/available-databases') return 'Available Databases';
        if (pathname === '/assessment-mcq') return 'Upload MCQ CSV';
        if (pathname === '/available-mcq-datasets') return 'Available MCQ Datasets';
        if (pathname === '/cloud-console') return 'Cloud Console';
        if (pathname === '/code-env') return 'Code Environment';
        if (pathname === '/code') return 'CODE';
        if (pathname === '/code-module') return 'Kode Env';
        if (pathname === '/system-logs') return 'System Logs';
        if (pathname === '/quescode-manager') return 'Code Manager';
        if (pathname === '/assessment' || pathname.includes('/take')) return '';
        return '';
    };

    const pageTitle = getPageTitle(location.pathname);
    const isDashboard = location.pathname === '/dashboard';
    const isCustomHeaderPage = pageTitle === 'Content Bank' || pageTitle === 'Cohort Content' || pageTitle === 'Assessments' || pageTitle === 'New Assessment' || pageTitle === 'Assessments List' || pageTitle === 'Reports' || pageTitle === 'Upload SQL DB' || pageTitle === 'Available Databases' || pageTitle === 'Upload MCQ CSV' || pageTitle === 'Available MCQ Datasets' || pageTitle === 'Cloud Console' || pageTitle === 'Virtual Machine' || pageTitle === 'Cloud Labs' || pageTitle === 'Code Environment' || pageTitle === 'CODE' || pageTitle === 'Code Manager' || pageTitle === 'System Logs' || pageTitle === 'Kode Env' || location.pathname.includes('/take') || location.pathname.startsWith('/code-module');
    const shouldCollapse = isDashboard || isCustomHeaderPage;

    return (
        <header className={`flex-shrink-0 w-full z-20 flex items-center justify-between px-6 md:px-8 transition-all duration-300 ${shouldCollapse ? 'h-20 md:h-0 md:opacity-0 md:pointer-events-none overflow-hidden' : 'h-20 bg-transparent'}`}>
            <div className="flex items-center gap-4">
                {/* Mobile Toggle - Only show if not dashboard on desktop, or always on mobile */}
                <button
                    onClick={onToggleSidebar}
                    className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors pointer-events-auto"
                >
                    <span className="material-symbols-outlined text-2xl">menu</span>
                </button>

                {/* Page Title - Hide for Dashboard and Content Bank (custom headers) */}
                {!isDashboard && !isCustomHeaderPage && (
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">
                        {pageTitle}
                    </h2>
                )}
            </div>

            {/* Right Side Actions (Optional Global Items) */}
            <div className="flex items-center gap-4">
                {/* Placeholder for global actions if needed later */}
            </div>
        </header>
    );
}

export default Header;
