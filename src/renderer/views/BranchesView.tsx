import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GitBranch,
  Trash2,
  GitMerge,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  GitCommit,
  ArrowUp,
  ArrowDown,
  Check,
  Shield,
  Bot
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useUIStore } from '../stores/uiStore';
import { usePRStore } from '../stores/prStore';
import { useAuthStore } from '../stores/authStore';
import { useBranchStore } from '../stores/branchStore';
import { formatDistanceToNow } from 'date-fns';

// Re-export Branch type from store for use in component
interface Branch {
  name: string;
  commit: {
    sha: string;
    author: string;
    authorEmail: string;
    message: string;
    date: string;
  };
  protected: boolean;
  ahead: number;
  behind: number;
  current?: boolean;
}

export default function BranchesView() {
  const { theme } = useUIStore();
  const { selectedRepo } = usePRStore();
  const { token } = useAuthStore();
  const { branches: branchesMap, loading, fetchBranches } = useBranchStore();
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'ahead-behind'>('updated');
  const [groupBy, setGroupBy] = useState<'none' | 'author' | 'status' | 'prefix' | 'protected'>('author');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Get branches for current repo from the store
  const branches = useMemo(() => {
    if (!selectedRepo) return [];
    const repoKey = `${selectedRepo.owner}/${selectedRepo.name}`;
    return branchesMap.get(repoKey) || [];
  }, [branchesMap, selectedRepo]);

  // Fetch branches when repo changes
  useEffect(() => {
    if (selectedRepo && token) {
      fetchBranches(
        selectedRepo.owner, 
        selectedRepo.name, 
        token, 
        selectedRepo.default_branch
      );
    }
  }, [selectedRepo, token, fetchBranches]);

  const handleRefresh = useCallback(() => {
    if (selectedRepo && token) {
      // Force refresh (bypass cache)
      fetchBranches(
        selectedRepo.owner, 
        selectedRepo.name, 
        token, 
        selectedRepo.default_branch,
        true
      );
    }
  }, [selectedRepo, token, fetchBranches]);

  // Helper functions for grouping
  const getBranchStatus = useCallback((branch: Branch): string => {
    if (branch.current) return 'current';
    if (branch.protected) return 'protected';
    if (branch.ahead > 0 && branch.behind === 0) return 'ahead';
    if (branch.behind > 0 && branch.ahead === 0) return 'behind';
    if (branch.ahead > 0 && branch.behind > 0) return 'diverged';
    return 'up-to-date';
  }, []);

  const getBranchPrefix = useCallback((branchName: string): string => {
    const parts = branchName.split('/');
    if (parts.length > 1) {
      return parts[0];
    }
    // Extract common patterns
    const patterns = ['feat', 'fix', 'chore', 'docs', 'refactor', 'test', 'style'];
    for (const pattern of patterns) {
      if (branchName.toLowerCase().startsWith(pattern)) {
        return pattern;
      }
    }
    return 'other';
  }, []);

  // Determine if a branch is AI-generated based on patterns
  const isAIGenerated = useCallback((branch: Branch): boolean => {
    const branchName = branch.name.toLowerCase();
    const message = branch.commit.message.toLowerCase();
    
    // Check for cursor patterns
    if (branchName.includes('cursor') || message.includes('cursor')) {
      return true;
    }
    
    // Check for AI-generated patterns
    const aiPatterns = ['ai:', 'auto:', 'bot:', 'automated:', '[ai]', '[bot]'];
    if (aiPatterns.some(pattern => message.includes(pattern))) {
      return true;
    }
    
    return false;
  }, []);

  // Extract feature/task name from branch for sub-grouping
  const getFeatureFromBranch = useCallback((branchName: string, commitMessage: string): string => {
    // Handle cursor branches with pattern: cursor/fix-something-hash
    if (branchName.startsWith('cursor/')) {
      const withoutCursor = branchName.substring(7); // Remove 'cursor/' prefix
      
      // Check if it has a hash at the end (like fix-local-development-console-errors-658d)
      const lastDashIndex = withoutCursor.lastIndexOf('-');
      if (lastDashIndex > 0) {
        const possibleHash = withoutCursor.substring(lastDashIndex + 1);
        // Check if last part looks like a hash (4+ alphanumeric characters)
        if (possibleHash.length >= 4 && /^[a-z0-9]+$/i.test(possibleHash)) {
          // Return the feature name without the hash
          return withoutCursor.substring(0, lastDashIndex);
        }
      }
      
      // If no hash pattern, just return without cursor prefix
      return withoutCursor;
    }
    
    // First try to extract from branch name patterns
    const parts = branchName.split('/');
    if (parts.length > 1) {
      // If it's like "feat/feature-name" or "fix/bug-name"
      const typePatterns = ['feat', 'fix', 'chore', 'docs', 'refactor', 'test', 'style'];
      if (typePatterns.includes(parts[0])) {
        return parts.slice(1).join('/');
      }
      
      // For other patterns like "user/feature-name"
      if (parts.length === 2) {
        return parts[1];
      }
      
      // For nested patterns, return everything after first part
      return parts.slice(1).join('/');
    }
    
    // Try to extract from commit message patterns
    const colonMatch = commitMessage.match(/^([^:]+):/);
    if (colonMatch) {
      const feature = colonMatch[1].trim();
      // Don't use generic prefixes as features
      const genericPrefixes = ['feat', 'fix', 'chore', 'docs', 'refactor', 'test', 'style'];
      if (!genericPrefixes.includes(feature.toLowerCase())) {
        return feature;
      }
    }
    
    // For branches without clear patterns, use the branch name itself
    return branchName;
  }, []);

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

  const handleBranchSelect = useCallback((branchName: string, checked: boolean) => {
    setSelectedBranches(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(branchName);
      } else {
        next.delete(branchName);
      }
      return next;
    });
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    // TODO: Implement bulk delete via GitHub API
    console.log('Deleting branches:', Array.from(selectedBranches));
    setSelectedBranches(new Set());
  }, [selectedBranches]);

  // Filtering and sorting
  const filteredAndSortedBranches = useMemo(() => {
    let result = branches.filter(branch => {
      const matchesSearch = branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           branch.commit.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           branch.commit.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    // Sort branches
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updated':
          return new Date(b.commit.date).getTime() - new Date(a.commit.date).getTime();
        case 'ahead-behind':
          const aScore = a.ahead - a.behind;
          const bScore = b.ahead - b.behind;
          return bScore - aScore;
        default:
          return 0;
      }
    });

    return result;
  }, [branches, searchQuery, sortBy]);

  // Group branches
  const groupedBranches = useMemo(() => {
    if (groupBy === 'none') {
      return { ungrouped: filteredAndSortedBranches };
    }

    if (groupBy === 'author') {
      // Special handling for author grouping with feature sub-groups
      const groups: Record<string, Record<string, Branch[]>> = {};
      
      filteredAndSortedBranches.forEach(branch => {
        const author = branch.commit.author || 'Unknown';
        const feature = getFeatureFromBranch(branch.name, branch.commit.message);
        
        if (!groups[author]) {
          groups[author] = {};
        }
        
        if (!groups[author][feature]) {
          groups[author][feature] = [];
        }
        
        groups[author][feature].push(branch);
      });
      
      return groups;
    }

    // Simple grouping for other types
    const groups: Record<string, Branch[]> = {};

    filteredAndSortedBranches.forEach(branch => {
      let groupKey: string;

      switch (groupBy) {
        case 'status':
          groupKey = getBranchStatus(branch);
          break;
        case 'prefix':
          groupKey = getBranchPrefix(branch.name);
          break;
        case 'protected':
          groupKey = branch.protected ? 'protected' : 'unprotected';
          break;
        default:
          groupKey = 'other';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(branch);
    });

    return groups;
  }, [filteredAndSortedBranches, groupBy, getBranchStatus, getBranchPrefix, getFeatureFromBranch, isAIGenerated]);

  // Branch Item Component
  const BranchItem = ({ branch, isNested = false }: { branch: Branch; isNested?: boolean }) => {
    const isSelected = selectedBranches.has(branch.name);
    const status = getBranchStatus(branch);
    
    return (
      <div
        className={cn(
          'px-3 py-2 flex items-center justify-between cursor-pointer transition-colors',
          theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
          isSelected && (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'),
          branch.current && 'border-l-2 border-blue-500',
          isNested && 'pl-10'
        )}
        onClick={() => handleBranchSelect(branch.name, !isSelected)}
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              handleBranchSelect(branch.name, e.target.checked);
            }}
            className={cn(
              "w-4 h-4 rounded focus:ring-2 focus:ring-blue-500",
              theme === 'dark'
                ? "border-gray-600 bg-gray-700 text-blue-500"
                : "border-gray-300 bg-white text-blue-600"
            )}
          />
          
          {/* Branch Icon */}
          <div className="flex-shrink-0">
            {branch.protected ? (
              <Shield className={cn(
                'w-4 h-4',
                'text-yellow-400'
              )} />
            ) : (
              <GitBranch className={cn(
                'w-4 h-4',
                branch.current ? 'text-blue-400' : 
                status === 'ahead' ? 'text-green-400' :
                status === 'behind' ? 'text-yellow-400' :
                status === 'diverged' ? 'text-orange-400' :
                'text-gray-400'
              )} />
            )}
          </div>
          
          {/* Branch Details */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center space-x-2 overflow-hidden">
              <span className={cn(
                "font-mono text-xs truncate block",
                theme === 'dark' ? "text-white" : "text-gray-900"
              )}>
                {branch.name}
              </span>
              {branch.current && (
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-900 text-blue-300 rounded flex-shrink-0">
                  Default
                </span>
              )}
              {branch.protected && (
                <span className="text-[10px] px-1.5 py-0.5 bg-yellow-900 text-yellow-300 rounded flex-shrink-0">
                  Protected
                </span>
              )}
            </div>
            
            <div className={cn(
              "flex items-center mt-0.5 text-[10px] space-x-2 overflow-hidden",
              theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )}>
              {/* Author */}
              <span className="flex items-center min-w-0">
                <User className="w-3 h-3 mr-0.5 flex-shrink-0" />
                <span className="truncate">{branch.commit.author}</span>
              </span>
              
              {/* Last commit time */}
              <span className="flex items-center flex-shrink-0">
                <Clock className="w-3 h-3 mr-0.5" />
                {formatDistanceToNow(new Date(branch.commit.date), { addSuffix: true })}
              </span>
              
              {/* Ahead/Behind indicators */}
              {(branch.ahead > 0 || branch.behind > 0) && (
                <span className="flex items-center space-x-2 flex-shrink-0">
                  {branch.ahead > 0 && (
                    <span className="flex items-center text-green-500">
                      <ArrowUp className="w-3 h-3" />
                      {branch.ahead}
                    </span>
                  )}
                  {branch.behind > 0 && (
                    <span className="flex items-center text-yellow-500">
                      <ArrowDown className="w-3 h-3" />
                      {branch.behind}
                    </span>
                  )}
                </span>
              )}
            </div>
            
            {/* Commit message */}
            <div className={cn(
              "text-[10px] mt-0.5 truncate",
              theme === 'dark' ? "text-gray-500" : "text-gray-600"
            )}>
              <GitCommit className="w-3 h-3 inline mr-0.5 flex-shrink-0" />
              {branch.commit.message}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
          {!branch.protected && !branch.current && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implement delete via GitHub API
              }}
              className="btn btn-ghost p-1 text-xs text-red-400 hover:text-red-300"
              title="Delete branch"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

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
          <div className="flex items-center">
          <h1 className="text-lg font-semibold flex items-center">
            <GitBranch className="w-4 h-4 mr-2" />
            Branches
              {selectedRepo && (
                <>
                  <span className={cn(
                    "ml-2 text-xs",
                    theme === 'dark' ? "text-gray-400" : "text-gray-600"
                  )}>
                    in {selectedRepo.name}
                  </span>
                  <span className={cn(
                    "ml-2 text-xs",
                    theme === 'dark' ? "text-gray-500" : "text-gray-600"
                  )}>
                    ({filteredAndSortedBranches.length})
                  </span>
                </>
              )}
          </h1>
            
            {/* Bulk actions */}
            {selectedBranches.size > 0 && (
              <div className="ml-4 flex items-center space-x-2">
                <span className={cn(
                  "text-xs",
                  theme === 'dark' ? "text-gray-300" : "text-gray-600"
                )}>
                  {selectedBranches.size} selected
                </span>
                
                <button
                  onClick={handleDeleteSelected}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                    theme === 'dark'
                      ? "text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      : "text-red-600 hover:text-red-700 hover:bg-red-50"
                  )}
                >
                  Delete
                </button>
                
                <button
                  onClick={() => setSelectedBranches(new Set())}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                    theme === 'dark'
                      ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                      : "text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                  )}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedRepo ? (
              <>
                {/* Sort and Group dropdowns */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={cn(
                    "text-xs px-2 py-1 rounded-lg transition-colors border",
                    theme === 'dark'
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-200 text-gray-900"
                  )}
                >
                  <option value="updated">Recently updated</option>
                  <option value="name">Name</option>
                  <option value="ahead-behind">Ahead/Behind</option>
                </select>
                
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as any)}
                  className={cn(
                    "text-xs px-2 py-1 rounded-lg transition-colors border",
                    theme === 'dark'
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-200 text-gray-900"
                  )}
                >
                  <option value="none">No grouping</option>
                  <option value="author">By author</option>
                  <option value="status">By status</option>
                  <option value="prefix">By prefix</option>
                  <option value="protected">By protection</option>
                </select>
                
                <div className="h-6 w-px bg-gray-600" />
                
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="btn btn-ghost p-2"
                  title="Refresh branches"
                >
                  <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                </button>
              </>
            ) : null}
          </div>
        </div>

        {selectedRepo && (
          <>
            {/* Search */}
            <div className="flex items-center space-x-3 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search branches by name, author, or commit message..."
                  className={cn(
                    "pl-8 pr-3 py-1.5 w-full rounded-lg border transition-colors text-xs",
                    theme === 'dark'
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-200 text-gray-900 placeholder-gray-500"
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Branch list */}
      {!selectedRepo ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 mb-4">No repository selected</p>
            <p className="text-sm text-gray-500">Select a repository from the dropdown above to view branches</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className={cn(
                theme === 'dark' ? "text-gray-400" : "text-gray-600"
              )}>Loading branches...</div>
            </div>
          ) : filteredAndSortedBranches.length === 0 ? (
            <div className={cn(
              "flex flex-col items-center justify-center h-64",
              theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )}>
              <GitBranch className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No branches found</p>
              <p className="text-sm mt-2">Try adjusting your filters or search query</p>
            </div>
          ) : groupBy === 'none' || Object.keys(groupedBranches).includes('ungrouped') ? (
            // No grouping - flat list
            <div className={cn(
              "divide-y",
              theme === 'dark' ? "divide-gray-700" : "divide-gray-200"
            )}>
              {((groupedBranches as any).ungrouped || []).map((branch: Branch) => (
                <BranchItem key={branch.name} branch={branch} />
              ))}
            </div>
          ) : groupBy === 'author' ? (
            // Author -> Feature nested grouping (matching PR page style)
            <div className={cn(
              "divide-y",
              theme === 'dark' ? "divide-gray-700" : "divide-gray-200"
            )}>
              {Object.entries(groupedBranches as Record<string, Record<string, Branch[]>>).map(([authorName, features]) => {
                const authorKey = `author-${authorName}`;
                const isAuthorCollapsed = collapsedGroups.has(authorKey);
                const totalBranches = Object.values(features).reduce((sum: number, branches: Branch[]) => sum + branches.length, 0);
                
                // Check if this author creates AI-generated branches
                const authorBranches: Branch[] = [];
                Object.values(features).forEach(branchList => {
                  authorBranches.push(...branchList);
                });
                const hasAIBranches = authorBranches.some(branch => isAIGenerated(branch));
                
                // Get all branch names in this author group
                const allAuthorBranchNames: string[] = [];
                Object.values(features).forEach((branches: Branch[]) => {
                  branches.forEach((branch: Branch) => {
                    allAuthorBranchNames.push(branch.name);
                  });
                });
                const allAuthorSelected = allAuthorBranchNames.every(name => selectedBranches.has(name));
                const someAuthorSelected = allAuthorBranchNames.some(name => selectedBranches.has(name));
                
                return (
                  <div key={authorName}>
                    {/* Author Group Header */}
                    <div
                      className={cn(
                        "px-3 py-1.5 flex items-center justify-between",
                        theme === 'dark' 
                          ? "bg-gray-750 hover:bg-gray-700" 
                          : "bg-gray-100 hover:bg-gray-200"
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <button 
                          className="p-0.5 hover:bg-gray-600 rounded"
                          onClick={() => toggleGroup(authorKey)}
                        >
                          {isAuthorCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <input
                          type="checkbox"
                          checked={allAuthorSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            allAuthorBranchNames.forEach(name => {
                              handleBranchSelect(name, e.target.checked);
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        className={cn(
                            "w-4 h-4 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer",
                            theme === 'dark'
                              ? "border-gray-600 bg-gray-700 text-blue-500"
                              : "border-gray-300 bg-white text-blue-600"
                          )}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = someAuthorSelected && !allAuthorSelected;
                            }
                          }}
                        />
                        {hasAIBranches ? (
                          <Bot className="w-4 h-4 text-purple-400" />
                        ) : (
                          <User className="w-4 h-4 text-blue-400" />
                        )}
                        <span 
                          className="font-medium text-xs cursor-pointer"
                          onClick={() => toggleGroup(authorKey)}
                        >
                          {authorName}
                        </span>
                        <span className={cn(
                          "text-[10px]",
                          theme === 'dark' ? "text-gray-400" : "text-gray-600"
                        )}>({totalBranches})</span>
                      </div>
                    </div>
                    
                    {/* Author Group Content - Feature Sub-groups */}
                    {!isAuthorCollapsed && (
                          <div>
                        {Object.entries(features).map(([featureName, featureBranches]) => {
                          const featureKey = `${authorKey}-${featureName}`;
                          const isFeatureCollapsed = collapsedGroups.has(featureKey);
                          const hasMultipleBranches = featureBranches.length > 1;
                          
                          if (!hasMultipleBranches) {
                            // Single branch - no sub-grouping needed
                            return featureBranches.map((branch) => (
                              <BranchItem 
                                key={branch.name} 
                                branch={branch} 
                                isNested={true}
                              />
                            ));
                          }
                          
                          // Check if all branches in this feature are selected
                          const featureBranchNames = featureBranches.map(b => b.name);
                          const allFeatureSelected = featureBranchNames.every(name => selectedBranches.has(name));
                          const someFeatureSelected = featureBranchNames.some(name => selectedBranches.has(name));
                          
                          return (
                            <div key={featureName}>
                              {/* Feature Sub-group Header */}
                              <div
                                className={cn(
                                  "pl-6 pr-3 py-1.5 flex items-center justify-between border-l-2",
                                  theme === 'dark' 
                                    ? "bg-gray-800 hover:bg-gray-750 border-gray-600" 
                                    : "bg-gray-50 hover:bg-gray-100 border-gray-300"
                                )}
                              >
                            <div className="flex items-center space-x-2">
                                  <button 
                                    className="p-0.5 hover:bg-gray-600 rounded"
                                    onClick={() => toggleGroup(featureKey)}
                                  >
                                    {isFeatureCollapsed ? (
                                      <ChevronRight className="w-3 h-3" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
                                    )}
                                  </button>
                                  <input
                                    type="checkbox"
                                    checked={allFeatureSelected}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      featureBranchNames.forEach(name => {
                                        handleBranchSelect(name, e.target.checked);
                                      });
                                    }}
                                    className={cn(
                                      "w-4 h-4 rounded focus:ring-2 focus:ring-blue-500",
                                      theme === 'dark'
                                        ? "border-gray-600 bg-gray-700 text-blue-500"
                                        : "border-gray-300 bg-white text-blue-600"
                                    )}
                                    ref={(el) => {
                                      if (el) {
                                        el.indeterminate = someFeatureSelected && !allFeatureSelected;
                                      }
                                    }}
                                  />
                                  <span 
                                    className={cn(
                                      "text-xs cursor-pointer",
                                      theme === 'dark' ? "text-gray-300" : "text-gray-700"
                                    )}
                                    onClick={() => toggleGroup(featureKey)}
                                  >{featureName}</span>
                                  <span className={cn(
                                    "text-[10px]",
                                    theme === 'dark' ? "text-gray-500" : "text-gray-600"
                                  )}>({featureBranches.length})</span>
                                </div>
                              </div>
                              
                              {/* Feature Sub-group Branches */}
                              {!isFeatureCollapsed && (
                                <div>
                                  {featureBranches.map((branch) => (
                                    <BranchItem 
                                      key={branch.name} 
                                      branch={branch} 
                                      isNested={true}
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
          ) : (
            // Simple grouped display for other grouping types
            <div className={cn(
              "divide-y",
              theme === 'dark' ? "divide-gray-700" : "divide-gray-200"
            )}>
              {Object.entries(groupedBranches as Record<string, Branch[]>).map(([groupName, branches]) => {
                const groupKey = `group-${groupName}`;
                const isCollapsed = collapsedGroups.has(groupKey);
                const allSelected = branches.every(b => selectedBranches.has(b.name));
                const someSelected = branches.some(b => selectedBranches.has(b.name));
                
                // Get group styling based on type
                const getGroupIcon = () => {
                  if (groupBy === 'status') {
                    switch (groupName) {
                      case 'current': return <Check className="w-4 h-4 text-blue-400" />;
                      case 'protected': return <Shield className="w-4 h-4 text-yellow-400" />;
                      case 'ahead': return <ArrowUp className="w-4 h-4 text-green-400" />;
                      case 'behind': return <ArrowDown className="w-4 h-4 text-yellow-400" />;
                      case 'diverged': return <GitMerge className="w-4 h-4 text-orange-400" />;
                      default: return <GitBranch className="w-4 h-4 text-gray-400" />;
                    }
                  }
                  if (groupBy === 'protected') {
                    return groupName === 'protected' ? 
                      <Shield className="w-4 h-4 text-yellow-400" /> : 
                      <GitBranch className="w-4 h-4 text-gray-400" />;
                  }
                  return <GitBranch className="w-4 h-4 text-gray-400" />;
                };
                
                const getGroupLabel = () => {
                  if (groupBy === 'status') {
                    return groupName.charAt(0).toUpperCase() + groupName.slice(1).replace('-', ' ');
                  }
                  return groupName;
                };
                
                return (
                  <div key={groupName}>
                    {/* Group Header */}
                    <div
                        className={cn(
                        "px-3 py-1.5 flex items-center justify-between sticky top-0",
                        theme === 'dark' 
                          ? "bg-gray-750 hover:bg-gray-700" 
                          : "bg-gray-100 hover:bg-gray-200"
                      )}
                    >
                        <div className="flex items-center space-x-2">
                            <button
                          className="p-0.5 hover:bg-gray-600 rounded"
                          onClick={() => toggleGroup(groupKey)}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          </button>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            branches.forEach(branch => {
                              handleBranchSelect(branch.name, e.target.checked);
                            });
                          }}
                          className={cn(
                            "w-4 h-4 rounded focus:ring-2 focus:ring-blue-500",
                            theme === 'dark'
                              ? "border-gray-600 bg-gray-700 text-blue-500"
                              : "border-gray-300 bg-white text-blue-600"
                          )}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = someSelected && !allSelected;
                            }
                          }}
                        />
                        {getGroupIcon()}
                        <span 
                          className="font-medium text-xs cursor-pointer"
                          onClick={() => toggleGroup(groupKey)}
                        >
                          {getGroupLabel()}
                        </span>
                        <span className={cn(
                          "text-[10px]",
                          theme === 'dark' ? "text-gray-400" : "text-gray-600"
                        )}>({branches.length})</span>
                      </div>
                    </div>
                    
                    {/* Group Content */}
                    {!isCollapsed && (
                      <div>
                        {branches.map((branch) => (
                          <BranchItem 
                            key={branch.name} 
                            branch={branch} 
                            isNested={true}
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
      )}
    </div>
  );
}
