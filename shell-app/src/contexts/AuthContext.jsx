import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, signOut as amplifySignOut, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import "../config/amplify-config";

const AuthContext = createContext(null);



export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authSubscribers, setAuthSubscribers] = useState([]);
    const [credentials, setCredentials] = useState({
        username: null,
        password: null,
        token: null
    });

    const [accessFlags, setAccessFlags] = useState({
        rdp_access: false,
        aws_access: false,
        azure_access: false,
        gcp_access: false,
        ms_access: false,
        kode_access: false,
        dashboard_access: false,
        cohorts_access: false,
        cloud_console_access: false,
        report_access: false,
        labs_access: false,
        assessments_access: false
    });

    // Notify subscribers when auth changes
    const notifySubscribers = (authState) => {
        authSubscribers.forEach(callback => {
            try {
                callback(authState);
            } catch (err) {
                console.error('Error in auth subscriber:', err);
            }
        });
    };

    // Manage credentials in memory and sessionStorage
    const setAuthCredentials = ({ username, password, token }) => {
        setCredentials({
            username: username || null,
            password: password || null,
            token: token || null
        });
        // Persist to sessionStorage (not localStorage) for same-session access
        if (password) sessionStorage.setItem('userPassword', password);
        if (token) sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('lastActivity', Date.now().toString());
    };

    const clearAuthCredentials = () => {
        setCredentials({
            username: null,
            password: null,
            token: null
        });
        sessionStorage.removeItem('userPassword');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('lastActivity');
        localStorage.removeItem('userPassword'); // cleanup old data
    };

    const fetchAccessControl = async (username) => {
        if (!username) return;
        try {
            const response = await fetch(`https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/AccessControl?username=${encodeURIComponent(username)}`);
            const data = await response.json();

            setAccessFlags({
                rdp_access: data.rdp_access ?? false,
                aws_access: data.aws_access ?? false,
                azure_access: data.azure_access ?? false,
                gcp_access: data.gcp_access ?? false,
                ms_access: data.ms_access ?? false,
                kode_access: data.kode_access ?? false,
                dashboard_access: data.dashboard_access ?? false,
                cohorts_access: data.cohorts_access ?? false,
                cloud_console_access: data.cloud_console_access ?? false,
                report_access: data.report_access ?? false,
                labs_access: data.labs_access ?? false,
                assessments_access: data.assessments_access ?? false
            });
        } catch (error) {
            console.error('Error fetching access control:', error);
        }
    };

    const checkAuthState = async () => {
        try {
            // Check for Inactivity Timer
            const lastActivity = sessionStorage.getItem('lastActivity');
            if (lastActivity && (Date.now() - parseInt(lastActivity, 10) > 20 * 60 * 1000)) {
                throw new Error("Session expired due to inactivity");
            }

            const currentUser = await getCurrentUser();
            const session = await fetchAuthSession();

            // Get user groups from Cognito
            const groups = session.tokens?.accessToken?.payload['cognito:groups'] || [];

            // Determine role based on groups
            let role = 'candidate'; // default role
            if (groups.includes('admin')) {
                role = 'admin';
            } else if (groups.includes('trainer')) {
                role = 'trainer';
            }

            setUser(currentUser);
            setUserRole(role);
            sessionStorage.setItem('lastActivity', Date.now().toString());

            // Fetch access flags once authenticated
            if (currentUser?.username) {
                await fetchAccessControl(currentUser.username);
            }

            // Notify remotes of auth state
            notifySubscribers({
                isAuthenticated: true,
                user: currentUser,
                userRole: role,
                username: currentUser.username
            });

            return role; // Return role for immediate validation
        } catch (error) {
            setUser(null);
            setUserRole(null);
            clearAuthCredentials();
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
            return null;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuthState();

        // Listen for Amplify Auth events (like session expiry or force sign-out)
        const unsubscribe = Hub.listen('auth', ({ payload }) => {
            const { event } = payload;
            if (event === 'signedOut' || event === 'tokenRefresh_failure') {
                // Clear session
                clearAuthCredentials();
                setUser(null);
                setUserRole(null);
                setAccessFlags({
                    rdp_access: false,
                    aws_access: false,
                    azure_access: false,
                    gcp_access: false,
                    ms_access: false,
                    kode_access: false,
                    dashboard_access: false,
                    cohorts_access: false,
                    cloud_console_access: false,
                    report_access: false,
                    labs_access: false,
                    assessments_access: false
                });

                // Redirect to login if needed
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        });

        return () => unsubscribe();
    }, []);

    const signOut = async () => {
        try {
            await amplifySignOut();
            clearAuthCredentials();
            setUser(null);
            setUserRole(null);
            setAccessFlags({
                rdp_access: false,
                aws_access: false,
                azure_access: false,
                gcp_access: false,
                ms_access: false,
                kode_access: false,
                dashboard_access: false,
                cohorts_access: false,
                cloud_console_access: false,
                report_access: false,
                labs_access: false,
                assessments_access: false
            });
        } catch (error) {
            console.error('Error signing out:', error);
        }

        // Notify remotes of sign out
        notifySubscribers({
            isAuthenticated: false,
            user: null,
            userRole: null,
            username: null
        });
    };

    // Setup window bridge for remotes to access auth
    useEffect(() => {
        window.__SHELL_AUTH__ = {
            isAuthenticated: () => !!user,
            getUsername: () => credentials.username || user?.username || null,
            getPassword: () => credentials.password || sessionStorage.getItem('userPassword') || null,
            getToken: () => credentials.token || sessionStorage.getItem('authToken') || null,
            getUserRole: () => userRole || null,
            getAccessFlags: () => accessFlags,
            setCredentials: setAuthCredentials,
            clearCredentials: clearAuthCredentials,
            onAuthChange: (callback) => {
                setAuthSubscribers(prev => [...prev, callback]);
                // Immediately notify the new subscriber with current state
                try {
                    callback({
                        isAuthenticated: !!user,
                        user: user,
                        userRole: userRole,
                        username: user?.username || credentials.username || null,
                        accessFlags: accessFlags
                    });
                } catch (err) {
                    console.error('Error calling auth subscriber on register:', err);
                }
                return () => {
                    setAuthSubscribers(prev => prev.filter(cb => cb !== callback));
                };
            },
            signOut
        };

        return () => {
            delete window.__SHELL_AUTH__;
        };
    }, [user, userRole, credentials, accessFlags, signOut]);

    const value = {
        user,
        userRole,
        accessFlags,
        loading,
        signOut,
        refreshAuth: checkAuthState
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
