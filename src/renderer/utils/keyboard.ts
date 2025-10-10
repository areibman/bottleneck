import { useUIStore } from "../stores/uiStore";

export function setupKeyboardShortcuts() {
  if (!window.electron) {
    console.warn(
      "window.electron not available, skipping keyboard shortcuts setup",
    );
    return () => { };
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
      if ((e.key === "b" || e.key === "B") && !e.shiftKey) {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Toggle right panel (Cmd/Ctrl + Shift + B)
      if ((e.key === "b" || e.key === "B") && e.shiftKey) {
        e.preventDefault();
        toggleRightPanel();
        return;
      }

      // Open command palette (Cmd/Ctrl + Shift + P)
      if ((e.key === "p" || e.key === "P") && e.shiftKey) {
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
      if ((e.key === "t" || e.key === "T") && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleTheme();
        return;
      }

      // Toggle diff view (Cmd/Ctrl + Shift + D)
      if ((e.key === "d" || e.key === "D") && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleDiffView();
        return;
      }

      // Toggle whitespace (Cmd/Ctrl + Shift + W)
      if ((e.key === "w" || e.key === "W") && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleWhitespace();
        return;
      }

      // Toggle word wrap (Cmd/Ctrl + Shift + L)
      if ((e.key === "l" || e.key === "L") && e.shiftKey) {
        e.preventDefault();
        useUIStore.getState().toggleWordWrap();
        return;
      }

      // Find in page (Cmd/Ctrl + F)
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (window.electron) {
          window.electron.find.start();
        }
        return;
      }

      // Find next (Cmd/Ctrl + G)
      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        if (window.electron) {
          window.electron.find.find("", { findNext: true });
        }
        return;
      }
    }

    // Find previous (Cmd/Ctrl + Shift + G)
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "g" || e.key === "G")) {
      e.preventDefault();
      if (window.electron) {
        window.electron.find.find("", { findNext: false });
      }
      return;
    }
  };

  document.addEventListener("keydown", handleKeyDown);

  // Listen to IPC events from the main process menu
  const handleToggleSidebar = () => {
    useUIStore.getState().toggleSidebar();
  };

  const handleToggleRightPanel = () => {
    useUIStore.getState().toggleRightPanel();
  };

  const handleOpenCommandPalette = () => {
    useUIStore.getState().toggleCommandPalette();
  };

  const handleShowShortcuts = () => {
    useUIStore.getState().toggleKeyboardShortcuts();
  };

  window.electron.on("toggle-sidebar", handleToggleSidebar);
  window.electron.on("toggle-right-panel", handleToggleRightPanel);
  window.electron.on("open-command-palette", handleOpenCommandPalette);
  window.electron.on("show-shortcuts", handleShowShortcuts);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
    window.electron.off("toggle-sidebar", handleToggleSidebar);
    window.electron.off("toggle-right-panel", handleToggleRightPanel);
    window.electron.off("open-command-palette", handleOpenCommandPalette);
    window.electron.off("show-shortcuts", handleShowShortcuts);
  };
}
