import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, MessageSquare, User, GitBranch, GitPullRequest, Plus, Edit3, X } from "lucide-react";
import { useIssueStore } from "../stores/issueStore";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../utils/cn";
import { getLabelColors } from "../utils/labelColors";
import WelcomeView from "./WelcomeView";
import { Issue } from "../services/github";

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
  theme: "light" | "dark";
  isDragging?: boolean;
}

const IssueCard = React.memo(({ issue, onIssueClick, onQuickEdit, theme, isDragging }: IssueCardProps) => {
  const [dragOver, setDragOver] = useState(false);
  const [isBeingDragged, setIsBeingDragged] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({
      issueNumber: issue.number,
      owner: issue.repository?.owner.login,
      repo: issue.repository?.name,
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

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onIssueClick(issue)}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all duration-200 group relative",
        theme === "dark"
          ? "bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600"
          : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300",
        isBeingDragged && "opacity-50 rotate-1 scale-105 shadow-lg z-50",
        dragOver && "ring-2 ring-blue-400",
        "hover:shadow-md"
      )}
    >
      {/* Quick edit button - only visible on hover */}
      <button
        onClick={handleQuickEdit}
        className={cn(
          "absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
          theme === "dark"
            ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
            : "bg-gray-100 hover:bg-gray-200 text-gray-600"
        )}
        title="Quick edit"
      >
        <Edit3 className="w-3 h-3" />
      </button>

      {/* Issue header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {issue.state === "open" ? (
              <AlertCircle className="w-4 h-4 text-green-400" />
            ) : (
              <CheckCircle className="w-4 h-4 text-purple-400" />
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
            <MessageSquare className="w-3 h-3 mr-1" />
            {issue.comments}
          </div>
        )}
      </div>

      {/* Issue title */}
      <h3
        className={cn(
          "text-sm font-medium mb-2 leading-tight",
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
        <div className="flex flex-wrap gap-1 mb-2">
          {issue.labels.slice(0, 3).map((label) => {
            const labelColors = getLabelColors(label.color, theme);
            return (
              <span
                key={label.name}
                className="px-1.5 py-0.5 text-xs rounded font-medium"
                style={{
                  backgroundColor: labelColors.backgroundColor,
                  color: labelColors.color,
                }}
              >
                {label.name}
              </span>
            );
          })}
          {issue.labels.length > 3 && (
            <span
              className={cn(
                "px-1.5 py-0.5 text-xs rounded",
                theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"
              )}
            >
              +{issue.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Issue footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <img
            src={issue.user.avatar_url}
            alt={issue.user.login}
            className="w-4 h-4 rounded-full"
          />
          <span
            className={cn(
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            )}
          >
            {issue.user.login}
          </span>
        </div>
        <span
          className={cn(
            theme === "dark" ? "text-gray-500" : "text-gray-500"
          )}
        >
          {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}
        </span>
      </div>

      {/* Assignees */}
      {issue.assignees.length > 0 && (
        <div className="flex items-center mt-2 -space-x-1">
          {issue.assignees.slice(0, 3).map((assignee) => (
            <img
              key={assignee.login}
              src={assignee.avatar_url}
              alt={assignee.login}
              className={cn(
                "w-5 h-5 rounded-full border-2",
                theme === "dark" ? "border-gray-800" : "border-white"
              )}
              title={`Assigned to: ${assignee.login}`}
            />
          ))}
          {issue.assignees.length > 3 && (
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-medium",
                theme === "dark"
                  ? "bg-gray-700 border-gray-800 text-gray-300"
                  : "bg-gray-200 border-white text-gray-600"
              )}
            >
              +{issue.assignees.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

IssueCard.displayName = "IssueCard";

interface KanbanColumnProps {
  column: KanbanColumnConfig;
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
  onQuickEdit: (issue: Issue) => void;
  onDrop: (issueData: any, targetColumn: KanbanColumn) => void;
  theme: "light" | "dark";
}

const KanbanColumn = React.memo(({ column, issues, onIssueClick, onQuickEdit, onDrop, theme }: KanbanColumnProps) => {
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
        "flex flex-col h-full min-w-80 max-w-80",
        column.bgColor,
        "rounded-lg border transition-all duration-200",
        theme === "dark" ? "border-gray-700" : "border-gray-200",
        dragOver && "ring-2 ring-blue-400 ring-opacity-50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className={cn("w-4 h-4", column.color)} />
            <h3 className={cn("font-semibold", column.color)}>
              {column.title}
            </h3>
            <span
              className={cn(
                "px-2 py-0.5 text-xs rounded-full font-medium",
                theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"
              )}
            >
              {issues.length}
            </span>
          </div>
        </div>
        <p
          className={cn(
            "text-xs mt-1",
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          )}
        >
          {column.description}
        </p>
      </div>

      {/* Column content */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
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
              theme={theme}
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
  const [assignees, setAssignees] = useState<string[]>([]);

  useEffect(() => {
    if (issue) {
      setTitle(issue.title);
      setAssignees(issue.assignees.map(a => a.login));
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
    addLabelsToIssues,
    removeLabelsFromIssues,
    closeIssues,
    reopenIssues,
  } = useIssueStore();
  const { selectedRepo, pullRequests } = usePRStore();
  const { theme } = useUIStore();

  // Quick edit modal state
  const [quickEditIssue, setQuickEditIssue] = useState<Issue | null>(null);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  
  // Loading state for drag operations
  const [isUpdatingIssue, setIsUpdatingIssue] = useState(false);

  useEffect(() => {
    if (selectedRepo) {
      fetchIssues(selectedRepo.owner, selectedRepo.name);
    }
  }, [selectedRepo, fetchIssues]);

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

      // Check if there's an associated PR using multiple strategies
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

      // Check labels for explicit status indicators (higher priority than assignees)
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

      // Categorize based on labels first
      if (hasInReviewLabel) {
        categories.in_review.push(issue);
      } else if (hasInProgressLabel) {
        categories.in_progress.push(issue);
      } else if (hasReadyLabel) {
        categories.todo.push(issue);
      } else if (issue.assignees.length > 0) {
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

  const handleDrop = useCallback(
    async (issueData: any, targetColumn: KanbanColumn) => {
      console.log("Moving issue", issueData, "to column", targetColumn);
      
      // Find the issue
      const issueKey = `${issueData.owner}/${issueData.repo}#${issueData.issueNumber}`;
      const issue = issues.get(issueKey);
      
      if (!issue || !selectedRepo) {
        console.error("Issue not found or no repo selected:", issueKey);
        return;
      }

      try {
        setIsUpdatingIssue(true);
        
        // Determine what changes need to be made based on target column
        const labelsToAdd: string[] = [];
        const labelsToRemove: string[] = [];
        let shouldCloseIssue = false;
        let shouldReopenIssue = false;

        // Remove existing status labels first
        const statusLabels = ["unassigned", "todo", "ready", "backlog", "in-progress", "working", "development", "in-review", "reviewing", "done", "completed"];
        const existingStatusLabels = issue.labels
          .filter(label => statusLabels.some(status => label.name.toLowerCase().includes(status)))
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

        // Update the issue in the store immediately for responsive UI
        const updatedIssue = { ...issue };
        
        // Remove old status labels
        updatedIssue.labels = issue.labels.filter(label => 
          !statusLabels.some(status => label.name.toLowerCase().includes(status))
        );

        // Add new status labels
        labelsToAdd.forEach(labelName => {
          if (!updatedIssue.labels.some(l => l.name === labelName)) {
            const labelColors: Record<string, string> = {
              "ready": "0052cc",
              "in-progress": "fbca04", 
              "in-review": "d876e3",
              "done": "0e8a16"
            };
            
            updatedIssue.labels.push({ 
              name: labelName, 
              color: labelColors[labelName] || "cccccc" 
            });
          }
        });

        if (shouldCloseIssue) {
          updatedIssue.state = "closed";
        } else if (shouldReopenIssue) {
          updatedIssue.state = "open";
        }

        updateIssue(updatedIssue);

        // Make actual GitHub API calls
        const promises: Promise<any>[] = [];

        // Remove old status labels
        if (labelsToRemove.length > 0) {
          promises.push(
            removeLabelsFromIssues(
              selectedRepo.owner,
              selectedRepo.name,
              [issue.number],
              labelsToRemove
            )
          );
        }

        // Add new status labels
        if (labelsToAdd.length > 0) {
          promises.push(
            addLabelsToIssues(
              selectedRepo.owner,
              selectedRepo.name,
              [issue.number],
              labelsToAdd
            )
          );
        }

        // Close or reopen issue if needed
        if (shouldCloseIssue) {
          promises.push(
            closeIssues(selectedRepo.owner, selectedRepo.name, [issue.number])
          );
        } else if (shouldReopenIssue) {
          promises.push(
            reopenIssues(selectedRepo.owner, selectedRepo.name, [issue.number])
          );
        }

        // Execute all API calls
        await Promise.all(promises);
        
        console.log(`Successfully moved issue #${issue.number} to ${targetColumn}`);
        
      } catch (error) {
        console.error("Failed to move issue:", error);
        // Revert the change if API call fails
        // In a real implementation, you'd want to show an error message to the user
        // For now, just refetch the issues to get the correct state
        if (selectedRepo) {
          fetchIssues(selectedRepo.owner, selectedRepo.name, true);
        }
      } finally {
        setIsUpdatingIssue(false);
      }
    },
    [issues, updateIssue, selectedRepo, addLabelsToIssues, removeLabelsFromIssues, closeIssues, reopenIssues, fetchIssues]
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
            : "bg-gray-50 border-gray-200"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold flex items-center">
              <GitBranch className="w-5 h-5 mr-2" />
              Issue Tracker
              <span
                className={cn(
                  "ml-2 text-sm",
                  theme === "dark" ? "text-gray-500" : "text-gray-600"
                )}
              >
                ({Array.from(issues.values()).length} issues)
              </span>
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Drag and drop issues between columns to update their status</span>
            {isUpdatingIssue && (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
            <div className="flex space-x-4 p-4 h-full min-w-max">
              {KANBAN_COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  issues={categorizedIssues[column.id]}
                  onIssueClick={handleIssueClick}
                  onQuickEdit={handleQuickEdit}
                  onDrop={handleDrop}
                  theme={theme}
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
    </div>
  );
}