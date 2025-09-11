import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitPullRequest, 
  GitMerge, 
  Check, 
  X, 
  Clock,
  MessageSquare,
  ChevronDown,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { usePRStore } from '../stores/prStore';
import { useUIStore } from '../stores/uiStore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';
import { mockPullRequests } from '../mockData';

export default function PRListView() {
  const navigate = useNavigate();
  const { pullRequests, filters, loading, fetchPullRequests, repositories, selectedRepo } = usePRStore();
  const { selectedPRs, selectPR, deselectPR, clearSelection } = useUIStore();
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
  const [groupBy, setGroupBy] = useState<'none' | 'author' | 'label' | 'prefix'>('none');

  useEffect(() => {
    // Use mock data if Electron API is not available
    if (!window.electron) {
      // Add mock PRs to the store
      const prStore = usePRStore.getState();
      mockPullRequests.forEach(pr => {
        prStore.updatePR(pr as any);
      });
      return;
    }
    
    // Fetch PRs for selected repo or first repo
    if (selectedRepo) {
      fetchPullRequests(selectedRepo.owner, selectedRepo.name);
    } else if (repositories.length > 0) {
      fetchPullRequests(repositories[0].owner, repositories[0].name);
    }
  }, [selectedRepo, repositories]);

  const getFilteredPRs = () => {
    let prs = Array.from(pullRequests.values());
    
    // Apply filters
    if (filters.length > 0) {
      prs = prs.filter(pr => {
        if (filters.includes('open') && pr.state === 'open') return true;
        if (filters.includes('draft') && pr.draft) return true;
        if (filters.includes('merged') && pr.merged) return true;
        if (filters.includes('closed') && pr.state === 'closed' && !pr.merged) return true;
        return false;
      });
    }
    
    // Sort
    prs.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
    
    return prs;
  };

  const handlePRClick = (pr: any) => {
    navigate(`/pulls/${pr.base.repo.owner.login}/${pr.base.repo.name}/${pr.number}`);
  };

  const handleCheckboxChange = (prId: string, checked: boolean) => {
    if (checked) {
      selectPR(prId);
    } else {
      deselectPR(prId);
    }
  };

  const prs = getFilteredPRs();
  const hasSelection = selectedPRs.size > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold flex items-center">
            <GitPullRequest className="w-5 h-5 mr-2" />
            Pull Requests
            <span className="ml-2 text-sm text-gray-500">({prs.length})</span>
          </h1>
          
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input text-sm"
            >
              <option value="updated">Recently updated</option>
              <option value="created">Recently created</option>
              <option value="title">Title</option>
            </select>
            
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="input text-sm"
            >
              <option value="none">No grouping</option>
              <option value="author">By author</option>
              <option value="label">By label</option>
              <option value="prefix">By prefix</option>
            </select>
            
            <button className="btn btn-ghost p-2">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bulk actions bar */}
        {hasSelection && (
          <div className="bg-gray-700 -mx-4 -mb-4 px-4 py-2 flex items-center justify-between animate-slide-in">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">
                {selectedPRs.size} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Clear
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="btn btn-secondary text-sm">
                <GitMerge className="w-3 h-3 mr-1" />
                Merge
              </button>
              <button className="btn btn-secondary text-sm">
                Close
              </button>
              <button className="btn btn-secondary text-sm">
                Add Label
              </button>
              <button className="btn btn-secondary text-sm">
                Request Review
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PR List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading pull requests...</div>
          </div>
        ) : prs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <GitPullRequest className="w-12 h-12 mb-4 opacity-50" />
            <p>No pull requests found</p>
            <p className="text-sm mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {prs.map((pr) => {
              const prId = `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`;
              const isSelected = selectedPRs.has(prId);
              
              return (
                <div
                  key={pr.id}
                  className={cn(
                    'px-4 py-3 hover:bg-gray-800 transition-colors cursor-pointer',
                    isSelected && 'bg-gray-800'
                  )}
                  onClick={() => handlePRClick(pr)}
                >
                  <div className="flex items-start space-x-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleCheckboxChange(prId, e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    
                    {/* PR Icon/Status */}
                    <div className="flex-shrink-0">
                      {pr.draft ? (
                        <div className="w-5 h-5 rounded-full bg-gray-600" title="Draft" />
                      ) : pr.merged ? (
                        <GitMerge className="w-5 h-5 text-purple-400" title="Merged" />
                      ) : pr.state === 'open' ? (
                        <GitPullRequest className="w-5 h-5 text-green-400" title="Open" />
                      ) : (
                        <X className="w-5 h-5 text-red-400" title="Closed" />
                      )}
                    </div>
                    
                    {/* PR Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-white truncate">
                            {pr.title}
                            {pr.draft && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
                                Draft
                              </span>
                            )}
                          </h3>
                          
                          <div className="flex items-center mt-1 text-xs text-gray-400 space-x-3">
                            <span>#{pr.number}</span>
                            <span>by {pr.user.login}</span>
                            <span>
                              {formatDistanceToNow(new Date(pr.updated_at), { addSuffix: true })}
                            </span>
                            <span className="flex items-center">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              12
                            </span>
                          </div>
                          
                          {/* Labels */}
                          {pr.labels.length > 0 && (
                            <div className="flex items-center mt-2 space-x-1">
                              {pr.labels.slice(0, 3).map((label) => (
                                <span
                                  key={label.name}
                                  className="px-2 py-0.5 text-xs rounded"
                                  style={{
                                    backgroundColor: `#${label.color}30`,
                                    color: `#${label.color}`,
                                  }}
                                >
                                  {label.name}
                                </span>
                              ))}
                              {pr.labels.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{pr.labels.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Right side info */}
                        <div className="flex items-center space-x-3 ml-4">
                          {/* Review status */}
                          <div className="flex -space-x-2">
                            {pr.requested_reviewers.slice(0, 3).map((reviewer) => (
                              <img
                                key={reviewer.login}
                                src={reviewer.avatar_url}
                                alt={reviewer.login}
                                className="w-6 h-6 rounded-full border-2 border-gray-800"
                                title={`Review requested: ${reviewer.login}`}
                              />
                            ))}
                          </div>
                          
                          {/* CI Status */}
                          <div className="flex items-center space-x-1">
                            <Check className="w-4 h-4 text-green-400" title="Checks passed" />
                          </div>
                          
                          {/* More actions */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle more actions
                            }}
                            className="p-1 hover:bg-gray-700 rounded"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
