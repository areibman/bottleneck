import React from 'react';
import { 
  Search, 
  RefreshCw, 
  Bell, 
  User,
  Command,
  ChevronDown,
  Loader2,
  GitBranch,
  Sun,
  Moon
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { useSyncStore } from '../stores/syncStore';
import { usePRStore } from '../stores/prStore';
import { cn } from '../utils/cn';

export default function TopBar() {
  const { user, logout } = useAuthStore();
  const { toggleCommandPalette, theme, toggleTheme } = useUIStore();
  const { isSyncing, syncAll, lastSyncTime } = useSyncStore();
  const { repositories, selectedRepo, setSelectedRepo, fetchPullRequests } = usePRStore();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [repoMenuOpen, setRepoMenuOpen] = React.useState(false);

  const handleRepoSelect = async (repo: any) => {
    setSelectedRepo(repo);
    setRepoMenuOpen(false);
    if (repo) {
      await fetchPullRequests(repo.owner, repo.name);
    }
  };

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
    <header className={cn(
      "h-14 flex items-center px-4 drag border-b",
      theme === 'dark' 
        ? "bg-gray-800 border-gray-700" 
        : "bg-gray-50 border-gray-200"
    )}>
      {/* Repository selector - offset from window controls */}
      <div className="flex items-center space-x-4 ml-20">
        {/* Repository Selector */}
        <div className="relative">
          <button
            onClick={() => setRepoMenuOpen(!repoMenuOpen)}
            className={cn(
              "btn btn-secondary text-sm flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors no-drag",
              theme === 'dark' 
                ? "bg-gray-700 hover:bg-gray-600" 
                : "bg-white hover:bg-gray-100 border border-gray-300"
            )}
          >
            <GitBranch className="w-4 h-4 mr-2" />
            <span className="max-w-[200px] truncate mr-2">
              {selectedRepo ? selectedRepo.full_name : 'Select Repository'}
            </span>
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {repoMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setRepoMenuOpen(false)}
              />
              <div className={cn(
                "absolute left-0 mt-2 w-64 rounded-md shadow-lg z-20 max-h-96 overflow-y-auto border",
                theme === 'dark' 
                  ? "bg-gray-800 border-gray-700" 
                  : "bg-white border-gray-200"
              )}>
                {repositories.length === 0 ? (
                  <div className={cn(
                    "p-3 text-sm",
                    theme === 'dark' ? "text-gray-400" : "text-gray-600"
                  )}>No repositories found</div>
                ) : (
                  <div className="p-1">
                    {repositories.map((repo) => (
                      <button
                        key={repo.id}
                        onClick={() => handleRepoSelect(repo)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded flex flex-col",
                          theme === 'dark' 
                            ? "hover:bg-gray-700" 
                            : "hover:bg-gray-100",
                          selectedRepo?.id === repo.id && (theme === 'dark' ? "bg-gray-700" : "bg-gray-100")
                        )}
                      >
                        <div className="font-medium">{repo.full_name}</div>
                        {repo.description && (
                          <div className={cn(
                            "text-xs truncate",
                            theme === 'dark' ? "text-gray-400" : "text-gray-600"
                          )}>{repo.description}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        {isSyncing && (
          <div className={cn(
            "flex items-center text-xs",
            theme === 'dark' ? "text-gray-400" : "text-gray-600"
          )}>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Syncing...
          </div>
        )}
      </div>

      {/* Center area - Command palette trigger */}
      <div className="flex-1 flex justify-center">
        <button
          onClick={toggleCommandPalette}
          className={cn(
            "flex items-center space-x-2 px-4 py-1.5 rounded-md text-sm transition-colors no-drag",
            theme === 'dark' 
              ? "bg-gray-700 hover:bg-gray-600 text-gray-300" 
              : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-300"
          )}
        >
          <Command className="w-3 h-3" />
          <span>Command Palette</span>
          <span className={cn(
            "text-xs",
            theme === 'dark' ? "text-gray-500" : "text-gray-600"
          )}>⌘⇧P</span>
        </button>
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "p-2 rounded transition-colors no-drag",
            theme === 'dark' ? "hover:bg-gray-700" : "hover:bg-gray-100"
          )}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-yellow-400" />
          ) : (
            <Moon className="w-4 h-4 text-blue-600" />
          )}
        </button>

        {/* Sync status */}
        <div className="flex items-center space-x-2">
          <button
            onClick={syncAll}
            disabled={isSyncing}
            className={cn(
              'p-2 rounded transition-colors no-drag',
              theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
              isSyncing && 'opacity-50 cursor-not-allowed'
            )}
            title={`Last sync: ${formatLastSync(lastSyncTime)}`}
          >
            <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
          </button>
          <span className={cn(
            "text-xs",
            theme === 'dark' ? "text-gray-500" : "text-gray-600"
          )}>
            {formatLastSync(lastSyncTime)}
          </span>
        </div>

        {/* Notifications */}
        <button className={cn(
          "relative p-2 rounded transition-colors no-drag",
          theme === 'dark' ? "hover:bg-gray-700" : "hover:bg-gray-100"
        )}>
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              "flex items-center space-x-2 p-1.5 rounded transition-colors no-drag",
              theme === 'dark' ? "hover:bg-gray-700" : "hover:bg-gray-100"
            )}
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
              <div className={cn(
                "absolute right-0 mt-2 w-48 rounded-md shadow-lg z-20 border",
                theme === 'dark' 
                  ? "bg-gray-800 border-gray-700" 
                  : "bg-white border-gray-200"
              )}>
                <div className={cn(
                  "p-3 border-b",
                  theme === 'dark' ? "border-gray-700" : "border-gray-200"
                )}>
                  <div className="text-sm font-medium">{user?.name || user?.login}</div>
                  <div className={cn(
                    "text-xs",
                    theme === 'dark' ? "text-gray-400" : "text-gray-600"
                  )}>{user?.email}</div>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      window.location.href = '/settings';
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded",
                      theme === 'dark' ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    )}
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded text-red-400",
                      theme === 'dark' ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    )}
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
