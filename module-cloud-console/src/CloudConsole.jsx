import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "./AuthContext";
import { fetchAuthSession } from "aws-amplify/auth";
import { useTheme } from "./ThemeContext";
import KCLoader from "./KCLoader";
import PageHeader from "sharedDesignSystem/PageHeader";
import Card from "sharedDesignSystem/Card";

// Assets
import awsLogo from "./assets/aws-logo.png";
import awsBlackLogo from "./assets/aws_black_mode.png";
import azureLogo from "./assets/azure-logo.png";
import gcpLogo from "./assets/gcp-logo.png";
import m365Logo from "./assets/m365-logo.png";
import gitCopilotLogo from "./assets/gitcopilot-logo.png";
import tensorLogo from "./assets/tensor-logo.png";

// ----------------------------- CONFIG -----------------------------
const BASE_URL = "https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta";

const availablePlatforms = [
  {
    key: "aws",
    name: "AWS Credentials",
    logo: awsLogo,
    darkLogo: awsBlackLogo,
    accessKey: "aws_access",
  },
  {
    key: "azure",
    name: "AZURE Credentials",
    logo: azureLogo,
    accessKey: "azure_access",
  },
  {
    key: "gcp",
    name: "GCP Credentials",
    logo: gcpLogo,
    accessKey: "gcp_access",
  },
  {
    key: "ms365",
    name: "MS365 Credentials",
    logo: m365Logo,
    accessKey: "ms_access",
  },
  {
    key: "gitcopilot",
    name: "GITCOPILOT Credentials",
    logo: gitCopilotLogo,
    comingSoon: true,
  },
  {
    key: "tensor",
    name: "TENSOR Credentials",
    logo: tensorLogo,
    comingSoon: true,
  },
];

const signInUrls = {
  aws: (accountId) =>
    accountId ? `https://${accountId}.signin.aws.amazon.com/console` : null,
  azure: "https://portal.azure.com",
  gcp: "https://console.cloud.google.com",
  ms365: "https://www.office.com",
};

// -----------------------------------------------------------------

