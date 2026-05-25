import React, { useState, useEffect } from "react";
import "./styles.css";

// ─── Dashboard Module ─────────────────────────────────────────────────────────
// Exposed via Module Federation as "dashboard/DashboardApp"
// Runs standalone on port 3002 OR loaded dynamically by Shell
// ─────────────────────────────────────────────────────────────────────────────

const STATS = [
  { label: "Total Users",    value: "24,831", delta: "+12.4%", up: true,  icon: "👥" },
  { label: "Revenue",        value: "$48,294", delta: "+8.1%",  up: true,  icon: "💰" },
  { label: "Active Sessions",value: "1,429",  delta: "-2.3%",  up: false, icon: "⚡" },
  { label: "Conversion",     value: "3.74%",  delta: "+0.6%",  up: true,  icon: "📈" },
];

const ACTIVITY = [
  { user: "Priya S.",   action: "upgraded to Pro",        time: "2m ago",  color: "#6c63ff" },
  { user: "Ravi M.",    action: "submitted a support ticket", time: "8m ago",  color: "#f59e0b" },
  { user: "Ananya K.",  action: "completed onboarding",   time: "15m ago", color: "#22c55e" },
  { user: "Dev P.",     action: "exported 3 reports",     time: "22m ago", color: "#3b82f6" },
  { user: "Shreya T.",  action: "invited 4 team members", time: "1h ago",  color: "#ec4899" },
];

function BarChart() {
  const data = [65, 78, 52, 88, 71, 95, 83, 67, 74, 91, 58, 86];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const max = Math.max(...data);

  return (
    <div className="chart-wrap">
      <div className="chart-title">Monthly Revenue <span className="chart-year">2024</span></div>
      <div className="bar-chart">
        {data.map((v, i) => (
          <div key={i} className="bar-col">
            <div
              className="bar"
              style={{ height: `${(v / max) * 100}%` }}
              title={`$${v}k`}
            />
            <span className="bar-label">{months[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardApp() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="dash-root">
      <div className="dash-bg" />

      <header className="dash-header">
        <div>
          <div className="dash-badge">DASHBOARD MODULE · PORT 3002</div>
          <h1 className="dash-title">Overview</h1>
        </div>
        <div className="dash-clock">
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      </header>

      <div className="stats-grid">
        {STATS.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-delta ${s.up ? "up" : "down"}`}>
              {s.up ? "↑" : "↓"} {s.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="dash-bottom">
        <BarChart />

        {/* <div className="activity-wrap">
          <div className="chart-title">Recent Activity</div>
          <ul className="activity-list">
            {ACTIVITY.map((a, i) => (
              <li key={i} className="activity-item">
                <div className="activity-dot" style={{ background: a.color }} />
                <div className="activity-text">
                  <strong>{a.user}</strong> {a.action}
                </div>
                <div className="activity-time">{a.time}</div>
              </li>
            ))}
          </ul>
        </div> */}
      </div>
    </div>
  );
}
