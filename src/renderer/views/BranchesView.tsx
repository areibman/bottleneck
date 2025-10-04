import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  GitBranch,
  GitMerge,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  GitCommit,
  ArrowUp,
  ArrowDown,
  Shield,
  GitPullRequest,
  X,
} from "lucide-react";
import { cn } from "../utils/cn";
import { useUIStore } from "../stores/uiStore";
import { usePRStore } from "../stores/prStore";
import { useAuthStore } from "../stores/authStore";
import { useBranchStore } from "../stores/branchStore";
import { formatDistanceToNow } from "date-fns";
import { GitHubAPI } from "../services/github";
import Dropdown, { DropdownOption } from "../components/Dropdown";
import { AgentIcon } from "../components/AgentIcon";
import { PRTag } from "../components/PRTag";
import { detectAgentName } from "../utils/agentIcons";

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

type SortByType = "updated" | "name" | "ahead-behind";

const sortOptions: DropdownOption<SortByType>[] = [
  { value: "updated", label: "Recently updated" },
  { value: "name", label: "Name" },
  { value: "ahead-behind", label: "Ahead/Behind" },
];

export default function BranchesView() {
  const navigate = useNavigate();
  const { theme } = useUIStore();
  const { selectedRepo, pullRequests } = usePRStore();
  const { token } = useAuthStore();
  const { branches: branchesMap, loading, fetchBranches } = useBranchStore();
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortByType>("updated");
  const [groupBy, setGroupBy] = useState<
    "none" | "author" | "status" | "prefix" | "protected"
  >("author");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [showCreatePRModal, setShowCreatePRModal] = useState(false);
  const [selectedBranchForPR, setSelectedBranchForPR] = useState<Branch | null>(null);
  const prTitleRef = useRef<HTMLInputElement>(null);
  const prBodyRef = useRef<HTMLTextAreaElement>(null);
  const [isDraft, setIsDraft] = useState(false);
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [createPRError, setCreatePRError] = useState<string | null>(null);

  // Get branches for current repo from the store
  const branches = useMemo(() => {
    if (!selectedRepo) return [];
    const repoKey = `${selectedRepo.owner}/${selectedRepo.name}`;
    return branchesMap.get(repoKey) || [];
  }, [branchesMap, selectedRepo]);

  // Create a map of branch names to their associated PRs
  const branchToPRMap = useMemo(() => {
    const map = new Map<string, any>();
    if (!selectedRepo) return map;

    Array.from(pullRequests.values()).forEach(pr => {
      // Check if this PR is for the current repo
      if (pr.base?.repo?.owner?.login === selectedRepo.owner &&
        pr.base?.repo?.name === selectedRepo.name) {
        // Map the head branch to this PR
        if (pr.head?.ref) {
          map.set(pr.head.ref, pr);
        }
      }
    });

    return map;
  }, [pullRequests, selectedRepo]);

  // Fetch branches when repo changes
  useEffect(() => {
    if (selectedRepo && token) {
      fetchBranches(
        selectedRepo.owner,
        selectedRepo.name,
        token,
        selectedRepo.default_branch,
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
        true,
      );
    }
  }, [selectedRepo, token, fetchBranches]);

  // Helper functions for grouping
  const getBranchStatus = useCallback((branch: Branch): string => {
    if (branch.current) return "current";
    if (branch.protected) return "protected";
    if (branch.ahead > 0 && branch.behind === 0) return "ahead";
    if (branch.behind > 0 && branch.ahead === 0) return "behind";
    if (branch.ahead > 0 && branch.behind > 0) return "diverged";
    return "up-to-date";
  }, []);

  const getBranchPrefix = useCallback((branchName: string): string => {
    const parts = branchName.split("/");
    if (parts.length > 1) {
      return parts[0];
    }
    // Extract common patterns
    const patterns = [
      "feat",
      "fix",
      "chore",
      "docs",
      "refactor",
      "test",
      "style",
    ];
    for (const pattern of patterns) {
      if (branchName.toLowerCase().startsWith(pattern)) {
        return pattern;
      }
    }
    return "other";
  }, []);

  // Determine if a branch is AI-generated based on patterns
  const isAIGenerated = useCallback((branch: Branch): boolean => {
    const message = branch.commit.message;

    if (
      detectAgentName(
        branch.name,
        message,
        branch.commit?.author,
        branch.commit?.authorEmail,
      )
    ) {
      return true;
    }

    const messageLower = message.toLowerCase();

    // Check for other AI-generated patterns
    const aiPatterns = ["ai:", "auto:", "bot:", "automated:", "[ai]", "[bot]"];
    if (aiPatterns.some((pattern) => messageLower.includes(pattern))) {
      return true;
    }

    return false;
  }, []);

  const getAgentNameForBranch = useCallback(
    (branch: Branch): string | undefined =>
      detectAgentName(
        branch.name,
        branch.commit?.message,
        branch.commit?.author,
        branch.commit?.authorEmail,
      ),
    [],
  );

  // Extract feature/task name from branch for sub-grouping
  const getFeatureFromBranch = useCallback(
    (branchName: string, commitMessage: string): string => {
      // Handle cursor branches with pattern: cursor/fix-something-hash
      if (branchName.startsWith("cursor/")) {
        const withoutCursor = branchName.substring(7); // Remove 'cursor/' prefix

        // Check if it has a hash at the end (like fix-local-development-console-errors-658d)
        const lastDashIndex = withoutCursor.lastIndexOf("-");
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
      const parts = branchName.split("/");
      if (parts.length > 1) {
        // If it's like "feat/feature-name" or "fix/bug-name"
        const typePatterns = [
          "feat",
          "fix",
          "chore",
          "docs",
          "refactor",
          "test",
          "style",
        ];
        if (typePatterns.includes(parts[0])) {
          return parts.slice(1).join("/");
        }

        // For other patterns like "user/feature-name"
        if (parts.length === 2) {
          return parts[1];
        }

        // For nested patterns, return everything after first part
        return parts.slice(1).join("/");
      }

      // Try to extract from commit message patterns
      const colonMatch = commitMessage.match(/^([^:]+):/);
      if (colonMatch) {
        const feature = colonMatch[1].trim();
        // Don't use generic prefixes as features
        const genericPrefixes = [
          "feat",
          "fix",
          "chore",
          "docs",
          "refactor",
          "test",
          "style",
        ];
        if (!genericPrefixes.includes(feature.toLowerCase())) {
          return feature;
        }
      }

      // For branches without clear patterns, use the branch name itself
      return branchName;
    },
    [],
  );

  const toggleGroup = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  const handleBranchSelect = useCallback(
    (branchName: string, checked: boolean) => {
      setSelectedBranches((prev) => {
        const next = new Set(prev);
        if (checked) {
          next.add(branchName);
        } else {
          next.delete(branchName);
        }
        return next;
      });
    },
    [],
  );


  const handleOpenCreatePR = useCallback((branch: Branch) => {
    setSelectedBranchForPR(branch);
    // Generate default title from branch name
    const branchName = branch.name;
    // Remove common prefixes and format
    const title = branchName
      .replace(/^(feat|fix|chore|docs|refactor|test|style|cursor)[\/\-]/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    setIsDraft(false);
    setCreatePRError(null);
    setShowCreatePRModal(true);

    // Set values after modal is shown (next tick)
    setTimeout(() => {
      if (prTitleRef.current) {
        prTitleRef.current.value = title;
      }
      if (prBodyRef.current) {
        prBodyRef.current.value = branch.commit.message || "";
      }
    }, 0);
  }, []);

  const handleCreatePR = useCallback(async () => {
    if (!selectedBranchForPR || !selectedRepo || !token) return;

    const prTitle = prTitleRef.current?.value.trim() || "";
    const prBody = prBodyRef.current?.value || "";

    if (!prTitle) {
      setCreatePRError("Title is required");
      return;
    }

    setIsCreatingPR(true);
    setCreatePRError(null);

    try {
      const api = new GitHubAPI(token);
      await api.createPullRequest(
        selectedRepo.owner,
        selectedRepo.name,
        prTitle,
        prBody,
        selectedBranchForPR.name,
        selectedRepo.default_branch,
        isDraft
      );

      // Close modal and reset
      setShowCreatePRModal(false);
      setSelectedBranchForPR(null);
      if (prTitleRef.current) prTitleRef.current.value = "";
      if (prBodyRef.current) prBodyRef.current.value = "";
      setIsDraft(false);

      // Refresh the PR list to update the branch-to-PR mapping
      const { fetchPullRequests } = usePRStore.getState();
      await fetchPullRequests(selectedRepo.owner, selectedRepo.name, true);

      // Optionally refresh the branch list
      handleRefresh();
    } catch (error: any) {
      console.error("Failed to create PR:", error);

      // Check if it's because a PR already exists
      if (error.message && error.message.includes("A pull request already exists")) {
        setCreatePRError("A pull request already exists for this branch. Please refresh to see it.");
        // Refresh PRs to update the mapping
        const { fetchPullRequests } = usePRStore.getState();
        fetchPullRequests(selectedRepo.owner, selectedRepo.name, true);
      } else {
        setCreatePRError(error.message || "Failed to create pull request");
      }
    } finally {
      setIsCreatingPR(false);
    }
  }, [selectedBranchForPR, selectedRepo, token, isDraft, handleRefresh]);

  // Filtering and sorting
  const filteredAndSortedBranches = useMemo(() => {
    let result = branches.filter((branch) => {
      const matchesSearch =
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.commit.message
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        branch.commit.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    // Sort branches
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "updated":
          return (
            new Date(b.commit.date).getTime() -
            new Date(a.commit.date).getTime()
          );
        case "ahead-behind":
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
    if (groupBy === "none") {
      return { ungrouped: filteredAndSortedBranches };
    }

    if (groupBy === "author") {
      // Special handling for author grouping with feature sub-groups
      const groups: Record<string, Record<string, Branch[]>> = {};

      filteredAndSortedBranches.forEach((branch) => {
        const author = branch.commit.author || "Unknown";
        const feature = getFeatureFromBranch(
          branch.name,
          branch.commit.message,
        );

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

    filteredAndSortedBranches.forEach((branch) => {
      let groupKey: string;

      switch (groupBy) {
        case "status":
          groupKey = getBranchStatus(branch);
          break;
        case "prefix":
          groupKey = getBranchPrefix(branch.name);
          break;
        case "protected":
          groupKey = branch.protected ? "protected" : "unprotected";
          break;
        default:
          groupKey = "other";
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(branch);
    });

    return groups;
  }, [
    filteredAndSortedBranches,
    groupBy,
    getBranchStatus,
    getBranchPrefix,
    getFeatureFromBranch,
    isAIGenerated,
  ]);

  // Branch Item Component
  const BranchItem = ({
    branch,
    isNested = false,
  }: {
    branch: Branch;
    isNested?: boolean;
  }) => {
    const isSelected = selectedBranches.has(branch.name);
    const status = getBranchStatus(branch);
    const existingPR = branchToPRMap.get(branch.name);

    const handleBranchClick = () => {
      // If branch has a PR, navigate to PR details
      if (existingPR && selectedRepo) {
        navigate(`/pulls/${selectedRepo.owner}/${selectedRepo.name}/${existingPR.number}`);
      } else {
        // Otherwise, toggle selection
        handleBranchSelect(branch.name, !isSelected);
      }
    };

    return (
      <div
        className={cn(
          "px-3 py-2 flex items-center justify-between cursor-pointer transition-colors",
          theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100",
          isSelected && (theme === "dark" ? "bg-gray-700" : "bg-gray-100"),
          branch.current && "border-l-2 border-blue-500",
          isNested && "pl-10",
        )}
        onClick={handleBranchClick}
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              handleBranchSelect(branch.name, e.target.checked);
            }}
            className={cn(
              "w-4 h-4 rounded focus:ring-2 focus:ring-blue-500",
              theme === "dark"
                ? "border-gray-600 bg-gray-700 text-blue-500"
                : "border-gray-300 bg-white text-blue-600",
            )}
          />

          {/* Branch Icon */}
          <div className="flex-shrink-0">
            {branch.protected ? (
              <Shield className={cn("w-4 h-4", "text-yellow-400")} />
            ) : (
              <GitBranch
                className={cn(
                  "w-4 h-4",
                  existingPR?.merged
                    ? "text-purple-400"
                    : branch.current
                      ? "text-blue-400"
                      : status === "ahead"
                        ? "text-green-400"
                        : status === "behind"
                          ? "text-yellow-400"
                          : status === "diverged"
                            ? "text-orange-400"
                            : "text-gray-400",
                )}
              />
            )}
          </div>

          {/* Branch Details */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center space-x-2 overflow-hidden">
              <span
                className={cn(
                  "font-mono text-xs truncate block",
                  theme === "dark" ? "text-white" : "text-gray-900",
                )}
              >
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
              {existingPR && existingPR.merged && (
                <PRTag
                  prNumber={existingPR.number}
                  state="merged"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedRepo) {
                      navigate(`/pulls/${selectedRepo.owner}/${selectedRepo.name}/${existingPR.number}`);
                    }
                  }}
                />
              )}
              {existingPR && !existingPR.merged && (
                <PRTag
                  prNumber={existingPR.number}
                  state={existingPR.state}
                  isDraft={existingPR.draft}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedRepo) {
                      navigate(`/pulls/${selectedRepo.owner}/${selectedRepo.name}/${existingPR.number}`);
                    }
                  }}
                />
              )}
            </div>

            <div
              className={cn(
                "flex items-center mt-0.5 text-[10px] space-x-2 overflow-hidden",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              {/* Author */}
              <span className="flex items-center min-w-0">
                <User className="w-3 h-3 mr-0.5 flex-shrink-0" />
                <span className="truncate">{branch.commit.author}</span>
              </span>

              {/* Last commit time */}
              <span className="flex items-center flex-shrink-0">
                <Clock className="w-3 h-3 mr-0.5" />
                {formatDistanceToNow(new Date(branch.commit.date), {
                  addSuffix: true,
                })}
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
            <div
              className={cn(
                "text-[10px] mt-0.5 truncate",
                theme === "dark" ? "text-gray-500" : "text-gray-600",
              )}
            >
              <GitCommit className="w-3 h-3 inline mr-0.5 flex-shrink-0" />
              {branch.commit.message}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
          {!branch.current && (!existingPR || (existingPR && existingPR.state === 'closed' && !existingPR.merged)) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCreatePR(branch);
              }}
              className={cn(
                "flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors",
                theme === "dark"
                  ? "text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                  : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              )}
              title={existingPR ? "Reopen pull request" : "Create pull request"}
            >
              <GitPullRequest className="w-3 h-3" />
              <span className="text-[10px] font-medium">
                {existingPR ? "Reopen PR" : "Create PR"}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className={cn(
            "p-4 border-b",
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-gray-50 border-gray-200",
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold flex items-center">
                <GitBranch className="w-4 h-4 mr-2" />
                Branches
                {selectedRepo && (
                  <>
                    <span
                      className={cn(
                        "ml-2 text-xs",
                        theme === "dark" ? "text-gray-400" : "text-gray-600",
                      )}
                    >
                      in {selectedRepo.name}
                    </span>
                    <span
                      className={cn(
                        "ml-2 text-xs",
                        theme === "dark" ? "text-gray-500" : "text-gray-600",
                      )}
                    >
                      ({filteredAndSortedBranches.length})
                    </span>
                  </>
                )}
              </h1>

              {/* Bulk actions */}
              {selectedBranches.size > 0 && (
                <div className="ml-4 flex items-center space-x-2">
                  <span
                    className={cn(
                      "text-xs",
                      theme === "dark" ? "text-gray-300" : "text-gray-600",
                    )}
                  >
                    {selectedBranches.size} selected
                  </span>

                  <button
                    onClick={async () => {
                      // Create PRs for all selected branches that don't already have open/merged PRs
                      const branchesToPromote = Array.from(selectedBranches)
                        .map(name => branches.find(b => b.name === name))
                        .filter(b => {
                          if (!b || b.current) return false;
                          const pr = branchToPRMap.get(b.name);
                          // Allow creating PR if no PR exists or if PR is closed (not merged)
                          return !pr || (pr.state === 'closed' && !pr.merged);
                        }) as Branch[];

                      if (branchesToPromote.length === 1) {
                        handleOpenCreatePR(branchesToPromote[0]);
                      } else if (branchesToPromote.length > 1) {
                        // For multiple branches, create draft PRs automatically
                        if (confirm(`Create ${branchesToPromote.length} draft pull requests?`)) {
                          if (!token) {
                            alert('Not authenticated');
                            return;
                          }
                          const api = new GitHubAPI(token);
                          let successCount = 0;
                          for (const branch of branchesToPromote) {
                            try {
                              const title = branch.name
                                .replace(/^(feat|fix|chore|docs|refactor|test|style|cursor)[\\/\\-]/, '')
                                .replace(/[-_]/g, ' ')
                                .replace(/\\b\\w/g, (l) => l.toUpperCase());
                              await api.createPullRequest(
                                selectedRepo!.owner,
                                selectedRepo!.name,
                                title,
                                branch.commit.message || "",
                                branch.name,
                                selectedRepo!.default_branch,
                                true // Always draft for bulk creation
                              );
                              successCount++;
                            } catch (error: any) {
                              // Skip if PR already exists
                              if (!error.message?.includes("A pull request already exists")) {
                                console.error(`Failed to create PR for ${branch.name}:`, error);
                              }
                            }
                          }
                          if (successCount > 0) {
                            setSelectedBranches(new Set());
                            // Refresh PRs to update the mapping
                            const { fetchPullRequests } = usePRStore.getState();
                            await fetchPullRequests(selectedRepo!.owner, selectedRepo!.name, true);
                            handleRefresh();
                          } else if (branchesToPromote.length > 0) {
                            alert('All selected branches already have pull requests.');
                          }
                        }
                      }
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                      theme === "dark"
                        ? "text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                        : "text-blue-600 hover:text-blue-700 hover:bg-blue-50",
                    )}
                  >
                    Create PR{selectedBranches.size > 1 ? 's' : ''}
                  </button>


                  <button
                    onClick={() => setSelectedBranches(new Set())}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                      theme === "dark"
                        ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                        : "text-gray-600 hover:text-gray-700 hover:bg-gray-100",
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
                  <Dropdown<SortByType>
                    options={sortOptions}
                    value={sortBy}
                    onChange={setSortBy}
                    buttonClassName="text-xs px-2 py-1"
                    labelPrefix="Sort by: "
                  />

                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as any)}
                    className={cn(
                      "text-xs px-2 py-1 rounded-lg transition-colors border",
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-200 text-gray-900",
                    )}
                  >
                    <option value="none">No grouping</option>
                    <option value="author">By author</option>
                    <option value="status">By status</option>
                    <option value="prefix">By prefix</option>
                    <option value="protected">By protection</option>
                  </select>
                </>
              ) : null}
            </div>
          </div>

          {selectedRepo && (
            <>
              {/* Search */}
              <div className="flex items-center space-x-3 mt-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search branches by name, author, or commit message..."
                    className={cn(
                      "pl-8 pr-3 py-1.5 w-full rounded-lg border transition-colors text-xs",
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-200 text-gray-900 placeholder-gray-500",
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
              <p className="text-sm text-gray-500">
                Select a repository from the dropdown above to view branches
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div
                  className={cn(
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  Loading branches...
                </div>
              </div>
            ) : filteredAndSortedBranches.length === 0 ? (
              <div
                className={cn(
                  "flex flex-col items-center justify-center h-64",
                  theme === "dark" ? "text-gray-400" : "text-gray-600",
                )}
              >
                <GitBranch className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No branches found</p>
                <p className="text-sm mt-2">
                  Try adjusting your filters or search query
                </p>
              </div>
            ) : groupBy === "none" ||
              Object.keys(groupedBranches).includes("ungrouped") ? (
              // No grouping - flat list
              <div
                className={cn(
                  "divide-y",
                  theme === "dark" ? "divide-gray-700" : "divide-gray-200",
                )}
              >
                {((groupedBranches as any).ungrouped || []).map(
                  (branch: Branch) => (
                    <BranchItem key={branch.name} branch={branch} />
                  ),
                )}
              </div>
            ) : groupBy === "author" ? (
              // Author -> Feature nested grouping (matching PR page style)
              <div
                className={cn(
                  "divide-y",
                  theme === "dark" ? "divide-gray-700" : "divide-gray-200",
                )}
              >
                {Object.entries(
                  groupedBranches as Record<string, Record<string, Branch[]>>,
                ).map(([authorName, features]) => {
                  const authorKey = `author-${authorName}`;
                  const isAuthorCollapsed = collapsedGroups.has(authorKey);
                  const totalBranches = Object.values(features).reduce(
                    (sum: number, branches: Branch[]) => sum + branches.length,
                    0,
                  );

                  // Check if this author creates AI-generated branches
                  const authorBranches: Branch[] = [];
                  Object.values(features).forEach((branchList) => {
                    authorBranches.push(...branchList);
                  });
                  const hasAIBranches = authorBranches.some((branch) =>
                    isAIGenerated(branch),
                  );

                  const agentNameForGroup = authorBranches
                    .map((branch) => getAgentNameForBranch(branch))
                    .find((name): name is string => Boolean(name));

                  const fallbackVariant: "bot" | "user" = hasAIBranches
                    ? "bot"
                    : "user";
                  const displayAgentName = agentNameForGroup;

                  // Get all branch names in this author group
                  const allAuthorBranchNames: string[] = [];
                  Object.values(features).forEach((branches: Branch[]) => {
                    branches.forEach((branch: Branch) => {
                      allAuthorBranchNames.push(branch.name);
                    });
                  });
                  const allAuthorSelected = allAuthorBranchNames.every((name) =>
                    selectedBranches.has(name),
                  );
                  const someAuthorSelected = allAuthorBranchNames.some((name) =>
                    selectedBranches.has(name),
                  );

                  return (
                    <div key={authorName}>
                      {/* Author Group Header */}
                      <div
                        className={cn(
                          "px-3 py-1.5 flex items-center justify-between",
                          theme === "dark"
                            ? "bg-gray-750 hover:bg-gray-700"
                            : "bg-gray-100 hover:bg-gray-200",
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
                              allAuthorBranchNames.forEach((name) => {
                                handleBranchSelect(name, e.target.checked);
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "w-4 h-4 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer",
                              theme === "dark"
                                ? "border-gray-600 bg-gray-700 text-blue-500"
                                : "border-gray-300 bg-white text-blue-600",
                            )}
                            ref={(el) => {
                              if (el) {
                                el.indeterminate =
                                  someAuthorSelected && !allAuthorSelected;
                              }
                            }}
                          />
                          {displayAgentName && displayAgentName !== "unknown" && (
                            <AgentIcon
                              agentName={displayAgentName}
                              fallback={fallbackVariant}
                            />
                          )}
                          <span
                            className="font-medium text-xs cursor-pointer"
                            onClick={() => toggleGroup(authorKey)}
                          >
                            {authorName}
                          </span>
                          <span
                            className={cn(
                              "text-[10px]",
                              theme === "dark"
                                ? "text-gray-400"
                                : "text-gray-600",
                            )}
                          >
                            ({totalBranches})
                          </span>
                        </div>
                      </div>

                      {/* Author Group Content - Feature Sub-groups */}
                      {!isAuthorCollapsed && (
                        <div>
                          {Object.entries(features).map(
                            ([featureName, featureBranches]) => {
                              const featureKey = `${authorKey}-${featureName}`;
                              const isFeatureCollapsed =
                                collapsedGroups.has(featureKey);
                              const hasMultipleBranches =
                                featureBranches.length > 1;

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
                              const featureBranchNames = featureBranches.map(
                                (b) => b.name,
                              );
                              const allFeatureSelected = featureBranchNames.every(
                                (name) => selectedBranches.has(name),
                              );
                              const someFeatureSelected = featureBranchNames.some(
                                (name) => selectedBranches.has(name),
                              );

                              return (
                                <div key={featureName}>
                                  {/* Feature Sub-group Header */}
                                  <div
                                    className={cn(
                                      "pl-6 pr-3 py-1.5 flex items-center justify-between border-l-2",
                                      theme === "dark"
                                        ? "bg-gray-800 hover:bg-gray-750 border-gray-600"
                                        : "bg-gray-50 hover:bg-gray-100 border-gray-300",
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
                                          featureBranchNames.forEach((name) => {
                                            handleBranchSelect(
                                              name,
                                              e.target.checked,
                                            );
                                          });
                                        }}
                                        className={cn(
                                          "w-4 h-4 rounded focus:ring-2 focus:ring-blue-500",
                                          theme === "dark"
                                            ? "border-gray-600 bg-gray-700 text-blue-500"
                                            : "border-gray-300 bg-white text-blue-600",
                                        )}
                                        ref={(el) => {
                                          if (el) {
                                            el.indeterminate =
                                              someFeatureSelected &&
                                              !allFeatureSelected;
                                          }
                                        }}
                                      />
                                      <span
                                        className={cn(
                                          "text-xs cursor-pointer",
                                          theme === "dark"
                                            ? "text-gray-300"
                                            : "text-gray-700",
                                        )}
                                        onClick={() => toggleGroup(featureKey)}
                                      >
                                        {featureName}
                                      </span>
                                      <span
                                        className={cn(
                                          "text-[10px]",
                                          theme === "dark"
                                            ? "text-gray-500"
                                            : "text-gray-600",
                                        )}
                                      >
                                        ({featureBranches.length})
                                      </span>
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
                            },
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Simple grouped display for other grouping types
              <div
                className={cn(
                  "divide-y",
                  theme === "dark" ? "divide-gray-700" : "divide-gray-200",
                )}
              >
                {Object.entries(groupedBranches as Record<string, Branch[]>).map(
                  ([groupName, branches]) => {
                    const groupKey = `group-${groupName}`;
                    const isCollapsed = collapsedGroups.has(groupKey);
                    const allSelected = branches.every((b) =>
                      selectedBranches.has(b.name),
                    );
                    const someSelected = branches.some((b) =>
                      selectedBranches.has(b.name),
                    );

                    // Get group styling based on type
                    const getGroupIcon = () => {
                      if (groupBy === "status") {
                        switch (groupName) {
                          case "current":
                            return <GitBranch className="w-4 h-4 text-blue-400" />;
                          case "protected":
                            return <Shield className="w-4 h-4 text-yellow-400" />;
                          case "ahead":
                            return <ArrowUp className="w-4 h-4 text-green-400" />;
                          case "behind":
                            return (
                              <ArrowDown className="w-4 h-4 text-yellow-400" />
                            );
                          case "diverged":
                            return (
                              <GitMerge className="w-4 h-4 text-orange-400" />
                            );
                          default:
                            return (
                              <GitBranch className="w-4 h-4 text-gray-400" />
                            );
                        }
                      }
                      if (groupBy === "protected") {
                        return groupName === "protected" ? (
                          <Shield className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <GitBranch className="w-4 h-4 text-gray-400" />
                        );
                      }
                      return <GitBranch className="w-4 h-4 text-gray-400" />;
                    };

                    const getGroupLabel = () => {
                      if (groupBy === "status") {
                        return (
                          groupName.charAt(0).toUpperCase() +
                          groupName.slice(1).replace("-", " ")
                        );
                      }
                      return groupName;
                    };

                    return (
                      <div key={groupName}>
                        {/* Group Header */}
                        <div
                          className={cn(
                            "px-3 py-1.5 flex items-center justify-between sticky top-0",
                            theme === "dark"
                              ? "bg-gray-750 hover:bg-gray-700"
                              : "bg-gray-100 hover:bg-gray-200",
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
                                branches.forEach((branch) => {
                                  handleBranchSelect(
                                    branch.name,
                                    e.target.checked,
                                  );
                                });
                              }}
                              className={cn(
                                "w-4 h-4 rounded focus:ring-2 focus:ring-blue-500",
                                theme === "dark"
                                  ? "border-gray-600 bg-gray-700 text-blue-500"
                                  : "border-gray-300 bg-white text-blue-600",
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
                            <span
                              className={cn(
                                "text-[10px]",
                                theme === "dark"
                                  ? "text-gray-400"
                                  : "text-gray-600",
                              )}
                            >
                              ({branches.length})
                            </span>
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
                  },
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create PR Modal */}
      {showCreatePRModal && selectedBranchForPR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => !isCreatingPR && setShowCreatePRModal(false)}
          />

          {/* Modal */}
          <div className={cn(
            "relative w-full max-w-2xl max-h-[90vh] overflow-auto rounded-lg shadow-xl",
            theme === "dark" ? "bg-gray-800" : "bg-white"
          )}>
            {/* Header */}
            <div className={cn(
              "px-6 py-4 border-b flex items-center justify-between",
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            )}>
              <h2 className="text-lg font-semibold flex items-center">
                <GitPullRequest className="w-5 h-5 mr-2" />
                Create Pull Request
              </h2>
              <button
                onClick={() => !isCreatingPR && setShowCreatePRModal(false)}
                disabled={isCreatingPR}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Branch info */}
              <div className={cn(
                "p-3 rounded-lg text-sm",
                theme === "dark" ? "bg-gray-900" : "bg-gray-50"
              )}>
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">From branch:</span>
                  <span className="font-mono font-medium">{selectedBranchForPR.name}</span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <GitMerge className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Into branch:</span>
                  <span className="font-mono font-medium">{selectedRepo?.default_branch || 'main'}</span>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Title
                </label>
                <input
                  ref={prTitleRef}
                  type="text"
                  placeholder="Enter pull request title"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border transition-colors",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-200 text-gray-900 placeholder-gray-500"
                  )}
                  disabled={isCreatingPR}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  ref={prBodyRef}
                  placeholder="Describe your changes (optional)"
                  rows={6}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border transition-colors resize-none",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-200 text-gray-900 placeholder-gray-500"
                  )}
                  disabled={isCreatingPR}
                />
              </div>

              {/* Draft checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="draft-pr"
                  checked={isDraft}
                  onChange={(e) => setIsDraft(e.target.checked)}
                  disabled={isCreatingPR}
                  className={cn(
                    "w-4 h-4 rounded focus:ring-2 focus:ring-blue-500",
                    theme === "dark"
                      ? "border-gray-600 bg-gray-700 text-blue-500"
                      : "border-gray-300 bg-white text-blue-600"
                  )}
                />
                <label htmlFor="draft-pr" className="text-sm cursor-pointer">
                  Create as draft pull request
                </label>
              </div>

              {/* Error message */}
              {createPRError && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-800 text-red-400 text-sm">
                  {createPRError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={cn(
              "px-6 py-4 border-t flex items-center justify-end space-x-3",
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            )}>
              <button
                onClick={() => setShowCreatePRModal(false)}
                disabled={isCreatingPR}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  theme === "dark"
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePR}
                disabled={isCreatingPR}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  "bg-blue-600 text-white hover:bg-blue-700",
                  isCreatingPR && "opacity-50 cursor-not-allowed"
                )}
              >
                {isCreatingPR ? "Creating..." : isDraft ? "Create Draft PR" : "Create PR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
