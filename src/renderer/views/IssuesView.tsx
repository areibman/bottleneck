import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, MessageSquare, X, Plus, Tag } from "lucide-react";
import { useIssueStore } from "../stores/issueStore";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../utils/cn";
import { getLabelColors } from "../utils/labelColors";
import Dropdown, { DropdownOption } from "../components/Dropdown";
import WelcomeView from "./WelcomeView";
import { Issue } from "../services/github";

const IssueItem = React.memo(
  ({
    issue,
    onIssueClick,
    onCloseIssue,
    onReopenIssue,
    onAddLabel,
    onRemoveLabel,
    availableLabels,
    theme,
  }: {
    issue: Issue;
    onIssueClick: (issue: Issue) => void;
    onCloseIssue: (issue: Issue) => void;
    onReopenIssue: (issue: Issue) => void;
    onAddLabel: (issue: Issue, label: string) => void;
    onRemoveLabel: (issue: Issue, label: string) => void;
    availableLabels: Array<{ name: string; color: string; description: string | null }>;
    theme: "light" | "dark";
  }) => {
    const [showLabelDropdown, setShowLabelDropdown] = useState(false);
    const [showAddLabel, setShowAddLabel] = useState(false);
    const [newLabelName, setNewLabelName] = useState("");

    const handleAddLabel = () => {
      if (newLabelName.trim()) {
        onAddLabel(issue, newLabelName.trim());
        setNewLabelName("");
        setShowAddLabel(false);
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleAddLabel();
      } else if (e.key === "Escape") {
        setShowAddLabel(false);
        setNewLabelName("");
      }
    };
    return (
      <div
        className={cn(
          "px-4 py-3 group",
          theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-100",
        )}
      >
        <div className="flex items-start space-x-3">
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
                <div 
                  className="cursor-pointer"
                  onClick={() => onIssueClick(issue)}
                >
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
                </div>

                <div className="flex items-center mt-2 space-x-1 flex-wrap">
                  {issue.labels.slice(0, 5).map((label) => {
                    const labelColors = getLabelColors(label.color, theme);
                    return (
                      <span
                        key={label.name}
                        className="px-2 py-0.5 text-xs rounded font-medium flex items-center space-x-1 group/label"
                        style={{
                          backgroundColor: labelColors.backgroundColor,
                          color: labelColors.color,
                        }}
                      >
                        <span>{label.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveLabel(issue, label.name);
                          }}
                          className="opacity-0 group-hover/label:opacity-100 hover:bg-black hover:bg-opacity-20 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLabelDropdown(!showLabelDropdown);
                      }}
                      className={cn(
                        "px-2 py-0.5 text-xs rounded font-medium flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity",
                        theme === "dark" 
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600" 
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      )}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add label</span>
                    </button>

                    {showLabelDropdown && (
                      <div
                        className={cn(
                          "absolute top-8 left-0 z-10 w-64 max-h-48 overflow-y-auto rounded shadow-lg border",
                          theme === "dark"
                            ? "bg-gray-700 border-gray-600"
                            : "bg-white border-gray-200"
                        )}
                      >
                        <div className="p-2">
                          <div className="flex items-center space-x-2 mb-2">
                            <input
                              type="text"
                              placeholder="Add new label..."
                              value={newLabelName}
                              onChange={(e) => setNewLabelName(e.target.value)}
                              onKeyDown={handleKeyPress}
                              className={cn(
                                "flex-1 px-2 py-1 text-xs rounded border",
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-600 text-white"
                                  : "bg-white border-gray-300 text-gray-900"
                              )}
                              autoFocus
                            />
                            <button
                              onClick={handleAddLabel}
                              className={cn(
                                "px-2 py-1 text-xs rounded",
                                theme === "dark"
                                  ? "bg-green-600 hover:bg-green-700 text-white"
                                  : "bg-green-500 hover:bg-green-600 text-white"
                              )}
                            >
                              Add
                            </button>
                          </div>
                          
                          <div className="space-y-1">
                            {availableLabels
                              .filter(label => !issue.labels.some(l => l.name === label.name))
                              .map((label) => (
                                <button
                                  key={label.name}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddLabel(issue, label.name);
                                    setShowLabelDropdown(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-2 py-1 text-xs rounded hover:bg-opacity-20 flex items-center space-x-2",
                                    theme === "dark" ? "hover:bg-gray-600" : "hover:bg-gray-100"
                                  )}
                                >
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: `#${label.color}` }}
                                  />
                                  <span>{label.name}</span>
                                  {label.description && (
                                    <span className="text-gray-500 truncate">
                                      {label.description}
                                    </span>
                                  )}
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {issue.state === "open" ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseIssue(issue);
                      }}
                      className={cn(
                        "p-1 rounded transition-colors",
                        theme === "dark"
                          ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                          : "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
                      )}
                      title="Close issue"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReopenIssue(issue);
                      }}
                      className={cn(
                        "p-1 rounded transition-colors",
                        theme === "dark"
                          ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                          : "hover:bg-gray-100 text-gray-600 hover:text-gray-800"
                      )}
                      title="Reopen issue"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
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
    closeIssue, 
    reopenIssue, 
    addIssueLabels, 
    removeIssueLabel, 
    fetchRepositoryLabels,
    availableLabels 
  } = useIssueStore();
  const { selectedRepo } = usePRStore();
  const { theme } = useUIStore();
  const [sortBy, setSortBy] = useState<"updated" | "created" | "comments">(
    "updated",
  );

  useEffect(() => {
    if (selectedRepo) {
      fetchIssues(selectedRepo.owner, selectedRepo.name);
      fetchRepositoryLabels(selectedRepo.owner, selectedRepo.name);
    }
  }, [selectedRepo, fetchIssues, fetchRepositoryLabels]);

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

  const handleCloseIssue = useCallback(
    (issue: Issue) => {
      if (selectedRepo) {
        closeIssue(selectedRepo.owner, selectedRepo.name, issue.number);
      }
    },
    [closeIssue, selectedRepo],
  );

  const handleReopenIssue = useCallback(
    (issue: Issue) => {
      if (selectedRepo) {
        reopenIssue(selectedRepo.owner, selectedRepo.name, issue.number);
      }
    },
    [reopenIssue, selectedRepo],
  );

  const handleAddLabel = useCallback(
    (issue: Issue, label: string) => {
      if (selectedRepo) {
        addIssueLabels(selectedRepo.owner, selectedRepo.name, issue.number, [label]);
      }
    },
    [addIssueLabels, selectedRepo],
  );

  const handleRemoveLabel = useCallback(
    (issue: Issue, label: string) => {
      if (selectedRepo) {
        removeIssueLabel(selectedRepo.owner, selectedRepo.name, issue.number, label);
      }
    },
    [removeIssueLabel, selectedRepo],
  );

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
                onIssueClick={handleIssueClick}
                onCloseIssue={handleCloseIssue}
                onReopenIssue={handleReopenIssue}
                onAddLabel={handleAddLabel}
                onRemoveLabel={handleRemoveLabel}
                availableLabels={availableLabels.get(`${selectedRepo.owner}/${selectedRepo.name}`) || []}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
