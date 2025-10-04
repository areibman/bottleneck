import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import { useUIStore } from "./stores/uiStore";
import { usePRStore } from "./stores/prStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useSyncStore } from "./stores/syncStore";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import RightPanel from "./components/RightPanel";
import CommandPalette from "./components/CommandPalette";
import { setupKeyboardShortcuts } from "./utils/keyboard";
import { cn } from "./utils/cn";
import { PerfLogger } from "./utils/perfLogger";

// Lazy load views for faster initial startup
const PRListView = lazy(() => import("./views/PRListView"));
const PRDetailView = lazy(() => import("./views/PRDetailView"));
const BranchesView = lazy(() => import("./views/BranchesView"));
const SettingsView = lazy(() => import("./views/SettingsView"));
const AuthView = lazy(() => import("./views/AuthView"));
const IssuesView = lazy(() => import("./views/IssuesView"));
const IssueDetailView = lazy(() => import("./views/IssueDetailView"));
const CursorView = lazy(() => import("./views/CursorView"));
const DevinView = lazy(() => import("./views/DevinView"));
const ChatGPTView = lazy(() => import("./views/ChatGPTView"));

PerfLogger.mark("App.tsx module loaded");

function App() {
  PerfLogger.mark("App component function called");

  const { isAuthenticated, checkAuth, token } = useAuthStore();
  const { sidebarOpen, sidebarWidth, setSidebarWidth, rightPanelOpen, theme } =
    useUIStore();
  const { loadSettings } = useSettingsStore();
  const { fetchRepositories } = usePRStore();
  const [loading, setLoading] = useState(true);

  PerfLogger.mark("App hooks initialized");

  useEffect(() => {
    PerfLogger.mark("App useEffect (init) started");
    console.log("window.electron:", window.electron);

    if (window.electron) {
      // Load settings and auth in parallel
      PerfLogger.markStart("Settings & Auth load");
      Promise.all([loadSettings(), checkAuth()]).finally(() => {
        PerfLogger.markEnd("Settings & Auth load");
        setLoading(false);
        PerfLogger.mark("App loading complete (auth + settings)");
      });

      const keyboardStart = performance.now();
      const cleanup = setupKeyboardShortcuts();
      console.log(`⏱️ [APP] Keyboard shortcuts setup in ${(performance.now() - keyboardStart).toFixed(2)}ms`);

      return cleanup;
    } else {
      console.error("window.electron is not available!");
      setLoading(false);
    }
  }, [checkAuth, loadSettings]);

  // Fetch repositories when authenticated and trigger initial sync if needed
  useEffect(() => {
    if (isAuthenticated && token) {
      PerfLogger.mark("Starting repository fetch");
      const fetchStart = performance.now();

      fetchRepositories().then(() => {
        PerfLogger.mark(`Repository fetch completed in ${(performance.now() - fetchStart).toFixed(2)}ms`);

        // Check if we should do an initial sync
        const syncStore = useSyncStore.getState();
        const lastSync = syncStore.lastSyncTime;
        const now = new Date();

        // Auto-sync if never synced or last sync was more than 5 minutes ago
        if (!lastSync || now.getTime() - lastSync.getTime() > 5 * 60 * 1000) {
          console.log(`[App] Triggering initial sync (lastSync: ${lastSync ? lastSync.toISOString() : 'never'})`);
          // Small delay to let the UI settle
          setTimeout(() => {
            const syncStart = performance.now();
            syncStore.syncAll();
            console.log(`⏱️ [APP] Sync started at ${syncStart.toFixed(2)}ms`);
          }, 1000);
        } else {
          console.log(`[App] Skipping initial sync (last sync was ${Math.round((now.getTime() - lastSync.getTime()) / 1000)}s ago)`);
        }
      });
    }
  }, [isAuthenticated, token, fetchRepositories]);

  // Loading component for lazy-loaded views
  const LoadingFallback = () => (
    <div
      className={cn(
        "flex items-center justify-center h-full",
        theme === "dark" ? "bg-gray-900 dark" : "bg-white light",
      )}
    >
      <div className={theme === "dark" ? "text-white" : "text-gray-900"}>
        Loading...
      </div>
    </div>
  );

  if (loading) {
    PerfLogger.mark("App rendering loading screen");
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    PerfLogger.mark("App rendering auth view");
    return (
      <Suspense fallback={<LoadingFallback />}>
        <AuthView />
      </Suspense>
    );
  }

  PerfLogger.mark("App rendering main UI");

  // Show performance summary on first render
  if ((window as any).__perfSummaryShown !== true) {
    setTimeout(() => {
      PerfLogger.mark("First paint complete");
      PerfLogger.getSummary();
      (window as any).__perfSummaryShown = true;
    }, 100);
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
          <Suspense fallback={<LoadingFallback />}>
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
          </Suspense>
        </main>

        <RightPanel
          className={cn({
            "w-80": rightPanelOpen,
            "w-0": !rightPanelOpen,
          })}
        />
      </div>
      {/* Command Palette Overlay */}
      <CommandPalette />
    </div>
  );
}

export default App;
