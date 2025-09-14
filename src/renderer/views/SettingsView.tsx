import React, { useState } from 'react';
import {
  Settings,
  User,
  Bell,
  Code,
  Palette,
  Key,
  Database,
  Info,
  LogOut,
  Save,
  RefreshCw,
  FolderOpen,
  Download
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { cn } from '../utils/cn';
import { UpdaterSettings } from '../components/UpdaterSettings';

export default function SettingsView() {
  const { user, logout } = useAuthStore();
  const { settings, updateSettings, saveSettings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'notifications' | 'advanced' | 'updates'>('general');
  const [showUpdaterSettings, setShowUpdaterSettings] = useState(false);

  const handleSave = async () => {
    await saveSettings();
    console.log('Settings saved:', settings);
  };

  const handleClearCache = async () => {
    // Clear local database cache
    await window.electron.db.execute('DELETE FROM pull_requests');
    await window.electron.db.execute('DELETE FROM repositories');
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'updates', label: 'Updates', icon: Download },
    { id: 'advanced', label: 'Advanced', icon: Code },
  ];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
        <h1 className="text-xl font-semibold mb-6 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Settings
        </h1>
        
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors',
                activeTab === tab.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              )}
            >
              <tab.icon className="w-4 h-4 mr-3" />
              {tab.label}
            </button>
          ))}
        </nav>
        
        <div className="mt-auto pt-6 border-t border-gray-700">
          <div className="flex items-center space-x-3 px-3 py-2">
            <img
              src={user?.avatar_url || ''}
              alt={user?.login || 'User'}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name || user?.login}</div>
              <div className="text-xs text-gray-400 truncate">{user?.email}</div>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded transition-colors mt-2"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">General Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Auto Sync</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.autoSync}
                        onChange={(e) => updateSettings({ autoSync: e.target.checked })}
                        className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-400">
                        Automatically sync repositories and pull requests
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="label">Sync Interval (minutes)</label>
                    <input
                      type="number"
                      value={settings.syncInterval}
                      onChange={(e) => updateSettings({ syncInterval: parseInt(e.target.value) })}
                      className="input w-32"
                      min="1"
                      max="60"
                    />
                  </div>
                  
                  <div>
                    <label className="label">Default Branch</label>
                    <input
                      type="text"
                      value={settings.defaultBranch}
                      onChange={(e) => updateSettings({ defaultBranch: e.target.value })}
                      className="input w-64"
                    />
                  </div>
                  
                  <div>
                    <label className="label">Clone Location</label>
                    <div className="flex items-stretch space-x-2">
                      <input
                        type="text"
                        value={settings.cloneLocation}
                        onChange={(e) => updateSettings({ cloneLocation: e.target.value })}
                        className="input flex-1"
                      />
                      <button
                        onClick={async () => {
                          const path = await window.electron.app.selectDirectory();
                          if (path) {
                            updateSettings({ cloneLocation: path });
                          }
                        }}
                        className="btn btn-secondary"
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Browse
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Appearance</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Theme</label>
                    <select
                      value={settings.theme}
                      onChange={(e) => updateSettings({ theme: e.target.value })}
                      className="input w-48"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="label">Editor Font Size</label>
                    <input
                      type="number"
                      value={settings.fontSize}
                      onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                      className="input w-24"
                      min="10"
                      max="24"
                    />
                  </div>
                  
                  <div>
                    <label className="label">Editor Font Family</label>
                    <select
                      value={settings.fontFamily}
                      onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                      className="input w-64"
                    >
                      <option value="SF Mono">SF Mono</option>
                      <option value="Monaco">Monaco</option>
                      <option value="Consolas">Consolas</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Fira Code">Fira Code</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="label">Terminal Font Size</label>
                    <input
                      type="number"
                      value={settings.terminalFontSize}
                      onChange={(e) => updateSettings({ terminalFontSize: parseInt(e.target.value) })}
                      className="input w-24"
                      min="10"
                      max="24"
                    />
                  </div>

                  <div>
                    <label className="label">Terminal Font Family</label>
                    <select
                      value={settings.terminalFontFamily}
                      onChange={(e) => updateSettings({ terminalFontFamily: e.target.value })}
                      className="input w-64"
                    >
                      <option value="SF Mono">SF Mono</option>
                      <option value="Monaco">Monaco</option>
                      <option value="Consolas">Consolas</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Fira Code">Fira Code</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Editor Options</label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.showWhitespace}
                          onChange={(e) => updateSettings({ showWhitespace: e.target.checked })}
                          className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-400">Show whitespace characters</span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.wordWrap}
                          onChange={(e) => updateSettings({ wordWrap: e.target.checked })}
                          className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-400">Word wrap</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Notifications</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.showDesktopNotifications}
                      onChange={(e) => updateSettings({ showDesktopNotifications: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm">Enable desktop notifications</span>
                  </div>
                  
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.notifyOnPRUpdate}
                        onChange={(e) => updateSettings({ notifyOnPRUpdate: e.target.checked })}
                        disabled={!settings.showDesktopNotifications}
                        className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-400">PR updates</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.notifyOnReview}
                        onChange={(e) => updateSettings({ notifyOnReview: e.target.checked })}
                        disabled={!settings.showDesktopNotifications}
                        className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-400">New reviews</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.notifyOnMention}
                        onChange={(e) => updateSettings({ notifyOnMention: e.target.checked })}
                        disabled={!settings.showDesktopNotifications}
                        className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-400">Mentions</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.notifyOnMerge}
                        onChange={(e) => updateSettings({ notifyOnMerge: e.target.checked })}
                        disabled={!settings.showDesktopNotifications}
                        className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-400">PR merged</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Updates</h2>
                
                <div className="space-y-4">
                  <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Download className="w-5 h-5 text-blue-400" />
                      <h3 className="font-medium text-white">Automatic Updates</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">
                      Bottleneck automatically checks for updates and notifies you when a new version is available.
                    </p>
                    <button
                      onClick={() => setShowUpdaterSettings(true)}
                      className="btn btn-primary"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Update Settings
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-white font-medium">Current Version</h3>
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">v{window.electron?.app?.getVersion?.() || '0.1.0'}</span>
                        <span className="text-xs text-gray-500">Latest</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-white font-medium">Release Notes</h3>
                    <div className="p-4 bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-400">
                        For the latest release notes and changelog, visit our{' '}
                        <a
                          href="https://github.com/YOUR_GITHUB_USERNAME/bottleneck/releases"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          GitHub Releases page
                        </a>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-white font-medium">Manual Update Check</h3>
                    <p className="text-sm text-gray-400">
                      You can manually check for updates at any time using the button below.
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          await window.electron.updater.checkForUpdates();
                        } catch (error) {
                          console.error('Failed to check for updates:', error);
                        }
                      }}
                      className="btn btn-secondary"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Check for Updates
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Advanced</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Max Concurrent API Requests</label>
                    <input
                      type="number"
                      value={settings.maxConcurrentRequests}
                      onChange={(e) => updateSettings({ maxConcurrentRequests: parseInt(e.target.value) })}
                      className="input w-24"
                      min="1"
                      max="50"
                    />
                  </div>
                  
                  <div>
                    <label className="label">Cache Size (MB)</label>
                    <input
                      type="number"
                      value={settings.cacheSize}
                      onChange={(e) => updateSettings({ cacheSize: parseInt(e.target.value) })}
                      className="input w-32"
                      min="100"
                      max="5000"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.enableDebugMode}
                      onChange={(e) => updateSettings({ enableDebugMode: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm">Enable debug mode</span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.enableTelemetry}
                      onChange={(e) => updateSettings({ enableTelemetry: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm">Share anonymous usage data</span>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-700">
                    <h3 className="text-sm font-semibold mb-3">Danger Zone</h3>
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={handleClearCache}
                        className="btn btn-danger w-fit"
                      >
                        <Database className="w-4 h-4 mr-2" />
                        Clear Cache
                      </button>

                      <button className="btn btn-danger w-fit">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset to Defaults
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <button
              onClick={handleSave}
              className="btn btn-primary"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Updater Settings Modal */}
      {showUpdaterSettings && (
        <UpdaterSettings onClose={() => setShowUpdaterSettings(false)} />
      )}
    </div>
  );
}
