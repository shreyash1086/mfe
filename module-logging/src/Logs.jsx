import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "./ThemeContext";
import { useAuth } from "./AuthContext";
import { fetchLogs } from "./logApi";
import {
  Activity,
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
  Search,
  Server,
  Users,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  X,
  Cpu,
  Database,
  Globe,
  Loader2,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import PageHeader from "sharedDesignSystem/PageHeader";
import Card from "sharedDesignSystem/Card";

const COHORT_API_URL =
  "https://x6uz5z6ju2.execute-api.us-west-2.amazonaws.com/SQLAdmin?type=cohorts";

const API_REGISTRY = [
  { id: "ALL", label: "API: All Services" },
  { id: "/assessment-api", label: "Assessment Engine" },
  { id: "/assessment-mgmt-api", label: "Assessment Mgmt" },
  { id: "/sql-admin-api", label: "SQL Admin (Metadata)" },
  { id: "/content-upload-api", label: "Content Services" },
  { id: "/reports-api", label: "Reports & Analytics" },
  { id: "/new-content-api", label: "Content CMS" },
  { id: "/api/instances", label: "VM Lifecycle Ops" },
  { id: "/api/rdp-connect", label: "Remote Gateway" },
  { id: "/cloud-console-api", label: "Cloud Console" },
  { id: "LOGGING", label: "Logging System" },
  { id: "OTHER", label: "Custom / Legacy" },
];

const getLevelColor = (level) => {
  switch (level?.toUpperCase()) {
    case "ERROR":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "WARN":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "SECURITY":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "INFO":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "DEBUG":
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
};

const getMethodColor = (method) => {
  switch (method?.toUpperCase()) {
    case "GET":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "POST":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "PUT":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "DELETE":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-450 border-gray-500/20";
  }
};

function Logs() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const isDark = theme === "dark";

  // ─── State ───
  const [cohort, setCohort] = useState("loud-vm");
  const [logs, setLogs] = useState([]);
  const [visibleCount, setVisibleCount] = useState(30);
  const tableContainerRef = useRef(null);
  const [loading, setLoading] = useState(true); // Initial fetch
  const [isRefreshing, setIsRefreshing] = useState(false); // Silent background refresh
  const [error, setError] = useState(null);
  const [cohorts, setCohorts] = useState([]);
  const [cohortsLoading, setCohortsLoading] = useState(true);
  const [isCohortDropdownOpen, setIsCohortDropdownOpen] = useState(false);
  const [cohortSearch, setCohortSearch] = useState("");

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [apiFilter, setApiFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("desc");
  const [timeFilter, setTimeFilter] = useState("ALL");
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isLevelDropdownOpen, setIsLevelDropdownOpen] = useState(false);
  const [isApiDropdownOpen, setIsApiDropdownOpen] = useState(false);

  const timeOptions = [
    { id: "ALL", label: "All time" },
    { id: "1H", label: "Last 1 hour" },
    { id: "6H", label: "Last 6 hours" },
    { id: "24H", label: "Last 24 hours" },
    { id: "7D", label: "Last week" },
    { id: "14D", label: "Last 2 weeks" },
    { id: "30D", label: "Last month" },
  ];

  // ─── Fetch cohort list from API ───
  useEffect(() => {
    const loadCohorts = async () => {
      setCohortsLoading(true);
      try {
        const cacheKey = "cached_cohorts_v2";
        let cohortsData = [];
        const cached = sessionStorage.getItem(cacheKey);

        if (cached) {
          cohortsData = JSON.parse(cached);
        } else {
          const response = await fetch(COHORT_API_URL);
          if (response.ok) {
            const data = await response.json();
            cohortsData = (data.cohorts || []).map((item, index) => {
              if (typeof item === "string") return { id: item, name: item };
              const name = item.name || item.id || `Cohort ${index + 1}`;
              const id = item.id || name;
              return { id, name };
            });
            sessionStorage.setItem(cacheKey, JSON.stringify(cohortsData));
          }
        }
        setCohorts(cohortsData);
      } catch (err) {
        console.error("[Logs] Failed to fetch cohorts:", err);
      } finally {
        setCohortsLoading(false);
      }
    };
    loadCohorts();
  }, []);

  // ─── Fetch Logs from Lambda ───
  const loadLogs = useCallback(async () => {
    if (!cohort) return;
    if (logs.length > 0) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchLogs(cohort);
      const records = (data.records || []).map((record) => {
        let parsed = null;
        try {
          parsed = typeof record.req_res_data === "string"
            ? JSON.parse(record.req_res_data)
            : record.req_res_data || {};
        } catch {
          parsed = {};
        }
        return {
          ...record,
          _parsedData: parsed,
        };
      });
      setLogs(records);
      setError(null);
    } catch (err) {
      console.error("[Logs] Fetch error:", err);
      setError(err.message || "Failed to fetch logs");
      setLogs([]);
    } finally {
      setLoading(false);
      // Artificial delay for smooth silent transition
      setTimeout(() => setIsRefreshing(false), 800);
    }
  }, [cohort, logs.length]);

  // Load on cohort change
  useEffect(() => {
    if (cohort) loadLogs();
  }, [cohort, loadLogs]);

  // ─── Level Inference Helper ───
  const inferLevel = useCallback((log) => {
    const data = log._parsedData || {};
    if (data.status >= 500 || data.error) return "ERROR";
    if (data.status >= 400) return "WARN";
    const apiLower = (log.api_called || "").toLowerCase();
    if (
      apiLower.includes("admin") ||
      apiLower.includes("login") ||
      apiLower.includes("auth")
    )
      return "SECURITY";
    return "INFO";
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("[data-cohort-dropdown]"))
        setIsCohortDropdownOpen(false);
      if (!event.target.closest("[data-time-dropdown]")) {
        setIsTimeDropdownOpen(false);
      }
      if (!event.target.closest("[data-sort-dropdown]"))
        setIsSortDropdownOpen(false);
      if (!event.target.closest("[data-level-dropdown]"))
        setIsLevelDropdownOpen(false);
      if (!event.target.closest("[data-api-dropdown]"))
        setIsApiDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!cohort) return;
    const interval = setInterval(loadLogs, 60_000);
    return () => clearInterval(interval);
  }, [cohort, loadLogs]);

  // ─── Dynamic Filter Options ───
  const uniqueApis = useMemo(() => {
    // IDs of all registry items
    const registryIds = new Set(
      API_REGISTRY.map((a) => a.id).filter(
        (id) => id !== "ALL" && id !== "OTHER",
      ),
    );

    // Find existing logs that don't match registry
    const loggedApis = [...new Set(logs.map((log) => log.api_called))].filter(
      Boolean,
    );
    const unregistered = loggedApis.filter((api) => {
      // Match if the log api_called starts with or contains any registry ID
      return ![...registryIds].some((regId) => api.includes(regId));
    });

    return unregistered;
  }, [logs]);

  // ─── Filtered Logs ───
  const filteredLogs = useMemo(() => {
    let result = logs.filter((log) => {
      // Time range filtering
      if (timeFilter !== "ALL") {
        const now = new Date();
        const logTime = new Date(log.timestamp);
        const diffMs = now - logTime;

        if (timeFilter === "1H" && diffMs > 3600000) return false;
        if (timeFilter === "6H" && diffMs > 21600000) return false;
        if (timeFilter === "24H" && diffMs > 86400000) return false;
        if (timeFilter === "7D" && diffMs > 604800000) return false;
        if (timeFilter === "14D" && diffMs > 1209600000) return false;
        if (timeFilter === "30D" && diffMs > 2592000000) return false;
      }

      if (apiFilter !== "ALL" && log.api_called !== apiFilter) return false;
      if (levelFilter !== "ALL" && inferLevel(log) !== levelFilter)
        return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const rawReqRes = typeof log.req_res_data === "string" ? log.req_res_data : "";
        return (
          (log.user_id || "").toLowerCase().includes(term) ||
          (log.api_called || "").toLowerCase().includes(term) ||
          rawReqRes.toLowerCase().includes(term)
        );
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [
    logs,
    searchTerm,
    apiFilter,
    levelFilter,
    sortOrder,
    timeFilter,
    inferLevel,
  ]);

  const displayedLogs = useMemo(() => {
    return filteredLogs.slice(0, visibleCount);
  }, [filteredLogs, visibleCount]);

  const handleScroll = useCallback((event) => {
    let container = event.target;
    if (!container) return;

    if (container === document) {
      container = document.documentElement;
    }

    if (
      container === tableContainerRef.current ||
      (container.contains && container.contains(tableContainerRef.current))
    ) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 150) {
        setVisibleCount((prev) => {
          if (prev >= filteredLogs.length) return prev;
          return prev + 30;
        });
      }
    }
  }, [filteredLogs.length]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [handleScroll]);

  useEffect(() => {
    setVisibleCount(30);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [searchTerm, apiFilter, levelFilter, sortOrder, timeFilter, cohort]);

  // ─── Helpers ───
  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatReqRes = (data) => {
    if (!data) return "-";
    if (typeof data === "string") return data;
    try {
      return JSON.stringify(data, null, 0);
    } catch {
      return String(data);
    }
  };

  // ─── CSV Export ───
  const handleExport = () => {
    if (filteredLogs.length === 0) return;
    const headers = [
      "User ID",
      "Timestamp",
      "API Called",
      "Request/Response Data",
    ];
    const rows = filteredLogs.map((log) => [
      log.user_id || "",
      log.timestamp || "",
      log.api_called || "",
      `"${formatReqRes(log.req_res_data).replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${cohort}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered cohort list for dropdown search
  const filteredCohorts = useMemo(() => {
    if (!cohortSearch.trim()) return cohorts;
    return cohorts.filter((c) =>
      c.name.toLowerCase().includes(cohortSearch.toLowerCase()),
    );
  }, [cohorts, cohortSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isCohortDropdownOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest("[data-cohort-dropdown]")) {
        setIsCohortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isCohortDropdownOpen]);

  // ─── Usage Stats (computed from real data) ───
  const usageStats = useMemo(() => {
    const uniqueUsers = new Set(logs.map((l) => l.user_id)).size;
    const uniqueApis = new Set(logs.map((l) => l.api_called)).size;
    const loginCount = logs.filter((l) =>
      (l.api_called || "").includes("login"),
    ).length;
    return [
      {
        label: "TOTAL LOG ENTRIES",
        value: logs.length.toLocaleString(),
        icon: <Activity className="w-5 h-5 text-brand-accent" />,
        bg: "bg-brand-accent/10",
        trend: cohort ? "Live" : "Waiting",
        trendDir: "up",
      },
      {
        label: "UNIQUE USERS",
        value: uniqueUsers.toString(),
        icon: <Users className="w-5 h-5 text-indigo-600" />,
        bg: "bg-indigo-50 dark:bg-indigo-900/20",
        trend: uniqueUsers > 0 ? "Active" : "-",
        trendDir: "up",
      },
      {
        label: "UNIQUE APIs",
        value: uniqueApis.toString(),
        icon: <Globe className="w-5 h-5 text-green-600" />,
        bg: "bg-green-50 dark:bg-green-900/20",
        trend: uniqueApis > 0 ? "Tracked" : "-",
        trendDir: "up",
      },
      {
        label: "LOGIN EVENTS",
        value: loginCount.toString(),
        icon: <ShieldAlert className="w-5 h-5 text-red-600" />,
        bg: "bg-red-50 dark:bg-red-900/20",
        trend: loginCount > 0 ? "Auth" : "-",
        trendDir: loginCount > 0 ? "up" : "down",
      },
    ];
  }, [logs, cohort]);

  const StatCard = ({ label, value, icon, bg, trend, trendDir }) => (
    <Card className="p-4 rounded-2xl relative overflow-hidden group">
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
          <div
            className={`p-2 rounded-xl ${bg} transition-transform group-hover:scale-110`}
          >
            {icon}
          </div>
          <div
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${trendDir === "up" ? "text-green-600 bg-green-50 dark:bg-green-900/20" : "text-red-500 bg-red-50 dark:bg-red-900/20"}`}
          >
            {trendDir === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingUp className="w-3 h-3 rotate-180" />
            )}
            {trend}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-1 uppercase">
            {label}
          </p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {value}
          </h3>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-brand-dark text-gray-800 dark:text-gray-100 font-['Poppins',sans-serif] transition-colors duration-500 relative overflow-hidden">
      <div className="px-4 pt-2 pb-8 w-full h-full flex flex-col mx-auto overflow-hidden">
        <PageHeader
          title="System Logs"
          onRefresh={loadLogs}
          loading={isRefreshing}
          actions={
            <button
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
              className="flex items-center gap-2 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          }
        />

        {/* Scrollable Content Container */}
        <div className="flex-1 flex flex-col min-h-0 bg-transparent py-2 overflow-hidden">
          {/* Usage Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0 mb-4">
            {usageStats.map((stat, idx) => (
              <StatCard key={idx} {...stat} />
            ))}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col bg-white dark:bg-brand-card rounded-[32px] shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden relative min-h-0">
            {/* Decorative Grid Background */}
            <div
              className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #3563EB 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            ></div>

            {/* Filter and Search Bar */}
            <div className="p-6 border-b border-gray-100 dark:border-white/10 relative z-30 flex flex-col lg:flex-row gap-4 items-center bg-gray-50/50 dark:bg-black/20">
              {/* Search Group */}
              <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full lg:w-auto mt-1">
                {/* Cohort Dropdown Selector */}
                <div
                  className="relative w-full sm:w-56 flex-shrink-0"
                  data-cohort-dropdown
                >
                  <div
                    onClick={() =>
                      setIsCohortDropdownOpen(!isCohortDropdownOpen)
                    }
                    className="flex items-center justify-between gap-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm font-semibold rounded-xl px-4 py-3 cursor-pointer hover:border-brand-accent/30 dark:hover:border-brand-accent/50 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Database className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">
                        {cohort
                          ? cohorts.find((c) => c.id === cohort)?.name || cohort
                          : cohortsLoading
                            ? "Loading..."
                            : "Select Cohort"}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isCohortDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </div>

                  {/* Dropdown Menu */}
                  {isCohortDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-2 border-b border-gray-100 dark:border-white/5">
                        <input
                          type="text"
                          placeholder="Search cohorts..."
                          value={cohortSearch}
                          onChange={(e) => setCohortSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-lg text-sm outline-none text-gray-700 dark:text-white placeholder-gray-400"
                        />
                      </div>
                      <div className="max-h-[250px] overflow-y-auto scrollbar-hide p-1">
                        {filteredCohorts.length > 0 ? (
                          filteredCohorts.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setCohort(c.id);
                                setIsCohortDropdownOpen(false);
                                setCohortSearch("");
                              }}
                              className={`px-3 py-2.5 rounded-lg text-sm cursor-pointer truncate transition-colors ${
                                cohort === c.id
                                  ? "bg-brand-accent/10 text-brand-accent font-bold"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 font-medium"
                              }`}
                            >
                              {c.name}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-sm text-gray-400 text-center">
                            {cohortsLoading ? "Loading..." : "No cohorts found"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Global Search Input - Reduced Width */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm font-medium rounded-xl pl-12 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all placeholder-gray-400 shadow-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-px h-px lg:h-8 bg-gray-200 dark:bg-white/10 my-1 lg:my-0 hidden lg:block"></div>

              {/* Filters Group */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
                {/* Time Range Filter (Azure Style) */}
                <div className="relative flex-1 sm:w-36" data-time-dropdown>
                  <div
                    onClick={() => {
                      const newState = !isTimeDropdownOpen;
                      setIsTimeDropdownOpen(newState);
                      if (newState) {
                        setIsSortDropdownOpen(false);
                        setIsLevelDropdownOpen(false);
                        setIsApiDropdownOpen(false);
                        setIsCohortDropdownOpen(false);
                      }
                    }}
                    className="flex items-center justify-between gap-1.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-semibold rounded-xl px-3 py-2.5 cursor-pointer hover:border-brand-accent/30 dark:hover:border-brand-accent/50 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">
                        {timeFilter === "ALL"
                          ? "Time: All"
                          : `Last ${timeOptions.find((o) => o.id === timeFilter)?.label || timeFilter}`}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isTimeDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </div>

                  {isTimeDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 px-1">
                        Timespan
                      </h4>
                      <div className="space-y-1">
                        {timeOptions.map((opt) => (
                          <label
                            key={opt.id}
                            onClick={() => {
                              setTimeFilter(opt.id);
                              setIsTimeDropdownOpen(false);
                            }}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl cursor-pointer group transition-all"
                          >
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${timeFilter === opt.id ? "border-brand-accent" : "border-gray-300 dark:border-gray-600 group-hover:border-brand-accent/50"}`}
                            >
                              {timeFilter === opt.id && (
                                <div className="w-2.5 h-2.5 rounded-full bg-brand-accent animate-in zoom-in-50 duration-200" />
                              )}
                            </div>
                            <span
                              className={`text-sm font-semibold ${timeFilter === opt.id ? "text-brand-accent" : "text-gray-600 dark:text-gray-400"}`}
                            >
                              {opt.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="relative flex-1 sm:w-32" data-sort-dropdown>
                  <div
                    onClick={() => {
                      const newState = !isSortDropdownOpen;
                      setIsSortDropdownOpen(newState);
                      if (newState) {
                        setIsTimeDropdownOpen(false);
                        setIsLevelDropdownOpen(false);
                        setIsApiDropdownOpen(false);
                        setIsCohortDropdownOpen(false);
                      }
                    }}
                    className="flex items-center justify-between gap-1.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-semibold rounded-xl px-3 py-2.5 cursor-pointer hover:border-brand-accent/30 dark:hover:border-brand-accent/50 transition-all shadow-sm"
                  >
                    <span className="truncate">
                      {sortOrder === "desc" ? "Newest First" : "Oldest First"}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                  {isSortDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-44 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                      {[
                        { id: "desc", label: "Newest First" },
                        { id: "asc", label: "Oldest First" },
                      ].map((opt) => (
                        <div
                          key={opt.id}
                          onClick={() => {
                            setSortOrder(opt.id);
                            setIsSortDropdownOpen(false);
                          }}
                          className={`px-4 py-3 text-sm cursor-pointer transition-colors ${sortOrder === opt.id ? "bg-brand-accent/10 text-brand-accent font-bold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 font-medium"}`}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Flag Dropdown */}
                <div className="relative flex-1 sm:w-28" data-level-dropdown>
                  <div
                    onClick={() => {
                      const newState = !isLevelDropdownOpen;
                      setIsLevelDropdownOpen(newState);
                      if (newState) {
                        setIsTimeDropdownOpen(false);
                        setIsSortDropdownOpen(false);
                        setIsApiDropdownOpen(false);
                        setIsCohortDropdownOpen(false);
                      }
                    }}
                    className="flex items-center justify-between gap-1.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-semibold rounded-xl px-3 py-2.5 cursor-pointer hover:border-brand-accent/30 dark:hover:border-brand-accent/50 transition-all shadow-sm"
                  >
                    <span className="truncate">
                      {levelFilter === "ALL" ? "Flag: All" : levelFilter}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isLevelDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                  {isLevelDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-40 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                      {[
                        "ALL",
                        "INFO",
                        "WARN",
                        "ERROR",
                        "SECURITY",
                        "DEBUG",
                      ].map((level) => (
                        <div
                          key={level}
                          onClick={() => {
                            setLevelFilter(level);
                            setIsLevelDropdownOpen(false);
                          }}
                          className={`px-4 py-3 text-sm cursor-pointer transition-colors ${levelFilter === level ? "bg-brand-accent/10 text-brand-accent font-bold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 font-medium"}`}
                        >
                          {level === "ALL" ? "Flag: All" : level}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* API Dropdown */}
                <div className="relative flex-1 sm:w-48" data-api-dropdown>
                  <div
                    onClick={() => {
                      const newState = !isApiDropdownOpen;
                      setIsApiDropdownOpen(newState);
                      if (newState) {
                        setIsTimeDropdownOpen(false);
                        setIsSortDropdownOpen(false);
                        setIsLevelDropdownOpen(false);
                        setIsCohortDropdownOpen(false);
                      }
                    }}
                    className="flex items-center justify-between gap-1.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-semibold rounded-xl px-3 py-2.5 cursor-pointer hover:border-brand-accent/30 dark:hover:border-brand-accent/50 transition-all shadow-sm"
                  >
                    <span className="truncate">
                      {apiFilter === "ALL"
                        ? "API: All Services"
                        : API_REGISTRY.find((a) => a.id === apiFilter)?.label ||
                          apiFilter}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isApiDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                  {isApiDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 py-1 max-h-80 overflow-y-auto">
                      {/* Registry APIs */}
                      {API_REGISTRY.map((opt) => (
                        <div
                          key={opt.id}
                          onClick={() => {
                            setApiFilter(opt.id);
                            setIsApiDropdownOpen(false);
                          }}
                          className={`px-4 py-2.5 text-xs sm:text-sm cursor-pointer transition-colors ${apiFilter === opt.id ? "bg-brand-accent/10 text-brand-accent font-bold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 font-medium"}`}
                        >
                          {opt.label}
                        </div>
                      ))}
                      {/* Dynamic APIs found in logs */}
                      {uniqueApis.length > 0 && (
                        <div className="border-t border-gray-100 dark:border-white/5 mt-1 pt-0.5">
                          {uniqueApis.map((api) => (
                            <div
                              key={api}
                              onClick={() => {
                                setApiFilter(api);
                                setIsApiDropdownOpen(false);
                              }}
                              className={`px-4 py-2 text-xs truncate cursor-pointer transition-colors ${apiFilter === api ? "bg-brand-accent/10 text-brand-accent font-bold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 font-medium"}`}
                              title={api}
                            >
                              {api}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {(searchTerm ||
                  apiFilter !== "ALL" ||
                  levelFilter !== "ALL" ||
                  sortOrder !== "desc" ||
                  timeFilter !== "ALL") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setApiFilter("ALL");
                      setLevelFilter("ALL");
                      setSortOrder("desc");
                      setTimeFilter("ALL");
                    }}
                    className="w-10 h-10 flex-shrink-0 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl transition-all flex items-center justify-center shadow-sm"
                    title="Clear Filters"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Table Area */}
            <div ref={tableContainerRef} className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide relative z-10 w-full min-h-0 bg-white/50 dark:bg-transparent rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              {loading && logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin opacity-70" />
                  <div className="space-y-2 text-center">
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                      Synchronizing Telemetry...
                    </p>
                    <div className="w-48 h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.5,
                          ease: "linear",
                        }}
                        className="w-full h-full bg-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#1a1a1a] text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider border-b border-gray-100 dark:border-white/5">
                      <th className="px-6 py-4 font-extrabold w-[250px]">Timestamp</th>
                      <th className="px-6 py-4 font-extrabold w-[180px]">User</th>
                      <th className="px-6 py-4 font-extrabold w-[300px]">
                        Target Resource
                      </th>
                      <th className="px-6 py-4 font-extrabold w-auto">
                        Telemetry Payload
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    <AnimatePresence mode="popLayout">
                      {displayedLogs.length > 0 ? (
                        displayedLogs.map((log, index) => {
                          const parsedData = log._parsedData || {};
                          const method =
                            parsedData?.method || log.method || "GET";
                          const levelStr = inferLevel(log);

                          return (
                            <motion.tr
                              key={`${log.user_id}-${log.timestamp}-${index}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors group"
                            >
                              <td className="px-6 py-4 whitespace-nowrap align-middle">
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${getLevelColor(levelStr)}`}
                                  >
                                    {levelStr}
                                  </span>
                                  <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 font-mono">
                                    {formatDate(log.timestamp)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap align-middle">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Users className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                  <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate block" title={log.user_id}>
                                    {log.user_id || "-"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 align-middle">
                                <div className="flex items-start gap-2 min-w-0">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase flex-shrink-0 mt-0.5 ${getMethodColor(method)}`}
                                  >
                                    {method}
                                  </span>
                                  <span
                                    className="text-[13px] font-semibold text-slate-600 dark:text-slate-300 block truncate group-hover:whitespace-normal group-hover:break-all transition-all max-h-32 overflow-y-auto"
                                    title={log.api_called}
                                  >
                                    {log.api_called || "-"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 align-middle max-w-lg">
                                <code className="text-xs text-slate-600 dark:text-slate-400 font-mono block truncate group-hover:whitespace-normal group-hover:break-all transition-all max-h-32 overflow-y-auto">
                                  {formatReqRes(
                                    log.req_res_data || log.req_res_body,
                                  )}
                                </code>
                              </td>
                            </motion.tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                              <div className="relative mb-4">
                                <Search className="w-12 h-12 opacity-50" />
                                <X className="w-6 h-6 absolute -bottom-1 -right-1 opacity-70 bg-white dark:bg-black rounded-full" />
                              </div>
                              <p className="text-lg font-bold text-gray-600 dark:text-gray-300">
                                No logs match criteria
                              </p>
                              <p className="text-sm mt-1">
                                Adjust search terms or clear filters to see more
                                results.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.02] flex items-center justify-between z-20 shrink-0 mt-auto">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {cohort ? (
              <>
                Showing{" "}
                <strong className="text-gray-900 dark:text-white">
                  {Math.min(visibleCount, filteredLogs.length)}
                </strong>{" "}
                of{" "}
                <strong className="text-gray-900 dark:text-white">
                  {filteredLogs.length}
                </strong>{" "}
                matching records out of{" "}
                <strong className="text-gray-900 dark:text-white">
                  {logs.length}
                </strong>{" "}
                total
                {" · "}
                <span className="text-xs text-gray-400">
                  Cohort:{" "}
                  <strong className="text-brand-accent">{cohort}</strong>
                </span>
              </>
            ) : (
              "Select a cohort to view logs"
            )}
          </span>
          {isRefreshing && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-brand-accent animate-pulse transition-all duration-500">
              <span className="w-2 h-2 rounded-full bg-brand-accent"></span>
              Syncing...
            </span>
          )}
          {!isRefreshing && cohort && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live — Refreshing 60s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Logs;
