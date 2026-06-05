import React, { useRef, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, signOut, user, accessFlags } = useAuth();
  const sidebarRef = useRef(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        window.innerWidth < 768
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (window.innerWidth < 768) {
      onClose();
    }
  }, [location.pathname]);

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    if (
      path === "/assessment" &&
      (location.pathname.startsWith("/assessment") ||
        location.pathname.startsWith("/create-assessment"))
    )
      return true;
    if (
      path === "/content-uploading" &&
      location.pathname.startsWith("/cohort-content")
    )
      return true;
    return location.pathname.startsWith(path);
  };

  // Main nav items matching the desired look but keeping functionality
  const baseNavItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: "grid_view",
      color: "text-blue-500 dark:text-blue-400",
      accessKey: "dashboard_access",
    },
    {
      path: "/virtual-machine",
      label: "Virtual Machine",
      icon: "computer",
      color: "text-purple-500 dark:text-purple-400",
      accessKey: "rdp_access",
    },
    {
      path: "/cloud-console",
      label: "Kloud Console",
      icon: "vpn_key",
      color: "text-orange-500 dark:text-orange-400",
      accessKey: "cloud_console_access",
    },
    {
      path: "/cloud-labs",
      label: "Kloud Labs",
      icon: "cloud",
      color: "text-sky-500 dark:text-sky-400",
      accessKey: "labs_access",
    },
  ];

  const adminTrainerItems = [
    { path: '/content-uploading', label: 'Content Bank', icon: 'folder_zip', color: 'text-yellow-500 dark:text-yellow-400', accessKey: 'cohorts_access' },
    { path: '/assessment', label: 'Assessment', icon: 'admin_panel_settings', color: 'text-green-500 dark:text-green-400', accessKey: 'assessments_access' },
    { path: '/system-logs', label: 'System Logs', icon: 'monitoring', color: 'text-violet-500 dark:text-violet-400', accessKey: 'report_access' },
    // { path: '/code-environment', label: 'Kode Module', icon: 'terminal', color: 'text-red-500 dark:text-red-400', accessKey: 'kode_access' },
    { path: '/code-module', label: 'Kode ENV', icon: 'terminal', color: 'text-red-500 dark:text-red-400', accessKey: 'kode_access' },
  ];

  const candidateItems = [
    { path: '/content-uploading', label: 'Content Bank', icon: 'folder_zip', color: 'text-yellow-500 dark:text-yellow-400', accessKey: 'cohorts_access' },
    { path: '/assessment', label: 'Assessment', icon: 'admin_panel_settings', color: 'text-green-500 dark:text-green-400', accessKey: 'assessments_access' },
    // { path: '/code-environment', label: 'Kode ENV', icon: 'terminal', color: 'text-red-500 dark:text-red-400', accessKey: 'kode_access' },
    { path: '/code-module', label: 'Kode Module', icon: 'terminal', color: 'text-red-500 dark:text-red-400', accessKey: 'kode_access' },
  ];

  let navItems = [...baseNavItems];
  if (userRole === "admin" || userRole === "trainer") {
    let extra = adminTrainerItems.filter(
      (i) => !navItems.some((n) => n.path === i.path),
    );
    if (userRole === "trainer") {
      extra = extra.filter((item) => item.path !== "/system-logs");
    }
    navItems = [...navItems, ...extra];
  } else if (userRole === "candidate") {
    let extra = candidateItems.filter(
      (i) => !navItems.some((n) => n.path === i.path),
    );
    navItems = [...navItems, ...extra];
  }

  // Final filter based on access control flags removed so items are visible
  // navItems = navItems.filter(item => accessFlags[item.accessKey]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const username = user?.username || "User";
  // unique avatar based on username using DiceBear (adventurer-neutral or avataaars)
  const avatarUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${username}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-30 transition-opacity duration-300 md:hidden ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-hidden="true"
      />

      {/* Sidebar Container - BLACK MODE: dark:bg-black to match reference */}
      <aside
        ref={sidebarRef}
        className={`
                    fixed md:sticky md:top-0 inset-y-0 left-0 z-40 w-[280px] bg-white dark:bg-black 
                    border-r border-gray-100 dark:border-white/5 
                    flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out shadow-2xl md:shadow-none dark:md:shadow-[4px_0_15px_rgba(255,255,255,0.03)] h-screen
                    ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                `}
      >
        {/* Brand Header - Tighter padding */}
        <div className="flex items-center gap-3 px-6 py-6">
          <span
            className="text-2xl font-black tracking-tight text-[#B11917] dark:text-[#ff5555] drop-shadow-sm"
            style={{ fontFamily: "'Averia Serif Libre', serif" }}
          >
            LabsKraft
          </span>
        </div>

        {/* Navigation - Tighter spacing, smaller padding */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide py-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-xl transition-all duration-200 group relative border border-transparent dark:border-transparent ${
                isActive(item.path)
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 dark:bg-[#0d0d0d] dark:!border-white/10 dark:shadow-none font-semibold"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200 font-medium"
              }`}
            >
              <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                <span
                  className={`material-symbols-outlined text-[22px] transition-all duration-300 ${isActive(item.path) ? "text-white" : `${item.color} group-hover:opacity-80`}`}
                >
                  {item.icon}
                </span>
              </span>
              <span className="text-sm font-semibold tracking-wide">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* User Profile Footer - Expanded & Bigger Avatar */}
        <div className="p-4 border-t border-gray-100 dark:border-white/5">
          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-3 flex items-center group cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/5 overflow-hidden">
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              <div className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-700 shadow-sm flex-shrink-0 bg-white dark:bg-gray-800 p-0.5">
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div className="flex flex-col text-left overflow-hidden min-w-0">
                <span
                  className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate w-full block"
                  title={username}
                >
                  {username}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[12px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {userRole || "Admin"}
                  </span>
                  <button
                    onClick={handleLogoutClick}
                    className="text-gray-400 hover:text-red-500 transition-all bg-white dark:bg-black/40 p-[3px] rounded-md shadow-sm border border-gray-100 dark:border-white/5 hover:border-red-100 dark:hover:border-red-500/20 group-hover:bg-white dark:group-hover:bg-[#1a1a1a] flex items-center justify-center"
                    title="Sign Out"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      logout
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-black rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 w-full max-w-sm overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-5">
                  <span className="material-symbols-outlined text-[32px]">
                    error
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Sign Out
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Are you sure you want to sign out of your account?
                </p>
              </div>
              <div className="flex border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={cancelLogout}
                  className="flex-1 py-4 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  CANCEL
                </button>
                <div className="w-px bg-gray-100 dark:bg-gray-800" />
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-4 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  SIGN OUT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;
