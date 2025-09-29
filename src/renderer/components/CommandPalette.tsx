import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  GitBranch,
  GitPullRequest,
  AlertCircle,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Filter,
  User,
  Clock,
  Star,
  Download,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  ChevronRight,
  Command,
  X,
} from "lucide-react";
import { useUIStore } from "../stores/uiStore";
import { usePRStore } from "../stores/prStore";
import { useSyncStore } from "../stores/syncStore";
import { useSettingsStore } from "../stores/settingsStore";
import { cn } from "../utils/cn";

interface Command {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  shortcut?: string;
  action: () => void;
  keywords: string[];
}

export default function CommandPalette() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const {
    commandPaletteOpen,
    toggleCommandPalette,
    theme,
    toggleTheme,
    sidebarOpen,
    toggleSidebar,
    rightPanelOpen,
    toggleRightPanel,
    showWhitespace,
    toggleWhitespace,
    wordWrap,
    toggleWordWrap,
    diffView,
    toggleDiffView,
  } = useUIStore();

  const {
    selectedRepo,
    repositories,
    setSelectedRepo,
    fetchPullRequests,
    clearFilters,
    setStatusFilter,
    setFilters,
    pullRequests,
  } = usePRStore();

  const { syncAll, syncRepository } = useSyncStore();
  const { settings, updateSettings } = useSettingsStore();

  // Define all available commands
  const commands: Command[] = useMemo(() => {
    const baseCommands: Command[] = [
      // Navigation Commands
      {
        id: "nav-pulls",
        title: "Go to Pull Requests",
        description: "Navigate to the pull requests view",
        icon: <GitPullRequest className="w-4 h-4" />,
        category: "Navigation",
        shortcut: "⌘1",
        action: () => navigate("/pulls"),
        keywords: ["pulls", "pr", "pull requests", "navigate"],
      },
      {
        id: "nav-issues",
        title: "Go to Issues",
        description: "Navigate to the issues view",
        icon: <AlertCircle className="w-4 h-4" />,
        category: "Navigation",
        shortcut: "⌘2",
        action: () => navigate("/issues"),
        keywords: ["issues", "bugs", "navigate"],
      },
      {
        id: "nav-branches",
        title: "Go to Branches",
        description: "Navigate to the branches view",
        icon: <GitBranch className="w-4 h-4" />,
        category: "Navigation",
        shortcut: "⌘3",
        action: () => navigate("/branches"),
        keywords: ["branches", "git", "navigate"],
      },
      {
        id: "nav-settings",
        title: "Go to Settings",
        description: "Navigate to the settings view",
        icon: <Settings className="w-4 h-4" />,
        category: "Navigation",
        shortcut: "⌘,",
        action: () => navigate("/settings"),
        keywords: ["settings", "preferences", "navigate"],
      },

      // Repository Commands
      {
        id: "repo-sync",
        title: "Sync All Repositories",
        description: "Sync all repositories and pull requests",
        icon: <RefreshCw className="w-4 h-4" />,
        category: "Repository",
        shortcut: "⌘R",
        action: () => syncAll(),
        keywords: ["sync", "refresh", "update", "repositories"],
      },
      {
        id: "repo-sync-current",
        title: "Sync Current Repository",
        description: `Sync ${selectedRepo?.full_name || "current repository"}`,
        icon: <RefreshCw className="w-4 h-4" />,
        category: "Repository",
        action: () => {
          if (selectedRepo) {
            syncRepository(selectedRepo.owner, selectedRepo.name);
          }
        },
        keywords: ["sync", "refresh", "current", "repository"],
      },
      {
        id: "repo-refresh-prs",
        title: "Refresh Pull Requests",
        description: "Force refresh pull requests for current repository",
        icon: <GitPullRequest className="w-4 h-4" />,
        category: "Repository",
        action: () => {
          if (selectedRepo) {
            fetchPullRequests(selectedRepo.owner, selectedRepo.name, true);
          }
        },
        keywords: ["refresh", "pull requests", "prs", "reload"],
      },

      // UI Toggle Commands
      {
        id: "ui-toggle-sidebar",
        title: "Toggle Sidebar",
        description: sidebarOpen ? "Hide sidebar" : "Show sidebar",
        icon: sidebarOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />,
        category: "UI",
        shortcut: "⌘B",
        action: toggleSidebar,
        keywords: ["sidebar", "toggle", "hide", "show", "ui"],
      },
      {
        id: "ui-toggle-right-panel",
        title: "Toggle Right Panel",
        description: rightPanelOpen ? "Hide right panel" : "Show right panel",
        icon: rightPanelOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />,
        category: "UI",
        shortcut: "⌘⇧B",
        action: toggleRightPanel,
        keywords: ["right panel", "toggle", "hide", "show", "ui"],
      },
      {
        id: "ui-toggle-theme",
        title: "Toggle Theme",
        description: `Switch to ${theme === "dark" ? "light" : "dark"} mode`,
        icon: theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
        category: "UI",
        shortcut: "⌘T",
        action: toggleTheme,
        keywords: ["theme", "dark", "light", "toggle", "ui"],
      },
      {
        id: "ui-toggle-whitespace",
        title: "Toggle Whitespace",
        description: showWhitespace ? "Hide whitespace" : "Show whitespace",
        icon: showWhitespace ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />,
        category: "UI",
        action: toggleWhitespace,
        keywords: ["whitespace", "toggle", "hide", "show", "ui"],
      },
      {
        id: "ui-toggle-word-wrap",
        title: "Toggle Word Wrap",
        description: wordWrap ? "Disable word wrap" : "Enable word wrap",
        icon: wordWrap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />,
        category: "UI",
        action: toggleWordWrap,
        keywords: ["word wrap", "toggle", "ui"],
      },
      {
        id: "ui-toggle-diff-view",
        title: "Toggle Diff View",
        description: `Switch to ${diffView === "unified" ? "split" : "unified"} diff view`,
        icon: <GitBranch className="w-4 h-4" />,
        category: "UI",
        action: toggleDiffView,
        keywords: ["diff", "view", "toggle", "unified", "split", "ui"],
      },

      // Filter Commands
      {
        id: "filter-clear",
        title: "Clear All Filters",
        description: "Remove all active filters",
        icon: <Filter className="w-4 h-4" />,
        category: "Filters",
        action: clearFilters,
        keywords: ["clear", "filters", "reset", "remove"],
      },
      {
        id: "filter-open",
        title: "Filter: Open PRs",
        description: "Show only open pull requests",
        icon: <GitPullRequest className="w-4 h-4" />,
        category: "Filters",
        action: () => setStatusFilter("open"),
        keywords: ["filter", "open", "prs", "pull requests"],
      },
      {
        id: "filter-draft",
        title: "Filter: Draft PRs",
        description: "Show only draft pull requests",
        icon: <GitPullRequest className="w-4 h-4" />,
        category: "Filters",
        action: () => setStatusFilter("draft"),
        keywords: ["filter", "draft", "prs", "pull requests"],
      },
      {
        id: "filter-merged",
        title: "Filter: Merged PRs",
        description: "Show only merged pull requests",
        icon: <GitPullRequest className="w-4 h-4" />,
        category: "Filters",
        action: () => setStatusFilter("merged"),
        keywords: ["filter", "merged", "prs", "pull requests"],
      },
      {
        id: "filter-closed",
        title: "Filter: Closed PRs",
        description: "Show only closed pull requests",
        icon: <GitPullRequest className="w-4 h-4" />,
        category: "Filters",
        action: () => setStatusFilter("closed"),
        keywords: ["filter", "closed", "prs", "pull requests"],
      },

      // Settings Commands
      {
        id: "settings-auto-sync",
        title: "Toggle Auto Sync",
        description: settings.autoSync ? "Disable auto sync" : "Enable auto sync",
        icon: <RefreshCw className="w-4 h-4" />,
        category: "Settings",
        action: () => updateSettings({ autoSync: !settings.autoSync }),
        keywords: ["auto sync", "settings", "toggle", "sync"],
      },
      {
        id: "settings-debug-mode",
        title: "Toggle Debug Mode",
        description: settings.enableDebugMode ? "Disable debug mode" : "Enable debug mode",
        icon: <Settings className="w-4 h-4" />,
        category: "Settings",
        action: () => updateSettings({ enableDebugMode: !settings.enableDebugMode }),
        keywords: ["debug", "mode", "settings", "toggle"],
      },
      {
        id: "settings-notifications",
        title: "Toggle Notifications",
        description: settings.showDesktopNotifications ? "Disable notifications" : "Enable notifications",
        icon: <AlertCircle className="w-4 h-4" />,
        category: "Settings",
        action: () => updateSettings({ showDesktopNotifications: !settings.showDesktopNotifications }),
        keywords: ["notifications", "settings", "toggle"],
      },

      // Utility Commands
      {
        id: "util-copy-repo-url",
        title: "Copy Repository URL",
        description: `Copy URL for ${selectedRepo?.full_name || "current repository"}`,
        icon: <Copy className="w-4 h-4" />,
        category: "Utilities",
        action: () => {
          if (selectedRepo) {
            navigator.clipboard.writeText(`https://github.com/${selectedRepo.full_name}`);
          }
        },
        keywords: ["copy", "url", "repository", "github"],
      },
      {
        id: "util-open-github",
        title: "Open in GitHub",
        description: `Open ${selectedRepo?.full_name || "current repository"} in GitHub`,
        icon: <ExternalLink className="w-4 h-4" />,
        category: "Utilities",
        action: () => {
          if (selectedRepo) {
            window.open(`https://github.com/${selectedRepo.full_name}`, "_blank");
          }
        },
        keywords: ["open", "github", "external", "browser"],
      },
    ];

    // Add repository switching commands
    const repoCommands: Command[] = repositories.slice(0, 10).map((repo) => ({
      id: `repo-switch-${repo.id}`,
      title: `Switch to ${repo.full_name}`,
      description: `Switch to ${repo.full_name} repository`,
      icon: <GitBranch className="w-4 h-4" />,
      category: "Repository",
      action: () => {
        setSelectedRepo(repo);
        fetchPullRequests(repo.owner, repo.name);
      },
      keywords: ["switch", "repository", "repo", repo.name, repo.owner, repo.full_name],
    }));

    return [...baseCommands, ...repoCommands];
  }, [
    selectedRepo,
    repositories,
    theme,
    sidebarOpen,
    rightPanelOpen,
    showWhitespace,
    wordWrap,
    diffView,
    settings,
    navigate,
    toggleCommandPalette,
    toggleTheme,
    toggleSidebar,
    toggleRightPanel,
    toggleWhitespace,
    toggleWordWrap,
    toggleDiffView,
    setSelectedRepo,
    fetchPullRequests,
    clearFilters,
    setStatusFilter,
    syncAll,
    syncRepository,
    updateSettings,
  ]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    const queryLower = query.toLowerCase();
    return commands.filter((command) =>
      command.title.toLowerCase().includes(queryLower) ||
      command.description.toLowerCase().includes(queryLower) ||
      command.keywords.some(keyword => keyword.toLowerCase().includes(queryLower))
    );
  }, [commands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: { [key: string]: Command[] } = {};
    filteredCommands.forEach((command) => {
      if (!groups[command.category]) {
        groups[command.category] = [];
      }
      groups[command.category].push(command);
    });
    return groups;
  }, [filteredCommands]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          toggleCommandPalette();
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            toggleCommandPalette();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, filteredCommands, selectedIndex, toggleCommandPalette]);

  // Handle Cmd/Ctrl key preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        setShowPreview(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setShowPreview(false);
      }
    };

    if (commandPaletteOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [commandPaletteOpen]);

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={toggleCommandPalette}
      />

      {/* Command Palette */}
      <div
        className={cn(
          "relative w-full max-w-2xl mx-4 rounded-lg shadow-xl border",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center px-4 py-3 border-b",
            theme === "dark" ? "border-gray-700" : "border-gray-200",
          )}
        >
          <Search className="w-4 h-4 mr-3 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              "flex-1 bg-transparent outline-none text-sm",
              theme === "dark" ? "text-white placeholder-gray-400" : "text-gray-900 placeholder-gray-500",
            )}
          />
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <Command className="w-3 h-3" />
            <span>⌘⇧P</span>
          </div>
        </div>

        {/* Commands List */}
        <div className="max-h-96 overflow-y-auto">
          {Object.keys(groupedCommands).length === 0 ? (
            <div
              className={cn(
                "px-4 py-8 text-center text-sm",
                theme === "dark" ? "text-gray-400" : "text-gray-500",
              )}
            >
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, categoryCommands]) => (
              <div key={category}>
                <div
                  className={cn(
                    "px-4 py-2 text-xs font-medium uppercase tracking-wide",
                    theme === "dark" ? "text-gray-400 bg-gray-750" : "text-gray-500 bg-gray-50",
                  )}
                >
                  {category}
                </div>
                {categoryCommands.map((command, index) => {
                  const globalIndex = filteredCommands.indexOf(command);
                  const isSelected = globalIndex === selectedIndex;
                  
                  return (
                    <button
                      key={command.id}
                      onClick={() => {
                        command.action();
                        toggleCommandPalette();
                      }}
                      className={cn(
                        "w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors",
                        isSelected
                          ? theme === "dark"
                            ? "bg-gray-700"
                            : "bg-gray-100"
                          : theme === "dark"
                            ? "hover:bg-gray-700"
                            : "hover:bg-gray-50",
                      )}
                    >
                      <div className="flex-shrink-0">
                        {command.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {command.title}
                        </div>
                        <div
                          className={cn(
                            "text-xs truncate",
                            theme === "dark" ? "text-gray-400" : "text-gray-500",
                          )}
                        >
                          {command.description}
                        </div>
                      </div>
                      {command.shortcut && (
                        <div
                          className={cn(
                            "text-xs px-2 py-1 rounded",
                            theme === "dark"
                              ? "bg-gray-600 text-gray-300"
                              : "bg-gray-200 text-gray-600",
                          )}
                        >
                          {command.shortcut}
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className={cn(
            "px-4 py-2 text-xs border-t",
            theme === "dark" ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-500",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>⎋ Close</span>
            </div>
            {showPreview && (
              <div className="flex items-center space-x-1">
                <Command className="w-3 h-3" />
                <span>Hold for shortcuts</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}