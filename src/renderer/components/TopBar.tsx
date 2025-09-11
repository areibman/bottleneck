import React from 'react';
import { 
  Search, 
  RefreshCw, 
  Bell, 
  User,
  Command,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { useSyncStore } from '../stores/syncStore';
import { cn } from '../utils/cn';

export default function TopBar() {
  const { user, logout } = useAuthStore();
  const { toggleCommandPalette } = useUIStore();
  const { isSyncing, syncAll, lastSyncTime } = useSyncStore();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const formatLastSync = (time: Date | null) => {
    if (!time) return 'Never';
    const now = new Date();
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 h-14 flex items-center px-4 drag">
      {/* App title (draggable area) */}
      <div className="flex items-center space-x-3">
        <h1 className="text-lg font-semibold text-white">Bottleneck</h1>
        {isSyncing && (
          <div className="flex items-center text-xs text-gray-400">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Syncing...
          </div>
        )}
      </div>

      {/* Center area - Command palette trigger */}
      <div className="flex-1 flex justify-center no-drag">
        <button
          onClick={toggleCommandPalette}
          className="flex items-center space-x-2 px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm text-gray-300 transition-colors"
        >
          <Command className="w-3 h-3" />
          <span>Command Palette</span>
          <span className="text-xs text-gray-500">⌘⇧P</span>
        </button>
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-3 no-drag">
        {/* Sync status */}
        <div className="flex items-center space-x-2">
          <button
            onClick={syncAll}
            disabled={isSyncing}
            className={cn(
              'p-2 rounded hover:bg-gray-700 transition-colors',
              isSyncing && 'opacity-50 cursor-not-allowed'
            )}
            title={`Last sync: ${formatLastSync(lastSyncTime)}`}
          >
            <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
          </button>
          <span className="text-xs text-gray-500">
            {formatLastSync(lastSyncTime)}
          </span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded hover:bg-gray-700 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-2 p-1.5 rounded hover:bg-gray-700 transition-colors"
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.login}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <User className="w-6 h-6 p-1 bg-gray-600 rounded-full" />
            )}
            <span className="text-sm">{user?.login || 'User'}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20">
                <div className="p-3 border-b border-gray-700">
                  <div className="text-sm font-medium">{user?.name || user?.login}</div>
                  <div className="text-xs text-gray-400">{user?.email}</div>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      window.location.href = '/settings';
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 rounded"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 rounded text-red-400"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
