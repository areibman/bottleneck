import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  GitPullRequest,
  GitMerge,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Filter,
  MoreVertical,
  Tag,
  Users,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { usePullRequestStore, PullRequest } from '../store/pullRequestStore';
import BulkActionsBar from '../components/BulkActionsBar';

const PullRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedRepo } = useAppStore();
  const {
    pullRequests,
    groups,
    selectedPRs,
    filters,
    sortBy,
    sortDirection,
    setPullRequests,
    togglePRSelection,
    selectAllPRs,
    clearSelection,
    toggleGroupExpansion,
    setFilter,
    setSorting,
  } = usePullRequestStore();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pull-requests', selectedRepo?.full_name, filters],
    queryFn: async () => {
      if (!selectedRepo) return [];
      const [owner, repo] = selectedRepo.full_name.split('/');
      
      let state = filters.state;
      if (state === 'merged') state = 'closed'; // API doesn't have 'merged' state
      if (state === 'draft') state = 'open'; // Filter drafts client-side
      
      const prs = await window.electronAPI.github.getPRs(owner, repo, {
        state: state === 'all' ? 'all' : state,
      });
      
      // Client-side filtering
      let filtered = prs;
      
      if (filters.state === 'merged') {
        filtered = filtered.filter(pr => pr.merged_at);
      } else if (filters.state === 'draft') {
        filtered = filtered.filter(pr => pr.draft);
      }
      
      if (filters.author) {
        filtered = filtered.filter(pr => 
          pr.user.login.toLowerCase().includes(filters.author.toLowerCase())
        );
      }
      
      if (filters.search) {
        filtered = filtered.filter(pr =>
          pr.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          pr.number.toString().includes(filters.search)
        );
      }
      
      // Sorting
      filtered.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'updated':
            comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            break;
          case 'created':
            comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            break;
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'number':
            comparison = b.number - a.number;
            break;
        }
        return sortDirection === 'asc' ? -comparison : comparison;
      });
      
      return filtered;
    },
    enabled: !!selectedRepo,
  });

  useEffect(() => {
    if (data) {
      setPullRequests(data);
    }
  }, [data, setPullRequests]);

  const getPRStateIcon = (pr: PullRequest) => {
    if (pr.merged_at) return <GitMerge size={16} className="text-purple-500" />;
    if (pr.state === 'closed') return <XCircle size={16} className="text-red-500" />;
    if (pr.draft) return <AlertCircle size={16} className="text-yellow-500" />;
    return <GitPullRequest size={16} className="text-green-500" />;
  };

  const getPRStateLabel = (pr: PullRequest) => {
    if (pr.merged_at) return 'Merged';
    if (pr.state === 'closed') return 'Closed';
    if (pr.draft) return 'Draft';
    return 'Open';
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const renderPRItem = (pr: PullRequest) => (
    <div
      key={pr.id}
      className="flex items-center gap-3 p-3 hover:bg-[var(--bg-hover)] border-b border-[var(--border-color)] cursor-pointer"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) {
          togglePRSelection(pr.id);
        } else {
          navigate(`/pulls/${selectedRepo?.owner.login}/${selectedRepo?.name}/${pr.number}`);
        }
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selectedPRs.has(pr.id)}
        onChange={(e) => {
          e.stopPropagation();
          togglePRSelection(pr.id);
        }}
        className="rounded border-[var(--border-color)]"
      />

      {/* PR Icon */}
      {getPRStateIcon(pr)}

      {/* PR Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--text-primary)]">
            {pr.title}
          </span>
          <span className="text-sm text-[var(--text-tertiary)]">
            #{pr.number}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
          <span>{getPRStateLabel(pr)}</span>
          <span>by {pr.user.login}</span>
          <span>updated {formatTimeAgo(pr.updated_at)}</span>
          <span>{pr.head.ref} → {pr.base.ref}</span>
        </div>
      </div>

      {/* PR Stats */}
      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
        {pr.labels.length > 0 && (
          <div className="flex items-center gap-1">
            <Tag size={14} />
            <span>{pr.labels.length}</span>
          </div>
        )}
        {pr.requested_reviewers?.length > 0 && (
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{pr.requested_reviewers.length}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="text-green-500">+{pr.additions}</span>
          <span className="text-red-500">-{pr.deletions}</span>
        </div>
      </div>

      {/* Actions */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          // Show context menu
        }}
        className="p-1 rounded hover:bg-[var(--bg-hover)]"
      >
        <MoreVertical size={16} />
      </button>
    </div>
  );

  const renderGroup = (group: any) => (
    <div key={group.prefix} className="mb-4">
      <button
        onClick={() => toggleGroupExpansion(group.prefix)}
        className="w-full flex items-center justify-between p-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-t-lg border border-[var(--border-color)]"
      >
        <div className="flex items-center gap-2">
          {group.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium text-[var(--text-primary)]">
            {group.prefix === '__ungrouped__' ? 'Other PRs' : group.prefix}
          </span>
          <span className="text-sm text-[var(--text-secondary)]">
            ({group.pullRequests.length})
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-500">
            {group.pullRequests.filter((pr: PullRequest) => pr.state === 'open').length} open
          </span>
          <span className="text-purple-500">
            {group.pullRequests.filter((pr: PullRequest) => pr.merged_at).length} merged
          </span>
        </div>
      </button>
      {group.expanded && (
        <div className="border-x border-b border-[var(--border-color)] rounded-b-lg overflow-hidden">
          {group.pullRequests.map((pr: PullRequest) => renderPRItem(pr))}
        </div>
      )}
    </div>
  );

  if (!selectedRepo) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
        <div className="text-center">
          <GitPullRequest size={48} className="mx-auto mb-4 opacity-50" />
          <p>Select a repository to view pull requests</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Pull Requests - {selectedRepo.name}
          </h1>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 text-sm bg-[var(--accent-primary)] text-white rounded hover:bg-[var(--accent-secondary)]"
          >
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={filters.state}
            onChange={(e) => setFilter('state', e.target.value)}
            className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)]"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="merged">Merged</option>
            <option value="draft">Draft</option>
          </select>

          <input
            type="text"
            placeholder="Filter by author..."
            value={filters.author}
            onChange={(e) => setFilter('author', e.target.value)}
            className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
          />

          <select
            value={sortBy}
            onChange={(e) => setSorting(e.target.value, sortDirection)}
            className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)]"
          >
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
            <option value="title">Title</option>
            <option value="number">Number</option>
          </select>

          <button
            onClick={() => setSorting(sortBy, sortDirection === 'asc' ? 'desc' : 'asc')}
            className="p-1 rounded hover:bg-[var(--bg-hover)]"
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>

          <div className="flex-1" />

          {selectedPRs.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)]">
                {selectedPRs.size} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-[var(--accent-primary)] hover:underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]" />
          </div>
        ) : groups.length > 0 ? (
          <div className="p-4">
            {groups.map(renderGroup)}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
            <div className="text-center">
              <GitPullRequest size={48} className="mx-auto mb-4 opacity-50" />
              <p>No pull requests found</p>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedPRs.size > 0 && <BulkActionsBar />}
    </div>
  );
};

export default PullRequestsPage;