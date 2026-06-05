import React, { createContext, useContext, useState, useEffect } from "react";
import { Amplify } from "aws-amplify";
import {
  getCurrentUser,
  signOut as amplifySignOut,
  fetchAuthSession,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

Amplify.configure({});

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUsingShellBridge, setIsUsingShellBridge] = useState(false);

  const checkAuthState = async () => {
    // Check if shell bridge is available (module running within shell)
    if (window.__SHELL_AUTH__) {
      setIsUsingShellBridge(true);
      setLoading(false);
      return window.__SHELL_AUTH__.getUserRole();
    }

    try {
      // Check for Inactivity Timer
      const lastActivity = sessionStorage.getItem("lastActivity");
      if (
        lastActivity &&
        Date.now() - parseInt(lastActivity, 10) > 20 * 60 * 1000
      ) {
        throw new Error("Session expired due to inactivity");
      }

      let currentUser, session;
      try {
        currentUser = await getCurrentUser();
        session = await fetchAuthSession();
      } catch (cognitoError) {
        // Standalone dev mode: use fallback mock user
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "Cognito not configured or offline, using fallback mock user",
          );
          const userData = {
            username: "labs-kraft-demo104",
            email: "shreyash1086@example.com",
            cohortId: "labs-kraft",
            groups: ["trainer"],
          };
          setUser(userData);
          setUserRole("trainer");
          return "trainer";
        }
        throw cognitoError;
      }

      // Get user groups from Cognito
      const groups =
        session.tokens?.accessToken?.payload["cognito:groups"] || [];
      const idTokenPayload = session.tokens?.idToken?.payload || {};

      // Determine role based on groups
      let role = "student"; // default role
      if (groups.includes("admin")) {
        role = "admin";
      } else if (groups.includes("trainer")) {
        role = "trainer";
      }

      // Extract more user info including custom attributes (like cohortId)
      const userData = {
        ...currentUser,
        email: idTokenPayload.email,
        cohortId:
          idTokenPayload["custom:cohortId"] || idTokenPayload["cohortId"],
        groups: groups,
      };

      setUser(userData);
      setUserRole(role);
      return role;
    } catch (error) {
      console.error("Auth error:", error);
      setUser(null);
      setUserRole(null);
      sessionStorage.removeItem("userPassword");
      sessionStorage.removeItem("lastActivity");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If shell bridge is available, subscribe to its changes instead of checking auth ourselves
    if (window.__SHELL_AUTH__) {
      setIsUsingShellBridge(true);
      const unsubscribe = window.__SHELL_AUTH__.onAuthChange((authState) => {
        if (authState.isAuthenticated) {
          setUser({
            username: authState.username,
            ...authState.user,
          });
          setUserRole(authState.userRole);
        } else {
          setUser(null);
          setUserRole(null);
        }
      });
      setLoading(false);
      return unsubscribe;
    } else {
      // Standalone mode: use existing auth check
      checkAuthState();

      // Listen for Amplify Auth events (like session expiry or force sign-out)
      const unsubscribe = Hub.listen("auth", ({ payload }) => {
        const { event } = payload;
        if (event === "signedOut" || event === "tokenRefresh_failure") {
          setUser(null);
          setUserRole(null);

          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
      });

      return () => unsubscribe();
    }
  }, []);

  const signOut = async () => {
    try {
      await amplifySignOut();
      localStorage.removeItem("userPassword");
      localStorage.removeItem("lastActivity");
      setUser(null);
      setUserRole(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const accessFlags = {
    labs_access:
      userRole === "admin" || userRole === "trainer" || userRole === "student",
    rdp_access:
      userRole === "admin" || userRole === "trainer" || userRole === "student",
  };

  const value = {
    user,
    userRole,
    loading,
    accessFlags,
    signOut,
    refreshAuth: checkAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
