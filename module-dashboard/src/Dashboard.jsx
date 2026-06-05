import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { ASSESSMENT_API_BASE_URL } from './api';
import {
  Moon, Sun, Plus, Users, Zap, Timer, Award,
  TrendingUp, MoreHorizontal, ArrowUpRight, BarChart3,
  Activity, Clock, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { useTheme } from './ThemeContext';
import PageHeader from "sharedDesignSystem/PageHeader";
import Card from "sharedDesignSystem/Card";

const timeAgo = (dateString) => {
  if (!dateString) return 'Just now';
  const now = new Date();
  const past = new Date(dateString);
  const diffInSec = Math.floor((now - past) / 1000);

  if (diffInSec < 60) return `${diffInSec}s ago`;
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m ago`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return past.toLocaleDateString();
};

const inferCohortFromUser = (username) => {
  if (!username) return '';
  if (username.includes('-')) {
    const parts = username.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1]}`;
    }
  }
  return username;
};

function Dashboard() {
  const { userRole, user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAssessments: 0,
    totalLabs: 0,
    totalSubmissions: 0,
    avgMinutes: '0.0',
    assignedAssessments: 0,
    completedAssessments: 0,
    avgAccuracy: '0.0'
  });
  const [activity, setActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState(null);
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === 'dark';

  // ----- Static Data for Candidate (Placeholder) -----
  const candidateProgress = {
    completed: 12,
    total: 20,
    averageScore: '88%'
  };

  const candidateNotifications = [
    { id: 1, title: 'New Assessment Assigned: SQL Basics', time: '10 mins ago', type: 'info' },
    { id: 2, title: 'Grades released for Python Module', time: '1 day ago', type: 'success' },
    { id: 3, title: 'Maintenance scheduled for tonight', time: '2 days ago', type: 'warning' },
  ];

  useEffect(() => {
    if (userRole) {
      fetchDashboardStats();
    }
  }, [userRole, user]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const isPrivileged = userRole === 'admin';
      const endpoint = isPrivileged
        ? `${ASSESSMENT_API_BASE_URL}/reports/admin/stats`
        : `${ASSESSMENT_API_BASE_URL}/api/reports/candidate/stats?username=${user?.username}&cohort=${inferCohortFromUser(user?.username)}`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setStats(prev => ({ ...prev, ...data.stats }));
        setActivity(data.activity || []);
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error("Dashboard Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Mapped items for the new UI
  const adminStatsItems = [
    {
      label: 'TOTAL CANDIDATES',
      value: stats.totalUsers || 0,
      icon: <Users className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      trend: stats.totalUsers > 0 ? 'Live' : 'Empty',
      trendDir: 'up'
    },
    {
      label: 'TOTAL ASSESSMENTS',
      value: stats.totalAssessments || 0,
      icon: <CheckCircle2 className="w-5 h-5 text-indigo-600" />,
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      trend: stats.totalAssessments > 0 ? 'Ready' : 'None',
      trendDir: 'up'
    },
    {
      label: 'TOTAL SUBMISSIONS',
      value: stats.totalSubmissions || 0,
      icon: <Zap className="w-5 h-5 text-purple-600" />,
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      trend: stats.totalSubmissions > 0 ? 'Active' : 'Wait',
      trendDir: 'up'
    },
    {
      label: 'AVG. TIME (MIN)',
      value: stats.avgMinutes || '0.0',
      icon: <Timer className="w-5 h-5 text-green-600" />,
      bg: 'bg-green-50 dark:bg-green-900/20',
      trend: 'Avg',
      trendDir: 'up'
    },
  ];

  const candidateStatsItems = [
    {
      label: 'ASSIGNED TASKS',
      value: stats.assignedAssessments || 0,
      icon: <Activity className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      trend: stats.assignedAssessments > 0 ? 'Active' : 'None',
      trendDir: 'up'
    },
    {
      label: 'COMPLETED',
      value: stats.completedAssessments || 0,
      icon: <CheckCircle2 className="w-5 h-5 text-indigo-600" />,
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      trend: 'Quiz',
      trendDir: 'up'
    },
    {
      label: 'AVG. ACCURACY',
      value: `${stats.avgAccuracy || 0}%`,
      icon: <TrendingUp className="w-5 h-5 text-purple-600" />,
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      trend: 'Score',
      trendDir: 'up'
    },
    {
      label: 'CERTIFICATES',
      value: stats.completedAssessments > 5 ? '1' : '0',
      icon: <Award className="w-5 h-5 text-green-600" />,
      bg: 'bg-green-50 dark:bg-green-900/20',
      trend: 'Earned',
      trendDir: 'up'
    },
  ];

  // ----- Render Components -----

  const StatCard = ({ label, value, icon, bg, trend, trendDir }) => (
    <Card className="hover:border-brand-accent/20 dark:hover:border-brand-accent/30" accentColor="var(--brand-accent)">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${bg} transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${trendDir === 'up' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-500 bg-red-50 dark:bg-red-900/20'}`}>
          {trendDir === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-1 uppercase">{label}</p>
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>
      </div>
    </Card>
  );

  const ActivityItem = ({ title, time, type }) => {
    const colorMap = {
      info: 'bg-brand-accent',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500',
    };

    return (
      <div className="flex gap-4 relative pl-2 group">
        {/* Timeline Line */}
        <div className="absolute left-[3px] top-2 bottom-0 w-[2px] bg-gray-100 dark:bg-gray-800 group-last:hidden"></div>

        {/* Dot */}
        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 z-10 ${colorMap[type] || 'bg-gray-400'} ring-4 ring-white dark:ring-gray-900`}></div>

        <div className="pb-6">
          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            Assessment submission recorded. Full report available in the analytics tab.
          </p>
          <span className="text-[10px] text-gray-400 font-medium mt-2 block">{time}</span>
        </div>
      </div>
    );
  };

  // ----- Admin View -----
  const AdminDashboard = () => (
    <div className="flex flex-col h-full gap-4">
      <PageHeader
        title="Overview"
        onRefresh={fetchDashboardStats}
        loading={loading}
        actions={
          userRole === 'admin' && (
            <button
              onClick={() => navigate('/create-assessment')}
              className="bg-brand-accent hover:bg-brand-accent-hover text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-brand-accent/20 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              NEW ASSESSMENT
            </button>
          )
        }
      />

      {/* Stats Row - Smaller Gap */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {(userRole === 'admin' ? adminStatsItems : candidateStatsItems).map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Main Content Grid - Flex Grow */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Platform Activity Chart - Spans 2 Columns */}
        <Card className="lg:col-span-2 flex flex-col h-full" accentColor="var(--brand-accent)">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Platform Activity</h3>
              <p className="text-gray-500 text-xs mt-1">Assessment engagement over the last 7 days</p>
            </div>
          </div>

          {/* Bars - Make taller with smaller min-h */}
          <div className="flex-1 flex items-end justify-between gap-6 px-2 min-h-[150px]">
            {activity.length > 0 ? (
              activity.map((act, i) => {
                const maxCount = Math.max(...activity.map(a => a.count), 10);
                const count = act.count || 0;
                const h = (count / maxCount) * 100;
                const dateObj = new Date(act.date);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
                    <div className="relative w-full flex justify-center h-full items-end">
                      <div
                        onMouseEnter={() => setHoveredBar(i)}
                        onMouseLeave={() => setHoveredBar(null)}
                        className={`w-full max-w-[60px] rounded-t-2xl transition-all duration-700 ease-out hover:opacity-90 cursor-pointer ${count === maxCount ? 'bg-brand-accent' : 'bg-brand-accent/30 dark:bg-brand-accent/10'}`}
                        style={{ height: `${Math.max(h, 5)}%` }}
                      >
                        {hoveredBar === i && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded whitespace-nowrap z-10 pointer-events-none">
                            {count} Events
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{dayName}</span>
                  </div>
                )
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 italic text-sm">
                No activity recorded in the last 7 days.
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity Feed - Spans 1 Column */}
        <Card className="flex flex-col h-full" accentColor="var(--brand-accent)">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 shrink-0">Recent Activity</h3>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {/* Fallback data if no notifications */}
            {(notifications.length > 0 ? notifications : [
              { id: 1, title: 'System Upgrade', time: '2 mins ago', type: 'info' },
              { id: 2, title: 'New Talent Pipeline', time: '15 mins ago', type: 'success' },
              { id: 3, title: 'Action Required', time: '45 mins ago', type: 'warning' },
              { id: 4, title: 'Analysis Ready', time: '3 hours ago', type: 'info' },
            ]).map((notif) => (
              <ActivityItem key={notif.id} {...notif} time={notif.time.includes('ago') ? notif.time : timeAgo(notif.time)} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  // ----- Candidate View (Unchanged most parts, just safe keeping) -----
  const CandidateDashboard = () => (
    <div className="space-y-4">
      {/* Keeping simple candidate view as per original, or can upgrade later. 
          Focus was on Admin Dashboard UI logic. */}
      <AdminDashboard />
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-brand-dark text-gray-800 dark:text-gray-100 font-['Poppins',sans-serif] transition-colors duration-500 relative">
      <div className="px-6 pt-6 pb-6 w-full flex-1 flex flex-col mx-auto overflow-hidden">
        <AdminDashboard />
      </div>
    </div>
  );
}

export default Dashboard;
