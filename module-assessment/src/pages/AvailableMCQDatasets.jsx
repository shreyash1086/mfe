import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import { ASSESSMENT_API_BASE_URL } from '../api';
import AssessmentLoader from '../components/AssessmentLoader';
import { useTheme } from '../ThemeContext';

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

function AvailableMCQDatasets() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const darkMode = theme === 'dark';
    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingQuestions, setViewingQuestions] = useState(null); // Dataset ID being viewed
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
        { label: 'Assessment', path: '/assessment', className: 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400' },
        { label: 'Upload MCQ CSV', path: '/assessment/assessment-mcq', className: 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400' },
        { label: 'Available MCQ Datasets', className: 'text-gray-900 dark:text-white font-medium' }
    ];

    useEffect(() => {
        fetchDatasets();
    }, []);

    const fetchDatasets = async () => {
        try {
            const response = await fetch(`${ASSESSMENT_API_BASE_URL}/challenges/datasets?t=${new Date().getTime()}`);
            if (response.ok) {
                const data = await response.json();
                setDatasets(data);
            } else {
                console.error('Failed to fetch datasets');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id, name) => {
        showConfirm("Delete Dataset", `Are you sure you want to delete dataset "${name}"? This action will remove all questions associated with this dataset.`, () => performDelete(id));
    };

    const performDelete = async (id) => {
        try {
            const response = await fetch(`${ASSESSMENT_API_BASE_URL}/challenges/datasets/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showAlert("Success", 'Dataset deleted successfully');
                fetchDatasets(); // Refresh list
            } else {
                const err = await response.json();
                showAlert("Error", `Failed to delete: ${err.message}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            showAlert("Error", 'An error occurred while deleting.');
        }
    };

    const handleViewQuestions = async (datasetId) => {
        setViewingQuestions(datasetId);
        setLoadingQuestions(true);
        try {
            // Add cache-busting timestamp to prevent stale data
            const response = await fetch(`${ASSESSMENT_API_BASE_URL}/challenges/questions?dataset_id=${datasetId}&t=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                console.log(`[AvailableMCQDatasets] Fetched ${data.length} questions for dataset ${datasetId}`);
                setQuestions(data);
            } else {
                console.error('Failed to fetch questions');
                showAlert("Error", 'Failed to fetch questions');
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
            showAlert("Error", 'An error occurred while fetching questions');
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
                            MCQ Datasets
                        </h1>
                        <div className="h-8 w-[1px] bg-gray-100 dark:bg-white/10 mx-2" />
                        <div className="px-2">
                            <Breadcrumbs items={breadcrumbItems} transparent={true} className="mb-0" />
                        </div>
                    </div>

                    <div className="flex-1 px-4" />

                    <div className="flex items-center gap-3 pl-4 border-l border-gray-100 dark:border-white/10">
                        <button
                            onClick={toggleTheme}
                            className={`p-2 rounded-xl transition-all duration-300 ${darkMode
                                ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 rotate-180'
                                : 'bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 rotate-0'
                                }`}
                            aria-label="Toggle Theme"
                        >
                            <span className="material-symbols-outlined text-[20px] font-variation-settings-fill">
                                {darkMode ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>
                    </div>

                    <div className="h-8 w-[1px] bg-gray-100 dark:bg-white/10 mx-2" />

                    <div className="flex gap-3 pl-4">
                        <button
                            onClick={fetchDatasets}
                            className="h-11 px-4 bg-gray-100 dark:bg-transparent border border-transparent dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                            title="Refresh List"
                        >
                            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
                        </button>

                        <button
                            onClick={() => navigate('/assessment/assessment-mcq')}
                            className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[12px] font-bold uppercase tracking-wider rounded-2xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/30 whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined text-[20px]">upload</span>
                            Upload New
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-transparent rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
                    {loading ? (
                        <div className="flex items-center justify-center h-[60vh]">
                            <AssessmentLoader text="Loading Datasets..." />
                        </div>
                    ) : datasets.length > 0 ? (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100/50 dark:bg-white/5 sticky top-0 z-10 border-b border-gray-200 dark:border-white/10">
                                <tr>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Dataset Name</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Created At</th>
                                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {datasets.map((ds, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {ds.name}
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={ds.description}>
                                            {ds.description || '-'}
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(ds.created_at)}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleViewQuestions(ds.id)}
                                                    className="flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-transparent dark:border dark:border-white/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 transition-colors"
                                                    title="View Questions"
                                                >
                                                    <span className="material-symbols-outlined text-sm mr-1.5">visibility</span>
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(ds.id, ds.name)}
                                                    className="flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                                                    title="Delete Dataset"
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
                            <span className="material-symbols-outlined text-5xl mb-2 opacity-50">format_list_bulleted</span>
                            <p>No datasets found.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Questions Modal */}
            {viewingQuestions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-black rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-gray-100 dark:border-white/10 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/10">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                MCQ Dataset Questions
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
                                        <div key={q.id || idx} className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-blue-500/30 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase">
                                                        MCQ
                                                    </span>
                                                    {q.difficulty && (
                                                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                            {q.difficulty}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {q.s3_link && (
                                                        <a
                                                            href={q.s3_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/10 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                                                            title="View MD File"
                                                        >
                                                            <span className="material-symbols-outlined text-sm mr-1">description</span>
                                                            MD
                                                        </a>
                                                    )}
                                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        {q.points || 1} Points
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
                                            <div className="text-sm text-gray-600 dark:text-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                                {q.metadata && q.metadata.options && Array.isArray(q.metadata.options) && q.metadata.options.map((opt) => (
                                                    <div key={opt.id} className="flex items-center">
                                                        <span className="font-bold mr-1">{opt.id}:</span> {opt.text}
                                                    </div>
                                                ))}
                                            </div>
                                            {q.metadata && q.metadata.correct && (
                                                <div className="mt-2 text-xs font-medium text-green-600 dark:text-green-400">
                                                    Correct Answer: {q.metadata.correct}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">quiz</span>
                                    <p>No questions found in this dataset.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black rounded-b-2xl">
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

export default AvailableMCQDatasets;
