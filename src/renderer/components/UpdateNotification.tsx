import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, AlertCircle, CheckCircle, X } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseName?: string;
  releaseNotes?: string;
}

interface ProgressInfo {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

const UpdateNotification: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<ProgressInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');

  useEffect(() => {
    // Get current version
    window.electron.updater.getVersion().then((result) => {
      if (result.success) {
        setCurrentVersion(result.version);
      }
    });

    // Set up update event listeners
    window.electron.updater.onUpdateAvailable((info) => {
      console.log('Update available:', info);
      setUpdateAvailable(info);
    });

    window.electron.updater.onUpdateDownloaded((info) => {
      console.log('Update downloaded:', info);
      setUpdateDownloaded(info);
      setIsDownloading(false);
      setDownloadProgress(null);
    });

    window.electron.updater.onDownloadProgress((progress) => {
      console.log('Download progress:', progress);
      setDownloadProgress(progress);
    });

    window.electron.updater.onUpdateError((error) => {
      console.log('Update error:', error);
      setUpdateError(error.message || 'Update failed');
      setIsDownloading(false);
      setDownloadProgress(null);
    });

    // Cleanup listeners on unmount
    return () => {
      window.electron.updater.offUpdateListeners();
    };
  }, []);

  const handleDownloadUpdate = async () => {
    setIsDownloading(true);
    setUpdateError(null);
    
    try {
      const result = await window.electron.updater.downloadUpdate();
      if (!result.success) {
        setUpdateError(result.error || 'Failed to start download');
        setIsDownloading(false);
      }
    } catch (error) {
      setUpdateError('Failed to start download');
      setIsDownloading(false);
    }
  };

  const handleInstallUpdate = async () => {
    try {
      await window.electron.updater.installUpdate();
    } catch (error) {
      setUpdateError('Failed to install update');
    }
  };

  const handleCheckForUpdates = async () => {
    try {
      const result = await window.electron.updater.checkForUpdates();
      if (!result.success) {
        setUpdateError(result.error || 'Failed to check for updates');
      }
    } catch (error) {
      setUpdateError('Failed to check for updates');
    }
  };

  const dismissNotification = () => {
    setUpdateAvailable(null);
    setUpdateDownloaded(null);
    setUpdateError(null);
    setDownloadProgress(null);
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {/* Update Available Notification */}
        {updateAvailable && !updateDownloaded && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="bg-blue-600 text-white rounded-lg shadow-lg p-4 max-w-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Update Available</h3>
                  <p className="text-sm opacity-90">
                    Version {updateAvailable.version} is ready to download
                  </p>
                  <p className="text-xs opacity-75 mt-1">
                    Current: v{currentVersion}
                  </p>
                </div>
              </div>
              <button
                onClick={dismissNotification}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleDownloadUpdate}
                disabled={isDownloading}
                className="flex-1 bg-white text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {isDownloading ? (
                  <div className="flex items-center justify-center space-x-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Downloading...</span>
                  </div>
                ) : (
                  'Download'
                )}
              </button>
              <button
                onClick={dismissNotification}
                className="px-3 py-2 text-sm text-white hover:bg-blue-700 rounded transition-colors"
              >
                Later
              </button>
            </div>
          </motion.div>
        )}

        {/* Download Progress */}
        {downloadProgress && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="bg-blue-600 text-white rounded-lg shadow-lg p-4 max-w-sm"
          >
            <div className="flex items-center space-x-2 mb-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="font-semibold">Downloading Update</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{Math.round(downloadProgress.percent)}%</span>
                <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
              </div>
              
              <div className="w-full bg-blue-800 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              
              <div className="text-xs opacity-75">
                {formatBytes(downloadProgress.transferred)} of {formatBytes(downloadProgress.total)}
              </div>
            </div>
          </motion.div>
        )}

        {/* Update Downloaded Notification */}
        {updateDownloaded && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="bg-green-600 text-white rounded-lg shadow-lg p-4 max-w-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Update Ready</h3>
                  <p className="text-sm opacity-90">
                    Version {updateDownloaded.version} is ready to install
                  </p>
                </div>
              </div>
              <button
                onClick={dismissNotification}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleInstallUpdate}
                className="flex-1 bg-white text-green-600 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Restart & Install
              </button>
              <button
                onClick={dismissNotification}
                className="px-3 py-2 text-sm text-white hover:bg-green-700 rounded transition-colors"
              >
                Later
              </button>
            </div>
          </motion.div>
        )}

        {/* Error Notification */}
        {updateError && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="bg-red-600 text-white rounded-lg shadow-lg p-4 max-w-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Update Error</h3>
                  <p className="text-sm opacity-90">{updateError}</p>
                </div>
              </div>
              <button
                onClick={dismissNotification}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleCheckForUpdates}
                className="flex-1 bg-white text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UpdateNotification;