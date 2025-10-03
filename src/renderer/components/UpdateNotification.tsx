import React, { useEffect, useState } from 'react';

interface UpdateStatus {
  status: string;
  version?: string;
  percent?: number;
  error?: string;
}

export const UpdateNotification: React.FC = () => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Listen for update events from main process
    const handleUpdateStatus = (_event: any, data: UpdateStatus) => {
      setUpdateStatus(data);

      switch (data.status) {
        case 'update-available':
          setIsVisible(true);
          break;
        case 'download-progress':
          setIsDownloading(true);
          break;
        case 'update-downloaded':
          setIsDownloading(false);
          setIsVisible(true);
          break;
        case 'update-error':
          setIsDownloading(false);
          console.error('Update error:', data.error);
          break;
      }
    };

    window.electron.on('update-status', handleUpdateStatus);

    return () => {
      window.electron.off('update-status', handleUpdateStatus);
    };
  }, []);

  const handleDownload = async () => {
    try {
      await window.electron.updater.downloadUpdate();
    } catch (error) {
      console.error('Failed to download update:', error);
    }
  };

  const handleInstall = async () => {
    try {
      await window.electron.updater.quitAndInstall();
    } catch (error) {
      console.error('Failed to install update:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  if (isDownloading && updateStatus?.status === 'download-progress') {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-xl max-w-md z-50">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          <div className="flex-1">
            <p className="font-medium">Downloading update...</p>
            <div className="mt-2 bg-blue-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-300"
                style={{ width: `${updateStatus.percent || 0}%` }}
              />
            </div>
            <p className="text-sm mt-1 text-blue-100">
              {Math.round(updateStatus.percent || 0)}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (updateStatus?.status === 'update-available') {
    return (
      <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-4 rounded-lg shadow-xl max-w-md z-50">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Update Available
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Version {updateStatus.version} is ready to download.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
              >
                Download
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium rounded transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (updateStatus?.status === 'update-downloaded') {
    return (
      <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-4 rounded-lg shadow-xl max-w-md z-50">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Update Ready
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Version {updateStatus.version} has been downloaded and is ready to
              install.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
              >
                Restart & Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium rounded transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
