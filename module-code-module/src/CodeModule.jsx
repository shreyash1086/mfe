import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

import { motion, AnimatePresence } from "framer-motion";
import {
  FaWindows,
  FaLinux,
  FaApple,
  FaDesktop,
  FaPowerOff,
  FaRedo,
  FaStop,
  FaServer,
  FaChevronRight,
  FaCircle,
  FaLock,
  FaTerminal,
  FaMemory,
  FaNetworkWired,
} from "react-icons/fa";
import { useTheme } from "./ThemeContext";
import Breadcrumbs from "./Breadcrumbs";
import PageHeader from "sharedDesignSystem/PageHeader";
import VMLoader from "./VMLoader";
import VMEmptyState from "./VMEmptyState";
import RDPLoader from "./RDPLoader";
import { useProctoring } from "./hooks/useProctoring";
import ProctoringWebcam from "./ProctoringWebcam";
import AccessDenied from "./AccessDenied";

// Constants - Use the single Lambda URL for everything as requested
const CODE_LAMBDA_URL =
  "https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/CODEnv";
const GUACAMOLE_CLIENT_BASE = "https://kastle.labskraft.com/LabsKraft/#/client";
const API_UPLOAD_URL =
  "https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/proctoring";
const PROCTOR_INTERVAL = 30000; // 30 seconds for video clips - aligned with AssessmentRunner

// --- UI Components ---

// --- Full Screen Overlay ---
const FullScreenOverlay = ({ onEnter }) => (
  <div className="fixed inset-0 z-[9999] bg-white dark:bg-brand-dark flex flex-col items-center justify-center p-4 text-center">
    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-500">
      <span className="material-symbols-outlined text-4xl">fullscreen</span>
    </div>
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
      Secure CODE Mode
    </h2>
    <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
      This CODE session requires full screen mode and proctoring. Please click
      the button below to start.
    </p>
    <button
      onClick={onEnter}
      className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xl shadow-emerald-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
    >
      <span className="material-symbols-outlined">play_circle</span>
      Enter Full Screen & Start CODE
    </button>
  </div>
);

