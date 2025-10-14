import { useState, useMemo, useEffect, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GitPullRequest, GitBranch, Settings, AlertCircle, SatelliteDish, Trophy } from "lucide-react";
import { CursorIcon } from "./icons/CursorIcon";
import { DevinIcon } from "./icons/DevinIcon";
import { ChatGPTIcon } from "./icons/ChatGPTIcon";
import { cn } from "../utils/cn";
import { usePRStore } from "../stores/prStore";
import { useIssueStore } from "../stores/issueStore";
import { useUIStore } from "../stores/uiStore";
import type { SidebarNavItem } from "./sidebar/SidebarNav";
import { SidebarNav } from "./sidebar/SidebarNav";
import { IssueFiltersSection } from "./sidebar/IssueFiltersSection";
import { PRNavigationSection } from "./sidebar/PRNavigationSection";
import { SidebarFooter } from "./sidebar/SidebarFooter";
import { ResizeHandle } from "./sidebar/ResizeHandle";

interface SidebarProps {
  className?: string;
  width?: number;
  onWidthChange?: (width: number) => void;
}

const NAV_ITEMS: SidebarNavItem[] = [
  { path: "/pulls", icon: GitPullRequest, label: "Pull Requests" },
  { path: "/high-scores", icon: Trophy, label: "High Scores" },
  { path: "/issues", icon: AlertCircle, label: "Issues" },
  { path: "/branches", icon: GitBranch, label: "Branches" },
  {
    icon: SatelliteDish,
    label: "Async Agents",
    children: [
      { path: "/agents/cursor", icon: CursorIcon, label: "Cursor" },
      { path: "/agents/devin", icon: DevinIcon, label: "Devin" },
      { path: "/agents/chatgpt", icon: ChatGPTIcon, label: "Codex" },
    ],
  },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar({
  className,
  width = 256,
  onWidthChange,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const { statusFilters, setFilter, pullRequests, selectedRepo } = usePRStore();
  const {
    issues,
    filters: issueFilters,
    setFilter: setIssueFilter,
    resetFilters: resetIssueFilters,
  } = useIssueStore();
  const { theme, setSidebarWidth, prNavigationState } = useUIStore();

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const repoPullRequests = useMemo(() => {
    if (!selectedRepo) {
      return [] as any[];
    }

    return Array.from(pullRequests.values()).filter((pr) => {
      const baseOwner = pr.base?.repo?.owner?.login;
      const baseName = pr.base?.repo?.name;
      return baseOwner === selectedRepo.owner && baseName === selectedRepo.name;
    });
  }, [pullRequests, selectedRepo]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = event.clientX - startXRef.current;
      const newWidth = Math.min(Math.max(startWidthRef.current + deltaX, 200), 500);

      if (onWidthChange) {
        onWidthChange(newWidth);
      }
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!isResizing) return;

      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, onWidthChange, setSidebarWidth]);

  const handleResizeStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsResizing(true);
    startXRef.current = event.clientX;
    startWidthRef.current = width;
  };

  const handlePullRequestSelect = (pr: any) => {
    navigate(
      `/pulls/${pr.base.repo.owner.login}/${pr.base.repo.name}/${pr.number}`,
    );
  };

  const handleNavigationSelect = (siblingPR: any) => {
    if (!prNavigationState) {
      return;
    }

    const pathParts = location.pathname.split("/");
    const owner = pathParts[2];
    const repo = pathParts[3];

    navigate(`/pulls/${owner}/${repo}/${siblingPR.number}`, {
      state: prNavigationState,
    });
  };

  if (width === 0) {
    return null;
  }

  return (
    <aside
      className={cn("relative", className)}
      style={{ width: `${width}px` }}
    >
      <div
        className={cn(
          "flex flex-col h-full overflow-hidden border-r",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-gray-50 border-gray-200",
        )}
      >
        <SidebarNav items={NAV_ITEMS} />

        {location.pathname.startsWith("/issues") && (
          <IssueFiltersSection
            theme={theme}
            filters={issueFilters}
            setFilter={setIssueFilter}
            resetFilters={resetIssueFilters}
            issues={issues}
          />
        )}

        <PRNavigationSection
          theme={theme}
          currentPath={location.pathname}
          navigationState={prNavigationState}
          onSelectPR={handleNavigationSelect}
        />

        <SidebarFooter theme={theme} />
      </div>

      <ResizeHandle
        theme={theme}
        isResizing={isResizing}
        onResizeStart={handleResizeStart}
      />
    </aside>
  );
}
