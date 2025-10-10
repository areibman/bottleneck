import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import {
  AlertCircle,
  CheckCircle,
  MessageSquare,
  ChevronUp,
  Plus,
  Search,
  MoreVertical,
  RefreshCcw,
} from "lucide-react";
import { useIssueStore } from "../stores/issueStore";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import { formatDistanceToNow } from "date-fns";
import { cn } from "../utils/cn";
import { getLabelColors } from "../utils/labelColors";
import WelcomeView from "./WelcomeView";
import { Issue } from "../services/github";
import IssueEditModal from "../components/IssueEditModal";

// Kanban column definitions with status mapping logic
const KANBAN_COLUMNS = [
  {
    id: "unassigned",
    title: "Unassigned",
    description: "No assignee or related branches/PRs",
    color: "bg-gray-500",
    checkIssue: (issue: Issue, prs: any[]) => {
      // Issue belongs here if it has no assignees and no linked PRs/branches
      const hasAssignees = issue.assignees && issue.assignees.length > 0;
      const hasLinkedPRs = prs.some(pr => 
        pr.body?.includes(`#${issue.number}`) || 
        pr.title?.includes(`#${issue.number}`)
      );
      return !hasAssignees && !hasLinkedPRs && issue.state === "open";
    },
  },
  {
    id: "todo",
    title: "TODO",
    description: "Ready to be worked on",
    color: "bg-blue-500",
    checkIssue: (issue: Issue, prs: any[]) => {
      // Has assignee but no active PR yet
      const hasAssignees = issue.assignees && issue.assignees.length > 0;
      const hasLinkedPRs = prs.some(pr => 
        (pr.body?.includes(`#${issue.number}`) || 
         pr.title?.includes(`#${issue.number}`)) &&
        pr.state === "open"
      );
      return hasAssignees && !hasLinkedPRs && issue.state === "open";
    },
  },
  {
    id: "in_progress",
    title: "In Progress",
    description: "Being actively worked on",
    color: "bg-yellow-500",
    checkIssue: (issue: Issue, prs: any[]) => {
      // Has an open PR linked to it or has in-progress label
      const hasOpenPR = prs.some(pr => 
        (pr.body?.includes(`#${issue.number}`) || 
         pr.title?.includes(`#${issue.number}`)) &&
        pr.state === "open" &&
        !pr.draft
      );
      const hasInProgressLabel = issue.labels?.some(label => 
        label.name.toLowerCase().includes("in progress") ||
        label.name.toLowerCase().includes("in-progress") ||
        label.name.toLowerCase().includes("wip")
      );
      return (hasOpenPR || hasInProgressLabel) && issue.state === "open";
    },
  },
  {
    id: "in_review",
    title: "In Review",
    description: "PR is under review",
    color: "bg-purple-500",
    checkIssue: (issue: Issue, prs: any[]) => {
      // Has a PR with review requests or reviews
      const hasReviewPR = prs.some(pr => 
        (pr.body?.includes(`#${issue.number}`) || 
         pr.title?.includes(`#${issue.number}`)) &&
        pr.state === "open" &&
        (pr.requested_reviewers?.length > 0 || pr.approvalStatus)
      );
      const hasReviewLabel = issue.labels?.some(label => 
        label.name.toLowerCase().includes("review") ||
        label.name.toLowerCase().includes("needs review")
      );
      return (hasReviewPR || hasReviewLabel) && issue.state === "open";
    },
  },
  {
    id: "done",
    title: "Done",
    description: "PR merged",
    color: "bg-green-500",
    checkIssue: (issue: Issue, prs: any[]) => {
      // Has a merged PR
      const hasMergedPR = prs.some(pr => 
        (pr.body?.includes(`#${issue.number}`) || 
         pr.title?.includes(`#${issue.number}`)) &&
        pr.merged
      );
      const hasDoneLabel = issue.labels?.some(label => 
        label.name.toLowerCase() === "done" ||
        label.name.toLowerCase() === "completed"
      );
      return hasMergedPR || hasDoneLabel;
    },
  },
  {
    id: "closed",
    title: "Closed",
    description: "Issue closed",
    color: "bg-gray-600",
    checkIssue: (issue: Issue) => {
      return issue.state === "closed";
    },
  },
];

// Draggable Issue Card Component
interface IssueCardProps {
  issue: Issue;
  isDragging?: boolean;
  theme: "light" | "dark";
  onClick: (issue: Issue) => void;
}

