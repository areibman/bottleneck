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
      // Open command palette on Cmd/Ctrl press (without additional key)
      if (e.key === "Meta" || e.key === "Control") {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

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
    }
  };

  document.addEventListener("keydown", handleKeyDown);

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
    document.removeEventListener("keydown", handleKeyDown);
  };
}
