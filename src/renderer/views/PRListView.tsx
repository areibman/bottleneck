import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitPullRequest,
  GitMerge,
  Check,
  X,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Bot,
  User,
  Tag,
  UserCheck
} from 'lucide-react';
import { usePRStore } from '../stores/prStore';
import { useUIStore } from '../stores/uiStore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';
import WelcomeView from './WelcomeView';
import { PullRequest } from '../services/github';

const PRItem = React.memo(({ pr, isNested, onPRClick, onCheckboxChange, isSelected, theme }: { 
  pr: PullRequest; 
  isNested?: boolean;
  onPRClick: (pr: PullRequest) => void;
  onCheckboxChange: (prId: string, checked: boolean) => void;
  isSelected: boolean;
  theme: 'light' | 'dark';
}) => {
  const prId = `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`;
  
  return (
    <div
      className={cn(
        'px-4 py-3 cursor-pointer',
        theme === 'dark' 
          ? 'hover:bg-gray-800' 
          : 'hover:bg-gray-100',
        isSelected && (theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'),
        isNested && 'pl-12'
      )}
      onClick={() => onPRClick(pr)}
    >
      <div className="flex items-start space-x-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onCheckboxChange(prId, e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "mt-1 rounded focus:ring-blue-500",
            theme === 'dark'
              ? "border-gray-600 bg-gray-700 text-blue-500"
              : "border-gray-300 bg-white text-blue-600"
          )}
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
              <h3 className={cn(
                "text-sm font-medium truncate",
                theme === 'dark' ? "text-white" : "text-gray-900"
              )}>
                {pr.title}
                {pr.draft && (
                  <span className={cn(
                    "ml-2 text-xs px-1.5 py-0.5 rounded",
                    theme === 'dark' 
                      ? "bg-gray-700 text-gray-400" 
                      : "bg-gray-200 text-gray-600"
                  )}>
                    Draft
                  </span>
                )}
              </h3>
              
              <div className={cn(
                "flex items-center mt-1 text-xs space-x-3",
                theme === 'dark' ? "text-gray-400" : "text-gray-600"
              )}>
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
                  {pr.labels.slice(0, 3).map((label: any) => (
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
                    <span className={cn(
                      "text-xs",
                      theme === 'dark' ? "text-gray-500" : "text-gray-600"
                    )}>
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
                {pr.requested_reviewers.slice(0, 3).map((reviewer: any) => (
                  <img
                    key={reviewer.login}
                    src={reviewer.avatar_url}
                    alt={reviewer.login}
                    className={cn(
                      "w-6 h-6 rounded-full border-2",
                      theme === 'dark' ? "border-gray-800" : "border-white"
                    )}
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
                className={cn(
                  "p-1 rounded",
                  theme === 'dark' ? "hover:bg-gray-700" : "hover:bg-gray-100"
                )}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function PRListView() {
  const navigate = useNavigate();
  const { 
    pullRequests, 
    filters, 
    loading, 
    fetchPullRequests, 
    repositories, 
    selectedRepo 
  } = usePRStore();
  const { selectedPRs, selectPR, deselectPR, clearSelection, theme } = useUIStore();
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
  const [groupBy, setGroupBy] = useState<'none' | 'agent' | 'author' | 'label'>('agent');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedRepo) {
      fetchPullRequests(selectedRepo.owner, selectedRepo.name);
    }
  }, [selectedRepo, fetchPullRequests]);

  // Extract agent from PR (e.g., "cursor" from branch name or title)
  const getAgentFromPR = useCallback((pr: PullRequest): string => {
    // Check if branch name starts with an agent prefix (e.g., "cursor/")
    const branchName = pr.head?.ref || '';
    const agentMatch = branchName.match(/^([^/]+)\//);
    if (agentMatch) {
      return agentMatch[1];
    }
    
    // Check if title contains agent marker
    const titleLower = pr.title.toLowerCase();
    if (titleLower.includes('cursor') || branchName.includes('cursor')) {
      return 'cursor';
    }
    
    // Check for AI-generated label
    const hasAILabel = pr.labels?.some((label: any) => 
      label.name.toLowerCase().includes('ai') || 
      label.name.toLowerCase().includes('cursor')
    );
    if (hasAILabel) {
      return 'cursor';
    }
    
    return 'manual';
  }, []);

  // Extract common prefix from PR title for sub-grouping
  const getTitlePrefix = useCallback((title: string): string => {
    // Remove PR number if present (e.g., "#1234 Title" -> "Title")
    const withoutNumber = title.replace(/^#?\d+\s*/, '');
    
    // Extract prefix before colon or first few words
    const colonMatch = withoutNumber.match(/^([^:]+):/);
    if (colonMatch) {
      return colonMatch[1].trim();
    }
    
    // Get first 3-4 words as prefix
    const words = withoutNumber.split(/\s+/);
    const prefixWords = words.slice(0, Math.min(3, words.length));
    return prefixWords.join(' ');
  }, []);

  // Cache date parsing in a separate map to avoid modifying objects
  const parsedDates = useMemo(() => {
    const dateMap = new Map();
    pullRequests.forEach((pr, key) => {
      dateMap.set(key, {
        updated: new Date(pr.updated_at).getTime(),
        created: new Date(pr.created_at).getTime()
      });
    });
    return dateMap;
  }, [pullRequests]);

  const getFilteredPRs = useMemo(() => {
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
    
    // Sort using cached dates from the map
    prs.sort((a, b) => {
      const aKey = `${a.base.repo.owner.login}/${a.base.repo.name}#${a.number}`;
      const bKey = `${b.base.repo.owner.login}/${b.base.repo.name}#${b.number}`;
      const aDates = parsedDates.get(aKey) || { updated: 0, created: 0 };
      const bDates = parsedDates.get(bKey) || { updated: 0, created: 0 };
      
      switch (sortBy) {
        case 'updated':
          return bDates.updated - aDates.updated;
        case 'created':
          return bDates.created - aDates.created;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
    
    return prs;
  }, [pullRequests, parsedDates, filters, sortBy]);

  // Pre-compute PR metadata for grouping
  const prsWithMetadata = useMemo(() => {
    return getFilteredPRs.map(pr => ({
      pr,
      agent: getAgentFromPR(pr),
      titlePrefix: getTitlePrefix(pr.title),
      author: pr.user?.login || 'unknown',
      labelNames: pr.labels?.map((label: any) => label.name) || []
    }));
  }, [getFilteredPRs, getAgentFromPR, getTitlePrefix]);

  // Group PRs by agent and then by title prefix
  const groupedPRs = useMemo(() => {
    if (groupBy === 'none') {
      return { ungrouped: prsWithMetadata.map(item => item.pr) };
    }
    
    const groups: Record<string, Record<string, any[]>> = {};
    
    if (groupBy === 'agent') {
      // Group by agent first
      prsWithMetadata.forEach(({ pr, agent, titlePrefix }) => {
        if (!groups[agent]) {
          groups[agent] = {};
        }
        
        // Sub-group by title prefix within agent
        if (!groups[agent][titlePrefix]) {
          groups[agent][titlePrefix] = [];
        }
        groups[agent][titlePrefix].push(pr);
      });
    } else if (groupBy === 'author') {
      // Group by author
      prsWithMetadata.forEach(({ pr, author }) => {
        if (!groups[author]) {
          groups[author] = { all: [] };
        }
        groups[author].all.push(pr);
      });
    } else if (groupBy === 'label') {
      // Group by labels
      prsWithMetadata.forEach(({ pr, labelNames }) => {
        if (labelNames.length > 0) {
          labelNames.forEach((labelName: string) => {
            if (!groups[labelName]) {
              groups[labelName] = { all: [] };
            }
            groups[labelName].all.push(pr);
          });
        } else {
          if (!groups['unlabeled']) {
            groups['unlabeled'] = { all: [] };
          }
          groups['unlabeled'].all.push(pr);
        }
      });
    }
    
    return groups;
  }, [prsWithMetadata, groupBy]);

  const toggleGroup = useCallback((groupKey: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  const handlePRClick = useCallback((pr: PullRequest) => {
    navigate(`/pulls/${pr.base.repo.owner.login}/${pr.base.repo.name}/${pr.number}`);
  }, [navigate]);

  const handleCheckboxChange = useCallback((prId: string, checked: boolean) => {
    if (checked) {
      selectPR(prId);
    } else {
      deselectPR(prId);
    }
  }, [selectPR, deselectPR]);

  const hasSelection = selectedPRs.size > 0;

  // Show welcome view if no repository is selected
  if (!selectedRepo) {
    return <WelcomeView />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn(
        "p-4 border-b",
        theme === 'dark' 
          ? "bg-gray-800 border-gray-700" 
          : "bg-gray-50 border-gray-200"
      )}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold flex items-center">
            <GitPullRequest className="w-5 h-5 mr-2" />
            Pull Requests
            {selectedRepo && (
              <span className={cn(
                "ml-2 text-sm",
                theme === 'dark' ? "text-gray-400" : "text-gray-600"
              )}>in {selectedRepo.name}</span>
            )}
            <span className={cn(
              "ml-2 text-sm",
              theme === 'dark' ? "text-gray-500" : "text-gray-600"
            )}>({getFilteredPRs.length})</span>
          </h1>
          
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={cn(
                "text-sm px-4 py-1.5 rounded-lg transition-colors border",
                theme === 'dark'
                  ? "bg-gray-700 border-gray-500/70 text-white"
                  : "bg-white border-gray-200 text-gray-900"
              )}
            >
              <option value="updated">Recently updated</option>
              <option value="created">Recently created</option>
              <option value="title">Title</option>
            </select>
            
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className={cn(
                "text-sm px-4 py-1.5 rounded-lg transition-colors border",
                theme === 'dark'
                  ? "bg-gray-700 border-gray-500/70 text-white"
                  : "bg-white border-gray-200 text-gray-900"
              )}
            >
              <option value="none">No grouping</option>
              <option value="agent">By agent</option>
              <option value="author">By author</option>
              <option value="label">By label</option>
            </select>
            
            <button className="btn btn-ghost p-2">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bulk actions bar */}
        {hasSelection && (
          <div className={cn(
            "-mx-4 -mb-4 px-4 py-2 flex items-center justify-between animate-slide-in",
            theme === 'dark' ? "bg-gray-700" : "bg-gray-200"
          )}>
            <div className="flex items-center space-x-2">
              <span className={cn(
                "text-sm",
                theme === 'dark' ? "text-gray-300" : "text-gray-700"
              )}>
                {selectedPRs.size} selected
              </span>
              <button
                onClick={clearSelection}
                className={cn(
                  "text-sm",
                  theme === 'dark' 
                    ? "text-blue-400 hover:text-blue-300" 
                    : "text-blue-600 hover:text-blue-500"
                )}
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
                <X className="w-3 h-3 mr-1" />
                Close
              </button>
              <button className="btn btn-secondary text-sm">
                <Tag className="w-3 h-3 mr-1" />
                Add Label
              </button>
              <button className="btn btn-secondary text-sm">
                <UserCheck className="w-3 h-3 mr-1" />
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
            <div className={cn(
              theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )}>Loading pull requests...</div>
          </div>
        ) : getFilteredPRs.length === 0 ? (
          <div className={cn(
            "flex flex-col items-center justify-center h-64",
            theme === 'dark' ? "text-gray-400" : "text-gray-600"
          )}>
            <GitPullRequest className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No pull requests found</p>
            {selectedRepo ? (
              <p className="text-sm mt-2">No PRs in {selectedRepo.full_name}</p>
            ) : (
              <p className="text-sm mt-2">Select a repository to view pull requests</p>
            )}
          </div>
        ) : groupBy === 'none' || Object.keys(groupedPRs).includes('ungrouped') ? (
          // No grouping - flat list
          <div className={cn(
            "divide-y",
            theme === 'dark' ? "divide-gray-700" : "divide-gray-200"
          )}>
            {(groupedPRs.ungrouped || getFilteredPRs).map((pr: PullRequest) => (
              <PRItem 
                key={pr.id} 
                pr={pr} 
                onPRClick={handlePRClick}
                onCheckboxChange={handleCheckboxChange}
                isSelected={selectedPRs.has(`${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`)}
                theme={theme}
              />
            ))}
          </div>
        ) : (
          // Grouped display
          <div className={cn(
            "divide-y",
            theme === 'dark' ? "divide-gray-700" : "divide-gray-200"
          )}>
            {Object.entries(groupedPRs).map(([agentName, subGroups]) => {
              const agentKey = `agent-${agentName}`;
              const isAgentCollapsed = collapsedGroups.has(agentKey);
              const totalPRs = Object.values(subGroups).reduce((sum, prs: any) => sum + prs.length, 0);
              
              return (
                <div key={agentName}>
                  {/* Agent Group Header */}
                  <div
                    className={cn(
                      "px-4 py-2 cursor-pointer flex items-center justify-between",
                      theme === 'dark' 
                        ? "bg-gray-750 hover:bg-gray-700" 
                        : "bg-gray-100 hover:bg-gray-200"
                    )}
                    onClick={() => toggleGroup(agentKey)}
                  >
                    <div className="flex items-center space-x-2">
                      <button className="p-0.5 hover:bg-gray-600 rounded">
                        {isAgentCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {agentName === 'cursor' ? (
                        <Bot className="w-4 h-4 text-purple-400" />
                      ) : (
                        <User className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="font-medium text-sm">
                        {agentName === 'cursor' ? 'AI Generated' : agentName === 'manual' ? 'Manual PRs' : agentName}
                      </span>
                      <span className={cn(
                        "text-xs",
                        theme === 'dark' ? "text-gray-400" : "text-gray-600"
                      )}>({totalPRs})</span>
                    </div>
                  </div>
                  
                  {/* Agent Group Content */}
                  {!isAgentCollapsed && (
                    <div>
                      {Object.entries(subGroups).map(([prefix, prefixPRs]) => {
                        const prefixKey = `${agentKey}-${prefix}`;
                        const isPrefixCollapsed = collapsedGroups.has(prefixKey);
                        const hasMultiplePRs = (prefixPRs as any[]).length > 1;
                        
                        if (!hasMultiplePRs || prefix === 'all') {
                          // Single PR or no sub-grouping needed
                          return (prefixPRs as any[]).map((pr: any) => (
                            <PRItem 
                              key={pr.id} 
                              pr={pr} 
                              isNested={groupBy === 'agent'} 
                              onPRClick={handlePRClick}
                              onCheckboxChange={handleCheckboxChange}
                              isSelected={selectedPRs.has(`${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`)}
                              theme={theme}
                            />
                          ));
                        }
                        
                        return (
                          <div key={prefix}>
                            {/* Prefix Sub-group Header */}
                            <div
                              className={cn(
                                "pl-8 pr-4 py-2 cursor-pointer flex items-center justify-between border-l-2",
                                theme === 'dark' 
                                  ? "bg-gray-800 hover:bg-gray-750 border-gray-600" 
                                  : "bg-gray-50 hover:bg-gray-100 border-gray-300"
                              )}
                              onClick={() => toggleGroup(prefixKey)}
                            >
                              <div className="flex items-center space-x-2">
                                <button className="p-0.5 hover:bg-gray-600 rounded">
                                  {isPrefixCollapsed ? (
                                    <ChevronRight className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </button>
                                <span className={cn(
                                  "text-sm",
                                  theme === 'dark' ? "text-gray-300" : "text-gray-700"
                                )}>{prefix}</span>
                                <span className={cn(
                                  "text-xs",
                                  theme === 'dark' ? "text-gray-500" : "text-gray-600"
                                )}>({(prefixPRs as any[]).length})</span>
                              </div>
                            </div>
                            
                            {/* Prefix Sub-group PRs */}
                            {!isPrefixCollapsed && (
                              <div>
                                {(prefixPRs as any[]).map((pr: any) => (
                                  <PRItem 
                                    key={pr.id} 
                                    pr={pr} 
                                    isNested 
                                    onPRClick={handlePRClick}
                                    onCheckboxChange={handleCheckboxChange}
                                    isSelected={selectedPRs.has(`${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`)}
                                    theme={theme}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
