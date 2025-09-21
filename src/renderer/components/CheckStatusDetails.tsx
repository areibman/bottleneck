import React, { useState } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Circle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { cn } from "../utils/cn";
import { BranchCheckStatus, CheckRun, WorkflowRun } from "../services/github";
import { formatDistanceToNow } from "date-fns";
import { useUIStore } from "../stores/uiStore";

interface CheckStatusDetailsProps {
  status: BranchCheckStatus;
  branchName: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const CheckStatusDetails: React.FC<CheckStatusDetailsProps> = ({
  status,
  branchName,
  onRefresh,
  isRefreshing = false,
}) => {
  const { theme } = useUIStore();
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());

  const toggleCheck = (checkId: string) => {
    setExpandedChecks(prev => {
      const next = new Set(prev);
      if (next.has(checkId)) {
        next.delete(checkId);
      } else {
        next.add(checkId);
      }
      return next;
    });
  };

  const getStatusIcon = (checkStatus: string, conclusion: string | null) => {
    if (checkStatus === "queued" || checkStatus === "in_progress") {
      return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
    }
    
    switch (conclusion) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failure":
      case "timed_out":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "cancelled":
        return <Circle className="w-4 h-4 text-gray-400" />;
      case "skipped":
      case "neutral":
        return <Circle className="w-4 h-4 text-gray-400" />;
      case "action_required":
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (checkStatus: string, conclusion: string | null) => {
    if (checkStatus === "queued") return "Queued";
    if (checkStatus === "in_progress") return "In Progress";
    
    switch (conclusion) {
      case "success": return "Success";
      case "failure": return "Failed";
      case "timed_out": return "Timed Out";
      case "cancelled": return "Cancelled";
      case "skipped": return "Skipped";
      case "neutral": return "Neutral";
      case "action_required": return "Action Required";
      default: return "Unknown";
    }
  };

  const getStatusColor = (checkStatus: string, conclusion: string | null) => {
    if (checkStatus === "queued" || checkStatus === "in_progress") {
      return "text-yellow-600";
    }
    
    switch (conclusion) {
      case "success": return "text-green-600";
      case "failure":
      case "timed_out": return "text-red-600";
      case "action_required": return "text-orange-600";
      default: return "text-gray-600";
    }
  };

  const allChecks = [
    ...status.checkRuns.map(r => ({ ...r, type: 'check' as const })),
    ...status.workflowRuns.map(r => ({ ...r, type: 'workflow' as const }))
  ];

  // Group checks by status
  const groupedChecks = {
    running: allChecks.filter(c => c.status === "in_progress" || c.status === "queued"),
    failed: allChecks.filter(c => c.conclusion === "failure" || c.conclusion === "timed_out" || c.conclusion === "action_required"),
    passed: allChecks.filter(c => c.conclusion === "success"),
    other: allChecks.filter(c => 
      c.status === "completed" && 
      c.conclusion !== "success" && 
      c.conclusion !== "failure" && 
      c.conclusion !== "timed_out" && 
      c.conclusion !== "action_required"
    ),
  };

  const hasChecks = allChecks.length > 0;

  return (
    <div className={cn(
      "rounded-lg border p-4",
      theme === "dark" 
        ? "bg-gray-800 border-gray-700" 
        : "bg-white border-gray-200"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">
            GitHub Actions Status
          </h3>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            status.overallStatus === "success" && "bg-green-100 text-green-700",
            status.overallStatus === "failure" && "bg-red-100 text-red-700",
            status.overallStatus === "pending" && "bg-yellow-100 text-yellow-700",
            status.overallStatus === "none" && "bg-gray-100 text-gray-700",
            theme === "dark" && status.overallStatus === "success" && "bg-green-900/30 text-green-400",
            theme === "dark" && status.overallStatus === "failure" && "bg-red-900/30 text-red-400",
            theme === "dark" && status.overallStatus === "pending" && "bg-yellow-900/30 text-yellow-400",
            theme === "dark" && status.overallStatus === "none" && "bg-gray-700 text-gray-400"
          )}>
            {status.overallStatus === "success" && "All checks passed"}
            {status.overallStatus === "failure" && "Some checks failed"}
            {status.overallStatus === "pending" && "Checks running"}
            {status.overallStatus === "none" && "No checks"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status.lastUpdated && (
            <span className={cn(
              "text-xs",
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            )}>
              Updated {formatDistanceToNow(new Date(status.lastUpdated), { addSuffix: true })}
            </span>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={cn(
                "p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                isRefreshing && "opacity-50 cursor-not-allowed"
              )}
              title="Refresh check status"
            >
              <RefreshCw className={cn(
                "w-4 h-4",
                theme === "dark" ? "text-gray-400" : "text-gray-600",
                isRefreshing && "animate-spin"
              )} />
            </button>
          )}
        </div>
      </div>

      {/* No checks message */}
      {!hasChecks && (
        <div className={cn(
          "text-sm py-8 text-center",
          theme === "dark" ? "text-gray-400" : "text-gray-500"
        )}>
          No GitHub Actions configured for this branch
        </div>
      )}

      {/* Check groups */}
      {hasChecks && (
        <div className="space-y-3">
          {/* Running checks */}
          {groupedChecks.running.length > 0 && (
            <div>
              <h4 className={cn(
                "text-xs font-medium mb-2",
                theme === "dark" ? "text-yellow-400" : "text-yellow-600"
              )}>
                Running ({groupedChecks.running.length})
              </h4>
              <div className="space-y-1">
                {groupedChecks.running.map((check) => (
                  <CheckItem 
                    key={`${check.type}-${check.id}`}
                    check={check}
                    isExpanded={expandedChecks.has(`${check.type}-${check.id}`)}
                    onToggle={() => toggleCheck(`${check.type}-${check.id}`)}
                    theme={theme}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Failed checks */}
          {groupedChecks.failed.length > 0 && (
            <div>
              <h4 className={cn(
                "text-xs font-medium mb-2",
                theme === "dark" ? "text-red-400" : "text-red-600"
              )}>
                Failed ({groupedChecks.failed.length})
              </h4>
              <div className="space-y-1">
                {groupedChecks.failed.map((check) => (
                  <CheckItem 
                    key={`${check.type}-${check.id}`}
                    check={check}
                    isExpanded={expandedChecks.has(`${check.type}-${check.id}`)}
                    onToggle={() => toggleCheck(`${check.type}-${check.id}`)}
                    theme={theme}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Passed checks */}
          {groupedChecks.passed.length > 0 && (
            <div>
              <h4 className={cn(
                "text-xs font-medium mb-2",
                theme === "dark" ? "text-green-400" : "text-green-600"
              )}>
                Passed ({groupedChecks.passed.length})
              </h4>
              <div className="space-y-1">
                {groupedChecks.passed.map((check) => (
                  <CheckItem 
                    key={`${check.type}-${check.id}`}
                    check={check}
                    isExpanded={expandedChecks.has(`${check.type}-${check.id}`)}
                    onToggle={() => toggleCheck(`${check.type}-${check.id}`)}
                    theme={theme}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other checks (skipped, cancelled, etc.) */}
          {groupedChecks.other.length > 0 && (
            <div>
              <h4 className={cn(
                "text-xs font-medium mb-2",
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              )}>
                Other ({groupedChecks.other.length})
              </h4>
              <div className="space-y-1">
                {groupedChecks.other.map((check) => (
                  <CheckItem 
                    key={`${check.type}-${check.id}`}
                    check={check}
                    isExpanded={expandedChecks.has(`${check.type}-${check.id}`)}
                    onToggle={() => toggleCheck(`${check.type}-${check.id}`)}
                    theme={theme}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Individual check item component
interface CheckItemProps {
  check: (CheckRun | WorkflowRun) & { type: 'check' | 'workflow' };
  isExpanded: boolean;
  onToggle: () => void;
  theme: string;
}

const CheckItem: React.FC<CheckItemProps> = ({ check, isExpanded, onToggle, theme }) => {
  const getStatusIcon = (checkStatus: string, conclusion: string | null) => {
    if (checkStatus === "queued" || checkStatus === "in_progress") {
      return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
    }
    
    switch (conclusion) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failure":
      case "timed_out":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "cancelled":
        return <Circle className="w-4 h-4 text-gray-400" />;
      case "skipped":
      case "neutral":
        return <Circle className="w-4 h-4 text-gray-400" />;
      case "action_required":
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className={cn(
      "rounded border",
      theme === "dark" 
        ? "bg-gray-900 border-gray-700" 
        : "bg-gray-50 border-gray-200"
    )}>
      <div 
        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={onToggle}
      >
        <button className="p-0.5">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
        {getStatusIcon(check.status, check.conclusion)}
        <span className="text-xs font-medium flex-1 truncate">
          {check.name}
        </span>
        <a
          href={check.html_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700",
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          )}
          title="View on GitHub"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {isExpanded && (
        <div className={cn(
          "px-8 pb-2 text-xs space-y-1",
          theme === "dark" ? "text-gray-400" : "text-gray-600"
        )}>
          {check.type === 'workflow' && (
            <>
              <div>Event: {(check as WorkflowRun).event}</div>
              <div>Run: #{(check as WorkflowRun).run_number}</div>
            </>
          )}
          {'started_at' in check && check.started_at && (
            <div>Started: {formatDistanceToNow(new Date(check.started_at), { addSuffix: true })}</div>
          )}
          {'completed_at' in check && check.completed_at && (
            <div>Completed: {formatDistanceToNow(new Date(check.completed_at), { addSuffix: true })}</div>
          )}
          {check.app && (
            <div>App: {check.app.name}</div>
          )}
        </div>
      )}
    </div>
  );
};