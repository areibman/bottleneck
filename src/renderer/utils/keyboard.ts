import { useUIStore } from "../stores/uiStore";
import { useAuthStore } from "../stores/authStore";
import { usePRStore } from "../stores/prStore";
import { useSyncStore } from "../stores/syncStore";

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
      setPRListFilters,
      resetPRListFilters,
    } = useUIStore.getState();
    
    const { logout } = useAuthStore.getState();
    const { 
      selectedRepo,
      createPullRequest,
      fetchPullRequests,
      markAllAsRead,
      starRepository,
    } = usePRStore.getState();
    const { syncAll } = useSyncStore.getState();

    // Command/Ctrl key combinations
    if (e.metaKey || e.ctrlKey) {
      // Navigation shortcuts
      if (e.key === "h" && !e.shiftKey) {
        e.preventDefault();
        window.location.href = "/";
        return;
      }
      
      if (e.key === "1" && !e.shiftKey) {
        e.preventDefault();
        window.location.href = "/pulls";
        return;
      }
      
      if (e.key === "2" && !e.shiftKey) {
        e.preventDefault();
        window.location.href = "/issues";
        return;
      }
      
      if (e.key === "3" && !e.shiftKey) {
        e.preventDefault();
        window.location.href = "/branches";
        return;
      }
      
      if (e.key === "," && !e.shiftKey) {
        e.preventDefault();
        window.location.href = "/settings";
        return;
      }

      // AI Agent shortcuts
      if (e.key === "c" && e.shiftKey) {
        e.preventDefault();
        window.location.href = "/agents/cursor";
        return;
      }
      
      if (e.key === "d" && e.shiftKey && !e.altKey) {
        e.preventDefault();
        window.location.href = "/agents/devin";
        return;
      }
      
      if (e.key === "g" && e.shiftKey) {
        e.preventDefault();
        window.location.href = "/agents/chatgpt";
        return;
      }

      // PR Actions
      if (e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        if (selectedRepo) {
          createPullRequest();
        }
        return;
      }
      
      if (e.key === "r" && !e.shiftKey) {
        e.preventDefault();
        if (selectedRepo) {
          fetchPullRequests(selectedRepo.owner, selectedRepo.name);
        }
        return;
      }
      
      if (e.key === "m" && e.shiftKey) {
        e.preventDefault();
        markAllAsRead();
        return;
      }
      
      if (e.key === "s" && e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (selectedRepo) {
          starRepository(selectedRepo.owner, selectedRepo.name);
        }
        return;
      }

      // View toggles
      if (e.key === "t" && e.shiftKey) {
        e.preventDefault();
        toggleTheme();
        return;
      }
      
      if (e.key === "b" && !e.shiftKey) {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (e.key === "b" && e.shiftKey) {
        e.preventDefault();
        toggleRightPanel();
        return;
      }
      
      if (e.key === "d" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toggleDiffView();
        return;
      }
      
      if (e.key === "w" && !e.shiftKey) {
        e.preventDefault();
        toggleWhitespace();
        return;
      }
      
      if (e.key === "w" && e.shiftKey) {
        e.preventDefault();
        toggleWordWrap();
        return;
      }

      // Search and filter
      if (e.key === "f" && !e.shiftKey) {
        e.preventDefault();
        // This would open author filter
        return;
      }
      
      if (e.key === "f" && e.shiftKey) {
        e.preventDefault();
        // This would open status filter
        return;
      }
      
      if (e.key === "s" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        // Cycle through sort options
        const sortOptions = ["updated", "created", "comments", "reactions"];
        const currentSort = useUIStore.getState().prListFilters.sortBy;
        const currentIndex = sortOptions.indexOf(currentSort);
        const nextIndex = (currentIndex + 1) % sortOptions.length;
        setPRListFilters({ sortBy: sortOptions[nextIndex] as any });
        return;
      }
      
      if (e.key === "r" && e.shiftKey) {
        e.preventDefault();
        resetPRListFilters();
        return;
      }

      // Sync actions
      if (e.key === "u" && e.shiftKey) {
        e.preventDefault();
        syncAll();
        return;
      }

      // Command palette and help
      if (e.key === "p" && e.shiftKey) {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        toggleKeyboardShortcuts();
        return;
      }
      
      // User actions
      if (e.key === "n" && e.shiftKey) {
        e.preventDefault();
        // Open notifications
        return;
      }
      
      // Quick actions
      if (e.key === "l" && e.shiftKey) {
        e.preventDefault();
        navigator.clipboard.writeText(window.location.href);
        return;
      }
      
      if (e.key === "o" && !e.shiftKey) {
        e.preventDefault();
        if (selectedRepo) {
          window.open(`https://github.com/${selectedRepo.full_name}`, "_blank");
        }
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
