import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, GitPullRequest, User, Plus } from "lucide-react";
import { useIssueStore } from "../stores/issueStore";
import { usePRStore } from "../stores/prStore";
import { useUIStore } from "../stores/uiStore";
import WelcomeView from "./WelcomeView";
import { Issue } from "../services/github";
import { PRAssignmentModal } from "../components/PRAssignmentModal";
import { IssueCreatorModal } from "../components/IssueCreatorModal";
import { IssueCard } from "./IssueTrackerView/components/IssueCard";
import { QuickEditModal } from "./IssueTrackerView/components/QuickEditModal";
import { cn } from "../utils/cn";
import { buildIssueToPRMap } from "../utils/issueLinks";

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

interface KanbanColumnProps {
  column: KanbanColumnConfig;
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
  onQuickEdit: (issue: Issue) => void;
  onOpenPRAssignment: (issue: Issue) => void;
  onDrop: (issueData: any, targetColumn: KanbanColumn) => void;
  theme: "light" | "dark";
  repoOwner: string;
  repoName: string;
}

const KanbanColumnComponent = React.memo(function KanbanColumnComponent({
  column,
  issues,
  onIssueClick,
  onQuickEdit,
  onOpenPRAssignment,
  onDrop,
  theme,
  repoOwner,
  repoName,
}: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false);
  const Icon = column.icon;

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    try {
      const issueData = JSON.parse(event.dataTransfer.getData("text/plain"));
      onDrop(issueData, column.id);
    } catch (error) {
      console.error("Failed to parse dropped issue data:", error);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full min-w-72 max-w-72",
        column.bgColor,
        "border-r transition-all duration-200",
        theme === "dark" ? "border-gray-700" : "border-gray-200",
        dragOver && "ring-2 ring-blue-400 ring-opacity-50",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-2.5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-1.5">
          <Icon className={cn("w-3.5 h-3.5", column.color)} />
          <h3 className={cn("text-sm font-semibold", column.color)}>
            {column.title}
          </h3>
          <span
            className={cn(
              "px-1.5 py-0.5 text-xs rounded-full font-medium",
              theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600",
            )}
          >
            {issues.length}
          </span>
        </div>
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {issues.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center py-8 text-center",
              theme === "dark" ? "text-gray-500" : "text-gray-400",
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

KanbanColumnComponent.displayName = "KanbanColumn";

export default function IssueTrackerView() {
  const navigate = useNavigate();
  const {
    issues,
    loading,
    fetchIssues,
    createIssue,
    updateIssue,
    setIssueLabels,
    closeIssues,
    reopenIssues,
    linkPRsToIssue,
    unlinkPRFromIssue,
    repoLabels,
    fetchRepoLabels,
  } = useIssueStore();
  const { selectedRepo, pullRequests, fetchPullRequests } = usePRStore();
  const { theme } = useUIStore();

  const [quickEditIssue, setQuickEditIssue] = useState<Issue | null>(null);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [isUpdatingIssue, setIsUpdatingIssue] = useState(false);
  const [selectedIssueForPRAssignment, setSelectedIssueForPRAssignment] = useState<Issue | null>(null);
  const [showPRAssignmentModal, setShowPRAssignmentModal] = useState(false);
  const [showIssueCreatorModal, setShowIssueCreatorModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (selectedRepo) {
      fetchIssues(selectedRepo.owner, selectedRepo.name);
      fetchPullRequests(selectedRepo.owner, selectedRepo.name);
      fetchRepoLabels(selectedRepo.owner, selectedRepo.name);
    }
  }, [selectedRepo, fetchIssues, fetchPullRequests, fetchRepoLabels]);

  // Enrich issues with linkedPRs from PR store
  const enrichedIssues = useMemo(() => {
    if (!selectedRepo) return issues;

    const { owner, name: repo } = selectedRepo;
    const issueToPRMap = buildIssueToPRMap(pullRequests, owner, repo);

    const enriched = new Map(issues);
    for (const [key, issue] of enriched.entries()) {
      const linkedPRs = issueToPRMap.get(issue.number) || [];
      enriched.set(key, { ...issue, linkedPRs });
    }

    return enriched;
  }, [issues, pullRequests, selectedRepo]);

  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) {
      return enrichedIssues;
    }

    const query = searchQuery.toLowerCase();
    const filtered = new Map<string, Issue>();

    for (const [key, issue] of enrichedIssues.entries()) {
      const matchesTitle = issue.title.toLowerCase().includes(query);
      const matchesBody = issue.body?.toLowerCase().includes(query);
      const matchesNumber = issue.number.toString().includes(query);

      if (matchesTitle || matchesBody || matchesNumber) {
        filtered.set(key, issue);
      }
    }

    return filtered;
  }, [enrichedIssues, searchQuery]);

  const categorizedIssues = useMemo(() => {
    const issuesArray = Array.from(filteredIssues.values());
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
      if (issue.state === "closed") {
        categories.closed.push(issue);
        return;
      }

      const labelNames = issue.labels.map((label) => label.name.toLowerCase());

      const hasInReviewLabel = labelNames.some((name) =>
        name.includes("review") || name.includes("reviewing"),
      );
      const hasInProgressLabel = labelNames.some((name) =>
        name.includes("progress") ||
        name.includes("working") ||
        name.includes("development") ||
        name.includes("implementing") ||
        name.includes("coding"),
      );
      const hasReadyLabel = labelNames.some((name) =>
        name.includes("ready") ||
        name.includes("todo") ||
        name.includes("backlog") ||
        name.includes("planned"),
      );
      const hasDoneLabel = labelNames.some((name) =>
        name.includes("done") || name.includes("completed"),
      );

      if (hasInReviewLabel) {
        categories.in_review.push(issue);
        return;
      }
      if (hasInProgressLabel) {
        categories.in_progress.push(issue);
        return;
      }
      if (hasReadyLabel) {
        categories.todo.push(issue);
        return;
      }
      if (hasDoneLabel) {
        categories.done.push(issue);
        return;
      }

      if (issue.linkedPRs && issue.linkedPRs.length > 0) {
        const hasAnyMergedPR = issue.linkedPRs.some((pr) => pr.merged);
        const hasAnyOpenPR = issue.linkedPRs.some(
          (pr) => pr.state === "open" && !pr.merged,
        );
        const allPRsAreDraft = issue.linkedPRs.every((pr) => pr.draft);
        const hasAnyNonDraftPR = issue.linkedPRs.some(
          (pr) => !pr.draft && pr.state === "open",
        );

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

      const associatedPR = prArray.find((pr) => {
        if (pr.title.includes(`#${issue.number}`)) return true;
        if (pr.body) {
          const closingKeywords = [
            `closes #${issue.number}`,
            `close #${issue.number}`,
            `fixes #${issue.number}`,
            `fix #${issue.number}`,
            `resolves #${issue.number}`,
            `resolve #${issue.number}`,
            `#${issue.number}`,
          ];

          return closingKeywords.some((keyword) =>
            pr.body?.toLowerCase().includes(keyword.toLowerCase()),
          );
        }
        return pr.head?.ref?.includes(`issue-${issue.number}`) ||
          pr.head?.ref?.includes(`issue${issue.number}`);
      });

      if (associatedPR) {
        if (associatedPR.merged_at) {
          categories.done.push(issue);
        } else if (associatedPR.state === "open") {
          categories.in_review.push(issue);
        } else {
          categories.in_progress.push(issue);
        }
        return;
      }

      if (issue.assignees.length === 0) {
        categories.unassigned.push(issue);
      } else {
        categories.todo.push(issue);
      }
    });

    return categories;
  }, [filteredIssues, pullRequests]);

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

  const handleQuickEdit = useCallback((issue: Issue) => {
    setQuickEditIssue(issue);
    setShowQuickEdit(true);
  }, []);

  const handleQuickEditClose = useCallback(() => {
    setShowQuickEdit(false);
    setQuickEditIssue(null);
  }, []);

  const handleQuickEditSave = useCallback(
    (issue: Issue, updates: Partial<Issue>) => {
      const updatedIssue = { ...issue, ...updates };
      updateIssue(updatedIssue);
      console.log("Would update issue via GitHub API:", updates);
    },
    [updateIssue],
  );

  const handleOpenPRAssignment = useCallback(
    async (issue: Issue) => {
      setSelectedIssueForPRAssignment(issue);
      setShowPRAssignmentModal(true);
    },
    [],
  );

  const handleClosePRAssignmentModal = useCallback(() => {
    setShowPRAssignmentModal(false);
    setSelectedIssueForPRAssignment(null);
  }, []);

  const handleAssignPRs = useCallback(
    async (newPRNumbers: number[], previouslyLinkedPRs: number[]) => {
      if (!selectedIssueForPRAssignment || !selectedRepo) return;

      try {
        const owner = selectedRepo.owner;
        const repo = selectedRepo.name;
        const issueNumber = selectedIssueForPRAssignment.number;

        // Determine which PRs to link and unlink
        const previousSet = new Set(previouslyLinkedPRs);
        const newSet = new Set(newPRNumbers);

        const toLink = newPRNumbers.filter(prNum => !previousSet.has(prNum));
        const toUnlink = previouslyLinkedPRs.filter(prNum => !newSet.has(prNum));

        console.log(`[Issue Tracker] 🔗 Updating PR links for issue #${issueNumber}:`, {
          toLink,
          toUnlink,
          previous: previouslyLinkedPRs,
          new: newPRNumbers,
        });

        // Unlink removed PRs
        if (toUnlink.length > 0) {
          for (const prNum of toUnlink) {
            await unlinkPRFromIssue(owner, repo, issueNumber, prNum);
          }
        }

        // Link new PRs
        if (toLink.length > 0) {
          await linkPRsToIssue(owner, repo, issueNumber, toLink);
        }

        handleClosePRAssignmentModal();
      } catch (error) {
        console.error("Failed to update PR links:", error);
      }
    },
    [
      selectedIssueForPRAssignment,
      selectedRepo,
      linkPRsToIssue,
      unlinkPRFromIssue,
      handleClosePRAssignmentModal,
    ],
  );

  const handleCreateIssue = useCallback(
    async (title: string, body: string, labels: string[], prNumbers: number[]) => {
      if (!selectedRepo) return;

      try {
        const owner = selectedRepo.owner;
        const repo = selectedRepo.name;

        console.log(`[Issue Tracker] ➕ Creating issue in ${owner}/${repo}:`, {
          title,
          labels,
          prNumbers,
        });

        // Create the issue
        const newIssue = await createIssue(owner, repo, title, body, labels);

        console.log(`[Issue Tracker] ✅ Created issue #${newIssue.number}`);

        // Link PRs to the newly created issue
        if (prNumbers.length > 0) {
          await linkPRsToIssue(owner, repo, newIssue.number, prNumbers);
          console.log(`[Issue Tracker] ✅ Linked ${prNumbers.length} PRs to issue #${newIssue.number}`);
        }

        // Close the modal
        setShowIssueCreatorModal(false);

        // Navigate to the new issue
        navigate(`/issues/${owner}/${repo}/${newIssue.number}`);
      } catch (error) {
        console.error("Failed to create issue:", error);
        throw error; // Re-throw to let the modal handle the error
      }
    },
    [selectedRepo, createIssue, linkPRsToIssue, navigate],
  );


  const handleDrop = useCallback(
    async (issueData: any, targetColumn: KanbanColumn) => {
      const operationId = `${issueData.issueNumber}-${Date.now()}`;
      const issueKey = `${issueData.owner}/${issueData.repo}#${issueData.issueNumber}`;
      const issue = issues.get(issueKey);

      if (!issue || !selectedRepo) {
        console.error(
          `[${operationId}] ❌ ERROR: Issue not found or no repo selected:`,
          issueKey,
        );
        return;
      }

      try {
        setIsUpdatingIssue(true);

        const statusLabelPatterns = [
          "ready",
          "in-progress",
          "in-review",
          "done",
          "backlog",
          "working",
          "development",
          "reviewing",
          "completed",
        ];
        const existingStatusLabels = issue.labels
          .filter((label) =>
            statusLabelPatterns.some((pattern) =>
              label.name.toLowerCase().includes(pattern),
            ),
          )
          .map((label) => label.name);

        const labelsToAdd: string[] = [];
        let shouldCloseIssue = false;
        let shouldReopenIssue = false;

        switch (targetColumn) {
          case "todo":
            labelsToAdd.push("ready");
            if (issue.state === "closed") shouldReopenIssue = true;
            break;
          case "in_progress":
            labelsToAdd.push("in-progress");
            if (issue.state === "closed") shouldReopenIssue = true;
            break;
          case "in_review":
            labelsToAdd.push("in-review");
            if (issue.state === "closed") shouldReopenIssue = true;
            break;
          case "done":
            labelsToAdd.push("done");
            if (issue.state === "closed") shouldReopenIssue = true;
            break;
          case "closed":
            if (issue.state === "open") shouldCloseIssue = true;
            break;
          case "unassigned":
          default:
            break;
        }

        const finalLabels = [
          ...issue.labels
            .filter(
              (label) =>
                !statusLabelPatterns.some((pattern) =>
                  label.name.toLowerCase().includes(pattern),
                ),
            )
            .map((label) => label.name),
          ...labelsToAdd,
        ];

        if (existingStatusLabels.length > 0 || labelsToAdd.length > 0) {
          await setIssueLabels(
            selectedRepo.owner,
            selectedRepo.name,
            issue.number,
            finalLabels,
          );
        }

        if (shouldCloseIssue) {
          await closeIssues(selectedRepo.owner, selectedRepo.name, [
            issue.number,
          ]);
        } else if (shouldReopenIssue) {
          await reopenIssues(selectedRepo.owner, selectedRepo.name, [
            issue.number,
          ]);
        }
      } catch (error) {
        console.error(`[${operationId}] ❌ ERROR: Failed to update issue`, error);
        await fetchIssues(selectedRepo.owner, selectedRepo.name);
      } finally {
        setIsUpdatingIssue(false);
      }
    },
    [
      issues,
      selectedRepo,
      setIssueLabels,
      closeIssues,
      reopenIssues,
      fetchIssues,
    ],
  );

  if (!selectedRepo) {
    return <WelcomeView />;
  }

  const totalIssues = filteredIssues.size;

  return (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "px-3 py-2 border-b",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-gray-50 border-gray-200",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-base font-semibold flex items-center">
              <GitPullRequest className="w-4 h-4 mr-1.5" />
              Issue Tracker
              <span
                className={cn(
                  "ml-2 text-xs",
                  theme === "dark" ? "text-gray-500" : "text-gray-600",
                )}
              >
                ({totalIssues})
              </span>
            </h1>
            <input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "px-3 py-1 text-sm rounded border transition-colors w-64",
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
                "focus:outline-none",
              )}
            />
            <button
              onClick={() => setShowIssueCreatorModal(true)}
              className={cn(
                "flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors",
                "bg-blue-600 text-white hover:bg-blue-700",
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Issue</span>
            </button>
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

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <span
              className={cn(
                theme === "dark" ? "text-gray-400" : "text-gray-600",
              )}
            >
              Loading issues...
            </span>
          </div>
        ) : (
          <div className="h-full overflow-x-auto">
            <div className="flex h-full min-w-max">
              {KANBAN_COLUMNS.map((column) => (
                <KanbanColumnComponent
                  key={column.id}
                  column={column}
                  issues={categorizedIssues[column.id]}
                  onIssueClick={handleIssueClick}
                  onQuickEdit={handleQuickEdit}
                  onOpenPRAssignment={handleOpenPRAssignment}
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

      <QuickEditModal
        issue={quickEditIssue}
        isOpen={showQuickEdit}
        onClose={handleQuickEditClose}
        onSave={handleQuickEditSave}
        theme={theme}
      />

      {showPRAssignmentModal && selectedRepo && (() => {
        const allPRs = Array.from(pullRequests.values());
        const repoPRs = allPRs.filter((pr) => {
          const prRepoOwner = pr.base?.repo?.owner?.login;
          const prRepoName = pr.base?.repo?.name;
          return prRepoOwner === selectedRepo.owner && prRepoName === selectedRepo.name;
        });

        // Get currently linked PR numbers for this issue
        const currentlyLinkedPRs = selectedIssueForPRAssignment?.linkedPRs?.map(pr => pr.number) || [];

        return (
          <PRAssignmentModal
            isOpen={showPRAssignmentModal}
            onClose={handleClosePRAssignmentModal}
            onAssign={handleAssignPRs}
            availablePRs={repoPRs}
            issueNumber={selectedIssueForPRAssignment?.number || 0}
            issueTitle={selectedIssueForPRAssignment?.title || ""}
            theme={theme}
            initialLinkedPRs={currentlyLinkedPRs}
          />
        );
      })()}

      {showIssueCreatorModal && selectedRepo && (() => {
        const allPRs = Array.from(pullRequests.values());
        const repoPRs = allPRs.filter((pr) => {
          const prRepoOwner = pr.base?.repo?.owner?.login;
          const prRepoName = pr.base?.repo?.name;
          return prRepoOwner === selectedRepo.owner && prRepoName === selectedRepo.name;
        });

        return (
          <IssueCreatorModal
            isOpen={showIssueCreatorModal}
            onClose={() => setShowIssueCreatorModal(false)}
            onCreate={handleCreateIssue}
            availablePRs={repoPRs}
            availableLabels={repoLabels}
            theme={theme}
            repoOwner={selectedRepo.owner}
            repoName={selectedRepo.name}
          />
        );
      })()}
    </div>
  );
}
