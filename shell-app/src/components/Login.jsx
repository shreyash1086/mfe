import React, { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  User,
  GraduationCap,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Database,
  Sun,
  Moon,
  Loader2,
  Mail,
  Lock,
  Shield,
  Briefcase,
} from "lucide-react";
import { signIn } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import LoginLoader from "./LoginLoader";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState(null); // 'Admin', 'Trainer', 'Candidate'
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });

  const navigate = useNavigate();
  const { refreshAuth, signOut } = useAuth();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { isSignedIn, nextStep } = await signIn({ username, password });

      if (isSignedIn) {
        // Keep loading true for smooth transition/preloader
        // setLoading(true); // It's already true

        // Set credentials via auth context or bridge
        if (window.__SHELL_AUTH__?.setCredentials) {
          window.__SHELL_AUTH__.setCredentials({ username, password });
        } else {
          sessionStorage.setItem("userPassword", password);
        }

        // Validate Role
        const detectedRole = await refreshAuth();
        const selectedRoleLower = selectedRole.toLowerCase();

        if (detectedRole && detectedRole !== selectedRoleLower) {
          await signOut();
          setError(
            `Access Denied: You are registered as a ${detectedRole.charAt(0).toUpperCase() + detectedRole.slice(1)} but trying to login as ${selectedRole}.`,
          );
          setLoading(false);
          return;
        }

        navigate("/dashboard");
      } else {
        setLoading(false);
        if (
          nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
        ) {
          setError("New password required. Please contact admin.");
        } else {
          setError(`Sign in step: ${nextStep.signInStep}`);
        }
      }
    } catch (err) {
      console.error("Error signing in", err);
      setError(err.message || "Failed to sign in");
      setLoading(false);
    }
  };

  const roles = [
    {
      id: "Candidate",
      title: "Candidate",
      description:
        "Access your assigned courses, take assessments, and track your learning progress in real-time.",
      icon: <User className="w-6 h-6" />,
      iconBg:
        "bg-blue-100/50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    },
    {
      id: "Trainer",
      title: "Trainer",
      description:
        "Create assessments, manage content, and monitor cohort performance and submission analytics.",
      icon: <BarChart3 className="w-6 h-6" />,
      iconBg:
        "bg-indigo-100/50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
    },
    {
      id: "Admin",
      title: "Admin",
      description:
        "Oversee platform usage, manage users, and configure system settings and integrations.",
      icon: <ShieldAlert className="w-6 h-6" />,
      iconBg:
        "bg-purple-100/50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-950 dark:via-black dark:to-gray-950 transition-colors duration-500 relative overflow-hidden font-['Poppins',sans-serif]">
      {/* Theme Toggle */}
      <button
        onClick={() => setIsDark(!isDark)}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/50 dark:bg-white/10 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-lg text-gray-600 dark:text-gray-300 hover:scale-110 transition-all duration-300"
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-yellow-400" />
        ) : (
          <Moon className="w-5 h-5 text-blue-600" />
        )}
      </button>

      {/* --- Background Pattern Logic --- */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top Right Blob - Increased Visibility */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/20 dark:bg-blue-600/10 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/3 transition-colors duration-500"></div>

        {/* Bottom Left Blob - Increased Visibility */}
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/20 dark:bg-blue-500/10 blur-[150px] rounded-full -translate-x-1/4 translate-y-1/4 transition-colors duration-500"></div>

        {/* Integrated Wave 1 - Increased Opacity */}
        <div
          className="absolute opacity-80 dark:opacity-40"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "150%",
            height: "1000px",
            background:
              "linear-gradient(180deg, transparent 0%, rgba(37, 99, 235, 0.20) 50%, transparent 100%)",
            maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%230099ff' fill-opacity='1' d='M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,112C672,107,768,149,864,181.3C960,213,1056,235,1152,218.7C1248,203,1344,149,1392,122.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`,
            maskRepeat: "no-repeat",
            maskSize: "cover",
            WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%230099ff' fill-opacity='1' d='M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,112C672,107,768,149,864,181.3C960,213,1056,235,1152,218.7C1248,203,1344,149,1392,122.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`,
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "cover",
            filter: "blur(8px)",
          }}
        ></div>

        {/* Integrated Wave 2 (Rotated) - Increased Opacity */}
        <div
          className="absolute opacity-60 dark:opacity-30"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(180deg)",
            width: "150%",
            height: "1000px",
            background:
              "linear-gradient(180deg, transparent 0%, rgba(37, 99, 235, 0.20) 50%, transparent 100%)",
            maskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%230099ff' fill-opacity='1' d='M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,112C672,107,768,149,864,181.3C960,213,1056,235,1152,218.7C1248,203,1344,149,1392,122.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`,
            maskRepeat: "no-repeat",
            maskSize: "cover",
            WebkitMaskImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%230099ff' fill-opacity='1' d='M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,112C672,107,768,149,864,181.3C960,213,1056,235,1152,218.7C1248,203,1344,149,1392,122.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`,
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskSize: "cover",
            filter: "blur(8px)",
          }}
        ></div>
      </div>

      {/* Content Wrapper - Centered Vertically & Horizontally */}
      <div className="z-10 w-full max-w-7xl px-6 md:px-12 flex flex-col items-center justify-center my-auto py-12 mx-auto">
        {/* Header Content */}
        <AnimatePresence>
          {!selectedRole && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{
                opacity: 0,
                y: -20,
                height: 0,
                transition: { duration: 0.3 },
              }}
              className="text-center mb-12 lg:mb-16 max-w-3xl mx-auto"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] dark:text-white mb-4 tracking-tighter">
                Welcome to{" "}
                <span
                  className="text-[#B11917]"
                  style={{ fontFamily: "'Averia Serif Libre', serif" }}
                >
                  LabsKraft
                </span>
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Stage (Cards / Form) */}
        <AnimatePresence mode="popLayout">
          {!selectedRole ? (
            // 1. GRID VIEW (Role Selection)
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            >
              {roles.map((role) => (
                <motion.div
                  layoutId={`card-${role.id}`}
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className="group relative bg-white dark:bg-gray-900/60 dark:backdrop-blur-xl p-8 rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 dark:hover:shadow-blue-900/20 transition-all duration-300 cursor-pointer flex flex-col min-h-[420px]"
                  whileHover={{ y: -8 }}
                >
                  <div className="flex justify-between items-start mb-6">
                    {/* Icon */}
                    <motion.div
                      layoutId={`icon-${role.id}`}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-500 ${role.iconBg}`}
                    >
                      {role.icon}
                    </motion.div>
                  </div>

                  {/* Title */}
                  <motion.h3
                    layoutId={`title-${role.id}`}
                    className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
                  >
                    {role.title}
                  </motion.h3>

                  {/* Description */}
                  <motion.p
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8"
                  >
                    {role.description}
                  </motion.p>

                  {/* Action Button */}
                  <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-auto"
                  >
                    <div className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20">
                      Select Role <ArrowRight className="w-4 h-4" />
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            // 2. FORM VIEW (Login Form)
            <motion.div
              layoutId={`card-${selectedRole}`}
              className="bg-white dark:bg-gray-900/80 dark:backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-blue-900/10 dark:shadow-black/50 border border-gray-100 dark:border-white/10 p-8 md:p-12 w-full max-w-[440px] relative overflow-hidden mx-auto"
            >
              {/* Back Button */}
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.2 } }}
                onClick={() => {
                  setError("");
                  setSelectedRole(null);
                }}
                className="absolute top-8 left-8 p-2 rounded-full hover:bg-gray-50 dark:hover:bg-white/10 text-gray-400 dark:text-gray-500 transition-colors group z-20"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </motion.button>

              <div className="text-center pt-2 pb-8">
                {/* Large Icon for Form View */}
                <motion.div
                  layoutId={`icon-${selectedRole}`}
                  className="w-24 h-24 rounded-full bg-blue-500 mx-auto mb-6 flex items-center justify-center shadow-xl shadow-blue-500/20 text-white"
                >
                  <User className="w-10 h-10" />
                </motion.div>

                {/* Title Morph */}
                <motion.h2
                  layoutId={`title-${selectedRole}`}
                  className="text-3xl font-bold text-gray-900 dark:text-white mb-2"
                >
                  {selectedRole} Login
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                  className="text-gray-500 dark:text-gray-400 text-sm"
                >
                  Enter your credentials to access your{" "}
                  {selectedRole.toLowerCase()} portal
                </motion.p>
              </div>

              {/* Form Fields - Fade In */}
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: 0.3, duration: 0.4 },
                }}
                onSubmit={handleSignIn}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      placeholder="Username"
                      type="text"
                      className="w-full pl-12 pr-6 py-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all placeholder-gray-400"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400">
                      {/* Lock Icon */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect
                          width="18"
                          height="11"
                          x="3"
                          y="11"
                          rx="2"
                          ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <input
                      placeholder="Password"
                      type={showPassword ? "text" : "password"}
                      className="w-full pl-12 pr-12 py-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 dark:text-white transition-all placeholder-gray-400"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-2xl shadow-lg shadow-blue-600/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {loading ? "Authenticating..." : "Sign In"}
                </button>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Preloader Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[1000] bg-white/90 dark:bg-black/90 backdrop-blur-md flex items-center justify-center transition-all duration-300">
          <LoginLoader text="Verifying Credentials..." />
        </div>
      )}
    </div>
  );
};

export default Login;
