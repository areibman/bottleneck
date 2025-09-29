import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Command,
  Search,
  GitBranch,
  GitPullRequest,
  Settings,
  Sun,
  Moon,
  RefreshCw,
  PanelLeft,
  PanelRight,
  Eye,
  FileText,
  Plus,
  Check,
  X,
  Filter,
  SortDesc,
  User,
  LogOut,
  Keyboard,
  Home,
  GitMerge,
  GitCommit,
  AlertCircle,
  Bot,
  MessageSquare,
  Code,
  Copy,
  ExternalLink,
  Download,
  Upload,
  Trash2,
  Archive,
  Star,
  Bell,
  Zap,
} from "lucide-react";
import { useUIStore } from "../stores/uiStore";
import { useAuthStore } from "../stores/authStore";
import { usePRStore } from "../stores/prStore";
import { useSyncStore } from "../stores/syncStore";
import { cn } from "../utils/cn";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
  category: "navigation" | "pr" | "view" | "search" | "sync" | "user" | "ai";
  action: () => void;
  description?: string;
  keywords?: string[];
}

export default function CommandPalette() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    commandPaletteOpen,
    toggleCommandPalette,
    theme,
    toggleTheme,
    toggleSidebar,
    toggleRightPanel,
    toggleDiffView,
    toggleWhitespace,
    toggleWordWrap,
    sidebarOpen,
    rightPanelOpen,
    diffView,
    showWhitespace,
    wordWrap,
    toggleKeyboardShortcuts,
    setPRListFilters,
    resetPRListFilters,
  } = useUIStore();
  const { logout, user } = useAuthStore();
  const { 
    selectedRepo, 
    pullRequests,
    createPullRequest,
    fetchPullRequests,
    markAllAsRead,
    starRepository,
    unstarRepository,
  } = usePRStore();
  const { syncAll, isSyncing, clearSyncCache } = useSyncStore();
  
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Define all commands
  const commands: CommandItem[] = useMemo(() => [
    // Navigation commands
    {
      id: "nav-home",
      label: "Go to Home",
      icon: Home,
      shortcut: "⌘H",
      category: "navigation",
      action: () => {
        navigate("/");
        toggleCommandPalette();
      },
      keywords: ["home", "dashboard", "main"],
    },
    {
      id: "nav-pulls",
      label: "Go to Pull Requests",
      icon: GitPullRequest,
      shortcut: "⌘1",
      category: "navigation",
      action: () => {
        navigate("/pulls");
        toggleCommandPalette();
      },
      keywords: ["pr", "pulls", "merge requests"],
    },
    {
      id: "nav-issues",
      label: "Go to Issues",
      icon: AlertCircle,
      shortcut: "⌘2",
      category: "navigation",
      action: () => {
        navigate("/issues");
        toggleCommandPalette();
      },
      keywords: ["bugs", "tasks", "tickets"],
    },
    {
      id: "nav-branches",
      label: "Go to Branches",
      icon: GitBranch,
      shortcut: "⌘3",
      category: "navigation",
      action: () => {
        navigate("/branches");
        toggleCommandPalette();
      },
      keywords: ["branch", "git"],
    },
    {
      id: "nav-settings",
      label: "Go to Settings",
      icon: Settings,
      shortcut: "⌘,",
      category: "navigation",
      action: () => {
        navigate("/settings");
        toggleCommandPalette();
      },
      keywords: ["preferences", "config", "options"],
    },

    // AI Agent navigation
    {
      id: "nav-cursor",
      label: "Open Cursor Agent",
      icon: Bot,
      shortcut: "⌘⇧C",
      category: "ai",
      action: () => {
        navigate("/agents/cursor");
        toggleCommandPalette();
      },
      keywords: ["ai", "cursor", "agent", "assistant"],
    },
    {
      id: "nav-devin",
      label: "Open Devin Agent",
      icon: Code,
      shortcut: "⌘⇧D",
      category: "ai",
      action: () => {
        navigate("/agents/devin");
        toggleCommandPalette();
      },
      keywords: ["ai", "devin", "agent", "assistant"],
    },
    {
      id: "nav-chatgpt",
      label: "Open ChatGPT Agent",
      icon: MessageSquare,
      shortcut: "⌘⇧G",
      category: "ai",
      action: () => {
        navigate("/agents/chatgpt");
        toggleCommandPalette();
      },
      keywords: ["ai", "chatgpt", "openai", "agent", "assistant"],
    },

    // PR Actions
    {
      id: "pr-create",
      label: "Create New Pull Request",
      icon: Plus,
      shortcut: "⌘N",
      category: "pr",
      action: () => {
        if (selectedRepo) {
          createPullRequest();
          toggleCommandPalette();
        }
      },
      description: "Create a new pull request in the selected repository",
      keywords: ["new", "create", "pr", "pull request"],
    },
    {
      id: "pr-refresh",
      label: "Refresh Pull Requests",
      icon: RefreshCw,
      shortcut: "⌘R",
      category: "pr",
      action: () => {
        if (selectedRepo) {
          fetchPullRequests(selectedRepo.owner, selectedRepo.name);
          toggleCommandPalette();
        }
      },
      keywords: ["reload", "update", "fetch"],
    },
    {
      id: "pr-mark-read",
      label: "Mark All PRs as Read",
      icon: Check,
      shortcut: "⌘⇧M",
      category: "pr",
      action: () => {
        markAllAsRead();
        toggleCommandPalette();
      },
      keywords: ["read", "mark", "seen"],
    },
    {
      id: "pr-star-repo",
      label: selectedRepo?.stargazers_count !== undefined ? "Star/Unstar Repository" : "Star Repository",
      icon: Star,
      shortcut: "⌘⇧S",
      category: "pr",
      action: () => {
        if (selectedRepo) {
          if (selectedRepo.stargazers_count !== undefined) {
            unstarRepository(selectedRepo.owner, selectedRepo.name);
          } else {
            starRepository(selectedRepo.owner, selectedRepo.name);
          }
          toggleCommandPalette();
        }
      },
      keywords: ["star", "favorite", "bookmark"],
    },

    // View toggles
    {
      id: "view-theme",
      label: `Switch to ${theme === "dark" ? "Light" : "Dark"} Theme`,
      icon: theme === "dark" ? Sun : Moon,
      shortcut: "⌘⇧T",
      category: "view",
      action: () => {
        toggleTheme();
        toggleCommandPalette();
      },
      keywords: ["theme", "dark", "light", "mode"],
    },
    {
      id: "view-sidebar",
      label: `${sidebarOpen ? "Hide" : "Show"} Sidebar`,
      icon: PanelLeft,
      shortcut: "⌘B",
      category: "view",
      action: () => {
        toggleSidebar();
        toggleCommandPalette();
      },
      keywords: ["sidebar", "panel", "navigation"],
    },
    {
      id: "view-right-panel",
      label: `${rightPanelOpen ? "Hide" : "Show"} Right Panel`,
      icon: PanelRight,
      shortcut: "⌘⇧B",
      category: "view",
      action: () => {
        toggleRightPanel();
        toggleCommandPalette();
      },
      keywords: ["panel", "right", "details"],
    },
    {
      id: "view-diff",
      label: `Switch to ${diffView === "unified" ? "Split" : "Unified"} Diff View`,
      icon: Eye,
      shortcut: "⌘D",
      category: "view",
      action: () => {
        toggleDiffView();
        toggleCommandPalette();
      },
      keywords: ["diff", "view", "split", "unified"],
    },
    {
      id: "view-whitespace",
      label: `${showWhitespace ? "Hide" : "Show"} Whitespace`,
      icon: FileText,
      shortcut: "⌘W",
      category: "view",
      action: () => {
        toggleWhitespace();
        toggleCommandPalette();
      },
      keywords: ["whitespace", "spaces", "tabs"],
    },
    {
      id: "view-wrap",
      label: `${wordWrap ? "Disable" : "Enable"} Word Wrap`,
      icon: FileText,
      shortcut: "⌘⇧W",
      category: "view",
      action: () => {
        toggleWordWrap();
        toggleCommandPalette();
      },
      keywords: ["wrap", "word", "text"],
    },

    // Search and Filter
    {
      id: "search-filter-author",
      label: "Filter by Author",
      icon: User,
      shortcut: "⌘F",
      category: "search",
      action: () => {
        // This would open a author filter dialog
        toggleCommandPalette();
      },
      keywords: ["filter", "author", "user", "creator"],
    },
    {
      id: "search-filter-status",
      label: "Filter by Status",
      icon: Filter,
      shortcut: "⌘⇧F",
      category: "search",
      action: () => {
        // This would open a status filter dialog
        toggleCommandPalette();
      },
      keywords: ["filter", "status", "open", "closed", "merged"],
    },
    {
      id: "search-sort",
      label: "Change Sort Order",
      icon: SortDesc,
      shortcut: "⌘S",
      category: "search",
      action: () => {
        // Cycle through sort options
        const sortOptions = ["updated", "created", "comments", "reactions"];
        const currentSort = useUIStore.getState().prListFilters.sortBy;
        const currentIndex = sortOptions.indexOf(currentSort);
        const nextIndex = (currentIndex + 1) % sortOptions.length;
        setPRListFilters({ sortBy: sortOptions[nextIndex] as any });
        toggleCommandPalette();
      },
      keywords: ["sort", "order", "arrange"],
    },
    {
      id: "search-reset",
      label: "Reset All Filters",
      icon: X,
      shortcut: "⌘⇧R",
      category: "search",
      action: () => {
        resetPRListFilters();
        toggleCommandPalette();
      },
      keywords: ["reset", "clear", "filters"],
    },

    // Sync actions
    {
      id: "sync-all",
      label: "Sync All Data",
      icon: RefreshCw,
      shortcut: "⌘⇧U",
      category: "sync",
      action: () => {
        syncAll();
        toggleCommandPalette();
      },
      keywords: ["sync", "refresh", "update", "fetch"],
    },
    {
      id: "sync-clear-cache",
      label: "Clear Sync Cache",
      icon: Trash2,
      category: "sync",
      action: () => {
        clearSyncCache();
        toggleCommandPalette();
      },
      keywords: ["clear", "cache", "reset"],
    },

    // User actions
    {
      id: "user-shortcuts",
      label: "Show Keyboard Shortcuts",
      icon: Keyboard,
      shortcut: "⌘/",
      category: "user",
      action: () => {
        toggleKeyboardShortcuts();
        toggleCommandPalette();
      },
      keywords: ["keyboard", "shortcuts", "hotkeys", "help"],
    },
    {
      id: "user-notifications",
      label: "View Notifications",
      icon: Bell,
      shortcut: "⌘⇧N",
      category: "user",
      action: () => {
        // Would open notifications panel
        toggleCommandPalette();
      },
      keywords: ["notifications", "alerts", "messages"],
    },
    {
      id: "user-logout",
      label: "Sign Out",
      icon: LogOut,
      category: "user",
      action: () => {
        logout();
        toggleCommandPalette();
      },
      keywords: ["logout", "signout", "exit"],
    },

    // Quick actions
    {
      id: "quick-copy-url",
      label: "Copy Current URL",
      icon: Copy,
      shortcut: "⌘⇧L",
      category: "pr",
      action: () => {
        navigator.clipboard.writeText(window.location.href);
        toggleCommandPalette();
      },
      keywords: ["copy", "url", "link", "share"],
    },
    {
      id: "quick-open-github",
      label: "Open in GitHub",
      icon: ExternalLink,
      shortcut: "⌘O",
      category: "pr",
      action: () => {
        if (selectedRepo) {
          window.open(`https://github.com/${selectedRepo.full_name}`, "_blank");
          toggleCommandPalette();
        }
      },
      keywords: ["github", "open", "external", "browser"],
    },
  ], [
    theme,
    sidebarOpen,
    rightPanelOpen,
    diffView,
    showWhitespace,
    wordWrap,
    selectedRepo,
    navigate,
    toggleCommandPalette,
    toggleTheme,
    toggleSidebar,
    toggleRightPanel,
    toggleDiffView,
    toggleWhitespace,
    toggleWordWrap,
    toggleKeyboardShortcuts,
    logout,
    syncAll,
    clearSyncCache,
    fetchPullRequests,
    markAllAsRead,
    createPullRequest,
    starRepository,
    unstarRepository,
    setPRListFilters,
    resetPRListFilters,
  ]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    
    const searchLower = search.toLowerCase();
    return commands.filter(cmd => {
      const labelMatch = cmd.label.toLowerCase().includes(searchLower);
      const categoryMatch = cmd.category.toLowerCase().includes(searchLower);
      const keywordMatch = cmd.keywords?.some(k => k.toLowerCase().includes(searchLower));
      const shortcutMatch = cmd.shortcut?.toLowerCase().includes(searchLower);
      
      return labelMatch || categoryMatch || keywordMatch || shortcutMatch;
    });
  }, [commands, search]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const categoryLabels: Record<string, string> = {
    navigation: "Navigation",
    pr: "Pull Requests",
    view: "View Options",
    search: "Search & Filter",
    sync: "Sync & Refresh",
    user: "User Actions",
    ai: "AI Agents",
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!commandPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts on Cmd/Ctrl key press
      if (e.key === "Meta" || e.key === "Control") {
        setShowShortcuts(true);
        return;
      }

      // Navigation
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        toggleCommandPalette();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Meta" || e.key === "Control") {
        setShowShortcuts(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [commandPaletteOpen, filteredCommands, selectedIndex, toggleCommandPalette]);

  // Focus search input when opened
  useEffect(() => {
    if (commandPaletteOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      setSearch("");
      setSelectedIndex(0);
      setShowShortcuts(false);
    }
  }, [commandPaletteOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredCommands[selectedIndex]) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex, filteredCommands]);

  if (!commandPaletteOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={toggleCommandPalette}
      />

      {/* Command Palette */}
      <div className="fixed inset-x-0 top-20 mx-auto max-w-2xl z-50 px-4">
        <div
          className={cn(
            "rounded-lg shadow-2xl overflow-hidden border",
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          )}
        >
          {/* Search Header */}
          <div
            className={cn(
              "flex items-center px-4 py-3 border-b",
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            )}
          >
            <Search className="w-5 h-5 mr-3 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Type a command or search..."
              className={cn(
                "flex-1 bg-transparent outline-none text-sm",
                theme === "dark" ? "text-gray-100" : "text-gray-900"
              )}
            />
            {showShortcuts && (
              <span className="text-xs text-gray-400 ml-2">
                Hold ⌘ to see shortcuts
              </span>
            )}
          </div>

          {/* Commands List */}
          <div
            ref={listRef}
            className="max-h-96 overflow-y-auto"
          >
            {Object.keys(groupedCommands).length === 0 ? (
              <div
                className={cn(
                  "px-4 py-8 text-center text-sm",
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                )}
              >
                No commands found
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, items]) => (
                <div key={category}>
                  <div
                    className={cn(
                      "px-4 py-2 text-xs font-medium uppercase tracking-wider",
                      theme === "dark"
                        ? "text-gray-400 bg-gray-900/50"
                        : "text-gray-600 bg-gray-50"
                    )}
                  >
                    {categoryLabels[category]}
                  </div>
                  {items.map((cmd, idx) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    const Icon = cmd.icon;
                    return (
                      <div
                        key={cmd.id}
                        data-index={globalIndex}
                        onClick={() => cmd.action()}
                        className={cn(
                          "flex items-center px-4 py-2.5 cursor-pointer transition-colors",
                          globalIndex === selectedIndex
                            ? theme === "dark"
                              ? "bg-gray-700"
                              : "bg-gray-100"
                            : theme === "dark"
                              ? "hover:bg-gray-700/50"
                              : "hover:bg-gray-50"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 mr-3",
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          )}
                        />
                        <div className="flex-1">
                          <div
                            className={cn(
                              "text-sm",
                              theme === "dark" ? "text-gray-100" : "text-gray-900"
                            )}
                          >
                            {cmd.label}
                          </div>
                          {cmd.description && (
                            <div
                              className={cn(
                                "text-xs mt-0.5",
                                theme === "dark" ? "text-gray-400" : "text-gray-600"
                              )}
                            >
                              {cmd.description}
                            </div>
                          )}
                        </div>
                        {(showShortcuts || globalIndex === selectedIndex) && cmd.shortcut && (
                          <kbd
                            className={cn(
                              "px-2 py-1 text-xs rounded font-mono",
                              theme === "dark"
                                ? "bg-gray-900 text-gray-400 border border-gray-600"
                                : "bg-gray-100 text-gray-600 border border-gray-300"
                            )}
                          >
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            className={cn(
              "px-4 py-2 border-t text-xs flex items-center justify-between",
              theme === "dark"
                ? "border-gray-700 text-gray-400"
                : "border-gray-200 text-gray-600"
            )}
          >
            <div className="flex items-center space-x-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>esc Close</span>
            </div>
            <div className="flex items-center space-x-2">
              <Command className="w-3 h-3" />
              <span>Hold for shortcuts</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}