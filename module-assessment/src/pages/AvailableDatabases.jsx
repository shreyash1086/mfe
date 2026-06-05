import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import Breadcrumbs from '../components/Breadcrumbs';
import { ASSESSMENT_API_BASE_URL } from '../api';
import AssessmentLoader from '../components/AssessmentLoader';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();

    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return `${getOrdinal(day)} ${month} ${year}`;
};

function AvailableDatabases() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [databases, setDatabases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingQuestions, setViewingQuestions] = useState(null); // Database ID being viewed
    const [questions, setQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // Popup State
    const [popup, setPopup] = useState({
        isOpen: false,
        type: 'alert', // 'alert' | 'confirm'
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null
    });

    const showAlert = (title, message) => {
        setPopup({
            isOpen: true,
            type: 'alert',
            title,
            message,
            onConfirm: () => setPopup(prev => ({ ...prev, isOpen: false })),
            onCancel: null
        });
    };

    const showConfirm = (title, message, onConfirm) => {
        setPopup({
            isOpen: true,
            type: 'confirm',
            title,
            message,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setPopup(prev => ({ ...prev, isOpen: false }));
            },
            onCancel: () => setPopup(prev => ({ ...prev, isOpen: false }))
        });
    };

    const breadcrumbItems = [
        { label: 'Assessment', path: '/assessment' },
        { label: 'Upload SQL DB', path: '/assessment/assessment-datasets' },
        { label: 'Available Databases' }
    ];

    useEffect(() => {
        fetchDatabases();
    }, []);

    const fetchDatabases = async () => {
        try {
            const response = await fetch(`${ASSESSMENT_API_BASE_URL}/challenges/databases?t=${new Date().getTime()}`);
            if (response.ok) {
                const data = await response.json();
                setDatabases(data);
            } else {
                console.error('Failed to fetch databases');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id, name) => {
        showConfirm("Delete Database", `Are you sure you want to delete database "${name}"? This cannot be undone.`, () => performDelete(id));
    };

    const performDelete = async (id) => {
        try {
            const response = await fetch(`${ASSESSMENT_API_BASE_URL}/challenges/databases/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showAlert("Success", 'Database deleted successfully');
                fetchDatabases(); // Refresh list
            } else {
                const err = await response.json();
                showAlert("Error", `Failed to delete: ${err.message}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            showAlert("Error", 'An error occurred while deleting.');
        }
    };

    const handleViewQuestions = async (dbId) => {
        setViewingQuestions(dbId);
        setLoadingQuestions(true);
        try {
            // Use challenge_db_id for SQL databases, not dataset_id
            const response = await fetch(`${ASSESSMENT_API_BASE_URL}/challenges/questions?challenge_db_id=${dbId}&t=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                console.log(`[AvailableDatabases] Fetched ${data.length} questions for database ${dbId}`);
                setQuestions(data);
            } else {
                console.error('Failed to fetch questions');
                showAlert("Error", 'Failed to fetch questions');
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
        } finally {
            setLoadingQuestions(false);
        }
    };

    const closeQuestionsModal = () => {
        setViewingQuestions(null);
        setQuestions([]);
    };

    const handleDeleteQuestion = (qId, qTitle) => {
        showConfirm("Delete Question", `Are you sure you want to delete "${qTitle}"? This cannot be undone.`, async () => {
            try {
                const response = await fetch(`${ASSESSMENT_API_BASE_URL}/challenges/questions/${qId}`, { method: 'DELETE' });
                if (response.ok) {
                    setQuestions(prev => prev.filter(q => q.id !== qId));
                } else {
                    const err = await response.json();
                    showAlert("Error", `Failed to delete: ${err.message}`);
                }
            } catch (error) {
                showAlert("Error", 'An error occurred while deleting the question.');
            }
        });
    };


    return (
        <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-100 font-['Poppins',sans-serif] transition-colors duration-500 overflow-hidden">
            <div className="px-6 pt-6 pb-6 w-full flex-1 flex flex-col mx-auto min-h-0">

                {/* Header Area - Pill Style */}
                <div className="w-full bg-white dark:bg-black rounded-[28px] px-8 py-3.5 flex items-center shadow-sm border border-gray-100 dark:border-blue-500/10 transition-all hover:shadow-md dark:hover:border-blue-500/30 mb-6 shrink-0">
                    <div className="flex items-center">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none px-4 whitespace-nowrap">
                            Available Databases
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

                    <div className="pl-4 flex gap-2">
                        <button
                            onClick={fetchDatabases}
                            className="h-11 px-4 bg-gray-100 dark:bg-transparent border border-transparent dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                            title="Refresh List"
                        >
                            <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                        </button>
                        <button
                            onClick={() => navigate('/assessment/assessment-datasets')}
                            className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[12px] font-bold uppercase tracking-wider rounded-2xl flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap shadow-lg shadow-blue-500/20"
                        >
                            <span className="material-symbols-outlined text-[20px]">upload</span>
                            Upload New
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-transparent rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                    {loading ? (
                        <div className="flex items-center justify-center h-[60vh]">
                            <AssessmentLoader text="Loading Databases..." />
                        </div>
                    ) : databases.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100/50 dark:bg-white/5 sticky top-0 z-10 border-b border-gray-200 dark:border-white/10">
                                <tr>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">DB Name</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Schema Name</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Created At</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {databases.map((db, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {db.name}
                                        </td>
                                        <td className="p-4 text-sm font-mono text-gray-600 dark:text-gray-300">
                                            {db.schema_name}
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={db.description}>
                                            {db.description || '-'}
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(db.created_at)}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleViewQuestions(db.id)}
                                                    className="flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-transparent dark:border dark:border-white/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 transition-colors"
                                                    title="View Questions"
                                                >
                                                    <span className="material-symbols-outlined text-sm mr-1.5">visibility</span>
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(db.id, db.name)}
                                                    className="flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                                                    title="Delete Database"
                                                >
                                                    <span className="material-symbols-outlined text-sm mr-1.5">delete</span>
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <span className="material-symbols-outlined text-5xl mb-2 opacity-50">database</span>
                            <p>No databases found.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Questions Modal */}
            {viewingQuestions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-black rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-gray-100 dark:border-white/10 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/5">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Database Questions
                            </h2>
                            <button
                                onClick={closeQuestionsModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingQuestions ? (
                                <div className="flex justify-center py-10">
                                    <AssessmentLoader text="Loading Questions..." scale={0.6} />
                                </div>
                            ) : questions.length > 0 ? (
                                <div className="space-y-4">
                                    {questions.map((q, idx) => (
                                        <div key={q.id} className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase">
                                                        {q.type}
                                                    </span>
                                                    {q.difficulty && (
                                                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                            {q.difficulty}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {q.points} Points
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteQuestion(q.id, q.title)}
                                                        className="flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                                                        title="Delete Question"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-1">
                                                {q.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                                {q.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">quiz</span>
                                    <p>No questions found in this database.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 rounded-b-2xl">
                            <div className="flex justify-end">
                                <button
                                    onClick={closeQuestionsModal}
                                    className="px-4 py-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/20 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Popup Modal */}
            {popup.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-black rounded-2xl shadow-2xl w-full max-w-md overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-white/10">
                        <div className="p-6 text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${popup.type === 'confirm' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                <span className="material-symbols-outlined text-3xl">
                                    {popup.type === 'confirm' ? 'warning' : 'info'}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {popup.title}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-300 text-sm mb-6 leading-relaxed">
                                {popup.message}
                            </p>
                            <div className="flex gap-3 justify-center">
                                {popup.type === 'confirm' && (
                                    <button
                                        onClick={popup.onCancel}
                                        className="px-5 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    onClick={popup.onConfirm}
                                    className={`px-6 py-2.5 rounded-xl text-white font-medium shadow-lg transition-transform active:scale-95 ${popup.type === 'confirm' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}
                                >
                                    {popup.type === 'confirm' ? 'Confirm' : 'Okay'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AvailableDatabases;
