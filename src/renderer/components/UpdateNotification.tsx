import React, { useEffect, useState } from 'react';
import { X, Download, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | null;
  data?: any;
  progress?: {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
  };
  error?: string;
}

export const UpdateNotification: React.FC = () => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: null });
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Listen for update status changes
    const handleUpdateStatus = (data: any) => {
      console.log('Update status:', data);
      
      switch (data.status) {
        case 'checking-for-update':
          setUpdateStatus({ status: 'checking' });
          setIsVisible(true);
          break;
          
        case 'update-available':
          setUpdateStatus({ status: 'available', data: data.data });
          setIsVisible(true);
          setIsDismissed(false);
          break;
          
        case 'update-not-available':
          setUpdateStatus({ status: 'not-available' });
          // Auto-hide after 3 seconds if no update
          setTimeout(() => {
            if (!isDismissed) {
              setIsVisible(false);
            }
          }, 3000);
          break;
          
        case 'download-progress':
          setUpdateStatus({
            status: 'downloading',
            progress: data.data
          });
          setIsVisible(true);
          break;
          
        case 'update-downloaded':
          setUpdateStatus({ status: 'downloaded', data: data.data });
          setIsVisible(true);
          break;
          
        case 'error':
          setUpdateStatus({ status: 'error', error: data.data?.message || 'Update error' });
          setIsVisible(true);
          break;
      }
    };

    window.electron.updater.onUpdateStatus(handleUpdateStatus);

    // Check for updates on component mount
    checkForUpdates(false);

    // Cleanup
    return () => {
      window.electron.updater.removeUpdateListener();
    };
  }, []);

  const checkForUpdates = async (manual = true) => {
    if (manual) {
      setIsVisible(true);
      setIsDismissed(false);
    }
    await window.electron.updater.checkForUpdates();
  };

  const downloadUpdate = async () => {
    await window.electron.updater.downloadUpdate();
  };

  const installUpdate = async () => {
    await window.electron.updater.quitAndInstall();
  };

  const dismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  const renderContent = () => {
    switch (updateStatus.status) {
      case 'checking':
        return (
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Checking for updates...
              </p>
            </div>
          </div>
        );

      case 'available':
        return (
          <div className="flex items-center space-x-3">
            <Info className="w-5 h-5 text-blue-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Update Available
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Version {updateStatus.data?.version} is available
              </p>
            </div>
            <button
              onClick={downloadUpdate}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
            >
              <Download className="w-3 h-3 inline mr-1" />
              Download
            </button>
          </div>
        );

      case 'not-available':
        return (
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                You're up to date!
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                You have the latest version installed
              </p>
            </div>
          </div>
        );

      case 'downloading':
        const progress = updateStatus.progress;
        const percent = progress?.percent || 0;
        const speed = progress?.bytesPerSecond || 0;
        const speedMB = (speed / 1024 / 1024).toFixed(2);
        
        return (
          <div className="flex items-center space-x-3">
            <Download className="w-5 h-5 text-blue-500 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Downloading Update
              </p>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span>{percent.toFixed(0)}%</span>
                  <span>{speedMB} MB/s</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'downloaded':
        return (
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Update Downloaded
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Version {updateStatus.data?.version} is ready to install
              </p>
            </div>
            <button
              onClick={installUpdate}
              className="px-3 py-1 text-xs font-medium text-white bg-green-500 rounded hover:bg-green-600 transition-colors"
            >
              Restart & Install
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Update Error
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {updateStatus.error || 'Failed to check for updates'}
              </p>
            </div>
            <button
              onClick={() => checkForUpdates(true)}
              className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Retry
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 max-w-md z-50 animate-slide-up">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <button
            onClick={dismiss}
            className="absolute -top-2 -right-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// Add animation styles
const styles = `
  @keyframes slide-up {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}