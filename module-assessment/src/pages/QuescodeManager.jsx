import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import { useTheme } from "../ThemeContext";
import Editor from "@monaco-editor/react";

function QuescodeManager() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const darkMode = theme === 'dark';
    const [cohorts, setCohorts] = useState([]);
    const [selectedCohort, setSelectedCohort] = useState('');
    const [quescodeContent, setQuescodeContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchCohorts();
    }, []);

    const fetchCohorts = async () => {
        // Check cache first
        const cached = sessionStorage.getItem('cached_cohorts');
        if (cached) {
            try {
                setCohorts(JSON.parse(cached));
                // We still fetch in background to update if needed, or just rely on cache?
                // For "prior loading", cache is best. Let's return early if cache exists to be instant.
                // We can do a silent re-fetch if needed, but for now instant load is the goal.
                return;
            } catch (e) {
                console.warn("Cache parse failed", e);
                sessionStorage.removeItem('cached_cohorts');
            }
        }

        setLoading(true);
        try {
            const response = await fetch('https://x6uz5z6ju2.execute-api.us-west-2.amazonaws.com/SQLAdmin?type=cohorts', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`API failed with status: ${response.status}`);
            }

            const data = await response.json();
            if (data.cohorts && Array.isArray(data.cohorts)) {
                setCohorts(data.cohorts);
                sessionStorage.setItem('cached_cohorts', JSON.stringify(data.cohorts));
            } else {
                setCohorts([]);
            }
        } catch (err) {
            console.error('Error fetching cohorts:', err);
            setMessage({ type: 'error', text: 'Failed to load cohorts.' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' }); // Clear prev messages

        if (!selectedCohort || !quescodeContent) {
            setMessage({ type: 'error', text: 'Please select a cohort and enter code content.' });
            return;
        }

        setUploading(true);

        try {
            // Use 'default' as filename so fetching by cohort works automatically
            const payload = {
                action: "upload_quescode",
                cohort: selectedCohort,
                filename: 'default',
                content: quescodeContent
            };

            const ASSESSMENT_MGMT_API_BASE = import.meta.env.VITE_ASSESSMENT_MGMT_API_BASE || 
                (import.meta.env.DEV ? '/assessment-mgmt-api' : 'https://64whx2c4ir65zu5l2ocpuobnxm0lpzph.lambda-url.ap-south-1.on.aws');

            const response = await fetch(`${ASSESSMENT_MGMT_API_BASE}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            // Guard: check response before parsing JSON
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Upload failed ${response.status}: ${text}`);
            }

            const result = await response.json();
            let success = result.success;
            // Handle cases where body is stringified (Lambda proxy response quirks)
            if (result.body && typeof result.body === 'string') {
                const parsed = JSON.parse(result.body);
                success = parsed.success;
            }

            if (!response.ok || !success) {
                throw new Error(result.message || 'Upload failed');
            }

            setMessage({ type: 'success', text: `Quescode uploaded successfully for cohort ${selectedCohort}!` });

            // Clear Code content only, keep cohort selected for rapid entry
            // setQuescodeTitle(''); 
            setQuescodeContent('');

        } catch (error) {
            console.error('Upload error:', error);
            setMessage({ type: 'error', text: error.message || 'Failed to upload Quescode.' });
        } finally {
            setUploading(false);
        }
    };

    const breadcrumbItems = [
        { label: 'Assessments', path: '/assessment' },
        { label: 'Quescode Manager' }
    ];

    return (
        <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-100 font-['Poppins',sans-serif] transition-colors duration-500 relative min-h-screen">
            <div className="px-6 pt-6 pb-4 w-full flex-1 flex flex-col mx-auto">

                {/* Header Area - Pill Style/Sticky */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 mt-2 sticky top-4 z-30 bg-white dark:bg-brand-card rounded-2xl p-2 pr-4 shadow-sm mx-2 md:mx-0 border border-gray-100 dark:border-white/5 transition-all shrink-0">
                <div className="flex items-center">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none px-4 whitespace-nowrap">
                        Code Manager
                    </h1>
                    <div className="h-8 w-[1px] bg-gray-100 dark:bg-white/10 mx-2" />
                    <div className="px-2">
                        <Breadcrumbs items={breadcrumbItems} transparent={true} className="mb-0" />
                    </div>
                </div>

                <div className="h-8 w-[1px] bg-gray-100 dark:bg-white/10 mx-4" />

                <div className="flex-1 px-4" />

                <div className="flex items-center gap-1.5 px-6">
                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex items-center justify-center pt-0.5"
                        title="Toggle Theme"
                    >
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Left Column: Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-brand-card rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 p-8 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        {message.text && (
                            <div className={`mb-8 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'}`}>
                                <span className="material-symbols-outlined">{message.type === 'error' ? 'error' : 'check_circle'}</span>
                                <p className="font-medium">{message.text}</p>
                            </div>
                        )}

                        <form onSubmit={handleUpload}>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Details</h2>

                            <FilledSelect
                                id="cohort-select"
                                label="Select Cohort"
                                value={selectedCohort}
                                onChange={(e) => setSelectedCohort(e.target.value)}
                                options={cohorts}
                                disabled={loading}
                                loading={loading}
                                style={{ zIndex: 30 }}
                            />

                            {/* Title removed - cohort name is used as the filename */}

                            {/* Monaco Code Editor */}
                            <div className="relative z-0 w-full mb-6 group bg-gray-50 dark:bg-black/40 rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 focus-within:border-blue-500/50 transition-all h-[400px]" style={{ zIndex: 10 }}>
                                <div className="absolute top-0 left-0 right-0 h-10 bg-gray-100 dark:bg-white/5 flex items-center px-4 justify-between border-b border-gray-200 dark:border-white/10 z-20">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                                        <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                                        <div className="w-3 h-3 rounded-full bg-emerald-400/80"></div>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                        Editor.js
                                    </span>
                                </div>
                                <div className="pt-10 h-full">
                                    <Editor
                                        height="100%"
                                        defaultLanguage="javascript"
                                        theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                        value={quescodeContent}
                                        onChange={(value) => setQuescodeContent(value)}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 13,
                                            lineNumbers: 'on',
                                            roundedSelection: true,
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            padding: { top: 16, bottom: 16 },
                                            fontFamily: "'Fira Code', 'Courier New', monospace"
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className={`
                                        h-12 px-8 rounded-full text-white font-medium flex items-center gap-2 transition-all transform active:scale-95 shadow-lg
                                        ${uploading
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 hover:shadow-blue-500/40'}
                                    `}
                                >
                                    {uploading ? (
                                        <>
                                            <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                                            <span>Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-xl">cloud_upload</span>
                                            <span>Upload Quescode</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Column: Info / Help */}
                <div className="lg:col-span-1">
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] p-8 border border-blue-100 dark:border-blue-900/20 sticky top-6 animate-in fade-in slide-in-from-right-4 duration-500 delay-150">
                        <div className="flex items-center gap-3 mb-6 text-blue-800 dark:text-blue-300">
                            <span className="material-symbols-outlined rounded-2xl bg-blue-100 dark:bg-blue-500/20 p-2.5">lightbulb</span>
                            <h3 className="font-bold text-lg">Pro Tips</h3>
                        </div>
                        <ul className="space-y-5 text-sm text-blue-900/80 dark:text-blue-200/80">
                            <li className="flex gap-3 leading-relaxed">
                                <span className="material-symbols-outlined text-blue-500 text-lg mt-0.5">verified_user</span>
                                <span>Ensure the <strong>Cohort</strong> name matches exactly what is assigned to the students' environment.</span>
                            </li>
                            <li className="flex gap-3 leading-relaxed">
                                <span className="material-symbols-outlined text-blue-500 text-lg mt-0.5">info</span>
                                <span>The code uploaded here will be the <strong>starter code</strong> or <strong>question code</strong> fetched automatically by the candidate's VM.</span>
                            </li>
                            <li className="flex gap-3 leading-relaxed">
                                <span className="material-symbols-outlined text-blue-500 text-lg mt-0.5">code</span>
                                <span>The content will be pasted directly into the candidate's editor. You can include comments and complex logic.</span>
                            </li>
                        </ul>
                        <div className="mt-8 p-4 bg-white/50 dark:bg-white/5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                Last sync: {new Date().toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

            </div>
            </div>
        </div>
    );
}

// Material 3 Styled Components
// Added z-index props to allow controlling stacking context explicitly
const FilledInput = ({ id, label, value, onChange, type = 'text', placeholder = ' ', disabled, style }) => (
    <div className="relative w-full mb-6 group bg-gray-50 dark:bg-white/5 rounded-t-lg" style={style}>
        <input
            type={type}
            name={id}
            id={id}
            className="block pt-6 pb-2 px-4 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-white/10 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer placeholder-transparent focus:placeholder-gray-400 dark:focus:placeholder-gray-500"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={disabled}
            required
        />
        <label
            htmlFor={id}
            className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 pointer-events-none"
        >
            {label}
        </label>
    </div>
);

const FilledSelect = ({ id, label, value, onChange, options, disabled, loading, style }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (loading && !options.length) { // Only show skeleton if no options available (cache miss)
        return (
            <div className="relative z-0 w-full mb-6 group bg-gray-50 dark:bg-white/5 rounded-t-lg h-[56px] animate-pulse border-b-2 border-gray-300 dark:border-white/10" style={style}>
                <div className="absolute top-1/2 left-4 w-1/3 h-2 bg-gray-200 dark:bg-gray-700 rounded transform -translate-y-1/2"></div>
                <div className="absolute top-1/2 right-4 w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded transform -translate-y-1/2"></div>
            </div>
        )
    }

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`relative w-full mb-6 group ${isOpen ? 'z-50' : ''}`} ref={dropdownRef} style={style}>
            <div
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen);
                        if (!isOpen) setSearchTerm(''); // Clear search term when opening
                    }
                }}
                className="relative bg-gray-50 dark:bg-white/5 rounded-t-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
                <input
                    type="text"
                    id={id}
                    value={isOpen ? searchTerm : value}
                    onChange={(e) => {
                        if (isOpen) setSearchTerm(e.target.value);
                    }}
                    readOnly={!isOpen}
                    className="block pt-6 pb-2 px-4 pr-10 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-white/10 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer placeholder-transparent cursor-pointer"
                    placeholder=" "
                    disabled={disabled}
                    autoComplete="off"
                />
                <label
                    htmlFor={id}
                    className={`peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform top-4 z-10 origin-[0] left-4 pointer-events-none ${(value || (isOpen && searchTerm)) ? '-translate-y-4 scale-75' : 'peer-focus:-translate-y-4 peer-focus:scale-75 scale-100 translate-y-0'}`}
                >
                    {label}
                </label>
                <div className={`absolute top-1/2 right-4 transform -translate-y-1/2 pointer-events-none text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-500' : ''}`}>
                    <span className="material-symbols-outlined">expand_more</span>
                </div>
            </div>

            {/* Custom Dropdown List */}
            {isOpen && (
                <div className="absolute z-50 w-full bg-white dark:bg-brand-card shadow-xl max-h-60 overflow-y-auto rounded-b-2xl border border-t-0 border-gray-200 dark:border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt, idx) => (
                            <div
                                key={idx}
                                onClick={() => {
                                    onChange({ target: { value: opt } });
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                                className={`px-4 py-3 text-sm cursor-pointer transition-colors ${value === opt ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                            >
                                {opt}
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 italic">
                            No matching cohorts found.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuescodeManager;
