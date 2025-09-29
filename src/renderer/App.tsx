/* @jsxRuntime classic */
import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import { useUIStore } from "./stores/uiStore";
import { usePRStore } from "./stores/prStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useSyncStore } from "./stores/syncStore";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import RightPanel from "./components/RightPanel";
import PRListView from "./views/PRListView";
import PRDetailView from "./views/PRDetailView";
import BranchesView from "./views/BranchesView";
import SettingsView from "./views/SettingsView";
import AuthView from "./views/AuthView";
import IssuesView from "./views/IssuesView";
import IssueDetailView from "./views/IssueDetailView";
import CursorView from "./views/CursorView";
import DevinView from "./views/DevinView";
import ChatGPTView from "./views/ChatGPTView";
import { setupKeyboardShortcuts } from "./utils/keyboard";
import { cn } from "./utils/cn";
import CommandPalette from "./components/CommandPalette";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";

function App() {
  const { isAuthenticated, checkAuth, token } = useAuthStore();
  const { sidebarOpen, sidebarWidth, setSidebarWidth, rightPanelOpen, theme, commandPaletteOpen, toggleCommandPalette } =
    useUIStore();
  const { loadSettings } = useSettingsStore();
  const { fetchRepositories } = usePRStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("window.electron:", window.electron);
    if (window.electron) {
      // Load settings and auth in parallel
      Promise.all([loadSettings(), checkAuth()]).finally(() =>
        setLoading(false),
      );
      setupKeyboardShortcuts();
    } else {
      console.error("window.electron is not available!");
      setLoading(false);
    }
  }, [checkAuth, loadSettings]);

  // Fetch repositories when authenticated and trigger initial sync if needed
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchRepositories().then(() => {
        // Check if we should do an initial sync
        const syncStore = useSyncStore.getState();
        const lastSync = syncStore.lastSyncTime;
        const now = new Date();

        // Auto-sync if never synced or last sync was more than 5 minutes ago
        if (!lastSync || now.getTime() - lastSync.getTime() > 5 * 60 * 1000) {
          console.log(`[App] Triggering initial sync (lastSync: ${lastSync ? lastSync.toISOString() : 'never'})`);
          // Small delay to let the UI settle
          setTimeout(() => {
            syncStore.syncAll();
          }, 1000);
        } else {
          console.log(`[App] Skipping initial sync (last sync was ${Math.round((now.getTime() - lastSync.getTime()) / 1000)}s ago)`);
        }
      });
    }
  }, [isAuthenticated, token, fetchRepositories]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-screen",
          theme === "dark" ? "bg-gray-900 dark" : "bg-white light",
        )}
      >
        <div className={theme === "dark" ? "text-white" : "text-gray-900"}>
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div
      className={cn(
        "flex flex-col h-screen",
        theme === "dark"
          ? "bg-gray-900 text-gray-100 dark"
          : "bg-white text-gray-900 light",
      )}
    >
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          width={sidebarOpen ? sidebarWidth : 0}
          onWidthChange={setSidebarWidth}
        />

        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/pulls" replace />} />
            <Route path="/pulls" element={<PRListView />} />
            <Route
              path="/pulls/:owner/:repo/:number"
              element={<PRDetailView />}
            />
            <Route path="/branches" element={<BranchesView />} />
            <Route path="/issues" element={<IssuesView />} />
            <Route
              path="/issues/:owner/:repo/:number"
              element={<IssueDetailView />}
            />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="/agents/cursor" element={<CursorView />} />
            <Route path="/agents/devin" element={<DevinView />} />
            <Route path="/agents/chatgpt" element={<ChatGPTView />} />
          </Routes>
        </main>

        <RightPanel
          className={cn({
            "w-80": rightPanelOpen,
            "w-0": !rightPanelOpen,
          })}
        />
      </div>
      <CommandPalette isOpen={commandPaletteOpen} onClose={toggleCommandPalette} />
      <KeyboardShortcutsModal />
    </div>
  );
}

export default App;
