import React from 'react';
import { Github, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function AuthView() {
  const { login, loading, error, setUser } = useAuthStore();
  const [devMode, setDevMode] = React.useState(!window.electron);

  const handleDevLogin = () => {
    // Mock login for development
    setUser({
      login: 'dev-user',
      name: 'Development User',
      email: 'dev@example.com',
      avatar_url: 'https://github.com/github.png',
      id: 1
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Bottleneck</h1>
          <p className="text-gray-400">Fast GitHub PR review and branch management</p>
        </div>

        <div className="card p-8">
          <div className="text-center mb-6">
            <Github className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-white">Welcome</h2>
            <p className="text-gray-400 mt-2">Sign in with GitHub to continue</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900 bg-opacity-30 border border-red-700 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {devMode && (
            <div className="mb-4 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded text-yellow-300 text-sm">
              Development Mode: Electron API not available. Using mock authentication.
            </div>
          )}

          <button
            onClick={devMode ? handleDevLogin : login}
            disabled={loading}
            className="btn btn-primary w-full flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <Github className="w-5 h-5 mr-2" />
                {devMode ? 'Continue in Dev Mode' : 'Sign in with GitHub'}
              </>
            )}
          </button>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>By signing in, you authorize Bottleneck to access your GitHub account</p>
            <p className="mt-2">Required scopes: repo, read:org, read:user, workflow</p>
          </div>
        </div>

        <div className="text-center text-xs text-gray-600">
          <p>© 2024 Bottleneck. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
