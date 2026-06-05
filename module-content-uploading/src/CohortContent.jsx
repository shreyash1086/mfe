import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { CONTENT_API_BASE_URL, CATEGORY_API_URL, CONTENT_ENDPOINTS } from './contentApi';
import { useTheme } from './ThemeContext';
import { ArrowLeft } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import ContentLoader from './ContentLoader';
import PageHeader from 'sharedDesignSystem/PageHeader';
import Card from 'sharedDesignSystem/Card';

function CohortContent() {
    const { userRole, user } = useAuth();
    const { cohortId: paramCohortId } = useParams();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const breadcrumbItems = [
        { label: 'Content Bank', path: '/content-uploading' },
        { label: 'Cohort Content', active: true }
    ];

    // Authorization Check: Admins and Trainers can upload/edit content
    useEffect(() => {
        if (userRole && !['admin', 'trainer'].includes(userRole)) {
            navigate('/content-uploading'); // Redirect to content list
        }
    }, [userRole, navigate]);

    // Cohort Logic
    let effectiveCohortId = paramCohortId;
    if (userRole !== 'admin' && user?.username) {
        // Fallback safety (though useEffect should catch it)
        effectiveCohortId = 'restricted';
    }

    // State
    const [cohorts, setCohorts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isCohortDropdownOpen, setIsCohortDropdownOpen] = useState(false);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

    const cohortRef = useRef(null);
    const categoryRef = useRef(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (cohortRef.current && !cohortRef.current.contains(event.target)) {
                setIsCohortDropdownOpen(false);
            }
            if (categoryRef.current && !categoryRef.current.contains(event.target)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch Categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch(`${CATEGORY_API_URL}`);
                if (response.ok) {
                    const data = await response.json();
                    let cats = data.categories || [];
                    // Ensure 'General' is always in the list
                    if (!cats.includes('General')) {
                        cats = ['General', ...cats];
                    }
                    if (cats.length > 0) {
                        setCategories(cats);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch categories", e);
                // Fallback
                setCategories(['General']);
            }
        };
        fetchCategories();
    }, []);

    // Fetch Cohorts
    useEffect(() => {
        const fetchCohorts = async () => {
            const cacheKey = `cached_cohorts_v2`;
            let cohortsData = [];
            const cached = sessionStorage.getItem(cacheKey);

            if (cached) {
                cohortsData = JSON.parse(cached);
            } else {
                try {
                    const response = await fetch('https://x6uz5z6ju2.execute-api.us-west-2.amazonaws.com/SQLAdmin?type=cohorts');
                    if (response.ok) {
                        const data = await response.json();
                        cohortsData = (data.cohorts || []).map((item, index) => {
                            if (typeof item === 'string') return { id: item, name: item };
                            const name = item.name || item.id || `Cohort ${index + 1}`;
                            const id = item.id || name;
                            return { id, name };
                        });
                        sessionStorage.setItem(cacheKey, JSON.stringify(cohortsData));
                    }
                } catch (e) {
                    console.error("Failed to load cohorts", e);
                }
            }

            // If trainer, filter cohorts to only show theirs
            if (userRole === 'trainer' && user?.username) {
                const inferred = user.username.split('@')[0].replace('trainer-', '');
                const filtered = cohortsData.filter(c =>
                    c.name.toLowerCase().includes(inferred.toLowerCase()) ||
                    inferred.toLowerCase().includes(c.name.toLowerCase())
                );
                setCohorts(filtered);

                // Pre-select if only one
                if (filtered.length > 0 && uploadConfig.cohorts.length === 0) {
                    setUploadConfig(prev => ({ ...prev, cohorts: [filtered[0].id] }));
                }
            } else {
                setCohorts(cohortsData);
            }
        };
        fetchCohorts();
    }, []);

    // Upload Form State
    const [uploadConfig, setUploadConfig] = useState({
        title: '',
        cohorts: [],
        categories: ['General'],
        description: '',
        files: []
    });

    // Add search state
    const [cohortSearch, setCohortSearch] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [history, setHistory] = useState([]);

    // Fetch History Logic
    const fetchHistory = async () => {
        if (!uploadConfig.cohorts || uploadConfig.cohorts.length === 0) return;
        const targetCohort = uploadConfig.cohorts[0];
        try {
            const timestamp = Date.now();
            const response = await fetch(`${CONTENT_API_BASE_URL}${CONTENT_ENDPOINTS.LIST}?cohort=${encodeURIComponent(targetCohort)}&_t=${timestamp}`, {
                cache: 'no-store'
            });
            if (response.ok) {
                const data = await response.json();
                const files = data.all_files || [];
                setHistory(files);
            }
        } catch (e) {
            console.error("Failed to load history", e);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [uploadConfig.cohorts]);

    // Drag & Drop Handlers
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files);
            setUploadConfig(prev => {
                const existingNames = new Set(prev.files.map(f => f.name + f.size));
                const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name + f.size));
                return { ...prev, files: [...prev.files, ...uniqueNewFiles] };
            });
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setUploadConfig(prev => {
                const existingNames = new Set(prev.files.map(f => f.name + f.size));
                const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name + f.size));
                return { ...prev, files: [...prev.files, ...uniqueNewFiles] };
            });
            e.target.value = '';
        }
    };

    // Upload Logic
    const handleUpload = async () => {
        if (uploadConfig.files.length === 0) {
            alert('Please select a file to upload.');
            return;
        }

        if (uploadConfig.cohorts.length === 0) {
            alert('Please select at least one cohort.');
            return;
        }

        const categoriesToUpload = uploadConfig.categories.length > 0 ? uploadConfig.categories : ['General'];

        setUploading(true);
        setUploadProgress('Preparing...');

        try {
            const totalFiles = uploadConfig.files.length;
            const totalCohorts = uploadConfig.cohorts.length;
            const totalCategories = categoriesToUpload.length;
            const grandTotal = totalFiles * totalCohorts * totalCategories;
            let completed = 0;

            for (let i = 0; i < totalFiles; i++) {
                const file = uploadConfig.files[i];

                for (const cohort of uploadConfig.cohorts) {
                    for (const category of categoriesToUpload) {
                        completed++;
                        setUploadProgress(`Uploading ${completed}/${grandTotal}: ${file.name} to ${cohort} (${category})`);

                        const formData = new FormData();
                        formData.append('file', file);

                        const queryParams = new URLSearchParams({
                            cohorts: cohort,
                            category: category.trim(),
                            description: (uploadConfig.description || '').trim()
                        });

                        const response = await fetch(`${CONTENT_API_BASE_URL}${CONTENT_ENDPOINTS.UPLOAD}?${queryParams.toString()}`, {
                            method: 'POST',
                            body: formData
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Upload failed');
                        }
                    }
                }
            }

            alert(`Successfully uploaded ${totalFiles} file(s) across ${totalCohorts} cohort(s) and ${totalCategories} category(s)!`);
            setUploadConfig({
                title: '',
                cohorts: effectiveCohortId && effectiveCohortId !== 'unknown' ? [effectiveCohortId] : [],
                categories: [],
                description: '',
                files: []
            });
            setUploadProgress('');
            fetchHistory();
        } catch (error) {
            console.error('Upload error:', error);
            alert(`Upload failed: ${error.message}`);
            setUploadProgress('');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen w-full overflow-y-auto bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-100 font-['Poppins',sans-serif] transition-colors duration-500">
            <div className="px-6 pt-0 pb-20 w-full flex flex-col mx-auto">
                <PageHeader 
                    title="Cohort Content" 
                    actions={
                        <button
                            onClick={() => navigate('/content-uploading')}
                            className="h-10 px-5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-[11px] font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            Back
                        </button>
                    }
                />

                {/* 1. New Content Asset Card */}
                <Card hoverEffect={false} gridBg={false} className="p-6 md:p-8">

                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Upload to <span className="text-brand-accent">{uploadConfig.cohorts.length > 0 ? uploadConfig.cohorts.join(', ') : '...'}</span>
                        </h2>
                    </div>

                    {/* Drag & Drop Area */}
                    <div
                        className={`relative border-2 border-dashed rounded-xl p-8 md:p-10 flex flex-col items-center justify-center text-center transition-colors
                        ${dragActive ? 'border-brand-accent bg-brand-accent/10' : 'border-gray-200 dark:border-gray-700 hover:border-brand-accent/30'}
                    `}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        {uploadConfig.files.length > 0 ? (
                            <div className="space-y-3">
                                <div className="p-3 bg-brand-accent/10 text-brand-accent rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                                    <span className="material-symbols-outlined">description</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{uploadConfig.files.length} file(s) selected</p>
                                    <p className="text-xs text-gray-500 mt-1">{uploadConfig.files.map(f => f.name).join(', ')}</p>
                                </div>
                                <button onClick={() => setUploadConfig(p => ({ ...p, files: [] }))} className="text-xs text-red-500 hover:underline">
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="p-3 bg-white dark:bg-white/5 shadow-sm rounded-lg mb-4">
                                    <span className="material-symbols-outlined text-brand-accent text-2xl">upload_file</span>
                                </div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                    Click to upload or drag and drop
                                </p>
                                <p className="text-xs text-gray-400">
                                    BINARY FILES UP TO 500MB (PDF, MP4, ZIP)
                                </p>
                                <input
                                    type="file"
                                    className="hidden"
                                    id="file-upload"
                                    multiple
                                    onChange={handleFileSelect}
                                />
                                <label htmlFor="file-upload" className="absolute inset-0 cursor-pointer" />
                            </>
                        )}
                    </div>

                    {/* Inputs Row 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                Content Title (Optional, defaults to filename)
                            </label>
                            <input
                                type="text"
                                placeholder="Enter descriptive title"
                                value={uploadConfig.title}
                                onChange={(e) => setUploadConfig({ ...uploadConfig, title: e.target.value })}
                                className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex justify-between">
                                <span>Select Cohort</span>
                                {uploadConfig.cohorts.length > 0 && (
                                    <span className="text-brand-accent normal-case font-bold">{uploadConfig.cohorts.length} Selected</span>
                                )}
                            </label>
                            <div className="relative" ref={cohortRef}>
                                <div
                                    onClick={() => setIsCohortDropdownOpen(!isCohortDropdownOpen)}
                                    className={`w-full px-4 py-3 bg-white dark:bg-black border rounded-lg text-sm flex items-center justify-between cursor-pointer transition-all font-medium
                                    ${isCohortDropdownOpen ? 'ring-2 ring-brand-accent/20 border-brand-accent' : 'border-gray-200 dark:border-gray-700'}
                                `}
                                >
                                    <span className={uploadConfig.cohorts.length === 0 ? 'text-gray-400' : 'text-gray-900 dark:text-white'}>
                                        {uploadConfig.cohorts.length > 0
                                            ? `${uploadConfig.cohorts.length} Cohort(s) Selected`
                                            : 'Select a cohort'
                                        }
                                    </span>
                                    <span className={`material-symbols-outlined transition-transform duration-200 ${isCohortDropdownOpen ? 'rotate-180' : ''}`}>
                                        expand_more
                                    </span>
                                </div>

                                {isCohortDropdownOpen && (
                                    <div className="absolute z-50 mt-2 w-full md:w-[150%] left-0 md:-left-[25%] max-h-80 overflow-y-auto bg-white dark:bg-brand-card border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 p-3">
                                        {/* Search Input */}
                                        <div className="mb-2 px-1">
                                            <input
                                                type="text"
                                                placeholder="Search cohorts..."
                                                value={cohortSearch}
                                                onChange={(e) => setCohortSearch(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:border-brand-accent transition-all"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {cohorts
                                                .filter(c => c.name.toLowerCase().includes(cohortSearch.toLowerCase()))
                                                .length > 0 ? (
                                                cohorts
                                                    .filter(c => c.name.toLowerCase().includes(cohortSearch.toLowerCase()))
                                                    .map(c => (
                                                        <div
                                                            key={c.id}
                                                            onClick={() => {
                                                                const isSelected = uploadConfig.cohorts.includes(c.id);
                                                                setUploadConfig(prev => ({
                                                                    ...prev,
                                                                    cohorts: isSelected
                                                                        ? prev.cohorts.filter(id => id !== c.id)
                                                                        : [...prev.cohorts, c.id]
                                                                }));
                                                            }}
                                                            className={`flex items-center px-3 py-2.5 rounded-lg border transition-all cursor-pointer group
                                                         ${uploadConfig.cohorts.includes(c.id)
                                                                    ? 'border-brand-accent bg-brand-accent/10'
                                                                    : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'}
                                                     `}
                                                        >
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-all
                                                         ${uploadConfig.cohorts.includes(c.id)
                                                                    ? 'bg-brand-accent border-brand-accent shadow-sm shadow-brand-accent/20'
                                                                    : 'border-gray-300 dark:border-gray-600 group-hover:border-brand-accent'}
                                                     `}>
                                                                 {uploadConfig.cohorts.includes(c.id) && (
                                                                    <span className="material-symbols-outlined text-[14px] text-white font-bold">check</span>
                                                                )}
                                                            </div>
                                                            <span className={`text-sm ${uploadConfig.cohorts.includes(c.id) ? 'text-brand-accent font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                {c.name}
                                                            </span>
                                                        </div>
                                                    ))
                                            ) : (
                                                <div className="col-span-2 px-3 py-4 text-sm text-gray-500 text-center italic">No matching cohorts found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Selected Cohorts Chips */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {uploadConfig.cohorts.map(c => (
                                    <span key={c} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-accent/10 text-brand-accent border border-brand-accent/20 animate-in fade-in zoom-in duration-200">
                                        <span className="material-symbols-outlined text-[14px] mr-1.5 text-brand-accent">check_circle</span>
                                        {c}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setUploadConfig(prev => ({ ...prev, cohorts: prev.cohorts.filter(item => item !== c) }));
                                            }}
                                            className="ml-2 w-4 h-4 flex items-center justify-center rounded-full hover:bg-brand-accent/20 text-brand-accent/70 hover:text-brand-accent transition-colors focus:outline-none"
                                        >
                                            <span className="material-symbols-outlined text-[12px]">close</span>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Inputs Row 2: Categories & Description */}
                    <div className="grid grid-cols-1 gap-6 mt-6">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex justify-between">
                                <span>Select Categories</span>
                                {uploadConfig.categories.length > 0 && (
                                    <span className="text-brand-accent normal-case font-bold">{uploadConfig.categories.length} Selected</span>
                                )}
                            </label>
                            <div className="relative" ref={categoryRef}>
                                <div
                                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                    className={`w-full px-4 py-3 bg-white dark:bg-black border rounded-lg text-sm flex items-center justify-between cursor-pointer transition-all font-medium
                                    ${isCategoryDropdownOpen ? 'ring-2 ring-brand-accent/20 border-brand-accent' : 'border-gray-200 dark:border-gray-700'}
                                `}
                                >
                                    <span className={uploadConfig.categories.length === 0 ? 'text-gray-400' : 'text-gray-900 dark:text-white'}>
                                        {uploadConfig.categories.length > 0
                                            ? `${uploadConfig.categories.length} Category(s) Selected`
                                            : 'Select a category'
                                        }
                                    </span>
                                    <span className={`material-symbols-outlined transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}>
                                        expand_more
                                    </span>
                                </div>

                                {isCategoryDropdownOpen && (
                                    <div className="absolute z-50 mt-2 w-full max-h-80 overflow-y-auto bg-white dark:bg-brand-card border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 p-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {categories.length > 0 ? (
                                                categories.map(cat => (
                                                    <div
                                                        key={cat}
                                                        onClick={() => {
                                                            const isSelected = uploadConfig.categories.includes(cat);
                                                            setUploadConfig(prev => ({
                                                                ...prev,
                                                                categories: isSelected
                                                                    ? prev.categories.filter(c => c !== cat)
                                                                    : [...prev.categories, cat]
                                                                }));
                                                        }}
                                                        className={`flex items-center px-3 py-2.5 rounded-lg border transition-all cursor-pointer group
                                                         ${uploadConfig.categories.includes(cat)
                                                                ? 'border-brand-accent bg-brand-accent/10'
                                                                : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'}
                                                     `}
                                                    >
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-all
                                                         ${uploadConfig.categories.includes(cat)
                                                                ? 'bg-brand-accent border-brand-accent shadow-sm shadow-brand-accent/20'
                                                                : 'border-gray-300 dark:border-gray-600 group-hover:border-brand-accent'}
                                                     `}>
                                                            {uploadConfig.categories.includes(cat) && (
                                                                <span className="material-symbols-outlined text-[14px] text-white font-bold">check</span>
                                                            )}
                                                        </div>
                                                        <span className={`text-sm ${uploadConfig.categories.includes(cat) ? 'text-brand-accent font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                                                            {cat}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-2 px-3 py-4 text-sm text-gray-500 text-center italic">No categories available</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Selected Categories Chips */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {uploadConfig.categories.map(cat => (
                                    <span key={cat} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-white/10 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 animate-in fade-in zoom-in duration-200">
                                        <span className="material-symbols-outlined text-[14px] mr-1.5 text-indigo-500">label</span>
                                        {cat}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setUploadConfig(prev => ({ ...prev, categories: prev.categories.filter(item => item !== cat) }));
                                            }}
                                            className="ml-2 w-4 h-4 flex items-center justify-center rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800 text-indigo-400 hover:text-indigo-600 transition-colors focus:outline-none"
                                        >
                                            <span className="material-symbols-outlined text-[12px]">close</span>
                                        </button>
                                    </span>
                                ))}
                            </div>
                            {uploadConfig.categories.length === 0 && (
                                <p className="mt-2 text-xs font-medium text-red-400">Please select at least one category</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                Description / Metadata
                            </label>
                            <textarea
                                placeholder="Provide details for search and indexing..."
                                rows="3"
                                value={uploadConfig.description}
                                onChange={(e) => setUploadConfig({ ...uploadConfig, description: e.target.value })}
                                className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all resize-none font-medium"
                            ></textarea>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col md:flex-row items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 gap-4">
                        <div className="flex items-center gap-2 text-gray-400 text-xs px-3 py-1.5 bg-gray-50 dark:bg-white/5 rounded-full w-full md:w-auto justify-center">
                            <span className="material-symbols-outlined text-[14px]">lock</span>
                            <span>End-to-end encrypted transfer</span>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto justify-end">
                            <button
                                onClick={() => navigate('/content-uploading')}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white font-bold text-sm rounded-xl shadow-sm shadow-brand-accent/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                                        {uploadProgress}
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">upload</span>
                                        Upload Asset
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Upload History Section */}
                {history.length > 0 && (
                    <Card hoverEffect={false} gridBg={false} className="p-6 md:p-8 mt-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Recent Uploads for {uploadConfig.cohorts[0]}</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-800 text-xs text-gray-400 uppercase tracking-wider">
                                        <th className="pb-3 pl-2">Filename</th>
                                        <th className="pb-3 text-right pr-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {history.map((item, idx) => (
                                        <tr key={idx} className="border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="py-3 pl-2 font-medium text-gray-700 dark:text-gray-300">
                                                {item.filename || item.name}
                                            </td>
                                            <td className="py-3 text-right pr-2">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => window.open(`${CONTENT_API_BASE_URL}${CONTENT_ENDPOINTS.VIEW}?key=${encodeURIComponent(item.key)}`, '_blank')}
                                                        className="text-brand-accent hover:text-brand-accent-hover text-xs font-bold"
                                                    >
                                                        View
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Upload Overlay */}
                {uploading && (
                    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                        <ContentLoader />
                        <p className="mt-8 text-lg font-semibold text-gray-700 dark:text-gray-200 animate-pulse">
                            {uploadProgress}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CohortContent;
