import React, { useState, useEffect, useMemo } from 'react';
import { uploadWithProgress } from '../utils/uploadHelper';
import { useNavigate, useLocation } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import CustomDatePicker from '../components/CustomDatePicker';
import CustomTimePicker from '../components/CustomTimePicker';
import MultiSelect from '../components/MultiSelect';
import { ASSESSMENT_API_BASE_URL } from '../api';
import { useTheme } from '../ThemeContext';
import { createPortal } from 'react-dom';
import AssessmentLoader from '../components/AssessmentLoader';

function CreateAssessment() {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    // Use useMemo to preserve editId across re-renders
    const editId = useMemo(() => {
        const queryParams = new URLSearchParams(location.search);
        return queryParams.get('edit');
    }, [location.search]);

    const isEditMode = !!editId;

    // console.log(`[CreateAssessment ${new Date().toISOString()}] Component mounted`);
    // console.log(`[CreateAssessment ${new Date().toISOString()}] location.search:`, location.search);
    // console.log(`[CreateAssessment ${new Date().toISOString()}] editId from query:`, editId);
    // console.log(`[CreateAssessment ${new Date().toISOString()}] isEditMode:`, isEditMode);

    const [formData, setFormData] = useState({
        name: '',
        sqlDatabase: [],
        mcqDataset: [],
        sqlDuration: 60,
        mcqDuration: 30,
        sqlQuestionCount: 5,
        mcqQuestionCount: 10,
        sqlRandomize: false,
        mcqRandomize: false,
        startTime: '',
        endTime: '',
        selectedCohorts: [],
        selectedUsers: [], // Changed from selectedUser (string) to selectedUsers (array)
        selectedSqlQuestionIds: [], // Array of question IDs
        selectedMcqQuestionIds: [], // Array of question IDs
        sqlStratifiedCounts: { Easy: 0, Medium: 0, Hard: 0 },
        mcqStratifiedCounts: { Easy: 0, Medium: 0, Hard: 0 },
        isProctoringEnabled: true, // Default to enabled
        showScore: true, // Default to enabled

        // File Upload State
        includeFileUpload: false,
        fileUploadInstructions: '',
        fileUploadResourceUrl: '',
        fileUploadDuration: 60,
        fileUploadPoints: 100,

        // Kode Env State
        includeKodeEnv: false,
        kodeEnvRepoUrl: '',
        kodeEnvDuration: 60,
        kodeEnvQuestionCount: 5,
        kodeEnvRandomize: false,
        kodeEnvSelectedQuestions: [],
        kodeEnvStratifiedCounts: { Easy: 0, Medium: 0, Hard: 0 },
        kodeEnvRandomizeType: 'candidate'
    });

    const [fetchedGitQuestions, setFetchedGitQuestions] = useState([]);
    const [isFetchingGit, setIsFetchingGit] = useState(false);
    const [gitRepoError, setGitRepoError] = useState('');

    const handleFetchGitRepo = async () => {
        if (!formData.kodeEnvRepoUrl) {
            setGitRepoError('Please enter a GitHub repository URL.');
            return;
        }

        setIsFetchingGit(true);
        setGitRepoError('');
        try {
            const response = await fetch(`${ASSESSMENT_API_BASE_URL}/assessments/fetch-git-repo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl: formData.kodeEnvRepoUrl })
            });

            if (!response.ok) {
                let msg = 'Failed to fetch repository contents.';
                try {
                    const err = await response.json();
                    msg = err.message || msg;
                } catch (jsonErr) {
                    msg = `Server returned status ${response.status}`;
                }
                throw new Error(msg);
            }

            let data;
            try {
                data = await response.json();
            } catch (jsonErr) {
                throw new Error('Failed to parse repository response.');
            }
            setFetchedGitQuestions(data.questions || []);
            // Select all questions by default
            updateFormData('kodeEnvSelectedQuestions', data.questions || []);
        } catch (error) {
            console.error(error);
            setGitRepoError(error.message || 'Failed to fetch repository.');
        } finally {
            setIsFetchingGit(false);
        }
    };

    // Popup State
    const [popup, setPopup] = useState({
        isOpen: false,
        type: 'alert', // 'alert' | 'confirm'
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null
    });

    // Loading state for edit mode
    const [isLoading, setIsLoading] = useState(isEditMode);

    // File Upload Progress State
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

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

    // Ordered Assessment Rounds
    const [selectedRounds, setSelectedRounds] = useState([]);
    const includeSql = useMemo(() => selectedRounds.includes('SQL'), [selectedRounds]);
    const includeMcq = useMemo(() => selectedRounds.includes('MCQ'), [selectedRounds]);
    const includeFileUpload = useMemo(() => selectedRounds.includes('FILE_UPLOAD'), [selectedRounds]);
    const includeKodeEnv = useMemo(() => selectedRounds.includes('KODE_ENV'), [selectedRounds]);

    const moveRound = (index, direction) => {
        const newRounds = [...selectedRounds];
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= newRounds.length) return;
        [newRounds[index], newRounds[newIndex]] = [newRounds[newIndex], newRounds[index]];
        setSelectedRounds(newRounds);
    };

    const breadcrumbItems = [
        { label: 'Assessment', path: '/assessment/assessments-list' },
        { label: isEditMode ? 'Edit Assessment' : 'Create Assessment' }
    ];

    // State for options
    const [databases, setDatabases] = useState([]);
    const [datasets, setDatasets] = useState([]);
    const [cohorts, setCohorts] = useState([]);
    const [users, setUsers] = useState([]);

    // SQL Questions Selection
    const [availableSqlQuestions, setAvailableSqlQuestions] = useState([]);
    const [loadingSqlQuestions, setLoadingSqlQuestions] = useState(false);
    const [sqlDifficultyFilter, setSqlDifficultyFilter] = useState([]); // Array of selected difficulties

    // MCQ Questions Selection
    const [availableMcqQuestions, setAvailableMcqQuestions] = useState([]);
    const [loadingMcqQuestions, setLoadingMcqQuestions] = useState(false);
    const [mcqDifficultyFilter, setMcqDifficultyFilter] = useState([]); // Array of selected difficulties

    useEffect(() => {
        const fetchData = async () => {
            try {

                // Fetch all resources in parallel for better performance
                const [dbRes, dsRes, cohortsData, usersData] = await Promise.all([
                    fetch(`${ASSESSMENT_API_BASE_URL}/challenges/databases?t=${Date.now()}`),
                    fetch(`${ASSESSMENT_API_BASE_URL}/challenges/datasets?t=${Date.now()}`),
                    // Cohorts - check cache first
                    (async () => {
                        const cachedCohorts = sessionStorage.getItem('cached_cohorts');
                        if (cachedCohorts) {
                            try {
                                const parsed = JSON.parse(cachedCohorts);
                                return { cached: true, data: parsed.map(c => c.name || c) };
                            } catch (e) {
                                console.error(e);
                                return { cached: false };
                            }
                        }
                        const res = await fetch('https://x6uz5z6ju2.execute-api.us-west-2.amazonaws.com/SQLAdmin?type=cohorts');
                        if (res.ok) {
                            const data = await res.json();
                            return { cached: false, data: data.cohorts || [] };
                        }
                        return { cached: false, data: [] };
                    })(),
                    // Users - check cache first
                    (async () => {
                        const cachedUsers = sessionStorage.getItem('cached_users');
                        if (cachedUsers) {
                            return { cached: true, data: JSON.parse(cachedUsers) };
                        }
                        const res = await fetch('https://x6uz5z6ju2.execute-api.us-west-2.amazonaws.com/SQLAdmin?type=users');
                        if (res.ok) {
                            const data = await res.json();
                            return { cached: false, data: data.users || [] };
                        }
                        return { cached: false, data: [] };
                    })()
                ]);

                // Process databases
                if (dbRes.ok) {
                    const dbData = await dbRes.json();
                    setDatabases(dbData);
                }

                // Process datasets
                if (dsRes.ok) {
                    const dsData = await dsRes.json();
                    setDatasets(dsData);
                }

                // Process cohorts
                setCohorts(cohortsData.data);

                // Process users
                setUsers(usersData.data);

                // If Edit Mode, fetch assessment details
                if (editId) {
                    // console.log(`[CreateAssessment ${new Date().toISOString()}] Edit mode detected, editId:`, editId);
                    // console.log(`[CreateAssessment ${new Date().toISOString()}] Fetching from:`, `${ASSESSMENT_API_BASE_URL}/assessments/${editId}`);

                    try {
                        const res = await fetch(`${ASSESSMENT_API_BASE_URL}/assessments/${editId}`);
                        // console.log(`[CreateAssessment ${new Date().toISOString()}] Response status:`, res.status, res.ok);

                        if (res.ok) {
                            const data = await res.json();
                            // console.log(`[CreateAssessment ${new Date().toISOString()}] Loaded assessment data:`, data);

                            // Parse rounds
                            const sqlRounds = data.rounds.filter(r => r.type === 'SQL');
                            const mcqRounds = data.rounds.filter(r => r.type === 'MCQ');
                            const fileUploadRounds = data.rounds.filter(r => r.type === 'FILE_UPLOAD');

                            const sqlRound = sqlRounds[0]; // For shared config (duration etc)
                            const mcqRound = mcqRounds[0]; // For shared config
                            const fileUploadRound = fileUploadRounds[0];

                            let fileUploadMeta = {};
                            try {
                                fileUploadMeta = fileUploadRound && fileUploadRound.metadata ? (typeof fileUploadRound.metadata === 'string' ? JSON.parse(fileUploadRound.metadata) : fileUploadRound.metadata) : {};
                            } catch (e) { console.error("Error parsing file upload meta", e); }

                            const kodeEnvRounds = data.rounds.filter(r => r.type === 'KODE_ENV');
                            const kodeEnvRound = kodeEnvRounds[0];

                            let kodeEnvRoundMeta = {};
                            try {
                                kodeEnvRoundMeta = kodeEnvRound && kodeEnvRound.metadata ? (typeof kodeEnvRound.metadata === 'string' ? JSON.parse(kodeEnvRound.metadata) : kodeEnvRound.metadata) : {};
                            } catch (e) { console.error("Error parsing kode env meta", e); }

                            let sqlRoundMeta = {};
                            try {
                                sqlRoundMeta = sqlRound && sqlRound.metadata ? (typeof sqlRound.metadata === 'string' ? JSON.parse(sqlRound.metadata) : sqlRound.metadata) : {};
                            } catch (e) { console.error("Error parsing sql meta", e); }

                            let mcqRoundMeta = {};
                            try {
                                mcqRoundMeta = mcqRound && mcqRound.metadata ? (typeof mcqRound.metadata === 'string' ? JSON.parse(mcqRound.metadata) : mcqRound.metadata) : {};
                            } catch (e) { console.error("Error parsing mcq meta", e); }

                            let assessmentName = data.name;
                            let isKodeEnvMode = false;
                            let showScoreMode = true;
                            if (assessmentName && assessmentName.includes('[KodeEnv]')) {
                                isKodeEnvMode = true;
                                assessmentName = assessmentName.replace(' [KodeEnv]', '').replace('[KodeEnv]', '').trim();
                            }
                            if (assessmentName && assessmentName.includes('[HideScore]')) {
                                showScoreMode = false;
                                assessmentName = assessmentName.replace(' [HideScore]', '').replace('[HideScore]', '').trim();
                            }

                            setFormData({
                                isProctoringEnabled: data.proctoring_enabled !== undefined ? !!data.proctoring_enabled : true,
                                showScore: showScoreMode,
                                name: assessmentName,
                                selectedCohorts: (() => {
                                    try {
                                        const parsed = JSON.parse(data.assigned_cohort);
                                        return Array.isArray(parsed) ? parsed : (data.assigned_cohort ? [data.assigned_cohort] : []);
                                    } catch (e) {
                                        return data.assigned_cohort ? [data.assigned_cohort] : [];
                                    }
                                })(),
                                // Handle both old (selectedUser) and new (selectedUsers) format
                                selectedUsers: (() => {
                                    if (data.assigned_user) {
                                        try {
                                            // Try parsing as JSON array first
                                            const parsed = JSON.parse(data.assigned_user);
                                            return Array.isArray(parsed) ? parsed : [data.assigned_user];
                                        } catch {
                                            // If not JSON, treat as single user string
                                            return [data.assigned_user];
                                        }
                                    }
                                    return [];
                                })(),
                                startTime: data.start_time ? new Date(data.start_time).toISOString().slice(0, 16) : '',
                                endTime: data.end_time ? new Date(data.end_time).toISOString().slice(0, 16) : '',


                                sqlDatabase: sqlRounds.map(r => r.resource_ref),
                                sqlDuration: sqlRound ? sqlRound.duration_minutes : 60,
                                sqlQuestionCount: sqlRound ? sqlRound.question_count : 5,
                                sqlRandomize: sqlRound ? !!sqlRound.is_randomized : false,
                                selectedSqlQuestionIds: sqlRoundMeta.selectedSqlQuestionIds || [],

                                mcqDataset: mcqRounds.map(r => r.resource_ref),
                                mcqDuration: mcqRound ? mcqRound.duration_minutes : 30,
                                mcqQuestionCount: mcqRound ? mcqRound.question_count : 10,
                                mcqRandomize: mcqRound ? !!mcqRound.is_randomized : false,
                                selectedMcqQuestionIds: mcqRoundMeta.selectedMcqQuestionIds || [],

                                sqlStratifiedCounts: sqlRoundMeta.stratifiedCounts || { Easy: 0, Medium: 0, Hard: 0 },
                                mcqStratifiedCounts: mcqRoundMeta.stratifiedCounts || { Easy: 0, Medium: 0, Hard: 0 },

                                // File Upload Load
                                includeFileUpload: !!fileUploadRound,
                                fileUploadInstructions: fileUploadMeta.instructions || '',
                                fileUploadResourceUrl: fileUploadRound ? fileUploadRound.resource_ref : '',
                                fileUploadDuration: fileUploadRound ? fileUploadRound.duration_minutes : 60,
                                fileUploadPoints: fileUploadMeta.points || 100,

                                // Kode Env Load
                                includeKodeEnv: !!kodeEnvRound,
                                kodeEnvRepoUrl: kodeEnvRound ? kodeEnvRound.resource_ref : '',
                                kodeEnvDuration: kodeEnvRound ? kodeEnvRound.duration_minutes : 60,
                                kodeEnvQuestionCount: kodeEnvRound ? kodeEnvRound.question_count : 5,
                                kodeEnvRandomize: kodeEnvRound ? !!kodeEnvRound.is_randomized : false,
                                kodeEnvSelectedQuestions: kodeEnvRoundMeta.gitPool || [],
                                kodeEnvStratifiedCounts: kodeEnvRoundMeta.stratifiedCounts || { Easy: 0, Medium: 0, Hard: 0 },
                                kodeEnvRandomizeType: kodeEnvRoundMeta.randomizeType || 'candidate'
                            });

                            if (kodeEnvRound) {
                                setFetchedGitQuestions(kodeEnvRoundMeta.gitPool || []);
                            }

                            // Set inclusion states based on existing rounds - MAINTAIN ORDER
                            const rounds = [];
                            if (sqlRounds.length > 0) rounds.push('SQL');
                            if (mcqRounds.length > 0) rounds.push('MCQ');
                            if (fileUploadRounds.length > 0) rounds.push('FILE_UPLOAD');
                            if (isKodeEnvMode) rounds.push('KODE_ENV');
                            setSelectedRounds(rounds);
                            console.log(`[CreateAssessment ${new Date().toISOString()}] Form data set successfully for edit mode`);
                            setIsLoading(false);
                        } else {
                            const errorText = await res.text();
                            console.error(`[CreateAssessment ${new Date().toISOString()}] Failed to fetch assessment:`, res.status, res.statusText, errorText);
                        }
                    } catch (fetchError) {
                        console.error(`[CreateAssessment ${new Date().toISOString()}] Error in fetch:`, fetchError);
                        setIsLoading(false);
                    }
                } else {
                    console.log(`[CreateAssessment ${new Date().toISOString()}] Not in edit mode (no editId)`);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Error fetching resources:", error);
            }
        };
        fetchData();
    }, [editId]);

    // Fetch SQL questions when database changes
    useEffect(() => {
        const fetchSqlQuestions = async () => {
            if (!formData.sqlDatabase || formData.sqlDatabase.length === 0) {
                setAvailableSqlQuestions([]);
                return;
            }

            setLoadingSqlQuestions(true);
            try {
                // Fetch for ALL selected databases
                const promises = formData.sqlDatabase.map(async (dbName) => {
                    const selectedDb = databases.find(db => db.name === dbName);
                    if (!selectedDb) return [];
                    // Use challenge_db_id for SQL questions, not dataset_id
                    const response = await fetch(`${ASSESSMENT_API_BASE_URL}/challenges/questions?challenge_db_id=${selectedDb.id}&type=SQL&t=${Date.now()}`);
                    if (response.ok) {
                        return await response.json();
                    }
                    return [];
                });

                const results = await Promise.all(promises);
                // Flatten and deduplicate by ID if necessary (though IDs should be unique globally ideally)
                const allQuestions = results.flat();

                // Deduplicate just in case
                const uniqueQuestions = Array.from(new Map(allQuestions.map(q => [q.id, q])).values());

                console.log(`[CreateAssessment] Fetched ${uniqueQuestions.length} SQL questions`);
                setAvailableSqlQuestions(uniqueQuestions);
            } catch (error) {
                console.error("Error fetching SQL questions:", error);
            } finally {
                setLoadingSqlQuestions(false);
            }
        };

        fetchSqlQuestions();
    }, [formData.sqlDatabase, databases]);

    // Fetch MCQ questions when dataset changes
    useEffect(() => {
        const fetchMcqQuestions = async () => {
            if (!formData.mcqDataset || formData.mcqDataset.length === 0) {
                setAvailableMcqQuestions([]);
                return;
            }

            setLoadingMcqQuestions(true);
            try {
                const promises = formData.mcqDataset.map(async (dsName) => {
                    const selectedDs = datasets.find(ds => ds.name === dsName);
                    if (!selectedDs) return [];
                    // Add cache-busting timestamp
                    const response = await fetch(`${ASSESSMENT_API_BASE_URL}/challenges/questions?dataset_id=${selectedDs.id}&t=${Date.now()}`);
                    if (response.ok) {
                        return await response.json();
                    }
                    return [];
                });

                const results = await Promise.all(promises);
                const allQuestions = results.flat();
                const uniqueQuestions = Array.from(new Map(allQuestions.map(q => [q.id, q])).values());

                console.log(`[CreateAssessment] Fetched ${uniqueQuestions.length} MCQ questions`);
                setAvailableMcqQuestions(uniqueQuestions);

            } catch (error) {
                console.error("Error fetching MCQ questions:", error);
            } finally {
                setLoadingMcqQuestions(false);
            }
        };

        fetchMcqQuestions();
    }, [formData.mcqDataset, datasets]);

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
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
                    return { url: response.fileUrl, name: response.originalName }; // Return object with url and original name
                } catch (error) {
                    console.error(`Upload failed for ${file.name}:`, error);
                    return null;
                }
            });

            const uploadedFiles = (await Promise.all(uploadPromises)).filter(res => res !== null);

            if (uploadedFiles.length > 0) {
                // Update state: Append to existing array or create new one
                const current = formData.fileUploadResourceUrl;
                let newFiles;
                if (Array.isArray(current)) {
                    newFiles = [...current, ...uploadedFiles];
                } else if (current) {
                    newFiles = [current, ...uploadedFiles];
                } else {
                    newFiles = uploadedFiles;
                }

                updateFormData('fileUploadResourceUrl', newFiles.length === 1 ? newFiles[0] : newFiles);

                showAlert('Success', `${uploadedFiles.length} file(s) uploaded successfully!`);
            } else {
                showAlert('Error', 'Failed to upload files.');
            }
        } catch (error) {
            console.error("Batch upload error:", error);
            showAlert('Error', 'An error occurred during file upload.');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleQuestionToggle = (questionId) => {
        setFormData(prev => {
            const current = prev.selectedSqlQuestionIds || [];
            if (current.includes(questionId)) {
                return { ...prev, selectedSqlQuestionIds: current.filter(id => id !== questionId) };
            } else {
                return { ...prev, selectedSqlQuestionIds: [...current, questionId] };
            }
        });
    };

    // Filtered lists for UI rendering
    const filteredSqlQuestions = availableSqlQuestions.filter(q => {
        if (sqlDifficultyFilter.length === 0) return true;
        return sqlDifficultyFilter.includes(q.difficulty);
    });

    const filteredMcqQuestions = availableMcqQuestions.filter(q => {
        if (mcqDifficultyFilter.length === 0) return true;
        return mcqDifficultyFilter.includes(q.difficulty);
    });

    const maxSqlStrata = useMemo(() => {
        const counts = { Easy: 0, Medium: 0, Hard: 0 };
        const selectedQuestions = availableSqlQuestions.filter(q => formData.selectedSqlQuestionIds.includes(q.id));
        selectedQuestions.forEach(q => {
            const diff = q.difficulty === 'Easy' || q.difficulty === 'EASY' ? 'Easy' :
                q.difficulty === 'Medium' || q.difficulty === 'MEDIUM' ? 'Medium' :
                    q.difficulty === 'Hard' || q.difficulty === 'HARD' ? 'Hard' : null;
            if (diff) counts[diff]++;
        });
        return counts;
    }, [formData.selectedSqlQuestionIds, availableSqlQuestions]);

    const maxMcqStrata = useMemo(() => {
        const counts = { Easy: 0, Medium: 0, Hard: 0 };
        const selectedQuestions = availableMcqQuestions.filter(q => formData.selectedMcqQuestionIds.includes(q.id));
        selectedQuestions.forEach(q => {
            const diff = q.difficulty === 'Easy' || q.difficulty === 'EASY' ? 'Easy' :
                q.difficulty === 'Medium' || q.difficulty === 'MEDIUM' ? 'Medium' :
                    q.difficulty === 'Hard' || q.difficulty === 'HARD' ? 'Hard' : null;
            if (diff) counts[diff]++;
        });
        return counts;
    }, [formData.selectedMcqQuestionIds, availableMcqQuestions]);

    const totalAvailableSqlCounts = useMemo(() => {
        const counts = { Easy: 0, Medium: 0, Hard: 0 };
        availableSqlQuestions.forEach(q => {
            const diff = q.difficulty === 'Easy' || q.difficulty === 'EASY' ? 'Easy' :
                q.difficulty === 'Medium' || q.difficulty === 'MEDIUM' ? 'Medium' :
                    q.difficulty === 'Hard' || q.difficulty === 'HARD' ? 'Hard' : null;
            if (diff) counts[diff]++;
        });
        return counts;
    }, [availableSqlQuestions]);

    const totalAvailableMcqCounts = useMemo(() => {
        const counts = { Easy: 0, Medium: 0, Hard: 0 };
        availableMcqQuestions.forEach(q => {
            const diff = q.difficulty === 'Easy' || q.difficulty === 'EASY' ? 'Easy' :
                q.difficulty === 'Medium' || q.difficulty === 'MEDIUM' ? 'Medium' :
                    q.difficulty === 'Hard' || q.difficulty === 'HARD' ? 'Hard' : null;
            if (diff) counts[diff]++;
        });
        return counts;
    }, [availableMcqQuestions]);

    const handleSelectAllQuestions = () => {
        if (!filteredSqlQuestions.length) return;

        const allVisibleIds = filteredSqlQuestions.map(q => q.id);
        const currentSelected = formData.selectedSqlQuestionIds || [];

        // Are ALL currently visible questions selected?
        const isAllVisibleSelected = allVisibleIds.every(id => currentSelected.includes(id));

        if (isAllVisibleSelected) {
            // Deselect visible
            setFormData(prev => ({
                ...prev,
                selectedSqlQuestionIds: currentSelected.filter(id => !allVisibleIds.includes(id))
            }));
        } else {
            // Select visible
            const newSelected = new Set([...currentSelected, ...allVisibleIds]);
            setFormData(prev => ({
                ...prev,
                selectedSqlQuestionIds: Array.from(newSelected)
            }));
        }
    };

    const handleMcqQuestionToggle = (questionId) => {
        setFormData(prev => {
            const current = prev.selectedMcqQuestionIds || [];
            if (current.includes(questionId)) {
                return { ...prev, selectedMcqQuestionIds: current.filter(id => id !== questionId) };
            } else {
                return { ...prev, selectedMcqQuestionIds: [...current, questionId] };
            }
        });
    };

    const handleSelectAllMcqQuestions = () => {
        if (!filteredMcqQuestions.length) return;

        const allVisibleIds = filteredMcqQuestions.map(q => q.id);
        const currentSelected = formData.selectedMcqQuestionIds || [];

        // Are ALL currently visible questions selected?
        const isAllVisibleSelected = allVisibleIds.every(id => currentSelected.includes(id));

        if (isAllVisibleSelected) {
            // Deselect visible
            setFormData(prev => ({
                ...prev,
                selectedMcqQuestionIds: currentSelected.filter(id => !allVisibleIds.includes(id))
            }));
        } else {
            // Select visible
            const newSelected = new Set([...currentSelected, ...allVisibleIds]);
            setFormData(prev => ({
                ...prev,
                selectedMcqQuestionIds: Array.from(newSelected)
            }));
        }
    };

    // Helper for rendering difficulty toggle pills
    const renderDifficultyFilters = (currentFilter, setFilter) => {
        const toggleFilter = (level) => {
            setFilter(prev =>
                prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
            );
        };

        const levels = ['Easy', 'Medium', 'Hard'];

        return (
            <div className="flex gap-2 mb-3">
                {levels.map(level => {
                    const isActive = currentFilter.includes(level);
                    return (
                        <button
                            key={level}
                            onClick={() => toggleFilter(level)}
                            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${isActive
                                ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 dark:bg-transparent dark:text-gray-400 dark:border-gray-700 dark:hover:bg-white/5'
                                }`}
                        >
                            {level}
                        </button>
                    );
                })}
            </div>
        );
    };


    const updateFormData = (key, value) => {
        // console.log(`[CreateAssessment] updateFormData called: ${key} =`, value);
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        try {
            const url = isEditMode
                ? `${ASSESSMENT_API_BASE_URL}/assessments/${editId}`
                : `${ASSESSMENT_API_BASE_URL}/assessments`;

            const method = isEditMode ? 'PUT' : 'POST';

            let finalName = formData.name;
            if (includeKodeEnv && !finalName.includes('[KodeEnv]')) {
                finalName = `${finalName} [KodeEnv]`;
            }
            if (!formData.showScore && !finalName.includes('[HideScore]')) {
                finalName = `${finalName} [HideScore]`;
            }

            // Pre-generate static code if randomizeType === 'same'
            let staticCode = '';
            if (formData.kodeEnvRandomizeType === 'same' && includeKodeEnv) {
                if (!formData.kodeEnvRandomize) {
                    staticCode = formData.kodeEnvSelectedQuestions.map(q => q.name).join(', ');
                } else {
                    const pool = [...formData.kodeEnvSelectedQuestions];
                    const count = parseInt(formData.kodeEnvQuestionCount) || 5;
                    const groups = { Easy: [], Medium: [], Hard: [], Unknown: [] };
                    pool.forEach(q => {
                        const diff = q.difficulty || 'Unknown';
                        const key = diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
                        if (groups[key]) groups[key].push(q);
                        else if (groups[diff]) groups[diff].push(q);
                        else groups['Unknown'].push(q);
                    });

                    const selected = [];
                    const stratified = formData.kodeEnvStratifiedCounts || {};
                    const hasStratified = stratified.Easy > 0 || stratified.Medium > 0 || stratified.Hard > 0;

                    if (hasStratified) {
                        ['Easy', 'Medium', 'Hard'].forEach(level => {
                            const lvlCount = parseInt(stratified[level]) || 0;
                            if (lvlCount > 0 && groups[level] && groups[level].length > 0) {
                                const shuffled = groups[level].sort(() => 0.5 - Math.random());
                                selected.push(...shuffled.slice(0, lvlCount));
                            }
                        });
                    } else {
                        const shuffled = pool.sort(() => 0.5 - Math.random());
                        selected.push(...shuffled.slice(0, count));
                    }
                    selected.sort((a, b) => a.name.localeCompare(b.name));
                    staticCode = selected.map(q => q.name).join(', ');
                }
            }

            const payload = {
                ...formData,
                name: finalName,
                sqlDatabase: includeSql ? formData.sqlDatabase : [],
                mcqDataset: includeMcq ? formData.mcqDataset : [],
                includeFileUpload: includeFileUpload,
                includeKodeEnv: includeKodeEnv,
                kodeEnvRepoUrl: includeKodeEnv ? formData.kodeEnvRepoUrl : '',
                kodeEnvDuration: includeKodeEnv ? formData.kodeEnvDuration : 60,
                kodeEnvQuestionCount: includeKodeEnv ? formData.kodeEnvQuestionCount : 5,
                kodeEnvRandomize: includeKodeEnv ? formData.kodeEnvRandomize : false,
                kodeEnvMetadata: includeKodeEnv ? {
                    gitPool: formData.kodeEnvSelectedQuestions,
                    stratifiedCounts: formData.kodeEnvStratifiedCounts,
                    randomizeType: formData.kodeEnvRandomizeType,
                    staticCode: staticCode
                } : null
            };

            // console.log('[CreateAssessment] ========== SUBMITTING ==========');
            // console.log('[CreateAssessment] Payload:', JSON.stringify(payload, null, 2));
            // console.log('[CreateAssessment] selectedCohorts:', payload.selectedCohorts);
            // console.log('[CreateAssessment] selectedUser:', payload.selectedUser);

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                // console.log('Assessment Saved:', data);
                showAlert("Success", isEditMode ? 'Assessment Updated Successfully!' : 'Assessment Created Successfully!');
                setTimeout(() => navigate('/assessment'), 1500); // Slight delay to read the popup
            } else {
                const errorData = await response.json();
                showAlert("Error", `Failed to save assessment: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Error saving assessment:', error);
            showAlert("Error", 'An error occurred while saving the assessment.');
        }
    };

    const handleSaveDraft = () => {
        console.log('Saving Draft:', formData);
        showAlert("Draft Saved", 'Assessment Saved as Draft!');
        setTimeout(() => navigate('/assessment'), 1500);
    };

    return (
        <div className="w-full px-6 pb-2 md:pb-4 pt-6 font-['Poppins',sans-serif] bg-gray-50 dark:bg-brand-dark min-h-screen transition-colors duration-300 flex flex-col">
            {isLoading ? (
                <div className="min-h-screen bg-gray-50 dark:bg-brand-dark"></div>
            ) : (
                <div className="w-full flex-1 flex flex-col space-y-2">

                    {/* Header Area - Pill Style */}
                    <div className="w-full bg-white dark:bg-[#09090b] rounded-[28px] px-8 py-3.5 flex items-center shadow-sm border border-gray-100 dark:border-blue-500/10 transition-all hover:shadow-md dark:hover:border-blue-500/30">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none px-4 whitespace-nowrap">
                                {isEditMode ? 'Edit Assessment' : 'Create Assessment'}
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

                    {/* Main Form Grid - Vertical Stack */}
                    <div className="flex flex-col gap-6 w-full -mt-2">

                        {/* Card 1: Identity - Only show if at least one type is selected or in edit mode */}
                        {(includeSql || includeMcq || includeFileUpload || includeKodeEnv) && (
                            <div className="bg-white dark:bg-brand-card rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6 md:p-8 flex flex-col h-full hover:border-blue-500/30 transition-colors animate-in fade-in slide-in-from-top-4 duration-500">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center shrink-0">
                                    <span className="material-symbols-outlined text-blue-500 mr-2">badge</span>
                                    Assessment Details
                                </h2>
                                <div className="space-y-4 flex-1">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Assessment Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => updateFormData('name', e.target.value)}
                                            placeholder="e.g., Q1 Full Stack Evaluation"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                        />
                                    </div>

                                    {/* Cohort Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Select Cohorts (Optional)
                                        </label>
                                        <MultiSelect
                                            label=""
                                            placeholder="Select Cohorts"
                                            options={cohorts.map(c => ({ value: c, label: c }))}
                                            selectedValues={formData.selectedCohorts}
                                            searchable={true}
                                            onChange={(newValues) => {
                                                // Ensure we store strings, MultiSelect might return objects or strings
                                                const cleanValues = newValues.map(v => typeof v === 'object' ? v.value : v);
                                                updateFormData('selectedCohorts', cleanValues);
                                            }}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Select multiple cohorts to assign this assessment to.
                                        </p>
                                    </div>

                                    {/* User Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            Select Users (Optional)
                                        </label>
                                        <MultiSelect
                                            label=""
                                            placeholder="Select Users"
                                            options={users.map(user => ({ value: user, label: user }))}
                                            selectedValues={formData.selectedUsers}
                                            searchable={true}
                                            onChange={(newValues) => {
                                                const cleanValues = newValues.map(v => typeof v === 'object' ? v.value : v);
                                                updateFormData('selectedUsers', cleanValues);
                                            }}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Select multiple users to assign this assessment to.
                                        </p>
                                    </div>

                                    {/* Proctoring Toggle - Only show if SQL or MCQ are included */}
                                    {(includeSql || includeMcq) && (
                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <label className={`flex items-center p-3 rounded-xl transition-colors cursor-pointer border ${includeFileUpload ? 'bg-gray-100 dark:bg-white/5 border-transparent opacity-60 cursor-not-allowed' : 'bg-gray-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-200 dark:hover:border-blue-800 border-transparent'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={(includeFileUpload || includeKodeEnv) ? false : formData.isProctoringEnabled}
                                                    onChange={(e) => !(includeFileUpload || includeKodeEnv) && updateFormData('isProctoringEnabled', e.target.checked)}
                                                    disabled={includeFileUpload || includeKodeEnv}
                                                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 mr-3"
                                                />
                                                <div>
                                                    <span className="block text-sm font-bold text-gray-900 dark:text-white">Enable Proctoring</span>
                                                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">Enforce screen sharing and camera monitoring</span>
                                                </div>
                                            </label>
                                        </div>
                                    )}

                                    {/* Show Score Toggle */}
                                    <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="flex items-center p-3 rounded-xl transition-colors cursor-pointer border bg-gray-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-200 dark:hover:border-blue-800 border-transparent">
                                            <input
                                                type="checkbox"
                                                checked={formData.showScore}
                                                onChange={(e) => updateFormData('showScore', e.target.checked)}
                                                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 mr-3"
                                            />
                                            <div>
                                                <span className="block text-sm font-bold text-gray-900 dark:text-white">Show Score on Completion</span>
                                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">Display percentage and breakdown to candidate after submission.</span>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                                        <p className="font-semibold mb-1">Tip:</p>
                                        Choose a descriptive name to help candidates identify the assessment easily.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Linked Resources Card - Only show if at least one type is selected */}
                        {(includeSql || includeMcq || includeFileUpload) && (
                            <div className="bg-white dark:bg-brand-card rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6 md:p-8 flex flex-col h-full hover:border-blue-500/30 transition-colors relative z-30 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center shrink-0">
                                    <span className="material-symbols-outlined text-blue-500 mr-2">dataset</span>
                                    Linked Resources
                                </h2>
                                {/* Dates Row */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <CustomDatePicker
                                            label="Start Date"
                                            value={formData.startTime ? formData.startTime.split('T')[0] : ''}
                                            onChange={(date) => {
                                                const time = formData.startTime ? formData.startTime.split('T')[1] : '00:00';
                                                updateFormData('startTime', date ? `${date}T${time}` : '');
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <CustomDatePicker
                                            label="End Date"
                                            value={formData.endTime ? formData.endTime.split('T')[0] : ''}
                                            onChange={(date) => {
                                                const time = formData.endTime ? formData.endTime.split('T')[1] : '23:59';
                                                updateFormData('endTime', date ? `${date}T${time}` : '');
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Times Row */}
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <CustomTimePicker
                                            label="Start Time"
                                            value={formData.startTime ? formData.startTime.split('T')[1] : ''}
                                            onChange={(e) => {
                                                const time = e.target.value;
                                                const date = formData.startTime ? formData.startTime.split('T')[0] : new Date().toISOString().split('T')[0];
                                                updateFormData('startTime', `${date}T${time}`);
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <CustomTimePicker
                                            label="End Time"
                                            value={formData.endTime ? formData.endTime.split('T')[1] : ''}
                                            onChange={(e) => {
                                                const time = e.target.value;
                                                const date = formData.endTime ? formData.endTime.split('T')[0] : new Date().toISOString().split('T')[0];
                                                updateFormData('endTime', `${date}T${time}`);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}



                        {/* Assessment Rounds (SQL, MCQ, File Upload) - Order is determined by selectedRounds array */}
                        {selectedRounds.map((roundType, index) => {
                            if (roundType === 'SQL') {
                                return (
                                    <div key="SQL" className="bg-white dark:bg-brand-card rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6 md:p-8 flex flex-col h-full hover:border-blue-500/30 transition-colors animate-in fade-in slide-in-from-left-4">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center shrink-0">
                                            <span className="material-symbols-outlined text-blue-500 mr-2">terminal</span>
                                            SQL Configuration
                                            <div className="ml-auto flex items-center gap-2">
                                                {index > 0 && (
                                                    <button
                                                        onClick={() => moveRound(index, -1)}
                                                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors"
                                                        title="Move Up"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                                    </button>
                                                )}
                                                {index < selectedRounds.length - 1 && (
                                                    <button
                                                        onClick={() => moveRound(index, 1)}
                                                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors"
                                                        title="Move Down"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setSelectedRounds(prev => prev.filter(r => r !== 'SQL'))}
                                                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors border border-transparent hover:border-red-200"
                                                    title="Remove SQL Assessment"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            </div>
                                        </h2>
                                        <div className="space-y-6">
                                            {/* Resource Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ">
                                                    SQL Database
                                                </label>
                                                <MultiSelect
                                                    label=""
                                                    placeholder="Select Databases"
                                                    options={databases.map(db => ({ value: db.name, label: db.name }))}
                                                    selectedValues={formData.sqlDatabase}
                                                    onChange={(newValues) => updateFormData('sqlDatabase', newValues)}
                                                />
                                                {formData.sqlDatabase.length > 0 && (
                                                    <div className="mt-4 border-t border-gray-100 dark:border-white/10 pt-4">
                                                        <div className="flex justify-between items-end mb-2">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                    Filter by Difficulty
                                                                </label>
                                                                {renderDifficultyFilters(sqlDifficultyFilter, setSqlDifficultyFilter)}
                                                            </div>
                                                            <div className="text-right">
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                    Select Questions ({formData.selectedSqlQuestionIds?.length || 0} selected)
                                                                </label>
                                                                <button onClick={handleSelectAllQuestions} className="text-xs text-blue-600 hover:text-blue-500 font-medium whitespace-nowrap">
                                                                    {filteredSqlQuestions.length > 0 && filteredSqlQuestions.every(q => (formData.selectedSqlQuestionIds || []).includes(q.id)) ? 'Deselect Visible' : 'Select Visible'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden max-h-60 overflow-y-auto bg-gray-50 dark:bg-black/20">
                                                            {loadingSqlQuestions ? (
                                                                <div className="p-4 flex justify-center h-40"><AssessmentLoader text="Loading Questions..." scale={0.6} /></div>
                                                            ) : filteredSqlQuestions.length > 0 ? (
                                                                <div className="divide-y divide-gray-100 dark:divide-white/5">
                                                                    {filteredSqlQuestions.map(q => (
                                                                        <div key={q.id} onClick={() => handleQuestionToggle(q.id)} className={`p-3 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-start gap-3 ${formData.selectedSqlQuestionIds?.includes(q.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                                                            <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors ${formData.selectedSqlQuestionIds?.includes(q.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}>
                                                                                {formData.selectedSqlQuestionIds?.includes(q.id) && <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>}
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <div className="font-medium text-gray-900 dark:text-white">{q.title}</div>
                                                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center justify-between gap-2">
                                                                                    <div className="flex gap-2 items-center">
                                                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                                                                                            {q.difficulty?.toUpperCase() || 'MEDIUM'}
                                                                                        </span>
                                                                                        <span>{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                                                                                    </div>
                                                                                    <span className="truncate flex-1 max-w-[200px] text-right">{q.description ? q.description.substring(0, 50) + '...' : ''}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : <div className="p-4 text-center text-xs text-gray-500">No questions found for this database.</div>}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-2">
                                                            * Selected questions will be used for the assessment.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Rules */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">Duration (mins)</label>
                                                    <input type="number" min="1" value={formData.sqlDuration} onChange={(e) => updateFormData('sqlDuration', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">Questions to Ask</label>
                                                    <input type="number" min="1" value={formData.sqlQuestionCount} onChange={(e) => updateFormData('sqlQuestionCount', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all" />
                                                </div>
                                            </div>
                                            <div className="pt-2">
                                                <label className="flex items-center p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
                                                    <input type="checkbox" checked={formData.sqlRandomize} onChange={(e) => updateFormData('sqlRandomize', e.target.checked)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 mr-3" />
                                                    <div><span className="block text-sm font-bold text-gray-900 dark:text-white">Randomize Order</span><span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">Shuffle questions for each user</span></div>
                                                </label>

                                                {formData.sqlRandomize && formData.selectedSqlQuestionIds?.length > 0 && (
                                                    <div className="mt-3 p-4 border border-blue-100 dark:border-blue-900/30 rounded-xl bg-blue-50/30 dark:bg-blue-900/5 animate-in fade-in zoom-in-95 duration-200">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 block flex items-center">
                                                            <span className="material-symbols-outlined text-[16px] mr-1 text-blue-500">tune</span>
                                                            Stratified Selection
                                                        </label>
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4 font-mono">
                                                            Specify exactly how many questions to draw from each difficulty level.
                                                        </p>
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div>
                                                                <label className="text-xs font-semibold text-green-600 dark:text-green-400 block mb-1">Easy (Max: {maxSqlStrata.Easy})</label>
                                                                <input type="number" min="0" max={maxSqlStrata.Easy} value={formData.sqlStratifiedCounts.Easy} onChange={(e) => updateFormData('sqlStratifiedCounts', { ...formData.sqlStratifiedCounts, Easy: Math.min(parseInt(e.target.value) || 0, maxSqlStrata.Easy) })} disabled={maxSqlStrata.Easy === 0} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
                                                                {maxSqlStrata.Easy === 0 && <p className="text-[10px] text-red-500 mt-1">No Easy questions available in selected pool.</p>}
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 block mb-1">Medium (Max: {maxSqlStrata.Medium})</label>
                                                                <input type="number" min="0" max={maxSqlStrata.Medium} value={formData.sqlStratifiedCounts.Medium} onChange={(e) => updateFormData('sqlStratifiedCounts', { ...formData.sqlStratifiedCounts, Medium: Math.min(parseInt(e.target.value) || 0, maxSqlStrata.Medium) })} disabled={maxSqlStrata.Medium === 0} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
                                                                {maxSqlStrata.Medium === 0 && <p className="text-[10px] text-red-500 mt-1">No Medium questions available in selected pool.</p>}
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-red-600 dark:text-red-400 block mb-1">Hard (Max: {maxSqlStrata.Hard})</label>
                                                                <input type="number" min="0" max={maxSqlStrata.Hard} value={formData.sqlStratifiedCounts.Hard} onChange={(e) => updateFormData('sqlStratifiedCounts', { ...formData.sqlStratifiedCounts, Hard: Math.min(parseInt(e.target.value) || 0, maxSqlStrata.Hard) })} disabled={maxSqlStrata.Hard === 0} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
                                                                {maxSqlStrata.Hard === 0 && <p className="text-[10px] text-red-500 mt-1">No Hard questions available in selected pool.</p>}
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 text-xs flex justify-between items-center px-1">
                                                            <span className="text-gray-500 dark:text-gray-400">Total Stratified Drawn:</span>
                                                            <span className={`font-bold ${((formData.sqlStratifiedCounts.Easy || 0) + (formData.sqlStratifiedCounts.Medium || 0) + (formData.sqlStratifiedCounts.Hard || 0)) > formData.sqlQuestionCount ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                {(formData.sqlStratifiedCounts.Easy || 0) + (formData.sqlStratifiedCounts.Medium || 0) + (formData.sqlStratifiedCounts.Hard || 0)} / {formData.sqlQuestionCount || 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            if (roundType === 'MCQ') {
                                return (
                                    <div key="MCQ" className="bg-white dark:bg-brand-card rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 p-6 md:p-8 flex flex-col h-full hover:border-blue-500/30 transition-colors animate-in fade-in slide-in-from-right-4">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center shrink-0">
                                            <span className="material-symbols-outlined text-blue-500 mr-2">checklist</span>
                                            MCQ Configuration
                                            <div className="ml-auto flex items-center gap-2">
                                                {index > 0 && (
                                                    <button
                                                        onClick={() => moveRound(index, -1)}
                                                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors"
                                                        title="Move Up"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                                    </button>
                                                )}
                                                {index < selectedRounds.length - 1 && (
                                                    <button
                                                        onClick={() => moveRound(index, 1)}
                                                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors"
                                                        title="Move Down"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setSelectedRounds(prev => prev.filter(r => r !== 'MCQ'))}
                                                    className="ml-auto w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors border border-transparent hover:border-red-200"
                                                    title="Remove MCQ Assessment"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            </div>
                                        </h2>
                                        <div className="space-y-6">
                                            {/* Resource Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">MCQ Dataset</label>
                                                <MultiSelect label="" placeholder="Select Datasets" options={datasets.map(ds => ({ value: ds.name, label: ds.name }))} selectedValues={formData.mcqDataset} onChange={(newValues) => updateFormData('mcqDataset', newValues)} />
                                                {formData.mcqDataset.length > 0 && (
                                                    <div className="mt-4 border-t border-gray-100 dark:border-white/10 pt-4">
                                                        <div className="flex justify-between items-end mb-2">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                    Filter by Difficulty
                                                                </label>
                                                                {renderDifficultyFilters(mcqDifficultyFilter, setMcqDifficultyFilter)}
                                                            </div>
                                                            <div className="text-right">
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                    Select Questions ({formData.selectedMcqQuestionIds?.length || 0} selected)
                                                                </label>
                                                                <button onClick={handleSelectAllMcqQuestions} className="text-xs text-blue-600 hover:text-blue-500 font-medium whitespace-nowrap">
                                                                    {filteredMcqQuestions.length > 0 && filteredMcqQuestions.every(q => (formData.selectedMcqQuestionIds || []).includes(q.id)) ? 'Deselect Visible' : 'Select Visible'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden max-h-60 overflow-y-auto bg-gray-50 dark:bg-black/20">
                                                            {loadingMcqQuestions ? (
                                                                <div className="p-4 flex justify-center h-40"><AssessmentLoader text="Loading Questions..." scale={0.6} /></div>
                                                            ) : filteredMcqQuestions.length > 0 ? (
                                                                <div className="divide-y divide-gray-100 dark:divide-white/5">
                                                                    {filteredMcqQuestions.map(q => (
                                                                        <div key={q.id} onClick={() => handleMcqQuestionToggle(q.id)} className={`p-3 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-start gap-3 ${formData.selectedMcqQuestionIds?.includes(q.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                                                            <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors ${formData.selectedMcqQuestionIds?.includes(q.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}>
                                                                                {formData.selectedMcqQuestionIds?.includes(q.id) && <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>}
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <div className="font-medium text-gray-900 dark:text-white">{q.title}</div>
                                                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center justify-between gap-2">
                                                                                    <div className="flex gap-2 items-center">
                                                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                                                                                            {q.difficulty?.toUpperCase() || 'MEDIUM'}
                                                                                        </span>
                                                                                        <span>{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                                                                                    </div>
                                                                                    <span className="truncate flex-1 max-w-[200px] text-right">{q.description ? q.description.substring(0, 50) + '...' : ''}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : <div className="p-4 text-center text-xs text-gray-500">No questions found for this dataset.</div>}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-2">
                                                            * Selected questions will be used for the assessment.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Rules */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">Duration (mins)</label>
                                                    <input type="number" min="1" value={formData.mcqDuration} onChange={(e) => updateFormData('mcqDuration', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 outline-none transition-all" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">Questions to Ask</label>
                                                    <input type="number" min="1" value={formData.mcqQuestionCount} onChange={(e) => updateFormData('mcqQuestionCount', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 outline-none transition-all" />
                                                </div>
                                            </div>
                                            <div className="pt-2">
                                                <label className="flex items-center p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-800">
                                                    <input type="checkbox" checked={formData.mcqRandomize} onChange={(e) => updateFormData('mcqRandomize', e.target.checked)} className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-gray-300 mr-3" />
                                                    <div><span className="block text-sm font-bold text-gray-900 dark:text-white">Randomize Order</span><span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">Shuffle questions for each user</span></div>
                                                </label>

                                                {formData.mcqRandomize && formData.selectedMcqQuestionIds?.length > 0 && (
                                                    <div className="mt-3 p-4 border border-red-100 dark:border-red-900/30 rounded-xl bg-red-50/30 dark:bg-red-900/5 animate-in fade-in zoom-in-95 duration-200">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 block flex items-center">
                                                            <span className="material-symbols-outlined text-[16px] mr-1 text-red-500">tune</span>
                                                            Stratified Selection
                                                        </label>
                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4 font-mono">
                                                            Specify exactly how many questions to draw from each difficulty level.
                                                        </p>
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div>
                                                                <label className="text-xs font-semibold text-green-600 dark:text-green-400 block mb-1">Easy (Max: {maxMcqStrata.Easy})</label>
                                                                <input type="number" min="0" max={maxMcqStrata.Easy} value={formData.mcqStratifiedCounts.Easy} onChange={(e) => updateFormData('mcqStratifiedCounts', { ...formData.mcqStratifiedCounts, Easy: Math.min(parseInt(e.target.value) || 0, maxMcqStrata.Easy) })} disabled={maxMcqStrata.Easy === 0} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
                                                                {maxMcqStrata.Easy === 0 && <p className="text-[10px] text-red-500 mt-1">No Easy questions available in selected pool.</p>}
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 block mb-1">Medium (Max: {maxMcqStrata.Medium})</label>
                                                                <input type="number" min="0" max={maxMcqStrata.Medium} value={formData.mcqStratifiedCounts.Medium} onChange={(e) => updateFormData('mcqStratifiedCounts', { ...formData.mcqStratifiedCounts, Medium: Math.min(parseInt(e.target.value) || 0, maxMcqStrata.Medium) })} disabled={maxMcqStrata.Medium === 0} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
                                                                {maxMcqStrata.Medium === 0 && <p className="text-[10px] text-red-500 mt-1">No Medium questions available in selected pool.</p>}
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-red-600 dark:text-red-400 block mb-1">Hard (Max: {maxMcqStrata.Hard})</label>
                                                                <input type="number" min="0" max={maxMcqStrata.Hard} value={formData.mcqStratifiedCounts.Hard} onChange={(e) => updateFormData('mcqStratifiedCounts', { ...formData.mcqStratifiedCounts, Hard: Math.min(parseInt(e.target.value) || 0, maxMcqStrata.Hard) })} disabled={maxMcqStrata.Hard === 0} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed" />
                                                                {maxMcqStrata.Hard === 0 && <p className="text-[10px] text-red-500 mt-1">No Hard questions available in selected pool.</p>}
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 text-xs flex justify-between items-center px-1">
                                                            <span className="text-gray-500 dark:text-gray-400">Total Stratified Drawn:</span>
                                                            <span className={`font-bold ${((formData.mcqStratifiedCounts.Easy || 0) + (formData.mcqStratifiedCounts.Medium || 0) + (formData.mcqStratifiedCounts.Hard || 0)) > formData.mcqQuestionCount ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                {(formData.mcqStratifiedCounts.Easy || 0) + (formData.mcqStratifiedCounts.Medium || 0) + (formData.mcqStratifiedCounts.Hard || 0)} / {formData.mcqQuestionCount || 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            if (roundType === 'FILE_UPLOAD') {
                                return (
                                    <div key="FILE_UPLOAD" className="bg-white dark:bg-brand-card rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden mb-6">
                                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-gray-50/50 to-white dark:from-white/5 dark:to-transparent">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">upload_file</span>
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">File Upload Assessment</h2>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Configure file submission requirements</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {index > 0 && (
                                                    <button
                                                        onClick={() => moveRound(index, -1)}
                                                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors"
                                                        title="Move Up"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                                    </button>
                                                )}
                                                {index < selectedRounds.length - 1 && (
                                                    <button
                                                        onClick={() => moveRound(index, 1)}
                                                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors"
                                                        title="Move Down"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setSelectedRounds(prev => prev.filter(r => r !== 'FILE_UPLOAD'))}
                                                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors border border-transparent hover:border-red-200"
                                                    title="Remove File Upload Assessment"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-6">
                                            {/* Instructions */}
                                            <div>
                                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">Instructions / Problem Statement</label>
                                                <textarea
                                                    value={formData.fileUploadInstructions}
                                                    onChange={(e) => updateFormData('fileUploadInstructions', e.target.value)}
                                                    placeholder="Enter detailed instructions for the candidate..."
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all h-32 resize-y"
                                                />
                                            </div>

                                            {/* Resource Upload */}
                                            <div>
                                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">Resource Document(s) (Optional)</label>
                                                <div className="flex flex-col gap-4">
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            multiple
                                                            onChange={handleFileUpload}
                                                            disabled={isUploading}
                                                            className="w-full px-4 py-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 transition-all cursor-pointer disabled:cursor-not-allowed"
                                                        />
                                                        {isUploading && (
                                                            <div className="absolute inset-x-0 bottom-0 top-0 bg-white/80 dark:bg-black/80 flex flex-col items-center justify-center rounded-xl z-10 backdrop-blur-sm">
                                                                <div className="w-2/3 max-w-xs">
                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Uploading...</span>
                                                                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{uploadProgress}%</span>
                                                                    </div>
                                                                    <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-1.5 overflow-hidden">
                                                                        <div
                                                                            className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
                                                                            style={{ width: `${uploadProgress}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Display uploaded files list */}
                                                    {formData.fileUploadResourceUrl && (
                                                        <div className="space-y-2">
                                                            {(Array.isArray(formData.fileUploadResourceUrl)
                                                                ? formData.fileUploadResourceUrl
                                                                : [formData.fileUploadResourceUrl]
                                                            ).map((file, idx) => {
                                                                const url = typeof file === 'string' ? file : file.url;
                                                                const name = typeof file === 'string' ? url.split('/').pop() : file.name;
                                                                return (
                                                                    <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg">
                                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 truncate max-w-[80%]" title={name}>
                                                                            <span className="material-symbols-outlined">link</span>
                                                                            {name}
                                                                        </a>
                                                                        <button
                                                                            onClick={() => {
                                                                                const current = Array.isArray(formData.fileUploadResourceUrl)
                                                                                    ? formData.fileUploadResourceUrl
                                                                                    : [formData.fileUploadResourceUrl];
                                                                                const newFiles = current.filter((_, i) => i !== idx);
                                                                                updateFormData('fileUploadResourceUrl', newFiles.length > 0 ? (newFiles.length === 1 ? newFiles[0] : newFiles) : '');
                                                                            }}
                                                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                                                            title="Remove file"
                                                                        >
                                                                            <span className="material-symbols-outlined text-lg">close</span>
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">Upload PDF, Doc, or Zip files containing project resources. Multiple files allowed.</p>
                                            </div>

                                            {/* Settings */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">Duration (mins)</label>
                                                    <input type="number" min="1" value={formData.fileUploadDuration} onChange={(e) => updateFormData('fileUploadDuration', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">Total Points</label>
                                                    <input type="number" min="1" value={formData.fileUploadPoints} onChange={(e) => updateFormData('fileUploadPoints', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            if (roundType === 'KODE_ENV') {
                                const groups = { Easy: [], Medium: [], Hard: [], Unknown: [] };
                                fetchedGitQuestions.forEach(q => {
                                    const diff = q.difficulty || 'Unknown';
                                    const key = diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
                                    if (groups[key]) groups[key].push(q);
                                    else if (groups[diff]) groups[diff].push(q);
                                    else groups['Unknown'].push(q);
                                });

                                const handleToggleGitQuestion = (q) => {
                                    const current = formData.kodeEnvSelectedQuestions || [];
                                    const isSelected = current.some(x => x.name === q.name);
                                    if (isSelected) {
                                        updateFormData('kodeEnvSelectedQuestions', current.filter(x => x.name !== q.name));
                                    } else {
                                        updateFormData('kodeEnvSelectedQuestions', [...current, q]);
                                    }
                                };

                                const handleSelectAllGit = () => {
                                    const allSelected = fetchedGitQuestions.length > 0 && formData.kodeEnvSelectedQuestions.length === fetchedGitQuestions.length;
                                    if (allSelected) {
                                        updateFormData('kodeEnvSelectedQuestions', []);
                                    } else {
                                        updateFormData('kodeEnvSelectedQuestions', [...fetchedGitQuestions]);
                                    }
                                };

                                return (
                                    <div key="KODE_ENV" className="bg-white dark:bg-brand-card rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden mb-6 transition-all hover:border-indigo-500/30">
                                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-gray-50/50 to-white dark:from-white/5 dark:to-transparent">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                                    <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">terminal</span>
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Kode Env Assessment</h2>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Configure public GitHub repository questions and randomization strategy</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {index > 0 && (
                                                    <button
                                                        onClick={() => moveRound(index, -1)}
                                                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors"
                                                        title="Move Up"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                                    </button>
                                                )}
                                                {index < selectedRounds.length - 1 && (
                                                    <button
                                                        onClick={() => moveRound(index, 1)}
                                                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-blue-500 flex items-center justify-center transition-colors"
                                                        title="Move Down"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setSelectedRounds(prev => prev.filter(r => r !== 'KODE_ENV'))}
                                                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors border border-transparent hover:border-red-200"
                                                    title="Remove Kode Env Assessment"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-6">
                                            {/* Repository Link Input */}
                                            <div>
                                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">Public GitHub Repository Link</label>
                                                <div className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        value={formData.kodeEnvRepoUrl}
                                                        onChange={(e) => updateFormData('kodeEnvRepoUrl', e.target.value)}
                                                        placeholder="e.g. https://github.com/username/repository"
                                                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleFetchGitRepo}
                                                        disabled={isFetchingGit}
                                                        className="px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
                                                    >
                                                        {isFetchingGit ? 'Fetching...' : 'Fetch Questions'}
                                                    </button>
                                                </div>
                                                {gitRepoError && (
                                                    <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm">error</span>
                                                        {gitRepoError}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Fetch Results - Checkboxes */}
                                            {fetchedGitQuestions.length > 0 && (
                                                <div className="border-t border-gray-100 dark:border-white/10 pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            Select Questions Pool ({formData.kodeEnvSelectedQuestions.length} of {fetchedGitQuestions.length} selected)
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={handleSelectAllGit}
                                                            className="text-xs text-indigo-600 hover:underline font-bold"
                                                        >
                                                            {formData.kodeEnvSelectedQuestions.length === fetchedGitQuestions.length ? 'Deselect All' : 'Select All'}
                                                        </button>
                                                    </div>

                                                    <div className="border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden max-h-60 overflow-y-auto bg-gray-50 dark:bg-black/20 divide-y divide-gray-100 dark:divide-white/5">
                                                        {['Easy', 'Medium', 'Hard', 'Unknown'].map((diff) => {
                                                            if (!groups[diff] || groups[diff].length === 0) return null;
                                                            return (
                                                                <div key={diff} className="p-3">
                                                                    <h3 className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${
                                                                        diff === 'Easy' ? 'text-green-500' :
                                                                        diff === 'Medium' ? 'text-amber-500' :
                                                                        diff === 'Hard' ? 'text-red-500' : 'text-gray-400'
                                                                    }`}>
                                                                        {diff} Difficulty
                                                                    </h3>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                                                                        {groups[diff].map((q) => {
                                                                            const isSelected = formData.kodeEnvSelectedQuestions.some(x => x.name === q.name);
                                                                            return (
                                                                                <div
                                                                                    key={q.name}
                                                                                    onClick={() => handleToggleGitQuestion(q)}
                                                                                    className={`p-2.5 rounded-xl border cursor-pointer hover:bg-white dark:hover:bg-white/5 transition-all flex items-center gap-3 ${
                                                                                        isSelected ? 'bg-white dark:bg-white/5 border-indigo-500/50 shadow-sm' : 'border-transparent'
                                                                                    }`}
                                                                                >
                                                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                                                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'
                                                                                    }`}>
                                                                                        {isSelected && <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>}
                                                                                    </div>
                                                                                    <span className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200 truncate">{q.name}</span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Basic Config Settings */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">Duration (mins)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={formData.kodeEnvDuration}
                                                        onChange={(e) => updateFormData('kodeEnvDuration', e.target.value === '' ? '' : parseInt(e.target.value))}
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">Questions to Ask</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={formData.kodeEnvSelectedQuestions.length || 1}
                                                        value={formData.kodeEnvQuestionCount}
                                                        onChange={(e) => updateFormData('kodeEnvQuestionCount', e.target.value === '' ? '' : Math.min(parseInt(e.target.value) || 1, formData.kodeEnvSelectedQuestions.length))}
                                                        disabled={formData.kodeEnvSelectedQuestions.length === 0}
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>

                                            {/* Randomization Toggles */}
                                            {formData.kodeEnvSelectedQuestions.length > 0 && (
                                                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                                                    <div className="flex flex-col gap-3">
                                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Randomization Option</label>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div
                                                                onClick={() => updateFormData('kodeEnvRandomizeType', 'candidate')}
                                                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                                                    formData.kodeEnvRandomizeType === 'candidate'
                                                                        ? 'border-indigo-500 bg-indigo-500/5'
                                                                        : 'border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
                                                                }`}
                                                            >
                                                                <span className="block text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">Randomize Per Candidate</span>
                                                                <span className="block text-[10px] text-gray-500 dark:text-gray-400">Each candidate gets a unique, dynamically shuffled question code</span>
                                                            </div>
                                                            <div
                                                                onClick={() => updateFormData('kodeEnvRandomizeType', 'same')}
                                                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                                                    formData.kodeEnvRandomizeType === 'same'
                                                                        ? 'border-indigo-500 bg-indigo-500/5'
                                                                        : 'border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
                                                                }`}
                                                            >
                                                                <span className="block text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">Same Code for All Candidates</span>
                                                                <span className="block text-[10px] text-gray-500 dark:text-gray-400">Shuffled once on creation, same question code assigned to everyone</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <label className="flex items-center p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors cursor-pointer border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.kodeEnvRandomize}
                                                            onChange={(e) => updateFormData('kodeEnvRandomize', e.target.checked)}
                                                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 mr-3"
                                                        />
                                                        <div>
                                                            <span className="block text-sm font-bold text-gray-900 dark:text-white">Enable Random Question Sampling</span>
                                                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">Dynamically slice question pool instead of drawing all selected questions</span>
                                                        </div>
                                                    </label>

                                                    {formData.kodeEnvRandomize && (
                                                        <div className="p-4 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl bg-indigo-50/30 dark:bg-indigo-900/5 animate-in fade-in zoom-in-95 duration-200">
                                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 block flex items-center">
                                                                <span className="material-symbols-outlined text-[16px] mr-1 text-indigo-500">tune</span>
                                                                Difficulty Balance (Stratified)
                                                            </label>
                                                            {fetchedGitQuestions.some(q => q.difficulty && q.difficulty !== 'Unknown') ? (
                                                                <>
                                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-4 font-mono">
                                                                        Specify exactly how many questions to select from each difficulty category:
                                                                    </p>
                                                                    <div className="grid grid-cols-3 gap-3">
                                                                        {['Easy', 'Medium', 'Hard'].map((lvl) => {
                                                                            const maxAvailable = (groups[lvl] || []).filter(q => formData.kodeEnvSelectedQuestions.some(x => x.name === q.name)).length;
                                                                            return (
                                                                                <div key={lvl}>
                                                                                    <label className={`text-xs font-semibold block mb-1 ${
                                                                                        lvl === 'Easy' ? 'text-green-600 dark:text-green-400' :
                                                                                        lvl === 'Medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                                                                                    }`}>
                                                                                        {lvl} (Max: {maxAvailable})
                                                                                    </label>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        max={maxAvailable}
                                                                                        value={formData.kodeEnvStratifiedCounts[lvl]}
                                                                                        onChange={(e) => {
                                                                                            const val = Math.min(parseInt(e.target.value) || 0, maxAvailable);
                                                                                            updateFormData('kodeEnvStratifiedCounts', {
                                                                                                ...formData.kodeEnvStratifiedCounts,
                                                                                                [lvl]: val
                                                                                            });
                                                                                        }}
                                                                                        disabled={maxAvailable === 0}
                                                                                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <div className="mt-3 text-xs flex justify-between items-center px-1 font-mono">
                                                                        <span className="text-gray-500 dark:text-gray-400">Total Stratified Drawn:</span>
                                                                        <span className={`font-bold ${
                                                                            (formData.kodeEnvStratifiedCounts.Easy + formData.kodeEnvStratifiedCounts.Medium + formData.kodeEnvStratifiedCounts.Hard) > formData.kodeEnvQuestionCount ? 'text-red-500 animate-pulse' : 'text-gray-700 dark:text-gray-300'
                                                                        }`}>
                                                                            {formData.kodeEnvStratifiedCounts.Easy + formData.kodeEnvStratifiedCounts.Medium + formData.kodeEnvStratifiedCounts.Hard} / {formData.kodeEnvQuestionCount || 0}
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="text-xs text-indigo-700 dark:text-indigo-300 font-mono">
                                                                    No difficulty categories found in the repository folder structure. Randomization will draw exactly <span className="font-bold text-gray-900 dark:text-white">{formData.kodeEnvQuestionCount}</span> questions randomly from the entire pool, which ensures fair and uniform assessment for all candidates.
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}

                        {/* Assessment Type Selection Cards */}
                        <div className="flex flex-col gap-4">
                            {/* SQL Selection Card */}
                            {!includeSql && (
                                <div className="p-1">
                                    <button
                                        onClick={() => setSelectedRounds(prev => [...prev, 'SQL'])}
                                        className="w-full min-h-[100px] border-2 border-dashed border-blue-400/50 hover:border-blue-500 bg-blue-50/50 dark:bg-blue-900/5 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group py-6"
                                    >
                                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-xl text-blue-600 dark:text-blue-200 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-xl">add</span>
                                        </div>
                                        <span className="text-blue-600 dark:text-blue-400 font-bold group-hover:text-blue-700 dark:group-hover:text-blue-300">Add a SQL Assessment</span>
                                    </button>
                                </div>
                            )}

                            {/* MCQ Selection Card */}
                            {!includeMcq && (
                                <div className="p-1">
                                    <button
                                        onClick={() => setSelectedRounds(prev => [...prev, 'MCQ'])}
                                        className="w-full min-h-[100px] border-2 border-dashed border-sky-300/50 hover:border-sky-500 bg-sky-50/50 dark:bg-sky-900/5 hover:bg-sky-50 dark:hover:bg-sky-900/10 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group py-6"
                                    >
                                        <div className="p-2 bg-sky-100 dark:bg-sky-800 rounded-xl text-sky-600 dark:text-sky-200 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-xl">add</span>
                                        </div>
                                        <span className="text-sky-600 dark:text-sky-400 font-bold group-hover:text-sky-700 dark:group-hover:text-sky-300">Add a MCQ Assessment</span>
                                    </button>
                                </div>
                            )}

                            {/* File Upload Selection Card */}
                            {!includeFileUpload && (
                                <div className="p-1">
                                    <button
                                        onClick={() => setSelectedRounds(prev => [...prev, 'FILE_UPLOAD'])}
                                        className="w-full min-h-[100px] border-2 border-dashed border-purple-300/50 hover:border-purple-500 bg-purple-50/50 dark:bg-purple-900/5 hover:bg-purple-50 dark:hover:bg-purple-900/10 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group py-6"
                                    >
                                        <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-xl text-purple-600 dark:text-purple-200 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-xl">add</span>
                                        </div>
                                        <span className="text-purple-600 dark:text-purple-400 font-bold group-hover:text-purple-700 dark:group-hover:text-purple-300">Add a File Upload Assessment</span>
                                    </button>
                                </div>
                            )}

                            {/* Kode Env Selection Card */}
                            {!includeKodeEnv && (
                                <div className="p-1">
                                    <button
                                        onClick={() => setSelectedRounds(prev => [...prev, 'KODE_ENV'])}
                                        className="w-full min-h-[100px] border-2 border-dashed border-indigo-300/50 hover:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/5 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group py-6"
                                    >
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-xl text-indigo-600 dark:text-indigo-200 group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-xl">terminal</span>
                                        </div>
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Add a Kode Env Assessment</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {(includeSql || includeMcq || includeFileUpload || includeKodeEnv) && (
                        <div className="flex justify-end mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <button
                                onClick={handleSubmit}
                                className="px-8 py-3 rounded-xl text-base font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center"
                            >
                                <span className="material-symbols-outlined text-xl mr-2">check_circle</span>
                                {isEditMode ? 'Update Assessment' : 'Create Assessment'}
                            </button>
                        </div>
                    )}

                    {/* Global Popup Modal */}
                    {popup.isOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-brand-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-white/10">
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
            )
            }
            {/* Assessment Loader Overlay */}
            {isLoading && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-in fade-in duration-300 pointer-events-none ml-64">
                    <AssessmentLoader text={isEditMode ? "Loading Assessment Data..." : "Processing..."} />
                </div>,
                document.body
            )}
        </div >
    );
}

export default CreateAssessment;
