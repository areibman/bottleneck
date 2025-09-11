import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useUIStore } from './stores/uiStore';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import RightPanel from './components/RightPanel';
import PRListView from './views/PRListView';
import PRDetailView from './views/PRDetailView';
import BranchesView from './views/BranchesView';
import SettingsView from './views/SettingsView';
import AuthView from './views/AuthView';
import { setupKeyboardShortcuts } from './utils/keyboard';
import { cn } from './utils/cn';

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { sidebarOpen, rightPanelOpen } = useUIStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('window.electron:', window.electron);
    if (window.electron) {
      checkAuth().finally(() => setLoading(false));
      setupKeyboardShortcuts();
    } else {
      console.error('window.electron is not available!');
      setLoading(false);
    }
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      <TopBar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar className={cn('transition-all duration-200', {
          'w-64': sidebarOpen,
          'w-0': !sidebarOpen,
        })} />
        
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/pulls" replace />} />
            <Route path="/pulls" element={<PRListView />} />
            <Route path="/pulls/:owner/:repo/:number" element={<PRDetailView />} />
            <Route path="/branches" element={<BranchesView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </main>
        
        <RightPanel className={cn('transition-all duration-200', {
          'w-80': rightPanelOpen,
          'w-0': !rightPanelOpen,
        })} />
      </div>
    </div>
  );
}

export default App;
