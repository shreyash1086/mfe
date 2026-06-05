import React, { useState, useEffect, useCallback, useRef } from "react";
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
import AccessDenied from "./AccessDenied";

// Constants
const START_INSTANCE_URL =
  "https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/StartInstance";
const STOP_INSTANCE_URL =
  "https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/StopInstance";
const REBOOT_INSTANCE_URL =
  "https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/rebootInstance";
const GET_INSTANCE_INFO_URL =
  "https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/GetInfo";
// Reverted to direct URL as requested (CORS bypass disabled)
const GUACAMOLE_CLIENT_BASE = "https://kastle.labskraft.com/LabsKraft/#/client";

// --- UI Components ---

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

// Clean OS Avatar - colored icon badge
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

// Keep OsIcon for backward compat (not used in cards anymore)
const OsIcon = ({ osType, dark }) => <OsAvatar osType={osType} size="md" />;

const VmManagement = () => {
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

    // Cache Check
    const cacheKey = `vms_cache_${username}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log("Loading instances from cache");
          setInstances(parsed);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error("Cache parsing error", e);
        sessionStorage.removeItem(cacheKey);
      }
    }

    setLoading(true);
    try {
      console.log(`Fetching instances for user: ${username}`);
      const response = await fetch(
        `${GET_INSTANCE_INFO_URL}?username=${username}`,
      );
      if (!response.ok)
        throw new Error(`Failed to fetch instances: ${response.status}`);

      const data = await response.json();

      // Robust Parsing
      let instancesList = [];
      if (data.instances && Array.isArray(data.instances))
        instancesList = data.instances;
      else if (Array.isArray(data)) instancesList = data;
      else if (typeof data === "string") {
        try {
          const parsed = JSON.parse(data);
          if (parsed.instances && Array.isArray(parsed.instances))
            instancesList = parsed.instances;
          else if (Array.isArray(parsed)) instancesList = parsed;
        } catch (e) {
          console.error("Parse error", e);
        }
      } else if (data.body) {
        try {
          const parsed =
            typeof data.body === "string" ? JSON.parse(data.body) : data.body;
          if (parsed.instances && Array.isArray(parsed.instances))
            instancesList = parsed.instances;
          else if (Array.isArray(parsed)) instancesList = parsed;
        } catch (e) {
          console.error("Body parse error", e);
        }
      }

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

  // Cache Persistence
  useEffect(() => {
    if (username && instances.length > 0) {
      sessionStorage.setItem(
        `vms_cache_${username}`,
        JSON.stringify(instances),
      );
    }
  }, [username, instances]);

  const fetchInstanceInfo = useCallback(
    async (instanceId) => {
      if (!username || !instanceId) return;
      setLoading(true);
      try {
        const response = await fetch(
          `${GET_INSTANCE_INFO_URL}?username=${username}&instanceId=${instanceId}`,
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
    // Try shell bridge first (preferred)
    if (window.__SHELL_AUTH__?.getPassword) {
      const bridgePassword = window.__SHELL_AUTH__.getPassword();
      if (bridgePassword) return bridgePassword;
    }
    // Fallback to sessionStorage (for standalone dev)
    return sessionStorage.getItem("userPassword") || "";
  };

  const startInstance = async (instanceId, password) => {
    if (!username || !instanceId) return;
    setLoading(true);
    try {
      const url = `${START_INSTANCE_URL}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&instance_id=${encodeURIComponent(instanceId)}`;
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

  const stopInstance = async (instanceId, password) => {
    if (!username || !instanceId) return;
    setLoading(true);
    try {
      const url = `${STOP_INSTANCE_URL}?username=${encodeURIComponent(username)}&instanceId=${encodeURIComponent(instanceId)}`;
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

  const rebootInstance = async (instanceId, password) => {
    if (!username || !instanceId) return;
    setLoading(true);
    try {
      const url = `${REBOOT_INSTANCE_URL}?username=${encodeURIComponent(username)}&instanceId=${encodeURIComponent(instanceId)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to reboot instance");

      setInstanceInfo("State: Rebooting...");
      showMessage("Instance reboot initiated...");
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
          `${GET_INSTANCE_INFO_URL}?username=${username}&instanceId=${instanceId}`,
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

        if (
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
    const targetInstanceId = selectedInstance.instanceId;

    if (!username || !password) {
      setLoadingRdp(false);
      window.location.href = "/login";
      return;
    }

    // 1. OPEN WINDOW SYNCHRONOUSLY to legally bypass all popup blockers
    const rdpWindow = window.open("about:blank", "_blank");

    if (!rdpWindow) {
      showMessage(
        "Browser blocked the popup window. Please allow popups for this site.",
        true,
      );
      return;
    }

    // 2. Inject the beautiful RDPLoader CSS and HTML natively into the empty tab
    const loaderHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authenticating LabsKraft RDP...</title>
                <style>
                    body {
                        margin: 0; padding: 0; background: #000; color: #fff;
                        display: flex; align-items: center; justify-content: center; height: 100vh;
                        font-family: monospace; overflow: hidden;
                    }
                    .loader-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; }
                    .loader { scale: 4; height: 50px; width: 40px; }
                    .box { position: relative; opacity: 0; left: 10px; }
                    .side-left { position: absolute; background-color: #286cb5; width: 19px; height: 5px; transform: skew(0deg, -25deg); top: 14px; left: 10px; }
                    .side-right { position: absolute; background-color: #2f85e0; width: 19px; height: 5px; transform: skew(0deg, 25deg); top: 14px; left: -9px; }
                    .side-top { position: absolute; background-color: #5fa8f5; width: 20px; height: 20px; rotate: 45deg; transform: skew(-20deg, -20deg); }
                    .box-1 { animation: from-left 4s infinite; }
                    .box-2 { animation: from-right 4s infinite; animation-delay: 1s; }
                    .box-3 { animation: from-left 4s infinite; animation-delay: 2s; }
                    .box-4 { animation: from-right 4s infinite; animation-delay: 3s; }
                    @keyframes from-left {
                        0% { z-index: 20; opacity: 0; translate: -20px -6px; }
                        20% { z-index: 10; opacity: 1; translate: 0px 0px; }
                        40% { z-index: 9; translate: 0px 4px; }
                        60% { z-index: 8; translate: 0px 8px; }
                        80% { z-index: 7; opacity: 1; translate: 0px 12px; }
                        100% { z-index: 5; translate: 0px 30px; opacity: 0; }
                    }
                    @keyframes from-right {
                        0% { z-index: 20; opacity: 0; translate: 20px -6px; }
                        20% { z-index: 10; opacity: 1; translate: 0px 0px; }
                        40% { z-index: 9; translate: 0px 4px; }
                        60% { z-index: 8; translate: 0px 8px; }
                        80% { z-index: 7; opacity: 1; translate: 0px 12px; }
                        100% { z-index: 5; translate: 0px 30px; opacity: 0; }
                    }
                    .text { margin-top: 100px; color: #60a5fa; font-size: 14px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
                </style>
            </head>
            <body>
                <div class="loader-container">
                    <div class="loader">
                        <div class="box box-1"><div class="side-left"></div><div class="side-right"></div><div class="side-top"></div></div>
                        <div class="box box-2"><div class="side-left"></div><div class="side-right"></div><div class="side-top"></div></div>
                        <div class="box box-3"><div class="side-left"></div><div class="side-right"></div><div class="side-top"></div></div>
                        <div class="box box-4"><div class="side-left"></div><div class="side-right"></div><div class="side-top"></div></div>
                    </div>
                    <div class="text">Establishing Secure RDP Connection...</div>
                </div>
            </body>
            </html>
        `;

    rdpWindow.document.open();
    rdpWindow.document.write(loaderHTML);
    rdpWindow.document.close();

    try {
      setLoadingRdp(true); // Keep local state just in case we need it for UI disabling

      // 3. Hit START API to either start the VM or get fresh token for running VM
      const url = `${START_INSTANCE_URL}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&instance_id=${encodeURIComponent(targetInstanceId)}`;
      const response = await fetch(url);

      if (!response.ok) {
        rdpWindow.close();
        throw new Error("Failed to prepare instance");
      }

      let rawData = await response.json();
      let data = rawData.body
        ? typeof rawData.body === "string"
          ? JSON.parse(rawData.body)
          : rawData.body
        : rawData;

      let currentState = data.state || selectedInstance.state;
      let publicIp =
        data.publicIp || data.public_ip || selectedInstance.publicIp;
      let conId =
        data.encoded_con_id ||
        data.connectionId ||
        selectedInstance.connectionId;
      let token =
        data.token || data.authToken || selectedInstance.token || authToken;

      if (token) setAuthToken(token);

      const updateCallback = (prev) => {
        if (!prev || prev.instanceId !== targetInstanceId) return prev;
        return {
          ...prev,
          state: currentState,
          publicIp: publicIp,
          connectionId: conId,
          token: token,
        };
      };

      setInstances((prev) =>
        prev.map((inst) =>
          inst.instanceId === targetInstanceId ? updateCallback(inst) : inst,
        ),
      );
      if (selectedIdRef.current === targetInstanceId) {
        setSelectedInstance(updateCallback);
        setInstanceInfo(
          `State: ${currentState}\nOS: ${selectedInstance.osType || data.os_type || "N/A"}\nIP: ${publicIp || "N/A"}`,
        );
      }

      // 4. Poll until running
      const maxAttempts = 60;
      const pollInterval = 3000;
      let attempts = 0;

      const checkAndConnect = () => {
        if (currentState === "running" && conId && token) {
          const clientUrl = `${GUACAMOLE_CLIENT_BASE}/${conId}?token=${encodeURIComponent(token)}`;

          // REDIRECT the authentic, unblocked window
          rdpWindow.location.href = clientUrl;

          showMessage("RDP Session Launched");
          setLoadingRdp(false);
          return true;
        }
        return false;
      };

      if (checkAndConnect()) return;

      const poll = async () => {
        attempts++;
        if (attempts >= maxAttempts) {
          setLoadingRdp(false);
          rdpWindow.close();
          showMessage("Instance failed to start in time.", true);
          return;
        }

        try {
          const infoUrl = `${GET_INSTANCE_INFO_URL}?username=${encodeURIComponent(username)}&instanceId=${encodeURIComponent(targetInstanceId)}`;
          const res = await fetch(infoUrl);
          if (res.ok) {
            const infoRaw = await res.json();
            const infoData = infoRaw.body
              ? typeof infoRaw.body === "string"
                ? JSON.parse(infoRaw.body)
                : infoRaw.body
              : infoRaw;

            currentState = infoData.state;
            publicIp = infoData.publicIp || infoData.public_ip || publicIp;

            setInstances((prev) =>
              prev.map((inst) =>
                inst.instanceId === targetInstanceId
                  ? { ...inst, state: currentState, publicIp: publicIp }
                  : inst,
              ),
            );
            if (selectedIdRef.current === targetInstanceId) {
              setSelectedInstance((prev) =>
                prev ? { ...prev, state: currentState, publicIp } : null,
              );
              setInstanceInfo(
                `State: ${currentState}\nOS: ${selectedInstance.osType || infoData.os_type || "N/A"}\nIP: ${publicIp || "N/A"}`,
              );
            }

            if (checkAndConnect()) return;
          }
        } catch (e) {
          console.error("Poll error", e);
        }
        setTimeout(poll, pollInterval);
      };
      setTimeout(poll, pollInterval);
    } catch (err) {
      rdpWindow.close();
      showMessage(`Failed to connect RDP: ${err.message}`, true);
      setLoadingRdp(false);
    }
  };

  useEffect(() => {
    if (username) fetchInstances();
  }, [username, fetchInstances]);

  // --- Render ---
  const runningCount = instances.filter((i) => i.state === "running").length;

  if (authLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-brand-dark">
        <VMLoader text="Authenticating..." />
      </div>
    );
  }

  if (!accessFlags?.rdp_access) {
    return <AccessDenied />;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-brand-dark text-gray-800 dark:text-gray-100 font-['Poppins',sans-serif] transition-colors duration-500 overflow-y-auto relative hide-scrollbar">
      <main className="relative z-10 flex-1 p-2 md:p-6 w-full flex items-stretch justify-stretch">
        <div className="w-full h-full flex gap-6 items-stretch">
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
            className="flex-1 min-w-0 w-full"
          >
            {/* Pill Header */}
            <PageHeader
              title="Virtual Machine"
              onRefresh={fetchInstances}
              loading={loading}
              actions={
                <>
                  {/* Total Instances Mini Card */}
                  <div className="flex items-center gap-4 px-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Total VMs
                      </span>
                      <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">
                        {instances.length}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <FaServer className="text-blue-500 text-lg" />
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
                  <VMLoader text="Fetching Virtual Machines..." scale={0.8} />
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
                        ? "bg-white dark:bg-brand-card border-blue-500 shadow-[0_4px_20px_rgba(59,130,246,0.1)] ring-1 ring-blue-500/30"
                        : "bg-white dark:bg-brand-card border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md hover:border-blue-500/30"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <OsAvatar osType={inst.osType} />
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight break-all">
                            {inst.instanceName || "Cloud Instance"}
                          </h3>
                        </div>
                      </div>
                      <StatusBadge state={inst.state} />
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-200/50 dark:border-white/5">
                      <FaChevronRight
                        className={`transition-transform duration-300 text-gray-400 ${selectedInstance?.instanceId === inst.instanceId ? "rotate-90 text-blue-500" : ""}`}
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
                <div className="h-full flex flex-col rounded-[24px] overflow-hidden border border-gray-100 dark:border-white/8 bg-white dark:bg-brand-card shadow-2xl">
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
                        selectedInstance.state === "stopping" ||
                        loading ||
                        loadingRdp
                      }
                      className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                      <FaDesktop className="text-base" />
                      {loadingRdp
                        ? "Preparing Connection..."
                        : "Connect via RDP"}
                    </button>

                    {(selectedInstance.state === "running" ||
                      selectedInstance.state === "pending") &&
                      selectedInstance.osType
                        ?.toLowerCase()
                        .includes("windows") && (
                        <p className="text-[11px] text-gray-400 text-center -mt-2">
                          Windows VMs may take 1-3 min to be RDP-ready after
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
                            stopInstance(
                              selectedInstance.instanceId,
                              getStoredPassword(),
                            )
                          }
                          disabled={
                            selectedInstance.state !== "running" || loading
                          }
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <FaStop className="text-rose-500" /> Stop
                        </button>
                        <button
                          onClick={() =>
                            rebootInstance(
                              selectedInstance.instanceId,
                              getStoredPassword(),
                            )
                          }
                          disabled={
                            selectedInstance.state !== "running" || loading
                          }
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <FaRedo className={loading ? "animate-spin" : ""} />{" "}
                          Reboot
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
                          className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest transition-colors"
                        >
                          Refresh
                        </button>
                      </div>
                      <div className="rounded-xl bg-[#0a0a0a] border border-white/5 p-3 font-mono text-[11px] text-green-400 leading-relaxed whitespace-pre-wrap">
                        {instanceInfo || "> Waiting for system logs..."}
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

export default VmManagement;
