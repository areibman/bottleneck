/* @jsxRuntime classic */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command, Moon, Sun, Sidebar as SidebarIcon, PanelRight, Search, GitBranch, RefreshCw, Keyboard, Layout, ListFilter, ChevronRight } from "lucide-react";
import { useUIStore } from "../stores/uiStore";
import { usePRStore } from "../stores/prStore";
import { useSyncStore } from "../stores/syncStore";
import { cn } from "../utils/cn";

export type CommandActionId =
  | "toggle-theme"
  | "toggle-sidebar"
  | "toggle-right-panel"
  | "open-palette"
  | "open-shortcuts"
  | "go-pulls"
  | "go-issues"
  | "go-branches"
  | "go-settings"
  | "sync-all"
  | "repo-switcher"
  | "search-pr"
  | "toggle-diff-view"
  | "toggle-whitespace"
  | "toggle-word-wrap";

export interface PaletteCommand {
  id: CommandActionId;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

function useIsMetaPressed() {
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) setPressed(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) setPressed(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", () => setPressed(false));
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);
  return pressed;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const {
    theme,
    toggleTheme,
    toggleSidebar,
    toggleRightPanel,
    toggleCommandPalette,
    toggleKeyboardShortcuts,
    toggleDiffView,
    toggleWhitespace,
    toggleWordWrap,
  } = useUIStore();
  const { repositories, selectedRepo, setSelectedRepo, fetchPullRequests } = usePRStore();
  const { syncAll, isSyncing } = useSyncStore();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMetaPressed = useIsMetaPressed();

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setActiveIdx(0);
    }
  }, [isOpen]);

  const baseCommands: PaletteCommand[] = useMemo(() => [
    {
      id: "search-pr",
      title: "Search pull requests",
      subtitle: selectedRepo ? `${selectedRepo.full_name}` : "Select a repo first",
      icon: <Search className="w-4 h-4" />,
      keywords: ["find", "filter", "pull", "requests", "prs"],
    },
    {
      id: "repo-switcher",
      title: "Switch repository",
      subtitle: selectedRepo ? `Current: ${selectedRepo.full_name}` : "No repo selected",
      icon: <GitBranch className="w-4 h-4" />,
      keywords: ["repo", "repository", "switch"],
    },
    { id: "go-pulls", title: "Go to Pull Requests", icon: <Layout className="w-4 h-4" /> },
    { id: "go-issues", title: "Go to Issues", icon: <ListFilter className="w-4 h-4" /> },
    { id: "go-branches", title: "Go to Branches", icon: <GitBranch className="w-4 h-4" /> },
    { id: "go-settings", title: "Open Settings", icon: <ChevronRight className="w-4 h-4" /> },
    { id: "toggle-theme", title: `Switch to ${theme === "dark" ? "light" : "dark"} theme`, icon: theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" /> },
    { id: "toggle-sidebar", title: "Toggle sidebar", icon: <SidebarIcon className="w-4 h-4" /> },
    { id: "toggle-right-panel", title: "Toggle right panel", icon: <PanelRight className="w-4 h-4" /> },
    { id: "toggle-diff-view", title: "Toggle diff view (unified/split)", icon: <Layout className="w-4 h-4" /> },
    { id: "toggle-whitespace", title: "Toggle whitespace", icon: <Command className="w-4 h-4" /> },
    { id: "toggle-word-wrap", title: "Toggle word wrap", icon: <Command className="w-4 h-4" /> },
    { id: "open-shortcuts", title: "Show keyboard shortcuts", icon: <Keyboard className="w-4 h-4" /> },
    { id: "sync-all", title: isSyncing ? "Syncing…" : "Sync all", icon: <RefreshCw className="w-4 h-4" /> },
  ], [theme, selectedRepo, isSyncing]);

  const repoCommands: PaletteCommand[] = useMemo(() => {
    return repositories.map((repo: { id: number; owner: string; name: string; full_name: string; description: string | null }) => ({
      id: "repo-switcher",
      title: repo.full_name,
      subtitle: repo.description || "",
      icon: <GitBranch className="w-4 h-4" />,
      keywords: [repo.owner, repo.name, repo.full_name],
    }));
  }, [repositories]);

  const allCommands = useMemo(() => {
    if (query.startsWith(">repo ")) {
      const q = query.replace(">repo ", "").toLowerCase();
      return repoCommands.filter((c) => c.title.toLowerCase().includes(q));
    }
    const q = query.toLowerCase();
    return baseCommands.filter((c) =>
      [c.title, c.subtitle, ...(c.keywords || [])]
        .filter(Boolean)
        .some((t) => (t || "").toLowerCase().includes(q)),
    );
  }, [query, baseCommands, repoCommands]);

  useEffect(() => {
    if (activeIdx >= allCommands.length) setActiveIdx(Math.max(0, allCommands.length - 1));
  }, [allCommands, activeIdx]);

  const runCommand = async (command: PaletteCommand) => {
    switch (command.id) {
      case "toggle-theme":
        toggleTheme();
        break;
      case "toggle-sidebar":
        toggleSidebar();
        break;
      case "toggle-right-panel":
        toggleRightPanel();
        break;
      case "open-shortcuts":
        toggleKeyboardShortcuts();
        break;
      case "go-pulls":
        navigate("/pulls");
        break;
      case "go-issues":
        navigate("/issues");
        break;
      case "go-branches":
        navigate("/branches");
        break;
      case "go-settings":
        navigate("/settings");
        break;
      case "sync-all":
        await syncAll();
        break;
      case "toggle-diff-view":
        toggleDiffView();
        break;
      case "toggle-whitespace":
        toggleWhitespace();
        break;
      case "toggle-word-wrap":
        toggleWordWrap();
        break;
      case "repo-switcher": {
        const selected = repositories.find((r) => r.full_name === command.title);
        if (selected) {
          setSelectedRepo(selected);
          await fetchPullRequests(selected.owner, selected.name, true);
          navigate("/pulls");
        }
        break;
      }
      case "search-pr": {
        // If query contains a number, try to navigate to that PR in current repo
        const num = parseInt(query.replace(/[^0-9]/g, ""), 10);
        if (selectedRepo && !Number.isNaN(num)) {
          navigate(`/pulls/${selectedRepo.owner}/${selectedRepo.name}/${num}`);
        }
        break;
      }
    }
    toggleCommandPalette();
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, allCommands.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const selected = allCommands[activeIdx];
      if (selected) runCommand(selected);
      return;
    }
  };

  if (!isOpen) return null;

  const selected = allCommands[activeIdx];

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-24 -translate-x-1/2 w-[720px] max-w-[92vw]">
        <div className={cn("rounded-lg overflow-hidden border shadow-2xl", theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}> 
          <div className={cn("flex items-center px-3", theme === "dark" ? "border-b border-gray-700" : "border-b border-gray-200")}> 
            <Command className="w-4 h-4 opacity-70" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a command… (e.g., 'repo', 'sync', 'pull 123')"
              className={cn("flex-1 px-2 py-2 text-sm bg-transparent outline-none", theme === "dark" ? "text-white placeholder:text-gray-400" : "text-gray-900 placeholder:text-gray-400")}
            />
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded ml-2", theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700")}>{isMetaPressed ? "Preview" : "Hold ⌘/Ctrl for preview"}</span>
          </div>

          <div className="flex" style={{ maxHeight: 360 }}>
            <div className="flex-1 overflow-y-auto">
              {allCommands.length === 0 ? (
                <div className={cn("px-3 py-6 text-sm text-center", theme === "dark" ? "text-gray-400" : "text-gray-600")}>No commands found</div>
              ) : (
                allCommands.map((cmd: PaletteCommand, idx: number) => (
                  <button
                    key={`${cmd.id}-${cmd.title}-${idx}`}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => runCommand(cmd)}
                    className={cn(
                      "w-full flex items-start gap-3 px-3 py-2 text-left",
                      idx === activeIdx ? (theme === "dark" ? "bg-gray-700" : "bg-gray-100") : ""
                    )}
                  >
                    <div className={cn("mt-0.5", idx === activeIdx ? "opacity-100" : "opacity-70")}>{cmd.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{cmd.title}</div>
                      {cmd.subtitle && (
                        <div className={cn("text-xs truncate", theme === "dark" ? "text-gray-400" : "text-gray-600")}>{cmd.subtitle}</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {isMetaPressed && (
              <div className={cn("w-[260px] border-l p-3 hidden md:block", theme === "dark" ? "border-gray-700" : "border-gray-200")}> 
                {!selected ? (
                  <div className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-600")}>Hold ⌘/Ctrl to preview</div>
                ) : selected.id === "repo-switcher" ? (
                  <div>
                    <div className="text-xs font-semibold mb-2">Repositories</div>
                    <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 300 }}>
                      {repositories.slice(0, 20).map((r: { id: number; full_name: string }) => (
                        <div key={r.id} className={cn("text-xs", theme === "dark" ? "text-gray-300" : "text-gray-800")}>{r.full_name}</div>
                      ))}
                    </div>
                  </div>
                ) : selected.id === "search-pr" ? (
                  <div>
                    <div className="text-xs font-semibold mb-2">Hint</div>
                    <div className={cn("text-xs", theme === "dark" ? "text-gray-300" : "text-gray-800")}>Type a PR number to jump. Example: "123"</div>
                  </div>
                ) : selected.id === "sync-all" ? (
                  <div>
                    <div className="text-xs font-semibold mb-2">Sync</div>
                    <div className={cn("text-xs", theme === "dark" ? "text-gray-300" : "text-gray-800")}>{isSyncing ? "Currently syncing repositories…" : "Fetch latest repos and PRs."}</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-semibold mb-2">Command</div>
                    <div className={cn("text-xs", theme === "dark" ? "text-gray-300" : "text-gray-800")}>{selected.title}</div>
                    {selected.subtitle && (
                      <div className={cn("text-[11px] mt-1", theme === "dark" ? "text-gray-400" : "text-gray-600")}>{selected.subtitle}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;

