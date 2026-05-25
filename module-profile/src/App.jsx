import React, { useState } from "react";
import "./styles.css";

// ─── Profile Module ───────────────────────────────────────────────────────────
// Exposed via Module Federation as "profile/ProfileApp"
// Runs standalone on port 3003 OR loaded dynamically by Shell
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ["Account", "Preferences", "Security"];

// Replace emoji avatars with descriptive labels / textual avatars for accessibility
const AVATARS = [
  "Avatar 1",
  "Avatar 2",
  "Avatar 3",
  "Avatar 4",
  "Avatar 5",
  "Avatar 6",
];

function AccountTab() {
  const [form, setForm] = useState({
    name: "Priya Sharma",
    email: "priya@example.com",
    role: "Product Designer",
    bio: "Crafting delightful digital experiences. Based in Mumbai.",
    avatar: "Avatar 2",
  });
  const [saved, setSaved] = useState(false);

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="tab-content">
      <div className="avatar-row">
        <div className="avatar-display" aria-hidden>
          {/* Display initials derived from name or avatar label for a simple avatar */}
          <div className="avatar-initials">{getInitials(form.name)}</div>
        </div>
        <div className="avatar-picker">
          <p className="picker-label">Choose avatar</p>
          <div className="avatar-options">
            {AVATARS.map((a) => (
              <button
                key={a}
                className={`avatar-opt ${form.avatar === a ? "selected" : ""}`}
                onClick={() => setForm({ ...form, avatar: a })}
                aria-label={`Select ${a}`}
              >
                <span className="avatar-opt-label">{getInitials(a)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fields-grid">
        <div className="field-group">
          <label>Full name</label>
          <input name="name" value={form.name} onChange={handle} />
        </div>
        <div className="field-group">
          <label>Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handle}
          />
        </div>
        <div className="field-group">
          <label>Role / Title</label>
          <input name="role" value={form.role} onChange={handle} />
        </div>
      </div>

      {/* <div className="field-group">
        <label>Bio</label>
        <textarea name="bio" value={form.bio} onChange={handle} rows={3} />
      </div> */}

      {/* <div className="save-row">
        {saved && <span className="save-msg">✓ Changes saved</span>}
        <button className="save-btn" onClick={save}>
          Save changes
        </button>
      </div> */}
    </div>
  );
}

function PreferencesTab() {
  const [prefs, setPrefs] = useState({
    theme: "dark",
    lang: "en",
    notifications: true,
    newsletter: false,
    twoFactor: true,
  });

  const toggle = (key) => setPrefs({ ...prefs, [key]: !prefs[key] });

  return (
    <div className="tab-content">
      <div className="pref-section">
        <div className="pref-label">Appearance</div>
        <div className="pref-row">
          <span>Theme</span>
          <div className="toggle-group">
            {["dark", "light", "system"].map((t) => (
              <button
                key={t}
                className={`toggle-btn ${prefs.theme === t ? "active" : ""}`}
                onClick={() => setPrefs({ ...prefs, theme: t })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="pref-row">
          <span>Language</span>
          <select
            value={prefs.lang}
            onChange={(e) => setPrefs({ ...prefs, lang: e.target.value })}
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="mr">Marathi</option>
          </select>
        </div>
      </div>

      <div className="pref-section">
        <div className="pref-label">Notifications</div>
        {[
          { key: "notifications", label: "Push notifications" },
          { key: "newsletter", label: "Weekly newsletter" },
        ].map(({ key, label }) => (
          <div key={key} className="pref-row">
            <span>{label}</span>
            <div
              className={`switch ${prefs[key] ? "on" : ""}`}
              onClick={() => toggle(key)}
            >
              <div className="switch-thumb" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Utility: get initials from a name or label (up to 2 characters)
function getInitials(text) {
  if (!text) return "";
  const parts = text.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function SecurityTab() {
  const [shown, setShown] = useState(false);
  const sessions = [
    {
      device: "MacBook Pro",
      location: "Mumbai, IN",
      time: "Now",
      current: true,
    },
    {
      device: "iPhone 15",
      location: "Pune, IN",
      time: "2h ago",
      current: false,
    },
    {
      device: "Chrome / Win",
      location: "Delhi, IN",
      time: "3d ago",
      current: false,
    },
  ];

  return (
    <div className="tab-content">
      <div className="pref-section">
        <div className="pref-label">Change password</div>
        <div className="fields-grid single">
          <div className="field-group">
            <label>Current password</label>
            <input type={shown ? "text" : "password"} placeholder="••••••••" />
          </div>
          <div className="field-group">
            <label>New password</label>
            <input
              type={shown ? "text" : "password"}
              placeholder="Min. 8 characters"
            />
          </div>
        </div>
        <label className="show-pass">
          <input
            type="checkbox"
            checked={shown}
            onChange={() => setShown(!shown)}
          />
          Show passwords
        </label>
        <button className="save-btn small">Update password</button>
      </div>

      <div className="pref-section">
        <div className="pref-label">Active sessions</div>
        {sessions.map((s, i) => (
          <div key={i} className="session-row">
            <div>
              <div className="session-device">
                {s.device}{" "}
                {s.current && <span className="current-badge">current</span>}
              </div>
              <div className="session-meta">
                {s.location} · {s.time}
              </div>
            </div>
            {!s.current && <button className="revoke-btn">Revoke</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

const TAB_COMPONENTS = {
  Account: AccountTab,
  Preferences: PreferencesTab,
  Security: SecurityTab,
};

export default function ProfileApp() {
  const [activeTab, setActiveTab] = useState("Account");
  const TabComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="profile-root">
      <div className="profile-bg" />

      <div className="profile-container">
        <header className="profile-header">
          <div className="prof-badge">PROFILE MODULE · PORT 3003</div>
          <h1 className="profile-title">My Profile</h1>
        </header>

        <nav className="tab-nav">
          {TABS.map((t) => (
            <button
              key={t}
              className={`tab-btn ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>

        <div className="profile-card">
          <TabComponent />
        </div>
      </div>
    </div>
  );
}
