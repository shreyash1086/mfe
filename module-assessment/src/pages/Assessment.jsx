import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    PlusSquare,
    Library,
    TrendingUp,
    Database,
    FileCheck,
    Terminal
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import Breadcrumbs from '../components/Breadcrumbs';
import PageHeader from 'sharedDesignSystem/PageHeader';
import Card from 'sharedDesignSystem/Card';

// --- Animated Icon Components (Brand-Specific Path-Level) ---

const AnimatedCreateIcon = ({ color }) => (
    <div className="relative">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={color}>
            <motion.circle
                cx="12" cy="12" r="9"
                stroke="currentColor" strokeWidth="2"
                animate={{ pathLength: [0, 1, 1, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
                d="M12 8V16"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
            <motion.path
                d="M8 12H16"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
        </svg>
    </div>
);

const AnimatedLibraryIcon = ({ color }) => (
    <div className="relative overflow-hidden">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={color}>
            <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2" />

            {/* Masking Group for Scrolling Lines */}
            <g clipPath="url(#lineClip)">
                <motion.g
                    animate={{ y: [0, -12] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                    <path d="M7 7H17M7 10H17M7 13H17M7 16H17M7 19H17M7 22H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </motion.g>
            </g>

            <defs>
                <clipPath id="lineClip">
                    <rect x="6" y="5" width="12" height="14" />
                </clipPath>
            </defs>
        </svg>
    </div>
);

const AnimatedAnalyticsIcon = ({ color }) => (
    <div className="relative">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={color}>
            <motion.path
                d="M3 18L9 12L13 16L21 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{ pathLength: [0, 1, 1, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
                d="M16 8H21V13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
        </svg>
    </div>
);

const AnimatedDatabaseIcon = ({ color }) => (
    <div className="relative">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={color}>
            <ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="2" />
            <motion.path
                d="M3 5V19C3 20.6569 7.02944 22 12 22C16.9706 22 21 20.6569 21 19V5"
                stroke="currentColor"
                strokeWidth="2"
                animate={{ strokeDasharray: ["0, 50", "50, 0"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <motion.path
                d="M3 12C3 13.6569 7.02944 15 12 15C16.9706 15 21 13.6569 21 12"
                stroke="currentColor"
                strokeWidth="2"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
        </svg>
    </div>
);

const AnimatedMCQIcon = ({ color }) => (
    <div className="relative">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={color}>
            <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <motion.path
                d="M7 13H11"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                animate={{ pathLength: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.path
                d="M7 17H15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                animate={{ pathLength: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
        </svg>
    </div>
);

const AnimatedCodeIcon = ({ color }) => (
    <div className="relative">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={color}>
            <motion.path
                d="M4 17L10 11L4 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{ x: [-2, 2, -2] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.line
                x1="12" y1="19" x2="20" y2="19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "steps(2)" }}
            />
        </svg>
    </div>
);

function Assessment() {
    const navigate = useNavigate();
    const { userRole } = useAuth();

    const { theme } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    const breadcrumbItems = [
        { label: 'Assesment', path: '/assessment', active: true },
    ];

    const cards = [
        {
            title: 'Create Assessments',
            description: 'Design custom quizzes, coding labs, and technical exams with our intuitive builder.',
            icon: AnimatedCreateIcon,
            actionText: 'Launch Builder',
            route: '/assessment/create-assessment',
            color: 'text-brand-accent',
            iconBg: 'bg-brand-accent/10',
            btnBg: 'bg-brand-accent',
            id: 'create'
        },
        {
            title: 'Assessment Library',
            description: 'Access 500+ pre-built technical assessments for cloud, security, and devops.',
            icon: AnimatedLibraryIcon,
            actionText: 'Browse Library',
            route: '/assessment/assessments-list',
            color: 'text-emerald-500',
            iconBg: 'bg-emerald-500/10',
            btnBg: 'bg-emerald-600',
            id: 'library'
        },
        {
            title: 'Reports & Analytics',
            description: 'Detailed performance heatmaps, cohort benchmarking, and student skill profiles.',
            icon: AnimatedAnalyticsIcon,
            actionText: 'View Performance',
            route: '/assessment/reports',
            color: 'text-purple-500',
            iconBg: 'bg-purple-500/10',
            btnBg: 'bg-purple-600',
            id: 'reports'
        },
        {
            title: 'SQL Databases',
            description: 'Manage sandbox environments for SQL practical assessments and query challenges.',
            icon: AnimatedDatabaseIcon,
            actionText: 'Manage DBs',
            route: '/assessment/assessment-datasets',
            color: 'text-orange-500',
            iconBg: 'bg-orange-500/10',
            btnBg: 'bg-orange-600',
            id: 'sql'
        },
        {
            title: 'MCQ Datasets',
            description: 'Curate and version-control your question banks for automated randomized testing.',
            icon: AnimatedMCQIcon,
            actionText: 'Edit Datasets',
            route: '/assessment/assessment-mcq',
            color: 'text-brand-accent',
            iconBg: 'bg-brand-accent/10',
            btnBg: 'bg-brand-accent',
            id: 'mcq'
        },
    ];

    const filteredCards = cards.filter(card => {
        if (userRole === 'candidate' || userRole === 'trainer') {
            return ['/assessment/assessments-list', '/assessment/reports'].includes(card.route);
        }
        return true;
    }).filter(card =>
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="w-full h-screen bg-gray-50 dark:bg-brand-dark px-6 py-8 font-['Poppins',sans-serif] transition-colors duration-500 overflow-hidden flex flex-col">
            <PageHeader 
              title="Assessment Dashboard" 
              actions={
                <div className="flex items-center gap-4">
                  {userRole === 'trainer' && (
                      <Breadcrumbs items={breadcrumbItems} transparent={true} className="mb-0" />
                  )}
                  <div className="flex items-center px-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 py-1.5 max-w-xs group">
                      <span className="material-symbols-outlined text-gray-400 group-focus-within:text-brand-accent transition-colors mr-2 text-xl">search</span>
                      <input
                          type="text"
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-transparent border-none text-xs focus:ring-0 text-gray-700 dark:text-white placeholder-gray-400 font-medium w-36 outline-none"
                      />
                  </div>
                  {userRole === 'admin' && (
                      <button
                          onClick={() => navigate('/assessment/create-assessment')}
                          className="h-10 px-4 bg-brand-accent hover:bg-brand-accent-hover text-white text-[11px] font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-brand-accent/25 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                      >
                          <span className="material-symbols-outlined text-[18px]">add</span>
                          New
                      </button>
                  )}
                </div>
              }
            />

            <div className="w-full flex-1 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 h-full overflow-y-auto pl-4 pt-4 pr-2 pb-12 custom-scrollbar">
                    {filteredCards.map((card) => {
                        const isBlue = card.color === 'text-blue-500';
                        const iconColor = isBlue ? 'text-brand-accent' : card.color;
                        const iconBg = isBlue ? 'bg-brand-accent/10' : card.iconBg;
                        const hoverBorderColor = isBlue ? 'group-hover:text-brand-accent' : '';

                        return (
                            <Link to={card.route} key={card.id} className="h-full w-full">
                                <Card className="p-8 h-full">
                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className={`w-16 h-10 ${iconBg} rounded-full mb-8 flex items-center justify-center group-hover:scale-110 transition-all duration-500`}>
                                            <card.icon color={iconColor} />
                                        </div>

                                        <h3 className={`text-2xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight transition-colors ${hoverBorderColor || 'group-hover:text-brand-accent'}`}>
                                            {card.title}
                                        </h3>

                                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                                            {card.description}
                                        </p>
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .delay-0 { transition-delay: 0ms; }
                .delay-100 { transition-delay: 100ms; }
                .delay-200 { transition-delay: 200ms; }
                .delay-300 { transition-delay: 300ms; }
            ` }} />
        </div >
    );
}

export default Assessment;