const IssueCard = React.memo(({ issue, isDragging, theme, onClick }: IssueCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: `issue-${issue.number}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (e.detail === 2) { // Double click
          onClick(issue);
        }
      }}
      className={cn(
        "p-3 rounded-lg cursor-move transition-all",
        "hover:shadow-lg hover:scale-[1.02]",
        theme === "dark"
          ? "bg-gray-800 hover:bg-gray-750 border border-gray-700"
          : "bg-white hover:bg-gray-50 border border-gray-200 shadow-sm",
        isDragging && "opacity-50"
      )}
    >
      {/* Issue Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          {issue.state === "open" ? (
            <AlertCircle className="w-4 h-4 text-green-400" />
          ) : (
            <CheckCircle className="w-4 h-4 text-purple-400" />
          )}
          <span className={cn(
            "text-xs font-medium",
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          )}>
            #{issue.number}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick(issue);
          }}
          className={cn(
            "p-1 rounded hover:bg-opacity-10",
            theme === "dark" ? "hover:bg-gray-600" : "hover:bg-gray-200"
          )}
        >
          <MoreVertical className="w-3 h-3" />
        </button>
      </div>

      {/* Issue Title */}
      <h4 className={cn(
        "text-sm font-medium mb-2 line-clamp-2",
        theme === "dark" ? "text-white" : "text-gray-900"
      )}>
        {issue.title}
      </h4>

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {issue.labels.slice(0, 3).map((label) => {
            const labelColors = getLabelColors(label.color, theme);
            return (
              <span
                key={label.name}
                className="px-2 py-0.5 text-xs rounded-full font-medium"
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
            <span className={cn(
              "px-2 py-0.5 text-xs rounded-full",
              theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
            )}>
              +{issue.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Issue Footer */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center space-x-2">
          {/* Assignees */}
          {issue.assignees.length > 0 && (
            <div className="flex -space-x-1">
              {issue.assignees.slice(0, 2).map((assignee) => (
                <img
                  key={assignee.login}
                  src={assignee.avatar_url}
                  alt={assignee.login}
                  className="w-5 h-5 rounded-full border-2 border-white"
                  title={assignee.login}
                />
              ))}
              {issue.assignees.length > 2 && (
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-xs",
                  theme === "dark" ? "bg-gray-700" : "bg-gray-200"
                )}>
                  +{issue.assignees.length - 2}
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          {issue.comments > 0 && (
            <div className="flex items-center text-xs">
              <MessageSquare className="w-3 h-3 mr-1" />
              {issue.comments}
            </div>
          )}
        </div>

        {/* Time */}
        <span className={cn(
          "text-xs",
          theme === "dark" ? "text-gray-500" : "text-gray-400"
        )}>
          {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
});

// Kanban Column Component
interface KanbanColumnProps {
  column: typeof KANBAN_COLUMNS[0];
  issues: Issue[];
  theme: "light" | "dark";
  onIssueClick: (issue: Issue) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const KanbanColumn = React.memo(({ 
  column, 
  issues, 
  theme, 
  onIssueClick,
  isCollapsed = false,
  onToggleCollapse
}: KanbanColumnProps) => {
  const { isOver, setNodeRef } = useSortable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full rounded-lg transition-all",
        theme === "dark" ? "bg-gray-850" : "bg-gray-50",
        isOver && "ring-2 ring-blue-500 ring-opacity-50",
        isCollapsed ? "w-16" : "min-w-[320px] max-w-[400px] flex-1"
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          "p-4 border-b flex items-center justify-between cursor-pointer",
          theme === "dark" ? "border-gray-700" : "border-gray-200",
          "hover:bg-opacity-50"
        )}
        onClick={onToggleCollapse}
      >
        {!isCollapsed ? (
          <>
            <div className="flex items-center space-x-2">
              <div className={cn("w-3 h-3 rounded-full", column.color)} />
              <h3 className={cn(
                "font-semibold",
                theme === "dark" ? "text-white" : "text-gray-900"
              )}>
                {column.title}
              </h3>
              <span className={cn(
                "text-sm px-2 py-0.5 rounded-full",
                theme === "dark" 
                  ? "bg-gray-700 text-gray-300" 
                  : "bg-gray-200 text-gray-600"
              )}>
                {issues.length}
              </span>
            </div>
            <ChevronUp className="w-4 h-4 rotate-180" />
          </>
        ) : (
          <div className="flex flex-col items-center w-full">
            <div className={cn("w-3 h-3 rounded-full mb-2", column.color)} />
            <span className="text-xs font-semibold transform -rotate-90 origin-center">
              {column.title}
            </span>
            <span className={cn(
              "text-xs mt-2",
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            )}>
              {issues.length}
            </span>
          </div>
        )}
      </div>

      {/* Column Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <SortableContext
            items={issues.map(i => `issue-${i.number}`)}
            strategy={verticalListSortingStrategy}
          >
            {issues.map((issue) => (
              <IssueCard
                key={issue.number}
                issue={issue}
                theme={theme}
                onClick={onIssueClick}
              />
            ))}
          </SortableContext>

          {issues.length === 0 && (
            <div className={cn(
              "text-center py-8 text-sm",
              theme === "dark" ? "text-gray-500" : "text-gray-400"
            )}>
              <p>{column.description}</p>
              <p className="text-xs mt-2">Drag issues here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Main Kanban View Component
export default function KanbanView() {
  const {
    issues,
    loading,
    fetchIssues,
    addLabelsToIssues,
    removeLabelsFromIssues,
    fetchRepoLabels,
  } = useIssueStore();
  const { selectedRepo, pullRequests } = usePRStore();
  const { theme } = useUIStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (selectedRepo) {
      fetchIssues(selectedRepo.owner, selectedRepo.name);
      fetchRepoLabels(selectedRepo.owner, selectedRepo.name);
    }
  }, [selectedRepo, fetchIssues, fetchRepoLabels]);

  // Organize issues into columns
  const columnIssues = useMemo(() => {
    const issuesArray = Array.from(issues.values());
    const prsArray = Array.from(pullRequests.values());
    
    // Filter by search query
    const filteredIssues = searchQuery
      ? issuesArray.filter(issue =>
          issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          issue.body?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          `#${issue.number}`.includes(searchQuery)
        )
      : issuesArray;

    const organized: Record<string, Issue[]> = {};
    
    // Initialize empty arrays for each column
    KANBAN_COLUMNS.forEach(column => {
      organized[column.id] = [];
    });

    // Categorize issues into columns
    filteredIssues.forEach(issue => {
      // Find the first matching column
      for (const column of KANBAN_COLUMNS) {
        if (column.checkIssue(issue, prsArray)) {
          organized[column.id].push(issue);
          break;
        }
      }
    });

    return organized;
  }, [issues, pullRequests, searchQuery]);

  const handleIssueClick = useCallback(
    (issue: Issue) => {
      setSelectedIssue(issue);
      setIsEditModalOpen(true);
    },
    []
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !selectedRepo) return;

    const issueId = active.id as string;
    const issueNumber = parseInt(issueId.replace("issue-", ""));
    const targetColumnId = over.id as string;

    // Find the issue
    const issue = Array.from(issues.values()).find(i => i.number === issueNumber);
    if (!issue) return;

    // Determine what labels to add/remove based on the target column
    const labelsToAdd: string[] = [];
    const labelsToRemove: string[] = [];

    // Remove status-related labels
    const statusLabels = ["in progress", "in-progress", "wip", "review", "needs review", "done", "completed"];
    labelsToRemove.push(...statusLabels);

    // Add appropriate label for the new column
    switch (targetColumnId) {
      case "todo":
        labelsToAdd.push("todo");
        break;
      case "in_progress":
        labelsToAdd.push("in-progress");
        break;
      case "in_review":
        labelsToAdd.push("review");
        break;
      case "done":
        labelsToAdd.push("done");
        break;
    }

    // Update labels via GitHub API
    if (labelsToAdd.length > 0) {
      await addLabelsToIssues(
        selectedRepo.owner,
        selectedRepo.name,
        [issueNumber],
        labelsToAdd
      );
    }

    if (labelsToRemove.length > 0) {
      // Filter to only remove labels that actually exist on the issue
      const actualLabelsToRemove = labelsToRemove.filter(label =>
        issue.labels.some(l => l.name.toLowerCase() === label.toLowerCase())
      );
      
      if (actualLabelsToRemove.length > 0) {
        await removeLabelsFromIssues(
          selectedRepo.owner,
          selectedRepo.name,
          [issueNumber],
          actualLabelsToRemove
        );
      }
    }

    // Refresh issues to get updated state
    fetchIssues(selectedRepo.owner, selectedRepo.name, true);
  };

  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

  const activeIssue = activeId
    ? Array.from(issues.values()).find(i => `issue-${i.number}` === activeId)
    : null;

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
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Issue Tracker
              <span className={cn(
                "ml-2 text-sm",
                theme === "dark" ? "text-gray-500" : "text-gray-600"
              )}>
                ({Array.from(issues.values()).length} issues)
              </span>
            </h1>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issues..."
                className={cn(
                  "pl-10 pr-4 py-2 rounded-lg text-sm w-64",
                  theme === "dark"
                    ? "bg-gray-700 text-white placeholder-gray-400 border-gray-600"
                    : "bg-white text-gray-900 placeholder-gray-500 border-gray-300",
                  "border focus:outline-none focus:ring-2 focus:ring-blue-500"
                )}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchIssues(selectedRepo.owner, selectedRepo.name, true)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                theme === "dark"
                  ? "hover:bg-gray-700 text-gray-300"
                  : "hover:bg-gray-200 text-gray-700"
              )}
            >
              <RefreshCcw className="w-4 h-4" />
            </button>

            <button
              className={cn(
                "px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors",
                theme === "dark"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              )}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">New Issue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full p-4 space-x-4">
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                issues={columnIssues[column.id] || []}
                theme={theme}
                onIssueClick={handleIssueClick}
                isCollapsed={collapsedColumns.has(column.id)}
                onToggleCollapse={() => toggleColumnCollapse(column.id)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeIssue && (
              <IssueCard
                issue={activeIssue}
                isDragging
                theme={theme}
                onClick={() => {}}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span>Loading issues...</span>
            </div>
          </div>
        </div>
      )}

      {/* Issue Edit Modal */}
      {selectedIssue && (
        <IssueEditModal
          issue={selectedIssue}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedIssue(null);
          }}
          onUpdate={() => {
            // Refresh issues after update
            if (selectedRepo) {
              fetchIssues(selectedRepo.owner, selectedRepo.name, true);
            }
          }}
        />
      )}
    </div>
  );
}