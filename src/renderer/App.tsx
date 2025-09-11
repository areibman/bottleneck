import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainPane } from './components/MainPane';
import { RightPanel } from './components/RightPanel';
import { useAppStore } from './store/appStore';
import { AuthModal } from './components/AuthModal';

export const App: React.FC = () => {
  const { isAuthenticated, user, initialize } = useAppStore();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isAuthenticated && !user) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Welcome to Bottleneck</h1>
          <p className="text-gray mb-6">Fast, reliable GitHub pull request review and branch management</p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAuthModal(true)}
          >
            Sign in with GitHub
          </button>
        </div>
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => setShowAuthModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="h-full w-full flex">
      <Sidebar />
      <MainPane />
      <RightPanel />
    </div>
  );
};