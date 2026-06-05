import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useTheme } from './ThemeContext';
import BreadcrumbsComp from './Breadcrumbs';
import TerminalLoader from './TerminalLoader';
import AccessDenied from './AccessDenied';
import PageHeader from 'sharedDesignSystem/PageHeader';
import Card from 'sharedDesignSystem/Card';

// ----------------------------- CONFIG -----------------------------
// MODIFIED: Only one environment task
const tasks = [
    { id: 'task1', title: 'Kode Environment' },
];

const START_TASK_URL =
    'https://tc5sjttyob5a7yqd47mbdnj22a0lqfqo.lambda-url.ap-south-1.on.aws/';

const GUACAMOLE_CLIENT_BASE = 'https://kastle.labskraft.com/LabsKraft/#/client';


const PROCTOR_INTERVAL = 5000; // 5 seconds
const PROCTOR_TIMEOUT = 2 * 60 * 1000; // 2 minutes
const API_UPLOAD_URL =
    'https://eukxtli4wdh53wjm6vnh64tqqu0ppgji.lambda-url.ap-south-1.on.aws/';

// -----------------------------------------------------------------

const TaskCard = ({ task, onClick, loading }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
    >
        <div onClick={() => !loading && onClick(task.id)} className="w-full cursor-pointer">
            <Card hoverEffect={!loading}>
                <div className="flex flex-col items-center justify-center min-h-[170px]">
                    <div className="w-14 h-14 bg-brand-accent/10 text-brand-accent rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110">
                        <span className="material-symbols-outlined text-3xl">terminal</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center">
                        {task.title}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm text-center">Click to access your assessment environment</p>
                </div>
            </Card>
        </div>
    </motion.div>
);


