import React, { useEffect, useMemo, useState } from "react";
import { Command as CommandIcon, Search, X } from "lucide-react";
import { cn } from "../utils/cn";
import { useUIStore } from "../stores/uiStore";
import { useSyncStore } from "../stores/syncStore";
import { useNavigate } from "react-router-dom";

interface Command {
  id: string;
  name: string;
  keywords: string;
  shortcut?: string;
  section?: string;
  action: () => void;
  preview?: React.ReactNode;
}

const commands: Command[] = [
  {
    id: "toggle-sidebar",
    name: "Toggle Sidebar",
    keywords: "sidebar view layout",
    shortcut: "⌘B",
    action: () => useUIStore.getState().toggleSidebar(),
    preview: <div>Show / hide sidebar</div>,
  },
  {
    id: "toggle-right-panel",
    name: "Toggle Right Panel",
    keywords: "panel view layout",
    shortcut: "⌘⇧B",
    action: () => useUIStore.getState().toggleRightPanel(),
    preview: <div>Show / hide right panel</div>,
  },
  {
    id: "toggle-theme",
    name: "Toggle Theme",
    keywords: "theme dark light appearance",
    shortcut: "⌘⇧T",
    action: () => useUIStore.getState().toggleTheme(),
    preview: <div>Switch between light / dark mode</div>,
  },
  {
    id: "toggle-diff-view",
    name: "Toggle Diff View",
    keywords: "diff unified split",
    shortcut: "⌘⇧D",
    action: () => useUIStore.getState().toggleDiffView(),
    preview: <div>Switch between unified / split diff</div>,
  },
  {
    id: "toggle-whitespace",
    name: "Toggle Whitespace",
    keywords: "diff whitespace",
    shortcut: "⌘⇧W",
    action: () => useUIStore.getState().toggleWhitespace(),
    preview: <div>Show / hide whitespace changes in diff</div>,
  },
  {
    id: "toggle-wordwrap",
    name: "Toggle Word Wrap",
    keywords: "diff word wrap",
    shortcut: "⌘⇧L",
    action: () => useUIStore.getState().toggleWordWrap(),
    preview: <div>Enable / disable word wrap</div>,
  },
  {
    id: "sync-all",
    name: "Sync Repositories",
    keywords: "sync refresh",
    shortcut: "⌘R",
    action: () => useSyncStore.getState().syncAll(),
    preview: <div>Trigger a full sync of all repositories</div>,
  },
  {
    id: "open-settings",
    name: "Open Settings",
    keywords: "settings preferences",
    shortcut: "⌘,",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/settings");
    },
    preview: <div>Navigate to settings page</div>,
  },
  {
    id: "nav-pull-requests",
    name: "Go to Pull Requests",
    keywords: "navigate pulls pr",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/pulls");
    },
    preview: <div>Open Pull Request list</div>,
  },
  {
    id: "nav-branches",
    name: "Go to Branches",
    keywords: "navigate branches",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/branches");
    },
    preview: <div>Open branches view</div>,
  },
  {
    id: "nav-issues",
    name: "Go to Issues",
    keywords: "navigate issues",
    action: () => {
      const nav = window.__commandNavigate;
      if (nav) nav("/issues");
    },
    preview: <div>Open issues list</div>,
  },
  {
    id: "show-shortcuts",
    name: "Show Keyboard Shortcuts",
    keywords: "help shortcuts",
    shortcut: "⌘/",
    action: () => useUIStore.getState().toggleKeyboardShortcuts(),
    preview: <div>Display keyboard shortcuts help</div>,
  },
];

export default function CommandPalette() {
  const { commandPaletteOpen, toggleCommandPalette } = useUIStore();
  const navigate = useNavigate();
  // Expose navigate so that commands array can use it without hooks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    (window as any).__commandNavigate = navigate;
    return () => {
      delete (window as any).__commandNavigate;
    };
  }, [navigate]);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPreviewKey, setIsPreviewKey] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) => c.name.toLowerCase().includes(q) || c.keywords.includes(q),
    );
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        filtered[selectedIndex]?.action();
        toggleCommandPalette();
      }
      if (e.metaKey || e.ctrlKey) {
        setIsPreviewKey(true);
      } else {
        setIsPreviewKey(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [commandPaletteOpen, filtered, selectedIndex, toggleCommandPalette]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-24">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={toggleCommandPalette}
      />
      <div
        className="relative w-full max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center px-4 border-b h-12 gap-2 border-gray-200 dark:border-gray-700">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            autoFocus
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            placeholder="Type a command or search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={toggleCommandPalette} className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No commands</li>
          )}
          {filtered.map((cmd, idx) => (
            <li
              key={cmd.id}
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => {
                cmd.action();
                toggleCommandPalette();
              }}
              className={cn(
                "flex items-center justify-between px-4 py-2 cursor-pointer text-sm",
                idx === selectedIndex
                  ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
              )}
            >
              <span>{cmd.name}</span>
              {cmd.shortcut && <span className="opacity-60">{cmd.shortcut}</span>}
            </li>
          ))}
        </ul>
        {isPreviewKey && filtered[selectedIndex]?.preview && (
          <div
            className="border-t px-4 py-3 text-sm border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            {filtered[selectedIndex].preview}
          </div>
        )}
      </div>
    </div>
  );
}