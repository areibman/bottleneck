import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  Search,
  GitBranch,
  GitPullRequest,
  FileText,
  Settings,
  Sun,
  Moon,
  RefreshCw,
  Home,
  ToggleLeft,
  ToggleRight,
  Plus,
  Copy,
  ExternalLink,
  Keyboard,
  LogOut,
  Download,
} from "lucide-react";
import { useUIStore } from "../stores/uiStore";
import { usePRStore } from "../stores/prStore";
import { useAuthStore } from "../stores/authStore";
import { useSyncStore } from "../stores/syncStore";
import { cn } from "../utils/cn";

interface Command {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  shortcut?: string;
  category: string;
  action: () => void;
  keywords?: string[];
}

export default function CommandPalette() {
  const navigate = useNavigate();
  const { commandPaletteOpen, toggleCommandPalette, theme, toggleTheme, toggleSidebar, toggleRightPanel } = useUIStore();
  const { selectedRepo, pullRequests: prMap, goToPR } = usePRStore();
  
  // Convert Map to array for easier handling
  const pullRequests = useMemo(() => Array.from(prMap.values()), [prMap]);
  const { logout } = useAuthStore();
  const { syncAll } = useSyncStore();
  
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Define all available commands
  const commands: Command[] = useMemo(() => [
    // Navigation
    {
      id: "go-to-pulls",
      title: "Go to Pull Requests",
      description: "Navigate to the pull requests list",
      icon: GitPullRequest,
      shortcut: "Cmd+1",
      category: "Navigation",
      action: () => {
        navigate("/pulls");
        toggleCommandPalette();
      },
      keywords: ["pulls", "pr", "list", "navigate"]
    },
    {
      id: "go-to-branches",
      title: "Go to Branches",
      description: "Navigate to the branches view",
      icon: GitBranch,
      shortcut: "Cmd+2",
      category: "Navigation",
      action: () => {
        navigate("/branches");
        toggleCommandPalette();
      },
      keywords: ["branches", "git", "navigate"]
    },
    {
      id: "go-to-issues",
      title: "Go to Issues",
      description: "Navigate to the issues view",
      icon: FileText,
      shortcut: "Cmd+3",
      category: "Navigation",
      action: () => {
        navigate("/issues");
        toggleCommandPalette();
      },
      keywords: ["issues", "bugs", "navigate"]
    },
    {
      id: "go-to-settings",
      title: "Go to Settings",
      description: "Open application settings",
      icon: Settings,
      shortcut: "Cmd+,",
      category: "Navigation",
      action: () => {
        navigate("/settings");
        toggleCommandPalette();
      },
      keywords: ["settings", "preferences", "config"]
    },
    {
      id: "go-home",
      title: "Go Home",
      description: "Navigate to the home page",
      icon: Home,
      shortcut: "Cmd+H",
      category: "Navigation",
      action: () => {
        navigate("/");
        toggleCommandPalette();
      },
      keywords: ["home", "dashboard", "navigate"]
    },

    // View Controls
    {
      id: "toggle-theme",
      title: "Toggle Theme",
      description: `Switch to ${theme === "dark" ? "light" : "dark"} mode`,
      icon: theme === "dark" ? Sun : Moon,
      shortcut: "Cmd+Shift+T",
      category: "View",
      action: () => {
        toggleTheme();
        toggleCommandPalette();
      },
      keywords: ["theme", "dark", "light", "appearance"]
    },
    {
      id: "toggle-sidebar",
      title: "Toggle Sidebar",
      description: "Show or hide the sidebar",
      icon: ToggleLeft,
      shortcut: "Cmd+B",
      category: "View",
      action: () => {
        toggleSidebar();
        toggleCommandPalette();
      },
      keywords: ["sidebar", "panel", "hide", "show"]
    },
    {
      id: "toggle-right-panel",
      title: "Toggle Right Panel",
      description: "Show or hide the right panel",
      icon: ToggleRight,
      shortcut: "Cmd+Shift+B",
      category: "View",
      action: () => {
        toggleRightPanel();
        toggleCommandPalette();
      },
      keywords: ["right panel", "panel", "hide", "show"]
    },

    // Actions
    {
      id: "sync-all",
      title: "Sync All Repositories",
      description: "Refresh data from all repositories",
      icon: RefreshCw,
      shortcut: "Cmd+R",
      category: "Actions",
      action: () => {
        syncAll();
        toggleCommandPalette();
      },
      keywords: ["sync", "refresh", "update", "reload"]
    },
    {
      id: "new-pr",
      title: "Create New Pull Request",
      description: "Start creating a new pull request",
      icon: Plus,
      shortcut: "Cmd+N",
      category: "Actions",
      action: () => {
        if (selectedRepo) {
          window.open(`https://github.com/${selectedRepo.full_name}/compare`, '_blank');
        }
        toggleCommandPalette();
      },
      keywords: ["new", "create", "pull request", "pr"]
    },
    {
      id: "clone-repo",
      title: "Clone Repository",
      description: "Clone the current repository",
      icon: Download,
      shortcut: "Cmd+Shift+C",
      category: "Actions",
      action: () => {
        if (selectedRepo) {
          navigator.clipboard.writeText(`git clone ${selectedRepo.clone_url}`);
          // You could also trigger a native clone dialog here
        }
        toggleCommandPalette();
      },
      keywords: ["clone", "download", "git", "repository"]
    },

    // Quick Access
    {
      id: "open-github",
      title: "Open in GitHub",
      description: "Open current repository in GitHub",
      icon: ExternalLink,
      shortcut: "Cmd+Shift+O",
      category: "Quick Access",
      action: () => {
        if (selectedRepo) {
          window.open(selectedRepo.html_url, '_blank');
        }
        toggleCommandPalette();
      },
      keywords: ["github", "open", "external", "browser"]
    },
    {
      id: "copy-repo-url",
      title: "Copy Repository URL",
      description: "Copy the repository URL to clipboard",
      icon: Copy,
      shortcut: "Cmd+Shift+U",
      category: "Quick Access",
      action: () => {
        if (selectedRepo) {
          navigator.clipboard.writeText(selectedRepo.html_url);
        }
        toggleCommandPalette();
      },
      keywords: ["copy", "url", "clipboard", "repository"]
    },
    {
      id: "show-shortcuts",
      title: "Show Keyboard Shortcuts",
      description: "Display all available keyboard shortcuts",
      icon: Keyboard,
      shortcut: "Cmd+/",
      category: "Help",
      action: () => {
        // This would open a shortcuts help dialog
        useUIStore.getState().toggleKeyboardShortcuts();
        toggleCommandPalette();
      },
      keywords: ["shortcuts", "keyboard", "help", "hotkeys"]
    },

    // User Actions
    {
      id: "logout",
      title: "Sign Out",
      description: "Sign out of your GitHub account",
      icon: LogOut,
      category: "User",
      action: () => {
        logout();
        toggleCommandPalette();
      },
      keywords: ["logout", "sign out", "exit", "disconnect"]
    },

    // PR-specific commands (when viewing PRs)
    ...(pullRequests.slice(0, 5).map((pr, index) => ({
      id: `go-to-pr-${pr.number}`,
      title: `Go to PR #${pr.number}`,
      description: pr.title,
      icon: GitPullRequest,
      shortcut: `Cmd+${index + 1}`,
      category: "Recent PRs",
      action: () => {
        goToPR(pr.owner, pr.repo, pr.number);
        toggleCommandPalette();
      },
      keywords: ["pr", "pull request", pr.title.toLowerCase(), `#${pr.number}`]
    }))),
  ], [theme, selectedRepo, pullRequests, toggleTheme, toggleSidebar, toggleRightPanel, syncAll, toggleCommandPalette, logout, goToPR]);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    
    const lowerQuery = query.toLowerCase();
    return commands.filter(command => 
      command.title.toLowerCase().includes(lowerQuery) ||
      command.description.toLowerCase().includes(lowerQuery) ||
      command.category.toLowerCase().includes(lowerQuery) ||
      (command.keywords && command.keywords.some(keyword => keyword.includes(lowerQuery)))
    );
  }, [commands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach(command => {
      if (!groups[command.category]) {
        groups[command.category] = [];
      }
      groups[command.category].push(command);
    });
    return groups;
  }, [filteredCommands]);

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!commandPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        toggleCommandPalette();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, filteredCommands, selectedIndex, toggleCommandPalette]);

  // Auto-focus input when opened
  useEffect(() => {
    if (commandPaletteOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50">
      <div
        className={cn(
          "w-full max-w-2xl mx-4 rounded-lg shadow-2xl border",
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        )}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn(
              "flex-1 bg-transparent outline-none text-sm",
              theme === "dark" ? "text-gray-100 placeholder-gray-400" : "text-gray-900 placeholder-gray-500"
            )}
          />
          <div className={cn(
            "text-xs px-2 py-1 rounded",
            theme === "dark" ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-600"
          )}>
            ESC to close
          </div>
        </div>

        {/* Commands List */}
        <div 
          ref={listRef}
          className="max-h-96 overflow-y-auto"
        >
          {Object.keys(groupedCommands).length === 0 ? (
            <div className={cn(
              "px-4 py-8 text-center text-sm",
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            )}>
              No commands found for "{query}"
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, categoryCommands]) => (
              <div key={category}>
                {/* Category Header */}
                <div className={cn(
                  "px-4 py-2 text-xs font-medium uppercase tracking-wider border-b",
                  theme === "dark" 
                    ? "text-gray-400 bg-gray-750 border-gray-700" 
                    : "text-gray-600 bg-gray-50 border-gray-200"
                )}>
                  {category}
                </div>
                
                {/* Category Commands */}
                {categoryCommands.map((command, index) => {
                  const globalIndex = filteredCommands.indexOf(command);
                  const isSelected = globalIndex === selectedIndex;
                  
                  return (
                    <div
                      key={command.id}
                      data-index={globalIndex}
                      onClick={() => command.action()}
                      className={cn(
                        "flex items-center px-4 py-3 cursor-pointer transition-colors",
                        isSelected
                          ? theme === "dark"
                            ? "bg-blue-600/20 text-blue-300"
                            : "bg-blue-50 text-blue-700"
                          : theme === "dark"
                            ? "hover:bg-gray-700 text-gray-100"
                            : "hover:bg-gray-50 text-gray-900"
                      )}
                    >
                      <command.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{command.title}</div>
                        <div className={cn(
                          "text-sm truncate",
                          isSelected
                            ? theme === "dark" ? "text-blue-200" : "text-blue-600"
                            : theme === "dark" ? "text-gray-400" : "text-gray-600"
                        )}>
                          {command.description}
                        </div>
                      </div>
                      {command.shortcut && (
                        <div className={cn(
                          "text-xs px-2 py-1 rounded ml-3 flex-shrink-0",
                          isSelected
                            ? theme === "dark" ? "bg-blue-700 text-blue-200" : "bg-blue-100 text-blue-700"
                            : theme === "dark" ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-600"
                        )}>
                          {command.shortcut.replace("Cmd", "⌘")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Click outside to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={toggleCommandPalette}
      />
    </div>
  );
}