import React, { useState, useEffect } from 'react';
import { CheckCircle, Download, RefreshCw, Settings, AlertCircle } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

interface UpdaterSettingsProps {
  onClose: () => void;
}

export const UpdaterSettings: React.FC<UpdaterSettingsProps> = ({ onClose }) => {
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [skippedVersions, setSkippedVersions] = useState<string[]>([]);

  useEffect(() => {
    loadSettings();
    loadSkippedVersions();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await window.electron.updater.isAutoUpdateEnabled();
      if (result.success) {
        setAutoUpdateEnabled(result.enabled);
      }
    } catch (error) {
      console.error('Failed to load updater settings:', error);
    }
  };

  const loadSkippedVersions = async () => {
    try {
      const result = await window.electron.updater.getSkippedVersions();
      if (result.success) {
        setSkippedVersions(result.versions);
      }
    } catch (error) {
      console.error('Failed to load skipped versions:', error);
    }
  };

  const handleAutoUpdateToggle = async (enabled: boolean) => {
    try {
      const result = await window.electron.updater.setAutoUpdateEnabled(enabled);
      if (result.success) {
        setAutoUpdateEnabled(enabled);
      } else {
        setError(result.error || 'Failed to update setting');
      }
    } catch (error) {
      setError('Failed to update setting');
    }
  };

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const result = await window.electron.updater.checkForUpdates();
      if (!result.success) {
        setError(result.error || 'Failed to check for updates');
      }
    } catch (error) {
      setError('Failed to check for updates');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!updateInfo) return;
    
    setIsDownloading(true);
    setError(null);
    
    try {
      const result = await window.electron.updater.downloadUpdate();
      if (!result.success) {
        setError(result.error || 'Failed to download update');
      }
    } catch (error) {
      setError('Failed to download update');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleInstallUpdate = async () => {
    try {
      const result = await window.electron.updater.installUpdate();
      if (!result.success) {
        setError(result.error || 'Failed to install update');
      }
    } catch (error) {
      setError('Failed to install update');
    }
  };

  const handleClearSkippedVersions = async () => {
    try {
      const result = await window.electron.updater.clearSkippedVersions();
      if (result.success) {
        setSkippedVersions([]);
      } else {
        setError(result.error || 'Failed to clear skipped versions');
      }
    } catch (error) {
      setError('Failed to clear skipped versions');
    }
  };

  // Listen for update events
  useEffect(() => {
    const handleUpdateAvailable = (event: any, info: UpdateInfo) => {
      setUpdateInfo(info);
    };

    const handleUpdateDownloadProgress = (event: any, progress: any) => {
      setDownloadProgress(progress.percent);
    };

    const handleUpdateDownloaded = (event: any, info: UpdateInfo) => {
      setUpdateInfo(info);
      setIsDownloading(false);
    };

    const handleUpdateError = (event: any, error: string) => {
      setError(error);
      setIsChecking(false);
      setIsDownloading(false);
    };

    window.electron.on('update-available', handleUpdateAvailable);
    window.electron.on('update-download-progress', handleUpdateDownloadProgress);
    window.electron.on('update-downloaded', handleUpdateDownloaded);
    window.electron.on('update-error', handleUpdateError);

    return () => {
      window.electron.off('update-available', handleUpdateAvailable);
      window.electron.off('update-download-progress', handleUpdateDownloadProgress);
      window.electron.off('update-downloaded', handleUpdateDownloaded);
      window.electron.off('update-error', handleUpdateError);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Update Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Auto-update toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium">Automatic Updates</h3>
              <p className="text-gray-400 text-sm">Check for updates automatically</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoUpdateEnabled}
                onChange={(e) => handleAutoUpdateToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Manual update check */}
          <div className="space-y-3">
            <h3 className="text-white font-medium">Manual Update Check</h3>
            <button
              onClick={handleCheckForUpdates}
              disabled={isChecking}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {isChecking ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isChecking ? 'Checking...' : 'Check for Updates'}
            </button>
          </div>

          {/* Update available */}
          {updateInfo && (
            <div className="space-y-3">
              <h3 className="text-white font-medium">Update Available</h3>
              <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-medium">Version {updateInfo.version}</span>
                </div>
                {updateInfo.releaseDate && (
                  <p className="text-gray-400 text-sm">
                    Released: {new Date(updateInfo.releaseDate).toLocaleDateString()}
                  </p>
                )}
                {updateInfo.releaseNotes && (
                  <div className="mt-2 text-sm text-gray-300">
                    <p className="font-medium mb-1">Release Notes:</p>
                    <div className="text-xs text-gray-400 whitespace-pre-wrap">
                      {updateInfo.releaseNotes}
                    </div>
                  </div>
                )}
              </div>

              {isDownloading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>Downloading...</span>
                    <span>{Math.round(downloadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadUpdate}
                    disabled={isDownloading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Update
                  </button>
                  <button
                    onClick={handleInstallUpdate}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Install & Restart
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Skipped versions */}
          {skippedVersions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Skipped Versions</h3>
                <button
                  onClick={handleClearSkippedVersions}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Clear All
                </button>
              </div>
              <div className="space-y-1">
                {skippedVersions.map((version) => (
                  <div
                    key={version}
                    className="flex items-center justify-between p-2 bg-gray-800 rounded text-sm"
                  >
                    <span className="text-gray-300">v{version}</span>
                    <span className="text-gray-500 text-xs">Skipped</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};