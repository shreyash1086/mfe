import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";

const START_INSTANCE_URL = "https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/StartInstance";
const STOP_INSTANCE_URL = "https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/StopInstance";
const REBOOT_INSTANCE_URL = "https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/rebootInstance";
const GET_INSTANCE_INFO_URL = "https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/GetInfo";

const GUACAMOLE_TOKEN_URL = "https://kastle.labskraft.com/LabsKraft/api/tokens";
const GUACAMOLE_CLIENT_BASE = "https://kastle.labskraft.com/LabsKraft/#/client";

export const useVmManagement = () => {
    const { user, userPassword } = useAuth();
    const username = user?.username;

    // Use password from context
    const password = userPassword || "";

    const [instances, setInstances] = useState([]);
    const [selectedInstance, setSelectedInstance] = useState(null);
    const [instanceInfo, setInstanceInfo] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [authToken, setAuthToken] = useState(null);

    const showMessage = (msg, isError = false) => {
        setError(isError ? msg : null);
        // Auto clear error after 5s
        if (isError) setTimeout(() => setError(null), 5000);
    };

    // 1. Fetch all allocated instances
    const fetchInstances = useCallback(async (isAutoRefresh = false) => {
        if (!username) return;

        // Only set loading true if it's a manual refresh (not auto-polling)
        if (!isAutoRefresh) setLoading(true);

        try {
            const response = await fetch(`${GET_INSTANCE_INFO_URL}?username=${username}`);
            if (!response.ok) throw new Error("Failed to fetch instances");
            const data = await response.json();
            setInstances(data.instances || []);
            // showMessage("Instances loaded successfully");
        } catch (err) {
            setInstances([]);
            showMessage(err.message, true);
        } finally {
            if (!isAutoRefresh) setLoading(false);
        }
    }, [username]);

    // Polling logic
    useEffect(() => {
        if (!username) return;

        // Initial fetch
        fetchInstances();

        // Check if any instance is in a transition state
        const hasTransitioningInstances = instances.some(inst => {
            const state = (inst.State?.Name || inst.state || "").toLowerCase();
            return state === 'pending' || state === 'stopping';
        });

        // Set interval based on state
        const intervalTime = hasTransitioningInstances ? 5000 : 30000;

        const intervalId = setInterval(() => {
            fetchInstances(true); // Pass true to avoid loading spinner
        }, intervalTime);

        return () => clearInterval(intervalId);
    }, [username, instances, fetchInstances]);

    // 2. Get detailed info & status of a specific instance
    // 2. Get detailed info & status of a specific instance
    const fetchInstanceInfo = useCallback(async (instanceId) => {
        if (!username || !instanceId) return;

        setLoading(true);
        try {
            const response = await fetch(
                `${GET_INSTANCE_INFO_URL}?username=${username}&instanceId=${instanceId}`
            );
            if (!response.ok) throw new Error("Failed to fetch instance info");

            const data = await response.json();
            const formatted = `State: ${data.state || "N/A"}\nOS: ${data.osType || "N/A"}\nIP: ${data.publicIp || "N/A"}`;

            setInstanceInfo(formatted);

            // Sync state across lists
            setInstances((prev) =>
                prev.map((inst) =>
                    inst.instanceId === instanceId
                        ? { ...inst, state: data.state, publicIp: data.publicIp }
                        : inst
                )
            );

            if (selectedInstance?.instanceId === instanceId) {
                setSelectedInstance((prev) => ({
                    ...prev,
                    state: data.state,
                    publicIp: data.publicIp,
                }));
            }

            showMessage("Status refreshed");
        } catch (err) {
            setInstanceInfo(`Error: ${err.message}`);
            showMessage(err.message, true);
        } finally {
            setLoading(false);
        }
    }, [username, selectedInstance]);

    // 3. Start VM
    // 3. Start VM
    const startInstance = useCallback(async (instanceId) => {
        if (!username || !password || !instanceId) {
            showMessage("Missing credentials or instance ID", true);
            return;
        }

        setLoading(true);
        try {
            const url = `${START_INSTANCE_URL}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&instance_id=${encodeURIComponent(instanceId)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to start instance");

            const data = await response.json();
            const conId = data.encoded_con_id;

            // Update instances list
            setInstances((prev) =>
                prev.map((inst) =>
                    inst.instanceId === instanceId
                        ? { ...inst, state: data.state, publicIp: data.publicIp, connectionId: conId }
                        : inst
                )
            );

            if (selectedInstance?.instanceId === instanceId) {
                setSelectedInstance((prev) => ({
                    ...prev,
                    state: data.state,
                    publicIp: data.publicIp,
                    connectionId: conId,
                }));
            }

            setInstanceInfo(`State: ${data.state}\nOS: ${data.osType || "N/A"}\nIP: ${data.publicIp || "N/A"}`);
            showMessage("Instance started successfully");
        } catch (err) {
            showMessage(err.message, true);
        } finally {
            setLoading(false);
        }
    }, [username, password, selectedInstance]);

    // 4. Stop VM
    // 4. Stop VM
    const stopInstance = useCallback(async (instanceId) => {
        if (!username || !password || !instanceId) return;

        setLoading(true);
        try {
            const url = `${STOP_INSTANCE_URL}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&instance_id=${encodeURIComponent(instanceId)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to stop instance");
            showMessage("Instance stopped successfully");
            await fetchInstanceInfo(instanceId); // Refresh status
        } catch (err) {
            showMessage(err.message, true);
        } finally {
            setLoading(false);
        }
    }, [username, password, fetchInstanceInfo]);

    // 5. Reboot VM
    // 5. Reboot VM
    const rebootInstance = useCallback(async (instanceId) => {
        if (!username || !password || !instanceId) return;

        setLoading(true);
        try {
            const url = `${REBOOT_INSTANCE_URL}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&instance_id=${encodeURIComponent(instanceId)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to reboot instance");
            showMessage("Instance reboot initiated");
            await fetchInstanceInfo(instanceId);
        } catch (err) {
            showMessage(err.message, true);
        } finally {
            setLoading(false);
        }
    }, [username, password, fetchInstanceInfo]);

    // Fetch Guacamole Token
    const fetchAuthToken = async (usr, pwd) => {
        try {
            const resp = await fetch(GUACAMOLE_TOKEN_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ username: usr, password: pwd }).toString(),
            });
            if (!resp.ok) throw new Error("Failed to fetch auth token");
            const data = await resp.json();
            return data.authToken;
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const connectRDP = async (instance) => {
        // Support both passed instance (from button) or selectedInstance (from detailed view)
        const targetInstance = instance || selectedInstance;

        if (!targetInstance) {
            showMessage("No instance selected", true);
            return;
        }

        const state = (targetInstance.state || targetInstance.State?.Name || "").toLowerCase();

        if (state !== "running") {
            showMessage("Instance must be running to connect via RDP.", true);
            return;
        }

        if (!targetInstance.connectionId) {
            showMessage("No connection ID available. Please start the instance first.", true);
            return;
        }

        if (!username || !password) {
            showMessage("Missing credentials. Please Sign Out and Sign In again.", true);
            return;
        }

        try {
            let currentToken = authToken;
            if (!currentToken) {
                currentToken = await fetchAuthToken(username, password);
                setAuthToken(currentToken);
            }

            const clientUrl = `${GUACAMOLE_CLIENT_BASE}/${targetInstance.connectionId}?token=${encodeURIComponent(currentToken)}`;

            window.open(clientUrl, "_blank");
        } catch (error) {
            showMessage(`Failed to connect RDP: ${error.message}`, true);
        }
    };


    return {
        instances,
        selectedInstance,
        setSelectedInstance,
        instanceInfo,
        loading,
        error,
        fetchInstances,
        fetchInstanceInfo,
        startInstance,
        stopInstance,
        rebootInstance,
        connectRDP
    };
};