const CodeEnvironment = () => {
    const { user, loading: authLoading, accessFlags } = useAuth();
    const { theme, toggleTheme } = useTheme();

    if (authLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-black">
                <TerminalLoader />
            </div>
        );
    }

    if (!accessFlags.kode_access) {
        return <AccessDenied />;
    }

    const darkMode = theme === 'dark';
    const [token, setToken] = useState('');
    const storedPassword = localStorage.getItem('userPassword') || '';

    useEffect(() => {
        const getToken = async () => {
            try {
                const session = await fetchAuthSession();
                setToken(session.tokens?.idToken?.toString() || '');
            } catch (err) {
                console.error("Failed to fetch auth session", err);
            }
        };
        getToken();
    }, []);

    const [showTasks, setShowTasks] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [candidateName, setCandidateName] = useState('');
    const [queCode, setQueCode] = useState('');
    const [kodeEnvLoading, setKodeEnvLoading] = useState(false);
    const [assignedCodes, setAssignedCodes] = useState({});
    
    // Extract cohort from username
    const SOURCE_COHORT = (() => {
        if (!user?.username) return 'loud-vm';
        const parts = user.username.split('-');
        if (parts.length >= 2) {
            return parts[0] + '-' + parts[1];
        }
        return 'loud-vm';
    })();
    console.log('[CodeEnvironment] Derived Cohort:', SOURCE_COHORT, 'from user:', user?.username);

    // Proctoring
    const [screenStream, setScreenStream] = useState(null);
    const [cameraStream, setCameraStream] = useState(null);
    const [proctorInterval, setProctorInterval] = useState(null);
    const screenVideoRef = useRef(null);
    const cameraVideoRef = useRef(null);

    // Snackbar / Toast state
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ ...toast, show: false }), 6000);
    };

    // ----------------------------- CONFIG -----------------------------
    const QUESCODE_API_BASE = process.env.QUESCODE_API_BASE ||
        (process.env.NODE_ENV === 'development' ? '/quescode-fetch-api' : 'https://64whx2c4ir65zu5l2ocpuobnxm0lpzph.lambda-url.ap-south-1.on.aws');

    // Fetch and assign Question Codes on Mount
    useEffect(() => {
        const initializeCodes = async () => {
            try {
                const baseUrl = QUESCODE_API_BASE || '';

                const listUrl = baseUrl.includes('?')
                    ? `${baseUrl}&cohort=${SOURCE_COHORT}`
                    : `${baseUrl}?cohort=${SOURCE_COHORT}`;

                const listResp = await fetch(listUrl, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!listResp.ok) {
                    const text = await listResp.text();
                    throw new Error(`List failed ${listResp.status}: ${text}`);
                }
                const listData = await listResp.json();

                if (listData.success && listData.files && listData.files.length > 0) {
                    let targetFile = listData.files.includes('default') ? 'default' : listData.files[0];

                    const contentUrl = baseUrl.includes('?')
                        ? `${baseUrl}&cohort=${SOURCE_COHORT}&filename=${targetFile}`
                        : `${baseUrl}?cohort=${SOURCE_COHORT}&filename=${targetFile}`;

                    const contentResp = await fetch(contentUrl, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (!contentResp.ok) {
                        const text = await contentResp.text();
                        throw new Error(`Content fetch failed ${contentResp.status}: ${text}`);
                    }
                    const contentData = await contentResp.json();

                    if (contentData.success && contentData.content) {
                        const newContent = contentData.content;
                        const contentToParse = newContent;

                        let codes = [];
                        try {
                            const parsed = JSON.parse(contentToParse);
                            if (Array.isArray(parsed)) {
                                codes = parsed;
                            } else {
                                codes = [contentToParse];
                            }
                        } catch (e) {
                            const rawText = contentToParse.trim();
                            if (rawText.includes(' ') || rawText.includes('\n') || rawText.includes(',')) {
                                codes = rawText.split(/[\s,]+/).filter(c => c.length > 0);
                            } else {
                                codes = [rawText];
                            }
                        }

                        const newAssignments = {};
                        const availableCodes = [...codes];

                        tasks.forEach(task => {
                            if (availableCodes.length > 0) {
                                const randomIndex = Math.floor(Math.random() * availableCodes.length);
                                newAssignments[task.id] = availableCodes[randomIndex];
                            } else if (codes.length > 0) {
                                newAssignments[task.id] = codes[0];
                            }
                        });

                        setAssignedCodes(newAssignments);
                    }
                }
            } catch (err) {
                console.error("Failed to initialize quescode assignments", err);
            }
        };

        if (user?.username) {
            initializeCodes();
        }
    }, [user?.username]);

    const handleEnvironmentClick = (taskId) => {
        const task = tasks.find((t) => t.id === taskId);
        setSelectedTask(task);
        setShowForm(true);
        setShowTasks(false);
        setShowCode(false);
        setQueCode('');
    };

    const handleBackToTasks = () => {
        setShowForm(false);
        setShowCode(false);
        setSelectedTask(null);
        setCandidateName('');
        setQueCode('');
        setShowTasks(true);
    };

    const handleGetQuestionCode = async () => {
        if (!candidateName.trim()) {
            showToast('Please enter a valid candidate name', 'error');
            return;
        }

        if (selectedTask && selectedTask.id && assignedCodes[selectedTask.id]) {
            setQueCode(assignedCodes[selectedTask.id]);
            setShowCode(true);
            showToast('Quescode loaded', 'success');
            return;
        }

        if (assignedCodes && Object.keys(assignedCodes).length > 0) {
            const firstKey = Object.keys(assignedCodes)[0];
            setQueCode(assignedCodes[firstKey]);
            setShowCode(true);
            showToast('Quescode loaded', 'success');
            return;
        }

        showToast('No quescode assigned for this environment. Please contact admin.', 'warning');
    };

    const handleCopyCode = () => {
        if (queCode) {
            navigator.clipboard.writeText(queCode);
            showToast('Code copied to clipboard', 'success');
        }
    };

    // Proctoring functions
    const startProctoring = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                showToast('Camera/Screen access requires HTTPS. Please use a secure connection.', 'error');
                return false;
            }

            let cameraStream;
            try {
                cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            } catch (e) {
                if (e.name === 'NotAllowedError') {
                    alert('Camera access denied. Please enable it.');
                    return false;
                }
                throw e;
            }

            let screen;
            let attempts = 0;
            while (attempts < 3) {
                try {
                    screen = await navigator.mediaDevices.getDisplayMedia({
                        video: { displaySurface: 'monitor' },
                    });
                    const track = screen.getVideoTracks()[0];
                    if (track) break;
                } catch (e) {
                    attempts++;
                }
            }
            if (!screen && attempts >= 3) {
                alert('Must share entire screen.');
                return false;
            }

            if (!screen) return false;

            setScreenStream(screen);
            setCameraStream(cameraStream);
            if (screenVideoRef.current) screenVideoRef.current.srcObject = screen;
            if (cameraVideoRef.current) cameraVideoRef.current.srcObject = cameraStream;

            const interval = setInterval(captureAndUpload, PROCTOR_INTERVAL);
            setProctorInterval(interval);

            setTimeout(() => {
                clearInterval(interval);
                stopProctoring();
                showToast('Proctoring timed out (2 min)', 'info');
            }, PROCTOR_TIMEOUT);

            return true;
        } catch (error) {
            showToast('Proctoring error: ' + error.message, 'error');
            return false;
        }
    };

    const stopProctoring = () => {
        if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
        if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
        if (proctorInterval) clearInterval(proctorInterval);
        setScreenStream(null);
        setCameraStream(null);
        setProctorInterval(null);
    };

    const captureAndUpload = async () => {
        try {
            if (!screenVideoRef.current || !cameraVideoRef.current) return;

            if (screenVideoRef.current.videoWidth === 0 || screenVideoRef.current.videoHeight === 0) {
                console.warn("Screen video not ready yet");
                return;
            }
            if (cameraVideoRef.current.videoWidth === 0 || cameraVideoRef.current.videoHeight === 0) {
                console.warn("Camera video not ready yet");
            }

            const screenCanvas = document.createElement('canvas');
            screenCanvas.width = screenVideoRef.current.videoWidth;
            screenCanvas.height = screenVideoRef.current.videoHeight;
            screenCanvas.getContext('2d').drawImage(screenVideoRef.current, 0, 0);
            const screenBase64 = screenCanvas.toDataURL('image/png').split(',')[1];

            const camCanvas = document.createElement('canvas');
            camCanvas.width = cameraVideoRef.current.videoWidth;
            camCanvas.height = cameraVideoRef.current.videoHeight;
            camCanvas.getContext('2d').drawImage(cameraVideoRef.current, 0, 0);
            const camBase64 = camCanvas.toDataURL('image/png').split(',')[1];

            await fetch(API_UPLOAD_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    image: screenBase64,
                    key: `screenshot-${user?.username}-${Date.now()}.png`,
                    username: user?.username,
                }),
            });

            await fetch(API_UPLOAD_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    image: camBase64,
                    key: `webcam-${user?.username}-${Date.now()}.png`,
                    username: user?.username,
                }),
            });
        } catch (e) {
            console.error('Upload failed', e);
        }
    };

    const handleStartEnv = async () => {
        if (!selectedTask) return;

        try {
            const proctorStarted = await startProctoring();
            if (!proctorStarted) {
                return;
            }

            setKodeEnvLoading(true);

            const username = user?.username;
            const password = storedPassword;

            if (!username) {
                showToast('User not authenticated locally', 'error');
                setKodeEnvLoading(false);
                return;
            }
            if (!password) {
                showToast('Session expired or password missing. Please relogin.', 'error');
                setKodeEnvLoading(false);
                return;
            }

            const startUrl = `${START_TASK_URL}?username=${encodeURIComponent(
                username
            )}&password=${encodeURIComponent(password)}&taskId=${encodeURIComponent(
                selectedTask.id
            )}`;

            const startResp = await fetch(startUrl);
            if (!startResp.ok) {
                const err = await startResp.text();
                throw new Error(err || 'Failed to start task');
            }
            const startData = await startResp.json();

            const encodedId =
                startData?.guacamole_setup?.response?.encoded_connection_id;
            if (!encodedId) throw new Error('No connection ID returned. Backend response may be invalid.');

            const guacToken = startData.token || startData.authToken || startData?.guacamole_setup?.response?.authToken;
            if (!guacToken) throw new Error('No auth token returned from backend.');

            const clientUrl = `${GUACAMOLE_CLIENT_BASE}/${encodedId}?token=${encodeURIComponent(
                guacToken
            )}`;
            window.open(clientUrl, '_blank');

            showToast('Environment started – RDP opened in new tab', 'success');
        } catch (error) {
            showToast(error.message || 'Failed to start environment', 'error');
            stopProctoring();
        } finally {
            setKodeEnvLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-100 font-['Poppins',sans-serif] transition-colors duration-500 relative">
            <div className="px-6 pt-6 pb-3 w-full flex-1 flex flex-col mx-auto">
                <PageHeader 
                  title="Kode Environment" 
                  actions={showForm && selectedTask && (
                      <BreadcrumbsComp items={[
                          { label: 'Kode Environment', path: null, onClick: handleBackToTasks },
                          { label: selectedTask.title }
                      ]} transparent={true} className="mb-0" />
                  )}
                />

                <div className="flex-1 pb-24">
                    {/* Hidden videos for proctoring */}
                    <video ref={screenVideoRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -10 }} autoPlay muted playsInline />
                    <video ref={cameraVideoRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -10 }} autoPlay muted playsInline />

                    {showTasks && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full space-y-6"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                                {tasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onClick={handleEnvironmentClick}
                                        loading={kodeEnvLoading}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full space-y-6"
                        >
                            {/* Form Card */}
                            <div className="w-full flex justify-center pb-12 mt-4">
                                <div className="w-full max-w-2xl bg-white dark:bg-brand-card border border-gray-100 dark:border-white/5 rounded-[24px] sm:rounded-[32px] p-8 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-black/20 text-center">
                                    <div className="space-y-6 sm:space-y-8">
                                        <div className="text-left">
                                            <label htmlFor="candidateName" className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-2 uppercase tracking-wide">
                                                Candidate Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative group">
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-accent transition-colors">person</span>
                                                <input
                                                    id="candidateName"
                                                    type="text"
                                                    value={candidateName}
                                                    onChange={(e) => {
                                                        setCandidateName(e.target.value);
                                                        if (showCode) setShowCode(false);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && candidateName.trim() && !kodeEnvLoading) {
                                                            handleGetQuestionCode();
                                                        }
                                                    }}
                                                    disabled={kodeEnvLoading}
                                                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/5 focus:ring-2 focus:ring-brand-accent focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 transition-all outline-none font-medium text-base text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                                    placeholder="Enter your full name"
                                                    autoComplete="name"
                                                    spellCheck="false"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleGetQuestionCode}
                                            disabled={!candidateName.trim() || kodeEnvLoading}
                                            className={`w-full py-4 text-white font-bold text-sm tracking-wide rounded-xl transition-all uppercase flex items-center justify-center gap-2 ${!candidateName.trim() || kodeEnvLoading
                                                ? 'bg-brand-accent/40 cursor-not-allowed shadow-none'
                                                : 'bg-brand-accent hover:bg-brand-accent-hover shadow-lg shadow-brand-accent/20 active:scale-[0.98]'
                                                }`}
                                        >
                                            {showCode ? 'Regenerate Question Code' : 'Get Question Code'}
                                        </button>

                                        <AnimatePresence>
                                            {showCode && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="text-left pt-6 pb-2 px-1">
                                                        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 mb-2 uppercase tracking-wide">Access Code Generated</p>
                                                        <div className="flex items-center justify-between mb-6 bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-inner">
                                                            <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white select-all tracking-wider">
                                                                {queCode}
                                                            </div>
                                                            <button
                                                                onClick={handleCopyCode}
                                                                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-gray-400 hover:text-red-600 transition-all"
                                                                title="Copy Code"
                                                            >
                                                                <span className="material-symbols-outlined">content_copy</span>
                                                            </button>
                                                        </div>

                                                        <button
                                                            onClick={handleStartEnv}
                                                            className="w-full py-4 font-bold text-sm tracking-wide rounded-xl transition-all flex items-center justify-center gap-2 uppercase shadow-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-[0.98]"
                                                        >
                                                            <span className="material-symbols-outlined">rocket_launch</span>
                                                            Launch Environment
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Full Screen Terminal Loader */}
                    <AnimatePresence>
                        {kodeEnvLoading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex flex-col items-center justify-center p-4"
                            >
                                <TerminalLoader />
                                <p className="text-white font-mono mt-6 animate-pulse text-lg tracking-widest">
                                    LAUNCHING VIRTUAL MACHINE...
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Toast Notification */}
                    <AnimatePresence>
                        {toast.show && (
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 min-w-[300px]"
                            >
                                <div className={`
              px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border backdrop-blur-md
              ${toast.type === 'error' ? 'bg-red-50/90 dark:bg-red-900/90 text-red-800 dark:text-white border-red-200 dark:border-red-800' :
                                        toast.type === 'warning' ? 'bg-yellow-50/90 dark:bg-yellow-900/90 text-yellow-800 dark:text-white border-yellow-200 dark:border-yellow-800' :
                                            'bg-brand-accent/10 dark:bg-brand-accent/10 text-brand-accent border-brand-accent/20 dark:border-brand-accent/20'}
            `}>
                                    <span className="material-symbols-outlined">
                                        {toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : 'check_circle'}
                                    </span>
                                    <p className="font-medium text-sm">{toast.message}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default CodeEnvironment;
