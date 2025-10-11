import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, MessageSquare, X, CheckSquare, Square, Tag, Plus } from "lucide-react";
import { useIssueStore } from "../stores/issueStore";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../utils/cn";
import { getLabelColors } from "../utils/labelColors";
import Dropdown, { DropdownOption } from "../components/Dropdown";
import WelcomeView from "./WelcomeView";
import { Issue } from "../services/github";
import LabelSelector from "../components/LabelSelector";
import { useSettingsStore } from "../stores/settingsStore";
import TeamManagerModal from "../components/TeamManagerModal";
import { toggleTeamInSelection, normalizeSelectionAgainstAllToken } from "../utils/teamUtils";

const IssueItem = React.memo(
  ({
    issue,
    isSelected,
    onIssueClick,
    onToggleSelect,
    theme,
  }: {
    issue: Issue;
    isSelected: boolean;
    onIssueClick: (issue: Issue) => void;
    onToggleSelect: (e: React.MouseEvent, issueNumber: number) => void;
    theme: "light" | "dark";
  }) => {
    return (
      <div
        className={cn(
          "px-4 py-3 cursor-pointer flex items-start space-x-3",
          theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-100",
          isSelected && (theme === "dark" ? "bg-gray-800" : "bg-gray-100")
        )}
        onClick={() => onIssueClick(issue)}
      >
        <div
          onClick={(e) => onToggleSelect(e, issue.number)}
          className={cn(
            "flex-shrink-0 mt-1 p-0.5 rounded transition-colors cursor-pointer",
            theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"
          )}
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-blue-500" />
          ) : (
            <Square className={cn(
              "w-4 h-4",
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            )} />
          )}
        </div>
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-1">
            {issue.state === "open" ? (
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
                <h3
                  className={cn(
                    "text-sm font-medium truncate",
                    theme === "dark" ? "text-white" : "text-gray-900",
                  )}
                >
                  {issue.title}
                </h3>

                <div
                  className={cn(
                    "flex items-center mt-1 text-xs space-x-3",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  <span>#{issue.number}</span>
                  <span>by {issue.user.login}</span>
                  <span>
                    {formatDistanceToNow(new Date(issue.updated_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                {issue.labels.length > 0 && (
                  <div className="flex items-center mt-2 space-x-1">
                    {issue.labels.slice(0, 5).map((label) => {
                      const labelColors = getLabelColors(label.color, theme);
                      return (
                        <span
                          key={label.name}
                          className="px-2 py-0.5 text-xs rounded font-medium"
                          style={{
                            backgroundColor: labelColors.backgroundColor,
                            color: labelColors.color,
                          }}
                        >
                          {label.name}
                        </span>
                      );
                    })}
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
                          theme === "dark" ? "border-gray-800" : "border-white",
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
  },
);

type SortByType = "updated" | "created" | "comments";

const sortOptions: DropdownOption<SortByType>[] = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Recently created" },
  { value: "comments", label: "Most commented" },
];

export default function IssuesView() {
  const navigate = useNavigate();
  const {
    issues,
    loading,
    fetchIssues,
    filters,
    setFilter,
    selectedIssues,
    toggleIssueSelection,
    clearSelection,
    closeIssues,
    reopenIssues,
    fetchRepoLabels,
    repoLabels,
    createLabel,
    addLabelsToIssues,
    removeLabelsFromIssues
  } = useIssueStore();
  const { selectedRepo } = usePRStore();
  const { theme } = useUIStore();
  const { settings } = useSettingsStore();
  const [showTeamManager, setShowTeamManager] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"updated" | "created" | "comments">(
    "updated",
  );
  const [bulkLabelsToAdd, setBulkLabelsToAdd] = useState<string[]>([]);
  const [bulkLabelsToRemove, setBulkLabelsToRemove] = useState<string[]>([]);
  const [showLabelFilterDropdown, setShowLabelFilterDropdown] = useState(false);
  const labelFilterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedRepo) {
      fetchIssues(selectedRepo.owner, selectedRepo.name);
      fetchRepoLabels(selectedRepo.owner, selectedRepo.name);
    }
  }, [selectedRepo, fetchIssues, fetchRepoLabels]);

  // Close label filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (labelFilterDropdownRef.current && !labelFilterDropdownRef.current.contains(event.target as Node)) {
        setShowLabelFilterDropdown(false);
      }
    };

    if (showLabelFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLabelFilterDropdown]);

  const authors = useMemo(() => {
    const authorMap = new Map<string, { login: string; avatar_url: string }>();
    issues.forEach((issue) => {
      authorMap.set(issue.user.login, issue.user);
    });

    const authorOptions: DropdownOption<string>[] = [
      { value: "all", label: "All Authors" },
      ...Array.from(authorMap.values()).map((author) => ({
        value: author.login,
        label: author.login,
        icon: (
          <img
            src={author.avatar_url}
            alt={author.login}
            className="w-4 h-4 rounded-full"
          />
        ),
      })),
    ];
    return authorOptions;
  }, [issues]);

  const teams = useMemo(() => {
    return (settings.authorTeams || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [settings.authorTeams]);

  const agents = useMemo(() => {
    const agentMap = new Map<string, { login: string; avatar_url: string }>();
    issues.forEach((issue) => {
      issue.assignees.forEach((assignee) => {
        agentMap.set(assignee.login, assignee);
      });
    });

    const agentOptions: DropdownOption<string>[] = [
      { value: "all", label: "All Agents" },
      { value: "unassigned", label: "Unassigned" },
      ...Array.from(agentMap.values()).map((agent) => ({
        value: agent.login,
        label: agent.login,
        icon: (
          <img
            src={agent.avatar_url}
            alt={agent.login}
            className="w-4 h-4 rounded-full"
          />
        ),
      })),
    ];

    return agentOptions;
  }, [issues]);

  // Cache date parsing in a separate map to avoid modifying objects
  const parsedDates = useMemo(() => {
    const dateMap = new Map();
    issues.forEach((issue, key) => {
      dateMap.set(key, {
        updated: new Date(issue.updated_at).getTime(),
        created: new Date(issue.created_at).getTime(),
      });
    });
    return dateMap;
  }, [issues]);

  const filteredIssues = useMemo(() => {
    let issuesArray = Array.from(issues.values());

    // Apply filters
    issuesArray = issuesArray.filter((issue) => {
      // Status filter
      if (filters.status !== "all" && issue.state !== filters.status) {
        return false;
      }

      // Labels filter
      if (filters.labels.length > 0) {
        const issueLabels = issue.labels.map((l) => l.name);
        const hasAllLabels = filters.labels.every((label) =>
          issueLabels.includes(label),
        );
        if (!hasAllLabels) {
          return false;
        }
      }

      // Author filter
      if (
        filters.author !== "all" &&
        issue.user.login !== filters.author
      ) {
        return false;
      }

      // Assignee filter
      if (filters.assignee !== "all") {
        if (filters.assignee === "unassigned") {
          if (issue.assignees.length > 0) {
            return false;
          }
        } else if (filters.assignee === "assigned") {
          if (issue.assignees.length === 0) {
            return false;
          }
        } else {
          // Specific assignee
          const hasAssignee = issue.assignees.some(
            (a) => a.login === filters.assignee,
          );
          if (!hasAssignee) {
            return false;
          }
        }
      }

      return true;
    });

    // Sort using cached dates from the map
    issuesArray.sort((a, b) => {
      const aKey = `${a.repository?.owner.login || ""}/${a.repository?.name || ""}#${a.number}`;
      const bKey = `${b.repository?.owner.login || ""}/${b.repository?.name || ""}#${b.number}`;
      const aDates = parsedDates.get(aKey) || { updated: 0, created: 0 };
      const bDates = parsedDates.get(bKey) || { updated: 0, created: 0 };

      switch (sortBy) {
        case "updated":
          return bDates.updated - aDates.updated;
        case "created":
          return bDates.created - aDates.created;
        case "comments":
          return b.comments - a.comments;
        default:
          return 0;
      }
    });

    return issuesArray;
  }, [issues, parsedDates, sortBy, filters]);

  const handleIssueClick = useCallback(
    (issue: Issue) => {
      if (selectedRepo) {
        navigate(
          `/issues/${selectedRepo.owner}/${selectedRepo.name}/${issue.number}`,
        );
      }
    },
    [navigate, selectedRepo],
  );

  const handleToggleSelect = useCallback(
    (e: React.MouseEvent, issueNumber: number) => {
      e.stopPropagation();
      toggleIssueSelection(issueNumber);
    },
    [toggleIssueSelection]
  );

  const handleLabelFilterToggle = useCallback(
    (labelName: string) => {
      const currentLabels = filters.labels;
      if (labelName === "all") {
        // Toggle all labels
        if (currentLabels.length === 0 || currentLabels.length < repoLabels.length) {
          setFilter("labels", repoLabels.map(l => l.name));
        } else {
          setFilter("labels", []);
        }
      } else {
        // Toggle individual label
        if (currentLabels.includes(labelName)) {
          setFilter("labels", currentLabels.filter(l => l !== labelName));
        } else {
          setFilter("labels", [...currentLabels, labelName]);
        }
      }
    },
    [filters.labels, repoLabels, setFilter]
  );

  const handleCloseSelected = useCallback(async () => {
    if (selectedRepo && selectedIssues.size > 0) {
      await closeIssues(
        selectedRepo.owner,
        selectedRepo.name,
        Array.from(selectedIssues)
      );
    }
  }, [selectedRepo, selectedIssues, closeIssues]);

  const handleReopenSelected = useCallback(async () => {
    if (selectedRepo && selectedIssues.size > 0) {
      await reopenIssues(
        selectedRepo.owner,
        selectedRepo.name,
        Array.from(selectedIssues)
      );
    }
  }, [selectedRepo, selectedIssues, reopenIssues]);

  const handleApplyLabels = useCallback(async () => {
    if (selectedRepo && selectedIssues.size > 0) {
      const issueNumbers = Array.from(selectedIssues);

      if (bulkLabelsToAdd.length > 0) {
        await addLabelsToIssues(
          selectedRepo.owner,
          selectedRepo.name,
          issueNumbers,
          bulkLabelsToAdd
        );
      }

      if (bulkLabelsToRemove.length > 0) {
        await removeLabelsFromIssues(
          selectedRepo.owner,
          selectedRepo.name,
          issueNumbers,
          bulkLabelsToRemove
        );
      }

      setBulkLabelsToAdd([]);
      setBulkLabelsToRemove([]);
    }
  }, [selectedRepo, selectedIssues, bulkLabelsToAdd, bulkLabelsToRemove, addLabelsToIssues, removeLabelsFromIssues]);

  const selectedIssuesData = useMemo(() => {
    const issueNumbers = Array.from(selectedIssues);
    return filteredIssues.filter(issue => issueNumbers.includes(issue.number));
  }, [selectedIssues, filteredIssues]);

  const hasOpenIssues = useMemo(() =>
    selectedIssuesData.some(issue => issue.state === 'open'),
    [selectedIssuesData]
  );

  const hasClosedIssues = useMemo(() =>
    selectedIssuesData.some(issue => issue.state === 'closed'),
    [selectedIssuesData]
  );

  if (!selectedRepo) {
    return <WelcomeView />;
  }

  return (
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
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Issues
              <span
                className={cn(
                  "ml-2 text-sm",
                  theme === "dark" ? "text-gray-500" : "text-gray-600",
                )}
              >
                ({filteredIssues.length})
              </span>
            </h1>
            {/* Selection help text or bulk actions */}
            {selectedIssues.size > 0 ? (
              <div className="ml-4 flex items-center space-x-3">
                <span
                  className={cn(
                    "text-sm",
                    theme === "dark" ? "text-gray-300" : "text-gray-600",
                  )}
                >
                  {selectedIssues.size} selected
                </span>

                {hasClosedIssues && (
                  <div
                    onClick={handleReopenSelected}
                    className={cn(
                      "px-2.5 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer",
                      theme === "dark"
                        ? "text-green-400 hover:text-green-300 hover:bg-green-900/20"
                        : "text-green-600 hover:text-green-700 hover:bg-green-50",
                    )}
                  >
                    Reopen
                  </div>
                )}

                {hasOpenIssues && (
                  <div
                    onClick={handleCloseSelected}
                    className={cn(
                      "px-2.5 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer",
                      theme === "dark"
                        ? "text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                        : "text-purple-600 hover:text-purple-700 hover:bg-purple-50",
                    )}
                  >
                    Close
                  </div>
                )}

                <div className="flex items-center">
                  <LabelSelector
                    availableLabels={repoLabels}
                    selectedLabels={bulkLabelsToAdd}
                    onAddLabel={(label) => setBulkLabelsToAdd([...bulkLabelsToAdd, label])}
                    onRemoveLabel={(label) => setBulkLabelsToAdd(bulkLabelsToAdd.filter(l => l !== label))}
                    onCreateLabel={selectedRepo ? async (name, color, description) => {
                      await createLabel(selectedRepo.owner, selectedRepo.name, name, color, description);
                    } : undefined}
                    onApply={handleApplyLabels}
                    showApplyButton={true}
                  />
                </div>

                <div
                  onClick={clearSelection}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer",
                    theme === "dark"
                      ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                      : "text-gray-600 hover:text-gray-700 hover:bg-gray-100",
                  )}
                >
                  Clear
                </div>
              </div>
            ) : (
              <span
                className={cn(
                  "ml-4 text-xs",
                  theme === "dark" ? "text-gray-500" : "text-gray-600",
                )}
              >
                ⌘/Ctrl+Click to multi-select
              </span>
            )}
          </div>

          {selectedIssues.size === 0 && (
            <div className="flex items-center space-x-2">
              <Dropdown<SortByType>
                options={sortOptions}
                value={sortBy}
                onChange={setSortBy}
                labelPrefix="Sort by: "
              />
              <Dropdown
                options={authors}
                value={filters.author}
                onChange={(value) => setFilter("author", value)}
                labelPrefix="Author: "
              />

              {/* Teams quick filter for issues */}
              {teams.length > 0 && (
                <div className="relative">
                  <div className={cn(
                    "px-3 py-1.5 rounded border flex items-center space-x-2 text-xs min-w-[150px] cursor-pointer",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
                      : "bg-white border-gray-300 hover:bg-gray-100"
                  )}
                  >
                    <span>Teams:</span>
                    <select
                      className={cn(
                        "bg-transparent outline-none",
                        theme === "dark" ? "text-gray-300" : "text-gray-700",
                      )}
                      onChange={(e) => {
                        const teamId = e.target.value;
                        const team = teams.find(t => t.id === teamId);
                        if (team) {
                          const next = new Set<string>(filters.author === 'all' ? [] : [filters.author]);
                          const toggled = toggleTeamInSelection(next, team.members);
                          const normalized = normalizeSelectionAgainstAllToken(toggled, Array.from(new Set(issues.map(i => i.user.login))));
                          // Issue filter currently supports a single author or 'all'; when multiple selected, clear to 'all'
                          setFilter("author", normalized.size <= 1 ? Array.from(normalized)[0] || 'all' : 'all');
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Select team…</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.icon ? `${team.icon} ` : ''}{team.name} ({team.members.length})</option>
                      ))}
                    </select>
                    <button
                      className={cn("p-1 rounded", theme === "dark" ? "hover:bg-gray-600" : "hover:bg-gray-100")}
                      onClick={() => { setEditingTeamId(null); setShowTeamManager(true); }}
                      title="Create new team"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
              <Dropdown
                options={agents}
                value={filters.assignee}
                onChange={(value) => setFilter("assignee", value)}
                labelPrefix="Agent: "
              />

              {/* Label filter dropdown */}
              <div className="relative" ref={labelFilterDropdownRef}>
                <div
                  onClick={() => setShowLabelFilterDropdown(!showLabelFilterDropdown)}
                  className={cn(
                    "px-3 py-1.5 rounded border flex items-center space-x-2 text-xs min-w-[120px] cursor-pointer",
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
                      : "bg-white border-gray-300 hover:bg-gray-100"
                  )}
                >
                  <Tag className="w-3 h-3" />
                  <span>Labels:</span>
                  <span className={cn(
                    "truncate",
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  )}>
                    {filters.labels.length === 0
                      ? "All"
                      : filters.labels.length === repoLabels.length
                        ? "All"
                        : `${filters.labels.length} selected`}
                  </span>
                </div>

                {showLabelFilterDropdown && (
                  <div
                    className={cn(
                      "absolute top-full mt-1 right-0 z-50 min-w-[200px] max-w-[300px] rounded-md shadow-lg border",
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700"
                        : "bg-white border-gray-200"
                    )}
                  >
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {/* Select All option */}
                      <label
                        className={cn(
                          "flex items-center space-x-2 p-2 rounded cursor-pointer",
                          theme === "dark"
                            ? "hover:bg-gray-700"
                            : "hover:bg-gray-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={filters.labels.length === 0 || filters.labels.length === repoLabels.length}
                          onChange={() => handleLabelFilterToggle("all")}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">All Labels</span>
                      </label>

                      <div className={cn(
                        "my-1 border-t",
                        theme === "dark" ? "border-gray-700" : "border-gray-200"
                      )} />

                      {/* Individual label options */}
                      {repoLabels.map(label => {
                        const labelColors = getLabelColors(label.color, theme);
                        return (
                          <label
                            key={label.name}
                            className={cn(
                              "flex items-center space-x-2 p-2 rounded cursor-pointer",
                              theme === "dark"
                                ? "hover:bg-gray-700"
                                : "hover:bg-gray-50"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={filters.labels.includes(label.name)}
                              onChange={() => handleLabelFilterToggle(label.name)}
                              className="rounded"
                            />
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: labelColors.backgroundColor,
                                color: labelColors.color,
                              }}
                            >
                              {label.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div
              className={cn(
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              Loading issues...
            </div>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center h-64",
              theme === "dark" ? "text-gray-400" : "text-gray-600",
            )}
          >
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No issues found</p>
            {selectedRepo && (
              <p className="text-sm mt-2">
                No issues in {selectedRepo.full_name}
              </p>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "divide-y",
              theme === "dark" ? "divide-gray-700" : "divide-gray-200",
            )}
          >
            {filteredIssues.map((issue) => (
              <IssueItem
                key={issue.id}
                issue={issue}
                isSelected={selectedIssues.has(issue.number)}
                onIssueClick={handleIssueClick}
                onToggleSelect={handleToggleSelect}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>
      <TeamManagerModal
        isOpen={showTeamManager}
        onClose={() => setShowTeamManager(false)}
        availableAuthors={Array.from(new Map(issues.values()).values()).map((issue: any) => issue.user)}
        initialEditingTeamId={editingTeamId}
      />
    </div>
  );
}
