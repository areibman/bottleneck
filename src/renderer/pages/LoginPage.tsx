import React, { useState } from 'react';
import { Github, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const LoginPage: React.FC = () => {
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await login();
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with GitHub');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-[var(--bg-tertiary)] rounded-lg shadow-2xl p-8 border border-[var(--border-color)]">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--accent-primary)] rounded-full mb-4">
              <Github size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Bottleneck</h1>
            <p className="text-[var(--text-secondary)]">
              Fast GitHub PR review and branch management
            </p>
          </div>

          {/* Login Form */}
          <div className="space-y-4">
            <div className="text-sm text-[var(--text-secondary)] text-center mb-4">
              Sign in with your GitHub account to get started
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Github size={20} />
                  <span>Sign in with GitHub</span>
                </>
              )}
            </button>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-md text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="text-xs text-[var(--text-tertiary)] text-center mt-4">
              By signing in, you agree to grant Bottleneck access to your GitHub repositories
              and pull requests. We only request the minimum required permissions.
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-[var(--accent-primary)]">10x</div>
            <div className="text-sm text-[var(--text-secondary)]">Faster</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--accent-primary)]">1000+</div>
            <div className="text-sm text-[var(--text-secondary)]">Files</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--accent-primary)]">∞</div>
            <div className="text-sm text-[var(--text-secondary)]">PRs</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;