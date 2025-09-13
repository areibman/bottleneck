import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle,
  CheckCircle,
  MessageSquare,
  X,
  ChevronDown
} from 'lucide-react';
import { useIssueStore } from '../stores/issueStore';
import { usePRStore } from '../stores/prStore';
import { useUIStore } from '../stores/uiStore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';
import WelcomeView from './WelcomeView';
import { Issue } from '../services/github';

const IssueItem = React.memo(({ issue, onIssueClick, theme }: { 
  issue: Issue;
  onIssueClick: (issue: Issue) => void;
  theme: 'light' | 'dark';
}) => {
  return (
    <div
      className={cn(
        'px-4 py-3 cursor-pointer',
        theme === 'dark' 
          ? 'hover:bg-gray-800' 
          : 'hover:bg-gray-100',
      )}
      onClick={() => onIssueClick(issue)}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {issue.state === 'open' ? (
            <div title="Open">
              <AlertCircle className="w-5 h-5 text-green-400" />
            </div>
          ) : (
            <div title="Closed">
              <CheckCircle className="w-5 h-5 text-purple-400" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "text-sm font-medium truncate",
                theme === 'dark' ? "text-white" : "text-gray-900"
              )}>
                {issue.title}
              </h3>
              
              <div className={cn(
                "flex items-center mt-1 text-xs space-x-3",
                theme === 'dark' ? "text-gray-400" : "text-gray-600"
              )}>
                <span>#{issue.number}</span>
                <span>by {issue.user.login}</span>
                <span>
                  {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}
                </span>
              </div>
              
              {issue.labels.length > 0 && (
                <div className="flex items-center mt-2 space-x-1">
                  {issue.labels.slice(0, 5).map((label) => (
                    <span
                      key={label.name}
                      className="px-2 py-0-5 text-xs rounded"
                      style={{
                        backgroundColor: `#${label.color}30`,
                        color: `#${label.color}`,
                      }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3 ml-4">
              {issue.assignees.length > 0 && (
                <div className="flex -space-x-2">
                  {issue.assignees.map((assignee) => (
                    <img
                      key={assignee.login}
                      src={assignee.avatar_url}
                      alt={assignee.login}
                      className={cn(
                        "w-6 h-6 rounded-full border-2",
                        theme === 'dark' ? "border-gray-800" : "border-white"
                      )}
                      title={`Assigned to: ${assignee.login}`}
                    />
                  ))}
                </div>
              )}

              <span className="flex items-center text-xs">
                <MessageSquare className="w-3 h-3 mr-1" />
                {issue.comments}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

interface IssueFilters {
  status: 'all' | 'open' | 'closed';
  labels: string[];
  assignee: 'all' | 'assigned' | 'unassigned' | string; // specific username or status
}

const FilterPanel = ({ 
  filters, 
  onFiltersChange, 
  availableLabels,
  availableAssignees,
  theme
}: {
  filters: IssueFilters;
  onFiltersChange: (filters: IssueFilters) => void;
  availableLabels: Array<{ name: string; color: string }>;
  availableAssignees: Array<{ login: string; avatar_url: string }>;
  theme: 'light' | 'dark';
}) => {
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  const handleReset = () => {
    const resetFilters: IssueFilters = {
      status: 'all',
      labels: [],
      assignee: 'all'
    };
    onFiltersChange(resetFilters);
  };

  const toggleLabel = (labelName: string) => {
    onFiltersChange({
      ...filters,
      labels: filters.labels.includes(labelName)
        ? filters.labels.filter(l => l !== labelName)
        : [...filters.labels, labelName]
    });
  };

  return (
    <div className={cn(
      "w-64 h-full border-r overflow-y-auto",
      theme === 'dark'
        ? "bg-gray-900 border-gray-700"
        : "bg-gray-50 border-gray-200"
    )}>
      <div className={cn(
        "p-4 border-b",
        theme === 'dark' ? "border-gray-700" : "border-gray-200"
      )}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Filters</h3>
          {(filters.status !== 'all' || filters.labels.length > 0 || filters.assignee !== 'all') && (
            <button
              onClick={handleReset}
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
      </div>

      <div className="p-4 space-y-4">
        {/* Status Filter */}
        <div>
          <label className={cn(
            "block text-sm font-medium mb-2",
            theme === 'dark' ? "text-gray-300" : "text-gray-700"
          )}>
            Status
          </label>
          <div className="space-y-2">
            {['all', 'open', 'closed'].map(status => (
              <label key={status} className="flex items-center">
                <input
                  type="radio"
                  name="status"
                  value={status}
                  checked={filters.status === status}
                  onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as any })}
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
            "block text-sm font-medium mb-2",
            theme === 'dark' ? "text-gray-300" : "text-gray-700"
          )}>
            Labels
          </label>
          <div className="relative">
            <button
              onClick={() => setShowLabelDropdown(!showLabelDropdown)}
              className={cn(
                "w-full px-3 py-2 text-left rounded-md border flex items-center justify-between",
                theme === 'dark'
                  ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
              )}
            >
              <span className="text-sm">
                {filters.labels.length > 0
                  ? `${filters.labels.length} selected`
                  : 'Select labels'}
              </span>
              <ChevronDown className="w-4 h-4" />
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
                    "px-3 py-2 text-sm",
                    theme === 'dark' ? "text-gray-400" : "text-gray-500"
                  )}>
                    No labels available
                  </div>
                ) : (
                  availableLabels.map(label => (
                    <label
                      key={label.name}
                      className={cn(
                        "flex items-center px-3 py-2 cursor-pointer",
                        theme === 'dark' ? "hover:bg-gray-600" : "hover:bg-gray-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={filters.labels.includes(label.name)}
                        onChange={() => toggleLabel(label.name)}
                        className="mr-2"
                      />
                      <span
                        className="px-2 py-0.5 text-xs rounded"
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
          
          {filters.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {filters.labels.map(labelName => {
                const label = availableLabels.find(l => l.name === labelName);
                return label ? (
                  <span
                    key={labelName}
                    className="inline-flex items-center px-2 py-0.5 text-xs rounded"
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
                      <X className="w-3 h-3" />
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
            "block text-sm font-medium mb-2",
            theme === 'dark' ? "text-gray-300" : "text-gray-700"
          )}>
            Assignee
          </label>
          <div className="relative">
            <button
              onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
              className={cn(
                "w-full px-3 py-2 text-left rounded-md border flex items-center justify-between",
                theme === 'dark'
                  ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
              )}
            >
              <span className="text-sm">
                {filters.assignee === 'all' 
                  ? 'All'
                  : filters.assignee === 'assigned'
                  ? 'Assigned'
                  : filters.assignee === 'unassigned'
                  ? 'Unassigned'
                  : filters.assignee}
              </span>
              <ChevronDown className="w-4 h-4" />
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
                    onFiltersChange({ ...filters, assignee: 'all' });
                    setShowAssigneeDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm",
                    theme === 'dark' ? "hover:bg-gray-600" : "hover:bg-gray-50",
                    filters.assignee === 'all' && "font-semibold"
                  )}
                >
                  All Issues
                </button>
                <button
                  onClick={() => {
                    onFiltersChange({ ...filters, assignee: 'assigned' });
                    setShowAssigneeDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm",
                    theme === 'dark' ? "hover:bg-gray-600" : "hover:bg-gray-50",
                    filters.assignee === 'assigned' && "font-semibold"
                  )}
                >
                  Assigned
                </button>
                <button
                  onClick={() => {
                    onFiltersChange({ ...filters, assignee: 'unassigned' });
                    setShowAssigneeDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm",
                    theme === 'dark' ? "hover:bg-gray-600" : "hover:bg-gray-50",
                    filters.assignee === 'unassigned' && "font-semibold"
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
                          onFiltersChange({ ...filters, assignee: assignee.login });
                          setShowAssigneeDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm flex items-center",
                          theme === 'dark' ? "hover:bg-gray-600" : "hover:bg-gray-50",
                          filters.assignee === assignee.login && "font-semibold"
                        )}
                      >
                        <img
                          src={assignee.avatar_url}
                          alt={assignee.login}
                          className="w-5 h-5 rounded-full mr-2"
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
  );
};

export default function IssuesView() {
  const navigate = useNavigate();
  const { issues, loading, fetchIssues } = useIssueStore();
  const { selectedRepo } = usePRStore();
  const { theme } = useUIStore();
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'comments'>('updated');
  const [filters, setFilters] = useState<IssueFilters>({
    status: 'all',
    labels: [],
    assignee: 'all'
  });

  useEffect(() => {
    if (selectedRepo) {
      fetchIssues(selectedRepo.owner, selectedRepo.name);
    }
  }, [selectedRepo, fetchIssues]);

  // Cache date parsing in a separate map to avoid modifying objects
  const parsedDates = useMemo(() => {
    const dateMap = new Map();
    issues.forEach((issue, key) => {
      dateMap.set(key, {
        updated: new Date(issue.updated_at).getTime(),
        created: new Date(issue.created_at).getTime()
      });
    });
    return dateMap;
  }, [issues]);

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

  const filteredIssues = useMemo(() => {
    let issuesArray = Array.from(issues.values());
    
    // Apply filters
    issuesArray = issuesArray.filter(issue => {
      // Status filter
      if (filters.status !== 'all' && issue.state !== filters.status) {
        return false;
      }
      
      // Labels filter
      if (filters.labels.length > 0) {
        const issueLabels = issue.labels.map(l => l.name);
        const hasAllLabels = filters.labels.every(label => issueLabels.includes(label));
        if (!hasAllLabels) {
          return false;
        }
      }
      
      // Assignee filter
      if (filters.assignee !== 'all') {
        if (filters.assignee === 'unassigned') {
          if (issue.assignees.length > 0) {
            return false;
          }
        } else if (filters.assignee === 'assigned') {
          if (issue.assignees.length === 0) {
            return false;
          }
        } else {
          // Specific assignee
          const hasAssignee = issue.assignees.some(a => a.login === filters.assignee);
          if (!hasAssignee) {
            return false;
          }
        }
      }
      
      return true;
    });
    
    // Sort using cached dates from the map
    issuesArray.sort((a, b) => {
      const aKey = `${a.repository?.owner.login || ''}/${a.repository?.name || ''}#${a.number}`;
      const bKey = `${b.repository?.owner.login || ''}/${b.repository?.name || ''}#${b.number}`;
      const aDates = parsedDates.get(aKey) || { updated: 0, created: 0 };
      const bDates = parsedDates.get(bKey) || { updated: 0, created: 0 };
      
      switch (sortBy) {
        case 'updated':
          return bDates.updated - aDates.updated;
        case 'created':
          return bDates.created - aDates.created;
        case 'comments':
          return b.comments - a.comments;
        default:
          return 0;
      }
    });
    
    return issuesArray;
  }, [issues, parsedDates, sortBy, filters]);

  const handleIssueClick = useCallback((issue: Issue) => {
    if (selectedRepo) {
      navigate(`/issues/${selectedRepo.owner}/${selectedRepo.name}/${issue.number}`);
    }
  }, [navigate, selectedRepo]);

  if (!selectedRepo) {
    return <WelcomeView />;
  }

  return (
    <div className="flex h-full">
      {/* Filter Sidebar */}
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        availableLabels={availableLabels}
        availableAssignees={availableAssignees}
        theme={theme}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className={cn(
          "p-4 border-b",
          theme === 'dark' 
            ? "bg-gray-800 border-gray-700" 
            : "bg-gray-50 border-gray-200"
        )}>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Issues
              {selectedRepo && (
                <span className={cn(
                  "ml-2 text-sm",
                  theme === 'dark' ? "text-gray-400" : "text-gray-600"
                )}>in {selectedRepo.name}</span>
              )}
              <span className={cn(
                "ml-2 text-sm",
                theme === 'dark' ? "text-gray-500" : "text-gray-600"
              )}>({filteredIssues.length})</span>
            </h1>
            
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={cn(
                  "text-sm px-3 py-2 rounded-md transition-colors",
                  theme === 'dark'
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900 border"
                )}
              >
                <option value="updated">Recently updated</option>
                <option value="created">Recently created</option>
                <option value="comments">Most commented</option>
              </select>
            </div>
          </div>
        </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className={cn(
              theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )}>Loading issues...</div>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className={cn(
            "flex flex-col items-center justify-center h-64",
            theme === 'dark' ? "text-gray-400" : "text-gray-600"
          )}>
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No issues found</p>
            {selectedRepo && (
              <p className="text-sm mt-2">No issues in {selectedRepo.full_name}</p>
            )}
          </div>
        ) : (
          <div className={cn(
            "divide-y",
            theme === 'dark' ? "divide-gray-700" : "divide-gray-200"
          )}>
            {filteredIssues.map((issue) => (
              <IssueItem 
                key={issue.id} 
                issue={issue}
                onIssueClick={handleIssueClick}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
