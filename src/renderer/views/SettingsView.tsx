import { useState } from "react";
import {
  Settings,
  Bell,
  Code,
  Palette,
  Database,
  LogOut,
  Save,
  RefreshCw,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";

export default function SettingsView() {
  const { user, logout } = useAuthStore();
  const { settings, updateSettings, saveSettings, resetSettings } = useSettingsStore();
  const { theme } = useUIStore();
  const [activeTab, setActiveTab] = useState<
    "general" | "appearance" | "notifications" | "advanced"
  >("general");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleSave = async () => {
    await saveSettings();
    console.log("Settings saved:", settings);
  };

  const handleClearCache = async () => {
    // Clear local database cache
    await window.electron.db.execute("DELETE FROM pull_requests");
    await window.electron.db.execute("DELETE FROM repositories");
  };

  const handleResetToDefaults = async () => {
    setIsResetting(true);
    try {
      // 1. Clear all database tables
      const tables = [
        "comments",
        "reviews",
        "files",
        "draft_reviews",
        "pull_requests",
        "branches",
        "pr_groups",
        "saved_filters",
        "preferences",
        "repositories",
      ];

      for (const table of tables) {
        await window.electron.db.execute(`DELETE FROM ${table}`);
      }

      // 2. Clear electron-store settings
      if (window.electron.settings.clear) {
        await window.electron.settings.clear();
      } else {
        // Fallback: clear individual settings by resetting to defaults
        const defaultSettings = {
          autoSync: true,
          syncInterval: 5,
          defaultBranch: "main",
          cloneLocation: "~/repos",
          theme: "dark",
          fontSize: 13,
          fontFamily: "SF Mono",
          terminalFontSize: 13,
          terminalFontFamily: "SF Mono",
          showWhitespace: false,
          wordWrap: false,
          showDesktopNotifications: true,
          notifyOnPRUpdate: true,
          notifyOnReview: true,
          notifyOnMention: true,
          notifyOnMerge: true,
          maxConcurrentRequests: 10,
          cacheSize: 500,
          enableDebugMode: false,
          enableTelemetry: false,
        };

        for (const [key, value] of Object.entries(defaultSettings)) {
          await window.electron.settings.set(key, value);
        }
      }

      // 3. Logout from GitHub
      await logout();

      // 4. Clear localStorage
      localStorage.clear();

      // 5. Clear sessionStorage
      sessionStorage.clear();

      // 6. Reset all Zustand stores to their initial states
      resetSettings(); // Settings store

      // 7. Reload the application to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Failed to reset to defaults:", error);
      alert("Failed to reset application. Please try again.");
    } finally {
      setIsResetting(false);
      setShowResetDialog(false);
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "advanced", label: "Advanced", icon: Code },
  ];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className={cn(
          "w-64 border-r p-4",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-gray-50 border-gray-200",
        )}
      >
        <h1
          className={cn(
            "text-xl font-semibold mb-6 flex items-center",
            theme === "dark" ? "text-white" : "text-gray-900",
          )}
        >
          <Settings className="w-5 h-5 mr-2" />
          Settings
        </h1>

        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors",
                activeTab === tab.id
                  ? theme === "dark"
                    ? "bg-gray-700 text-white"
                    : "bg-gray-200 text-gray-900"
                  : theme === "dark"
                    ? "text-gray-400 hover:bg-gray-700 hover:text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <tab.icon className="w-4 h-4 mr-3" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div
          className={cn(
            "mt-auto pt-6 border-t",
            theme === "dark" ? "border-gray-700" : "border-gray-200",
          )}
        >
          <div className="flex items-center space-x-3 px-3 py-2">
            <img
              src={user?.avatar_url || ""}
              alt={user?.login || "User"}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "text-sm font-medium truncate",
                  theme === "dark" ? "text-white" : "text-gray-900",
                )}
              >
                {user?.name || user?.login}
              </div>
              <div
                className={cn(
                  "text-xs truncate",
                  theme === "dark" ? "text-gray-400" : "text-gray-600",
                )}
              >
                {user?.email}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className={cn(
              "w-full flex items-center px-3 py-2 text-sm rounded transition-colors mt-2",
              theme === "dark"
                ? "text-red-400 hover:bg-gray-700"
                : "text-red-600 hover:bg-red-50",
            )}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex-1 overflow-y-auto",
          theme === "dark" ? "bg-gray-900" : "bg-white",
        )}
      >
        <div className="max-w-3xl mx-auto p-8">
          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <h2
                  className={cn(
                    "text-lg font-semibold mb-4",
                    theme === "dark" ? "text-white" : "text-gray-900",
                  )}
                >
                  General Settings
                </h2>

                <div className="space-y-4">
                  <div>
                    <label
                      className={cn(
                        "label",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      Auto Sync
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.autoSync}
                        onChange={(e) =>
                          updateSettings({ autoSync: e.target.checked })
                        }
                        className={cn(
                          "rounded focus:ring-blue-500",
                          theme === "dark"
                            ? "border-gray-600 bg-gray-700 text-blue-500"
                            : "border-gray-300 bg-white text-blue-600",
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          theme === "dark" ? "text-gray-400" : "text-gray-600",
                        )}
                      >
                        Automatically sync repositories and pull requests
                      </span>
                    </div>
                  </div>

                  <div>
                    <label
                      className={cn(
                        "label",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      Sync Interval (minutes)
                    </label>
                    <input
                      type="number"
                      value={settings.syncInterval}
                      onChange={(e) =>
                        updateSettings({
                          syncInterval: parseInt(e.target.value),
                        })
                      }
                      className={cn(
                        "input w-32",
                        theme === "dark"
                          ? "bg-gray-800 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900",
                      )}
                      min="1"
                      max="60"
                    />
                  </div>

                  <div>
                    <label
                      className={cn(
                        "label",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      Default Branch
                    </label>
                    <input
                      type="text"
                      value={settings.defaultBranch}
                      onChange={(e) =>
                        updateSettings({ defaultBranch: e.target.value })
                      }
                      className={cn(
                        "input w-64",
                        theme === "dark"
                          ? "bg-gray-800 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900",
                      )}
                    />
                  </div>

                  <div>
                    <label
                      className={cn(
                        "label",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      Clone Location
                    </label>
                    <div className="flex items-stretch space-x-2">
                      <input
                        type="text"
                        value={settings.cloneLocation}
                        onChange={(e) =>
                          updateSettings({ cloneLocation: e.target.value })
                        }
                        className={cn(
                          "input flex-1",
                          theme === "dark"
                            ? "bg-gray-800 border-gray-600 text-white"
                            : "bg-white border-gray-300 text-gray-900",
                        )}
                      />
                      <button
                        onClick={async () => {
                          const path =
                            await window.electron.app.selectDirectory();
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

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2
                  className={cn(
                    "text-lg font-semibold mb-4",
                    theme === "dark" ? "text-white" : "text-gray-900",
                  )}
                >
                  Appearance
                </h2>

                <div className="space-y-4">
                  <div>
                    <label
                      className={cn(
                        "label",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      Theme
                    </label>
                    <select
                      value={settings.theme}
                      onChange={(e) =>
                        updateSettings({ theme: e.target.value as "dark" | "light" | "auto" })
                      }
                      className={cn(
                        "input w-48",
                        theme === "dark"
                          ? "bg-gray-800 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900",
                      )}
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>

                  <div>
                    <label
                      className={cn(
                        "label",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      Editor Font Size
                    </label>
                    <input
                      type="number"
                      value={settings.fontSize}
                      onChange={(e) =>
                        updateSettings({ fontSize: parseInt(e.target.value) })
                      }
                      className={cn(
                        "input w-24",
                        theme === "dark"
                          ? "bg-gray-800 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900",
                      )}
                      min="10"
                      max="24"
                    />
                  </div>

                  <div>
                    <label
                      className={cn(
                        "label",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      Editor Font Family
                    </label>
                    <select
                      value={settings.fontFamily}
                      onChange={(e) =>
                        updateSettings({ fontFamily: e.target.value })
                      }
                      className={cn(
                        "input w-64",
                        theme === "dark"
                          ? "bg-gray-800 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900",
                      )}
                    >
                      <option value="SF Mono">SF Mono</option>
                      <option value="Monaco">Monaco</option>
                      <option value="Consolas">Consolas</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Fira Code">Fira Code</option>
                    </select>
                  </div>

                  <div>
                    <label
                      className={cn(
                        "label",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      Terminal Font Size
                    </label>
                    <input
                      type="number"
                      value={settings.terminalFontSize}
                      onChange={(e) =>
                        updateSettings({
                          terminalFontSize: parseInt(e.target.value),
                        })
                      }
                      className={cn(
                        "input w-24",
                        theme === "dark"
                          ? "bg-gray-800 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900",
                      )}
                      min="10"
                      max="24"
                    />
                  </div>

                  <div>
                    <label
                      className={cn(
                        "label",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      Terminal Font Family
                    </label>
                    <select
                      value={settings.terminalFontFamily}
                      onChange={(e) =>
                        updateSettings({ terminalFontFamily: e.target.value })
                      }
                      className={cn(
                        "input w-64",
                        theme === "dark"
                          ? "bg-gray-800 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900",
                      )}
                    >
                      <option value="SF Mono">SF Mono</option>
                      <option value="Monaco">Monaco</option>
                      <option value="Consolas">Consolas</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Fira Code">Fira Code</option>
                    </select>
                  </div>

                  <div>
                    <label
                      className={cn(
                        "label",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      Editor Options
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.showWhitespace}
                          onChange={(e) =>
                            updateSettings({ showWhitespace: e.target.checked })
                          }
                          className={cn(
                            "rounded focus:ring-blue-500",
                            theme === "dark"
                              ? "border-gray-600 bg-gray-700 text-blue-500"
                              : "border-gray-300 bg-white text-blue-600",
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm",
                            theme === "dark"
                              ? "text-gray-400"
                              : "text-gray-600",
                          )}
                        >
                          Show whitespace characters
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.wordWrap}
                          onChange={(e) =>
                            updateSettings({ wordWrap: e.target.checked })
                          }
                          className={cn(
                            "rounded focus:ring-blue-500",
                            theme === "dark"
                              ? "border-gray-600 bg-gray-700 text-blue-500"
                              : "border-gray-300 bg-white text-blue-600",
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm",
                            theme === "dark"
                              ? "text-gray-400"
                              : "text-gray-600",
                          )}
                        >
                          Word wrap
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2
                  className={cn(
                    "text-lg font-semibold mb-4",
                    theme === "dark" ? "text-white" : "text-gray-900",
                  )}
                >
                  Notifications
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.showDesktopNotifications}
                      onChange={(e) =>
                        updateSettings({
                          showDesktopNotifications: e.target.checked,
                        })
                      }
                      className={cn(
                        "rounded focus:ring-blue-500",
                        theme === "dark"
                          ? "border-gray-600 bg-gray-700 text-blue-500"
                          : "border-gray-300 bg-white text-blue-600",
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm",
                        theme === "dark" ? "text-white" : "text-gray-900",
                      )}
                    >
                      Enable desktop notifications
                    </span>
                  </div>

                  <div className="ml-6 space-y-2">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.notifyOnPRUpdate}
                        onChange={(e) =>
                          updateSettings({ notifyOnPRUpdate: e.target.checked })
                        }
                        disabled={!settings.showDesktopNotifications}
                        className={cn(
                          "rounded focus:ring-blue-500 disabled:opacity-50",
                          theme === "dark"
                            ? "border-gray-600 bg-gray-700 text-blue-500"
                            : "border-gray-300 bg-white text-blue-600",
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          theme === "dark" ? "text-gray-400" : "text-gray-600",
                        )}
                      >
                        PR updates
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.notifyOnReview}
                        onChange={(e) =>
                          updateSettings({ notifyOnReview: e.target.checked })
                        }
                        disabled={!settings.showDesktopNotifications}
                        className={cn(
                          "rounded focus:ring-blue-500 disabled:opacity-50",
                          theme === "dark"
                            ? "border-gray-600 bg-gray-700 text-blue-500"
                            : "border-gray-300 bg-white text-blue-600",
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          theme === "dark" ? "text-gray-400" : "text-gray-600",
                        )}
                      >
                        New reviews
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.notifyOnMention}
                        onChange={(e) =>
                          updateSettings({ notifyOnMention: e.target.checked })
                        }
                        disabled={!settings.showDesktopNotifications}
                        className={cn(
                          "rounded focus:ring-blue-500 disabled:opacity-50",
                          theme === "dark"
                            ? "border-gray-600 bg-gray-700 text-blue-500"
                            : "border-gray-300 bg-white text-blue-600",
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          theme === "dark" ? "text-gray-400" : "text-gray-600",
                        )}
                      >
                        Mentions
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.notifyOnMerge}
                        onChange={(e) =>
                          updateSettings({ notifyOnMerge: e.target.checked })
                        }
                        disabled={!settings.showDesktopNotifications}
                        className={cn(
                          "rounded focus:ring-blue-500 disabled:opacity-50",
                          theme === "dark"
                            ? "border-gray-600 bg-gray-700 text-blue-500"
                            : "border-gray-300 bg-white text-blue-600",
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          theme === "dark" ? "text-gray-400" : "text-gray-600",
                        )}
                      >
                        PR merged
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "advanced" && (
            <div className="space-y-6">
              <div>
                <h2
                  className={cn(
                    "text-lg font-semibold mb-4",
                    theme === "dark" ? "text-white" : "text-gray-900",
                  )}
                >
                  Advanced
                </h2>

                <div className="space-y-4">
                  <div>
                    <label
                      className={cn(
                        "label",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      Max Concurrent API Requests
                    </label>
                    <input
                      type="number"
                      value={settings.maxConcurrentRequests}
                      onChange={(e) =>
                        updateSettings({
                          maxConcurrentRequests: parseInt(e.target.value),
                        })
                      }
                      className={cn(
                        "input w-24",
                        theme === "dark"
                          ? "bg-gray-800 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900",
                      )}
                      min="1"
                      max="50"
                    />
                  </div>

                  <div>
                    <label
                      className={cn(
                        "label",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                    >
                      Cache Size (MB)
                    </label>
                    <input
                      type="number"
                      value={settings.cacheSize}
                      onChange={(e) =>
                        updateSettings({ cacheSize: parseInt(e.target.value) })
                      }
                      className={cn(
                        "input w-32",
                        theme === "dark"
                          ? "bg-gray-800 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900",
                      )}
                      min="100"
                      max="5000"
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.enableDebugMode}
                      onChange={(e) =>
                        updateSettings({ enableDebugMode: e.target.checked })
                      }
                      className={cn(
                        "rounded focus:ring-blue-500",
                        theme === "dark"
                          ? "border-gray-600 bg-gray-700 text-blue-500"
                          : "border-gray-300 bg-white text-blue-600",
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm",
                        theme === "dark" ? "text-white" : "text-gray-900",
                      )}
                    >
                      Enable debug mode
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.enableTelemetry}
                      onChange={(e) =>
                        updateSettings({ enableTelemetry: e.target.checked })
                      }
                      className={cn(
                        "rounded focus:ring-blue-500",
                        theme === "dark"
                          ? "border-gray-600 bg-gray-700 text-blue-500"
                          : "border-gray-300 bg-white text-blue-600",
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm",
                        theme === "dark" ? "text-white" : "text-gray-900",
                      )}
                    >
                      Share anonymous usage data
                    </span>
                  </div>

                  <div
                    className={cn(
                      "pt-4 border-t",
                      theme === "dark" ? "border-gray-700" : "border-gray-200",
                    )}
                  >
                    <h3
                      className={cn(
                        "text-sm font-semibold mb-3",
                        theme === "dark" ? "text-red-400" : "text-red-600",
                      )}
                    >
                      Danger Zone
                    </h3>
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={handleClearCache}
                        className="btn btn-danger w-fit"
                      >
                        <Database className="w-4 h-4 mr-2" />
                        Clear Cache
                      </button>

                      <button
                        onClick={() => setShowResetDialog(true)}
                        className="btn btn-danger w-fit"
                        disabled={isResetting}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {isResetting ? "Resetting..." : "Reset to Defaults"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          <div
            className={cn(
              "mt-8 pt-6 border-t",
              theme === "dark" ? "border-gray-700" : "border-gray-200",
            )}
          >
            <button onClick={handleSave} className="btn btn-primary">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className={cn(
              "bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4",
              "shadow-xl border",
              theme === "dark" ? "border-gray-700" : "border-gray-200",
            )}
          >
            <div className="flex items-start mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3
                  className={cn(
                    "text-lg font-semibold mb-2",
                    theme === "dark" ? "text-white" : "text-gray-900",
                  )}
                >
                  Reset to Defaults
                </h3>
                <p
                  className={cn(
                    "text-sm",
                    theme === "dark" ? "text-gray-300" : "text-gray-600",
                  )}
                >
                  This action will:
                </p>
                <ul
                  className={cn(
                    "text-sm mt-2 space-y-1 list-disc list-inside",
                    theme === "dark" ? "text-gray-300" : "text-gray-600",
                  )}
                >
                  <li>Delete all cached pull requests and repositories</li>
                  <li>Clear all saved preferences and settings</li>
                  <li>Sign you out from GitHub</li>
                  <li>Remove all local storage data</li>
                  <li>Reset the application to its initial state</li>
                </ul>
                <p
                  className={cn(
                    "text-sm mt-3 font-semibold",
                    theme === "dark" ? "text-red-400" : "text-red-600",
                  )}
                >
                  This action cannot be undone!
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowResetDialog(false)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium",
                  "border",
                  theme === "dark"
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50",
                )}
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefaults}
                className="btn btn-danger"
                disabled={isResetting}
              >
                {isResetting ? "Resetting..." : "Reset Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
