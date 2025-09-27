import React, { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "../utils/cn";
import { CheckStatus as CheckStatusType, GitHubCheckRun } from "../types/githubActions";
import { useUIStore } from "../stores/uiStore";

interface CheckStatusProps {
  checkStatus: CheckStatusType | null;
  loading?: boolean;
  onRefresh?: () => void;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function CheckStatus({
  checkStatus,
  loading = false,
  onRefresh,
  showDetails = true,
  compact = false,
  className,
}: CheckStatusProps) {
  const { theme } = useUIStore();
  const [expanded, setExpanded] = useState(false);

  if (!checkStatus) {
    return (
      <div className={cn("flex items-center space-x-1", className)}>
        <div className="w-4 h-4 rounded-full bg-gray-400" />
        {!compact && (
          <span className={cn(
            "text-xs",
            theme === "dark" ? "text-gray-500" : "text-gray-600"
          )}>
            No checks
          </span>
        )}
      </div>
    );
  }

  const getStatusIcon = (status: CheckStatusType["overallStatus"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "failure":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
      case "no-checks":
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: CheckStatusType["overallStatus"]) => {
    switch (status) {
      case "success":
        return "All checks passed";
      case "failure":
        return "Some checks failed";
      case "pending":
        return "Checks running";
      case "no-checks":
        return "No checks";
      default:
        return "Unknown status";
    }
  };

  const getStatusColor = (status: CheckStatusType["overallStatus"]) => {
    switch (status) {
      case "success":
        return "text-green-400";
      case "failure":
        return "text-red-400";
      case "pending":
        return "text-yellow-400";
      case "no-checks":
        return "text-gray-400";
      default:
        return "text-gray-400";
    }
  };

  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt) return null;
    
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const durationMs = end.getTime() - start.getTime();
    
    if (durationMs < 1000) return "< 1s";
    if (durationMs < 60000) return `${Math.round(durationMs / 1000)}s`;
    if (durationMs < 3600000) return `${Math.round(durationMs / 60000)}m`;
    return `${Math.round(durationMs / 3600000)}h`;
  };

  const getCheckRunIcon = (run: GitHubCheckRun) => {
    if (run.status === "completed") {
      switch (run.conclusion) {
        case "success":
          return <CheckCircle className="w-3 h-3 text-green-400" />;
        case "failure":
          return <XCircle className="w-3 h-3 text-red-400" />;
        case "cancelled":
          return <XCircle className="w-3 h-3 text-gray-400" />;
        case "skipped":
          return <AlertCircle className="w-3 h-3 text-gray-400" />;
        case "timed_out":
          return <Clock className="w-3 h-3 text-yellow-400" />;
        case "action_required":
          return <AlertCircle className="w-3 h-3 text-yellow-400" />;
        default:
          return <AlertCircle className="w-3 h-3 text-gray-400" />;
      }
    } else {
      return <Clock className="w-3 h-3 text-yellow-400 animate-pulse" />;
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-1", className)}>
        {loading ? (
          <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
        ) : (
          getStatusIcon(checkStatus.overallStatus)
        )}
        {onRefresh && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            className={cn(
              "p-0.5 rounded hover:bg-gray-600 transition-colors",
              theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"
            )}
            title="Refresh checks"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Status Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {loading ? (
            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            getStatusIcon(checkStatus.overallStatus)
          )}
          <span className={cn("text-sm font-medium", getStatusColor(checkStatus.overallStatus))}>
            {getStatusText(checkStatus.overallStatus)}
          </span>
          {checkStatus.summary.total > 0 && (
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded",
              theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
            )}>
              {checkStatus.summary.success}/{checkStatus.summary.total}
            </span>
          )}
        </div>
        
        {onRefresh && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            className={cn(
              "p-1 rounded hover:bg-gray-600 transition-colors",
              theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"
            )}
            title="Refresh checks"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Check Details */}
      {showDetails && checkStatus.checkRuns.length > 0 && (
        <div className="space-y-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "flex items-center space-x-1 text-xs transition-colors",
              theme === "dark" ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-700"
            )}
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span>
              {checkStatus.checkRuns.length} check{checkStatus.checkRuns.length !== 1 ? "s" : ""}
            </span>
          </button>

          {expanded && (
            <div className={cn(
              "space-y-1 ml-4",
              theme === "dark" ? "border-l border-gray-700 pl-3" : "border-l border-gray-300 pl-3"
            )}>
              {checkStatus.checkRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    {getCheckRunIcon(run)}
                    <span className="text-xs truncate">{run.name}</span>
                    <span className={cn(
                      "text-xs px-1 py-0.5 rounded text-nowrap",
                      theme === "dark" ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600"
                    )}>
                      {run.app.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {run.started_at && (
                      <span className={cn(
                        "text-xs",
                        theme === "dark" ? "text-gray-500" : "text-gray-600"
                      )}>
                        {formatDuration(run.started_at, run.completed_at)}
                      </span>
                    )}
                    
                    <a
                      href={run.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "p-0.5 rounded hover:bg-gray-600 transition-colors",
                        theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-200"
                      )}
                      title="View check details"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}