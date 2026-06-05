import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { FaTerminal, FaCopy, FaCheck, FaPlay, FaSync, FaExclamationTriangle } from "react-icons/fa";

// Constants matching CodeModule.jsx
const CODE_LAMBDA_URL = "https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/CODEnv";
const GUACAMOLE_CLIENT_BASE = "https://kastle.labskraft.com/LabsKraft/#/client";

const KodeEnvSection = ({ username, questionCode, cameraStream, onFinish }) => {
    const [instances, setInstances] = useState([]);
    const [selectedInstance, setSelectedInstance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingRdp, setLoadingRdp] = useState(false);
    const [error, setError] = useState(null);
    const [authToken, setAuthToken] = useState(null);
    const [copied, setCopied] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const iframeRef = useRef(null);

    // Auto-focus connection iframe once running to enable immediate keyboard inputs
    useEffect(() => {
        if (selectedInstance?.state?.toLowerCase() === 'running' && iframeRef.current) {
            const timer = setTimeout(() => {
                iframeRef.current?.focus();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [selectedInstance?.state]);

    // Ref for polling
    const selectedIdRef = useRef(null);
    useEffect(() => {
        selectedIdRef.current = selectedInstance?.instanceId;
    }, [selectedInstance]);

    const getStoredPassword = () => {
        return localStorage.getItem("userPassword") || "LabsKraft#2025";
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(questionCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Fetch instances from Lambda
    const fetchInstances = useCallback(async () => {
        if (!username) return;
        setLoading(true);
        setStatusMessage("Fetching virtual environments...");
        try {
            console.log(`[KodeEnvSection] Fetching instances for user: ${username}`);
            const response = await fetch(`${CODE_LAMBDA_URL}?username=${username}`);
            if (!response.ok) throw new Error(`Failed to fetch instances: ${response.status}`);

            const data = await response.json();
            let instancesList = [];
            let bodyData = data.body ? (typeof data.body === 'string' ? JSON.parse(data.body) : data.body) : data;

            if (bodyData.instances && Array.isArray(bodyData.instances)) {
                instancesList = bodyData.instances;
            } else if (Array.isArray(bodyData)) {
                instancesList = bodyData;
            }

            setInstances(instancesList);

            if (instancesList.length > 0) {
                // Find instance containing [KodeEnv] or default to first
                const targetInstance = instancesList.find(inst => inst.instanceName?.includes('[KodeEnv]')) || instancesList[0];
                setSelectedInstance(targetInstance);
                
                const connId = targetInstance.encoded_con_id || targetInstance.connectionId;
                const token = targetInstance.token || targetInstance.authToken;
                if (token) setAuthToken(token);

                // Auto-start if not running
                if (targetInstance.state?.toLowerCase() !== "running" || !connId || !token) {
                    await startInstance(targetInstance.instanceId);
                } else {
                    setLoadingRdp(false);
                }
            } else {
                setError("No Kode Env instances allocated for this user.");
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to load virtual environment.");
        } finally {
            setLoading(false);
        }
    }, [username]);

    // Start instance
    const startInstance = async (instanceId) => {
        if (!username || !instanceId) return;
        setLoading(true);
        setStatusMessage("Powering on environment...");
        try {
            const password = getStoredPassword();
            const url = `${CODE_LAMBDA_URL}?username=${encodeURIComponent(username)}&instanceId=${encodeURIComponent(instanceId)}&password=${encodeURIComponent(password)}&startRdp=true`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to start environment");

            const rawData = await response.json();
            const data = rawData.body ? (typeof rawData.body === 'string' ? JSON.parse(rawData.body) : rawData.body) : rawData;

            const connId = data.encoded_con_id || data.connectionId;
            const token = data.token || data.authToken;
            if (token) setAuthToken(token);

            setSelectedInstance(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    state: data.state || "pending",
                    connectionId: connId || prev.connectionId,
                    token: token || prev.token
                };
            });

            setStatusMessage("Environment start initiated. Polling for connection status...");
            startPolling(instanceId);
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to start environment.");
            setLoading(false);
        }
    };

    // Polling logic
    const startPolling = (instanceId) => {
        let attempts = 0;
        const maxAttempts = 50;
        const pollInterval = 3000;

        const poll = async () => {
            if (attempts >= maxAttempts) {
                setError("Timeout waiting for environment connection. Please refresh or try again.");
                setLoading(false);
                return;
            }
            if (selectedIdRef.current !== instanceId) return; // Stop polling if instance changed
            attempts++;

            try {
                const response = await fetch(`${CODE_LAMBDA_URL}?username=${username}&instanceId=${instanceId}`);
                if (!response.ok) return;

                const rawData = await response.json();
                const statusData = rawData.body ? (typeof rawData.body === 'string' ? JSON.parse(rawData.body) : rawData.body) : rawData;

                const connId = statusData.encoded_con_id || statusData.connectionId || null;
                const token = statusData.token || statusData.authToken || null;

                if (token) setAuthToken(token);

                setSelectedInstance(prev => {
                    if (!prev || prev.instanceId !== instanceId) return prev;
                    return {
                        ...prev,
                        state: statusData.state,
                        connectionId: connId || prev.connectionId,
                        token: token || prev.token
                    };
                });

                if (statusData.state?.toLowerCase() === "running" && connId && token) {
                    setLoading(false);
                    setLoadingRdp(false);
                    setStatusMessage("Connected.");
                } else {
                    setStatusMessage(`Status: ${statusData.state || "pending"} (Attempt ${attempts}/${maxAttempts})...`);
                    setTimeout(poll, pollInterval);
                }
            } catch (e) {
                console.error("Error during polling", e);
                setTimeout(poll, pollInterval);
            }
        };

        setTimeout(poll, pollInterval);
    };

    useEffect(() => {
        fetchInstances();
    }, [fetchInstances]);

    // Automatically shut down all VM instances when the component is unmounted (e.g. on test finish/timer-expiry) or tab is closed
    useEffect(() => {
        const stopAllVms = () => {
            if (instances && instances.length > 0 && username) {
                instances.forEach(inst => {
                    try {
                        const url = `${CODE_LAMBDA_URL}?username=${encodeURIComponent(username)}&instanceId=${encodeURIComponent(inst.instanceId)}&stop=true`;
                        fetch(url, { keepalive: true });
                        console.log(`[KodeEnvSection] Cleanup: Stop environment requested for ${inst.instanceId}`);
                    } catch (e) {
                        console.error("Cleanup stop VM error:", e);
                    }
                });
            }
        };

        const handlePageHide = () => {
            stopAllVms();
        };

        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handlePageHide);

        return () => {
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handlePageHide);
        };
    }, [instances, username]);

    // Handle session end (stops VM and calls parent submit)
    const handleFinishClick = async () => {
        if (!window.confirm("Are you sure you want to finish the Kode Env section and submit your assessment? This will save your progress and shut down the environment.")) {
            return;
        }

        // Stop all instances in background
        if (instances && instances.length > 0 && username) {
            instances.forEach(inst => {
                try {
                    const url = `${CODE_LAMBDA_URL}?username=${encodeURIComponent(username)}&instanceId=${encodeURIComponent(inst.instanceId)}&stop=true`;
                    fetch(url);
                    console.log(`[KodeEnvSection] Stop environment requested for: ${inst.instanceId}`);
                } catch (e) {
                    console.error("Failed to request stop:", e);
                }
            });
        }

        // Call the parent runner onFinish handler
        onFinish();
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] dark:bg-black overflow-hidden relative">
            {/* Header / HUD Banner */}
            <div className="bg-white dark:bg-[#121212] border-b border-gray-200 dark:border-white/5 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0 transition-colors duration-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <FaTerminal className="text-lg" />
                    </div>
                    <div>
                        {instances.length > 1 ? (
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Select Virtual Environment</label>
                                <select
                                    value={selectedInstance?.instanceId || ''}
                                    onChange={async (e) => {
                                        const instId = e.target.value;
                                        const inst = instances.find(x => x.instanceId === instId);
                                        if (inst) {
                                            setLoadingRdp(true);
                                            setSelectedInstance(inst);
                                            const connId = inst.encoded_con_id || inst.connectionId;
                                            const token = inst.token || inst.authToken;
                                            if (token) setAuthToken(token);
                                            
                                            if (inst.state?.toLowerCase() !== "running" || !connId || !token) {
                                                await startInstance(instId);
                                            } else {
                                                setLoadingRdp(false);
                                            }
                                        }
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition-all cursor-pointer font-sans"
                                >
                                    {instances.map(inst => (
                                        <option key={inst.instanceId} value={inst.instanceId}>
                                            {inst.instanceName || inst.instanceId}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                                {selectedInstance?.instanceName || "Kode Env Virtual Machine"}
                            </h2>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Status:</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                selectedInstance?.state?.toLowerCase() === 'running' ? 'text-green-500' : 'text-amber-500 animate-pulse'
                            }`}>
                                {selectedInstance?.state || "Initializing"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Assigned Question Code Area */}
                <div className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl px-4 py-2 flex items-center gap-3 min-w-[200px] max-w-md shadow-sm">
                    <div className="flex-1 min-w-0">
                        <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-0.5">Assigned Question Code</span>
                        <span className="font-mono text-xs font-bold text-gray-900 dark:text-white truncate block" title={questionCode}>
                            {questionCode || "Generating..."}
                        </span>
                    </div>
                    <button
                        onClick={copyToClipboard}
                        className="p-2 bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 border border-gray-100 dark:border-white/10 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm"
                        title="Copy Question Code"
                        disabled={!questionCode}
                    >
                        {copied ? <FaCheck className="text-green-500 text-sm" /> : <FaCopy className="text-sm" />}
                    </button>
                </div>

                {/* Submit and Finish Button */}
                <button
                    onClick={handleFinishClick}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Submit & Finish Assessment
                </button>
            </div>

            {/* Main Interactive Screen Area */}
            <div 
                className="flex-1 min-h-0 relative bg-gray-900"
                onClick={() => {
                    iframeRef.current?.focus();
                }}
            >
                {/* Draggable Proctoring Camera Window */}
                {cameraStream && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        initial={{ opacity: 0, scale: 0.8, x: 20, y: 20 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute bottom-6 right-6 z-[100] bg-black rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-white/10 flex flex-col pointer-events-auto"
                        style={{ resize: 'both', width: '240px', height: '180px', minWidth: '150px', minHeight: '120px', maxWidth: '500px', maxHeight: '400px' }}
                    >
                        <div className="w-full px-3 py-1.5 bg-black/80 flex justify-between items-center cursor-move backdrop-blur-sm shrink-0 border-b border-white/5">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] text-white/80 font-black tracking-widest uppercase select-none">Live Camera</span>
                            </div>
                            <span className="material-symbols-outlined text-white/30 text-[14px]">drag_indicator</span>
                        </div>
                        <div className="relative flex-1 bg-gray-950 w-full h-full min-h-[80px]">
                            <video
                                autoPlay
                                playsInline
                                muted
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-x-[-1]"
                                ref={(video) => {
                                    if (video && video.srcObject !== cameraStream) {
                                        video.srcObject = cameraStream;
                                    }
                                }}
                            />
                            {/* Drag blocker overlay */}
                            <div className="absolute inset-0 bg-transparent pointer-events-none" />
                        </div>
                    </motion.div>
                )}

                {/* VM Guacamole Iframe / Connection Loader */}
                {selectedInstance?.state?.toLowerCase() === 'running' && selectedInstance?.connectionId && (selectedInstance?.token || authToken) ? (
                    <iframe
                        ref={iframeRef}
                        src={`${GUACAMOLE_CLIENT_BASE}/${selectedInstance.connectionId}?token=${encodeURIComponent(selectedInstance.token || authToken)}`}
                        className="w-full h-full border-none"
                        title="Kode Env Virtual Machine"
                        allow="fullscreen; clipboard-read; clipboard-write; display-capture"
                        onLoad={() => {
                            setTimeout(() => {
                                iframeRef.current?.focus();
                            }, 500);
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-4">
                        {error ? (
                            <div className="max-w-md bg-red-950/20 border border-red-500/30 rounded-2xl p-6 text-red-400">
                                <FaExclamationTriangle className="text-3xl mx-auto mb-3 text-red-500" />
                                <h3 className="font-bold text-sm mb-1">Configuration Error</h3>
                                <p className="text-xs text-red-400/80 mb-4">{error}</p>
                                <button
                                    onClick={fetchInstances}
                                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-xl text-xs font-bold uppercase transition-all"
                                >
                                    Retry Connection
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center max-w-sm">
                                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                                <h3 className="text-sm font-bold text-gray-200 mb-1">Connecting to Virtual Machine</h3>
                                <p className="text-xs text-gray-400 leading-relaxed mb-1">{statusMessage}</p>
                                <p className="text-[10px] text-gray-500">First-time boot can take up to 2-3 minutes. Please stay on this screen.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default KodeEnvSection;
