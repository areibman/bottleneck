import { PullRequest } from "../services/github";
import {
    GitPullRequest,
    GitPullRequestDraft,
    GitMerge,
    X,
    LucideIcon,
} from "lucide-react";

export type PRStatusType = "open" | "draft" | "merged" | "closed";

/**
 * Get the display status of a pull request.
 * 
 * Important: A PR can have draft=true even when closed (if it was closed while in draft state).
 * We only consider it a "draft" for display purposes if it's both draft AND open.
 * 
 * @param pr - The pull request to get the status for
 * @returns The PR status type for display/filtering purposes
 */
export function getPRStatus(pr: PullRequest): PRStatusType {
    // Order matters here - check in this specific sequence
    if (pr.merged) return "merged";
    if (pr.state === "closed") return "closed";
    if (pr.draft && pr.state === "open") return "draft"; // Only draft if also open
    if (pr.state === "open") return "open";
    return "closed"; // Default fallback
}

/**
 * Get the display properties for a PR based on its state
 * @param pr - The pull request to analyze
 * @returns Object with boolean flags for display logic
 */
export function getPRDisplayState(pr: PullRequest) {
    const status = getPRStatus(pr);
    return {
        isOpen: status === "open",
        isDraft: status === "draft",
        isMerged: status === "merged",
        isClosed: status === "closed",
        status
    };
}

/**
 * Get the appropriate icon component for a PR's status
 * @param pr - The pull request
 * @returns The Lucide icon component to use
 */
export function getPRIcon(pr: PullRequest): LucideIcon {
    const { isMerged, isDraft, isOpen } = getPRDisplayState(pr);

    if (isMerged) return GitMerge;
    if (isDraft) return GitPullRequestDraft;
    if (isOpen) return GitPullRequest;
    return X;
}

/**
 * Get the appropriate color class for a PR's status
 * @param pr - The pull request
 * @returns The color class to apply
 */
export function getPRColorClass(pr: PullRequest): string {
    const { isMerged, isDraft, isOpen } = getPRDisplayState(pr);

    if (isMerged) return "text-purple-400";
    if (isDraft) return "text-gray-400";
    if (isOpen) return "text-green-400";
    return "text-red-400";
}

/**
 * Get icon props (component and className) for a PR
 * @param pr - The pull request
 * @param size - Size class for the icon (default: "w-5 h-5")
 * @returns Object with Icon component and className
 */
export function getPRIconProps(pr: PullRequest, size: string = "w-5 h-5") {
    return {
        Icon: getPRIcon(pr),
        className: `${size} ${getPRColorClass(pr)}`,
        colorClass: getPRColorClass(pr),
    };
}
