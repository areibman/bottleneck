import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Kanban, RefreshCw } from "lucide-react";
import { useIssueStore } from "../stores/issueStore";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import { cn } from "../utils/cn";
import WelcomeView from "./WelcomeView";
import { Issue } from "../services/github";
import { KanbanColumn } from "../components/kanban/KanbanColumn";
import { IssueCard } from "../components/kanban/IssueCard";
import { IssueEditModal } from "../components/kanban/IssueEditModal";

type KanbanColumnType = "unassigned" | "todo" | "in-progress" | "in-review" | "done" | "closed";

interface KanbanColumnData {
  id: KanbanColumnType;
  title: string;
  issues: Issue[];
}

export default function IssueTrackerView() {
  const navigate = useNavigate();
  const {
    issues,
    issuesMetadata,
    loading,
    fetchIssues,
    fetchIssueMetadata,
    assignIssue,
    unassignIssue,
    closeIssues,
    reopenIssues,
    repoLabels,
    fetchRepoLabels,
    addLabelsToIssues,
    removeLabelsFromIssues,
  } = useIssueStore();
  const { selectedRepo } = usePRStore();
  const { theme } = useUIStore();
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);

  // Fetch issues and labels when repo changes
  useEffect(() => {
    if (selectedRepo) {
      fetchIssues(selectedRepo.owner, selectedRepo.name);
      fetchRepoLabels(selectedRepo.owner, selectedRepo.name);
    }
  }, [selectedRepo, fetchIssues, fetchRepoLabels]);

  // Fetch metadata for all issues (related PRs)
  useEffect(() => {
    if (selectedRepo && issues.size > 0 && !loadingMetadata) {
      setLoadingMetadata(true);
      const issuesList = Array.from(issues.values());
      
      // Fetch metadata for all issues in batches
      Promise.all(
        issuesList.map((issue) =>
          fetchIssueMetadata(selectedRepo.owner, selectedRepo.name, issue.number)
        )
      ).finally(() => {
        setLoadingMetadata(false);
      });
    }
  }, [selectedRepo, issues.size]);

  // Categorize issues into Kanban columns
  const kanbanColumns = useMemo((): KanbanColumnData[] => {
    const issuesList = Array.from(issues.values());

    const unassigned: Issue[] = [];
    const todo: Issue[] = [];
    const inProgress: Issue[] = [];
    const inReview: Issue[] = [];
    const done: Issue[] = [];
    const closed: Issue[] = [];

    issuesList.forEach((issue) => {
      const issueKey = `${selectedRepo?.owner}/${selectedRepo?.name}#${issue.number}`;
      const metadata = issuesMetadata.get(issueKey);
      const relatedPRs = metadata?.relatedPRs || [];

      // Closed issues
      if (issue.state === "closed") {
        closed.push(issue);
        return;
      }

      // Check if there are merged PRs
      const hasMergedPR = relatedPRs.some((pr: any) => pr.merged);
      if (hasMergedPR) {
        done.push(issue);
        return;
      }

      // Check if there are open PRs (In Review)
      const hasOpenPR = relatedPRs.some((pr: any) => pr.state === "open" && !pr.merged);
      if (hasOpenPR) {
        inReview.push(issue);
        return;
      }

      // Check if assigned or has related work (In Progress)
      const hasAssignees = issue.assignees.length > 0;
      const hasPRs = relatedPRs.length > 0;
      if (hasAssignees || hasPRs) {
        inProgress.push(issue);
        return;
      }

      // Check if completely unassigned (no assignees AND no PRs/branches)
      if (!hasAssignees && relatedPRs.length === 0) {
        unassigned.push(issue);
        return;
      }

      // Default: TODO
      todo.push(issue);
    });

    return [
      { id: "unassigned", title: "Unassigned", issues: unassigned },
      { id: "todo", title: "TODO", issues: todo },
      { id: "in-progress", title: "In Progress", issues: inProgress },
      { id: "in-review", title: "In Review", issues: inReview },
      { id: "done", title: "Done", issues: done },
      { id: "closed", title: "Closed", issues: closed },
    ];
  }, [issues, issuesMetadata, selectedRepo]);

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

  const handleDrop = useCallback(
    async (columnId: KanbanColumnType, issue: Issue) => {
      if (!selectedRepo) return;

      // Handle drag-and-drop logic based on the target column
      try {
        switch (columnId) {
          case "unassigned":
            // Remove all assignees
            if (issue.assignees.length > 0) {
              await unassignIssue(
                selectedRepo.owner,
                selectedRepo.name,
                issue.number,
                issue.assignees.map((a) => a.login)
              );
            }
            break;

          case "todo":
            // No specific action - just ensure it's open
            if (issue.state === "closed") {
              await reopenIssues(selectedRepo.owner, selectedRepo.name, [issue.number]);
            }
            break;

          case "in-progress":
            // Could prompt user to assign someone or just ensure it's open
            if (issue.state === "closed") {
              await reopenIssues(selectedRepo.owner, selectedRepo.name, [issue.number]);
            }
            // If no assignees, could prompt to assign
            break;

          case "in-review":
            // Would need to check if there's a PR - for now just ensure it's open
            if (issue.state === "closed") {
              await reopenIssues(selectedRepo.owner, selectedRepo.name, [issue.number]);
            }
            break;

          case "done":
            // Keep open but marked as done (this is typically when PR is merged)
            break;

          case "closed":
            // Close the issue
            if (issue.state === "open") {
              await closeIssues(selectedRepo.owner, selectedRepo.name, [issue.number]);
            }
            break;
        }

        // Refresh issues after state change
        await fetchIssues(selectedRepo.owner, selectedRepo.name, true);
      } catch (error) {
        console.error("Failed to update issue:", error);
      }
    },
    [selectedRepo, assignIssue, unassignIssue, closeIssues, reopenIssues, fetchIssues]
  );

  const handleRefresh = useCallback(() => {
    if (selectedRepo) {
      fetchIssues(selectedRepo.owner, selectedRepo.name, true);
    }
  }, [selectedRepo, fetchIssues]);

  const handleEditClick = useCallback((e: React.MouseEvent, issue: Issue) => {
    e.stopPropagation();
    setEditingIssue(issue);
  }, []);

  const handleUpdateAssignees = useCallback(
    async (assignees: string[]) => {
      if (!selectedRepo || !editingIssue) return;

      const currentAssignees = editingIssue.assignees.map((a) => a.login);
      const toAdd = assignees.filter((a) => !currentAssignees.includes(a));
      const toRemove = currentAssignees.filter((a) => !assignees.includes(a));

      if (toAdd.length > 0) {
        await assignIssue(selectedRepo.owner, selectedRepo.name, editingIssue.number, toAdd);
      }
      if (toRemove.length > 0) {
        await unassignIssue(selectedRepo.owner, selectedRepo.name, editingIssue.number, toRemove);
      }

      await fetchIssues(selectedRepo.owner, selectedRepo.name, true);
    },
    [selectedRepo, editingIssue, assignIssue, unassignIssue, fetchIssues]
  );

  const handleUpdateLabels = useCallback(
    async (labels: string[]) => {
      if (!selectedRepo || !editingIssue) return;

      const currentLabels = editingIssue.labels.map((l) => l.name);
      const toAdd = labels.filter((l) => !currentLabels.includes(l));
      const toRemove = currentLabels.filter((l) => !labels.includes(l));

      if (toAdd.length > 0) {
        await addLabelsToIssues(selectedRepo.owner, selectedRepo.name, [editingIssue.number], toAdd);
      }
      if (toRemove.length > 0) {
        await removeLabelsFromIssues(selectedRepo.owner, selectedRepo.name, [editingIssue.number], toRemove);
      }

      await fetchIssues(selectedRepo.owner, selectedRepo.name, true);
    },
    [selectedRepo, editingIssue, addLabelsToIssues, removeLabelsFromIssues, fetchIssues]
  );

  const handleCloseIssue = useCallback(async () => {
    if (!selectedRepo || !editingIssue) return;
    await closeIssues(selectedRepo.owner, selectedRepo.name, [editingIssue.number]);
    await fetchIssues(selectedRepo.owner, selectedRepo.name, true);
  }, [selectedRepo, editingIssue, closeIssues, fetchIssues]);

  const handleReopenIssue = useCallback(async () => {
    if (!selectedRepo || !editingIssue) return;
    await reopenIssues(selectedRepo.owner, selectedRepo.name, [editingIssue.number]);
    await fetchIssues(selectedRepo.owner, selectedRepo.name, true);
  }, [selectedRepo, editingIssue, reopenIssues, fetchIssues]);

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
          <div className="flex items-center space-x-3">
            <Kanban className="w-5 h-5" />
            <h1 className="text-xl font-semibold">Issue Tracker</h1>
            <span
              className={cn(
                "text-sm",
                theme === "dark" ? "text-gray-500" : "text-gray-600"
              )}
            >
              ({Array.from(issues.values()).length} issues)
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className={cn(
              "flex items-center space-x-2 px-3 py-1.5 rounded text-sm font-medium transition-colors",
              theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        {loading && issues.size === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div
              className={cn(
                "text-center",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}
            >
              Loading issues...
            </div>
          </div>
        ) : (
          <div className="flex space-x-4 h-full pb-4">
            {kanbanColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                columnId={column.id}
                title={column.title}
                count={column.issues.length}
                issues={column.issues}
                theme={theme}
                onDrop={(issue) => handleDrop(column.id, issue)}
                onIssueClick={handleIssueClick}
                renderIssueCard={(issue) => {
                  const issueKey = `${selectedRepo.owner}/${selectedRepo.name}#${issue.number}`;
                  const metadata = issuesMetadata.get(issueKey);
                  return (
                    <IssueCard
                      issue={issue}
                      theme={theme}
                      relatedPRs={metadata?.relatedPRs}
                      onEditClick={handleEditClick}
                    />
                  );
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingIssue && selectedRepo && (
        <IssueEditModal
          issue={editingIssue}
          theme={theme}
          isOpen={!!editingIssue}
          onClose={() => setEditingIssue(null)}
          onUpdateAssignees={handleUpdateAssignees}
          onUpdateLabels={handleUpdateLabels}
          onCloseIssue={handleCloseIssue}
          onReopen={handleReopenIssue}
          availableLabels={repoLabels}
          relatedPRs={
            issuesMetadata.get(`${selectedRepo.owner}/${selectedRepo.name}#${editingIssue.number}`)
              ?.relatedPRs || []
          }
        />
      )}
    </div>
  );
}
