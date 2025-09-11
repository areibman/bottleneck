import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  GitPullRequest,
  GitBranch,
  Home,
  Settings,
  ChevronLeft,
  ChevronRight,
  Filter,
  FolderOpen,
  Search,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { usePullRequestStore } from '../store/pullRequestStore';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const { repositories, selectedRepo, setSelectedRepo } = useAppStore();
  const { filters, setFilter } = usePullRequestStore();
  const [showRepoSelector, setShowRepoSelector] = useState(false);

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/pulls', icon: GitPullRequest, label: 'Pull Requests' },
    { path: '/branches', icon: GitBranch, label: 'Branches' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div
      className={`flex flex-col bg-[var(--bg-tertiary)] border-r border-[var(--border-color)] transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
        {!collapsed && (
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Bottleneck</h1>
        )}
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Repository Selector */}
      {!collapsed && (
        <div className="p-3 border-b border-[var(--border-color)]">
          <button
            onClick={() => setShowRepoSelector(!showRepoSelector)}
            className="w-full flex items-center justify-between p-2 rounded hover:bg-[var(--bg-hover)] text-sm"
          >
            <div className="flex items-center gap-2">
              <FolderOpen size={16} />
              <span className="truncate">
                {selectedRepo ? selectedRepo.name : 'Select Repository'}
              </span>
            </div>
            <ChevronRight
              size={16}
              className={`transition-transform ${showRepoSelector ? 'rotate-90' : ''}`}
            />
          </button>
          
          {showRepoSelector && (
            <div className="mt-2 max-h-48 overflow-y-auto">
              {repositories.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => {
                    setSelectedRepo(repo);
                    setShowRepoSelector(false);
                  }}
                  className={`w-full text-left p-2 text-sm rounded hover:bg-[var(--bg-hover)] ${
                    selectedRepo?.id === repo.id ? 'bg-[var(--bg-hover)]' : ''
                  }`}
                >
                  <div className="truncate">{repo.name}</div>
                  <div className="text-xs text-[var(--text-tertiary)] truncate">
                    {repo.owner.login}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 p-2 mb-1 rounded transition-colors ${
                isActive
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
              }`
            }
          >
            <item.icon size={20} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Quick Filters */}
      {!collapsed && location.pathname === '/pulls' && (
        <div className="p-3 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-2 text-sm text-[var(--text-secondary)]">
            <Filter size={16} />
            <span>Quick Filters</span>
          </div>
          
          <div className="space-y-1">
            <button
              onClick={() => setFilter('state', 'open')}
              className={`w-full text-left p-2 text-sm rounded hover:bg-[var(--bg-hover)] ${
                filters.state === 'open' ? 'bg-[var(--bg-hover)]' : ''
              }`}
            >
              Open PRs
            </button>
            <button
              onClick={() => setFilter('state', 'draft')}
              className={`w-full text-left p-2 text-sm rounded hover:bg-[var(--bg-hover)] ${
                filters.state === 'draft' ? 'bg-[var(--bg-hover)]' : ''
              }`}
            >
              Draft PRs
            </button>
            <button
              onClick={() => setFilter('state', 'merged')}
              className={`w-full text-left p-2 text-sm rounded hover:bg-[var(--bg-hover)] ${
                filters.state === 'merged' ? 'bg-[var(--bg-hover)]' : ''
              }`}
            >
              Merged PRs
            </button>
            <button
              onClick={() => setFilter('state', 'closed')}
              className={`w-full text-left p-2 text-sm rounded hover:bg-[var(--bg-hover)] ${
                filters.state === 'closed' ? 'bg-[var(--bg-hover)]' : ''
              }`}
            >
              Closed PRs
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;