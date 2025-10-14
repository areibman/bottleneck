import { GitBranch, GitMerge, GitPullRequest } from "lucide-react";
import { IssueLinkedBranch, IssueLinkedPullRequest } from "../../../services/github";
import { cn } from "../../../utils/cn";

interface DevelopmentSectionProps {
  branches?: IssueLinkedBranch[];
  pullRequests?: IssueLinkedPullRequest[];
  owner?: string;
  repo?: string;
  theme: "light" | "dark";
}

export function DevelopmentSection({
  branches,
  pullRequests,
  owner,
  repo,
  theme,
}: DevelopmentSectionProps) {
  const hasLinkedBranches = Boolean(branches && branches.length > 0);
  const hasLinkedPRs = Boolean(pullRequests && pullRequests.length > 0);

  if (!hasLinkedBranches && !hasLinkedPRs) {
    return (
      <p
        className={cn(
          "text-sm",
          theme === "dark" ? "text-gray-500" : "text-gray-400",
        )}
      >
        No linked branches or pull requests
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {branches?.map((branch) => {
        const repoOwner = branch.repository.owner || owner || "unknown";
        const repoName = branch.repository.name || repo || "unknown";
        const repoSlug = `${repoOwner}/${repoName}`;
        const branchUrlBase = branch.repository.url
          ? branch.repository.url.replace(/\/$/, "")
          : `https://github.com/${repoOwner}/${repoName}`;
        const branchUrl = `${branchUrlBase}/tree/${encodeURIComponent(branch.refName)}`;
        const linkedPRNumber = branch.associatedPullRequests[0]?.number;

        return (
          <a
            key={branch.id}
            href={branchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-start space-x-2 rounded px-2 py-1.5 transition-colors",
              theme === "dark"
                ? "hover:bg-gray-750 text-gray-200"
                : "hover:bg-gray-100 text-gray-700",
            )}
          >
            <GitBranch
              className={cn(
                "w-4 h-4 mt-0.5 flex-shrink-0",
                theme === "dark" ? "text-gray-400" : "text-gray-500",
              )}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium break-all">
                {branch.refName}
              </span>
              <div
                className={cn(
                  "text-xs flex items-center gap-1 flex-wrap break-all",
                  theme === "dark" ? "text-gray-500" : "text-gray-500",
                )}
              >
                <span className="break-all">{repoSlug}</span>
                {linkedPRNumber && (
                  <>
                    <span>·</span>
                    <span>PR #{linkedPRNumber}</span>
                  </>
                )}
              </div>
            </div>
          </a>
        );
      })}

      {pullRequests?.map((pr) => {
        const prRepoOwner = pr.repository?.owner || owner || "unknown";
        const prRepoName = pr.repository?.name || repo || "unknown";
        const prRepoSlug = `${prRepoOwner}/${prRepoName}`;
        const prUrl =
          pr.url ||
          `https://github.com/${prRepoOwner}/${prRepoName}/pull/${pr.number}`;
        const statusLabel = pr.merged
          ? "Merged"
          : pr.state === "open"
          ? "Open"
          : "Closed";
        const iconClasses = cn(
          "w-4 h-4 mt-0.5 flex-shrink-0",
          pr.merged
            ? "text-green-500"
            : pr.state === "open"
            ? "text-blue-500"
            : theme === "dark"
            ? "text-gray-400"
            : "text-gray-500",
        );

        return (
          <a
            key={`pr-${pr.number}`}
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-start space-x-2 rounded px-2 py-1.5 transition-colors",
              theme === "dark"
                ? "hover:bg-gray-750 text-gray-200"
                : "hover:bg-gray-100 text-gray-700",
            )}
          >
            {pr.merged ? (
              <GitMerge className={iconClasses} />
            ) : (
              <GitPullRequest className={iconClasses} />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium break-words">
                {pr.title || `PR #${pr.number}`}
              </span>
              <div
                className={cn(
                  "text-xs flex items-center gap-1 flex-wrap",
                  theme === "dark" ? "text-gray-500" : "text-gray-500",
                )}
              >
                <span>#{pr.number}</span>
                <span>·</span>
                <span className="truncate">{prRepoSlug}</span>
                <span>·</span>
                <span>{statusLabel}</span>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
