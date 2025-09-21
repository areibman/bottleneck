import React from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Circle,
  AlertCircle,
  Clock
} from "lucide-react";
import { cn } from "../utils/cn";
import { BranchCheckStatus } from "../services/github";

interface CheckStatusBadgeProps {
  status?: BranchCheckStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

export const CheckStatusBadge: React.FC<CheckStatusBadgeProps> = ({
  status,
  size = "sm",
  showLabel = false,
  className,
  onClick,
}) => {
  const getStatusIcon = () => {
    const iconSize = size === "sm" ? 14 : size === "md" ? 16 : 20;
    
    if (!status) {
      return <Circle className="text-gray-400" size={iconSize} />;
    }

    switch (status.overallStatus) {
      case "success":
        return <CheckCircle2 className="text-green-500" size={iconSize} />;
      case "failure":
        return <XCircle className="text-red-500" size={iconSize} />;
      case "pending":
        return <Loader2 className="text-yellow-500 animate-spin" size={iconSize} />;
      case "none":
      default:
        return <Circle className="text-gray-400" size={iconSize} />;
    }
  };

  const getStatusLabel = () => {
    if (!status) return "No checks";
    
    switch (status.overallStatus) {
      case "success":
        return "Passed";
      case "failure":
        return "Failed";
      case "pending":
        return "Running";
      case "none":
      default:
        return "No checks";
    }
  };

  const getStatusColor = () => {
    if (!status) return "text-gray-500";
    
    switch (status.overallStatus) {
      case "success":
        return "text-green-500";
      case "failure":
        return "text-red-500";
      case "pending":
        return "text-yellow-500";
      case "none":
      default:
        return "text-gray-500";
    }
  };

  const getTooltip = () => {
    if (!status) return "No GitHub Actions checks";
    
    const totalChecks = status.checkRuns.length + status.workflowRuns.length;
    
    if (totalChecks === 0) {
      return "No GitHub Actions checks configured";
    }

    const failedChecks = [
      ...status.checkRuns.filter(r => r.conclusion === "failure"),
      ...status.workflowRuns.filter(r => r.conclusion === "failure")
    ];

    const runningChecks = [
      ...status.checkRuns.filter(r => r.status === "in_progress" || r.status === "queued"),
      ...status.workflowRuns.filter(r => r.status === "in_progress" || r.status === "queued")
    ];

    if (status.overallStatus === "success") {
      return `All ${totalChecks} check${totalChecks > 1 ? 's' : ''} passed`;
    } else if (status.overallStatus === "failure") {
      return `${failedChecks.length} of ${totalChecks} check${totalChecks > 1 ? 's' : ''} failed`;
    } else if (status.overallStatus === "pending") {
      return `${runningChecks.length} check${runningChecks.length > 1 ? 's' : ''} running`;
    }

    return "No active checks";
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1",
        onClick && "cursor-pointer hover:opacity-80",
        className
      )}
      onClick={onClick}
      title={getTooltip()}
    >
      {getStatusIcon()}
      {showLabel && (
        <span className={cn(
          "text-xs font-medium",
          getStatusColor()
        )}>
          {getStatusLabel()}
        </span>
      )}
    </div>
  );
};