import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Bell,
  User,
  LogOut,
  Command,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { usePullRequestStore } from '../store/pullRequestStore';
import CommandPalette from './CommandPalette';

const TopBar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { syncStatus, setSyncStatus, lastSyncTime } = useAppStore();
  const { setFilter } = usePullRequestStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleSync = async () => {
    setSyncStatus('syncing');
    // Implement sync logic here
    setTimeout(() => {
      setSyncStatus('idle');
    }, 2000);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter('search', searchValue);
  };

  const formatSyncTime = () => {
    if (!lastSyncTime) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-primary)] border-b border-[var(--border-color)] drag">
        {/* Search Bar */}
        <div className="flex items-center gap-4 flex-1 no-drag">
          <form onSubmit={handleSearch} className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" size={18} />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search pull requests, branches, or repositories..."
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </form>

          {/* Command Palette Trigger */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            <Command size={14} />
            <span>⌘K</span>
          </button>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3 no-drag">
          {/* Sync Status */}
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span>Last sync: {formatSyncTime()}</span>
            <button
              onClick={handleSync}
              disabled={syncStatus === 'syncing'}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] disabled:opacity-50"
            >
              {syncStatus === 'syncing' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
            </button>
          </div>

          {/* Notifications */}
          <button className="relative p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]">
            <Bell size={18} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-[var(--error)] rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 rounded hover:bg-[var(--bg-hover)]"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="w-7 h-7 rounded-full"
                />
              ) : (
                <User size={20} className="text-[var(--text-secondary)]" />
              )}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md shadow-lg z-50">
                <div className="p-3 border-b border-[var(--border-color)]">
                  <div className="font-medium text-sm text-[var(--text-primary)]">
                    {user?.name || user?.login}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">{user?.email}</div>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette onClose={() => setShowCommandPalette(false)} />
      )}
    </>
  );
};

export default TopBar;