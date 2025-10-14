import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, MessageSquare, User, GitBranch, GitPullRequest, Edit3, X, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useIssueStore } from "../stores/issueStore";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../utils/cn";
import { getLabelColors } from "../utils/labelColors";
import WelcomeView from "./WelcomeView";
import { Issue, PullRequest } from "../services/github";
import { PRAssignmentModal } from "../components/PRAssignmentModal";
import { getPRMetadata, groupPRsByAgent, groupPRsByPrefix, isGroupClosed, PRMetadata } from "../utils/prGrouping";

// Define the Kanban column types
type KanbanColumn = "unassigned" | "todo" | "in_progress" | "in_review" | "done" | "closed";

interface KanbanColumnConfig {
  id: KanbanColumn;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  {
    id: "unassigned",
    title: "Unassigned",
    description: "Issues without assignees or associated PRs/branches",
    icon: AlertCircle,
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-800/50",
  },
  {
    id: "todo",
    title: "TODO",
    description: "Issues ready to be worked on",
    icon: AlertCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    id: "in_progress",
    title: "In Progress",
    description: "Issues being actively worked on",
    icon: User,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
  },
  {
    id: "in_review",
    title: "In Review",
    description: "Issues with PRs under review",
    icon: GitPullRequest,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    id: "done",
    title: "Done",
    description: "Issues with merged PRs",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
  {
    id: "closed",
    title: "Closed",
    description: "Closed issues",
    icon: CheckCircle,
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-800/50",
  },
];

interface IssueCardProps {
  issue: Issue;
  onIssueClick: (issue: Issue) => void;
  onQuickEdit: (issue: Issue) => void;
  onOpenPRAssignment: (issue: Issue) => void;
  onUnlinkPR: (issueNumber: number, prNumber: number) => void;
  expandedPRGroups: Set<string>;
  onTogglePRGroup: (groupKey: string) => void;
  theme: "light" | "dark";
  repoOwner: string;
  repoName: string;
}

const IssueCard = React.memo(({
  issue,
  onIssueClick,
  onQuickEdit,
  onOpenPRAssignment,
  onUnlinkPR,
  expandedPRGroups,
  onTogglePRGroup,
  theme,
  repoOwner,
  repoName
}: IssueCardProps) => {
  const [isBeingDragged, setIsBeingDragged] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({
      issueNumber: issue.number,
      owner: repoOwner,
      repo: repoName,
    }));
    e.dataTransfer.effectAllowed = "move";
    setIsBeingDragged(true);
  };

  const handleDragEnd = () => {
    setIsBeingDragged(false);
  };

