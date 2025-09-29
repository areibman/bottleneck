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
      toggleTheme,
      toggleDiffView,
      toggleWhitespace,
      toggleWordWrap,
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

      // Toggle theme (Cmd/Ctrl + T)
      if (e.key.toLowerCase() === "t" && !e.shiftKey) {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Diff view toggle (Cmd/Ctrl + Shift + D)
      if (e.key.toLowerCase() === "d" && e.shiftKey) {
        e.preventDefault();
        toggleDiffView();
        return;
      }

      // Toggle whitespace (Cmd/Ctrl + Shift + W)
      if (e.key.toLowerCase() === "w" && e.shiftKey) {
        e.preventDefault();
        toggleWhitespace();
        return;
      }

      // Toggle word wrap (Cmd/Ctrl + Shift + M)
      if (e.key.toLowerCase() === "m" && e.shiftKey) {
        e.preventDefault();
        toggleWordWrap();
        return;
      }

      // Open settings (Cmd/Ctrl + ,)
      if (e.key === ",") {
        e.preventDefault();
        window.location.href = "/settings";
        return;
      }

      // Route navigation (Cmd/Ctrl + 1/2/3)
      if (!e.shiftKey) {
        if (e.key === "1") {
          e.preventDefault();
          window.location.href = "/pulls";
          return;
        }
        if (e.key === "2") {
          e.preventDefault();
          window.location.href = "/issues";
          return;
        }
        if (e.key === "3") {
          e.preventDefault();
          window.location.href = "/branches";
          return;
        }
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
