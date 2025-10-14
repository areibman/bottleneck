import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { Issue } from "../../../services/github";
import { cn } from "../../../utils/cn";
import { formatDistanceToNow } from "date-fns";

interface IssueHeaderProps {
  issue: Issue;
  commentsCount: number;
  theme: "light" | "dark";
  onBack: () => void;
  onCloseIssue: () => void;
  onReopenIssue: () => void;
  isClosing: boolean;
  isReopening: boolean;
  owner?: string;
  repo?: string;
}

export function IssueHeader({
  issue,
  commentsCount,
  theme,
  onBack,
  onCloseIssue,
  onReopenIssue,
  isClosing,
  isReopening,
  owner,
  repo,
}: IssueHeaderProps) {
  return (
    <div
      className={cn(
        "p-4 border-b",
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-gray-50 border-gray-200",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className={cn(
              "p-1 rounded transition-colors",
              theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100",
            )}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            {issue.state === "open" ? (
              <span className="flex items-center" title="Open">
                <AlertCircle className="w-5 h-5 text-green-400" />
              </span>
            ) : (
              <span className="flex items-center" title="Closed">
                <CheckCircle className="w-5 h-5 text-purple-400" />
              </span>
            )}

            <h1 className="text-lg font-semibold">
              {issue.title}
              <span
                className={cn(
                  "ml-2 text-sm",
                  theme === "dark" ? "text-gray-500" : "text-gray-600",
                )}
              >
                #{issue.number}
              </span>
              {owner && repo && (
                <a
                  href={`https://github.com/${owner}/${repo}/issues/${issue.number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "ml-2 px-2 py-0.5 rounded transition-colors inline-flex items-center space-x-1 align-middle font-normal",
                    theme === "dark"
                      ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                      : "hover:bg-gray-100 text-gray-600 hover:text-gray-900",
                  )}
                  title="Open in GitHub"
                >
                  <span className="text-xs">GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {issue.state === "open" ? (
            <button
              onClick={onCloseIssue}
              disabled={isClosing}
              className={cn(
                "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                theme === "dark"
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-purple-500 hover:bg-purple-600 text-white",
                isClosing && "opacity-50 cursor-not-allowed",
              )}
            >
              {isClosing ? "Closing..." : "Close Issue"}
            </button>
          ) : (
            <button
              onClick={onReopenIssue}
              disabled={isReopening}
              className={cn(
                "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                theme === "dark"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-green-500 hover:bg-green-600 text-white",
                isReopening && "opacity-50 cursor-not-allowed",
              )}
            >
              {isReopening ? "Reopening..." : "Reopen Issue"}
            </button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center space-x-4 text-sm ml-12",
          theme === "dark" ? "text-gray-400" : "text-gray-600",
        )}
      >
        <div className="flex items-center space-x-2">
          <img
            src={issue.user.avatar_url}
            alt={issue.user.login}
            className="w-5 h-5 rounded-full"
          />
          <span>{issue.user.login} opened this issue</span>
        </div>

        <span>
          {formatDistanceToNow(new Date(issue.created_at), {
            addSuffix: true,
          })}
        </span>

        <div className="flex items-center space-x-1">
          <MessageSquare className="w-4 h-4" />
          <span>{commentsCount} comments</span>
        </div>
      </div>
    </div>
  );
}
