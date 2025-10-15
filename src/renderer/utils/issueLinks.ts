/**
 * Utility functions for extracting and managing issue-PR relationships
 * from cached PR data (avoiding unnecessary API calls)
 */

import type { PullRequest, IssueLinkedPullRequest } from "../services/github";

/**
 * Extract issue numbers referenced by closing keywords in PR body
 * Supports: Fixes #123, Closes #123, Resolves #123
 * Also handles cross-repo: Fixes owner/repo#123
 */
function extractLinkedIssues(prBody: string | null): number[] {
    if (!prBody) return [];

    const issueNumbers: number[] = [];

    // Match closing keywords followed by issue numbers
    // Handles: Fixes #123, Closes #123, Resolves #123
    // Also: Fixes owner/repo#123 (but we only care about the number)
    const closingKeywordPattern = /\b(Fixes|Closes|Resolves)\s+(?:[\w-]+\/[\w-]+)?#(\d+)\b/gi;

    let match;
    while ((match = closingKeywordPattern.exec(prBody)) !== null) {
        const issueNumber = parseInt(match[2], 10);
        if (!isNaN(issueNumber) && !issueNumbers.includes(issueNumber)) {
            issueNumbers.push(issueNumber);
        }
    }

    return issueNumbers;
}

/**
 * Build a map of issue numbers to their linked PRs from cached PR data
 * This avoids making API calls to getIssueDevelopment for every issue
 */
function buildIssueToPRMap(
    prs: Map<string, PullRequest>,
    owner: string,
    repo: string
): Map<number, IssueLinkedPullRequest[]> {
    const issueMap = new Map<number, IssueLinkedPullRequest[]>();

    // Filter PRs for this repo
    const repoPrefix = `${owner}/${repo}#`;

    for (const [prId, pr] of prs.entries()) {
        // Only process PRs from the target repo
        if (!prId.startsWith(repoPrefix)) continue;

        // Extract linked issues from PR body
        const linkedIssues = extractLinkedIssues(pr.body);

        // Add this PR to each linked issue's list
        for (const issueNumber of linkedIssues) {
            const linkedPR: IssueLinkedPullRequest = {
                id: pr.id,
                number: pr.number,
                state: pr.state,
                merged: pr.merged,
                draft: pr.draft,
                title: pr.title,
                head: pr.head ? { ref: pr.head.ref } : undefined,
                url: undefined, // Not needed for UI
                repository: {
                    owner,
                    name: repo,
                },
                author: pr.user ? {
                    login: pr.user.login,
                    avatarUrl: pr.user.avatar_url,
                } : undefined,
            };

            const existing = issueMap.get(issueNumber) || [];
            existing.push(linkedPR);
            issueMap.set(issueNumber, existing);
        }
    }

    return issueMap;
}

/**
 * Get linked PRs for a specific issue from cached PR data
 */
export function getLinkedPRsFromCache(
    prs: Map<string, PullRequest>,
    owner: string,
    repo: string,
    issueNumber: number
): IssueLinkedPullRequest[] {
    const issueMap = buildIssueToPRMap(prs, owner, repo);
    return issueMap.get(issueNumber) || [];
}

