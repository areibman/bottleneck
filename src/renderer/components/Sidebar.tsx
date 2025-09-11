import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  GitPullRequest, 
  GitBranch, 
  Settings, 
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  Plus,
  FolderOpen
} from 'lucide-react';
import { cn } from '../utils/cn';
import { usePRStore } from '../stores/prStore';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const { filters, groups, setFilter } = usePRStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const navItems = [
    { path: '/pulls', icon: GitPullRequest, label: 'Pull Requests' },
    { path: '/branches', icon: GitBranch, label: 'Branches' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const prFilters = [
    { id: 'open', label: 'Open', count: 42 },
    { id: 'draft', label: 'Drafts', count: 8 },
    { id: 'review-requested', label: 'Review Requested', count: 15 },
    { id: 'changes-requested', label: 'Changes Requested', count: 3 },
    { id: 'approved', label: 'Approved', count: 7 },
    { id: 'merged', label: 'Merged', count: 128 },
    { id: 'closed', label: 'Closed', count: 34 },
  ];

  return (
    <aside className={cn('bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden', className)}>
      {/* Search */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search PRs..."
            className="input pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn('sidebar-item', {
                  'active': isActive,
                })
              }
            >
              <item.icon className="w-4 h-4 mr-3" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* PR Filters - Only show when on PR view */}
      {location.pathname.startsWith('/pulls') && (
        <>
          <div className="px-4 py-2 border-t border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Filters
              </h3>
              <button className="text-gray-400 hover:text-white">
                <Filter className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1">
              {prFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilter(filter.id)}
                  className={cn('sidebar-item w-full text-left', {
                    'active': filters.includes(filter.id),
                  })}
                >
                  <span className="flex-1">{filter.label}</span>
                  <span className="text-xs text-gray-500">{filter.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* PR Groups */}
          <div className="px-4 py-2 border-t border-gray-700 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Groups
              </h3>
              <button className="text-gray-400 hover:text-white">
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1">
              {/* Example groups - would be populated from store */}
              {[
                { id: 'cursor-fixes', prefix: 'cursor/fix-', count: 12, open: 8 },
                { id: 'feature-auth', prefix: 'feat/auth-', count: 5, open: 3 },
                { id: 'chore-deps', prefix: 'chore/deps-', count: 7, open: 2 },
              ].map((group) => (
                <div key={group.id}>
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="sidebar-item w-full text-left"
                  >
                    {expandedGroups.has(group.id) ? (
                      <ChevronDown className="w-3 h-3 mr-2" />
                    ) : (
                      <ChevronRight className="w-3 h-3 mr-2" />
                    )}
                    <FolderOpen className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="flex-1 truncate">{group.prefix}*</span>
                    <span className="text-xs text-gray-500">
                      {group.open}/{group.count}
                    </span>
                  </button>
                  {expandedGroups.has(group.id) && (
                    <div className="ml-6 space-y-1 mt-1">
                      {/* Individual PRs in group would go here */}
                      <div className="sidebar-item text-xs">
                        <span className="text-green-400 mr-2">●</span>
                        fix-header-bug
                      </div>
                      <div className="sidebar-item text-xs">
                        <span className="text-green-400 mr-2">●</span>
                        fix-login-issue
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Saved Filters */}
      <div className="p-4 border-t border-gray-700 mt-auto">
        <button className="btn btn-secondary w-full text-sm">
          <Plus className="w-4 h-4 mr-2" />
          New Filter
        </button>
      </div>
    </aside>
  );
}
