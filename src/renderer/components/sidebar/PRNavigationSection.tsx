import {
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { getPRIcon, getPRColorClass } from "../../utils/prStatus";

interface PRNavigationState {
  siblingPRs?: any[];
  currentTaskGroup?: string;
  currentAgent?: string;
  currentPRNumber?: string;
}

interface PRNavigationSectionProps {
  theme: "light" | "dark";
  currentPath: string;
  navigationState: PRNavigationState | null;
  onSelectPR: (pullRequest: any) => void;
}

export function PRNavigationSection({
  theme,
  currentPath,
  navigationState,
  onSelectPR,
}: PRNavigationSectionProps) {
  const isPRDetailView = /^\/pulls\/[^/]+\/[^/]+\/\d+$/.test(currentPath);
  const siblingPRs = navigationState?.siblingPRs ?? [];

  if (!isPRDetailView || siblingPRs.length <= 1) {
    return null;
  }

  return (
    <div
      className={cn(
        "px-4 py-2 border-t",
        theme === "dark" ? "border-gray-700" : "border-gray-200",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h3
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            theme === "dark" ? "text-gray-400" : "text-gray-600",
          )}
        >
          {navigationState?.currentTaskGroup || "Related PRs"} ({siblingPRs.length})
        </h3>
      </div>
      <div className="space-y-1">
        {siblingPRs.map((siblingPR) => {
          const isCurrentPR =
            siblingPR.number?.toString() === navigationState?.currentPRNumber;
          const Icon = getPRIcon(siblingPR);
          const colorClass = getPRColorClass(siblingPR);

          return (
            <div
              key={siblingPR.id ?? siblingPR.number}
              onClick={() => {
                if (!isCurrentPR) {
                  onSelectPR(siblingPR);
                }
              }}
              className={cn(
                "px-3 py-2 rounded flex items-center space-x-2 cursor-pointer transition-colors",
                isCurrentPR
                  ? theme === "dark"
                    ? "bg-blue-900/30 border border-blue-700"
                    : "bg-blue-50 border border-blue-200"
                  : theme === "dark"
                    ? "hover:bg-gray-700"
                    : "hover:bg-gray-100",
                isCurrentPR && "cursor-default",
              )}
            >
              <div className="flex-shrink-0">
                <Icon className={`w-4 h-4 ${colorClass}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isCurrentPR
                        ? theme === "dark"
                          ? "text-blue-300"
                          : "text-blue-700"
                        : theme === "dark"
                          ? "text-gray-300"
                          : "text-gray-700",
                    )}
                  >
                    #{siblingPR.number}
                  </span>
                  {isCurrentPR && (
                    <span
                      className={cn(
                        "ml-2 text-xs px-1 py-0.5 rounded",
                        theme === "dark"
                          ? "bg-blue-700 text-blue-200"
                          : "bg-blue-200 text-blue-800",
                      )}
                    >
                      Current
                    </span>
                  )}
                  {siblingPR.approvalStatus === "approved" && (
                    <CheckCircle2 className="w-3 h-3 text-green-500 ml-auto" />
                  )}
                  {siblingPR.approvalStatus === "changes_requested" && (
                    <XCircle className="w-3 h-3 text-red-500 ml-auto" />
                  )}
                </div>
                <div
                  className={cn(
                    "text-xs truncate mt-0.5",
                    theme === "dark" ? "text-gray-400" : "text-gray-600",
                  )}
                >
                  {siblingPR.title}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  {siblingPR.changed_files !== undefined && (
                    <span
                      className={cn(
                        "text-xs",
                        theme === "dark" ? "text-gray-500" : "text-gray-600",
                      )}
                    >
                      {siblingPR.changed_files} file
                      {siblingPR.changed_files !== 1 ? "s" : ""}
                    </span>
                  )}
                  {siblingPR.additions !== undefined && (
                    <span className="text-xs text-green-500">
                      +{siblingPR.additions}
                    </span>
                  )}
                  {siblingPR.deletions !== undefined && (
                    <span className="text-xs text-red-500">
                      -{siblingPR.deletions}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
