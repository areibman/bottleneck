import { Issue, PullRequest } from '../services/github';
import { KanbanStatus, KanbanIssue } from '../components/kanban/KanbanBoard';

/**
 * Determines the Kanban status of an issue based on GitHub data
 */
export function determineKanbanStatus(
  issue: Issue,
  associatedPRs: PullRequest[] = [],
  associatedBranches: string[] = []
): KanbanStatus {
  // If issue is closed, determine if it's done or just closed
  if (issue.state === 'closed') {
    // Check if any associated PRs were merged
    const hasMergedPR = associatedPRs.some(pr => pr.merged);
    return hasMergedPR ? 'done' : 'closed';
  }

  // Issue is open - determine status based on assignees and associated work
  const hasAssignees = issue.assignees.length > 0;
  const hasAssociatedPRs = associatedPRs.length > 0;
  const hasAssociatedBranches = associatedBranches.length > 0;
  const hasAnyAssociatedWork = hasAssociatedPRs || hasAssociatedBranches;

  // Unassigned: No assignees AND no associated work
  if (!hasAssignees && !hasAnyAssociatedWork) {
    return 'unassigned';
  }

  // In Progress: Has assignees OR has associated work (branches/PRs)
  if (hasAssignees || hasAnyAssociatedWork) {
    // Check if there are any open PRs that might be in review
    const hasOpenPRs = associatedPRs.some(pr => pr.state === 'open' && !pr.draft);
    
    if (hasOpenPRs) {
      // Check if PRs have requested reviewers or are in review state
      const hasRequestedReviewers = associatedPRs.some(pr => 
        pr.requested_reviewers && pr.requested_reviewers.length > 0
      );
      
      // If there are open PRs with reviewers, consider it in review
      if (hasRequestedReviewers) {
        return 'in-review';
      }
      
      // Otherwise, it's in progress
      return 'in-progress';
    }
    
    // Has work but no open PRs - still in progress
    return 'in-progress';
  }

  // Default to TODO for open issues with no clear status
  return 'todo';
}

/**
 * Converts a regular Issue to a KanbanIssue with determined status
 */
export function convertToKanbanIssue(
  issue: Issue,
  associatedPRs: PullRequest[] = [],
  associatedBranches: string[] = []
): KanbanIssue {
  const kanbanStatus = determineKanbanStatus(issue, associatedPRs, associatedBranches);
  
  return {
    ...issue,
    kanbanStatus,
    hasAssociatedPRs: associatedPRs.length > 0,
    hasAssociatedBranches: associatedBranches.length > 0,
  };
}

/**
 * Groups issues by their Kanban status
 */
export function groupIssuesByStatus(issues: KanbanIssue[]): Record<KanbanStatus, KanbanIssue[]> {
  const grouped: Record<KanbanStatus, KanbanIssue[]> = {
    unassigned: [],
    todo: [],
    'in-progress': [],
    'in-review': [],
    done: [],
    closed: [],
  };

  issues.forEach((issue) => {
    grouped[issue.kanbanStatus].push(issue);
  });

  return grouped;
}

/**
 * Gets the count of issues in each status
 */
export function getStatusCounts(issues: KanbanIssue[]): Record<KanbanStatus, number> {
  const counts: Record<KanbanStatus, number> = {
    unassigned: 0,
    todo: 0,
    'in-progress': 0,
    'in-review': 0,
    done: 0,
    closed: 0,
  };

  issues.forEach((issue) => {
    counts[issue.kanbanStatus]++;
  });

  return counts;
}

/**
 * Determines if an issue can be moved to a specific status
 */
export function canMoveToStatus(
  currentStatus: KanbanStatus,
  targetStatus: KanbanStatus
): boolean {
  // Define valid transitions
  const validTransitions: Record<KanbanStatus, KanbanStatus[]> = {
    unassigned: ['todo', 'in-progress', 'closed'],
    todo: ['in-progress', 'unassigned', 'closed'],
    'in-progress': ['in-review', 'todo', 'done', 'closed'],
    'in-review': ['in-progress', 'done', 'closed'],
    done: ['closed'], // Can only close a done issue
    closed: ['todo', 'in-progress'], // Can reopen to different statuses
  };

  return validTransitions[currentStatus].includes(targetStatus);
}

/**
 * Gets the next logical status for an issue
 */
export function getNextStatus(currentStatus: KanbanStatus): KanbanStatus | null {
  const nextStatusMap: Record<KanbanStatus, KanbanStatus | null> = {
    unassigned: 'todo',
    todo: 'in-progress',
    'in-progress': 'in-review',
    'in-review': 'done',
    done: null, // Done is final
    closed: 'todo', // Reopen to todo
  };

  return nextStatusMap[currentStatus];
}