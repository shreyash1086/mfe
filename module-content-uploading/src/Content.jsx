import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import { CONTENT_API_BASE_URL, CATEGORY_API_URL, CONTENT_ENDPOINTS } from './contentApi';
import ContentLoader from './ContentLoader';
import PageHeader from 'sharedDesignSystem/PageHeader';
import Card from 'sharedDesignSystem/Card';

function Content() {
    const { user, userRole, signOut } = useAuth(); // Add signOut for header logout if needed
    const { theme, toggleTheme } = useTheme(); // Use Theme
    const navigate = useNavigate();

    const isAdmin = userRole === 'admin';
    const isTrainer = userRole === 'trainer';
    const isAuthorized = isAdmin || isTrainer;
    const canSwitchCohorts = isAdmin;

    // State
    const [cohorts, setCohorts] = useState([]);
    const [selectedCohort, setSelectedCohort] = useState('');
    const [files, setFiles] = useState([]);
    const [filteredFiles, setFilteredFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All Resources');
    const [categories, setCategories] = useState(['All Resources']);
    const [sortOrder, setSortOrder] = useState('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Dropdown state for cohort selector
    const [isCohortDropdownOpen, setIsCohortDropdownOpen] = useState(false);
    const [cohortSearch, setCohortSearch] = useState('');

    // Category Management Modal State
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryLoading, setCategoryLoading] = useState(false);

    // Assignment Modal State
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignFileKey, setAssignFileKey] = useState(null);
    const [targetCohorts, setTargetCohorts] = useState([]);
    const [targetCategories, setTargetCategories] = useState([]);
    const [assigning, setAssigning] = useState(false);

    // Popup State
    const [popup, setPopup] = useState({
        isOpen: false,
        type: 'alert',
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

    // Helper: Infer Cohort for Candidate
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

    // Fetch Categories
    const fetchCategories = async () => {
        try {
            const response = await fetch(`${CATEGORY_API_URL}`);
            if (response.ok) {
                const data = await response.json();
                const cats = data.categories || [];
                setCategories(['All Resources', ...cats]);
            }
        } catch (e) {
            console.error("Failed to fetch categories", e);
        }
    };

    // 1. Fetch Cohorts & Initialize Session
    useEffect(() => {
        const init = async () => {
            fetchCategories();
            try {
                const cacheKey = `cached_cohorts_v2`;
                let cohortsData = [];
                const cached = sessionStorage.getItem(cacheKey);

                if (cached) {
                    cohortsData = JSON.parse(cached);
                } else {
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
                }
                setCohorts(cohortsData);

                if (canSwitchCohorts) {
                    setSelectedCohort('');
                } else if (isTrainer) {
                    const inferred = inferCohortFromUser(user?.username);
                    if (inferred) {
                        const matched = cohortsData.find(c => c.name.toLowerCase().includes(inferred.replace(/-/g, ' ').toLowerCase()));
                        setSelectedCohort(matched ? matched.id : inferred);
                    } else {
                        setSelectedCohort('unknown');
                    }
                } else {
                    const inferred = inferCohortFromUser(user?.username);
                    if (inferred) {
                        const matched = cohortsData.find(c => c.name.toLowerCase().includes(inferred.replace(/-/g, ' ').toLowerCase()));
                        setSelectedCohort(matched ? matched.id : inferred);
                    } else {
                        const prefixMatch = cohortsData.find(c => user?.username?.toLowerCase().startsWith(c.name.toLowerCase()));
                        if (prefixMatch) {
                            setSelectedCohort(prefixMatch.id);
                        } else {
                            setSelectedCohort('unknown');
                        }
                    }
                }
                setLoading(false);
            } catch (e) {
                console.error("Failed to load cohorts", e);
                setLoading(false);
            }
        };
        init();
    }, [user, userRole, canSwitchCohorts]);

    // 2. Fetch Content
    useEffect(() => {
        if (!canSwitchCohorts && !selectedCohort) return;
        if (canSwitchCohorts && cohorts.length === 0) return;

        const fetchContent = async () => {
            setLoading(true);
            try {
                let fetchedFiles = [];
                const timestamp = Date.now();

                if (selectedCohort) {
                    const response = await fetch(`${CONTENT_API_BASE_URL}${CONTENT_ENDPOINTS.LIST}?cohort=${encodeURIComponent(selectedCohort)}&_t=${timestamp}`, { cache: 'no-store' });
                    if (response.ok) {
                        const data = await response.json();
                        fetchedFiles = (data.all_files || []).map(f => ({ ...f, _cohort: selectedCohort }));
                    }
                } else if (canSwitchCohorts) {
                    const promises = cohorts.map(c =>
                        fetch(`${CONTENT_API_BASE_URL}${CONTENT_ENDPOINTS.LIST}?cohort=${encodeURIComponent(c.id)}&_t=${timestamp}`, { cache: 'no-store' })
                            .then(res => res.ok ? res.json() : { all_files: [] })
                            .then(data => (data.all_files || []).map(f => ({ ...f, _cohort: c.id })))
                            .catch(() => [])
                    );
                    const results = await Promise.all(promises);
                    fetchedFiles = results.flat();
                }

                const processed = fetchedFiles.map((f, index) => {
                    const fileName = f.filename || 'Unknown File';
                    const ext = fileName.split('.').pop().toLowerCase();
                    const category = (f.category || 'General').trim();
                    const fileKey = f.key;
                    const uniqueId = `${fileKey}-${f._cohort || 'c'}-${index}`;

                    return {
                        id: uniqueId,
                        name: fileName,
                        size: 0,
                        date: new Date(),
                        type: ext,
                        category: category,
                        description: (f.description || '').trim(),
                        module: f.module || '',
                        key: fileKey || f.id || uniqueId,
                        cohortId: f._cohort,
                        sortKey: f.SortKey || f.sort_key || f.SK || null
                    };
                });

                const groupedMap = new Map();
                processed.forEach(f => {
                    const groupKey = f.key || f.id;
                    if (groupedMap.has(groupKey)) {
                        const existing = groupedMap.get(groupKey);
                        if (f.cohortId && !existing.cohorts.includes(f.cohortId)) existing.cohorts.push(f.cohortId);
                        if (f.category && !existing.categories.includes(f.category)) existing.categories.push(f.category);
                        existing.assignments.push({ cohortId: f.cohortId, category: f.category, sortKey: f.sortKey });
                    } else {
                        groupedMap.set(groupKey, {
                            ...f,
                            cohorts: f.cohortId ? [f.cohortId] : [],
                            categories: f.category ? [f.category] : [],
                            assignments: [{ cohortId: f.cohortId, category: f.category, sortKey: f.sortKey }]
                        });
                    }
                });

                const finalized = Array.from(groupedMap.values());
                setFiles(finalized);
                setFilteredFiles(finalized);
            } catch (e) {
                console.error("Failed to fetch content:", e);
                setFiles([]);
                setFilteredFiles([]);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [selectedCohort, cohorts, canSwitchCohorts, isTrainer, refreshTrigger]);

    // 3. Filter and Sort
    useEffect(() => {
        if (!files) return;
        let result = files;

        // Filter by Category
        if (activeFilter !== 'All Resources') {
            result = result.filter(f => {
                const cats = f.categories || [f.category];
                return cats.some(c => c.toLowerCase() === activeFilter.toLowerCase());
            });
        }

        // Filter by Search Query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(f =>
                (f.name && f.name.toLowerCase().includes(query)) ||
                (f.description && f.description.toLowerCase().includes(query)) ||
                (f.category && f.category.toLowerCase().includes(query))
            );
        }

        // Sort
        result = [...result].sort((a, b) => {
            const dateA = a.date.getTime();
            const dateB = b.date.getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        setFilteredFiles(result);
    }, [activeFilter, files, sortOrder, searchQuery]);

    const handleView = async (key) => {
        try {
            const response = await fetch(`${CONTENT_API_BASE_URL}${CONTENT_ENDPOINTS.VIEW}?key=${encodeURIComponent(key)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.view_url) window.open(data.view_url, '_blank');
                else showAlert("Download Failed", 'Failed to get download link.');
            } else showAlert("Download Failed", 'Failed to get download link.');
        } catch (e) {
            console.error("View error", e);
            showAlert("Error", 'Error opening file.');
        }
    };

    const handleDeleteContent = (key, fileCohorts) => {
        if (!key) return;
        const confirmMsg = "Are you sure you want to PERMANENTLY delete this file and remove all its assignments? This cannot be undone.";
        showConfirm("Delete File", confirmMsg, () => performDeleteContent(key, fileCohorts));
    };

    const performDeleteContent = async (key, fileCohorts) => {
        try {
            const file = files.find(f => f.key === key);
            const activeCohorts = fileCohorts || (file ? file.cohorts : []);
            if (activeCohorts.length > 0) {
                await Promise.all(activeCohorts.map(cohortId =>
                    fetch(`${CONTENT_API_BASE_URL}${CONTENT_ENDPOINTS.DELETE}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ s3_key: String(key), cohort: String(cohortId) })
                    }).catch(err => console.error(`Wipe failed for cohort ${cohortId}`, err))
                ));
            }
            const response = await fetch(`${CONTENT_API_BASE_URL}${CONTENT_ENDPOINTS.DELETE}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ s3_key: String(key), hard_delete: true })
            });
            if (response.ok) {
                setFiles(prev => prev.filter(f => f.key !== key));
                setFilteredFiles(prev => prev.filter(f => f.key !== key));
                showAlert("Success", 'File and all assignments deleted successfully.');
                setRefreshTrigger(prev => prev + 1);
            } else {
                const data = await response.json();
                if (data.message && data.message.toLowerCase().includes('deleted')) {
                    setFiles(prev => prev.filter(f => f.key !== key));
                    setFilteredFiles(prev => prev.filter(f => f.key !== key));
                }
                showAlert("Delete Status", data.message || 'File deleted.');
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (e) {
            console.error("Delete error", e);
            showAlert("Error", 'Error deleting content.');
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) {
            showAlert("Input Required", 'Please enter a category name.');
            return;
        }
        setCategoryLoading(true);
        try {
            const response = await fetch(`${CATEGORY_API_URL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', category: newCategoryName.trim() })
            });
            const data = await response.json();
            if (response.ok) {
                showAlert("Success", data.message || 'Category added successfully');
                setNewCategoryName('');
                await fetchCategories();
            } else showAlert("Error", data.error || 'Failed to add category');
        } catch (e) {
            console.error("Add category error", e);
            showAlert("Error", 'Failed to add category');
        } finally {
            setCategoryLoading(false);
        }
    };

    const handleDeleteCategory = (categoryName) => {
        if (categoryName === 'All Resources' || categoryName === 'General') {
            showAlert("Action Denied", 'Cannot delete this category');
            return;
        }
        showConfirm("Delete Category", `Are you sure you want to delete "${categoryName}"?`, () => performDeleteCategory(categoryName));
    };

    const performDeleteCategory = async (categoryName) => {
        setCategoryLoading(true);
        try {
            const response = await fetch(`${CATEGORY_API_URL}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', category: categoryName })
            });
            const data = await response.json();
            if (response.ok) {
                showAlert("Success", data.message || 'Category deleted successfully');
                await fetchCategories();
                if (activeFilter === categoryName) setActiveFilter('All Resources');
            } else showAlert("Error", data.error || 'Failed to delete category');
        } catch (e) {
            console.error("Delete category error", e);
            showAlert("Error", 'Failed to delete category');
        } finally {
            setCategoryLoading(false);
        }
    };

    const openAssignModal = (key) => {
        setAssignFileKey(key);
        const file = files.find(f => f.key === key);
        if (file) {
            let assignedIds = cohorts.filter(c => file.cohorts.includes(c.id)).map(c => c.id);
            if (!canSwitchCohorts && selectedCohort) assignedIds = [selectedCohort];
            setTargetCohorts(assignedIds);
            if (file.categories && file.categories.length > 0) setTargetCategories([...file.categories]);
            else if (file.category) setTargetCategories([file.category]);
            else setTargetCategories([]);
        } else {
            setTargetCohorts([]);
            setTargetCategories([]);
        }
        setAssignModalOpen(true);
    };

    const handleAssignSubmit = async () => {
        if (targetCohorts.length === 0) {
            showAlert("Selection Missing", "Please select at least one cohort.");
            return;
        }
        if (targetCategories.length === 0) {
            showAlert("Selection Missing", "Please select at least one category.");
            return;
        }
        setAssigning(true);
        try {
            const file = files.find(f => f.key === assignFileKey);
            if (!file) throw new Error("File not found");
            const currentCohorts = file.cohorts || [];
            const cohortsToWipe = [...new Set([...targetCohorts, ...currentCohorts])];
            for (const cohortId of cohortsToWipe) {
                const canManageCohort = canSwitchCohorts || cohortId === selectedCohort;
                if (canManageCohort) {
                    await fetch(`${CONTENT_API_BASE_URL}${CONTENT_ENDPOINTS.DELETE}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ s3_key: String(assignFileKey), cohort: String(cohortId) })
                    }).catch(err => console.error(`Sync cleanup failed for ${cohortId}`, err));
                }
            }
            for (const category of targetCategories) {
                const response = await fetch(`${CONTENT_API_BASE_URL}${CONTENT_ENDPOINTS.ASSIGN}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: assignFileKey, cohorts: targetCohorts, category: category.trim(), description: file.description || '' })
                });
                if (!response.ok) {
                    const res = await response.json();
                    throw new Error(res.error || 'Assignment update failed');
                }
            }
            showAlert("Success", `Successfully synchronized assignments!`);
            setAssignModalOpen(false);
            setAssignFileKey(null);
            setRefreshTrigger(prev => prev + 1);
        } catch (e) {
            console.error("Assign sync error", e);
            showAlert("Sync Failed", 'Failed to synchronize assignments: ' + e.message);
        } finally {
            setAssigning(false);
        }
    };

    const toggleTargetCohort = (cohortId) => setTargetCohorts(prev => prev.includes(cohortId) ? prev.filter(c => c !== cohortId) : [...prev, cohortId]);
    const toggleTargetCategory = (categoryName) => setTargetCategories(prev => prev.includes(categoryName) ? prev.filter(c => c !== categoryName) : [...prev, categoryName]);

    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return 'N/A';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
    };

    const getTimeAgo = (date) => {
        if (!date) return '';
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return "Just now";
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return "Just now";
    };

    const getIcon = (type) => {
        if (['pdf'].includes(type)) return { icon: 'picture_as_pdf', bg: 'bg-brand-accent/15 text-brand-accent', label: 'PDF' };
        if (['ipynb', 'js', 'html', 'css', 'py'].includes(type)) return { icon: 'code', bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400', label: 'CODE' };
        if (['mp4', 'mov'].includes(type)) return { icon: 'movie', bg: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400', label: 'VIDEO' };
        if (['zip', 'rar'].includes(type)) return { icon: 'folder_zip', bg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400', label: 'ARCHIVE' };
        if (['doc', 'docx'].includes(type)) return { icon: 'description', bg: 'bg-brand-accent/10 text-brand-accent', label: 'DOC' };
        return { icon: 'draft', bg: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', label: 'FILE' };
    };

    const username = user?.username || "User";
    const userInitial = username.charAt(0).toUpperCase();

    return (
        <div className="w-full p-2 md:p-3 pt-0 md:pt-0 font-['Poppins',sans-serif] bg-gray-50 dark:bg-brand-dark min-h-screen transition-colors duration-300">
            <PageHeader 
              title="Content Bank" 
              actions={
                <div className="flex items-center gap-4">
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
                </div>
              }
            />

            {/* Content Container Card - White Background wrapping filters and list */}
            <div className="bg-transparent dark:bg-transparent rounded-3xl mt-6">

                {/* 1. Tabs (Pill Style) */}
                <div className="flex flex-wrap gap-2 mb-8 bg-gray-200/50 dark:bg-white/5 p-1.5 rounded-full w-fit">
                    {categories.map(filter => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${activeFilter === filter
                                ? 'bg-brand-accent text-black font-bold shadow-md shadow-brand-accent/25'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                {/* 2. Filter & Action Bar */}
                {(canSwitchCohorts || isAuthorized) && (
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-8 bg-white dark:bg-brand-card p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-4 w-full lg:w-auto">
                            {/* Cohort Selector (Admin/Trainer) */}
                            {canSwitchCohorts && (
                                <div className="relative group w-full lg:w-auto">
                                    <div
                                        onClick={() => setIsCohortDropdownOpen(!isCohortDropdownOpen)}
                                        className="px-4 py-2.5 bg-gray-50 dark:bg-black/40 border border-transparent hover:border-brand-accent/30 dark:hover:border-brand-accent/20 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 cursor-pointer min-w-[200px] flex items-center justify-between transition-all"
                                    >
                                        <span className="truncate">
                                            {selectedCohort ? (cohorts.find(c => c.id === selectedCohort)?.name || selectedCohort) : 'All Cohorts'}
                                        </span>
                                        <span className={`material-symbols-outlined text-[20px] text-gray-400 transition-transform duration-200 ${isCohortDropdownOpen ? 'rotate-180' : ''}`}>
                                            expand_more
                                        </span>
                                    </div>
                                    {isCohortDropdownOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-[280px] z-50 bg-white dark:bg-brand-card border border-gray-100 dark:border-white/10 rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
                                            <input
                                                type="text"
                                                placeholder="Search cohorts..."
                                                value={cohortSearch}
                                                onChange={(e) => setCohortSearch(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                autoFocus
                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-lg text-sm outline-none mb-2 text-gray-700 dark:text-white"
                                            />
                                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                <div
                                                    onClick={() => { setLoading(true); setSelectedCohort(''); setIsCohortDropdownOpen(false); }}
                                                    className={`px-3 py-2 rounded-lg text-sm cursor-pointer ${selectedCohort === '' ? 'bg-brand-accent/15 text-brand-accent font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                                >All Cohorts</div>
                                                {cohorts.filter(c => c.name.toLowerCase().includes(cohortSearch.toLowerCase())).map(c => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => { setLoading(true); setSelectedCohort(c.id); setIsCohortDropdownOpen(false); }}
                                                        className={`px-3 py-2 rounded-lg text-sm cursor-pointer truncate ${selectedCohort === c.id ? 'bg-brand-accent/15 text-brand-accent font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                                    >
                                                        {c.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            {isAuthorized && (
                                <>
                                    <button
                                        onClick={() => setCategoryModalOpen(true)}
                                        className="flex-1 lg:flex-none px-5 py-2.5 border border-brand-accent/20 dark:border-brand-accent/30 text-brand-accent text-sm font-bold rounded-xl hover:bg-brand-accent/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">label</span>
                                        Manage Categories
                                    </button>
                                    <Link
                                        to={selectedCohort ? `/content-uploading/cohort-content/${encodeURIComponent(selectedCohort)}` : '/content-uploading/cohort-content'}
                                        className="flex-1 lg:flex-none px-6 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-black text-sm font-bold rounded-xl shadow-lg shadow-brand-accent/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                                        Upload Content
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. List Headers */}
                <div className="hidden md:grid grid-cols-12 gap-6 px-8 mb-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    <div className="col-span-1"></div>
                    <div className="col-span-3">File Name</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-2">Cohorts</div>
                    <div className="col-span-2">Description</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                {/* 4. List Items (Floating Cards) */}
                <div className="space-y-3 pb-20">
                    {loading ? (
                        <div className="min-h-[200px]"></div>
                    ) : filteredFiles.length > 0 ? (
                        filteredFiles.map((file) => {
                            const iconData = getIcon(file.type);
                            return (
                                <div
                                    key={file.id}
                                    className="group bg-white dark:bg-brand-card rounded-3xl p-4 md:px-6 md:py-5 border border-transparent dark:border-white/5 hover:border-brand-accent/20 dark:hover:border-brand-accent/30 hover:shadow-xl hover:shadow-brand-accent/5 transition-all duration-300 flex flex-col md:grid md:grid-cols-12 gap-4 items-center"
                                >
                                    {/* Icon */}
                                    <div className="col-span-1 flex justify-center md:justify-start">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconData.bg}`}>
                                            <span className="material-symbols-outlined text-[24px]">{iconData.icon}</span>
                                        </div>
                                    </div>

                                    {/* Name Only */}
                                    <div className="col-span-3 min-w-0 w-full text-center md:text-left flex items-center">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                            {file.name}
                                        </h3>
                                    </div>

                                    {/* Category & Badges */}
                                    <div className="col-span-2 flex justify-center md:justify-start gap-2">
                                        {file.categories && file.categories.length > 0 ? (
                                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                {file.categories[0]}
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg text-[10px] font-bold uppercase">General</span>
                                        )}
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-brand-accent/10 text-brand-accent`}>
                                            {iconData.label}
                                        </span>
                                    </div>

                                    {/* Assigned Cohorts */}
                                    <div className="col-span-2 flex flex-wrap gap-1 justify-center md:justify-start">
                                        {file.cohorts && file.cohorts.length > 0 ? (
                                            file.cohorts.map(cid => {
                                                const cName = cohorts.find(c => c.id === cid)?.name || cid;
                                                return (
                                                    <span key={cid} className="px-2 py-0.5 bg-indigo-50 dark:bg-white/5 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-bold">
                                                        {cName}
                                                    </span>
                                                );
                                            })
                                        ) : (
                                            <span className="text-[10px] text-gray-400 italic">Not Assigned</span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div className="col-span-2 w-full md:w-auto text-sm text-gray-500 dark:text-gray-400 font-medium line-clamp-2 text-center md:text-left">
                                        {file.description || <span className="italic opacity-50">No description</span>}
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-2 w-full flex justify-center md:justify-end gap-2 opacity-100 transition-opacity">
                                        <button onClick={() => handleView(file.key)} className="p-2 rounded-lg text-brand-accent hover:bg-brand-accent/10 transition-colors" title="View">
                                            <span className="material-symbols-outlined text-[20px]">remove_red_eye</span>
                                        </button>
                                        <button onClick={() => handleView(file.key)} className="p-2 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors" title="Download">
                                            <span className="material-symbols-outlined text-[20px]">download</span>
                                        </button>

                                        {isAuthorized && (
                                            <>
                                                <button onClick={() => openAssignModal(file.key)} className="p-2 rounded-lg text-gray-400 hover:text-brand-accent hover:bg-brand-accent/10 transition-colors" title="Edit/Assign">
                                                    <span className="material-symbols-outlined text-[20px]">add</span>
                                                </button>
                                                <button onClick={() => handleDeleteContent(file.key, file.cohorts)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-20">
                            <p className="text-gray-400 font-medium">No contents found</p>
                        </div>
                    )}
                </div>

                {/* Load More */}
                {filteredFiles.length > 5 && (
                    <div className="flex justify-center mt-12 mb-12">
                        <button className="flex items-center gap-2 px-8 py-3 bg-white dark:bg-brand-card border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm">
                            Load More
                        </button>
                    </div>
                )}
            </div>

            {/* Category Management Modal */}
            {categoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-brand-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100 dark:border-blue-500/20">
                        {categoryLoading ? (
                            <div className="p-8 flex items-center justify-center min-h-[300px]">
                                <ContentLoader />
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="px-8 py-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Manage Categories</h3>
                                    <button
                                        onClick={() => setCategoryModalOpen(false)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[24px]">close</span>
                                    </button>
                                </div>

                                <div className="p-8">
                                    {/* Add New Category Section */}
                                    <div className="mb-8">
                                        <label className="block text-xs font-bold text-brand-accent uppercase tracking-wider mb-3">
                                            ADD NEW CATEGORY
                                        </label>
                                        <div className="flex gap-4">
                                            <input
                                                type="text"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                placeholder="Category Name"
                                                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-white/5 border border-transparent dark:focus:border-brand-accent/50 rounded-xl text-sm focus:ring-0 text-gray-700 dark:text-white placeholder-gray-400 font-medium transition-all"
                                            />
                                            <button
                                                onClick={handleAddCategory}
                                                disabled={categoryLoading}
                                                className="px-6 bg-brand-accent hover:bg-brand-accent-hover text-black text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>

                                    {/* Existing Categories List */}
                                    <div>
                                        <div className="flex justify-between items-end mb-4">
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                EXISTING CATEGORIES
                                            </label>
                                            <span className="text-xs font-bold text-gray-400">
                                                Total: {categories.filter(c => c !== 'All Resources').length}
                                            </span>
                                        </div>

                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {categories
                                                .filter(c => c && c !== 'All Resources')
                                                .map(category => {
                                                    return (
                                                        <div key={category} className="group flex items-center justify-between p-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-transparent dark:border-brand-accent/10 hover:border-brand-accent/30 dark:hover:border-brand-accent/30 transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <div className="px-3 py-1 bg-brand-accent/10 text-brand-accent rounded-lg text-sm font-bold">
                                                                    {category}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {category !== 'General' && (
                                                                    <button
                                                                        onClick={() => handleDeleteCategory(category)}
                                                                        disabled={categoryLoading}
                                                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                        title="Delete Category"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                    </button>
                                                                )}

                                                                <button
                                                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                                    title="View Files"
                                                                    onClick={() => {
                                                                        setActiveFilter(category);
                                                                        setCategoryModalOpen(false);
                                                                    }}
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-8 py-6 bg-gray-50/50 dark:bg-black/20 flex justify-end gap-4 border-t border-gray-100 dark:border-white/5">
                                    <button
                                        onClick={() => setCategoryModalOpen(false)}
                                        className="px-6 py-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-bold text-sm transition-colors"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => setCategoryModalOpen(false)}
                                        className="px-8 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-black text-sm font-bold rounded-xl shadow-lg shadow-brand-accent/20 transition-all"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {assignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-brand-card rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100 dark:border-blue-500/20">
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Assign Content</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Manage which cohorts can access this resource</p>
                            </div>
                            <button onClick={() => setAssignModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="p-6">
                            {canSwitchCohorts && (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 italic">
                                            Select cohorts to assign this content to:
                                        </p>
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-1.5 grayscale opacity-60">
                                                <div className="w-3 h-3 rounded-full bg-brand-accent"></div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Already Assigned</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {cohorts.map(cohort => {
                                            const file = files.find(f => f.key === assignFileKey);
                                            const isInitiallyAssigned = file && file.cohorts && file.cohorts.includes(cohort.name);

                                            return (
                                                <label
                                                    key={cohort.id}
                                                    className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer group
                                                        ${targetCohorts.includes(cohort.id)
                                                            ? 'border-brand-accent bg-brand-accent/5 dark:bg-brand-accent/10 shadow-sm'
                                                            : 'border-gray-100 dark:border-white/5 hover:border-brand-accent/30 dark:hover:border-brand-accent/25 hover:bg-white dark:hover:bg-white/2'}
                                                        ${isInitiallyAssigned ? 'ring-1 ring-brand-accent/30 ring-offset-2 dark:ring-offset-brand-card' : ''}
                                                    `}
                                                >
                                                    <div className="relative flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={targetCohorts.includes(cohort.id)}
                                                            onChange={() => toggleTargetCohort(cohort.id)}
                                                            className="peer appearance-none w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 checked:bg-brand-accent checked:border-brand-accent transition-all cursor-pointer"
                                                        />
                                                        <span className="material-symbols-outlined text-white text-[16px] absolute opacity-0 peer-checked:opacity-100 transition-all scale-75 peer-checked:scale-100 duration-200 pointer-events-none">check</span>
                                                    </div>
                                                    <span className={`text-sm ${targetCohorts.includes(cohort.id) ? 'text-brand-accent font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {cohort.name}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    <hr className="my-6 border-gray-100 dark:border-white/5" />
                                </>
                            )}

                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 italic">
                                    Select categories to assign this content to:
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                {categories.filter(c => c !== 'All Resources').map(category => (
                                    <label
                                        key={category}
                                        className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer group
                                            ${targetCategories.includes(category)
                                                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/10 shadow-sm'
                                                : 'border-gray-100 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-white dark:hover:bg-white/2'}
                                        `}
                                    >
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={targetCategories.includes(category)}
                                                onChange={() => toggleTargetCategory(category)}
                                                className="peer appearance-none w-5 h-5 rounded-md border-2 border-gray-300 dark:border-gray-600 checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer"
                                            />
                                            <span className="material-symbols-outlined text-white text-[16px] absolute opacity-0 peer-checked:opacity-100 transition-all scale-75 peer-checked:scale-100 duration-200 pointer-events-none">check</span>
                                        </div>
                                        <span className={`text-sm ${targetCategories.includes(category) ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {category}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-black/20 flex justify-end gap-3">
                            <button
                                onClick={() => setAssignModalOpen(false)}
                                className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignSubmit}
                                className="px-6 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-black text-sm font-bold rounded-xl shadow-lg shadow-brand-accent/20 transition-all flex items-center gap-2"
                            >
                                {assigning ? 'Assigning...' : 'Confirm Assignment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Popup Modal */}
            {popup.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-brand-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-white/10">
                        <div className="p-6 text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${popup.type === 'confirm' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-brand-accent/15 text-brand-accent'}`}>
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
                                    className={`px-6 py-2.5 rounded-xl text-white font-medium shadow-lg transition-transform active:scale-95 ${popup.type === 'confirm' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' : 'bg-brand-accent hover:bg-brand-accent-hover text-black shadow-brand-accent/25'}`}
                                >
                                    {popup.type === 'confirm' ? 'Confirm' : 'Okay'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Loading Overlay - Portaled to Body to escape Layout Transforms */}
            {loading && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-in fade-in duration-300 pointer-events-none ml-64">
                    <ContentLoader />
                </div>,
                document.body
            )}

        </div>
    );
}

export default Content;
