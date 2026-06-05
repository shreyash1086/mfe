import { useState, useEffect, useCallback } from 'react';

export const useProctoring = ({
    enableTabSwitchDetection = true,
    enableFullScreen = true,
    enableRestrictions = true, // New prop to control copy/paste/context menu
    onTabSwitch,
    onExitFullScreen
} = {}) => {
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [warnings, setWarnings] = useState([]);

    const addWarning = useCallback((message) => {
        const timestamp = new Date().toLocaleTimeString();
        setWarnings(prev => [...prev, { message, timestamp }]);
    }, []);

    // Handle Tab Switching / Visibility Change
    useEffect(() => {
        if (!enableTabSwitchDetection) return;
        
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setTabSwitchCount(prev => prev + 1);
                addWarning("User switched tabs or minimized browser.");
                if (onTabSwitch) onTabSwitch();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [enableTabSwitchDetection, addWarning, onTabSwitch]);

    // Handle Full Screen
    const enterFullScreen = useCallback(async () => {
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                await document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                await document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) {
                await document.documentElement.msRequestFullscreen();
            }
        } catch (err) {
            console.error("Error attempting to enable full-screen mode:", err);
        }
    }, []);

    useEffect(() => {
        if (!enableFullScreen) return;

        const handleFullScreenChange = () => {
            const isFull = !!document.fullscreenElement;
            setIsFullScreen(isFull);
            if (!isFull) {
                addWarning("User exited full-screen mode.");
                if (onExitFullScreen) onExitFullScreen();
            }
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
        document.addEventListener('mozfullscreenchange', handleFullScreenChange);
        document.addEventListener('MSFullscreenChange', handleFullScreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
        };
    }, [enableFullScreen, addWarning, onExitFullScreen]);

    // Prevent Context Menu (Right Click)
    useEffect(() => {
        if (!enableRestrictions) return; // Skip if restricted mode is off

        const handleContextMenu = (e) => {
            e.preventDefault();
        };
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, [enableRestrictions]);

    // Prevent Copy/Paste
    useEffect(() => {
        if (!enableRestrictions) return; // Skip if restricted mode is off

        const handleCopyPaste = (e) => {
            e.preventDefault();
            addWarning("Copy/Paste disabled.");
        };
        document.addEventListener('copy', handleCopyPaste);
        document.addEventListener('paste', handleCopyPaste);
        document.addEventListener('cut', handleCopyPaste);
        return () => {
            document.removeEventListener('copy', handleCopyPaste);
            document.removeEventListener('paste', handleCopyPaste);
            document.removeEventListener('cut', handleCopyPaste);
        };
    }, [enableRestrictions, addWarning]);

    return {
        tabSwitchCount,
        isFullScreen,
        enterFullScreen,
        exitFullScreen: () => {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        },
        warnings,
        clearWarnings: () => setWarnings([])
    };
};
