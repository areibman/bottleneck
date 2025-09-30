import { useUIStore } from "../stores/uiStore";

export function setupKeyboardShortcuts() {
  if (!window.electron) {
    console.warn(
      "window.electron not available, skipping keyboard shortcuts setup",
    );
    return () => {};
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const {
      toggleSidebar,
      toggleRightPanel,
      toggleCommandPalette,
      toggleKeyboardShortcuts,
    } = useUIStore.getState();

    // Command/Ctrl key combinations
    if (e.metaKey || e.ctrlKey) {
      // Toggle sidebar (Cmd/Ctrl + B)
      if (e.key === "b" && !e.shiftKey) {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Toggle right panel (Cmd/Ctrl + Shift + B)
      if (e.key === "b" && e.shiftKey) {
        e.preventDefault();
        toggleRightPanel();
        return;
      }

      // Open command palette (Cmd/Ctrl + Shift + P)
      if (e.key === "p" && e.shiftKey) {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Show keyboard shortcuts (Cmd/Ctrl + /)
      if (e.key === "/") {
        e.preventDefault();
        toggleKeyboardShortcuts();
        return;
      }

      // Toggle theme (Cmd/Ctrl + Shift + T)
      if (e.key === "t" && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleTheme();
        return;
      }

      // Toggle diff view (Cmd/Ctrl + Shift + D)
      if (e.key === "d" && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleDiffView();
        return;
      }

      // Toggle whitespace (Cmd/Ctrl + Shift + W)
      if (e.key === "w" && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleWhitespace();
        return;
      }

      // Toggle word wrap (Cmd/Ctrl + Shift + L)
      if (e.key === "l" && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleWordWrap();
        return;
      }

      // Sync all (Cmd/Ctrl + R)
      if (e.key === "r" && !e.shiftKey) {
        e.preventDefault();
        import("../stores/syncStore").then(({ useSyncStore }) => {
          useSyncStore.getState().syncAll();
        });
        return;
      }
    }
  };

  // Use the capture phase so we receive the event even if a child component
  // stops propagation (e.g. Monaco editor or content-editable elements).
  window.addEventListener("keydown", handleKeyDown, true);

  // Listen to IPC events from the main process menu
  window.electron.on("toggle-sidebar", () => {
    useUIStore.getState().toggleSidebar();
  });

  window.electron.on("toggle-right-panel", () => {
    useUIStore.getState().toggleRightPanel();
  });

  window.electron.on("open-command-palette", () => {
    useUIStore.getState().toggleCommandPalette();
  });

  window.electron.on("show-shortcuts", () => {
    useUIStore.getState().toggleKeyboardShortcuts();
  });

  return () => {
    window.removeEventListener("keydown", handleKeyDown, true);
  };
}
