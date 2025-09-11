import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Bell,
  Code,
  Palette,
  Database,
  Key,
  Save,
  FolderOpen,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      autoSync: true,
      syncInterval: 5,
      defaultBranch: 'main',
      workspacePath: '',
    },
    appearance: {
      theme: 'dark',
      fontSize: 14,
      fontFamily: 'SF Mono',
      compactMode: false,
    },
    editor: {
      tabSize: 2,
      wordWrap: true,
      showWhitespace: false,
      highlightActiveLine: true,
    },
    notifications: {
      prUpdates: true,
      mentions: true,
      reviews: true,
      mergeConflicts: true,
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedSettings = await window.electronAPI.db.getSettings();
    if (savedSettings && Object.keys(savedSettings).length > 0) {
      setSettings(savedSettings as any);
    }
  };

  const saveSettings = async () => {
    await window.electronAPI.db.saveSettings(settings);
    // Show success message
  };

  const selectWorkspacePath = async () => {
    const path = await window.electronAPI.dialog.selectDirectory();
    if (path) {
      setSettings({
        ...settings,
        general: { ...settings.general, workspacePath: path },
      });
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'editor', label: 'Editor', icon: Code },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: User },
    { id: 'data', label: 'Data & Cache', icon: Database },
  ];

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">General Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={settings.general.autoSync}
                onChange={(e) => setSettings({
                  ...settings,
                  general: { ...settings.general, autoSync: e.target.checked },
                })}
                className="rounded"
              />
              <span>Enable automatic synchronization</span>
            </label>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">
              Sync interval (minutes)
            </label>
            <input
              type="number"
              value={settings.general.syncInterval}
              onChange={(e) => setSettings({
                ...settings,
                general: { ...settings.general, syncInterval: parseInt(e.target.value) },
              })}
              className="w-32 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)]"
              min="1"
              max="60"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">
              Default branch name
            </label>
            <input
              type="text"
              value={settings.general.defaultBranch}
              onChange={(e) => setSettings({
                ...settings,
                general: { ...settings.general, defaultBranch: e.target.value },
              })}
              className="w-64 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">
              Local workspace path
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={settings.general.workspacePath}
                readOnly
                className="flex-1 max-w-md px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)]"
                placeholder="No workspace selected"
              />
              <button
                onClick={selectWorkspacePath}
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded text-sm hover:bg-[var(--bg-hover)]"
              >
                <FolderOpen size={16} />
                <span>Browse</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Appearance</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">Theme</label>
            <select
              value={settings.appearance.theme}
              onChange={(e) => setSettings({
                ...settings,
                appearance: { ...settings.appearance, theme: e.target.value },
              })}
              className="w-48 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)]"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">
              Font size (px)
            </label>
            <input
              type="number"
              value={settings.appearance.fontSize}
              onChange={(e) => setSettings({
                ...settings,
                appearance: { ...settings.appearance, fontSize: parseInt(e.target.value) },
              })}
              className="w-32 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)]"
              min="10"
              max="24"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={settings.appearance.compactMode}
                onChange={(e) => setSettings({
                  ...settings,
                  appearance: { ...settings.appearance, compactMode: e.target.checked },
                })}
                className="rounded"
              />
              <span>Compact mode</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Account</h3>
        
        {user && (
          <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
            <img
              src={user.avatar_url}
              alt={user.login}
              className="w-16 h-16 rounded-full"
            />
            <div>
              <div className="font-medium text-[var(--text-primary)]">{user.name || user.login}</div>
              <div className="text-sm text-[var(--text-secondary)]">@{user.login}</div>
              {user.email && (
                <div className="text-sm text-[var(--text-tertiary)]">{user.email}</div>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-6">
          <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            <Key size={16} />
            <span>Revoke Access</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'appearance':
        return renderAppearanceSettings();
      case 'account':
        return renderAccountSettings();
      default:
        return <div>Settings for {activeTab} coming soon...</div>;
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 p-4 border-r border-[var(--border-color)] bg-[var(--bg-tertiary)]">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">Settings</h2>
        
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {renderContent()}
        
        {/* Save Button */}
        <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
          <button
            onClick={saveSettings}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-secondary)]"
          >
            <Save size={16} />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;