const CloudConsole = () => {
  const { user, userRole, loading: authLoading, accessFlags } = useAuth();

  const { theme, toggleTheme } = useTheme();

  const [token, setToken] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [vmInfo, setVmInfo] = useState("");
  const [accountId, setAccountId] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Toast state
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  }, []);

  useEffect(() => {
    const getToken = async () => {
      try {
        const session = await fetchAuthSession();
        setToken(session.tokens?.idToken?.toString() || "");
      } catch (err) {
        console.error("Failed to fetch auth session", err);
      }
    };
    getToken();
  }, []);

  const fetchIamCredentials = async (platform) => {
    if (!user || !user.username) {
      showToast("User not authenticated", "error");
      return;
    }

    setApiLoading(true);
    setVmInfo("");
    setAccountId(null);

    try {
      let response;
      let data;
      const username = user.username;

      if (platform === "aws") {
        response = await fetch(`${BASE_URL}/GenIamCreds?username=${username}`, {
          method: "GET",
        });
      } else if (platform === "azure") {
        response = await fetch(
          `https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/AzureCreds?username=${username}`,
          { method: "GET" },
        );
      } else if (platform === "ms365") {
        response = await fetch(
          `https://95nevlbwb2.execute-api.ap-south-1.amazonaws.com/Beta/AzureCreds?username=${username}`,
          { method: "GET" },
        );
      } else if (platform === "gcp") {
        response = await fetch(
          `https://us-west1-br1ghter-sun.cloudfunctions.net/gcp-user-management?username=${username}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.GCP_TOKEN || ""}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              queryStringParameters: { username: username },
            }),
          },
        );
      } else {
        throw new Error(
          `Unsupported or coming soon: ${platform.toUpperCase()}`,
        );
      }

      if (!response.ok)
        throw new Error(`Access denied or error for ${platform.toUpperCase()}`);

      data = await response.json();

      // Handle API Gateway proxy-style responses where body is a stringified JSON
      if (data.body && typeof data.body === "string") {
        try {
          data = JSON.parse(data.body);
        } catch (e) {
          // body wasn't JSON, keep original data
        }
      }

      let credentials = "";
      let signInUrl = null;

      switch (platform) {
        case "aws":
          credentials = [
            `Username: ${data.username || "N/A"}`,
            `Password: ${data.password || "N/A"}`,
            `Access Key: ${data.access_key_id || "N/A"}`,
            `Secret Key: ${data.secret_access_key || "N/A"}`,
          ].join("\n");
          signInUrl = data.account_number
            ? signInUrls.aws(data.account_number)
            : null;
          break;
        case "azure":
          credentials = [
            `Email: ${data.Email || "N/A"}`,
            `Password: ${data.Pass || "N/A"}`,
          ].join("\n");
          signInUrl = signInUrls.azure;
          break;
        case "ms365":
          credentials = [
            `Email: ${data.Email || "N/A"}`,
            `Password: ${data.Pass || "N/A"}`,
          ].join("\n");
          signInUrl = signInUrls.ms365;
          break;
        case "gcp":
          credentials = [
            `Email: ${data.email || "N/A"}`,
            `Password: ${data.pass || "N/A"}`,
            `Project ID: ${data.project_id || "N/A"}`,
          ].join("\n");
          signInUrl = signInUrls.gcp;
          break;
        default:
          credentials = "Unsupported platform";
      }

      setVmInfo(credentials);
      setAccountId(signInUrl);
      showToast(
        `Fetched ${platform.toUpperCase()} credentials successfully`,
        "success",
      );
    } catch (error) {
      setVmInfo(`Error: You don't have access to ${platform.toUpperCase()} `);
      showToast(error.message, "error");
    } finally {
      setApiLoading(false);
    }
  };

  const handlePlatformSelect = (platform) => {
    if (platform.comingSoon) {
      showToast(`${platform.name} is coming soon`, "info");
      return;
    }

    setSelectedPlatform(platform);

    // Only fetch if they have access
    if (platform.accessKey && accessFlags && accessFlags[platform.accessKey]) {
      fetchIamCredentials(platform.key);
    }
  };

  const handleBackToPlatforms = () => {
    setSelectedPlatform(null);
    setVmInfo("");
    setAccountId(null);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!", "success");
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-brand-dark">
        <KCLoader text="Authenticating..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-brand-dark text-gray-800 dark:text-gray-100 font-['Poppins',sans-serif] transition-colors duration-500 relative">
      <div className="px-6 pt-0 pb-3 w-full flex-1 flex flex-col mx-auto">
        <PageHeader title="Kloud Console" />

        {/* Cards Grid - full width */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-transparent">
          <div className="mt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
              {availablePlatforms.map((platform) => {
                const isDisabled = platform.comingSoon;
                const textColor = isDisabled
                  ? "text-gray-400 dark:text-gray-600"
                  : "text-gray-900 dark:text-white";

                return (
                  <motion.div
                    key={platform.key}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => handlePlatformSelect(platform)}
                    className="w-full"
                  >
                    <Card
                      hoverEffect={!isDisabled}
                      className={`h-[220px] flex flex-col justify-center items-center ${isDisabled ? "cursor-not-allowed grayscale opacity-60" : ""}`}
                    >
                      <div className="flex flex-col items-center justify-center h-full">
                        {platform.darkLogo ? (
                          <>
                            <img
                              src={platform.logo}
                              alt={`${platform.name} Logo`}
                              className={`h-16 mb-6 object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-sm dark:hidden`}
                            />
                            <img
                              src={platform.darkLogo}
                              alt={`${platform.name} Logo`}
                              className={`h-16 mb-6 object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-sm hidden dark:block`}
                            />
                          </>
                        ) : (
                          <img
                            src={platform.logo}
                            alt={`${platform.name} Logo`}
                            className={`h-16 mb-6 object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-sm`}
                          />
                        )}

                        <h3
                          className={`text-lg font-bold mb-2 text-center transition-colors duration-300 ${!isDisabled ? "group-hover:text-brand-accent" : ""} ${textColor}`}
                        >
                          {platform.name}
                        </h3>
                        {platform.comingSoon && (
                          <span className="px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-white/5">
                            Coming Soon
                          </span>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Credential Modal */}
        <AnimatePresence>
          {selectedPlatform && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleBackToPlatforms}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              {/* Modal Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-lg bg-white dark:bg-brand-card border border-gray-100 dark:border-white/5 rounded-[32px] shadow-2xl overflow-hidden"
              >
                <div className="p-6 sm:p-8">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50 dark:border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm">
                        {selectedPlatform.darkLogo ? (
                          <>
                            <img
                              src={selectedPlatform.logo}
                              alt={selectedPlatform.name}
                              className="h-8 w-8 object-contain dark:hidden"
                            />
                            <img
                              src={selectedPlatform.darkLogo}
                              alt={selectedPlatform.name}
                              className="h-8 w-8 object-contain hidden dark:block"
                            />
                          </>
                        ) : (
                          <img
                            src={selectedPlatform.logo}
                            alt={selectedPlatform.name}
                            className="h-8 w-8 object-contain"
                          />
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                          {selectedPlatform.name}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          View and copy your session credentials
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleBackToPlatforms}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-400 hover:text-brand-accent transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-2xl">
                        close
                      </span>
                    </button>
                  </div>

                  {/* Body */}
                  {selectedPlatform.accessKey &&
                  accessFlags &&
                  !accessFlags[selectedPlatform.accessKey] ? (
                    <div className="p-10 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-center flex flex-col items-center justify-center min-h-[250px]">
                      <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-4xl">
                          lock
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        Access Denied
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[240px] mx-auto leading-relaxed">
                        You do not have permission to access{" "}
                        {selectedPlatform.name}. Please contact your
                        administrator for access.
                      </p>
                    </div>
                  ) : apiLoading ? (
                    <div className="h-48 flex items-center justify-center">
                      <KCLoader text="Fetching Credentials..." scale={0.6} />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {vmInfo && vmInfo.startsWith("Error:") ? (
                        <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 text-center">
                          <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl mb-2">
                            error
                          </span>
                          <p className="text-sm text-red-600 dark:text-red-400 font-semibold">
                            {vmInfo.replace("Error: ", "")}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {vmInfo &&
                              vmInfo.split("\n").map((line, idx) => {
                                const parts = line.split(": ");
                                const label = parts[0];
                                const value = parts.slice(1).join(": ");
                                if (!value) return null;

                                return (
                                  <div
                                    key={idx}
                                    className="space-y-1.5 group/field"
                                  >
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-1">
                                      {label}
                                    </label>
                                    <div className="relative group/copy">
                                      <div className="w-full pl-4 pr-10 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-between group-hover/field:border-brand-accent/30 transition-all">
                                        <span className="font-mono text-xs font-medium text-gray-900 dark:text-white truncate select-all">
                                          {value}
                                        </span>
                                        <button
                                          onClick={() => handleCopy(value)}
                                          className="absolute right-2 p-1.5 text-gray-400 hover:text-brand-accent transition-colors"
                                          title="Copy"
                                        >
                                          <span className="material-symbols-outlined text-xl">
                                            content_copy
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>

                          {accountId && (
                            <a
                              href={accountId}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-widest rounded-xl transition-all shadow-xl shadow-brand-accent/20 active:scale-[0.98] uppercase text-center flex items-center justify-center gap-3 mt-4"
                            >
                              Open Kloud Console
                              <span className="material-symbols-outlined text-lg">
                                open_in_new
                              </span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-[110]"
            >
              <div
                className={`
                pointer-events-auto px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border backdrop-blur-md
                ${
                  toast.type === "error"
                    ? "bg-red-50/90 dark:bg-red-900/90 text-red-800 dark:text-white border-red-200 dark:border-red-800"
                    : toast.type === "info"
                      ? "bg-brand-accent/10 dark:bg-brand-accent/10 text-brand-accent border-brand-accent/20 dark:border-brand-accent/20"
                      : "bg-gray-900/95 dark:bg-white/95 text-white dark:text-gray-900 border-transparent"
                }
              `}
              >
                <span className="material-symbols-outlined">
                  {toast.type === "error"
                    ? "error"
                    : toast.type === "info"
                      ? "info"
                      : "check_circle"}
                </span>
                <p className="font-medium text-sm">{toast.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CloudConsole;
