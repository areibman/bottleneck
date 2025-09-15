import React, { useState, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  GitPullRequest,
  GitBranch,
  Settings,
  // Terminal, // TODO: Re-enable terminal tab when ready
  ChevronDown,
  ChevronRight,
  Filter,
  Plus,
  FolderOpen,
  Bot,
  User,
  AlertCircle,
  X
} from 'lucide-react';
import { cn } from '../utils/cn';
import { usePRStore } from '../stores/prStore';
import { useIssueStore } from '../stores/issueStore';
import { useUIStore } from '../stores/uiStore';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { filters, setFilter, pullRequests } = usePRStore();
  const { 
    issues, 
    filters: issueFilters, 
    setFilter: setIssueFilter,
    resetFilters: resetIssueFilters 
  } = useIssueStore();
  const { theme } = useUIStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  const toggleGroup = (groupId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Extract agent from PR (e.g., "cursor" from branch name or title)
  const getAgentFromPR = (pr: any): string => {
    const branchName = pr.head?.ref || '';
    const agentMatch = branchName.match(/^([^/]+)\//);
    if (agentMatch) {
      return agentMatch[1];
    }
    
    const titleLower = pr.title.toLowerCase();
    if (titleLower.includes('cursor') || branchName.includes('cursor')) {
      return 'cursor';
    }
    
    const hasAILabel = pr.labels?.some((label: any) => 
      label.name.toLowerCase().includes('ai') || 
      label.name.toLowerCase().includes('cursor')
    );
    if (hasAILabel) {
      return 'cursor';
    }
    
    return 'manual';
  };

  // Extract common prefix from PR title for sub-grouping
  const getTitlePrefix = (title: string): string => {
    const withoutNumber = title.replace(/^#?\d+\s*/, '');
    const colonMatch = withoutNumber.match(/^([^:]+):/);
    if (colonMatch) {
      return colonMatch[1].trim();
    }
    const words = withoutNumber.split(/\s+/);
    const prefixWords = words.slice(0, Math.min(3, words.length));
    return prefixWords.join(' ');
  };

  // Group PRs by agent and then by title prefix
  const getGroupedPRs = () => {
    let prs = Array.from(pullRequests.values());
    const groups: Record<string, Record<string, any[]>> = {};

    // Apply filters
    if (filters.length > 0) {
      prs = prs.filter(pr => {
        return filters.some(filter => {
          switch (filter) {
            case 'open':
              return pr.state === 'open' && !pr.draft;
            case 'draft':
              return !!pr.draft;
            case 'review-requested':
              return pr.requested_reviewers && pr.requested_reviewers.length > 0;
            case 'merged':
              return !!pr.merged;
            case 'closed':
              return pr.state === 'closed' && !pr.merged;
            default:
              return false;
          }
        });
      });
    }
    
    prs.forEach(pr => {
      const agent = getAgentFromPR(pr);
      if (!groups[agent]) {
        groups[agent] = {};
      }
      
      const prefix = getTitlePrefix(pr.title);
      if (!groups[agent][prefix]) {
        groups[agent][prefix] = [];
      }
      groups[agent][prefix].push(pr);
    });
    
    return groups;
  };

  const handlePRClick = (pr: any) => {
    navigate(`/pulls/${pr.base.repo.owner.login}/${pr.base.repo.name}/${pr.number}`);
  };

  // Extract available labels and assignees from issues
  const { availableLabels, availableAssignees } = useMemo(() => {
    const labelsMap = new Map<string, { name: string; color: string }>();
    const assigneesMap = new Map<string, { login: string; avatar_url: string }>();
    
    issues.forEach(issue => {
      issue.labels.forEach(label => {
        if (!labelsMap.has(label.name)) {
          labelsMap.set(label.name, label);
        }
      });
      
      issue.assignees.forEach(assignee => {
        if (!assigneesMap.has(assignee.login)) {
          assigneesMap.set(assignee.login, assignee);
        }
      });
    });
    
    return {
      availableLabels: Array.from(labelsMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      availableAssignees: Array.from(assigneesMap.values()).sort((a, b) => a.login.localeCompare(b.login))
    };
  }, [issues]);

  const toggleLabel = (labelName: string) => {
    setIssueFilter('labels', 
      issueFilters.labels.includes(labelName)
        ? issueFilters.labels.filter(l => l !== labelName)
        : [...issueFilters.labels, labelName]
    );
  };

  const navItems = [
    { path: '/pulls', icon: GitPullRequest, label: 'Pull Requests' },
    { path: '/issues', icon: AlertCircle, label: 'Issues' },
    { path: '/branches', icon: GitBranch, label: 'Branches' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    // TODO: Re-enable terminal tab when ready
    // { path: '/terminal', icon: Terminal, label: 'Terminal' },
  ];

  // Calculate real counts from actual PR data
  const prArray = Array.from(pullRequests.values());
  const prFilters = [
    { 
      id: 'open', 
      label: 'Open', 
      count: prArray.filter(pr => pr.state === 'open' && !pr.draft).length 
    },
    { 
      id: 'draft', 
      label: 'Drafts', 
      count: prArray.filter(pr => pr.draft).length 
    },
    { 
      id: 'review-requested', 
      label: 'Review Requested', 
      count: prArray.filter(pr => pr.requested_reviewers && pr.requested_reviewers.length > 0).length 
    },
    { 
      id: 'merged', 
      label: 'Merged', 
      count: prArray.filter(pr => pr.merged).length 
    },
    { 
      id: 'closed', 
      label: 'Closed', 
      count: prArray.filter(pr => pr.state === 'closed' && !pr.merged).length 
    },
  ];

  return (
    <aside className={cn(
      'flex flex-col overflow-hidden border-r',
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-gray-50 border-gray-200',
      className
    )}>
      {/* Search */}
      {/* TODO: Re-enable search when ready */}
      {/* <div className={cn(
        "p-4 border-b",
        theme === 'dark' ? "border-gray-700" : "border-gray-200"
      )}>
        <div className="relative">
          <Search className={cn(
            "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4",
            theme === 'dark' ? "text-gray-500" : "text-gray-400"
          )} />
          <input
            type="text"
            placeholder="Search PRs..."
            className={cn(
              "pl-10 w-full px-3 py-2 rounded-md text-sm transition-colors",
              theme === 'dark'
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-400 border"
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div> */}

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

      {/* Issue Filters - Only show when on Issues view */}
      {location.pathname.startsWith('/issues') && (
        <>
          <div className={cn(
            "px-4 py-2 border-t",
            theme === 'dark' ? "border-gray-700" : "border-gray-200"
          )}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                theme === 'dark' ? "text-gray-400" : "text-gray-600"
              )}>
                Filters
              </h3>
              {(issueFilters.status !== 'all' || issueFilters.labels.length > 0 || issueFilters.assignee !== 'all') && (
                <button
                  onClick={resetIssueFilters}
                  className={cn(
                    "text-xs px-2 py-1 rounded",
                    theme === 'dark'
                      ? "text-gray-400 hover:text-white hover:bg-gray-800"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  Reset
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {/* Status Filter */}
              <div>
                <label className={cn(
                  "block text-xs font-medium mb-1",
                  theme === 'dark' ? "text-gray-300" : "text-gray-700"
                )}>
                  Status
                </label>
                <div className="space-y-1">
                  {['all', 'open', 'closed'].map(status => (
                    <label key={status} className="flex items-center">
                      <input
                        type="radio"
                        name="issue-status"
                        value={status}
                        checked={issueFilters.status === status}
                        onChange={(e) => setIssueFilter('status', e.target.value as any)}
                        className="mr-2"
                      />
                      <span className={cn(
                        "text-sm capitalize",
                        theme === 'dark' ? "text-gray-300" : "text-gray-700"
                      )}>
                        {status === 'all' ? 'All Issues' : status}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Labels Filter */}
              <div>
                <label className={cn(
                  "block text-xs font-medium mb-1",
                  theme === 'dark' ? "text-gray-300" : "text-gray-700"
                )}>
                  Labels
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                    className={cn(
                      "w-full px-2 py-1 text-left rounded-md border flex items-center justify-between text-sm",
                      theme === 'dark'
                        ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                        : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    <span className="text-xs">
                      {issueFilters.labels.length > 0
                        ? `${issueFilters.labels.length} selected`
                        : 'Select labels'}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showLabelDropdown && (
                    <div className={cn(
                      "absolute top-full mt-1 w-full max-h-48 overflow-y-auto rounded-md border shadow-lg z-10",
                      theme === 'dark'
                        ? "bg-gray-700 border-gray-600"
                        : "bg-white border-gray-300"
                    )}>
                      {availableLabels.length === 0 ? (
                        <div className={cn(
                          "px-3 py-2 text-xs",
                          theme === 'dark' ? "text-gray-400" : "text-gray-500"
                        )}>
                          No labels available
                        </div>
                      ) : (
                        availableLabels.map(label => (
                          <label
                            key={label.name}
                            className={cn(
                              "flex items-center px-2 py-1 cursor-pointer",
                              theme === 'dark' ? "hover:bg-gray-600" : "hover:bg-gray-50"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={issueFilters.labels.includes(label.name)}
                              onChange={() => toggleLabel(label.name)}
                              className="mr-2"
                            />
                            <span
                              className="px-1 py-0.5 text-xs rounded"
                              style={{
                                backgroundColor: `#${label.color}30`,
                                color: `#${label.color}`,
                              }}
                            >
                              {label.name}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                {issueFilters.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {issueFilters.labels.map(labelName => {
                      const label = availableLabels.find(l => l.name === labelName);
                      return label ? (
                        <span
                          key={labelName}
                          className="inline-flex items-center px-1 py-0.5 text-xs rounded"
                          style={{
                            backgroundColor: `#${label.color}30`,
                            color: `#${label.color}`,
                          }}
                        >
                          {labelName}
                          <button
                            onClick={() => toggleLabel(labelName)}
                            className="ml-1 hover:opacity-70"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Assignee Filter */}
              <div>
                <label className={cn(
                  "block text-xs font-medium mb-1",
                  theme === 'dark' ? "text-gray-300" : "text-gray-700"
                )}>
                  Assignee
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                    className={cn(
                      "w-full px-2 py-1 text-left rounded-md border flex items-center justify-between text-sm",
                      theme === 'dark'
                        ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                        : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    <span className="text-xs">
                      {issueFilters.assignee === 'all' 
                        ? 'All'
                        : issueFilters.assignee === 'assigned'
                        ? 'Assigned'
                        : issueFilters.assignee === 'unassigned'
                        ? 'Unassigned'
                        : issueFilters.assignee}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showAssigneeDropdown && (
                    <div className={cn(
                      "absolute top-full mt-1 w-full max-h-48 overflow-y-auto rounded-md border shadow-lg z-10",
                      theme === 'dark'
                        ? "bg-gray-700 border-gray-600"
                        : "bg-white border-gray-300"
                    )}>
                      <button
                        onClick={() => {
                          setIssueFilter('assignee', 'all');
                          setShowAssigneeDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1 text-xs",
                          theme === 'dark' ? "hover:bg-gray-600" : "hover:bg-gray-50",
                          issueFilters.assignee === 'all' && "font-semibold"
                        )}
                      >
                        All Issues
                      </button>
                      <button
                        onClick={() => {
                          setIssueFilter('assignee', 'assigned');
                          setShowAssigneeDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1 text-xs",
                          theme === 'dark' ? "hover:bg-gray-600" : "hover:bg-gray-50",
                          issueFilters.assignee === 'assigned' && "font-semibold"
                        )}
                      >
                        Assigned
                      </button>
                      <button
                        onClick={() => {
                          setIssueFilter('assignee', 'unassigned');
                          setShowAssigneeDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1 text-xs",
                          theme === 'dark' ? "hover:bg-gray-600" : "hover:bg-gray-50",
                          issueFilters.assignee === 'unassigned' && "font-semibold"
                        )}
                      >
                        Unassigned
                      </button>
                      {availableAssignees.length > 0 && (
                        <>
                          <div className={cn(
                            "border-t my-1",
                            theme === 'dark' ? "border-gray-600" : "border-gray-200"
                          )} />
                          {availableAssignees.map(assignee => (
                            <button
                              key={assignee.login}
                              onClick={() => {
                                setIssueFilter('assignee', assignee.login);
                                setShowAssigneeDropdown(false);
                              }}
                              className={cn(
                                "w-full text-left px-2 py-1 text-xs flex items-center",
                                theme === 'dark' ? "hover:bg-gray-600" : "hover:bg-gray-50",
                                issueFilters.assignee === assignee.login && "font-semibold"
                              )}
                            >
                              <img
                                src={assignee.avatar_url}
                                alt={assignee.login}
                                className="w-4 h-4 rounded-full mr-1"
                              />
                              {assignee.login}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* PR Filters - Only show when on PR view */}
      {location.pathname.startsWith('/pulls') && (
        <>
          <div className={cn(
            "px-4 py-2 border-t",
            theme === 'dark' ? "border-gray-700" : "border-gray-200"
          )}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                theme === 'dark' ? "text-gray-400" : "text-gray-600"
              )}>
                Filters
              </h3>
              <button className={cn(
                "transition-colors",
                theme === 'dark' 
                  ? "text-gray-400 hover:text-white" 
                  : "text-gray-600 hover:text-gray-900"
              )}>
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
                  <span className={cn(
                    "text-xs",
                    theme === 'dark' ? "text-gray-500" : "text-gray-600"
                  )}>{filter.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* PR Groups */}
          <div className={cn(
            "px-4 py-2 border-t flex-1 overflow-y-auto",
            theme === 'dark' ? "border-gray-700" : "border-gray-200"
          )}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                theme === 'dark' ? "text-gray-400" : "text-gray-600"
              )}>
                Groups
              </h3>
              <button className={cn(
                "transition-colors",
                theme === 'dark' 
                  ? "text-gray-400 hover:text-white" 
                  : "text-gray-600 hover:text-gray-900"
              )}>
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1">
              {/* Hierarchical groups by agent/title */}
              {(() => {
                const groupedPRs = getGroupedPRs();
                const agentNames = Object.keys(groupedPRs);
                
                if (agentNames.length === 0) {
                  return (
                    <div className={cn(
                      "text-xs px-3 py-2",
                      theme === 'dark' ? "text-gray-500" : "text-gray-600"
                    )}>No groups</div>
                  );
                }
                
                return agentNames.map((agentName) => {
                  const agentKey = `agent-${agentName}`;
                  const isAgentExpanded = expandedGroups.has(agentKey);
                  const subGroups = groupedPRs[agentName];
                  const totalPRs = Object.values(subGroups).reduce((sum, prs: any) => sum + prs.length, 0);
                  const openPRs = Object.values(subGroups)
                    .flat()
                    .filter((pr: any) => pr.state === 'open').length;
                  
                  return (
                    <div key={agentName}>
                      {/* Agent Group Header */}
                      <button
                        onClick={(e) => toggleGroup(agentKey, e)}
                        className="sidebar-item w-full text-left"
                      >
                        {isAgentExpanded ? (
                          <ChevronDown className="w-3 h-3 mr-2" />
                        ) : (
                          <ChevronRight className="w-3 h-3 mr-2" />
                        )}
                        {agentName === 'cursor' ? (
                          <Bot className="w-4 h-4 mr-2 text-purple-400" />
                        ) : (
                          <User className="w-4 h-4 mr-2 text-blue-400" />
                        )}
                        <span className="flex-1 truncate">
                          {agentName === 'manual' ? 'Manual PRs' : agentName}
                        </span>
                        <span className={cn(
                          "text-xs",
                          theme === 'dark' ? "text-gray-500" : "text-gray-600"
                        )}>
                          {openPRs}/{totalPRs}
                        </span>
                      </button>
                      
                      {/* Agent Group Content */}
                      {isAgentExpanded && (
                        <div className="ml-6 space-y-1 mt-1">
                          {Object.entries(subGroups).map(([prefix, prefixPRs]) => {
                            const prefixKey = `${agentKey}-${prefix}`;
                            const isPrefixExpanded = expandedGroups.has(prefixKey);
                            const hasMultiplePRs = (prefixPRs as any[]).length > 1;
                            
                            if (!hasMultiplePRs) {
                              // Single PR - render directly
                              const pr = (prefixPRs as any[])[0];
                              return (
                                <button
                                  key={pr.id}
                                  onClick={() => handlePRClick(pr)}
                                  className="sidebar-item text-xs w-full text-left"
                                >
                                  <span className={cn(
                                    "mr-2",
                                    pr.state === 'open' ? "text-green-400" : "text-gray-400"
                                  )}>●</span>
                                  <span className="truncate">#{pr.number} {pr.title}</span>
                                </button>
                              );
                            }
                            
                            // Multiple PRs with same prefix - subgroup
                            return (
                              <div key={prefix}>
                                <button
                                  onClick={(e) => toggleGroup(prefixKey, e)}
                                  className={cn(
                                    "sidebar-item text-xs w-full text-left",
                                    theme === 'dark' ? "hover:bg-gray-750" : "hover:bg-gray-100"
                                  )}
                                >
                                  {isPrefixExpanded ? (
                                    <ChevronDown className="w-3 h-3 mr-1" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 mr-1" />
                                  )}
                                  <FolderOpen className="w-3 h-3 mr-1 text-gray-500" />
                                  <span className="flex-1 truncate">{prefix}</span>
                                  <span className={cn(
                                    "text-xs",
                                    theme === 'dark' ? "text-gray-500" : "text-gray-600"
                                  )}>
                                    ({(prefixPRs as any[]).length})
                                  </span>
                                </button>
                                
                                {isPrefixExpanded && (
                                  <div className="ml-6 space-y-1 mt-1">
                                    {(prefixPRs as any[]).slice(0, 5).map((pr) => (
                                      <button
                                        key={pr.id}
                                        onClick={() => handlePRClick(pr)}
                                        className="sidebar-item text-xs w-full text-left flex items-center"
                                      >
                                        <img
                                          src={pr.user.avatar_url}
                                          alt={pr.user.login}
                                          className="w-5 h-5 rounded-full mr-2 flex-shrink-0"
                                          title={`Author: ${pr.user.login}`}
                                        />
                                        <span className={cn(
                                          "mr-2",
                                          pr.state === 'open' ? "text-green-400" : "text-gray-400"
                                        )}>●</span>
                                        <span className="truncate">#{pr.number} {pr.title}</span>
                                      </button>
                                    ))}
                                    {(prefixPRs as any[]).length > 5 && (
                                      <div className={cn(
                                        "text-xs px-3",
                                        theme === 'dark' ? "text-gray-500" : "text-gray-600"
                                      )}>
                                        +{(prefixPRs as any[]).length - 5} more
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </>
      )}

      {/* Saved Filters */}
      <div className={cn(
        "p-4 border-t mt-auto",
        theme === 'dark' ? "border-gray-700" : "border-gray-200"
      )}>
        <button className="btn btn-secondary w-full text-sm">
          <Plus className="w-4 h-4 mr-2" />
          New Filter
        </button>
      </div>
    </aside>
  );
}