const StatusBadge = ({ state }) => {
  const getStyles = (s) => {
    switch (s?.toLowerCase()) {
      case "running":
        return {
          bg: "bg-emerald-500/10",
          text: "text-emerald-400",
          border: "border-emerald-500/20",
          glow: "shadow-[0_0_10px_rgba(16,185,129,0.2)]",
        };
      case "stopped":
        return {
          bg: "bg-rose-500/10",
          text: "text-rose-400",
          border: "border-rose-500/20",
          glow: "shadow-[0_0_10px_rgba(244,63,94,0.2)]",
        };
      case "pending":
        return {
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          border: "border-amber-500/20",
          glow: "shadow-[0_0_10px_rgba(245,158,11,0.2)]",
        };
      case "stopping":
        return {
          bg: "bg-orange-500/10",
          text: "text-orange-400",
          border: "border-orange-500/20",
          glow: "shadow-[0_0_10px_rgba(249,115,22,0.2)]",
        };
      default:
        return {
          bg: "bg-gray-500/10",
          text: "text-gray-400",
          border: "border-gray-500/20",
          glow: "",
        };
    }
  };

  const styles = getStyles(state);

  return (
    <div
      className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-2 w-fit transition-all duration-300 ${styles.bg} ${styles.text} ${styles.border} ${styles.glow}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${styles.text.replace("text-", "bg-")} animate-pulse`}
      />
      <span className="capitalize tracking-wider">{state || "Unknown"}</span>
    </div>
  );
};

const OsAvatar = ({ osType, size = "md" }) => {
  const os = osType?.toLowerCase() || "";
  const sz = size === "lg" ? "w-12 h-12 text-2xl" : "w-10 h-10 text-lg";

  if (os.includes("ubuntu")) {
    return (
      <div
        className={`${sz} rounded-2xl flex items-center justify-center bg-orange-100 dark:bg-orange-900/30`}
      >
        <FaLinux className="text-orange-500" />
      </div>
    );
  }
  if (os.includes("linux") || os.includes("unix")) {
    return (
      <div
        className={`${sz} rounded-2xl flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/30`}
      >
        <FaLinux className="text-yellow-500" />
      </div>
    );
  }
  if (os.includes("windows")) {
    return (
      <div
        className={`${sz} rounded-2xl flex items-center justify-center bg-sky-100 dark:bg-sky-900/30`}
      >
        <FaWindows className="text-sky-500" />
      </div>
    );
  }
  if (os.includes("apple") || os.includes("mac")) {
    return (
      <div
        className={`${sz} rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-gray-800`}
      >
        <FaApple className="text-gray-600 dark:text-gray-300" />
      </div>
    );
  }
  return (
    <div
      className={`${sz} rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-gray-800`}
    >
      <FaServer className="text-gray-400" />
    </div>
  );
};

const CodeModule = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading, accessFlags } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const darkMode = theme === "dark";
  const username =
    user?.username || user?.signInDetails?.loginId || user?.name || "";

  // Internal State
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [instanceInfo, setInstanceInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRdp, setLoadingRdp] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  // Proctoring & Session State
  const [step, setStep] = useState("dashboard"); // 'dashboard', 'fullscreen_prompt', 'active_session'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("ok");
  const [screenStream, setScreenStream] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [proctorInterval, setProctorInterval] = useState(null);
  const screenVideoRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const screenRecorderRef = useRef(null);
  const cameraRecorderRef = useRef(null);
  const [sessionAttemptId, setSessionAttemptId] = useState("");

  const { tabSwitchCount, enterFullScreen, exitFullScreen } = useProctoring({
    enableTabSwitchDetection: false,
    enableFullScreen: true, // Monitor fullscreen exits and re-prompt
    enableRestrictions: true,
    onExitFullScreen: () => {
      // Only re-trigger prompt if we are in an active session
      setStep((prev) =>
        prev === "active_session" ? "fullscreen_prompt" : prev,
      );
    },
  });

  // Ref for Safe Polling
  const selectedIdRef = useRef(null);
  useEffect(() => {
    selectedIdRef.current = selectedInstance?.instanceId;
  }, [selectedInstance]);

  const showMessage = useCallback((msg, isError = false) => {
    if (isError) {
      setError(msg);
      setTimeout(() => setError(null), 6000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  }, []);

  // --- Logic & API Calls ---

  const fetchInstances = useCallback(async () => {
    if (!username) return;

    setLoading(true);
    try {
      console.log(`[CodeModule] Fetching instances for user: ${username}`);
      // Use the provided Lambda URL
      const response = await fetch(`${CODE_LAMBDA_URL}?username=${username}`);
      if (!response.ok)
        throw new Error(`Failed to fetch instances: ${response.status}`);

      const data = await response.json();

      // Robust Parsing
      let instancesList = [];
      let bodyData = data.body
        ? typeof data.body === "string"
          ? JSON.parse(data.body)
          : data.body
        : data;

      if (bodyData.instances && Array.isArray(bodyData.instances))
        instancesList = bodyData.instances;
      else if (Array.isArray(bodyData)) instancesList = bodyData;

      // Deduplicate
      const newInstancesMap = new Map();
      instancesList.forEach((item) => {
        if (item && item.instanceId) newInstancesMap.set(item.instanceId, item);
      });

      // Merge & Persist ConnectionId
      setInstances((prev) => {
        const merged = [];
        const prevMap = new Map(prev.map((p) => [p.instanceId, p]));
        newInstancesMap.forEach((newInstance, id) => {
          const prevInstance = prevMap.get(id);
          const mergedInstance = {
            ...newInstance,
            connectionId:
              newInstance.encoded_con_id ||
              newInstance.connectionId ||
              prevInstance?.connectionId ||
              prevInstance?.encoded_con_id,
            token:
              newInstance.token || newInstance.authToken || prevInstance?.token,
          };
          merged.push(mergedInstance);
        });
        return merged;
      });
    } catch (err) {
      setInstances([]);
      showMessage(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [username, showMessage]);

  const fetchInstanceInfo = useCallback(
    async (instanceId) => {
      if (!username || !instanceId) return;
      setLoading(true);
      try {
        const response = await fetch(
          `${CODE_LAMBDA_URL}?username=${username}&instanceId=${instanceId}`,
        );
        if (!response.ok) throw new Error("Failed to fetch instance info");
        let rawData = await response.json();
        let data = rawData.body
          ? typeof rawData.body === "string"
            ? JSON.parse(rawData.body)
            : rawData.body
          : rawData;

        const connId = data.encoded_con_id || data.connectionId || null;
        const token = data.token || data.authToken || null;
        const publicIp = data.publicIp || data.public_ip || null;
        const osType = data.osType || data.os_type || null;

        setInstanceInfo(
          `State: ${data.state || "N/A"}\nOS: ${osType || "N/A"}\nIP: ${publicIp || "N/A"}`,
        );

        const updater = (inst) => {
          if (inst.instanceId !== instanceId) return inst;
          return {
            ...inst,
            state: data.state,
            publicIp: publicIp || inst.publicIp,
            connectionId: connId || inst.connectionId,
            token: token || inst.token,
          };
        };

        setInstances((prev) => prev.map(updater));
        if (selectedInstance?.instanceId === instanceId) {
          setSelectedInstance((prev) => {
            if (!prev || prev.instanceId !== instanceId) return prev;
            return {
              ...prev,
              state: data.state,
              publicIp: publicIp || prev.publicIp,
              connectionId: connId || prev.connectionId,
              token: token || prev.token,
            };
          });
        }
      } catch (err) {
        setInstanceInfo(`Error: ${err.message}`);
        showMessage(err.message, true);
      } finally {
        setLoading(false);
      }
    },
    [username, selectedInstance, showMessage],
  );

  // Actions
  const getStoredPassword = () => {
    return (
      (window.__SHELL_AUTH__ ? window.__SHELL_AUTH__.getPassword() : null) ||
      sessionStorage.getItem("userPassword") ||
      localStorage.getItem("userPassword") ||
      "LabsKraft#2025"
    );
  };

  const uploadToApi = async (base64Image, key) => {
    try {
      const rawInstanceName = selectedInstance?.instanceName || "Unknown";
      const cleanInstanceName = rawInstanceName
        .replace(" [KodeEnv]", "")
        .replace("[KodeEnv]", "")
        .replace(" [HideScore]", "")
        .replace("[HideScore]", "")
        .trim();

      const response = await fetch(API_UPLOAD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Image,
          key: key,
          username: username || "unknown_user",
          assessment: "CodeSession-" + cleanInstanceName,
          attempt: sessionAttemptId || `code_session_${Date.now()}`,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        console.error("Failed to upload image to S3", data);
      }
    } catch (error) {
      console.error("Error uploading to S3:", error);
    }
  };

  const startRecordingClip = (stream, prefix, ref) => {
    if (!stream || !stream.active) return;
    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
        videoBitsPerSecond: 150000,
      });
      ref.current = mediaRecorder;
      let chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: "video/webm" });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64data = reader.result.split(",")[1];
            uploadToApi(base64data, `${prefix}-${username}-${Date.now()}.webm`);
          };
        }
      };
      mediaRecorder.start();
    } catch (e) {
      console.error(`MediaRecorder error:`, e);
    }
  };

  const captureAndUpload = () => {
    if (screenRecorderRef.current?.state === "recording")
      screenRecorderRef.current.stop();
    if (cameraRecorderRef.current?.state === "recording")
      cameraRecorderRef.current.stop();
    if (screenVideoRef.current)
      startRecordingClip(screenVideoRef.current, "screen", screenRecorderRef);
    if (cameraVideoRef.current)
      startRecordingClip(cameraVideoRef.current, "webcam", cameraRecorderRef);
  };

  const stopProctoring = () => {
    if (screenRecorderRef.current?.state === "recording")
      screenRecorderRef.current.stop();
    if (cameraRecorderRef.current?.state === "recording")
      cameraRecorderRef.current.stop();
    if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
    if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
    if (proctorInterval) clearInterval(proctorInterval);
    setScreenStream(null);
    screenVideoRef.current = null;
    setCameraStream(null);
    cameraVideoRef.current = null;
    setProctorInterval(null);
  };

  // Step 1 of session start: request webcam + screen permissions simultaneously
  // Step 2: enter fullscreen
  // Step 3: start the VM instance (ONLY after steps 1 & 2 succeed)
  const handleStartProctoredSession = async () => {
    // --- STEP 1: Request permissions (triggered by user click, so browser allows it) ---
    let camStream, dispStream;
    try {
      [camStream, dispStream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: true, audio: false }),
        navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "monitor" },
          audio: false,
        }),
      ]);
    } catch (permError) {
      console.error("Proctoring permissions denied:", permError);
      alert(
        "⚠️ Both webcam and screen sharing are required to start a CODE session.\n\nError: " +
          permError.message,
      );
      return; // Hard stop — do NOT proceed
    }

    // --- STEP 2: Enter fullscreen (must happen before we show the VM) ---
    try {
      await enterFullScreen();
    } catch (fsError) {
      // Clean up streams if fullscreen fails
      camStream.getTracks().forEach((t) => t.stop());
      dispStream.getTracks().forEach((t) => t.stop());
      console.error("Fullscreen failed:", fsError);
      alert(
        "⚠️ Full screen mode is required. Please allow it in your browser.",
      );
      return; // Hard stop — do NOT proceed
    }

    // --- STEP 3: Generate Session ID & Save streams & start periodic capture ---
    const now = new Date();
    const date = now.toLocaleDateString("en-GB").replace(/\//g, "-"); // DD-MM-YYYY
    const time = now
      .toLocaleTimeString("en-US", { hour12: false })
      .replace(/:/g, "-"); // HH-MM-SS
    const newAttemptId = `code_session_${date}_${time}`;
    setSessionAttemptId(newAttemptId);

    setScreenStream(dispStream);
    screenVideoRef.current = dispStream;
    setCameraStream(camStream);
    cameraVideoRef.current = camStream;

    // Start the first recording chunk immediately
    captureAndUpload();

    const intervalId = setInterval(captureAndUpload, PROCTOR_INTERVAL);
    setProctorInterval(intervalId);

    // --- STEP 4: Show the active session view first, then start the VM ---
    setStep("active_session");
    setLoadingRdp(true);
    // Wait a fixed delay to ensure Guacamole and VM services are somewhat initialized
    setTimeout(async () => {
      // Start the VM — this also fetches the connectionId & token via polling
      await startInstance(selectedInstance.instanceId, getStoredPassword());
      setLoadingRdp(false);
    }, 1500);
  };

  // End session: stop VM → stop proctoring → exit fullscreen → navigate home
  const handleEndSession = async () => {
    const instanceToStop = selectedInstance;

    // Stop proctoring immediately so streams are released
    stopProctoring();

    // Exit fullscreen gracefully
    try {
      exitFullScreen();
    } catch (e) {
      console.warn("exitFullscreen error", e);
    }

    // Reset UI state
    setStep("dashboard");
    setSelectedInstance(null);

    // Stop the VM instance in the background
    if (instanceToStop) {
      try {
        const url = `${CODE_LAMBDA_URL}?username=${encodeURIComponent(username)}&instanceId=${encodeURIComponent(instanceToStop.instanceId)}&stop=true`;
        await fetch(url);
        console.log("CODE instance stop requested.");
      } catch (e) {
        console.error("Failed to stop instance on session end:", e);
      }
    }

    // Navigate back to the main Labskraft dashboard
    navigate("/");
  };

  const startInstance = async (instanceId, password) => {
    if (!username || !instanceId) return;
    setLoading(true);
    try {
      // Updated URL with &&startRdp=true
      const url = `${CODE_LAMBDA_URL}?username=${encodeURIComponent(username)}&instanceId=${encodeURIComponent(instanceId)}&password=${encodeURIComponent(password)}&startRdp=true`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to start instance");
      let rawData = await response.json();
      let data = rawData.body
        ? typeof rawData.body === "string"
          ? JSON.parse(rawData.body)
          : rawData.body
        : rawData;

      const conId = data.encoded_con_id || data.connectionId;
      const token = data.token || data.authToken;
      const publicIp = data.publicIp || data.public_ip;
      if (token) setAuthToken(token);

      const updateCallback = (prev) => {
        if (!prev || prev.instanceId !== instanceId) return prev;
        return {
          ...prev,
          state: data.state || "pending",
          publicIp: publicIp || prev.publicIp,
          connectionId: conId,
          token: token || prev.token,
        };
      };

      setInstances((prev) =>
        prev.map((inst) =>
          inst.instanceId === instanceId
            ? {
                ...inst,
                state: data.state || "pending",
                publicIp: publicIp || inst.publicIp,
                connectionId: conId || inst.connectionId,
                token: token || inst.token,
              }
            : inst,
        ),
      );
      if (selectedInstance?.instanceId === instanceId)
        setSelectedInstance(updateCallback);

      setInstanceInfo(
        `State: ${data.state || "pending"}\nOS: ${selectedInstance?.osType || data.os_type || "N/A"}\nIP: ${publicIp || "N/A"}`,
      );
      showMessage("Instance start initiated...");

      startPolling(instanceId);
    } catch (err) {
      showMessage(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const stopInstance = async (instanceId) => {
    if (!username || !instanceId) return;
    setLoading(true);
    try {
      // Updated URL with &&stop=true
      const url = `${CODE_LAMBDA_URL}?username=${encodeURIComponent(username)}&instanceId=${encodeURIComponent(instanceId)}&stop=true`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to stop instance");
      let rawData = await response.json();
      let data = rawData.body
        ? typeof rawData.body === "string"
          ? JSON.parse(rawData.body)
          : rawData.body
        : rawData;
      const publicIp = data.publicIp || data.public_ip;

      const updateCallback = (prev) => {
        if (!prev || prev.instanceId !== instanceId) return prev;
        return {
          ...prev,
          state: data.state || "stopping",
          publicIp: publicIp || prev.publicIp,
        };
      };

      setInstances((prev) =>
        prev.map((inst) =>
          inst.instanceId === instanceId
            ? {
                ...inst,
                state: data.state || "stopping",
                publicIp: publicIp || inst.publicIp,
              }
            : inst,
        ),
      );
      if (selectedInstance?.instanceId === instanceId)
        setSelectedInstance(updateCallback);

      setInstanceInfo(`State: ${data.state || "stopping"}`);
      startPolling(instanceId);
    } catch (err) {
      showMessage(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (instanceId) => {
    let attempts = 0;
    const maxAttempts = 40;
    const pollInterval = 3000;

    const poll = async () => {
      if (attempts >= maxAttempts) return;
      attempts++;
      try {
        const response = await fetch(
          `${CODE_LAMBDA_URL}?username=${username}&instanceId=${instanceId}`,
        );
        if (!response.ok) return;
        let rawData = await response.json();
        let statusData = rawData.body
          ? typeof rawData.body === "string"
            ? JSON.parse(rawData.body)
            : rawData.body
          : rawData;

        const connId =
          statusData.encoded_con_id || statusData.connectionId || null;
        const token = statusData.token || statusData.authToken || null;
        const publicIp = statusData.publicIp || statusData.public_ip || null;
        const osType = statusData.osType || statusData.os_type || null;
        if (token) setAuthToken(token);

        setInstances((prev) =>
          prev.map((inst) => {
            if (inst.instanceId !== instanceId) return inst;
            return {
              ...inst,
              state: statusData.state,
              publicIp: publicIp || inst.publicIp,
              connectionId: connId || inst.connectionId,
              token: token || inst.token,
            };
          }),
        );

        if (selectedIdRef.current === instanceId) {
          setSelectedInstance((prev) => {
            if (!prev || prev.instanceId !== instanceId) return prev;
            return {
              ...prev,
              state: statusData.state,
              publicIp: publicIp || prev.publicIp,
              connectionId: connId || prev.connectionId,
              token: token || prev.token,
            };
          });
          setInstanceInfo(
            `State: ${statusData.state}\nOS: ${osType || "N/A"}\nIP: ${publicIp || "N/A"}`,
          );
        }

        if (statusData.state && statusData.state.toLowerCase() === "running") {
          showMessage(`Instance is running. Initializing connection...`);
        } else if (
          statusData.state &&
          statusData.state.toLowerCase() !== "pending" &&
          statusData.state.toLowerCase() !== "stopping" &&
          statusData.state.toLowerCase() !== "starting"
        ) {
          showMessage(`Instance is ${statusData.state}`);
        } else {
          setTimeout(poll, pollInterval);
        }
      } catch (e) {
        console.error("Poll error", e);
      }
    };
    setTimeout(poll, pollInterval);
  };

  const connectRDP = async (password) => {
    if (!selectedInstance) return;

    if (!username || !password) {
      window.location.href = "/login";
      return;
    }

    // Show Full Screen Prompt
    setStep("fullscreen_prompt");
  };

  useEffect(() => {
    if (username) fetchInstances();
  }, [username, fetchInstances]);

  const runningCount = instances.filter((i) => i.state === "running").length;

  if (authLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-black">
        <VMLoader text="Authenticating..." />
      </div>
    );
  }

  if (!accessFlags?.kode_access) {
    return <AccessDenied />;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-black text-gray-800 dark:text-gray-100 font-['Poppins',sans-serif] transition-colors duration-500 relative">
      {/* Overlays */}
      {step === "fullscreen_prompt" && (
        <FullScreenOverlay onEnter={handleStartProctoredSession} />
      )}

      {step === "active_session" && (
        <div
          className="fixed inset-0 z-[99999] bg-black flex flex-col"
          style={{ isolation: "isolate" }}
        >
          <div className="flex-1 relative">
            {/* Proctoring HUD - top left */}
            <div className="absolute top-4 left-4 z-[100] flex items-center gap-3 pointer-events-none">
              <div className="px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                  Active Monitoring
                </span>
              </div>
            </div>

            {/* End Session Button - top right */}
            <div className="absolute top-4 right-4 z-[100] pointer-events-auto">
              <button
                onClick={handleEndSession}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  stop_circle
                </span>
                End CODE Session
              </button>
            </div>

            {/* Draggable & Resizable Camera Preview */}
            {cameraStream && (
              <motion.div
                drag
                dragMomentum={false}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute bottom-6 right-6 z-[100] bg-black rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.5)] border-2 border-white/10 flex flex-col pointer-events-auto"
                style={{
                  resize: "both",
                  width: "280px",
                  height: "240px",
                  minWidth: "150px",
                  minHeight: "150px",
                  maxWidth: "600px",
                  maxHeight: "600px",
                }}
              >
                <div className="w-full px-3 py-2 bg-black/80 flex justify-between items-center cursor-move backdrop-blur-md shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-white/90 font-bold tracking-widest uppercase select-none">
                      Live Camera
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-white/40 text-[14px]">
                    drag_indicator
                  </span>
                </div>
                <div className="relative flex-1 bg-gray-900 w-full h-full min-h-[120px]">
                  <video
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    ref={(video) => {
                      if (video && video.srcObject !== cameraStream) {
                        video.srcObject = cameraStream;
                      }
                    }}
                  />
                  {/* Transparent overlay so dragging doesn't get swallowed by video */}
                  <div className="absolute inset-0 pointer-events-none bg-transparent" />
                </div>
              </motion.div>
            )}

            {/* VM iframe Container */}
            {selectedInstance?.state === "running" &&
            selectedInstance?.connectionId &&
            (selectedInstance?.token || authToken) ? (
              <iframe
                src={`${GUACAMOLE_CLIENT_BASE}/${selectedInstance.connectionId}?token=${encodeURIComponent(selectedInstance.token || authToken)}`}
                className="w-full h-full border-none"
                title="CODE Session"
                allow="fullscreen; clipboard-read; clipboard-write; display-capture"
              />
            ) : (
              // Show spinner while polling for connectionId / token
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-sm font-semibold text-gray-300">
                  {selectedInstance?.state === "pending" ||
                  selectedInstance?.state === "starting"
                    ? "Preparing CODE environment, please wait…"
                    : "Starting CODE instance, please wait…"}
                </p>
                <p className="text-xs text-gray-500">
                  This may take 1–3 minutes depending on OS initialization.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="relative z-10 flex-1 p-2 md:p-6 w-full flex items-start justify-center">
        <div className="w-full h-full flex gap-6">
          {/* Left: Instance List */}
          <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.5,
              type: "spring",
              stiffness: 100,
              damping: 20,
            }}
            className="flex-1 min-w-0"
          >
            <PageHeader
              title="Kode Env"
              onRefresh={fetchInstances}
              loading={loading}
              actions={
                <>
                  {/* Total Instances Mini Card */}
                  <div className="flex items-center gap-4 px-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Total Code Env
                      </span>
                      <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                        {instances.length}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <FaTerminal className="text-emerald-500 text-lg" />
                    </div>
                  </div>

                  {/* Active Mini Card */}
                  <div className="flex items-center gap-4 px-4 border-l border-gray-100 dark:border-white/10">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Active
                      </span>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">
                        {runningCount}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                  </div>
                </>
              }
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {loading && instances.length === 0 ? (
                <div className="col-span-full h-96 flex flex-col items-center justify-center">
                  <VMLoader text="Fetching Code Environments..." scale={0.8} />
                </div>
              ) : instances.length === 0 ? (
                <div className="col-span-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[32px] bg-gray-50/50 dark:bg-white/5">
                  <VMEmptyState />
                </div>
              ) : (
                instances.map((inst) => (
                  <motion.div
                    key={inst.instanceId}
                    layoutId={inst.instanceId}
                    onClick={() => {
                      setSelectedInstance(inst);
                      fetchInstanceInfo(inst.instanceId);
                    }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative cursor-pointer group overflow-hidden rounded-[32px] p-6 border transition-all duration-300 ${
                      selectedInstance?.instanceId === inst.instanceId
                        ? "bg-white dark:bg-brand-card border-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/30"
                        : "bg-white dark:bg-brand-card border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md hover:border-emerald-500/30"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <OsAvatar osType={inst.osType} />
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight break-all">
                            {inst.instanceName || "Code Instance"}
                          </h3>
                        </div>
                      </div>
                      <StatusBadge state={inst.state} />
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-200/50 dark:border-white/5">
                      <FaChevronRight
                        className={`transition-transform duration-300 text-gray-400 ${selectedInstance?.instanceId === inst.instanceId ? "rotate-90 text-emerald-500" : ""}`}
                      />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Right: Floating Management Panel */}
          <AnimatePresence>
            {selectedInstance && (
              <motion.div
                initial={{ opacity: 0, x: 50, rotateY: -10 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: 50, rotateY: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 120 }}
                className="w-[420px] shrink-0 sticky top-0 h-full flex flex-col"
              >
                <div className="h-full flex flex-col rounded-[24px] overflow-hidden border border-gray-100 dark:border-white/8 bg-white dark:bg-[#111] shadow-2xl">
                  {/* Compact Header */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/8 shrink-0">
                    <OsAvatar osType={selectedInstance.osType} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h2
                        className="text-base font-bold text-gray-900 dark:text-white truncate"
                        title={selectedInstance.instanceName || "Instance"}
                      >
                        {selectedInstance.instanceName || "Instance"}
                      </h2>
                      <StatusBadge state={selectedInstance.state} />
                    </div>
                    <button
                      onClick={() => setSelectedInstance(null)}
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        close
                      </span>
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 px-5 py-5 space-y-4 overflow-hidden">
                    {/* Connect Button */}
                    <button
                      onClick={() => connectRDP(getStoredPassword())}
                      disabled={
                        selectedInstance.state !== "running" ||
                        !selectedInstance.connectionId ||
                        !(selectedInstance.token || authToken) ||
                        loading ||
                        loadingRdp
                      }
                      className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                      <FaDesktop className="text-base" />
                      {loadingRdp
                        ? "Preparing Connection..."
                        : "Launch CODE IDE"}
                    </button>

                    {(selectedInstance.state === "running" ||
                      selectedInstance.state === "pending") &&
                      selectedInstance.osType
                        ?.toLowerCase()
                        .includes("windows") && (
                        <p className="text-[11px] text-gray-400 text-center -mt-2">
                          Code environments may take 1-3 min to be ready after
                          start.
                        </p>
                      )}

                    {/* Power Controls */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                        Power Controls
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            startInstance(
                              selectedInstance.instanceId,
                              getStoredPassword(),
                            )
                          }
                          disabled={
                            selectedInstance.state === "running" ||
                            selectedInstance.state === "pending" ||
                            loading
                          }
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <FaPowerOff className="text-emerald-500" /> Start
                        </button>
                        <button
                          onClick={() =>
                            stopInstance(selectedInstance.instanceId)
                          }
                          disabled={
                            selectedInstance.state !== "running" || loading
                          }
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <FaStop className="text-rose-500" /> Stop
                        </button>
                      </div>
                    </div>

                    {/* System Output */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          System Output
                        </p>
                        <button
                          onClick={() =>
                            fetchInstanceInfo(selectedInstance.instanceId)
                          }
                          className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors"
                        >
                          Refresh
                        </button>
                      </div>
                      <div className="rounded-xl bg-[#0a0a0a] border border-white/5 p-3 font-mono text-[11px] text-emerald-400 leading-relaxed whitespace-pre-wrap">
                        {instanceInfo || "> Waiting for environment logs..."}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Messages Toast */}
        <AnimatePresence>
          {(error || successMessage) && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl backdrop-blur-xl border shadow-2xl z-50 flex items-center gap-3 ${
                error
                  ? "bg-rose-50 dark:bg-rose-500/20 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-200"
                  : "bg-emerald-50 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${error ? "bg-rose-500" : "bg-emerald-500"} animate-pulse`}
              />
              {error || successMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Full Screen Loading Overlay for RDP */}
      <AnimatePresence>
        {loadingRdp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150]"
          >
            <RDPLoader />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CodeModule;
