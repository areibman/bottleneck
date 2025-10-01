import React from "react";
import {
  RefreshCw,
  Bell,
  User,
  Command,
  ChevronDown,
  ChevronRight,
  Loader2,
  GitBranch,
  Sun,
  Moon,
  Clock,
  Star,
  Activity,
  AlertTriangle,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";
import { useUIStore } from "../stores/uiStore";
import { useSyncStore } from "../stores/syncStore";
import { usePRStore } from "../stores/prStore";
import { cn } from "../utils/cn";

interface GroupedRepositories {
  [org: string]: any[];
}

export default function TopBar() {
  const { user, logout } = useAuthStore();
  const { toggleCommandPalette, theme, toggleTheme } = useUIStore();
  const { isSyncing, syncAll, lastSyncTime, syncErrors } = useSyncStore();
  const {
    repositories,
    selectedRepo,
    setSelectedRepo,
    fetchPullRequests,
    recentlyViewedRepos,
    removeFromRecentlyViewed,
  } = usePRStore();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [repoMenuOpen, setRepoMenuOpen] = React.useState(false);
  const [expandedOrgs, setExpandedOrgs] = React.useState<Set<string>>(
    new Set(),
  );
  const [activeSection, setActiveSection] = React.useState<"recent" | "all">(
    "recent",
  );

  const handleZoomIn = async () => {
    console.log("Zoom In clicked");
    try {
      const result = await window.electron.app.zoomIn();
      console.log("Zoom In result:", result);
    } catch (error) {
      console.error("Zoom In error:", error);
    }
  };

  const handleZoomOut = async () => {
    console.log("Zoom Out clicked");
    try {
      const result = await window.electron.app.zoomOut();
      console.log("Zoom Out result:", result);
    } catch (error) {
      console.error("Zoom Out error:", error);
    }
  };

  // Group repositories by organization
  const groupedRepos = React.useMemo(() => {
    const groups: GroupedRepositories = {};
    repositories.forEach((repo) => {
      if (!groups[repo.owner]) {
        groups[repo.owner] = [];
      }
      groups[repo.owner].push(repo);
    });

    // Sort repos within each org by activity (pushed_at or updated_at)
    Object.keys(groups).forEach((org) => {
      groups[org].sort((a, b) => {
        const aTime = new Date(a.pushed_at || a.updated_at || 0).getTime();
        const bTime = new Date(b.pushed_at || b.updated_at || 0).getTime();
        return bTime - aTime; // Most recent first
      });
    });

    return groups;
  }, [repositories]);

  // Get sorted organization names
  const sortedOrgs = React.useMemo(() => {
    return Object.keys(groupedRepos).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
  }, [groupedRepos]);

  const handleRepoSelect = async (repo: any) => {
    setSelectedRepo(repo);
    setRepoMenuOpen(false);
    if (repo) {
      await fetchPullRequests(repo.owner, repo.name);
    }
  };

  const toggleOrg = (org: string) => {
    const newExpanded = new Set(expandedOrgs);
    if (newExpanded.has(org)) {
      newExpanded.delete(org);
    } else {
      newExpanded.add(org);
    }
    setExpandedOrgs(newExpanded);
  };

  const formatLastSync = (time: Date | null) => {
    if (!time) return "Never";
    const now = new Date();
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatActivityTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  return (
    <header
      className={cn(
        "h-14 flex items-center px-4 drag border-b",
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-gray-50 border-gray-200",
      )}
    >
      {/* Repository selector - offset from window controls */}
      <div className="flex items-center space-x-4 ml-20">
        {/* Repository Selector */}
        <div className="relative">
          <button
            onClick={() => setRepoMenuOpen(!repoMenuOpen)}
            className={cn(
              "btn btn-secondary text-sm flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors no-drag min-w-[150px] max-w-[300px]",
              theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-white hover:bg-gray-100 border border-gray-300",
            )}
          >
            <GitBranch className="w-4 h-4 flex-shrink-0" />
            <span className="truncate flex-1 text-left">
              {selectedRepo ? selectedRepo.full_name : "Select Repository"}
            </span>
            <ChevronDown className="w-3 h-3 flex-shrink-0 ml-1" />
          </button>

          {repoMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setRepoMenuOpen(false)}
              />
              <div
                className={cn(
                  "absolute left-0 mt-2 min-w-[320px] max-w-[480px] rounded-md shadow-lg z-20 max-h-[500px] overflow-hidden border flex flex-col",
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200",
                )}
              >
                {/* Section Tabs */}
                <div
                  className={cn(
                    "flex border-b",
                    theme === "dark" ? "border-gray-700" : "border-gray-200",
                  )}
                >
                  <div
                    onClick={() => setActiveSection("recent")}
                    className={cn(
                      "flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center cursor-pointer",
                      activeSection === "recent"
                        ? theme === "dark"
                          ? "bg-gray-700 text-white"
                          : "bg-gray-100 text-gray-900"
                        : theme === "dark"
                          ? "text-gray-400 hover:text-gray-200"
                          : "text-gray-600 hover:text-gray-900",
                    )}
                  >
                    <Clock className="w-3 h-3 inline mr-1.5" />
                    Recently Viewed
                  </div>
                  <div
                    onClick={() => setActiveSection("all")}
                    className={cn(
                      "flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center cursor-pointer",
                      activeSection === "all"
                        ? theme === "dark"
                          ? "bg-gray-700 text-white"
                          : "bg-gray-100 text-gray-900"
                        : theme === "dark"
                          ? "text-gray-400 hover:text-gray-200"
                          : "text-gray-600 hover:text-gray-900",
                    )}
                  >
                    <GitBranch className="w-3 h-3 inline mr-1.5" />
                    All Repositories
                  </div>
                </div>

                {/* Repository List */}
                <div className="overflow-y-auto overflow-x-hidden flex-1">
                  {activeSection === "recent" ? (
                    <div className="p-1">
                      {recentlyViewedRepos.length === 0 ? (
                        <div
                          className={cn(
                            "p-4 text-sm text-center",
                            theme === "dark"
                              ? "text-gray-400"
                              : "text-gray-600",
                          )}
                        >
                          No recently viewed repositories
                        </div>
                      ) : (
                        recentlyViewedRepos.map((repo) => (
                          <button
                            key={repo.id}
                            onClick={() => handleRepoSelect(repo)}
                            className={cn(
                              "w-full text-left px-3 py-2 text-sm rounded flex items-start group relative",
                              theme === "dark"
                                ? "hover:bg-gray-700"
                                : "hover:bg-gray-100",
                              selectedRepo?.id === repo.id &&
                              (theme === "dark"
                                ? "bg-gray-700"
                                : "bg-gray-100"),
                            )}
                          >
                            <div className="flex-1 min-w-0 pr-6">
                              <div className="flex items-center gap-2">
                                <span
                                  className="font-medium truncate"
                                  title={repo.full_name}
                                >
                                  {repo.full_name}
                                </span>
                                {repo.private && (
                                  <span
                                    className={cn(
                                      "text-xs px-1.5 py-0.5 rounded",
                                      theme === "dark"
                                        ? "bg-gray-600 text-gray-400"
                                        : "bg-gray-200 text-gray-600",
                                    )}
                                  >
                                    Private
                                  </span>
                                )}
                              </div>
                              {repo.description && (
                                <div
                                  className={cn(
                                    "text-xs line-clamp-1 mt-0.5",
                                    theme === "dark"
                                      ? "text-gray-400"
                                      : "text-gray-600",
                                  )}
                                  title={repo.description}
                                >
                                  {repo.description}
                                </div>
                              )}
                              <div
                                className={cn(
                                  "flex items-center gap-3 mt-1 text-xs",
                                  theme === "dark"
                                    ? "text-gray-500"
                                    : "text-gray-500",
                                )}
                              >
                                <span className="flex items-center gap-1">
                                  <Activity className="w-3 h-3" />
                                  {formatActivityTime(
                                    repo.pushed_at || repo.updated_at,
                                  )}
                                </span>
                                {repo.stargazers_count !== undefined && (
                                  <span className="flex items-center gap-1">
                                    <Star className="w-3 h-3" />
                                    {repo.stargazers_count}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromRecentlyViewed(repo.id);
                              }}
                              className={cn(
                                "absolute right-2 top-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                                theme === "dark"
                                  ? "hover:bg-gray-600 text-gray-400 hover:text-gray-200"
                                  : "hover:bg-gray-300 text-gray-500 hover:text-gray-700",
                              )}
                              title="Remove from recently viewed"
                            >
                              <X className="w-3 h-3" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="p-1">
                      {sortedOrgs.length === 0 ? (
                        <div
                          className={cn(
                            "p-4 text-sm text-center",
                            theme === "dark"
                              ? "text-gray-400"
                              : "text-gray-600",
                          )}
                        >
                          No repositories found
                        </div>
                      ) : (
                        sortedOrgs.map((org) => (
                          <div key={org} className="mb-1">
                            <button
                              onClick={() => toggleOrg(org)}
                              className={cn(
                                "w-full text-left px-3 py-1.5 text-sm font-medium rounded flex items-center justify-between group",
                                theme === "dark"
                                  ? "hover:bg-gray-700 text-gray-300"
                                  : "hover:bg-gray-100 text-gray-700",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <ChevronRight
                                  className={cn(
                                    "w-3 h-3 transition-transform",
                                    expandedOrgs.has(org) && "rotate-90",
                                  )}
                                />
                                <span>{org}</span>
                                <span
                                  className={cn(
                                    "text-xs px-1.5 py-0.5 rounded",
                                    theme === "dark"
                                      ? "bg-gray-700 text-gray-400"
                                      : "bg-gray-200 text-gray-600",
                                  )}
                                >
                                  {groupedRepos[org].length}
                                </span>
                              </div>
                            </button>

                            {expandedOrgs.has(org) && (
                              <div className="ml-3">
                                {groupedRepos[org].map((repo) => (
                                  <button
                                    key={repo.id}
                                    onClick={() => handleRepoSelect(repo)}
                                    className={cn(
                                      "w-full text-left px-3 py-2 text-sm rounded flex items-start group",
                                      theme === "dark"
                                        ? "hover:bg-gray-700"
                                        : "hover:bg-gray-100",
                                      selectedRepo?.id === repo.id &&
                                      (theme === "dark"
                                        ? "bg-gray-700"
                                        : "bg-gray-100"),
                                    )}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="font-medium truncate"
                                          title={repo.name}
                                        >
                                          {repo.name}
                                        </span>
                                        {repo.private && (
                                          <span
                                            className={cn(
                                              "text-xs px-1.5 py-0.5 rounded",
                                              theme === "dark"
                                                ? "bg-gray-700 text-gray-400"
                                                : "bg-gray-200 text-gray-600",
                                            )}
                                          >
                                            Private
                                          </span>
                                        )}
                                      </div>
                                      {repo.description && (
                                        <div
                                          className={cn(
                                            "text-xs line-clamp-1 mt-0.5",
                                            theme === "dark"
                                              ? "text-gray-400"
                                              : "text-gray-600",
                                          )}
                                          title={repo.description}
                                        >
                                          {repo.description}
                                        </div>
                                      )}
                                      <div
                                        className={cn(
                                          "flex items-center gap-3 mt-1 text-xs",
                                          theme === "dark"
                                            ? "text-gray-500"
                                            : "text-gray-500",
                                        )}
                                      >
                                        <span className="flex items-center gap-1">
                                          <Activity className="w-3 h-3" />
                                          {formatActivityTime(
                                            repo.pushed_at || repo.updated_at,
                                          )}
                                        </span>
                                        {repo.stargazers_count !==
                                          undefined && (
                                            <span className="flex items-center gap-1">
                                              <Star className="w-3 h-3" />
                                              {repo.stargazers_count}
                                            </span>
                                          )}
                                        {repo.open_issues_count !== undefined &&
                                          repo.open_issues_count > 0 && (
                                            <span className="flex items-center gap-1">
                                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                              {repo.open_issues_count} open
                                            </span>
                                          )}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {isSyncing && (
          <div
            className={cn(
              "flex items-center text-xs",
              theme === "dark" ? "text-gray-400" : "text-gray-600",
            )}
          >
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Syncing...
          </div>
        )}
      </div>

      {/* Center area - Command palette trigger */}
      <div className="flex-1 flex justify-center">
        <button
          onClick={toggleCommandPalette}
          className={cn(
            "flex items-center space-x-2 px-4 py-1.5 rounded-md text-sm transition-colors no-drag",
            theme === "dark"
              ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
              : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-300",
          )}
        >
          <Command className="w-3 h-3" />
          <span>Command Palette</span>
          <span
            className={cn(
              "text-xs",
              theme === "dark" ? "text-gray-500" : "text-gray-600",
            )}
          >
            ⌘⇧P
          </span>
        </button>
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-3">
        {/* Zoom controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handleZoomOut}
            className={cn(
              "p-2 rounded transition-colors no-drag",
              theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100",
            )}
            title="Zoom Out (⌘-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomIn}
            className={cn(
              "p-2 rounded transition-colors no-drag",
              theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100",
            )}
            title="Zoom In (⌘+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "p-2 rounded transition-colors no-drag",
            theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100",
          )}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-yellow-400" />
          ) : (
            <Moon className="w-4 h-4 text-blue-600" />
          )}
        </button>

        {/* Sync status */}
        <div className="flex items-center space-x-2">
          <button
            onClick={syncAll}
            disabled={isSyncing}
            className={cn(
              "p-2 rounded transition-colors no-drag relative",
              theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100",
              isSyncing && "opacity-50 cursor-not-allowed",
            )}
            title={
              syncErrors.length > 0
                ? `Sync errors: ${syncErrors[0]}`
                : `Last sync: ${formatLastSync(lastSyncTime)}`
            }
          >
            {syncErrors.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            ) : (
              <RefreshCw
                className={cn("w-4 h-4", isSyncing && "animate-spin")}
              />
            )}
            {isSyncing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
          </button>
          <span
            className={cn(
              "text-xs",
              syncErrors.length > 0
                ? "text-yellow-500"
                : theme === "dark"
                  ? "text-gray-500"
                  : "text-gray-600",
            )}
          >
            {isSyncing ? "Syncing..." : formatLastSync(lastSyncTime)}
          </span>
        </div>

        {/* Notifications */}
        <button
          className={cn(
            "relative p-2 rounded transition-colors no-drag",
            theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100",
          )}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              "flex items-center space-x-2 p-1.5 rounded transition-colors no-drag",
              theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100",
            )}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.login}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <User className="w-6 h-6 p-1 bg-gray-600 rounded-full" />
            )}
            <span className="text-sm">{user?.login || "User"}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div
                className={cn(
                  "absolute right-0 mt-2 w-48 rounded-md shadow-lg z-20 border",
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200",
                )}
              >
                <div
                  className={cn(
                    "p-3 border-b",
                    theme === "dark" ? "border-gray-700" : "border-gray-200",
                  )}
                >
                  <div className="text-sm font-medium">
                    {user?.name || user?.login}
                  </div>
                  <div
                    className={cn(
                      "text-xs",
                      theme === "dark" ? "text-gray-400" : "text-gray-600",
                    )}
                  >
                    {user?.email}
                  </div>
                </div>
                <div className="p-1">
                  <div
                    onClick={() => {
                      setUserMenuOpen(false);
                      window.location.href = "/settings";
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded cursor-pointer",
                      theme === "dark"
                        ? "hover:bg-gray-700"
                        : "hover:bg-gray-100",
                    )}
                  >
                    Settings
                  </div>
                  <div
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded text-red-400 cursor-pointer",
                      theme === "dark"
                        ? "hover:bg-gray-700"
                        : "hover:bg-gray-100",
                    )}
                  >
                    Sign Out
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