  const handleQuickEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickEdit(issue);
  };

  const handleOpenPRAssignment = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenPRAssignment(issue);
  };

  // Group linked PRs by agent, then by task prefix within each agent
  const groupedPRs = useMemo((): Map<string, Map<string, PRMetadata[]>> => {
    if (!issue.linkedPRs || issue.linkedPRs.length === 0) {
      return new Map();
    }

    const linkedPRsWithMetadata = issue.linkedPRs.map(pr => {
      // Convert linkedPR to PullRequest format for getPRMetadata
      const fakePR: PullRequest = {
        ...pr,
        user: { login: "", avatar_url: "" },
        body: null,
        labels: [],
        head: pr.head ? {
          ref: pr.head.ref,
          sha: "",
          repo: null
        } : {
          ref: "",
          sha: "",
          repo: null
        },
        base: {
          ref: "",
          sha: "",
          repo: {
            name: repoName,
            owner: { login: repoOwner }
          }
        },
        assignees: [],
        requested_reviewers: [],
        comments: 0,
        created_at: "",
        updated_at: "",
        closed_at: null,
        merged_at: null,
        mergeable: null,
        merge_commit_sha: null,
      };
      return getPRMetadata(fakePR);
    });

    // First group by agent
    const byAgent = groupPRsByAgent(linkedPRsWithMetadata);

    // Then group each agent's PRs by task prefix
    const nestedGroups = new Map<string, Map<string, PRMetadata[]>>();
    for (const [agent, agentPRs] of byAgent) {
      const byPrefix = groupPRsByPrefix(agentPRs);
      nestedGroups.set(agent, byPrefix);
    }

    return nestedGroups;
  }, [issue.linkedPRs, repoOwner, repoName]);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onIssueClick(issue)}
      className={cn(
        "p-2 rounded border cursor-pointer transition-all duration-200 group relative",
        theme === "dark"
          ? "bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600"
          : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300",
        isBeingDragged && "opacity-50 rotate-1 scale-105 shadow-lg z-50",
        "hover:shadow-sm"
      )}
    >
      {/* Quick edit button - only visible on hover */}
      <button
        onClick={handleQuickEdit}
        className={cn(
          "absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity",
          theme === "dark"
            ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
            : "bg-gray-100 hover:bg-gray-200 text-gray-600"
        )}
        title="Quick edit"
      >
        <Edit3 className="w-2.5 h-2.5" />
      </button>

      {/* Issue header */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center space-x-1.5 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {issue.state === "open" ? (
              <AlertCircle className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
            )}
          </div>
          <span
            className={cn(
              "text-xs font-mono",
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            )}
          >
            #{issue.number}
          </span>
        </div>
        {issue.comments > 0 && (
          <div className="flex items-center text-xs text-gray-500">
            <MessageSquare className="w-2.5 h-2.5 mr-0.5" />
            {issue.comments}
          </div>
        )}
      </div>

      {/* Issue title */}
      <h3
        className={cn(
          "text-xs font-medium mb-1.5 leading-tight",
          theme === "dark" ? "text-white" : "text-gray-900"
        )}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}
      >
        {issue.title}
      </h3>

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mb-1.5">
          {issue.labels.slice(0, 2).map((label) => {
            const labelColors = getLabelColors(label.color, theme);
            return (
              <span
                key={label.name}
                className="px-1 py-0.5 text-xs rounded font-medium"
                style={{
                  backgroundColor: labelColors.backgroundColor,
                  color: labelColors.color,
                  fontSize: "0.625rem"
                }}
              >
                {label.name}
              </span>
            );
          })}
          {issue.labels.length > 2 && (
            <span
              className={cn(
                "px-1 py-0.5 rounded font-medium",
                theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"
              )}
              style={{ fontSize: "0.625rem" }}
            >
              +{issue.labels.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Issue footer */}
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center space-x-1.5">
          <img
            src={issue.user.avatar_url}
            alt={issue.user.login}
            className="w-3 h-3 rounded-full"
          />
          <span
            className={cn(
              "text-xs",
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            )}
            style={{ fontSize: "0.625rem" }}
          >
            {issue.user.login}
          </span>
        </div>
        <span
          className={cn(
            theme === "dark" ? "text-gray-500" : "text-gray-500"
          )}
          style={{ fontSize: "0.625rem" }}
        >
          {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}
        </span>
      </div>

      {/* Assignees */}
      {issue.assignees.length > 0 && (
        <div className="flex items-center mb-1.5 -space-x-1">
          {issue.assignees.slice(0, 3).map((assignee) => (
            <img
              key={assignee.login}
              src={assignee.avatar_url}
              alt={assignee.login}
              className={cn(
                "w-4 h-4 rounded-full border",
                theme === "dark" ? "border-gray-800" : "border-white"
              )}
              title={`Assigned to: ${assignee.login}`}
            />
          ))}
          {issue.assignees.length > 3 && (
            <div
              className={cn(
                "w-4 h-4 rounded-full border flex items-center justify-center font-medium",
                theme === "dark"
                  ? "bg-gray-700 border-gray-800 text-gray-300"
                  : "bg-gray-200 border-white text-gray-600"
              )}
              style={{ fontSize: "0.625rem" }}
            >
              +{issue.assignees.length - 3}
            </div>
          )}
        </div>
      )}

      {/* PR Groups Section */}
      <div className={cn(
        "mt-2 pt-2 border-t",
        theme === "dark" ? "border-gray-700" : "border-gray-200"
      )}>
        {groupedPRs.size === 0 ? (
          <button
            onClick={handleOpenPRAssignment}
            className={cn(
              "w-full flex items-center justify-center space-x-1 py-1.5 px-2 rounded transition-colors",
              theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
            )}
            style={{ fontSize: "0.625rem" }}
          >
            <Plus className="w-2.5 h-2.5" />
            <span>Add PRs</span>
          </button>
        ) : (
          <div className="space-y-1">
            {Array.from(groupedPRs.entries()).map(([agent, taskGroups]) => {
              const groupKey = `${issue.id}-${agent}`;
              const isExpanded = expandedPRGroups.has(groupKey);

              // Calculate total PRs and if any are closed
              const allAgentPRs = Array.from(taskGroups.values()).flat();
              const groupIsClosed = isGroupClosed(allAgentPRs);
              const prCount = allAgentPRs.length;

              return (
                <div key={agent}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePRGroup(groupKey);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-1.5 rounded transition-colors",
                      theme === "dark"
                        ? "bg-gray-700 hover:bg-gray-600"
                        : "bg-gray-100 hover:bg-gray-200"
                    )}
                  >
                    <div className="flex items-center space-x-1.5">
                      {isExpanded ? (
                        <ChevronDown className="w-2.5 h-2.5" />
                      ) : (
                        <ChevronRight className="w-2.5 h-2.5" />
                      )}
                      <span className="font-medium capitalize" style={{ fontSize: "0.625rem" }}>{agent}</span>
                      <span
                        className={cn(
                          "px-1 py-0.5 rounded",
                          theme === "dark" ? "bg-gray-600" : "bg-gray-200"
                        )}
                        style={{ fontSize: "0.625rem" }}
                      >
                        {prCount}
                      </span>
                      {groupIsClosed && (
                        <span className="px-1 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" style={{ fontSize: "0.625rem" }}>
                          Closed
                        </span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="ml-3 mt-0.5 space-y-0.5">
                      {Array.from(taskGroups.entries()).map(([taskPrefix, taskPRs]) => {
                        const taskKey = `${issue.id}-${agent}-${taskPrefix}`;
                        const isTaskExpanded = expandedPRGroups.has(taskKey);
                        const taskClosed = isGroupClosed(taskPRs);

                        // If only 1 PR in task group, show it directly without nested collapsible
                        if (taskPRs.length === 1) {
                          const prMeta = taskPRs[0];
                          return (
                            <div
                              key={taskPrefix}
                              className={cn(
                                "flex items-center justify-between py-0.5 px-1.5 rounded",
                                theme === "dark" ? "bg-gray-800" : "bg-white border border-gray-200"
                              )}
                            >
                              <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                <GitPullRequest className="w-2.5 h-2.5 flex-shrink-0" />
                                <span className="font-mono" style={{ fontSize: "0.625rem" }}>#{prMeta.pr.number}</span>
                                <span className="truncate" style={{ fontSize: "0.625rem" }}>{prMeta.pr.title}</span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUnlinkPR(issue.number, prMeta.pr.number);
                                }}
                                className={cn(
                                  "ml-1 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30",
                                  "text-red-600 dark:text-red-400"
                                )}
                                title="Unlink PR"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          );
                        }

                        // Multiple PRs in task group - show as nested collapsible
                        return (
                          <div key={taskPrefix}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePRGroup(taskKey);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between p-1 rounded transition-colors",
                                theme === "dark"
                                  ? "bg-gray-800 hover:bg-gray-750"
                                  : "bg-white hover:bg-gray-50 border border-gray-200"
                              )}
                            >
                              <div className="flex items-center space-x-1 flex-1 min-w-0">
                                {isTaskExpanded ? (
                                  <ChevronDown className="w-2 h-2" />
                                ) : (
                                  <ChevronRight className="w-2 h-2" />
                                )}
                                <span className="truncate" style={{ fontSize: "0.625rem" }}>{taskPrefix}</span>
                                <span
                                  className={cn(
                                    "px-1 py-0.5 rounded flex-shrink-0",
                                    theme === "dark" ? "bg-gray-700" : "bg-gray-200"
                                  )}
                                  style={{ fontSize: "0.625rem" }}
                                >
                                  {taskPRs.length}
                                </span>
                                {taskClosed && (
                                  <span className="px-1 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0" style={{ fontSize: "0.625rem" }}>
                                    Closed
                                  </span>
                                )}
                              </div>
                            </button>

                            {isTaskExpanded && (
                              <div className="ml-2 mt-0.5 space-y-0.5">
                                {taskPRs.map((prMeta) => (
                                  <div
                                    key={prMeta.pr.number}
                                    className={cn(
                                      "flex items-center justify-between py-0.5 px-1.5 rounded",
                                      theme === "dark" ? "bg-gray-850" : "bg-gray-50 border border-gray-200"
                                    )}
                                  >
                                    <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                      <GitPullRequest className="w-2.5 h-2.5 flex-shrink-0" />
                                      <span className="font-mono" style={{ fontSize: "0.625rem" }}>#{prMeta.pr.number}</span>
                                      <span className="truncate" style={{ fontSize: "0.625rem" }}>{prMeta.pr.title}</span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onUnlinkPR(issue.number, prMeta.pr.number);
                                      }}
                                      className={cn(
                                        "ml-1 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30",
                                        "text-red-600 dark:text-red-400"
                                      )}
                                      title="Unlink PR"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
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
            <button
              onClick={handleOpenPRAssignment}
              className={cn(
                "w-full flex items-center justify-center space-x-1 py-1 px-2 rounded transition-colors",
                theme === "dark"
                  ? "text-blue-400 hover:bg-gray-700"
                  : "text-blue-600 hover:bg-gray-100"
              )}
              style={{ fontSize: "0.625rem" }}
            >
              <Plus className="w-2.5 h-2.5" />
              <span>Add more</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

IssueCard.displayName = "IssueCard";

interface KanbanColumnProps {
  column: KanbanColumnConfig;
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
  onQuickEdit: (issue: Issue) => void;
  onOpenPRAssignment: (issue: Issue) => void;
  onUnlinkPR: (issueNumber: number, prNumber: number) => void;
  expandedPRGroups: Set<string>;
  onTogglePRGroup: (groupKey: string) => void;
  onDrop: (issueData: any, targetColumn: KanbanColumn) => void;
  theme: "light" | "dark";
  repoOwner: string;
  repoName: string;
}

const KanbanColumn = React.memo(({ column, issues, onIssueClick, onQuickEdit, onOpenPRAssignment, onUnlinkPR, expandedPRGroups, onTogglePRGroup, onDrop, theme, repoOwner, repoName }: KanbanColumnProps) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    try {
      const issueData = JSON.parse(e.dataTransfer.getData("text/plain"));
      onDrop(issueData, column.id);
    } catch (error) {
      console.error("Failed to parse dropped issue data:", error);
    }
  };

  const Icon = column.icon;

  return (
    <div
      className={cn(
        "flex flex-col h-full min-w-72 max-w-72",
        column.bgColor,
        "border-r transition-all duration-200",
        theme === "dark" ? "border-gray-700" : "border-gray-200",
        dragOver && "ring-2 ring-blue-400 ring-opacity-50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="p-2.5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-1.5">
          <Icon className={cn("w-3.5 h-3.5", column.color)} />
          <h3 className={cn("text-sm font-semibold", column.color)}>
            {column.title}
          </h3>
          <span
            className={cn(
              "px-1.5 py-0.5 text-xs rounded-full font-medium",
              theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"
            )}
          >
            {issues.length}
          </span>
        </div>
      </div>

      {/* Column content */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {issues.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center py-8 text-center",
              theme === "dark" ? "text-gray-500" : "text-gray-400"
            )}
          >
            <Icon className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No issues</p>
          </div>
        ) : (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onIssueClick={onIssueClick}
              onQuickEdit={onQuickEdit}
              onOpenPRAssignment={onOpenPRAssignment}
              onUnlinkPR={onUnlinkPR}
              expandedPRGroups={expandedPRGroups}
              onTogglePRGroup={onTogglePRGroup}
              theme={theme}
              repoOwner={repoOwner}
              repoName={repoName}
            />
          ))
        )}
      </div>
    </div>
  );
});

KanbanColumn.displayName = "KanbanColumn";

// Quick Edit Modal Component
interface QuickEditModalProps {
  issue: Issue | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (issue: Issue, updates: Partial<Issue>) => void;
  theme: "light" | "dark";
}

const QuickEditModal = React.memo(({ issue, isOpen, onClose, onSave, theme }: QuickEditModalProps) => {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (issue) {
      setTitle(issue.title);
    }
  }, [issue]);

  const handleSave = () => {
    if (!issue) return;

    const updates: Partial<Issue> = {
      title: title.trim(),
      // Note: In a real implementation, you'd handle assignee updates properly
    };

    onSave(issue, updates);
    onClose();
  };

  if (!isOpen || !issue) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={cn(
          "bg-white rounded-lg shadow-xl max-w-md w-full mx-4",
          theme === "dark" ? "bg-gray-800" : "bg-white"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">Quick Edit Issue #{issue.number}</h3>
          <button
            onClick={onClose}
            className={cn(
              "p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700",
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn(
                "w-full px-3 py-2 border rounded-md",
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              )}
              placeholder="Issue title"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              className={cn(
                "px-4 py-2 rounded text-sm",
                theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

QuickEditModal.displayName = "QuickEditModal";

export default function IssueTrackerView() {
  const navigate = useNavigate();
  const {
    issues,
    loading,
    fetchIssues,
    updateIssue,
    setIssueLabels,
    closeIssues,
    reopenIssues,
    linkPRsToIssue,
    unlinkPRFromIssue,
    refreshIssueLinks,
  } = useIssueStore();
  const { selectedRepo, pullRequests, fetchPullRequests } = usePRStore();
  const { theme } = useUIStore();

  // Quick edit modal state
  const [quickEditIssue, setQuickEditIssue] = useState<Issue | null>(null);
  const [showQuickEdit, setShowQuickEdit] = useState(false);

  // Loading state for drag operations
  const [isUpdatingIssue, setIsUpdatingIssue] = useState(false);

  // PR assignment modal state
  const [selectedIssueForPRAssignment, setSelectedIssueForPRAssignment] = useState<Issue | null>(null);
  const [showPRAssignmentModal, setShowPRAssignmentModal] = useState(false);

  // PR group expansion state
  const [expandedPRGroups, setExpandedPRGroups] = useState<Set<string>>(new Set());

  // Fetch issues and PRs when repo changes
  useEffect(() => {
    if (selectedRepo) {
      fetchIssues(selectedRepo.owner, selectedRepo.name);
      // Also fetch PRs so they're available for assignment
      fetchPullRequests(selectedRepo.owner, selectedRepo.name);
    }
  }, [selectedRepo, fetchIssues, fetchPullRequests]);

  // Note: Auto-fetching linked PRs disabled for now due to API limitations
  // PRs are fetched on-demand when user opens the assignment modal
  // TODO: Re-enable when we have a more efficient batch query

  // const [hasLoadedLinks, setHasLoadedLinks] = useState(false);
  // useEffect(() => {
  //   const fetchLinkedPRs = async () => {
  //     if (!selectedRepo || issues.size === 0 || hasLoadedLinks) return;
  //     console.log(`[TRACKER] 🔗 Loading linked PRs for ${issues.size} issues...`);
  //     setHasLoadedLinks(true);
  //     const issuesArray = Array.from(issues.values());
  //     for (const issue of issuesArray) {
  //       await refreshIssueLinks(selectedRepo.owner, selectedRepo.name, issue.number);
  //     }
  //     console.log(`[TRACKER] ✅ Finished loading linked PRs`);
  //   };
  //   fetchLinkedPRs();
  // }, [selectedRepo, issues.size]);

  // useEffect(() => {
  //   setHasLoadedLinks(false);
  // }, [selectedRepo]);

  // Categorize issues into Kanban columns
  const categorizedIssues = useMemo(() => {
    const issuesArray = Array.from(issues.values());
    const prArray = Array.from(pullRequests.values());

    const categories: Record<KanbanColumn, Issue[]> = {
      unassigned: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      closed: [],
    };

    issuesArray.forEach((issue) => {
      // First check if issue is closed
      if (issue.state === "closed") {
        categories.closed.push(issue);
        return;
      }

      // Check labels for explicit status indicators FIRST (highest priority - manual overrides)
      const labelNames = issue.labels.map(l => l.name.toLowerCase());

      const hasInReviewLabel = labelNames.some(name =>
        name.includes("review") || name.includes("reviewing")
      );

      const hasInProgressLabel = labelNames.some(name =>
        name.includes("progress") ||
        name.includes("working") ||
        name.includes("development") ||
        name.includes("implementing") ||
        name.includes("coding")
      );

      const hasReadyLabel = labelNames.some(name =>
        name.includes("ready") ||
        name.includes("todo") ||
        name.includes("backlog") ||
        name.includes("planned")
      );

      const hasDoneLabel = labelNames.some(name =>
        name.includes("done") ||
        name.includes("completed")
      );

      // If explicit status label exists, use it (manual categorization wins)
      if (hasInReviewLabel) {
        categories.in_review.push(issue);
        return;
      } else if (hasInProgressLabel) {
        categories.in_progress.push(issue);
        return;
      } else if (hasReadyLabel) {
        categories.todo.push(issue);
        return;
      } else if (hasDoneLabel) {
        categories.done.push(issue);
        return;
      }

      // Check linkedPRs second (automatic categorization from PR state)
      if (issue.linkedPRs && issue.linkedPRs.length > 0) {
        // Categorize based on the state of linked PRs
        const hasAnyMergedPR = issue.linkedPRs.some(pr => pr.merged);
        const hasAnyOpenPR = issue.linkedPRs.some(pr => pr.state === "open" && !pr.merged);
        const allPRsAreDraft = issue.linkedPRs.every(pr => pr.draft);
        const hasAnyNonDraftPR = issue.linkedPRs.some(pr => !pr.draft && pr.state === "open");

        if (hasAnyMergedPR) {
          categories.done.push(issue);
        } else if (hasAnyNonDraftPR) {
          categories.in_review.push(issue);
        } else if (hasAnyOpenPR && allPRsAreDraft) {
          categories.in_progress.push(issue);
        } else {
          categories.in_progress.push(issue);
        }
        return;
      }

      // Fallback: Check if there's an associated PR using search strategies
      const associatedPR = prArray.find(pr => {
        // Strategy 1: PR title mentions the issue number
        if (pr.title.includes(`#${issue.number}`)) return true;

        // Strategy 2: PR body mentions the issue with closing keywords
        if (pr.body) {
          const closingKeywords = [
            `closes #${issue.number}`,
            `close #${issue.number}`,
            `fixes #${issue.number}`,
            `fix #${issue.number}`,
            `resolves #${issue.number}`,
            `resolve #${issue.number}`,
            `#${issue.number}` // Simple mention
          ];

          const bodyLower = pr.body.toLowerCase();
          if (closingKeywords.some(keyword => bodyLower.includes(keyword.toLowerCase()))) {
            return true;
          }
        }

        // Strategy 3: Branch name contains issue number
        if (pr.head?.ref && pr.head.ref.includes(`${issue.number}`)) return true;

        return false;
      });

      if (associatedPR) {
        if (associatedPR.merged) {
          categories.done.push(issue);
        } else if (associatedPR.state === "open") {
          // Check if PR has any reviews or is in draft
          if (associatedPR.draft) {
            categories.in_progress.push(issue);
          } else {
            categories.in_review.push(issue);
          }
        } else {
          categories.in_progress.push(issue);
        }
        return;
      }

      // Final fallback: Check other labels and assignees
      const hasBugLabel = labelNames.some(name =>
        name.includes("bug") ||
        name.includes("defect") ||
        name.includes("issue")
      );

      const hasEnhancementLabel = labelNames.some(name =>
        name.includes("enhancement") ||
        name.includes("feature") ||
        name.includes("improvement")
      );

      // Categorize based on other indicators
      if (issue.assignees.length > 0) {
        // If assigned but no explicit status label, assume in progress
        categories.in_progress.push(issue);
      } else if (hasBugLabel || hasEnhancementLabel) {
        // Labeled but unassigned issues go to TODO
        categories.todo.push(issue);
      } else {
        // Default: unassigned (needs triage)
        categories.unassigned.push(issue);
      }
    });

    // Sort issues within each category by updated date (most recent first)
    Object.keys(categories).forEach(key => {
      const column = key as KanbanColumn;
      categories[column].sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });

    return categories;
  }, [issues, pullRequests]);

  const handleIssueClick = useCallback(
    (issue: Issue) => {
      if (selectedRepo) {
        navigate(
          `/issues/${selectedRepo.owner}/${selectedRepo.name}/${issue.number}`
        );
      }
    },
    [navigate, selectedRepo]
  );

  const handleQuickEdit = useCallback((issue: Issue) => {
    setQuickEditIssue(issue);
    setShowQuickEdit(true);
  }, []);

  const handleQuickEditClose = useCallback(() => {
    setShowQuickEdit(false);
    setQuickEditIssue(null);
  }, []);

  const handleQuickEditSave = useCallback((issue: Issue, updates: Partial<Issue>) => {
    const updatedIssue = { ...issue, ...updates };
    updateIssue(updatedIssue);

    // TODO: Make GitHub API call to update the issue
    console.log("Would update issue via GitHub API:", updates);
  }, [updateIssue]);

  const handleOpenPRAssignment = useCallback(async (issue: Issue) => {
    console.log(`[TRACKER] 🔗 Opening PR assignment for issue #${issue.number}`);
    console.log(`[TRACKER] 📊 Total PRs in store: ${pullRequests.size}`);
    console.log(`[TRACKER] 📋 Selected repo: ${selectedRepo?.owner}/${selectedRepo?.name}`);

    setSelectedIssueForPRAssignment(issue);
    setShowPRAssignmentModal(true);

    // Only fetch linked PRs if we don't already have them cached
    if (selectedRepo && !issue.linkedPRs) {
      console.log(`[TRACKER] 🔄 Fetching linked PRs for issue #${issue.number} (not cached)`);
      await refreshIssueLinks(selectedRepo.owner, selectedRepo.name, issue.number);
    } else {
      console.log(`[TRACKER] ✅ Using cached linked PRs for issue #${issue.number}`);
    }
  }, [selectedRepo, refreshIssueLinks, pullRequests]);

  const handleClosePRAssignmentModal = useCallback(() => {
    setShowPRAssignmentModal(false);
    setSelectedIssueForPRAssignment(null);
  }, []);

  const handleAssignPRs = useCallback(async (prNumbers: number[]) => {
    if (!selectedIssueForPRAssignment || !selectedRepo) return;

    console.log(`Assigning PRs ${prNumbers.join(', ')} to issue #${selectedIssueForPRAssignment.number}`);

    try {
      await linkPRsToIssue(
        selectedRepo.owner,
        selectedRepo.name,
        selectedIssueForPRAssignment.number,
        prNumbers
      );
      handleClosePRAssignmentModal();
    } catch (error) {
      console.error("Failed to assign PRs:", error);
      // TODO: Show error message to user
    }
  }, [selectedIssueForPRAssignment, selectedRepo, linkPRsToIssue, handleClosePRAssignmentModal]);

  const handleUnlinkPR = useCallback(async (issueNumber: number, prNumber: number) => {
    if (!selectedRepo) return;

    console.log(`Unlinking PR #${prNumber} from issue #${issueNumber}`);

    try {
      // The store will handle the optimistic update
      await unlinkPRFromIssue(
        selectedRepo.owner,
        selectedRepo.name,
        issueNumber,
        prNumber
      );
    } catch (error) {
      console.error("Failed to unlink PR:", error);
      // Revert by refetching
      if (selectedRepo) {
        await refreshIssueLinks(selectedRepo.owner, selectedRepo.name, issueNumber);
      }
    }
  }, [selectedRepo, unlinkPRFromIssue, refreshIssueLinks]);

  const handleTogglePRGroup = useCallback((groupKey: string) => {
    setExpandedPRGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  }, []);

  const handleDrop = useCallback(
    async (issueData: any, targetColumn: KanbanColumn) => {
      const operationId = `${issueData.issueNumber}-${Date.now()}`;
      console.log(`[${operationId}] 🎯 DROP: Moving issue #${issueData.issueNumber} to column ${targetColumn}`);

      // Find the issue
      const issueKey = `${issueData.owner}/${issueData.repo}#${issueData.issueNumber}`;
      const issue = issues.get(issueKey);

      if (!issue || !selectedRepo) {
        console.error(`[${operationId}] ❌ ERROR: Issue not found or no repo selected:`, issueKey);
        return;
      }

      console.log(`[${operationId}] 📋 Current state:`, {
        currentLabels: issue.labels.map(l => l.name),
        currentState: issue.state,
        targetColumn
      });

      try {
        setIsUpdatingIssue(true);

        // Determine what changes need to be made based on target column
        const labelsToAdd: string[] = [];
        const labelsToRemove: string[] = [];
        let shouldCloseIssue = false;
        let shouldReopenIssue = false;

        // Remove existing status labels first (only the ones that actually exist on the issue)
        // These are the labels we manage for status tracking
        const statusLabelPatterns = ["ready", "in-progress", "in-review", "done", "backlog", "working", "development", "reviewing", "completed"];
        const existingStatusLabels = issue.labels
          .filter(label => statusLabelPatterns.some(pattern => label.name.toLowerCase().includes(pattern)))
          .map(label => label.name);

        labelsToRemove.push(...existingStatusLabels);

        // Add appropriate labels and handle special cases for each column
        switch (targetColumn) {
          case "unassigned":
            // No specific labels needed for unassigned
            // Note: In a real implementation, you might want to remove assignees
            break;

          case "todo":
            labelsToAdd.push("ready");
            if (issue.state === "closed") {
              shouldReopenIssue = true;
            }
            break;

          case "in_progress":
            labelsToAdd.push("in-progress");
            if (issue.state === "closed") {
              shouldReopenIssue = true;
            }
            break;

          case "in_review":
            labelsToAdd.push("in-review");
            if (issue.state === "closed") {
              shouldReopenIssue = true;
            }
            break;

          case "done":
            labelsToAdd.push("done");
            if (issue.state === "closed") {
              shouldReopenIssue = true;
            }
            break;

          case "closed":
            if (issue.state === "open") {
              shouldCloseIssue = true;
            }
            break;
        }

        // Calculate the final set of labels we want
        // Start with all non-status labels, then add the new status label
        const finalLabels = [
          ...issue.labels
            .filter(label => !statusLabelPatterns.some(pattern => label.name.toLowerCase().includes(pattern)))
            .map(label => label.name),
          ...labelsToAdd
        ];

        console.log(`[${operationId}] 🔄 Changes to apply:`, {
          labelsToRemove: existingStatusLabels,
          labelsToAdd,
          finalLabels,
          shouldCloseIssue,
          shouldReopenIssue
        });

        // Optimistically update the UI immediately for responsiveness
        const optimisticIssue = {
          ...issue,
          repository: issue.repository || {
            owner: { login: selectedRepo.owner },
            name: selectedRepo.name,
          },
          labels: finalLabels.map(name => {
            // Try to preserve existing label colors
            const existingLabel = issue.labels.find(l => l.name === name);
            if (existingLabel) return existingLabel;

            // For new status labels, use predefined colors
            const labelColors: Record<string, string> = {
              "ready": "0052cc",
              "in-progress": "fbca04",
              "in-review": "d876e3",
              "done": "0e8a16"
            };
            return {
              name,
              color: labelColors[name] || "cccccc"
            };
          }),
          state: shouldCloseIssue ? "closed" : shouldReopenIssue ? "open" : issue.state
        };

        console.log(`[${operationId}] ⚡ OPTIMISTIC UPDATE: Applying to local store`);
        updateIssue(optimisticIssue);

        // Make actual GitHub API calls
        console.log(`[${operationId}] 🌐 Starting API calls to GitHub...`);
        const promises: Promise<any>[] = [];

        // Use setIssueLabels to atomically replace all labels at once
        // This is more reliable than removing then adding individual labels
        // Note: setIssueLabels will update the store when it completes
        if (labelsToRemove.length > 0 || labelsToAdd.length > 0) {
          console.log(`[${operationId}] 🏷️  API: Setting labels to:`, finalLabels);
          promises.push(
            setIssueLabels(
              selectedRepo.owner,
              selectedRepo.name,
              issue.number,
              finalLabels
            ).then(() => {
              console.log(`[${operationId}] ✅ API: Labels updated successfully`);
            })
          );
        }

        // Close or reopen issue if needed
        if (shouldCloseIssue) {
          console.log(`[${operationId}] 🔒 API: Closing issue`);
          promises.push(
            closeIssues(selectedRepo.owner, selectedRepo.name, [issue.number])
              .then(() => {
                console.log(`[${operationId}] ✅ API: Issue closed successfully`);
              })
          );
        } else if (shouldReopenIssue) {
          console.log(`[${operationId}] 🔓 API: Reopening issue`);
          promises.push(
            reopenIssues(selectedRepo.owner, selectedRepo.name, [issue.number])
              .then(() => {
                console.log(`[${operationId}] ✅ API: Issue reopened successfully`);
              })
          );
        }

        // Execute all API calls
        await Promise.all(promises);

        console.log(`[${operationId}] ✨ SUCCESS: All API calls completed for issue #${issue.number} → ${targetColumn}`);

      } catch (error) {
        console.error(`[${operationId}] ❌ ERROR: Failed to move issue:`, error);
        // Refetch to revert the optimistic update and get the correct state from GitHub
        if (selectedRepo) {
          console.log(`[${operationId}] 🔄 REFETCH: Reverting optimistic update by refetching from GitHub`);
          await fetchIssues(selectedRepo.owner, selectedRepo.name, true);
        }
      } finally {
        console.log(`[${operationId}] 🏁 COMPLETE: Operation finished`);
        setIsUpdatingIssue(false);
      }
    },
    [issues, updateIssue, selectedRepo, setIssueLabels, closeIssues, reopenIssues, fetchIssues]
  );

  if (!selectedRepo) {
    return <WelcomeView />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={cn(
          "px-3 py-2 border-b",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-gray-50 border-gray-200"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-base font-semibold flex items-center">
              <GitBranch className="w-4 h-4 mr-1.5" />
              Issue Tracker
              <span
                className={cn(
                  "ml-2 text-xs",
                  theme === "dark" ? "text-gray-500" : "text-gray-600"
                )}
              >
                ({Array.from(issues.values()).length})
              </span>
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>Drag and drop to update status</span>
            {isUpdatingIssue && (
              <div className="flex items-center space-x-1">
                <div className="w-2.5 h-2.5 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-600">Updating...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div
              className={cn(
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}
            >
              Loading issues...
            </div>
          </div>
        ) : (
          <div className="h-full overflow-x-auto">
            <div className="flex h-full min-w-max">
              {KANBAN_COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  issues={categorizedIssues[column.id]}
                  onIssueClick={handleIssueClick}
                  onQuickEdit={handleQuickEdit}
                  onOpenPRAssignment={handleOpenPRAssignment}
                  onUnlinkPR={handleUnlinkPR}
                  expandedPRGroups={expandedPRGroups}
                  onTogglePRGroup={handleTogglePRGroup}
                  onDrop={handleDrop}
                  theme={theme}
                  repoOwner={selectedRepo.owner}
                  repoName={selectedRepo.name}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Edit Modal */}
      <QuickEditModal
        issue={quickEditIssue}
        isOpen={showQuickEdit}
        onClose={handleQuickEditClose}
        onSave={handleQuickEditSave}
        theme={theme}
      />

      {/* PR Assignment Modal */}
      {showPRAssignmentModal && selectedRepo && (() => {
        const allPRs = Array.from(pullRequests.values());
        const repoPRs = allPRs.filter(pr => {
          // Only show PRs from the current repo
          const prRepo = pr.base?.repo?.owner?.login;
          const prRepoName = pr.base?.repo?.name;
          const matches = prRepo === selectedRepo.owner && prRepoName === selectedRepo.name;
          if (!matches) {
            console.log(`[TRACKER] ⏭️  Skipping PR #${pr.number}: ${prRepo}/${prRepoName} != ${selectedRepo.owner}/${selectedRepo.name}`);
          }
          return matches;
        });

        console.log(`[TRACKER] ✅ Passing ${repoPRs.length} PRs to modal (filtered from ${allPRs.length} total)`);

        return (
          <PRAssignmentModal
            isOpen={showPRAssignmentModal}
            onClose={handleClosePRAssignmentModal}
            onAssign={handleAssignPRs}
            availablePRs={repoPRs}
            issueNumber={selectedIssueForPRAssignment?.number || 0}
            issueTitle={selectedIssueForPRAssignment?.title || ""}
            theme={theme}
          />
        );
      })()}
    </div>
  );
}