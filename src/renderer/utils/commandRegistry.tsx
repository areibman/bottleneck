import React from "react";
import { useUIStore } from "../stores/uiStore";
import { useSyncStore } from "../stores/syncStore";
import { useAuthStore } from "../stores/authStore";

export type CommandItem = {
  id: string;
  title: string;
  description?: string;
  shortcut?: string;
  keywords?: string[];
  run: () => void | Promise<void>;
  preview?: () => React.ReactNode;
};

export function getCommandItems(): CommandItem[] {
  const ui = useUIStore.getState();
  const sync = useSyncStore.getState();
  const auth = useAuthStore.getState();

  return [
    {
      id: "toggle-sidebar",
      title: "Toggle Sidebar",
      description: "Show or hide the left sidebar",
      shortcut: "Cmd/Ctrl+B",
      keywords: ["sidebar", "left", "panel"],
      run: () => ui.toggleSidebar(),
      preview: () => <div className="text-sm">Sidebar is currently {ui.sidebarOpen ? "visible" : "hidden"}.</div>,
    },
    {
      id: "toggle-right-panel",
      title: "Toggle Right Panel",
      description: "Show or hide the right details panel",
      shortcut: "Cmd/Ctrl+Shift+B",
      keywords: ["right", "panel", "details"],
      run: () => ui.toggleRightPanel(),
      preview: () => <div className="text-sm">Right panel is {ui.rightPanelOpen ? "open" : "closed"}.</div>,
    },
    {
      id: "open-settings",
      title: "Open Settings",
      description: "Navigate to application settings",
      shortcut: "Cmd+,",
      keywords: ["preferences", "options"],
      run: () => {
        window.location.href = "/settings";
      },
      preview: () => <div className="text-sm">Go to <span className="font-medium">Settings</span> view.</div>,
    },
    {
      id: "sync-all",
      title: "Sync All",
      description: "Fetch repositories and refresh pull requests",
      shortcut: "Cmd/Ctrl+Shift+S",
      keywords: ["refresh", "update"],
      run: () => sync.syncAll(),
      preview: () => (
        <div className="text-sm">
          {sync.isSyncing ? (
            <>
              Sync in progress… {Math.round(sync.syncProgress)}%
              {sync.syncMessage && <div className="mt-1 text-xs opacity-80">{sync.syncMessage}</div>}
            </>
          ) : (
            <>Last sync: {sync.lastSyncTime ? sync.lastSyncTime.toLocaleString() : "Never"}</>
          )}
        </div>
      ),
    },
    {
      id: "go-pulls",
      title: "Go to Pull Requests",
      description: "Open the pull requests list",
      shortcut: "",
      keywords: ["navigate", "prs", "pulls"],
      run: () => {
        window.location.href = "/pulls";
      },
      preview: () => <div className="text-sm">Navigate to <span className="font-medium">Pull Requests</span>.</div>,
    },
    {
      id: "go-branches",
      title: "Go to Branches",
      description: "Open the branches view",
      shortcut: "",
      keywords: ["navigate", "branches"],
      run: () => {
        window.location.href = "/branches";
      },
      preview: () => <div className="text-sm">Navigate to <span className="font-medium">Branches</span>.</div>,
    },
    {
      id: "go-issues",
      title: "Go to Issues",
      description: "Open the issues list",
      shortcut: "",
      keywords: ["navigate", "issues"],
      run: () => {
        window.location.href = "/issues";
      },
      preview: () => <div className="text-sm">Navigate to <span className="font-medium">Issues</span>.</div>,
    },
    {
      id: "toggle-theme",
      title: "Toggle Theme",
      description: "Switch between dark and light themes",
      shortcut: "",
      keywords: ["appearance", "dark", "light", "theme"],
      run: () => ui.toggleTheme(),
      preview: () => <div className="text-sm">Current theme: <span className="font-medium">{ui.theme}</span></div>,
    },
    {
      id: "toggle-diff-view",
      title: "Toggle Diff View",
      description: "Switch diff layout between split and unified",
      shortcut: "D",
      keywords: ["diff", "unified", "split"],
      run: () => ui.toggleDiffView(),
      preview: () => <div className="text-sm">Diff view: <span className="font-medium">{ui.diffView}</span></div>,
    },
    {
      id: "toggle-whitespace",
      title: "Toggle Whitespace",
      description: "Show or hide whitespace characters in diffs",
      shortcut: "W",
      keywords: ["whitespace", "diff"],
      run: () => ui.toggleWhitespace(),
      preview: () => <div className="text-sm">Whitespace: <span className="font-medium">{ui.showWhitespace ? "visible" : "hidden"}</span></div>,
    },
    {
      id: "toggle-word-wrap",
      title: "Toggle Word Wrap",
      description: "Wrap long lines in diffs and editors",
      shortcut: "",
      keywords: ["wrap", "editor", "diff"],
      run: () => ui.toggleWordWrap(),
      preview: () => <div className="text-sm">Word wrap: <span className="font-medium">{ui.wordWrap ? "on" : "off"}</span></div>,
    },
    {
      id: "show-shortcuts",
      title: "Show Keyboard Shortcuts",
      description: "Open the keyboard shortcuts reference",
      shortcut: "Cmd/Ctrl+/",
      keywords: ["help", "shortcuts", "hotkeys"],
      run: () => ui.toggleKeyboardShortcuts(),
      preview: () => <div className="text-sm">View keyboard shortcut reference.</div>,
    },
    {
      id: "sign-out",
      title: "Sign Out",
      description: "Log out of your GitHub account",
      shortcut: "",
      keywords: ["logout", "auth"],
      run: () => auth.logout(),
      preview: () => <div className="text-sm">You will need to reauthenticate to use GitHub features.</div>,
    },
  ];
}

