import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database,
  Cpu,
  ChevronRight,
  Save
} from 'lucide-react';
import '../styles/settings.css';

const Settings = () => {
  const { user } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const [activeSection, setActiveSection] = useState('profile');

  const sections = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'security', icon: Shield, label: 'Security' },
    { id: 'appearance', icon: Palette, label: 'Appearance' },
    { id: 'database', icon: Database, label: 'Database' },
    { id: 'devices', icon: Cpu, label: 'Devices' },
  ];

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your preferences</p>
        </div>
      </div>

      <div className="settings-layout">
        {/* Sidebar */}
        <div className="settings-sidebar card">
          <nav className="settings-nav">
            {sections.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                className={`settings-nav-item ${activeSection === id ? 'active' : ''}`}
                onClick={() => setActiveSection(id)}
              >
                <Icon size={20} />
                <span>{label}</span>
                <ChevronRight size={16} className="nav-arrow" />
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="settings-content card">
          {activeSection === 'profile' && (
            <div className="settings-section">
              <h2>Profile Settings</h2>
              <p className="section-description">
                Manage your account information
              </p>

              <div className="settings-form">
                <div className="form-row">
                  <label>Username</label>
                  <input
                    type="text"
                    defaultValue={user?.username}
                    placeholder="Username"
                  />
                </div>

                <div className="form-row">
                  <label>Email</label>
                  <input
                    type="email"
                    defaultValue={user?.email}
                    placeholder="Email address"
                  />
                </div>

                <div className="form-row">
                  <label>Access Modes</label>
                  <div className="modes-display">
                    {user?.modes?.map(mode => (
                      <span key={mode} className="mode-badge">
                        {mode}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="btn btn-primary">
                  <Save size={18} />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="settings-section">
              <h2>Notification Settings</h2>
              <p className="section-description">
                Configure how you receive notifications
              </p>

              <div className="settings-form">
                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Low Stock Alerts</span>
                    <span className="toggle-description">
                      Get notified when products fall below threshold
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Task Updates</span>
                    <span className="toggle-description">
                      Receive updates on task completion
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Device Status</span>
                    <span className="toggle-description">
                      Alert when Raspberry Pi devices go offline
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="settings-section">
              <h2>Security Settings</h2>
              <p className="section-description">
                Manage your password and security options
              </p>

              <div className="settings-form">
                <div className="form-row">
                  <label>Current Password</label>
                  <input type="password" placeholder="Enter current password" />
                </div>

                <div className="form-row">
                  <label>New Password</label>
                  <input type="password" placeholder="Enter new password" />
                </div>

                <div className="form-row">
                  <label>Confirm Password</label>
                  <input type="password" placeholder="Confirm new password" />
                </div>

                <button className="btn btn-primary">
                  <Save size={18} />
                  Update Password
                </button>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="settings-section">
              <h2>Appearance Settings</h2>
              <p className="section-description">
                Customize the look and feel
              </p>

              <div className="settings-form">
                <div className="theme-selector">
                  <label>Theme</label>
                  <div className="theme-options">
                    <button 
                      className={`theme-option ${themeMode === 'dark' ? 'active' : ''}`}
                      onClick={() => setThemeMode('dark')}
                    >
                      <div className="theme-preview dark"></div>
                      <span>Dark</span>
                    </button>
                    <button 
                      className={`theme-option ${themeMode === 'light' ? 'active' : ''}`}
                      onClick={() => setThemeMode('light')}
                    >
                      <div className="theme-preview light"></div>
                      <span>Light</span>
                    </button>
                    <button 
                      className={`theme-option ${themeMode === 'system' ? 'active' : ''}`}
                      onClick={() => setThemeMode('system')}
                    >
                      <div className="theme-preview system"></div>
                      <span>System</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'database' && (
            <div className="settings-section">
              <h2>Database Settings</h2>
              <p className="section-description">
                Database connection and maintenance
              </p>

              <div className="info-card">
                <div className="info-row">
                  <span className="info-label">Status</span>
                  <span className="info-value connected">Connected</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Database</span>
                  <span className="info-value">PostgreSQL</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Host</span>
                  <span className="info-value">localhost:5432</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'devices' && (
            <div className="settings-section">
              <h2>Device Management</h2>
              <p className="section-description">
                Connected Raspberry Pi devices
              </p>

              <div className="devices-placeholder">
                <Cpu size={48} />
                <p>Device management coming soon</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
