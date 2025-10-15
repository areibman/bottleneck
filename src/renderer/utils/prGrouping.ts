/**
 * Utility functions for grouping and managing PR metadata
 * Extracted from PRListView for reusability across the app
 */

import { PullRequest } from "../services/github";
import { detectAgentName } from "./agentIcons";
import { getTitlePrefix } from "./prUtils";
import type { PRWithMetadata } from "../types/prList";

// Re-export for convenience
type PRMetadata = PRWithMetadata;

/**
 * Extract agent from PR (e.g., "cursor" from branch name or title)
 */
function getAgentFromPR(pr: PullRequest): string {
    const branchName = pr.head?.ref || "";
    const labelNames = (pr.labels ?? [])
        .map((label: any) => label?.name)
        .filter(Boolean) as string[];

    const detected = detectAgentName(
        branchName,
        pr.title,
        pr.body,
        pr.user?.login,
        pr.head?.ref,
        ...labelNames,
    );

    if (detected) {
        return detected;
    }

    const hasAILabel = labelNames.some((labelName) =>
        labelName.toLowerCase().includes("ai"),
    );
    if (hasAILabel) {
        return "ai";
    }

    return "unknown";
}

/**
 * Get PR metadata including agent, title prefix, and other categorization info
 */
export function getPRMetadata(pr: PullRequest): PRMetadata {
    return {
        pr,
        agent: getAgentFromPR(pr),
        titlePrefix: getTitlePrefix(pr.title, pr.head?.ref),
        author: pr.user?.login || "unknown",
        labelNames: pr.labels?.map((label: any) => label.name) || [],
    };
}

/**
 * Group PRs by their title prefix
 * Returns a Map where key is the titlePrefix and value is an array of PRMetadata
 */
export function groupPRsByPrefix(
    prsWithMetadata: PRMetadata[]
): Map<string, PRMetadata[]> {
    const grouped = new Map<string, PRMetadata[]>();

    for (const prMeta of prsWithMetadata) {
        const existing = grouped.get(prMeta.titlePrefix) || [];
        existing.push(prMeta);
        grouped.set(prMeta.titlePrefix, existing);
    }

    return grouped;
}

/**
 * Group PRs by agent
 * Returns a Map where key is the agent name and value is an array of PRMetadata
 */
function groupPRsByAgent(
    prsWithMetadata: PRMetadata[]
): Map<string, PRMetadata[]> {
    const grouped = new Map<string, PRMetadata[]>();

    for (const prMeta of prsWithMetadata) {
        const existing = grouped.get(prMeta.agent) || [];
        existing.push(prMeta);
        grouped.set(prMeta.agent, existing);
    }

    return grouped;
}

/**
 * Check if any PR in a group is closed/merged
 */
function isGroupClosed(prs: PRMetadata[]): boolean {
    return prs.some(prMeta => prMeta.pr.state === "closed" || prMeta.pr.merged);
}

