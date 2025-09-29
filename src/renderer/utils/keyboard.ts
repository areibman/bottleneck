import { useUIStore } from "../stores/uiStore";
import { usePRStore } from "../stores/prStore";
import { useAuthStore } from "../stores/authStore";
import { useSyncStore } from "../stores/syncStore";
import { navigateTo } from "./navigation";

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
    } = useUIStore.getState();
    
    const { selectedRepo } = usePRStore.getState();
    const { syncAll } = useSyncStore.getState();

    // Command/Ctrl key combinations
    if (e.metaKey || e.ctrlKey) {
      // Navigation shortcuts
      if (e.key === "1" && !e.shiftKey) {
        e.preventDefault();
        navigateTo("/pulls");
        return;
      }
      
      if (e.key === "2" && !e.shiftKey) {
        e.preventDefault();
        navigateTo("/branches");
        return;
      }
      
      if (e.key === "3" && !e.shiftKey) {
        e.preventDefault();
        navigateTo("/issues");
        return;
      }
      
      if (e.key === "h" && !e.shiftKey) {
        e.preventDefault();
        navigateTo("/");
        return;
      }
      
      // Settings (Cmd/Ctrl + ,)
      if (e.key === "," && !e.shiftKey) {
        e.preventDefault();
        navigateTo("/settings");
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

      // Toggle theme (Cmd/Ctrl + Shift + T)
      if (e.key === "t" && e.shiftKey) {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Sync all repositories (Cmd/Ctrl + R)
      if (e.key === "r" && !e.shiftKey) {
        e.preventDefault();
        syncAll();
        return;
      }

      // New PR (Cmd/Ctrl + N)
      if (e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        if (selectedRepo) {
          window.open(`https://github.com/${selectedRepo.full_name}/compare`, '_blank');
        }
        return;
      }

      // Clone repository (Cmd/Ctrl + Shift + C)
      if (e.key === "c" && e.shiftKey) {
        e.preventDefault();
        if (selectedRepo) {
          navigator.clipboard.writeText(`git clone ${selectedRepo.clone_url}`);
        }
        return;
      }

      // Open in GitHub (Cmd/Ctrl + Shift + O)
      if (e.key === "o" && e.shiftKey) {
        e.preventDefault();
        if (selectedRepo) {
          window.open(selectedRepo.html_url, '_blank');
        }
        return;
      }

      // Copy repository URL (Cmd/Ctrl + Shift + U)
      if (e.key === "u" && e.shiftKey) {
        e.preventDefault();
        if (selectedRepo) {
          navigator.clipboard.writeText(selectedRepo.html_url);
        }
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
