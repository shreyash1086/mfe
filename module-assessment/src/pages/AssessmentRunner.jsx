import React, { useState, useEffect, useRef, useCallback } from 'react';
import { uploadWithProgress } from '../utils/uploadHelper';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { ASSESSMENT_API_BASE_URL } from '../api';
import { useTheme } from '../ThemeContext';
import { useProctoring } from '../hooks/useProctoring';
import ProctoringWebcam from '../components/ProctoringWebcam';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Breadcrumbs from '../components/Breadcrumbs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AssessmentLoader from '../components/AssessmentLoader';
import KodeEnvSection from './KodeEnvSection';

// --- Utilities ---
const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// --- Full Screen Overlay ---
const FullScreenOverlay = ({ onEnter }) => (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-brand-dark flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6 text-blue-600 dark:text-blue-500">
            <span className="material-symbols-outlined text-4xl">fullscreen</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Assessment Mode</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
            This assessment requires full screen mode. Please click the button below to start.
        </p>
        <button
            onClick={onEnter}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xl shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
        >
            <span className="material-symbols-outlined">play_circle</span>
            Enter Full Screen & Start
        </button>
    </div>
);

// --- Universal Sidebar (MCQ & SQL) ---
const AssessmentSidebar = ({ questions, currentIndex, answers, flags, onNavigate, onSubmit, onNext, onPrev, onFlag, onCameraUpdate, proctoringStats }) => {
    const currentQ = questions[currentIndex];
    const isFlagged = currentQ ? flags[currentQ.id] : false;

    return (
        <div className="w-80 h-full bg-white dark:bg-[#121212] border-l border-gray-200 dark:border-[#222] flex flex-col shrink-0 transition-colors duration-200">
            {/* Assessment Progress */}
            <div className="p-6 flex-1 overflow-y-auto">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Assessment Progress</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Total Questions: <span className="font-bold text-gray-900 dark:text-white text-lg block">{questions.length}</span></p>

                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Questions</p>
                <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, idx) => {
                        const isCurrent = idx === currentIndex;
                        const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                        const isQFlagged = flags[q.id];

                        let cls = "w-10 h-10 rounded text-xs font-bold flex items-center justify-center transition-all cursor-pointer ";
                        if (isCurrent) cls += "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105 ring-2 ring-offset-2 ring-blue-600 dark:ring-offset-[#121212]";
                        else if (isQFlagged) cls += "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700";
                        else if (isAnswered) cls += "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800";
                        else cls += "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700";

                        return (
                            <div key={q.id} onClick={() => onNavigate(idx)} className={cls}>
                                {idx + 1}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-[#222]">
                {/* Simplified Security Dashboard (Text Only) */}
                {/* Security Status */}
                {proctoringStats && (
                    <div className="mb-6 flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Monitoring Active</span>
                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                    </div>
                )}

                <button
                    onClick={onSubmit}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold text-[11px] shadow-lg shadow-blue-500/20 transition-all uppercase tracking-wide flex items-center justify-center gap-2"
                >
                    Submit Assessment
                </button>
            </div>

            {/* Proctoring Camera Feed - Embedded in Sidebar */}
            {onCameraUpdate && (
                <div className="p-4 border-t border-gray-200 dark:border-[#222] flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Proctoring Active</div>
                    </div>
                    <div className="relative rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 aspect-video bg-black group">
                        <ProctoringWebcam onStatusChange={onCameraUpdate} />
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                            <span className="text-[8px] font-bold text-white uppercase tracking-tighter">Live</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Integrated Proctoring Overlay ---
const ProctoringOverlay = ({ onStatusChange, proctoringEnabled, cameraStatus }) => {
    if (!proctoringEnabled) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[10000] w-48 aspect-video rounded-2xl overflow-hidden border-2 border-white dark:border-[#222] shadow-2xl bg-black group transition-all hover:scale-105">
            <ProctoringWebcam onStatusChange={onStatusChange} />

            {/* Live Indicator Overlay */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
                <span className="text-[7px] font-black text-white uppercase tracking-tighter">Live Feedback</span>
            </div>
        </div>
    );
};


// --- SQL Components ---

const SqlTable = ({ rows }) => {
    if (!rows || rows.length === 0) return null;
    return (
        <table className="w-full text-left text-[11px] font-mono">
            <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                <tr>
                    {Object.keys(rows[0]).map(k => (
                        <th key={k} className="px-4 py-2 text-gray-400 font-black tracking-widest uppercase text-[9px]">{k}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-blue-500/[0.02] dark:hover:bg-white/[0.02]">
                        {Object.values(row).map((v, j) => <td key={j} className="px-4 py-2 dark:text-gray-300 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">{String(v)}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};


const SqlSchemaViewer = ({ schemaData, isLoading }) => {
    // Use a Set to allow multiple tables open at once
    const [openTables, setOpenTables] = useState(new Set());

    // Auto-open first table only when data loads initially
    useEffect(() => {
        if (schemaData && schemaData.length > 0 && openTables.size === 0) {
            setOpenTables(new Set([schemaData[0].name]));
        }
    }, [schemaData]);

    const toggleTable = (name) => {
        setOpenTables(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    };

    const expandAll = () => {
        if (schemaData) {
            setOpenTables(new Set(schemaData.map(t => t.name)));
        }
    };

    const collapseAll = () => {
        setOpenTables(new Set());
    };

    if (isLoading) {
        return (
            <div className="h-full bg-white dark:bg-[#121212] border-l border-gray-200 dark:border-[#222] flex items-center justify-center p-4">
                <AssessmentLoader text="" scale={0.7} />
            </div>
        );
    }

    // Fallback if no schema (shouldn't happen if API works)
    const tables = schemaData || [];

    return (
        <div className="h-full bg-white dark:bg-[#121212] flex flex-col border-l border-gray-200 dark:border-[#222] transition-colors duration-200">
            <div className="p-4 border-b border-gray-200 dark:border-[#333] flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Database Schema</h3>
                <div className="flex items-center gap-2">
                    <button onClick={expandAll} className="text-[10px] text-blue-500 font-bold uppercase hover:underline">Expand All</button>
                    <button onClick={collapseAll} className="text-[10px] text-red-500 font-bold uppercase hover:underline">Collapse All</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {tables.length === 0 ? (
                    <div className="flex flex-col items-center justify-center mt-4 space-y-2">
                        <div className="text-xs text-gray-500 text-center">No schema info available.</div>
                        {!isLoading && (
                            <button
                                onClick={() => window.location.reload()}
                                className="text-[10px] text-blue-500 font-bold hover:underline bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded"
                            >
                                Retry / Reload
                            </button>
                        )}
                    </div>
                ) : tables.map(t => (
                    <div key={t.name} className="border border-gray-100 dark:border-[#333] rounded-lg overflow-hidden transition-colors duration-200">
                        <button
                            onClick={() => toggleTable(t.name)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-mono font-medium transition-colors ${openTables.has(t.name) ? 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border-b border-red-100 dark:border-red-900/20' : 'bg-gray-50 dark:bg-[#252526] text-gray-600 dark:text-gray-400'}`}
                        >
                            <span>{t.name}</span>
                            <span className="material-symbols-outlined text-base transition-transform duration-200" style={{ transform: openTables.has(t.name) ? 'rotate(180deg)' : 'rotate(0)' }}>expand_more</span>
                        </button>
                        <AnimatePresence>
                            {openTables.has(t.name) && (
                                <motion.div
                                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                    className="bg-white dark:bg-[#121212] overflow-hidden"
                                >
                                    <div className="p-3 text-xs font-mono text-gray-500 dark:text-gray-400 space-y-1">
                                        {t.cols.map((c, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                {c && c.toString().includes('(PK)') && <span className="material-symbols-outlined text-[10px] text-yellow-500">key</span>}
                                                {c && c.toString().includes('(FK)') && <span className="material-symbols-outlined text-[10px] text-blue-500">link</span>}
                                                <span>{c || 'Unknown Column'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MCQ Viewer (Centered Card) ---

const MCQViewer = ({ question, answer, onAnswer, onPrev, onNext, onFlag, isFlagged, isFirst, isLast, onOpenMd, showQuestionMd, markdownContent, isMarkdownLoading }) => {
    // Handling updated metadata parsing - keys might be lowercase from CSV
    let options = [];
    if (question.metadata) {
        const meta = typeof question.metadata === 'string' ? JSON.parse(question.metadata) : question.metadata;
        if (meta.options && Array.isArray(meta.options)) {
            options = meta.options;
        } else if (meta.a && meta.b) {
            options = [meta.a, meta.b, meta.c, meta.d].filter(Boolean);
        }
    }

    if (options.length === 0) options = ["Option A", "Option B", "Option C", "Option D"];

    const getOptionLabel = (idx) => String.fromCharCode(65 + idx);

    // Properly parse metadata and get difficulty
    const parsedMeta = typeof question.metadata === 'string' ? JSON.parse(question.metadata) : (question.metadata || {});
    const difficultyLevel = question.difficulty || parsedMeta.difficulty || parsedMeta.difficultyLevel || 'Medium';

    return (
        <div className="h-full flex items-center justify-center p-8 bg-gray-50 dark:bg-black transition-colors duration-200">
            <div className="max-w-3xl w-full">
                <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 p-8 md:p-12 transition-colors duration-200">
                    <div className="flex items-center gap-2.5 mb-6">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${difficultyLevel === 'Hard'
                            ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/30'
                            : difficultyLevel === 'Easy'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30'
                                : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${difficultyLevel === 'Hard' ? 'bg-rose-500' : difficultyLevel === 'Easy' ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}></span>
                            {difficultyLevel}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">stars</span>
                            {question.marks || question.points || 5} Marks
                        </span>
                        <div className="flex-1" />
                    </div>

                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                        {(() => {
                            const t = question.question_text || question.title || '';
                            const d = question.description || '';
                            if (t.endsWith('...') && d.startsWith(t.slice(0, -3).trim())) return d;
                            if (t.endsWith('...') && d.length > t.length - 3) return d;
                            return t;
                        })()}
                    </h2>
                    {(() => {
                        const t = question.question_text || question.title || '';
                        const d = question.description || '';
                        const isRedundant = (t.endsWith('...') && d.startsWith(t.slice(0, -3).trim())) || (t.endsWith('...') && d.length > t.length - 3) || d === t;
                        if (d && !isRedundant) {
                            return (
                                <p className="text-[15px] font-normal text-gray-600 dark:text-gray-400 mb-8 leading-relaxed whitespace-pre-wrap">
                                    {d}
                                </p>
                            );
                        }
                        return null;
                    })()}

                    <div className="space-y-4">
                        {options.map((opt, idx) => {
                            const optText = typeof opt === 'string' ? opt : opt.text || opt;
                            const isSelected = answer === getOptionLabel(idx);

                            return (
                                <div
                                    key={idx}
                                    onClick={() => onAnswer(getOptionLabel(idx))}
                                    className={`
                                        flex items-center p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 group
                                        ${isSelected ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-[#2a2a2a]' : 'border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-[#444]'}
                                    `}
                                >
                                    <div className={`w-6 h-6 rounded-full border border-gray-300 dark:border-gray-500 flex items-center justify-center mr-4 ${isSelected ? 'bg-gray-900 dark:bg-white border-transparent' : ''}`}>
                                        {isSelected && <div className="w-2 h-2 bg-white dark:bg-black rounded-full"></div>}
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-white mr-3 text-lg">{getOptionLabel(idx)}.</span>
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{optText}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Navigation buttons inside card */}
                    <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-white/5">
                        <button
                            onClick={onPrev}
                            disabled={isFirst}
                            className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] text-gray-600 dark:text-gray-400 text-xs font-bold hover:bg-gray-50 dark:hover:bg-[#252525] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            ← Previous
                        </button>
                        <button
                            onClick={onFlag}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${isFlagged ? 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600 border-yellow-200 dark:border-yellow-900/30' : 'border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
                        >
                            <span className="material-symbols-outlined text-sm">flag</span>
                            {isFlagged ? 'Unmark' : 'Review'}
                        </button>
                        <div className="flex-1" />
                        <button
                            onClick={onNext}
                            className="px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FileUploadViewer = ({ question, answer, onAnswer, onSubmit }) => {
    // metadata: { instructions, resourceUrl }
    const meta = typeof question.metadata === 'string' ? JSON.parse(question.metadata) : question.metadata;

    const currentFile = answer ? (typeof answer === 'string' && answer.startsWith('{') ? JSON.parse(answer) : answer) : null;

    return (
        <div className="flex flex-col transition-colors duration-200">
            <div className="w-full space-y-8">
                {/* Instructions Section */}
                <div>
                    <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Instructions
                    </h2>
                    <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 dark:bg-[#121212] p-6 rounded-2xl border border-gray-100 dark:border-white/5">
                        {meta.instructions || question.description || "No specific instructions provided."}
                    </div>
                </div>

                {/* Reference Materials Section */}
                {meta.resourceUrl && (
                    <div>
                        <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            Reference materials
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(() => {
                                let resources = [];
                                try {
                                    if (Array.isArray(meta.resourceUrl)) {
                                        resources = meta.resourceUrl;
                                    } else if (typeof meta.resourceUrl === 'string') {
                                        if (meta.resourceUrl.trim().startsWith('[')) {
                                            resources = JSON.parse(meta.resourceUrl);
                                        } else {
                                            resources = [meta.resourceUrl];
                                        }
                                    } else if (meta.resourceUrl) {
                                        resources = [meta.resourceUrl];
                                    }
                                } catch (e) {
                                    resources = [meta.resourceUrl];
                                }

                                return resources.map((item, idx) => {
                                    if (!item) return null;
                                    const fileUrl = typeof item === 'string' ? item : item.url;
                                    if (!fileUrl) return null;
                                    const fileName = typeof item === 'string' ? fileUrl.split('/').pop() || 'Resource File' : item.name || fileUrl.split('/').pop() || 'Resource File';

                                    return (
                                        <a
                                            key={idx}
                                            href={fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-4 p-4 bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-[#252525] rounded-2xl border border-gray-100 dark:border-white/5 transition-all group cursor-pointer shadow-sm"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center shrink-0 transition-colors">
                                                <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors">{fileName}</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">Click to view/download</p>
                                            </div>
                                            <span className="material-symbols-outlined text-gray-400 group-hover:text-blue-500 transition-colors">open_in_new</span>
                                        </a>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Main Container & Logic ---

const AssessmentRunner = ({ assessmentData, user, onFinish, onProceedToKodeEnv }) => {
    const navigate = useNavigate();
    const { logout } = useAuth(); // Assuming logout is available in AuthContext
    const { theme, toggleTheme } = useTheme();

    // Robust Data Access (Handle both nested and flat structures)
    const assessmentDetails = assessmentData?.assessment || assessmentData || {};
    const rawAssessmentName = assessmentDetails?.name || 'Assessment';
    const cleanAssessmentName = rawAssessmentName.replace(' [KodeEnv]', '').replace('[KodeEnv]', '').replace(' [HideScore]', '').replace('[HideScore]', '').trim();

    // Handle number 0, string '0', and boolean false
    const rawProc = assessmentDetails.proctoring_enabled;
    const proctoringEnabled = rawProc !== 0 && rawProc !== '0' && rawProc !== false;
    // Calculate total duration from rounds, default to 60 if missing
    const totalRoundsDuration = (assessmentData?.rounds || []).reduce((acc, r) => acc + (parseInt(r.duration_minutes) || 0), 0);
    const duration = assessmentDetails.duration || (totalRoundsDuration > 0 ? totalRoundsDuration : 60);
    const hasKodeEnvRound = (assessmentData?.rounds || []).some(r => r.type === 'KODE_ENV');

    // Proctoring Constants
    const PROCTOR_INTERVAL = 30000; // 30 seconds for video clips
    const API_UPLOAD_URL = "https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/proctoring";

    // Proctoring Refs & State
    const [screenStream, setScreenStream] = useState(null);
    const [cameraStream, setCameraStream] = useState(null);
    const [proctorInterval, setProctorInterval] = useState(null);
    const screenVideoRef = useRef(null);
    const cameraVideoRef = useRef(null);
    const screenRecorderRef = useRef(null);
    const cameraRecorderRef = useRef(null);
    // Flatten Questions
    const [allQuestions] = useState(() => {
        if (!assessmentData?.rounds) return [];
        const qs = assessmentData.rounds.flatMap(r =>
            (r.type !== 'KODE_ENV' && r.questions) ? r.questions.map(q => ({ ...q, type: r.type })) : []
        );
        const kodeEnvRound = assessmentData.rounds.find(r => r.type === 'KODE_ENV');
        if (kodeEnvRound) {
            qs.push({
                id: 'kode_env_round_special',
                type: 'KODE_ENV',
                title: 'Kode Env Assessment',
                description: 'Virtual machine based task.',
                round: kodeEnvRound
            });
        }
        return qs;
    });

    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [hasSubmittedPrev, setHasSubmittedPrev] = useState(() => {
        return sessionStorage.getItem(`submitted_prev_${assessmentDetails.id}`) === 'true';
    });
    const [answers, setAnswers] = useState({}); // { [qId]: answer }
    const [flags, setFlags] = useState({});
    const [timeLeft, setTimeLeft] = useState(duration * 60);
    const [sessionAttemptId] = useState(() => {
        const now = new Date();
        const date = now.toLocaleDateString('en-GB').replace(/\//g, '-'); // DD-MM-YYYY
        const time = now.toLocaleTimeString('en-US', { hour12: false }).replace(/:/g, '-'); // HH-MM-SS
        const attemptNum = assessmentData?.attempt || 1;
        return `attempt_${attemptNum}_${date}_${time}`;
    });

    // Determines current Question Type
    const currentQuestion = allQuestions[currentQIndex];
    const isFILE_UPLOAD = currentQuestion?.type === 'FILE_UPLOAD';
    const isSQL = currentQuestion?.type === 'SQL';
    const isKODE_ENV = currentQuestion?.type === 'KODE_ENV';

    const [sqlResult, setSqlResult] = useState(null); // { rows: [], isCorrect: bool, error: string, isLoading: bool }
    const [sampleOutput, setSampleOutput] = useState({ rows: [], isLoading: false }); // Pre-fetched expected output, independent of user query
    const [isFullscreen, setIsFullscreen] = useState(false); // Force overlay for SQL/MCQ
    const [showQuestionMd, setShowQuestionMd] = useState(true); // Markdown question viewer modal - Open by default
    const [markdownContent, setMarkdownContent] = useState('');
    const [isMarkdownLoading, setIsMarkdownLoading] = useState(false);

    // Auto-lock to Kode Env if already submitted previous
    useEffect(() => {
        if (hasSubmittedPrev) {
            const kodeEnvIndex = allQuestions.findIndex(q => q.type === 'KODE_ENV');
            if (kodeEnvIndex !== -1 && currentQIndex !== kodeEnvIndex) {
                setCurrentQIndex(kodeEnvIndex);
            }
        }
    }, [hasSubmittedPrev, allQuestions, currentQIndex]);

    const handleQuestionChange = async (newIndex) => {
        const nextQ = allQuestions[newIndex];
        
        // If transitioning to Kode Env from something else
        if (nextQ && nextQ.type === 'KODE_ENV' && !hasSubmittedPrev) {
            const hasOtherQuestions = allQuestions.some(q => q.type !== 'KODE_ENV');
            if (hasOtherQuestions) {
                if (!window.confirm("You are about to proceed to the virtual machine environment (Kode Env). Once you proceed, your answers for MCQ/SQL sections will be locked and submitted. You cannot modify them after this. Do you want to proceed?")) {
                    return;
                }

                // Trigger auto-submit of previous sections
                if (onProceedToKodeEnv) {
                    const types = allQuestions.reduce((acc, q) => ({ ...acc, [q.id]: q.type }), {});
                    const marks = allQuestions.reduce((acc, q) => ({ ...acc, [q.id]: parseInt(q.marks || q.points || 5) }), {});
                    
                    const ok = await onProceedToKodeEnv(
                        answers,
                        { mcqTime: mcqTimeTaken, sqlTime: sqlTimeTaken },
                        types,
                        { marks, tabSwitchCount }
                    );

                    if (ok) {
                        setHasSubmittedPrev(true);
                        setCurrentQIndex(newIndex);
                    }
                } else {
                    setHasSubmittedPrev(true);
                    setCurrentQIndex(newIndex);
                }
            } else {
                setCurrentQIndex(newIndex);
            }
        } else {
            setCurrentQIndex(newIndex);
        }
    };

    // Breadcrumbs for File Upload
    const breadcrumbItems = isFILE_UPLOAD ? [
        { label: 'Assessment', path: '/assessment' },
        { label: 'All Assessments', path: '/assessment/assessments-list' },
        { label: cleanAssessmentName },
        { label: 'File Upload Task' }
    ] : [];

    // Schema State
    const [schemaData, setSchemaData] = useState(null);
    const [isSchemaLoading, setIsSchemaLoading] = useState(false);

    // Split Timing State
    const [mcqTimeTaken, setMcqTimeTaken] = useState(0);
    const [sqlTimeTaken, setSqlTimeTaken] = useState(0);

    // 3-step flow: 'fullscreen_prompt' -> 'ready_start' -> 'assessment'
    // FILE_UPLOAD goes straight to 'assessment' (auto-started below)
    const [step, setStep] = useState('fullscreen_prompt');
    const [proctoringReady, setProctoringReady] = useState(false); // screen share + camera done

    const [cameraStatus, setCameraStatus] = useState('ok'); // 'ok', 'missing'
    const [proctorWarning, setProctorWarning] = useState(null); // shown as toast

    // File Upload Progress State
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);




    // Initialize Proctoring Hook - Disabled for FILE_UPLOAD and KODE_ENV
    const isSpecialRound = isFILE_UPLOAD || isKODE_ENV;
    const { tabSwitchCount, isFullScreen: isProctorFullScreen, enterFullScreen } = useProctoring({
        enableTabSwitchDetection: proctoringEnabled && !isSpecialRound,
        enableFullScreen: false,
        enableRestrictions: proctoringEnabled && !isSpecialRound
    });

    // Monitor Tab Switches — just warn, never terminate
    useEffect(() => {
        if (step !== 'assessment' || tabSwitchCount === 0) return;
        setProctorWarning('\u26a0\ufe0f Tab switch detected. Please stay on this tab during your assessment.');
        const t = setTimeout(() => setProctorWarning(null), 4000);
        return () => clearTimeout(t);
    }, [tabSwitchCount, step]);

    // Handle Camera Status Changes from Webcam Component
    const handleCameraStatusChange = (statusObj) => {
        setCameraStatus(statusObj.status);
    };

    // Reset Logic
    // Resizing Logic
    const [leftPanelWidth, setLeftPanelWidth] = useState(40);
    const [isResizing, setIsResizing] = useState(false);
    const [footerHeight, setFooterHeight] = useState(200); // Increased default height for stacking
    const [isResizingFooter, setIsResizingFooter] = useState(false);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); // Default to collapsed
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Results panel collapse and layout states
    const [isOutputCollapsed, setIsOutputCollapsed] = useState(false);
    const [isExpectedCollapsed, setIsExpectedCollapsed] = useState(false);
    const [consoleLayout, setConsoleLayout] = useState('bottom'); // 'bottom' | 'side'
    const [isConsoleVisible, setIsConsoleVisible] = useState(true);
    const [rightPanelWidth, setRightPanelWidth] = useState(40); // For side-tile mode

    const startResizing = useCallback(() => setIsResizing(true), []);
    const stopResizing = useCallback(() => setIsResizing(false), []);
    const startResizingFooter = useCallback(() => setIsResizingFooter(true), []);
    const stopResizingFooter = useCallback(() => setIsResizingFooter(false), []);

    const resize = useCallback((e) => {
        if (isResizing) {
            const newWidth = (e.clientX / window.innerWidth) * 100;
            if (newWidth > 20 && newWidth < 80) {
                setLeftPanelWidth(newWidth);
            }
        }
        if (isResizingFooter) {
            // Vertical resize for footer (pixels from bottom)
            const newHeight = window.innerHeight - e.clientY;
            if (newHeight >= 56 && newHeight < 300) {
                setFooterHeight(newHeight);
            }
        }
    }, [isResizing, isResizingFooter]);

    useEffect(() => {
        if (isResizing || isResizingFooter) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
            window.addEventListener('mouseup', stopResizingFooter);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
            window.removeEventListener('mouseup', stopResizingFooter);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
            window.removeEventListener('mouseup', stopResizingFooter);
        };
    }, [isResizing, isResizingFooter, resize, stopResizing, stopResizingFooter]);

    const handleReset = () => {
        stopProctoring();
        setStep('fullscreen_prompt');
        setProctoringReady(false);
        setCameraStatus('ok');
        setAnswers({});
        setFlags({});
        setUploadProgress(0);
        setCurrentQIndex(0);
    };

    const exitFullscreen = () => {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => { });
    };

    // --- Screen Capture & Upload Logic ---
    const uploadToApi = async (base64Image, key) => {
        try {
            // Note: Assuming user object has token or we get it from session. 
            // The user prop passed might not have the raw token string. 
            // We'll proceed without explicit token headers if not readily available or use a dummy if the API allows.
            // In a real app, strict Auth headers are needed. 
            // The provided snippet used `user?.token`. We'll rely on what's available or just the key structure.

            const response = await fetch(API_UPLOAD_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Authorization: `Bearer ${user?.token}`, // Uncomment if token is accessible
                },
                body: JSON.stringify({
                    image: base64Image,
                    key: key,
                    username: user?.username || "unknown_user",
                    assessment: cleanAssessmentName || assessmentDetails?.title || assessmentDetails?._id || "unknown_assessment",
                    attempt: sessionAttemptId
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                console.error("Failed to upload image to S3", data);
            } else {
                // console.log(`Uploaded ${key} to S3`);
            }
        } catch (error) {
            console.error("Error uploading to S3:", error);
        }
    };

    const startRecordingClip = (stream, prefix, ref) => {
        if (!stream || !stream.active) return;
        try {
            // Use low bitrate to keep file size small for Lambda limits
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm', videoBitsPerSecond: 150000 });
            ref.current = mediaRecorder;
            let chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                if (chunks.length > 0) {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        const base64data = reader.result.split(',')[1];
                        uploadToApi(base64data, `${prefix}-${user?.username || 'user'}-${Date.now()}.webm`);
                    };
                }
            };

            mediaRecorder.start();
        } catch (e) {
            console.error(`Error starting MediaRecorder for ${prefix}:`, e);
        }
    };

    const captureAndUpload = async () => {
        // Stop current recordings if active; their onstop will upload the chunks
        if (screenRecorderRef.current && screenRecorderRef.current.state === 'recording') {
            screenRecorderRef.current.stop();
        }
        if (cameraRecorderRef.current && cameraRecorderRef.current.state === 'recording') {
            cameraRecorderRef.current.stop();
        }

        // Start next 30-second chunk
        if (screenVideoRef.current && screenVideoRef.current.srcObject) {
            startRecordingClip(screenVideoRef.current.srcObject, 'screen', screenRecorderRef);
        }
        if (cameraVideoRef.current && cameraVideoRef.current.srcObject) {
            startRecordingClip(cameraVideoRef.current.srcObject, 'webcam', cameraRecorderRef);
        }
    };

    const startProctoring = async () => {
        try {
            // Request Camera Stream (for hidden capture)
            let camStream;
            try {
                camStream = await navigator.mediaDevices.getUserMedia({ video: true });
            } catch (err) {
                alert("Camera access denied or failed. Please allow camera access.");
                return false;
            }

            // Request Screen Sharing
            let dispStream;
            try {
                // Force user to pick monitor if possible, usually handled by browser UI
                dispStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { displaySurface: "monitor" }
                });
            } catch (err) {
                alert("Screen sharing is required to start the assessment.");
                return false;
            }

            // Handle user stopping the camera share manually — just warn
            camStream.getVideoTracks()[0].onended = () => {
                setProctorWarning('\u26a0\ufe0f Your camera was turned off. Please re-enable it.');
                setTimeout(() => setProctorWarning(null), 5000);
            };

            // Check if entire screen
            const track = dispStream.getVideoTracks()[0];

            // Handle user stopping the screen share — just warn
            track.onended = () => {
                setProctorWarning('\u26a0\ufe0f Screen sharing was stopped. Please re-enable it.');
                setTimeout(() => setProctorWarning(null), 5000);
            };

            setScreenStream(dispStream);
            if (screenVideoRef.current) screenVideoRef.current.srcObject = dispStream;

            setCameraStream(camStream);
            if (cameraVideoRef.current) cameraVideoRef.current.srcObject = camStream;

            // Start the first recording chunk immediately
            captureAndUpload();

            const intervalId = setInterval(captureAndUpload, PROCTOR_INTERVAL);
            setProctorInterval(intervalId);

            return true;
        } catch (error) {
            console.error("Error starting proctoring:", error);
            alert(`Error starting proctoring: ${error.message}`);
            return false;
        }
    };

    const stopProctoring = () => {
        if (screenRecorderRef.current && screenRecorderRef.current.state === 'recording') {
            screenRecorderRef.current.stop();
        }
        if (cameraRecorderRef.current && cameraRecorderRef.current.state === 'recording') {
            cameraRecorderRef.current.stop();
        }
        if (screenVideoRef.current && screenVideoRef.current.srcObject) {
            screenVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
            screenVideoRef.current.srcObject = null;
        }
        if (cameraVideoRef.current && cameraVideoRef.current.srcObject) {
            cameraVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
            cameraVideoRef.current.srcObject = null;
        }
        if (screenStream) screenStream.getTracks().forEach(track => track.stop());
        if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
        if (proctorInterval) clearInterval(proctorInterval);
        setScreenStream(null);
        setCameraStream(null);
        setProctorInterval(null);
    };

    // Cleanup on Unmount or Termination
    useEffect(() => {
        return () => stopProctoring();
    }, []);



    // --- End Screen Capture ---

    // --- END PROCTORING ---

    // Track actual browser fullscreen state via event listener
    useEffect(() => {
        const onFsChange = () => {
            const isFs = !!document.fullscreenElement || !!document.webkitFullscreenElement;
            if (!isFILE_UPLOAD) {
                setIsFullscreen(isFs);
            }
        };
        document.addEventListener('fullscreenchange', onFsChange);
        document.addEventListener('webkitfullscreenchange', onFsChange);
        return () => {
            document.removeEventListener('fullscreenchange', onFsChange);
            document.removeEventListener('webkitfullscreenchange', onFsChange);
        };
    }, [isFILE_UPLOAD]);

    const requestFullScreen = async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            } else if (document.documentElement.webkitRequestFullscreen) { /* Safari */
                await document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) { /* IE11 */
                await document.documentElement.msRequestFullscreen();
            }
        } catch (err) {
            console.error("Error attempting to enable full-screen mode:", err);
        }
        setIsFullscreen(true);
    };

    // Fetch Schema and Sample Output when SQL Question loads
    useEffect(() => {
        if (isSQL) {
            // Clear user query result and start loading sample output independently
            setSqlResult(null);
            setSampleOutput({ rows: [], isLoading: true });

            const dbId = currentQuestion.challenge_db_id || currentQuestion.dataset_id;
            if (dbId) {
                setIsSchemaLoading(true);
                // Fetch schema
                fetch(`${ASSESSMENT_API_BASE_URL}/assessments/schema/${dbId}?t=${Date.now()}`)
                    .then(res => res.json())
                    .then(data => {
                        if (Array.isArray(data)) {
                            setSchemaData(data);
                        } else {
                            setSchemaData([]);
                        }
                        setIsSchemaLoading(false);
                    })
                    .catch(err => {
                        console.error("Schema fetch failed", err);
                        setSchemaData([]);
                        setIsSchemaLoading(false);
                    });
            }

            // Eagerly fetch expected output as soon as the question loads
            if (currentQuestion.id) {
                fetch(`${ASSESSMENT_API_BASE_URL}/assessments/sample-output/${currentQuestion.id}`)
                    .then(async res => {
                        const data = await res.json();
                        if (!res.ok) {
                            // API returned an error (e.g. FK constraint, SQL syntax) — mark unavailable
                            setSampleOutput({ rows: [], isLoading: false, unavailable: true });
                        } else {
                            const rows = Array.isArray(data.expectedResults) ? data.expectedResults : [];
                            setSampleOutput({
                                rows,
                                isLoading: false,
                                unavailable: rows.length === 0 // also show friendly msg if query returned nothing
                            });
                        }
                    })
                    .catch(() => {
                        setSampleOutput({ rows: [], isLoading: false, unavailable: true });
                    });
            } else {
                setSampleOutput({ rows: [], isLoading: false, unavailable: true });
            }
        }
    }, [currentQuestion?.id, isSQL, currentQuestion?.challenge_db_id, currentQuestion?.dataset_id]);

    // --- Markdown Fetch Effect ---
    useEffect(() => {
        // Auto-close the dropdown and reset content on question change
        // Default to open on question change (especially helpful for SQL/Fresher experience)
        setShowQuestionMd(true);
        setMarkdownContent('');

        const fetchMarkdown = async () => {
            // Robust check for s3 link in main field or metadata fallback
            const s3Link = currentQuestion?.s3_link ||
                currentQuestion?.metadata?.s3_link ||
                currentQuestion?.metadata?.s3_url ||
                currentQuestion?.metadata?.md_link;

            if (!s3Link) {
                console.log("ℹ️ [S3 Debug] No s3_link found for question:", currentQuestion?.id);
                setMarkdownContent('');
                return;
            }

            setIsMarkdownLoading(true);
            console.log("🔍 [S3 Debug] s3_link resolved:", s3Link);

            try {
                // Use the backend proxy to fetch S3 content (bypasses CORS and manual download headers)
                const proxyUrl = `${ASSESSMENT_API_BASE_URL}/assessments/proxy-markdown?url=${encodeURIComponent(s3Link)}`;
                const response = await fetch(proxyUrl);

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const contentType = response.headers.get("content-type");
                let text;
                if (contentType && contentType.includes("application/json")) {
                    const data = await response.json();
                    // Handle various possible JSON structures (e.g., {content: ...}, {data: ...}, or just the string)
                    text = data.content || data.data || (typeof data === 'string' ? data : JSON.stringify(data));
                } else {
                    text = await response.text();
                }

                console.log("✅ [S3 Debug] Content fetched, length:", text?.length || 0);
                setMarkdownContent(text || '');
            } catch (err) {
                console.error("❌ [S3 Debug] Fetch failed:", err);
                setMarkdownContent('');
            } finally {
                setIsMarkdownLoading(false);
            }
        };

        fetchMarkdown();
    }, [currentQuestion?.id]);

    useEffect(() => {
        if (allQuestions.length === 0 || (!isFullscreen && !isFILE_UPLOAD) || step !== 'assessment') return;

        const timer = setInterval(() => {
            // Update Countdown
            setTimeLeft(prev => {
                if (prev <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [allQuestions.length, step, isFullscreen, isFILE_UPLOAD]);

    // Timer Effects: Warnings and Auto-Submit
    useEffect(() => {
        if (step !== 'assessment') return;

        if (timeLeft === 60) {
            setProctorWarning("⚠️ 1 minute remaining! Assessment will automatically submit when time is up.");
            setTimeout(() => setProctorWarning(null), 5000);
        } else if (timeLeft === 0) {
            finishAssessment(true); // true = isAutoSubmit
        }
    }, [timeLeft, step]);
    // ^ Adding time dependencies causes effect to restart every second. This is slight jitter but acceptable for simple timer.
    // Better: separate effect for counting up.

    useEffect(() => {
        if (!isFullscreen || allQuestions.length === 0 || step !== 'assessment') return;
        const upTimer = setInterval(() => {
            if (isSQL) {
                setSqlTimeTaken(t => t + 1);
            } else {
                setMcqTimeTaken(t => t + 1);
            }
        }, 1000);
        return () => clearInterval(upTimer);
    }, [isFullscreen, isSQL, allQuestions.length, step]);


    if (allQuestions.length === 0) {
        return <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-brand-dark text-gray-500">No questions loaded for this assessment.</div>;
    }

    const handleAnswer = (val) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));

    const finishAssessment = (isAutoSubmit = false) => {
        if (isAutoSubmit !== true) {
            setShowSubmitModal(true);
            return;
        }
        executeSubmission(true);
    };

    const executeSubmission = (isAutoSubmit = false) => {
        setIsSubmitting(true);
        // Stop proctoring when assessment is finished
        stopProctoring();
        exitFullscreen();

        const types = allQuestions.reduce((acc, q) => ({ ...acc, [q.id]: q.type }), {});
        const marks = allQuestions.reduce((acc, q) => ({ ...acc, [q.id]: parseInt(q.marks || q.points || 5) }), {});
        onFinish(answers, { mcqTime: mcqTimeTaken, sqlTime: sqlTimeTaken }, types, { marks, tabSwitchCount }, isAutoSubmit);
    };

    // NAVIGATION LOGIC - Explicit check to prevent premature submission
    const handleNext = () => {
        if (currentQIndex < allQuestions.length - 1) {
            handleQuestionChange(currentQIndex + 1);
        } else {
            handleQuestionChange(0);
        }
    };

    const handlePrev = () => {
        if (currentQIndex > 0) {
            handleQuestionChange(currentQIndex - 1);
        }
    };

    const handleRunSQL = async () => {
        const query = answers[currentQuestion.id];
        // console.log("Run Query:", query);
        if (!query) return;

        try {
            // Show loading in user output panel — sampleOutput is untouched
            setSqlResult({ rows: [], isCorrect: false, error: null, isLoading: true });
            const response = await fetch(`${ASSESSMENT_API_BASE_URL}/assessments/run-sql`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    // Fallback to dataset_id if challenge_db_id is missing (legacy compat)
                    challengeDbId: currentQuestion.challenge_db_id || currentQuestion.dataset_id,
                    questionId: currentQuestion.id // Validate against expected query
                })
            });
            const data = await response.json();

            if (response.ok) {
                setSqlResult({
                    rows: Array.isArray(data.results) ? data.results : [data.results],
                    isCorrect: data.isCorrect,
                    error: null,
                    isLoading: false
                });
            } else {
                setSqlResult({
                    rows: [],
                    isCorrect: false,
                    error: data.message || "Execution Failed",
                    isLoading: false
                });
            }
        } catch (e) {
            setSqlResult({
                rows: [],
                isCorrect: false,
                error: "Network Error",
                isLoading: false
            });
        }
    };

    // --- File Upload Logic for Sidebar ---
    const handleSidebarFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Sequential upload to track overall progress roughly, or just parallel
            // For better UX with single progress bar, let's do sequential or Promise.all interaction
            // But XHR is per file.
            // Simplified: Upload files one by one and update progress.
            // Or just track one "global" progress?
            // Let's do parallel but just show "Uploading..." with indeterminate or average?
            // Let's do sequential for clearer progress if multiple files, or just parallel.

            // Actually, the UI usually handles one file at a time or batch.
            // Let's just track the *last* or *average*? 
            // Simple approach: Parallel, but just one progress bar for the batch?
            // Let's stick to simple parallel but maybe just reset progress for each?
            // Better: Promise.all with individual progress tracking is complex causing UI jitter.
            // Let's do: Divide 100% by n files.

            const totalFiles = files.length;
            const progressMap = new Array(totalFiles).fill(0);

            const uploadPromises = files.map(async (file, index) => {
                try {
                    const response = await uploadWithProgress(
                        `${ASSESSMENT_API_BASE_URL}/upload`,
                        file,
                        (percent) => {
                            progressMap[index] = percent;
                            const totalProgress = progressMap.reduce((a, b) => a + b, 0) / totalFiles;
                            setUploadProgress(Math.round(totalProgress));
                        }
                    );
                    return { fileUrl: response.fileUrl, originalName: response.originalName };
                } catch (error) {
                    console.error("Upload error:", error);
                    return null;
                }
            });

            const newFiles = (await Promise.all(uploadPromises)).filter(f => f !== null);

            if (newFiles.length > 0) {
                setAnswers(prev => {
                    const qId = currentQuestion.id;
                    const currentVal = prev[qId];
                    let currentFiles = [];
                    try {
                        const parsed = currentVal ? JSON.parse(currentVal) : {};
                        if (parsed.fileUrl) {
                            currentFiles = [{ fileUrl: parsed.fileUrl, originalName: parsed.originalName }];
                        } else if (parsed.fileUrls) {
                            currentFiles = parsed.fileUrls.map((url, i) => ({ fileUrl: url, originalName: parsed.originalNames?.[i] || 'Unknown' }));
                        }
                    } catch (e) { }

                    const updatedFiles = [...currentFiles, ...newFiles];

                    const payload = {
                        fileUrls: updatedFiles.map(f => f.fileUrl),
                        originalNames: updatedFiles.map(f => f.originalName),
                        fileUrl: updatedFiles.length > 0 ? updatedFiles[0].fileUrl : null,
                        originalName: updatedFiles.length > 0 ? updatedFiles[0].originalName : null
                    };

                    return { ...prev, [qId]: JSON.stringify(payload) };
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleSidebarFileRemove = (index) => {
        setAnswers(prev => {
            const qId = currentQuestion.id;
            const currentVal = prev[qId];
            if (!currentVal) return prev;

            try {
                const parsed = JSON.parse(currentVal);
                let currentFiles = [];

                if (parsed.fileUrl && !parsed.fileUrls) {
                    currentFiles = [{ fileUrl: parsed.fileUrl, originalName: parsed.originalName }];
                } else if (parsed.fileUrls) {
                    currentFiles = parsed.fileUrls.map((url, i) => ({ fileUrl: url, originalName: parsed.originalNames?.[i] || 'Unknown' }));
                }

                // Remove at index
                const updatedFiles = currentFiles.filter((_, i) => i !== index);

                const payload = {
                    fileUrls: updatedFiles.map(f => f.fileUrl),
                    originalNames: updatedFiles.map(f => f.originalName),
                    fileUrl: updatedFiles.length > 0 ? updatedFiles[0].fileUrl : null
                };

                return { ...prev, [qId]: JSON.stringify(payload) };

            } catch (e) {
                return prev;
            }
        });
    };

    // Prepare File Upload Props for Sidebar
    const getFileUploadProps = () => {
        if (!isFILE_UPLOAD) return null;

        const currentAns = answers[currentQuestion.id];
        let uploadedFiles = [];
        try {
            if (currentAns) {
                const parsed = JSON.parse(currentAns);
                if (parsed.fileUrls) {
                    uploadedFiles = parsed.fileUrls.map((url, i) => ({ fileUrl: url, originalName: parsed.originalNames?.[i] || 'Unknown' }));
                } else if (parsed.fileUrl) {
                    uploadedFiles = [{ fileUrl: parsed.fileUrl, originalName: parsed.originalName }];
                }
            }
        } catch (e) { }

        return {
            uploadedFiles,
            onUpload: handleSidebarFileUpload,
            onRemove: handleSidebarFileRemove
        };
    };

    // Auto-advance for FILE_UPLOAD assessments directly to 'assessment'
    useEffect(() => {
        if (allQuestions.length > 0 && allQuestions.every(q => q.type === 'FILE_UPLOAD')) {
            if (step === 'fullscreen_prompt') {
                setStep('assessment');
                setIsFullscreen(false);
            }
        }
    }, [allQuestions]);





    // --- Unified Header (App Bar) ---
    const AssessmentAppBar = () => {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        const isLow = timeLeft < 300; // < 5 min warning
        const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        return (
            <div className="h-16 bg-white dark:bg-[#121212] border-b border-gray-200 dark:border-[#222] flex items-center justify-between px-6 shrink-0 transition-colors duration-200 z-50 relative shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-[#B11917] font-black text-xl cursor-default" style={{ fontFamily: "'Averia Serif Libre', serif" }}>
                        LabsKraft
                    </div>


                </div>

                {/* Centered Timer & LIVE Indicator */}
                <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-6">
                    <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 dark:bg-rose-900/20 rounded-full border border-rose-100 dark:border-rose-800/30">
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                        <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Live Monitoring</span>
                    </div>

                    <div className={`flex items-center gap-3 px-5 py-2 rounded-2xl border transition-all shadow-sm ${isLow
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 animate-pulse'
                        : 'bg-white dark:bg-[#1e1e1e] border-gray-200 dark:border-[#333] text-gray-900 dark:text-white'
                        }`}>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Time Remaining</span>
                            <span className="font-mono font-black text-lg tracking-widest leading-none">{formatted}</span>
                        </div>
                        <span className={`material-symbols-outlined text-[20px] ${isLow ? 'text-red-500' : 'text-gray-400'}`}>timer</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center justify-center"
                        title="Toggle Theme"
                    >
                        <span className="material-symbols-outlined text-[20px]">
                            {theme === 'dark' ? 'dark_mode' : 'light_mode'}
                        </span>
                    </button>

                    <div className="w-px h-6 bg-gray-200 dark:bg-[#333] mx-1" />

                    <button
                        onClick={finishAssessment}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        Submit
                    </button>
                </div>
            </div>
        );
    };

    const content = (
        <div className={`flex ${isFILE_UPLOAD ? 'min-h-screen overflow-y-auto h-auto p-6' : (isFullscreen ? 'fixed inset-0 z-[8000] h-screen overflow-hidden bg-white dark:bg-black' : 'h-full overflow-hidden p-6')} w-full bg-gray-50 dark:bg-black font-['Poppins',sans-serif] text-gray-900 dark:text-white flex-col transition-all duration-500`}>
            {/* Hidden Video Elements for Capture (Cannot be display:none otherwise browsers pause decoding) */}
            <video ref={screenVideoRef} className="opacity-0 absolute -z-10 pointer-events-none w-1 h-1" autoPlay playsInline muted />
            <video ref={cameraVideoRef} className="opacity-0 absolute -z-10 pointer-events-none w-1 h-1" autoPlay playsInline muted />

            {/* Proctoring Warning Toast */}
            {proctorWarning && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] bg-orange-600 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top duration-300">
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                    {proctorWarning}
                </div>
            )}



            {/* ── STEP 1: Fullscreen Prompt ── */}
            {step === 'fullscreen_prompt' && (
                <div className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col items-center justify-center p-8 text-center">
                    {/* Subtle grid pattern background */}
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #4f8ef7 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                    <div className="relative z-10 flex flex-col items-center max-w-md">
                        <div className="w-20 h-20 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-8 shadow-lg shadow-blue-500/10">
                            <span className="material-symbols-outlined text-[40px] text-blue-400">fullscreen</span>
                        </div>
                        <h1 className="text-3xl font-black text-white mb-3 tracking-tight">
                            {cleanAssessmentName}
                        </h1>
                        <p className="text-gray-400 text-sm mb-2">
                            Duration: <span className="font-bold text-white">{duration} min</span>
                            &nbsp;·&nbsp; Questions: <span className="font-bold text-white">{allQuestions.length}</span>
                            {proctoringEnabled && <>&nbsp;·&nbsp; <span className="text-orange-400 font-bold">Proctored</span></>}
                        </p>
                        <p className="text-gray-500 text-xs mb-10 leading-relaxed max-w-xs">
                            This assessment requires fullscreen mode for an uninterrupted experience. Click below to enter fullscreen and proceed to the setup screen.
                        </p>
                        <button
                            onClick={async () => {
                                await requestFullScreen();
                                setStep('ready_start');
                            }}
                            className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 text-base"
                        >
                            <span className="material-symbols-outlined text-[22px]">open_in_full</span>
                            Enter Fullscreen
                        </button>
                        <button
                            onClick={() => window.history.back()}
                            className="mt-4 text-xs text-gray-600 hover:text-gray-400 transition-colors"
                        >
                            ← Go back
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 2: Ready / Setup Screen ── */}
            {step === 'ready_start' && (
                <div className="fixed inset-0 z-[9999] bg-gray-950 flex items-center justify-center p-8 overflow-y-auto">
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, #4f8ef7 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                    <div className={`relative z-10 flex flex-col items-center ${hasKodeEnvRound ? 'max-w-4xl' : 'max-w-lg'} w-full text-center`}>
                        <div className="w-16 h-16 rounded-2xl bg-green-600/20 border border-green-500/30 flex items-center justify-center mb-6 shadow-lg shadow-green-500/10">
                            <span className="material-symbols-outlined text-[32px] text-green-400">
                                {proctoringEnabled ? 'monitor_heart' : 'task_alt'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                            {proctoringEnabled ? 'Setup Proctoring & Instructions' : 'Ready to Start'}
                        </h2>
                        <p className="text-gray-400 text-sm mb-8 max-w-sm mx-auto">
                            {proctoringEnabled
                                ? 'Share your screen and grant webcam access to enable proctoring, then start when ready.'
                                : 'Everything looks good! Click the button below to begin your assessment.'
                            }
                        </p>

                        <div className={`grid grid-cols-1 ${hasKodeEnvRound ? 'md:grid-cols-2' : ''} gap-8 w-full mb-8 text-left`}>
                            {/* Left Side: Instructions (Only shown if Kode Env is present) */}
                            {hasKodeEnvRound && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-blue-400 font-bold">assignment</span>
                                            Assessment Instructions
                                        </h3>
                                        <div className="space-y-4 text-xs leading-relaxed text-gray-300">
                                            <div className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">1</div>
                                                <div>
                                                    <span className="font-bold text-white">Multi-Section Flow:</span> This exam contains a final **Code Environment** section. You will first complete standard MCQ and SQL questions.
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">2</div>
                                                <div>
                                                    <span className="font-bold text-white">Auto-Submission:</span> Transitioning from SQL/MCQ to the VM section will automatically submit and lock your previous answers. You cannot modify them after this.
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">3</div>
                                                <div>
                                                    <span className="font-bold text-white">VM Provisioning:</span> The Code Environment allocates a dedicated cloud VM, which takes 2-3 minutes to start. Do not reload or close the tab while it loads.
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">4</div>
                                                <div>
                                                    <span className="font-bold text-white">Proctoring Rules:</span> Webcam & screen sharing are active throughout all sections. Exiting full screen or switching tabs will be flagged.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-white/5 text-[10px] text-amber-500 font-bold flex gap-2 items-start leading-normal">
                                        <span className="material-symbols-outlined text-[14px] shrink-0 mt-0.5">warning</span>
                                        Do not close the browser tab until you click "Submit & Finish Assessment" inside the Kode Env VM round.
                                    </div>
                                </div>
                            )}

                            {/* Right Side / Centered: Proctoring Setup Card */}
                            <div className="flex flex-col justify-center space-y-4">
                                {proctoringEnabled && (
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-4 w-full">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-[20px] text-blue-400">screen_share</span>
                                                <span className="text-sm font-bold text-white">Screen Sharing</span>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${proctoringReady ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-700 text-gray-400 border border-white/10'}`}>
                                                {proctoringReady ? '✓ Ready' : 'Required'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-[20px] text-purple-400">videocam</span>
                                                <span className="text-sm font-bold text-white">Webcam Access</span>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${proctoringReady ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-700 text-gray-400 border border-white/10'}`}>
                                                {proctoringReady ? '✓ Ready' : 'Required'}
                                            </span>
                                        </div>

                                        {!proctoringReady && (
                                            <button
                                                onClick={async () => {
                                                    const ok = await startProctoring();
                                                    if (ok) setProctoringReady(true);
                                                }}
                                                className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-500/10 hover:scale-[1.01] active:scale-[0.99]"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">cast</span>
                                                Grant Permissions & Share Screen
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Assessment Info */}
                                <div className="flex items-center gap-6 text-sm justify-center py-2">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                                        <span><span className="font-bold text-white">{duration}</span> min</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <span className="material-symbols-outlined text-[18px]">quiz</span>
                                        <span><span className="font-bold text-white">{allQuestions.length}</span> questions</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <button
                                disabled={proctoringEnabled && !proctoringReady}
                                onClick={async () => {
                                    await requestFullScreen();
                                    setStep('assessment');
                                    setIsFullscreen(true);
                                }}
                                className={`px-12 py-4 font-bold rounded-2xl shadow-xl transition-all transform text-base flex items-center gap-3
                                    ${proctoringEnabled && !proctoringReady
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                                        : 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/20 hover:scale-105 active:scale-95'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[22px]">play_circle</span>
                                {proctoringEnabled && !proctoringReady ? 'Grant permissions first' : 'Start Assessment'}
                            </button>
                            <button
                                onClick={() => setStep('fullscreen_prompt')}
                                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                            >
                                ← Back
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Fullscreen Lost Blocker (shown if user exits fullscreen mid-assessment) ── */}
            {step === 'assessment' && !isFullscreen && !isFILE_UPLOAD && (
                <div className="fixed inset-0 z-[99999] bg-gray-950/98 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-[32px] text-red-400">fullscreen_exit</span>
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Fullscreen Required</h2>
                    <p className="text-gray-400 text-sm mb-8 max-w-xs">
                        You exited fullscreen. Please re-enter fullscreen to continue your assessment.
                    </p>
                    <button
                        onClick={requestFullScreen}
                        className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">open_in_full</span>
                        Return to Fullscreen
                    </button>
                </div>
            )}

            {/* ── STEP 3: Active Assessment UI ── */}
            {step === 'assessment' && (
                <>
                    {/* Conditional Header: Pill for File Upload, Standard AppBar for others */}
                    {isFILE_UPLOAD ? (
                        <div className="w-full px-6 mt-6 mb-2">
                            {/* Pill Header */}
                            <div className="w-full bg-white dark:bg-[#09090b] rounded-[28px] px-8 py-3 flex items-center shadow-sm border border-gray-100 dark:border-blue-500/10 transition-all hover:shadow-md dark:hover:border-blue-500/30 shrink-0">
                                <div className="flex items-center flex-1">
                                    <Breadcrumbs
                                        items={breadcrumbItems}
                                        className="mb-0"
                                        transparent={true}
                                    />
                                </div>

                                <div className="flex-1 px-4" />

                                <div className="flex items-center gap-3 pl-4 border-l border-gray-100 dark:border-white/10">
                                    <button
                                        onClick={toggleTheme}
                                        className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                        title="Toggle Theme"
                                    >
                                        <span className="material-symbols-outlined text-[22px]">
                                            {theme === 'dark' ? 'dark_mode' : 'light_mode'}
                                        </span>
                                    </button>

                                </div>
                            </div>
                        </div>
                    ) : (
                        <AssessmentAppBar />
                    )}

                    <div className="flex-1 overflow-hidden flex w-full relative">

                        {/* UNIVERSAL SIDEBAR */}
                        <div className={`h-full flex flex-col transition-all duration-300 border-r ${isSidebarExpanded ? 'w-64' : 'w-14'} ${theme === 'dark' ? 'bg-[#050505] border-white/5' : 'bg-white border-gray-200'} shrink-0 overflow-hidden font-['Poppins',sans-serif] z-10 relative`}>
                            <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-white/5 h-14 shrink-0">
                                {isSidebarExpanded && (
                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-500 tracking-[2px] uppercase truncate">Navigation</span>
                                )}
                                <button
                                    onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                                    className="p-1 px-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/5 text-gray-500 transition-colors"
                                    title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {isSidebarExpanded ? 'menu_open' : 'menu'}
                                    </span>
                                </button>
                            </div>

                            <div className={`flex-1 overflow-y-auto custom-scrollbar py-4 ${isSidebarExpanded ? 'px-6' : 'px-2'}`}>
                                <div className={`grid gap-2 ${isSidebarExpanded ? 'grid-cols-4' : 'grid-cols-1 place-items-center'}`}>
                                    {allQuestions.map((q, idx) => {
                                        const isCurrent = idx === currentQIndex;
                                        const isAnswered = !!answers[q.id];
                                        const isFlagged = flags[q.id];
                                        const isLocked = hasSubmittedPrev && q.type !== 'KODE_ENV';

                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => {
                                                    if (isLocked) return;
                                                    handleQuestionChange(idx);
                                                }}
                                                disabled={isLocked}
                                                className={`flex items-center justify-center rounded-xl transition-all duration-300 h-10 w-full text-[12px] font-black ${
                                                    isLocked
                                                        ? 'opacity-35 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-600'
                                                        : isCurrent
                                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                            : isAnswered
                                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/50 dark:text-emerald-500 hover:bg-emerald-100'
                                                                : isFlagged
                                                                    ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/50 dark:text-amber-500 hover:bg-amber-100'
                                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10'
                                                    }`}
                                            >
                                                {idx + 1}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* MAIN WORKSPACE WRAPPER */}
                        <div className="flex-1 min-w-0 flex flex-col">

                        {isSQL ? (
                            // --- Professional SQL Split-View Layout ---
                            <div className={`flex flex-row h-full w-full bg-[#f8f9fa] dark:bg-black transition-colors duration-200 overflow-hidden ${isResizing ? 'select-none cursor-col-resize' : ''}`}>

                                {/* MAIN WORKSPACE CONTENT (Scrollable/Resizable) */}
                                <div className="flex-1 flex flex-row min-w-0 overflow-hidden">
                                    {/* LEFT PANEL: Problem Statement & Schema Reference */}
                                    <div className="flex flex-col h-full border-r border-gray-200 dark:border-[#222] bg-white dark:bg-[#121212]" style={{ width: `${leftPanelWidth}%` }}>
                                        {/* CONTENT AREA */}
                                        <div className="flex-1 overflow-y-auto overflow-x-auto thin-scrollbar p-6">
                                            <div className="mb-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${(currentQuestion.metadata?.difficulty === 'Hard' || currentQuestion.metadata?.difficultyLevel === 'Hard')
                                                        ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/30'
                                                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30'}`}>
                                                        {currentQuestion.metadata?.difficulty || currentQuestion.metadata?.difficultyLevel || 'Medium'}
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">SQL Challenge</span>
                                                </div>

                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
                                                    {currentQuestion.question_text || currentQuestion.title}
                                                </h3>

                                                <div className="prose prose-sm dark:prose-invert max-w-none mb-8">
                                                    {isMarkdownLoading ? (
                                                        <div className="flex items-center gap-3 py-4 text-blue-500 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl px-4 border border-blue-100 dark:border-blue-800/30">
                                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                            <span className="text-[10px] uppercase font-black tracking-widest">Fetching detailed problem statement...</span>
                                                        </div>
                                                    ) : (
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {markdownContent || currentQuestion?.description || "No description provided."}
                                                        </ReactMarkdown>
                                                    )}

                                                    {/* Hidden debug info for us to see in console if needed */}
                                                    {currentQuestion?.s3_link && !markdownContent && !isMarkdownLoading && (
                                                        <div className="mt-2 text-[10px] text-amber-500 font-bold uppercase tracking-widest opacity-50">
                                                            ⚠️ S3 link found but content is empty. Check proxy or file permissions.
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Tables Used Chips */}
                                                <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Target Tables</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(currentQuestion.metadata?.tablesUsed || currentQuestion.metadata?.tab_used ? (currentQuestion.metadata.tablesUsed || currentQuestion.metadata.tab_used).split(',') : ['customer']).map(t => (
                                                            <span key={t} className="px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 text-[11px] font-bold border border-gray-100 dark:border-white/5">
                                                                {t.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Integrated Schema Viewer */}
                                            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-white/5">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="material-symbols-outlined text-indigo-500 text-sm">database</span>
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Database Schema</h4>
                                                </div>
                                                <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-white/5">
                                                    <SqlSchemaViewer schemaData={schemaData} isLoading={isSchemaLoading} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Panel Footer: Professional Single Row Layout */}
                                        <div className="border-t border-gray-200 dark:border-white/5 flex items-center justify-start gap-8 px-6 py-4 bg-gray-50/50 dark:bg-[#050505] shrink-0 font-['Poppins',sans-serif] overflow-y-auto overflow-x-hidden thin-scrollbar">

                                            {/* Left Side: Proctoring Camera Only */}
                                            <div className="flex items-center shrink-0">
                                                {proctoringEnabled && (
                                                    <div className="h-[96px] 2xl:h-[100px] aspect-[2.5/1] relative overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-black shadow-lg">
                                                        <ProctoringWebcam onStatusChange={handleCameraStatusChange} />
                                                        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                                                            <span className="text-[7px] font-black text-white uppercase tracking-widest">Active</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right Side: Action Buttons Stacked Closely */}
                                            <div className="flex flex-col gap-2 shrink-0 justify-center">
                                                <button
                                                    onClick={() => setFlags(prev => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }))}
                                                    className={`w-40 flex items-center justify-center gap-2 px-4 h-8 rounded-xl text-[9px] font-black uppercase tracking-[1px] transition-all border ${flags[currentQuestion.id] ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-300 dark:border-amber-500/30' : 'bg-white text-gray-500 border-gray-200 hover:border-amber-500/50 hover:text-amber-500 dark:bg-[#121212] dark:border-white/10 dark:hover:text-amber-400'}`}
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">{flags[currentQuestion.id] ? 'flag_circle' : 'outlined_flag'}</span>
                                                    Mark Review
                                                </button>
                                                <button
                                                    onClick={handlePrev}
                                                    disabled={currentQIndex === 0}
                                                    className="w-40 px-5 h-8 rounded-xl bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-[#1a1a1a] dark:text-gray-300 dark:border-white/10 dark:hover:bg-[#222] flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[1px] disabled:opacity-30 transition-all shadow-sm"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">west</span>
                                                    Prev Question
                                                </button>
                                                <button
                                                    onClick={handleNext}
                                                    className={`w-40 px-6 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[1.5px] transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-30 disabled:pointer-events-none`}
                                                >
                                                    Next Question
                                                    <span className="material-symbols-outlined text-[14px]">east</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DRAGGABLE RESIZER */}
                                    <div
                                        onMouseDown={startResizing}
                                        className={`w-1 hover:w-1.5 active:w-1.5 transition-all cursor-col-resize z-50 flex items-center justify-center group ${isResizing ? 'bg-blue-500' : 'bg-gray-100 dark:bg-[#222] hover:bg-blue-400 dark:hover:bg-blue-600/50'}`}
                                    >
                                        <div className="h-8 w-1 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-white/50" />
                                    </div>

                                    {/* RIGHT PANEL: Editor & Results */}
                                    <div className={`flex ${consoleLayout === 'side' ? 'flex-row' : 'flex-col'} h-full bg-[#f8f9fa] dark:bg-black min-w-[320px] transition-all duration-300 min-h-0 overflow-hidden`} style={{ width: `${100 - leftPanelWidth}%` }}>
                                        <div className="flex-1 flex flex-col min-w-0 min-h-0">
                                            {/* Editor Header - Flex Fix and Theme */}
                                            <div className={`h-11 px-4 flex items-center justify-between border-b transition-colors font-['Poppins',sans-serif] shrink-0 ${theme === 'dark' ? 'bg-[#1a1a1a] border-white/5' : 'bg-gray-200 border-gray-300'}`}>
                                                <div className="flex items-center gap-2 overflow-hidden mr-2">
                                                    <span className="material-symbols-outlined text-sm text-blue-500 shrink-0">code</span>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>SQL Editor</span>
                                                </div>
                                                <div className="flex items-center shrink-0">
                                                    <button
                                                        onClick={handleRunSQL}
                                                        className="flex items-center gap-1.5 px-4 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">play_arrow</span>
                                                        Run Code
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Editor Component with Specific Grey Colors */}
                                            <div className="flex-1 min-h-0 relative">
                                                <Editor
                                                    height="100%"
                                                    defaultLanguage="sql"
                                                    theme="vs-dark"
                                                    value={answers[currentQuestion.id] || ''}
                                                    onChange={handleAnswer}
                                                    onMount={(editor) => {
                                                        // Inject custom grey styles to editor background if needed
                                                        // or just use standard themes which are well-tuned
                                                    }}
                                                    options={{
                                                        minimap: { enabled: false },
                                                        scrollBeyondLastLine: false,
                                                        fontSize: 14,
                                                        fontFamily: "'JetBrains Mono', monospace",
                                                        padding: { top: 20 },
                                                        lineNumbers: 'on',
                                                        roundedSelection: false,
                                                        automaticLayout: true,
                                                        renderLineHighlight: 'none',
                                                        scrollbar: {
                                                            vertical: 'hidden',
                                                            horizontal: 'hidden'
                                                        }
                                                    }}
                                                />
                                                <style dangerouslySetInnerHTML={{
                                                    __html: `
                                            .monaco-editor, .monaco-editor .margin, .monaco-editor-background { 
                                                background-color: #1e1e1e !important; 
                                            }
                                            .monaco-editor .line-numbers { color: #5a5a5a !important; }
                                            .monaco-editor .current-line { background-color: rgba(255,255,255,0.03) !important; }
                                            
                                            /* Elegant Thin Scrollbar */
                                            .thin-scrollbar::-webkit-scrollbar {
                                                width: 4px;
                                                height: 4px;
                                            }
                                            .thin-scrollbar::-webkit-scrollbar-track {
                                                background: transparent;
                                            }
                                            .thin-scrollbar::-webkit-scrollbar-thumb {
                                                background-color: rgba(156, 163, 175, 0.4);
                                                border-radius: 4px;
                                            }
                                            .thin-scrollbar::-webkit-scrollbar-thumb:hover {
                                                background-color: rgba(156, 163, 175, 0.7);
                                            }
                                        ` }} />
                                            </div>
                                        </div>

                                        <div className={`${consoleLayout === 'side' ? (isConsoleVisible ? 'w-[40%] max-w-[600px] min-w-[300px]' : 'w-12') : (isConsoleVisible ? 'h-[250px] w-full' : 'h-9 w-full')} shrink-0 ${consoleLayout === 'side' ? 'border-l' : 'border-t'} border-gray-200 dark:border-[#222] bg-white dark:bg-[#121212] flex flex-col overflow-hidden transition-all duration-300`}>
                                            <div className={`h-9 ${consoleLayout === 'side' && !isConsoleVisible ? 'px-1 justify-center' : 'px-4 justify-between'} flex items-center border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.03] shrink-0`}>
                                                {consoleLayout === 'side' && !isConsoleVisible ? (
                                                    <button
                                                        onClick={() => setIsConsoleVisible(true)}
                                                        className="text-gray-400 hover:text-blue-500 p-1 flex items-center justify-center w-full transition-colors"
                                                        title="Expand Output"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">menu_open</span>
                                                    </button>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                <span className="material-symbols-outlined text-sm">terminal</span>
                                                                Output
                                                            </div>
                                                            <div className="h-3 w-[1px] bg-gray-200 dark:bg-white/10" />
                                                            <button
                                                                onClick={() => setConsoleLayout(prev => prev === 'bottom' ? 'side' : 'bottom')}
                                                                className="flex items-center gap-1.5 text-[9px] font-black uppercase text-blue-500 hover:text-blue-600 transition-colors"
                                                                title="Toggle Console Layout"
                                                            >
                                                                <span className="material-symbols-outlined text-xs">
                                                                    {consoleLayout === 'bottom' ? 'vertical_split' : 'horizontal_split'}
                                                                </span>
                                                                {consoleLayout === 'bottom' ? 'Side Tile' : 'Bottom Bar'}
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            {sqlResult && !sqlResult.isLoading && isConsoleVisible && (
                                                                <div className={`text-[10px] font-bold uppercase tracking-widest ${sqlResult.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                                                                    {sqlResult.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                                                </div>
                                                            )}
                                                            <button
                                                                onClick={() => setIsConsoleVisible(!isConsoleVisible)}
                                                                className="text-gray-400 hover:text-gray-600 p-1"
                                                            >
                                                                <span className={`material-symbols-outlined text-sm transition-transform ${!isConsoleVisible ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {isConsoleVisible && (
                                                <div className="flex-1 overflow-auto custom-scrollbar">
                                                    {!sqlResult && !sampleOutput.rows.length ? (
                                                        <div className="h-full flex items-center justify-center text-[11px] text-gray-400 uppercase font-medium tracking-wide">
                                                            Your results will appear here after running code
                                                        </div>
                                                    ) : (
                                                        <div className={`flex w-full h-full ${consoleLayout === 'side' ? 'flex-col divide-y' : 'flex-row divide-x'} divide-gray-100 dark:divide-white/5`}>
                                                            <div className="flex-1 p-0 overflow-auto flex flex-col min-h-0 min-w-0">
                                                                <div className="sticky top-0 z-10 px-4 py-2 bg-gray-50/90 dark:bg-[#121212]/90 backdrop-blur-sm text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center justify-between shrink-0">
                                                                    <span>Your Output</span>
                                                                </div>

                                                                <div className="flex-1 overflow-auto">
                                                                    {sqlResult?.isLoading ? (
                                                                        <div className="p-8 flex items-center justify-center gap-3 h-full">
                                                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                                            <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Executing Query...</span>
                                                                        </div>
                                                                    ) : sqlResult?.error ? (
                                                                        <div className="p-6 text-red-500 text-xs font-mono bg-red-500/5 m-4 rounded-xl border border-red-500/20">
                                                                            <div className="flex items-center gap-2 mb-2 font-black uppercase text-[10px]">
                                                                                <span className="material-symbols-outlined text-sm">error</span>
                                                                                Execution Error
                                                                            </div>
                                                                            {sqlResult.error}
                                                                        </div>
                                                                    ) : (
                                                                        <table className="w-full text-left text-[11px] font-mono whitespace-nowrap">
                                                                            <thead className="bg-gray-50/50 dark:bg-white/5 border-y border-gray-100 dark:border-white/5 sticky top-0 z-10">
                                                                                <tr>
                                                                                    {sqlResult?.rows.length > 0 && Object.keys(sqlResult.rows[0]).map(k => (
                                                                                        <th key={k} className="px-4 py-2 text-gray-400">{k}</th>
                                                                                    ))}
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                                                                {sqlResult?.rows.map((row, i) => (
                                                                                    <tr key={i}>
                                                                                        {Object.values(row).map((v, j) => <td key={j} className="px-4 py-2 dark:text-gray-300">{String(v)}</td>)}
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Sample Result (Expected Output) */}
                                                            <div className={`flex-1 p-0 overflow-auto flex flex-col min-h-0 min-w-0 ${consoleLayout === 'bottom' ? 'border-l' : 'border-t'} border-gray-100 dark:border-white/5`}>
                                                                <div className="sticky top-0 z-10 px-4 py-2 bg-gray-50/90 dark:bg-[#121212]/90 backdrop-blur-sm text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center justify-between shrink-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-purple-500">Expected Output</span>
                                                                        {sampleOutput.isLoading && <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />}
                                                                    </div>
                                                                </div>

                                                                <div className="flex-1 overflow-auto">
                                                                    {sampleOutput.rows.length > 0 ? (
                                                                        <SqlTable rows={sampleOutput.rows} />
                                                                    ) : !sampleOutput.isLoading && (
                                                                        <div className="p-12 text-center flex flex-col items-center justify-center gap-2 h-full border-t border-transparent">
                                                                            <span className="material-symbols-outlined text-gray-300 text-3xl">data_info_alert</span>
                                                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">No Reference Data Available</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : isFILE_UPLOAD ? (
                            <div className="flex-1 overflow-visible flex flex-col p-6">
                                <div className="flex-1 p-0">
                                    <FileUploadViewer
                                        question={currentQuestion}
                                        answer={answers[currentQuestion.id]}
                                        onAnswer={handleAnswer}
                                        onSubmit={finishAssessment}
                                    />

                                    {/* Built-in File Upload UI inside Task View */}
                                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5">
                                        <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                                            <span className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center transition-colors">
                                                <span className="material-symbols-outlined">upload_file</span>
                                            </span>
                                            Your Submission
                                        </h3>

                                        <div className="grid grid-cols-1 gap-8">
                                            {/* Top: Upload Button Area */}
                                            <div className="relative group">
                                                <input
                                                    type="file"
                                                    multiple
                                                    onChange={getFileUploadProps()?.onUpload}
                                                    disabled={isUploading}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                                />
                                                <div className={`h-44 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center transition-all ${isUploading ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-white/10 group-hover:border-purple-400 dark:group-hover:border-purple-500/50 bg-gray-50 dark:bg-white/5'}`}>
                                                    {isUploading ? (
                                                        <div className="w-full max-w-xs">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Uploading...</span>
                                                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{uploadProgress}%</span>
                                                            </div>
                                                            <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-2 overflow-hidden">
                                                                <div
                                                                    className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
                                                                    style={{ width: `${uploadProgress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="w-14 h-14 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                                                                <span className="material-symbols-outlined text-3xl">add</span>
                                                            </div>
                                                            <p className="text-base font-bold text-gray-900 dark:text-white">Click or drag to add files</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 uppercase tracking-widest font-bold">Multi-file support enabled</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Bottom: Uploaded Files List */}
                                            <div className="space-y-4">
                                                {getFileUploadProps()?.uploadedFiles && getFileUploadProps()?.uploadedFiles.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {getFileUploadProps()?.uploadedFiles.map((file, idx) => (
                                                            <div key={idx} className="flex items-center gap-4 p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 group">
                                                                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center text-gray-500 shrink-0">
                                                                    <span className="material-symbols-outlined text-2xl">description</span>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate" title={file.originalName}>{file.originalName}</p>
                                                                    <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-widest mt-1">Ready for submission</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => getFileUploadProps()?.onRemove(idx)}
                                                                    className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                                                    title="Remove"
                                                                >
                                                                    <span className="material-symbols-outlined">close</span>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="h-44 flex flex-col items-center justify-center border-2 border-dotted border-gray-100 dark:border-white/5 rounded-2xl text-gray-400 bg-gray-50/30 dark:bg-white/2 transition-colors">
                                                        <span className="material-symbols-outlined text-5xl opacity-10 mb-3">cloud_upload</span>
                                                        <p className="text-[11px] font-bold uppercase tracking-[0.2em]">No files uploaded yet</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Integrated Navigation Footer (Only for File Upload now, others use sidebar) */}
                                <div className="mt-8 flex items-center justify-between shrink-0">
                                    <div className="flex-1" />
                                    <button
                                        onClick={finishAssessment}
                                        className="h-11 px-10 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                                    >
                                        Submit Final Assessment
                                    </button>
                                </div>
                            </div>
                        ) : isKODE_ENV ? (
                            <KodeEnvSection
                                username={user?.username || 'candidate'}
                                questionCode={currentQuestion.round?.questionCode}
                                cameraStream={cameraStream}
                                onFinish={() => finishAssessment(false)}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8f9fa] dark:bg-black transition-colors duration-200">
                                <div className="flex-1 overflow-y-auto w-full flex justify-center p-8 custom-scrollbar">
                                    <div className="w-full max-w-3xl">
                                        <MCQViewer
                                            question={currentQuestion}
                                            answer={answers[currentQuestion.id]}
                                            onAnswer={handleAnswer}
                                            onPrev={handlePrev}
                                            onNext={() => { 
                                                handleNext();
                                            }}
                                            onFlag={() => setFlags(prev => ({ ...prev, [currentQuestion.id]: !prev[currentQuestion.id] }))}
                                            isFlagged={flags[currentQuestion.id]}
                                            isFirst={currentQIndex === 0}
                                            isLast={currentQIndex === allQuestions.length - 1}
                                            onOpenMd={(val) => setShowQuestionMd(val)}
                                            showQuestionMd={showQuestionMd}
                                            markdownContent={markdownContent}
                                            isMarkdownLoading={isMarkdownLoading}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>

                    <ProctoringOverlay
                        onStatusChange={handleCameraStatusChange}
                        proctoringEnabled={proctoringEnabled && !isSQL && !isKODE_ENV}
                        cameraStatus={cameraStatus}
                    />

                    {/* Notification Toast for Proctoring Warnings */}
                    <AnimatePresence>
                        {proctorWarning && (
                            <motion.div
                                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                                className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[10001] bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm"
                            >
                                <span className="material-symbols-outlined">warning</span>
                                {proctorWarning}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* Submit Confirmation Modal */}
                    <AnimatePresence>
                        {showSubmitModal && (
                            <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowSubmitModal(false)}
                                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="relative w-full max-w-md bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 text-center"
                                >
                                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="material-symbols-outlined text-[32px]">assignment_turned_in</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Submit Assessment?</h2>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                                        Are you sure you want to submit your assessment? 
                                        You won't be able to change your answers after submission.
                                    </p>
                                    <div className="flex gap-3 w-full">
                                        <button
                                            onClick={() => setShowSubmitModal(false)}
                                            disabled={isSubmitting}
                                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => executeSubmission(false)}
                                            disabled={isSubmitting}
                                            className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            ) : (
                                                <>
                                                    Yes, Submit
                                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </>
            )
            }
        </div >
    );

    // Final Render with Portal
    // Step 1 & 2 are portaled directly to body to escape sidebar stacking context
    if (step === 'fullscreen_prompt' || step === 'ready_start') {
        return createPortal(content, document.body);
    }
    // Step 3 (assessment): portal when fullscreen, otherwise render inline (FILE_UPLOAD)
    if (isFullscreen && !isFILE_UPLOAD) {
        return createPortal(content, document.body);
    }
    return content;
};

export default AssessmentRunner;