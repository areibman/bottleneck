import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, MessageSquare, X, CheckSquare, Square } from "lucide-react";
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
        <button
          onClick={(e) => onToggleSelect(e, issue.number)}
          className={cn(
            "flex-shrink-0 mt-1 p-0.5 rounded transition-colors",
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
        </button>
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
    selectAll,
    closeIssues,
    reopenIssues,
    fetchRepoLabels,
    repoLabels,
    addLabelsToIssues,
    removeLabelsFromIssues
  } = useIssueStore();
  const { selectedRepo } = usePRStore();
  const { theme } = useUIStore();
  const [sortBy, setSortBy] = useState<"updated" | "created" | "comments">(
    "updated",
  );
  const [bulkLabelsToAdd, setBulkLabelsToAdd] = useState<string[]>([]);
  const [bulkLabelsToRemove, setBulkLabelsToRemove] = useState<string[]>([]);

  useEffect(() => {
    if (selectedRepo) {
      fetchIssues(selectedRepo.owner, selectedRepo.name);
      fetchRepoLabels(selectedRepo.owner, selectedRepo.name);
    }
  }, [selectedRepo, fetchIssues, fetchRepoLabels]);

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

  const handleSelectAll = useCallback(() => {
    if (selectedIssues.size === filteredIssues.length) {
      clearSelection();
    } else {
      selectAll(filteredIssues.map(issue => issue.number));
    }
  }, [selectedIssues, filteredIssues, clearSelection, selectAll]);

  if (!selectedRepo) {
    return <WelcomeView />;
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "p-4 border-b",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-gray-50 border-gray-200",
        )}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Issues
            {selectedRepo && (
              <span
                className={cn(
                  "ml-2 text-sm",
                  theme === "dark" ? "text-gray-400" : "text-gray-600",
                )}
              >
                in {selectedRepo.name}
              </span>
            )}
            <span
              className={cn(
                "ml-2 text-sm",
                theme === "dark" ? "text-gray-500" : "text-gray-600",
              )}
            >
              ({filteredIssues.length})
            </span>
          </h1>

          <div className="flex items-center space-x-2">
            {selectedIssues.size > 0 && (
              <>
                <div className="flex items-center space-x-2 mr-4">
                  <button
                    onClick={handleSelectAll}
                    className={cn(
                      "p-1.5 rounded transition-colors",
                      theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"
                    )}
                    title={selectedIssues.size === filteredIssues.length ? "Deselect all" : "Select all"}
                  >
                    {selectedIssues.size === filteredIssues.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Square className={cn(
                        "w-4 h-4",
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      )} />
                    )}
                  </button>
                  <span className={cn(
                    "text-sm",
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  )}>
                    {selectedIssues.size} selected
                  </span>
                  <button
                    onClick={clearSelection}
                    className={cn(
                      "p-1.5 rounded transition-colors",
                      theme === "dark" ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-200 text-gray-600"
                    )}
                    title="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center space-x-2 border-l pl-4">
                  <button
                    onClick={handleCloseSelected}
                    className={cn(
                      "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                      theme === "dark"
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "bg-purple-500 hover:bg-purple-600 text-white"
                    )}
                  >
                    Close Issues
                  </button>
                  <button
                    onClick={handleReopenSelected}
                    className={cn(
                      "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                      theme === "dark"
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-green-500 hover:bg-green-600 text-white"
                    )}
                  >
                    Reopen Issues
                  </button>
                  <div className="flex items-center space-x-2">
                    <LabelSelector
                      availableLabels={repoLabels}
                      selectedLabels={bulkLabelsToAdd}
                      onAddLabel={(label) => setBulkLabelsToAdd([...bulkLabelsToAdd, label])}
                      onRemoveLabel={(label) => setBulkLabelsToAdd(bulkLabelsToAdd.filter(l => l !== label))}
                      onApply={handleApplyLabels}
                      showApplyButton={true}
                    />
                  </div>
                </div>
              </>
            )}
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
            <Dropdown
              options={agents}
              value={filters.assignee}
              onChange={(value) => setFilter("assignee", value)}
              labelPrefix="Agent: "
            />
          </div>
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
    </div>
  );
}
