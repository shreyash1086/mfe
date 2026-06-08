
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import Breadcrumbs from '../components/Breadcrumbs';
import { ASSESSMENT_API_BASE_URL } from '../api';
import AssessmentLoader from '../components/AssessmentLoader';
import PageHeader from 'sharedDesignSystem/PageHeader';
import Card from 'sharedDesignSystem/Card';

const inferCohortFromUser = (username) => {
  if (!username) return null;

  // RULE MATCHING PYTHON LAMBDA:
  // Logic: 'ABC-DEF-GHI' -> Cohort 'ABC-DEF'
  // We strictly take the first two parts if available.
  if (username.includes('-')) {
    const parts = username.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1]}`;
    }
  }

  // Fallback: If no hyphen, or only 1 part? Return whole.
  // (Though "dev" might not be a valid cohort if the standard is "dev-team")
  return username;
};

function AssessmentsList() {
  const navigate = useNavigate();
  const { userRole, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Admin Upload View State
  const [viewMode, setViewMode] = useState('list'); // 'list', 'uploads'
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [uploadData, setUploadData] = useState([]);

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

  // Breadcrumbs
  const breadcrumbItems = viewMode === 'uploads' ? [
    { label: 'Assessment', path: '/assessment' },
    {
      label: 'All Assessments',
      onClick: () => {
        setViewMode('list');
        setSelectedAssessment(null);
      }
    },
    { label: 'File Uploads' }
  ] : [
    { label: 'Assessment', path: '/assessment' },
    { label: 'All Assessments' }
  ];

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();

    const suffix = (d) => {
      if (d > 3 && d < 21) return 'th';
      switch (d % 10) {
        case 1: return "st";
        case 2: return "nd";
        case 3: return "rd";
        default: return "th";
      }
    };

    return `${day}${suffix(day)} ${month} ${year}`;
  };

  useEffect(() => {
    if (user && userRole) {
      fetchAssessments();
    }
  }, [user, userRole]);

  const fetchAssessments = async () => {
    try {
      // 1. Fetch Cohorts & Derive User's Cohort
      let derivedCohort = null;

      // FALLBACK: Read from LocalStorage directly as requested by user
      // "IN THE LOCAL STORAGE I STORE THE USER NAME AND ALL ATLEAST FROM THAT TRY TO FILTER"
      const getUsernameFromStorage = () => {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.endsWith('.LastAuthUser')) {
              return localStorage.getItem(key);
            }
          }
        } catch (e) { console.warn("LS Read Error", e); }
        return null;
      };

      const storedUsername = getUsernameFromStorage();
      // console.log('[AssessmentsList] User check:', { contextUser: user?.username, storedUser: storedUsername });

      // Prioritize Context, but fallback to Storage if context is empty OR if user specifically wants "dev-team-user3"
      const effectiveUsername = user?.username || storedUsername;

      if (effectiveUsername) {
        // Use robust helper First
        derivedCohort = inferCohortFromUser(effectiveUsername);

        // console.log(`[AssessmentList] Derived Cohort for ${user?.username || effectiveUsername}: ${derivedCohort}`);

        // Fallback to strict startswith check against cached list if helper was too generic
        if (!derivedCohort) {
          try {
            let cohortsList = [];
            const cachedCohorts = sessionStorage.getItem('cached_cohorts');
            if (cachedCohorts) {
              const parsed = JSON.parse(cachedCohorts);
              cohortsList = parsed.map(c => typeof c === 'string' ? c : c.name || c);
            } else {
              // Optimistic fetch
              const res = await fetch('https://x6uz5z6ju2.execute-api.us-west-2.amazonaws.com/SQLAdmin?type=cohorts');
              if (res.ok) {
                const data = await res.json();
                cohortsList = data.cohorts || [];
                sessionStorage.setItem('cached_cohorts', JSON.stringify(cohortsList));
              }
            }
            const match = cohortsList.find(c => effectiveUsername.startsWith(c));
            if (match) derivedCohort = match;
          } catch (e) { console.warn("Cohort derivation minor error", e); }
        }
      }

      // Adjust derivedCohort: If inferCohortFromUser returns something like "labs-kraft-trainer", we might want just "labs-kraft"
      // The helper in Reports handled "candidate-labs-kraft-user" -> "labs-kraft".
      // Here, for "trainer-labs-kraft", the helper defined above returns "labs-kraft". Correct.


      // 2. Prepare Query Params
      const params = new URLSearchParams();
      if (userRole) params.append('role', userRole);
      if (effectiveUsername) params.append('username', effectiveUsername);
      if (derivedCohort) params.append('cohort', derivedCohort);

      const response = await fetch(`${ASSESSMENT_API_BASE_URL}/assessments?${params.toString()}&t=${Date.now()}`);
      if (response.ok) {
        let data = await response.json();

        // console.log(`[AssessmentsList] Received ${data.length} assessments from backend`);

        // FRONTEND ACCESS CONTROL: Additional client-side filtering
        // This matches the Content module's approach of enforcing cohort restrictions on the frontend
        if (userRole === 'candidate' && derivedCohort) {
          const cleanCohort = derivedCohort.toLowerCase().trim();

          data = data.filter(assessment => {
            const assignedCohort = assessment.assigned_cohort || assessment.cohort;

            // If no cohort assigned, check if it's assigned to this specific user
            if (!assignedCohort) {
              return assessment.assigned_user === effectiveUsername;
            }

            // Parse cohort data (could be string or JSON array)
            let cohortList = [];
            try {
              const parsed = JSON.parse(assignedCohort);
              cohortList = Array.isArray(parsed) ? parsed : [assignedCohort];
            } catch (e) {
              cohortList = [assignedCohort];
            }

            // Check if user's cohort matches any assigned cohort - EXACT MATCH ONLY
            const hasAccess = cohortList.some(c => {
              if (typeof c !== 'string') return false;
              const cLower = c.toLowerCase().trim();
              // Use exact match to prevent false positives (e.g., "dev" shouldn't match "dev-team")
              return cLower === cleanCohort;
            });

            return hasAccess || assessment.assigned_user === effectiveUsername;
          });


          // console.log(`[AssessmentsList] After frontend filtering: ${data.length} assessments accessible to cohort "${derivedCohort}"`);
        }



        // 3. Strict Client-Side Filtering for Trainers
        // Trainers fetch ALL assessments (because backend doesn't filter them), so we filter here.
        // Candidates rely on Backend filtering.
        if (userRole === 'trainer' && derivedCohort) {
          const cleanCohort = derivedCohort.toLowerCase().trim();
          data = data.filter(a => {
            // Trainer should only see ACTIVE assessments
            if (!a.is_active) return false;

            let raw = a.assigned_cohort || a.cohort;

            // Special Case: If assigned_cohort is null, check if assigned_user matches current user
            if (!raw) {
              return a.assigned_user === user.username;
            }

            let assignedList = [];
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) assignedList = parsed;
              else assignedList = [raw];
            } catch (e) {
              assignedList = [raw];
            }

            // Check if cleanCohort matches any in the list - EXACT MATCH ONLY
            const matchesCohort = assignedList.some(c => {
              // Guard against Object structure if bad data was saved
              let cVal = c;
              if (typeof c === 'object' && c !== null) cVal = c.value || '';
              if (typeof cVal !== 'string') return false;

              const cLower = cVal.toLowerCase().trim();
              // Use exact match to prevent false positives
              return cLower === cleanCohort;
            });

            // Also allow if specific user is assigned (override cohort filter)
            const matchesUser = a.assigned_user === user.username;

            return matchesCohort || matchesUser;
          });
        }

        setAssessments(data);
      } else {
        console.error('Failed to fetch assessments');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id, name) => {
    showConfirm("Delete Assessment", `Are you sure you want to delete assessment "${name}"?`, () => performDelete(id));
  };

  const performDelete = async (id) => {
    try {
      const response = await fetch(`${ASSESSMENT_API_BASE_URL}/assessments/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showAlert("Success", 'Assessment deleted successfully');
        fetchAssessments();
      } else {
        const err = await response.json();
        showAlert("Error", `Failed to delete: ${err.message}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      showAlert("Error", 'An error occurred while deleting.');
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (e, assessment) => {
    e.stopPropagation(); // Prevent card click
    const newStatus = !assessment.is_active;

    // Optimistic UI Update
    setAssessments(prev => prev.map(a =>
      a.id === assessment.id ? { ...a, is_active: newStatus } : a
    ));

    try {
      const response = await fetch(`${ASSESSMENT_API_BASE_URL}/assessments/${assessment.id}/status`, {
        method: 'PATCH', // Changed to PATCH
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      // Success - silent update
    } catch (error) {
      console.error('Toggle error:', error);
      showAlert("Error", "Failed to update assessment status");
      // Revert on failure
      setAssessments(prev => prev.map(a =>
        a.id === assessment.id ? { ...a, is_active: !newStatus } : a
      ));
    }
  };

  // Helper: Handle View Uploads
  const handleViewUploads = async (assessment) => {
    setSelectedAssessment(assessment);
    setLoading(true);
    setUploadData({ references: [], submissions: [] }); // Reset to new structure

    try {
      const res = await fetch(`${ASSESSMENT_API_BASE_URL}/reports/admin/assessment/${assessment.id}/uploads`);
      if (res.ok) {
        const data = await res.json();
        // Handle both new and old (array) response formats for safety/transition
        if (Array.isArray(data)) {
          setUploadData({ references: [], submissions: data });
        } else {
          setUploadData(data);
        }
        setViewMode('uploads');
      } else {
        showAlert("Error", "Failed to fetch uploads");
      }
    } catch (e) {
      console.error(e);
      showAlert("Error", "Network Error");
    } finally {
      setLoading(false);
    }
  };

  // ... (rest of code)

  // Cohort Filter State
  const [selectedCohort, setSelectedCohort] = useState('All');

  const renderUploads = () => {
    if (viewMode !== 'uploads' || !selectedAssessment) return null;

    // 1. Extract Unique Cohorts
    const cohorts = ['All'];
    if (uploadData.submissions) {
      const unique = new Set(uploadData.submissions.map(s => s.cohort || 'Unknown').filter(Boolean));
      // Sort cohorts alphanumerically
      Array.from(unique).sort().forEach(c => cohorts.push(c));
    }

    // 2. Filter Submissions
    const filteredSubmissions = selectedCohort === 'All'
      ? uploadData.submissions
      : uploadData.submissions.filter(s => (s.cohort || 'Unknown') === selectedCohort);

    return (
      <div className="flex-1 overflow-auto animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Header Section */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedAssessment.name}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                File Upload Submissions
              </p>
            </div>
            <div className="flex items-center gap-2">
            <button
                onClick={() => handleViewUploads(selectedAssessment)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-brand-accent hover:bg-brand-accent/10 transition-all"
                title="Refresh Submissions"
              >
                <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
              </button>
              <div className="bg-brand-accent/10 text-brand-accent px-3 py-1.5 rounded-lg font-semibold text-xs">
                Total: {filteredSubmissions?.length || 0}
              </div>
            </div>
          </div>

          {/* Cohort Chips */}
          {cohorts.length > 1 && (
            <div className="flex flex-wrap gap-2 mt-4 pb-2 border-b border-gray-100 dark:border-white/5">
              {cohorts.map(cohort => (
                <button
                  key={cohort}
                  onClick={() => setSelectedCohort(cohort)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedCohort === cohort
                    ? 'bg-brand-accent text-white font-bold shadow-md shadow-brand-accent/25'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10'
                    }`}
                >
                  {cohort === 'All' ? 'All Cohorts' : cohort}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reference File Card (If Available) - Render from independent references array */}
        {uploadData.references?.length > 0 && (
          <div className="mb-6 space-y-4">
            {uploadData.references.map((ref, idx) => (
              <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 rounded-xl border border-purple-100 dark:border-white/5">
                <h3 className="text-xs font-bold text-purple-900 dark:text-purple-100 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">description</span>
                  Reference Material
                </h3>
                <div className="flex items-center justify-between bg-white dark:bg-black/20 p-3 rounded-lg border border-purple-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <span className="material-symbols-outlined text-[20px]">attach_file</span>
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate" title={ref.file.name}>
                        {ref.file.name || 'Reference File'}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {ref.title || 'For reference'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={ref.file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submissions List */}
        <div className="space-y-3 pb-8">
          {/* Submissions List Grouped by User */}
          <div className="space-y-4 pb-8">
            {filteredSubmissions?.map((group) => (
              <div key={group.userId} className="group bg-white dark:bg-brand-card rounded-xl p-5 border border-gray-100 dark:border-white/5 hover:border-brand-accent/30 dark:hover:border-brand-accent/30 transition-all shadow-sm hover:shadow-md">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  {/* User & Cohort Info */}
                  <div className="flex items-start gap-4 min-w-[200px]">
                    <div className="w-10 h-10 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent text-sm font-bold shadow-sm">
                      {group.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                        {group.username}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          ID: {group.userId}
                        </span>
                        {group.cohort && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300">
                            Cohort: {group.cohort}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">history</span>
                        Last update: {new Date(group.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Files List */}
                  <div className="flex-1 w-full bg-gray-50 dark:bg-black/20 rounded-xl p-3 border border-gray-100 dark:border-white/5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">folder</span>
                        Submitted Files ({group.files.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {group.files.map((file, fIdx) => (
                        <div key={fIdx} className="flex items-center justify-between bg-white dark:bg-brand-card p-2 rounded-lg border border-gray-200 dark:border-white/5 hover:border-brand-accent/30 dark:hover:border-brand-accent/30 transition-colors group/file">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded bg-brand-accent/10 flex items-center justify-center text-brand-accent shrink-0">
                              <span className="material-symbols-outlined text-[18px]">description</span>
                            </div>
                            <div className="min-w-0 pr-2">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate" title={file.fileName}>
                                {file.fileName}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                <span>{file.questionTitle}</span>
                                <span>•</span>
                                <span>{new Date(file.submittedAt).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          </div>

                          {file.fileUrl ? (
                            <a
                              href={file.fileUrl}
                              download
                              className="px-3 py-1.5 bg-gray-100 hover:bg-blue-600 dark:bg-white/10 dark:hover:bg-blue-600 text-gray-600 dark:text-gray-300 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                              title="Download"
                            >
                              <span className="material-symbols-outlined text-[14px]">download</span>
                              Download
                            </a>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-400 rounded text-[10px]">
                              Missing
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {(!uploadData.submissions || uploadData.submissions.length === 0) && !loading && (
              <div className="text-center py-16 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                <div className="w-14 h-14 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                  <span className="material-symbols-outlined text-2xl">folder_off</span>
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">No Submissions Yet</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  When users upload files, they will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Helper to check if it is a Kode Env Assessment via name tag
  const isKodeEnvAssessment = (assessment) => {
    return assessment && assessment.name && assessment.name.includes('[KodeEnv]');
  };

  const getDisplayName = (assessment) => {
    if (!assessment || !assessment.name) return '';
    return assessment.name.replace(' [KodeEnv]', '').replace('[KodeEnv]', '').replace(' [HideScore]', '').replace('[HideScore]', '').trim();
  };

  // Filter Logic
  const filteredAssessments = assessments.filter(assessment => {
    const cleanName = getDisplayName(assessment);
    const matchesSearch = cleanName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Helper to check for File Upload type
  const hasFileUpload = (assessment) => {
    if (!assessment.round_types) return false;
    let types = assessment.round_types;
    if (typeof types === 'string') {
      // Try parsing as JSON first
      try {
        const parsed = JSON.parse(types);
        if (Array.isArray(parsed)) types = parsed;
      } catch (e) {
        // If parsing fails, treat as comma-separated string
        types = types.split(',');
      }
    }
    return Array.isArray(types) && types.includes('FILE_UPLOAD');
  };

  return (
    <div className="w-full px-6 pb-2 md:pb-4 pt-0 font-['Poppins',sans-serif] bg-gray-50 dark:bg-brand-dark min-h-screen transition-colors duration-300 flex flex-col">
      <div className="w-full flex-1 flex flex-col mx-auto space-y-2">

        <PageHeader 
          title="All Assessments" 
          actions={
            <button
              onClick={() => navigate('/assessment')}
              className="h-10 px-5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-750 dark:text-gray-300 text-[11px] font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back
            </button>
          }
        />

        {/* Breadcrumbs container removed as it's now in header */}

        {renderUploads()}

        {/* List Content */}
        {viewMode === 'list' && (
          <div className="flex-1 min-h-0 space-y-3 pb-20">
            {loading ? (
              <div className="min-h-[200px]"></div>
            ) : filteredAssessments.length > 0 ? (
              filteredAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className={`group bg-white dark:bg-brand-card rounded-3xl p-4 md:p-5 border border-gray-100 dark:border-white/5 hover:border-brand-accent/20 dark:hover:border-brand-accent/30 hover:shadow-lg hover:shadow-brand-accent/5 transition-all duration-300 flex flex-col md:flex-row items-start md:items-center gap-4 ${!assessment.is_active && userRole === 'admin' ? 'opacity-75' : ''}`}
                >
                  {/* Icon & Info */}
                  <div className="flex-1 flex items-start md:items-center gap-4 min-w-0 w-full">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${assessment.status === 'ACTIVE'
                      ? 'bg-brand-accent/10 text-brand-accent'
                      : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                      <span className="material-symbols-outlined text-2xl">
                        {isKodeEnvAssessment(assessment) ? 'terminal' :
                          assessment.name.toLowerCase().includes('sql') ? 'database' :
                            assessment.name.toLowerCase().includes('mcq') ? 'checklist' : 'assignment'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-brand-accent transition-colors">
                          {getDisplayName(assessment)}
                        </h3>
                        {/* Admin Status Chip */}
                        {userRole === 'admin' && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${assessment.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                            {assessment.is_active ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span className="flex items-center gap-1 font-medium">
                          {formatDate(assessment.created_at)}
                        </span>
                        {(assessment.assigned_cohort || assessment.cohort) && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">group</span>
                            {(() => {
                              const raw = assessment.assigned_cohort || assessment.cohort;
                              try {
                                const parsed = JSON.parse(raw);
                                return Array.isArray(parsed) ? parsed.join(', ') : raw;
                              } catch (e) {
                                return raw;
                              }
                            })()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-white/5">

                    <div className="flex items-center gap-2">
                      {/* Toggle Switch (Admin Only) */}
                      {userRole === 'admin' && (
                        <div className="flex items-center mr-2">
                          <button
                            onClick={(e) => handleToggleActive(e, assessment)}
                            className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${assessment.is_active ? 'bg-brand-accent' : 'bg-gray-300 dark:bg-gray-600'}`}
                            title={assessment.is_active ? "Deactivate" : "Activate"}
                          >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${assessment.is_active ? 'translate-x-4' : 'translate-x-0'}`}></div>
                          </button>
                        </div>
                      )}

                      {/* Start Button */}
                      {(() => {
                        const now = new Date();
                        const hasStarted = !assessment.start_time || new Date(assessment.start_time) <= now;
                        const hasExpired = assessment.end_time && new Date(assessment.end_time) < now;

                        if (hasExpired) {
                          return (
                            <span className="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 font-bold text-sm flex items-center gap-2 border border-gray-200 dark:border-gray-700">
                              <span className="material-symbols-outlined text-[18px]">timer_off</span>
                              Expired
                            </span>
                          );
                        }
                        if (!hasStarted) {
                          return (
                            <span className="px-4 py-2 rounded-xl bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400 font-bold text-sm flex items-center gap-2 border border-yellow-200 dark:border-yellow-900/50">
                              <span className="material-symbols-outlined text-[18px]">schedule</span>
                              Upcoming
                            </span>
                          );
                        }
                        return (
                          <button
                            onClick={() => {
                              sessionStorage.removeItem(`submitted_prev_${assessment.id}`);
                              sessionStorage.removeItem(`attempt_id_${assessment.id}`);
                              navigate(`/assessment/${assessment.id}/take`);
                            }}
                            className="px-5 py-2 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-white shadow-lg shadow-brand-accent/20 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 text-sm font-bold"
                          >
                            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                            Start
                          </button>
                        );
                      })()}

                      {/* Admin Actions */}
                      {userRole === 'admin' && (
                        <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-white/10 ml-2">
                          <button
                            onClick={() => navigate(`/assessment/create-assessment?edit=${assessment.id}`)}
                            className="p-2.5 rounded-xl bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors shadow-sm"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(assessment.id, getDisplayName(assessment))}
                            className="p-2.5 rounded-xl bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shadow-sm"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>

                      )}

                      {/* View Uploads (Admin + File Upload Type Only) */}
                      {userRole === 'admin' && hasFileUpload(assessment) && (
                        <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-white/10 ml-2">
                          <button
                            onClick={() => handleViewUploads(assessment)}
                            className="p-2.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors shadow-sm"
                            title="View Uploads"
                          >
                            <span className="material-symbols-outlined text-[20px]">folder_open</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-gray-400">assignment_late</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No assessments found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? `No matches for "${searchQuery}"` : "Get started by creating a new assessment."}
                </p>
              </div>
            )}
          </div>
        )}


      </div>

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
  );
}


export default AssessmentsList;