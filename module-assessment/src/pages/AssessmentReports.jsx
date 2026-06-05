
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import { createPortal } from 'react-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import { ASSESSMENT_API_BASE_URL } from '../api';
import AssessmentLoader from '../components/AssessmentLoader';
import { motion } from 'framer-motion';

const inferCohortFromUser = (username) => {
    if (!username) return null;
    let cohortBase = username;
    if (username.includes('@')) {
        cohortBase = username.split('@')[0];
    }
    const prefixes = ['candidate-', 'trainer-', 'student-', 'user-'];
    for (const p of prefixes) {
        if (cohortBase.startsWith(p)) {
            cohortBase = cohortBase.replace(p, '');
            break;
        }
    }
    if (cohortBase.includes('-')) {
        const parts = cohortBase.split('-');
        return parts.slice(0, -1).join('-');
    }
    return cohortBase;
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    // Ensure appending 'Z' if it's a raw UTC string from MySQL without timezone indicator
    const safeDateString = (typeof dateString === 'string' && !dateString.includes('T') && !dateString.includes('Z'))
        ? dateString.replace(' ', 'T') + 'Z'
        : dateString;
    const date = new Date(safeDateString);

    if (isNaN(date.getTime())) return 'Invalid Date';

    // Convert to IST
    const istOptions = { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
    const istDateString = date.toLocaleString('en-IN', istOptions);

    return `${istDateString} IST`;
};

const getCleanAssessmentName = (name) => {
    if (!name) return 'Unknown Assessment';
    return name.replace(' [KodeEnv]', '').replace('[KodeEnv]', '').replace(' [HideScore]', '').replace('[HideScore]', '').trim();
};

function AssessmentReports() {
    const navigate = useNavigate();
    const { userRole, user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    // Use fallback username if auth context not fully populated (dev mode)
    const currentUserId = user?.username || 'candidate';

    // Admin/Trainer State
    const [activeTab, setActiveTab] = useState('users'); // 'users', 'cohorts', 'assessments'
    const [users, setUsers] = useState([]);
    const [cohorts, setCohorts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Store all attempts locally for filtering
    const [allAttempts, setAllAttempts] = useState([]);

    const uniqueAssessments = React.useMemo(() => {
        if (!allAttempts) return [];
        const map = new Map();
        allAttempts.forEach(a => {
            const id = a.assessment_id;
            if (id && !map.has(id)) {
                map.set(id, {
                    id: id,
                    name: getCleanAssessmentName(a.current_assessment_name || a.assessment_name)
                });
            }
        });
        return Array.from(map.values());
    }, [allAttempts]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedItem, setSelectedItem] = useState('');

    // Detailed View State
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'details'
    const [detailedData, setDetailedData] = useState([]);

    // Candidate/Trainer Personal State
    const [myResults, setMyResults] = useState([]);

    const getSelectedItemName = () => {
        if (!selectedItem) return '';
        return typeof selectedItem === 'object' ? (selectedItem.name || selectedItem.username || selectedItem.id) : selectedItem;
    };

    // ... removed from here and moved after state declarations

    // Fetch All Data (Admin) or My Data (Candidate/Trainer)
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Scenario 1: Fetching Personal Results (Candidate OR Trainer)
                if (userRole === 'candidate' || userRole === 'trainer') {
                    // Fetch Personal Reports
                    const res = await fetch(`${ASSESSMENT_API_BASE_URL}/reports/candidate?userId=${currentUserId}`);
                    if (!res.ok) throw new Error('Failed to fetch your reports');
                    const data = await res.json();

                    // Transform for UI
                    const formatted = data.map(d => ({
                        id: d.id, // Add ID for details view
                        assessmentName: getCleanAssessmentName(d.current_assessment_name || d.assessment_name),
                        date: formatDate(d.submitted_at),
                        score: (d.current_assessment_name || d.assessment_name || '').includes('[HideScore]') ? (
                            <div className="text-gray-500 italic text-sm py-2">Score Hidden</div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <div><span className="font-semibold text-[11px] bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-gray-500">MCQ</span> <span className="font-mono text-xs ml-1">{d.mcq_score}</span> Score <span className="text-gray-300 dark:text-gray-600 mx-1">|</span> <span className="font-mono text-xs">{d.mcq_attempted || 0}/{d.mcq_question_count || d.mcq_total || 0}</span> Qs</div>
                                <div><span className="font-semibold text-[11px] bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-gray-500">SQL</span> <span className="font-mono text-xs ml-1">{d.sql_score}</span> Score <span className="text-gray-300 dark:text-gray-600 mx-1">|</span> <span className="font-mono text-xs">{d.sql_attempted || 0}/{d.sql_question_count || d.sql_total || 0}</span> Qs</div>
                            </div>
                        ),
                        status: 'Completed', // Simple status for now
                    }));
                    setMyResults(formatted);
                }

                // Scenario 2: Fetching Group Data (Admin ONLY)
                if (userRole === 'admin') {
                    // Fetch List from External API (with Cache)
                    if (activeTab === 'users') {
                        const cachedUsers = sessionStorage.getItem('cached_users');
                        let usersList = [];

                        if (cachedUsers) {
                            usersList = JSON.parse(cachedUsers);
                        } else {
                            const res = await fetch('https://x6uz5z6ju2.execute-api.us-west-2.amazonaws.com/SQLAdmin?type=users');
                            if (!res.ok) throw new Error('Failed to fetch users list');
                            const data = await res.json();
                            usersList = data.users || [];
                            sessionStorage.setItem('cached_users', JSON.stringify(usersList));
                        }
                        setUsers(usersList);

                    } else if (activeTab === 'cohorts') {
                        const cachedCohorts = sessionStorage.getItem('cached_cohorts');
                        let cohortsList = [];

                        if (cachedCohorts) {
                            cohortsList = JSON.parse(cachedCohorts);
                        } else {
                            const res = await fetch('https://x6uz5z6ju2.execute-api.us-west-2.amazonaws.com/SQLAdmin?type=cohorts');
                            if (!res.ok) throw new Error('Failed to fetch cohorts list');
                            const data = await res.json();
                            cohortsList = data.cohorts || [];
                            sessionStorage.setItem('cached_cohorts', JSON.stringify(cohortsList));
                        }
                        setCohorts(cohortsList);
                    }

                    // Also Fetch All Attempts from Local Backend for Details (with Cache)
                    const cachedAttempts = sessionStorage.getItem('cached_admin_attempts');
                    if (cachedAttempts) {
                        setAllAttempts(JSON.parse(cachedAttempts));
                    } else {
                        const resAttempts = await fetch(`${ASSESSMENT_API_BASE_URL}/reports/admin/cohort/all`);
                        if (resAttempts.ok) {
                            const dataAttempts = await resAttempts.json();
                            setAllAttempts(dataAttempts);
                            sessionStorage.setItem('cached_admin_attempts', JSON.stringify(dataAttempts));
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUserId, userRole, activeTab]);

    // Reset View when Tab changes
    useEffect(() => {
        if (userRole === 'admin') {
            handleBackToList();
            setSearchQuery(''); // Reset search on tab change
        }
    }, [activeTab]);


    const handleViewDetails = async (item) => {
        setSelectedItem(item);
        setLoading(true);
        setDetailedData([]); // Clear previous

        try {
            let data = [];
            // If viewing by Cohort, fetch specific cohort report
            if (activeTab === 'cohorts') {
                const cohortId = typeof item === 'string' ? item : (item.name || item.id);
                const res = await fetch(`${ASSESSMENT_API_BASE_URL}/reports/admin/cohort/${cohortId}`);
                if (res.ok) {
                    data = await res.json();
                } else {
                    console.error("Failed to fetch cohort results");
                }
            } else if (activeTab === 'users') {
                // For Users
                const userId = typeof item === 'string' ? item : item.username;
                const filtered = allAttempts.filter(d => d.user_id === userId);
                data = filtered;
            } else if (activeTab === 'assessments') {
                // For Assessments
                const asmtId = typeof item === 'string' ? item : item.id;
                const filtered = allAttempts.filter(d => d.assessment_id === asmtId);
                data = filtered;
            }

            const formatted = data.map(d => ({
                id: d.id,
                userName: d.user_id,
                assessmentName: getCleanAssessmentName(d.current_assessment_name || d.assessment_name),
                date: formatDate(d.submitted_at),
                score: (
                    <div className="flex flex-col gap-1">
                        <div><span className="font-semibold text-[11px] bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-gray-500">MCQ</span> <span className="font-mono text-xs ml-1">{d.mcq_score}</span> Score <span className="text-gray-300 dark:text-gray-600 mx-1">|</span> <span className="font-mono text-xs">{d.mcq_attempted || 0}/{d.mcq_question_count || d.mcq_total || 0}</span> Qs</div>
                        <div><span className="font-semibold text-[11px] bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-gray-500">SQL</span> <span className="font-mono text-xs ml-1">{d.sql_score}</span> Score <span className="text-gray-300 dark:text-gray-600 mx-1">|</span> <span className="font-mono text-xs">{d.sql_attempted || 0}/{d.sql_question_count || d.sql_total || 0}</span> Qs</div>
                    </div>
                ),
                status: 'Completed',
            }));

            setDetailedData(formatted);
        } catch (e) {
            console.error(e);
            setError("Failed to load details");
        } finally {
            setLoading(false);
            setViewMode('details');
        }
    };



    const handleBackToList = () => {
        setViewMode('list');
        setSelectedItem('');
        setDetailedData([]);
        if (setAttemptData) setAttemptData(null);
    };

    const handleDownloadCollectively = () => {
        let url = `${ASSESSMENT_API_BASE_URL}/reports/admin/export`;
        
        let idToUse = '';
        if (activeTab === 'assessments') {
            // For assessments, we MUST use selectedItem.id, not the name
            idToUse = typeof selectedItem === 'object' ? (selectedItem.id || selectedItem.name) : selectedItem;
        } else {
            idToUse = typeof selectedItem === 'object' ? (selectedItem.username || selectedItem.name || selectedItem.id) : selectedItem;
        }

        if (activeTab === 'users' && idToUse) {
            url += `?userId=${encodeURIComponent(idToUse)}`;
        } else if (activeTab === 'cohorts' && idToUse) {
            url += `?cohortId=${encodeURIComponent(idToUse)}`;
        } else if (activeTab === 'assessments' && idToUse) {
            url += `?assessmentId=${encodeURIComponent(idToUse)}`;
        }

        window.open(url, '_blank');
    };

    // Helper to render Personal Results Table (Shared by Candidate and Trainer-MyResults)
    const renderPersonalResults = () => (
        <div className="overflow-x-auto bg-white dark:bg-brand-card rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-4">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10">
                        <th className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Assessment Name</th>
                        <th className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Date Taken</th>
                        <th className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Score (MCQ | SQL)</th>
                        <th className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                        <th className="py-4 px-4 text-sm font-semibold text-gray-900 dark:text-white text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {myResults.length > 0 ? (
                        myResults.map((result, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300 font-medium">{result.assessmentName}</td>
                                <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400">{result.date}</td>
                                <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">{result.score}</td>
                                <td className="py-4 px-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${result.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800'}`}>
                                        {result.status}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <button
                                        onClick={() => handleViewAttempt(result.id)}
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                                    >
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4" className="py-8 text-center text-gray-500 dark:text-gray-400">
                                No results found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            {/* Assessment Loader Overlay */}
            {loading && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-in fade-in duration-300 pointer-events-none ml-64">
                    <AssessmentLoader text="Loading Reports..." />
                </div>,
                document.body
            )}
        </div>
    );

    // ATTEMPT DETAILS LOGIC
    const [attemptData, setAttemptData] = useState(null); // { attempt, details }

    const breadcrumbItems = React.useMemo(() => {
        const items = [
            { label: 'Assessment', path: '/assessment' }
        ];

        if (userRole === 'candidate' || userRole === 'trainer') {
            // Personal Results Context
            if (viewMode === 'attempt_details') {
                items.push({
                    label: 'My Results',
                    onClick: () => { setViewMode('list'); setAttemptData(null); }
                });
                items.push({ label: 'Attempt Details' });
            } else {
                items.push({ label: 'My Results' });
            }
        } else {
            // Admin Context
            items.push({
                label: 'Reports',
                onClick: viewMode !== 'list' ? () => { handleBackToList(); setSearchQuery(''); } : null
            });

            if (viewMode === 'details') {
                items.push({ label: `${activeTab === 'cohorts' ? 'Cohort' : (activeTab === 'assessments' ? 'Assessment' : 'User')}: ${getSelectedItemName()}` });
            } else if (viewMode === 'attempt_details') {
                items.push({
                    label: `${activeTab === 'cohorts' ? 'Cohort' : (activeTab === 'assessments' ? 'Assessment' : 'User')}: ${getSelectedItemName()}`,
                    onClick: () => { setViewMode('details'); setAttemptData(null); }
                });
                items.push({ label: `Candidate: ${attemptData?.attempt?.user_id || 'Details'}` });
            }
        }
        return items;
    }, [userRole, viewMode, activeTab, selectedItem, attemptData]);

    const handleViewAttempt = async (attemptId) => {
        setLoading(true);
        try {
            const res = await fetch(`${ASSESSMENT_API_BASE_URL}/reports/attempt/${attemptId}/details`);
            if (res.ok) {
                const data = await res.json();
                setAttemptData(data);
                setViewMode('attempt_details');
            } else {
                setError("Failed to load attempt details");
            }
        } catch (e) {
            console.error(e);
            setError("Network error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full px-6 pb-2 md:pb-4 pt-0 font-['Poppins',sans-serif] bg-gray-50 dark:bg-brand-dark min-h-screen transition-colors duration-300 flex flex-col">
            <div className="w-full flex-1 flex flex-col mx-auto space-y-2">

                {/* Header Area - Pill Style */}
                <div className="w-full bg-white dark:bg-[#09090b] rounded-[28px] px-8 py-3.5 flex items-center shadow-sm border border-gray-100 dark:border-blue-500/10 transition-all hover:shadow-md dark:hover:border-blue-500/30 mb-2">
                    <div className="flex items-center">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none px-4 whitespace-nowrap">
                            Assessment Reports
                        </h1>
                        <div className="h-6 w-[1px] bg-gray-100 dark:bg-white/10 mx-2" />
                        <div className="px-2">
                            <Breadcrumbs items={breadcrumbItems} transparent={true} className="mb-0" />
                        </div>
                    </div>

                    <div className="h-8 w-[1px] bg-gray-100 dark:bg-white/10 mx-4" />

                    <div className="flex-1 px-4" />

                    <div className="flex items-center gap-1.5 px-6">
                        <button onClick={toggleTheme} className="w-10 h-10 rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center justify-center pt-0.5" title="Toggle Theme">
                            <span className="material-symbols-outlined text-[22px]">
                                {theme === 'dark' ? 'dark_mode' : 'light_mode'}
                            </span>
                        </button>
                    </div>

                    <div className="h-8 w-[1px] bg-gray-100 dark:bg-white/10 mx-2" />

                    <div className="pl-4">
                        <button
                            onClick={() => navigate('/assessment')}
                            className="h-11 px-6 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-[12px] font-bold uppercase tracking-wider rounded-2xl flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                            Back
                        </button>
                    </div>
                </div>

                {/* Breadcrumbs container removed as it's now in header */}

                <div className="flex-1 mt-0">
                    {/* Removed outer wrapper card as requested, content sits directly on page background */}
                    <div className="flex flex-col">



                        {viewMode === 'attempt_details' && attemptData ? (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                            {getCleanAssessmentName(attemptData.attempt.assessment_name)} - Details
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Candidate: {attemptData.attempt.user_id} | Date: {formatDate(attemptData.attempt.submitted_at)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setViewMode(userRole === 'admin' ? 'details' : 'list');
                                            setAttemptData(null);
                                        }}
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                                    >
                                        Back to List
                                    </button>
                                </div>

                                {(() => {
                                    const att = attemptData.attempt;
                                    const isScoreHidden = (att.assessment_name || '').includes('[HideScore]') && userRole !== 'admin';
                                    
                                    if (isScoreHidden) {
                                        return (
                                            <div className="mb-8">
                                                <div className="p-8 bg-white dark:bg-brand-card rounded-2xl border border-gray-100 dark:border-white/10 text-center mb-6 relative overflow-hidden shadow-sm flex flex-col items-center justify-center min-h-[200px]">
                                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500"></div>
                                                    <span className="material-symbols-outlined text-4xl text-gray-400 mb-4">visibility_off</span>
                                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Scores are Hidden</h2>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        The results for this assessment are available but the score has been hidden by the administrator.
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    const totalScore = att.mcq_score + att.sql_score;
                                    const totalMax = att.mcq_total + att.sql_total;
                                    const percentage = totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(1) : 0;
                                    const isPass = percentage >= 60;

                                    const formatTime = (s) => {
                                        const m = Math.floor(s / 60);
                                        const sec = s % 60;
                                        return `${m}m ${sec}s`;
                                    };

                                    return (
                                        <div className="mb-8">
                                            {/* Overall Score Card */}
                                            <div className="p-8 bg-white dark:bg-brand-card rounded-2xl border border-gray-100 dark:border-white/10 text-center mb-6 relative overflow-hidden shadow-sm">
                                                <div className={`absolute top-0 left-0 w-full h-1.5 ${isPass ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                                <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-3">Overall Performance</h2>
                                                <div className={`text-5xl font-extrabold mb-2 ${isPass ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                                    {percentage}%
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                                    {totalScore} out of {totalMax} points scored
                                                </p>
                                            </div>

                                            {/* Section Breakdown Cards */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* MCQ Summary */}
                                                <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/20">
                                                    <div className="flex items-center gap-3 mb-4 text-blue-700 dark:text-blue-400">
                                                        <span className="material-symbols-outlined text-xl">list_alt</span>
                                                        <h3 className="font-bold text-sm uppercase tracking-wider">MCQ Section</h3>
                                                    </div>
                                                    <div className="flex justify-between items-end mb-3">
                                                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                                            {att.mcq_score}
                                                            <span className="text-sm text-gray-400 ml-1 font-normal">/ {att.mcq_total}</span>
                                                        </span>
                                                        <div className="text-right">
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase">Attempted</div>
                                                            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{att.mcq_attempted || 0}</div>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-blue-100 dark:bg-blue-900/30 h-1.5 rounded-full overflow-hidden">
                                                        <div className="bg-blue-600 h-full rounded-full transition-all duration-1000" style={{ width: `${(att.mcq_score / (att.mcq_total || 1)) * 100}%` }}></div>
                                                    </div>
                                                </div>

                                                {/* SQL Summary */}
                                                <div className="bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl p-6 border border-purple-100 dark:border-purple-900/20">
                                                    <div className="flex items-center gap-3 mb-4 text-purple-700 dark:text-purple-400">
                                                        <span className="material-symbols-outlined text-xl">database</span>
                                                        <h3 className="font-bold text-sm uppercase tracking-wider">SQL Section</h3>
                                                    </div>
                                                    <div className="flex justify-between items-end mb-3">
                                                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                                            {att.sql_score}
                                                            <span className="text-sm text-gray-400 ml-1 font-normal">/ {att.sql_total}</span>
                                                        </span>
                                                        <div className="text-right">
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase">Attempted</div>
                                                            <div className="text-sm font-bold text-purple-600 dark:text-purple-400">{att.sql_attempted || 0}</div>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-purple-100 dark:bg-purple-900/30 h-1.5 rounded-full overflow-hidden">
                                                        <div className="bg-purple-600 h-full rounded-full transition-all duration-1000" style={{ width: `${(att.sql_score / (att.sql_total || 1)) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="space-y-4">
                                    {attemptData.details.map((q, idx) => {
                                        const isScoreHidden = (attemptData.attempt.assessment_name || '').includes('[HideScore]') && userRole !== 'admin';
                                        return (
                                        <div key={idx} className="bg-white dark:bg-brand-card rounded-xl border border-gray-100 dark:border-white/10 p-5">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${q.type === 'FILE_UPLOAD' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {q.type}
                                                    </span>
                                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                                                        {q.title}
                                                    </h3>
                                                </div>
                                                <div className={`text-xs font-bold px-2 py-1 rounded ${!isScoreHidden && q.status === 'PASS' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {isScoreHidden ? 'Submitted' : (q.status || 'Submitted')}
                                                </div>
                                            </div>

                                            {q.type === 'FILE_UPLOAD' ? (
                                                <div className="mt-4 p-3 bg-gray-50 dark:bg-black/20 rounded-lg flex flex-col gap-3">
                                                    {/* Reference Files Section */}
                                                    {q.metadata && (typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata).resourceUrl && (
                                                        <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                                                            <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2 uppercase">Reference Resources</h4>
                                                            {(() => {
                                                                const meta = typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata;
                                                                const resources = Array.isArray(meta.resourceUrl) ? meta.resourceUrl : [meta.resourceUrl];
                                                                return resources.map((res, i) => {
                                                                    const url = typeof res === 'string' ? res : res.url;
                                                                    const name = typeof res === 'string' ? res.split('/').pop().replace(/^\d+-[0-9a-fA-F-]{36}-/, '') : res.name;
                                                                    return (
                                                                        <div key={i} className="flex items-center justify-between mb-1 last:mb-0">
                                                                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-2">
                                                                                <span className="material-symbols-outlined text-sm">attach_file</span>
                                                                                {name}
                                                                            </a>
                                                                            <a href={url} download className="text-xs text-blue-500 hover:text-blue-700">Download</a>
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center text-purple-600">
                                                                <span className="material-symbols-outlined">description</span>
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                                                                    {q.submission?.originalName || 'Uploaded File'}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {new Date(q.submittedAt).toLocaleTimeString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={q.submission?.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">download</span>
                                                            Download
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-3 rounded-lg">
                                                    {q.type === 'MCQ' && (
                                                        <div>
                                                            <span className="font-semibold">Selected Answer:</span> {typeof q.submission === 'object' ? (q.submission.answer || q.submission.selectedOption || JSON.stringify(q.submission)) : q.submission}
                                                        </div>
                                                    )}
                                                    {q.type === 'SQL' && (
                                                        <div>
                                                            <div className="font-semibold mb-1">Submitted Query:</div>
                                                            <code className="block bg-gray-100 dark:bg-black/30 p-2 rounded text-xs font-mono break-all">
                                                                {typeof q.submission === 'object' ? (q.submission.query || q.submission.sql || JSON.stringify(q.submission)) : q.submission}
                                                            </code>
                                                        </div>
                                                    )}
                                                    {q.type !== 'MCQ' && q.type !== 'SQL' && (
                                                        <div className="font-mono text-xs">{JSON.stringify(q.submission)}</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );})}
                                </div>
                            </div>
                        ) : (userRole === 'candidate' || userRole === 'trainer') ? (
                            // CANDIDATE VIEW & TRAINER PERSONAL VIEW
                            renderPersonalResults()
                        ) : (
                            // ADMIN MANAGERIAL VIEW
                            <>
                                {viewMode === 'list' && (
                                    <>
                                        {/* Tabs & Search */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 shrink-0 gap-4">
                                            {/* Segmented Tab Control */}
                                            <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5">
                                                <button
                                                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'users'
                                                        ? 'bg-white dark:bg-brand-card text-blue-600 dark:text-blue-400 shadow-sm'
                                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                                        }`}
                                                    onClick={() => setActiveTab('users')}
                                                >
                                                    Users
                                                </button>
                                                <button
                                                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'cohorts'
                                                        ? 'bg-white dark:bg-brand-card text-blue-600 dark:text-blue-400 shadow-sm'
                                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                                        }`}
                                                    onClick={() => setActiveTab('cohorts')}
                                                >
                                                    Cohorts
                                                </button>
                                                <button
                                                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'assessments'
                                                        ? 'bg-white dark:bg-brand-card text-blue-600 dark:text-blue-400 shadow-sm'
                                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                                        }`}
                                                    onClick={() => setActiveTab('assessments')}
                                                >
                                                    Assessments
                                                </button>

                                            </div>

                                            {/* Search Bar - Hidden if My Results */}
                                            {activeTab !== 'my_results' && (
                                                <div className="relative w-full md:w-80">
                                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                                                    <input
                                                        type="text"
                                                        placeholder={`Search ${activeTab}...`}
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder-gray-400"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Content */}
                                <div className="flex-1 overflow-auto">
                                    {loading ? (
                                        <div className="flex items-center justify-center h-[60vh]">
                                            <AssessmentLoader text="Loading Reports..." />
                                        </div>
                                    ) : (
                                        <>
                                            {/* LIST VIEW (Users/Cohorts) */}
                                            {activeTab === 'my_results' ? (
                                                renderPersonalResults()
                                            ) : (
                                                viewMode === 'list' && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                                                        {(activeTab === 'users' ? users : (activeTab === 'cohorts' ? cohorts : uniqueAssessments))
                                                            .filter(item => {
                                                                if (!searchQuery) return true;
                                                                const name = typeof item === 'string' ? item : (item.name || item.username || '');
                                                                return name.toLowerCase().includes(searchQuery.toLowerCase());
                                                            })
                                                            .map((item, index) => {
                                                                const displayName = typeof item === 'string' ? item : (item.name || item.username || 'Unknown');
                                                                return (
                                                                    <div key={index} className="group bg-white dark:bg-brand-card rounded-xl border border-gray-200 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all p-5 flex flex-col items-center text-center">
                                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${activeTab === 'users' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : (activeTab === 'cohorts' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400')}`}>
                                                                            <span className="material-symbols-outlined text-2xl">
                                                                                {activeTab === 'users' ? 'person' : (activeTab === 'cohorts' ? 'groups' : 'assignment')}
                                                                            </span>
                                                                        </div>
                                                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate w-full mb-1" title={displayName}>
                                                                            {displayName}
                                                                        </h3>
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                                                            {activeTab === 'users' ? 'Candidate' : (activeTab === 'cohorts' ? 'Cohort Group' : 'Assessment')}
                                                                        </p>
                                                                        <button
                                                                            onClick={() => handleViewDetails(item)}
                                                                            className="w-full py-2 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2 group-hover:scale-[1.02] transform duration-200"
                                                                        >
                                                                            <span>View Report</span>
                                                                            <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        {(activeTab === 'users' ? users : (activeTab === 'cohorts' ? cohorts : uniqueAssessments)).length === 0 && (
                                                            <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
                                                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                                                                <p>No {activeTab} found matching your search (or restricted view).</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            )}



                                            {/* USER/COHORT REPORT VIEW */}
                                            {viewMode === 'details' && activeTab !== 'my_results' && (
                                                <div>
                                                    <div className="flex justify-between items-center mb-6">
                                                        <div>
                                                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                                                {typeof selectedItem === 'object' ? (selectedItem.name || selectedItem.username) : selectedItem}
                                                            </h2>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                Report Details
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <button
                                                                onClick={handleBackToList}
                                                                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                                                            >
                                                                Back
                                                            </button>
                                                            <button
                                                                onClick={handleDownloadCollectively}
                                                                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all flex items-center"
                                                            >
                                                                <span className="material-symbols-outlined mr-2">download</span>
                                                                Download
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white dark:bg-brand-card/50 rounded-xl overflow-hidden">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead className="bg-gray-50 dark:bg-white/5">
                                                                <tr>
                                                                    {(activeTab === 'cohorts' || activeTab === 'assessments') && (
                                                                        <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">User Name</th>
                                                                    )}
                                                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Assessment</th>
                                                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date Taken</th>
                                                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Score</th>
                                                                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">
                                                                        Actions
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                                {detailedData.map((row, index) => (
                                                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                                        {(activeTab === 'cohorts' || activeTab === 'assessments') && (
                                                                            <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300 font-medium">{row.userName}</td>
                                                                        )}
                                                                        <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">{row.assessmentName}</td>
                                                                        <td className="py-4 px-6 text-sm text-gray-500 dark:text-gray-400">{row.date}</td>
                                                                        <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                                                                            <div>{row.score}</div>
                                                                        </td>
                                                                        <td className="py-4 px-6 text-right">
                                                                            <button
                                                                                onClick={() => handleViewAttempt(row.id)}
                                                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                                                                            >
                                                                                View Details
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </>
                        )}

                    </div>
                </div>
            </div>
        </div>

    );
}

export default AssessmentReports;
