import React from 'react';
import { Github, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { cn } from '../utils/cn';

export default function AuthView() {
  const { login, loading, error, setUser } = useAuthStore();
  const { theme } = useUIStore();
  const [isDevLoading, setIsDevLoading] = React.useState(false);

  const handleDevLogin = async () => {
    // Mock login for development
    setIsDevLoading(true);
    
    // Simulate a small delay to make it feel more realistic
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setUser({
      login: 'dev-user',
      name: 'Development User',
      email: 'dev@example.com',
      avatar_url: 'https://github.com/github.png',
      id: 1
    });
    
    setIsDevLoading(false);
  };

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center",
      theme === 'dark' ? "bg-gray-900 dark" : "bg-gray-50 light"
    )}>
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className={cn(
            "text-4xl font-bold mb-2",
            theme === 'dark' ? "text-white" : "text-gray-900"
          )}>Bottleneck</h1>
          <p className={cn(
            theme === 'dark' ? "text-gray-400" : "text-gray-600"
          )}>Fast GitHub PR review and branch management</p>
        </div>

        <div className="card p-8">
          <div className="text-center mb-6">
            <Github className={cn(
              "w-16 h-16 mx-auto mb-4",
              theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )} />
            <h2 className={cn(
              "text-2xl font-semibold",
              theme === 'dark' ? "text-white" : "text-gray-900"
            )}>Welcome</h2>
            <p className={cn(
              "mt-2",
              theme === 'dark' ? "text-gray-400" : "text-gray-600"
            )}>Sign in with your GitHub Personal Access Token</p>
          </div>

          {error && (
            <div className={cn(
              "mb-4 p-3 rounded text-sm",
              theme === 'dark' 
                ? "bg-red-900 bg-opacity-30 border border-red-700 text-red-300"
                : "bg-red-50 border border-red-300 text-red-700"
            )}>
              {error}
            </div>
          )}

          <button
            onClick={login}
            disabled={loading || isDevLoading}
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
                Sign in with GitHub Token
              </>
            )}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className={cn(
                "w-full border-t",
                theme === 'dark' ? "border-gray-700" : "border-gray-300"
              )}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={cn(
                "px-2",
                theme === 'dark' ? "bg-gray-800 text-gray-500" : "bg-gray-50 text-gray-600"
              )}>OR</span>
            </div>
          </div>

          <button
            onClick={handleDevLogin}
            disabled={loading || isDevLoading}
            className={cn(
              "btn btn-secondary w-full flex items-center justify-center border",
              theme === 'dark' 
                ? "border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300"
                : "border-gray-300 bg-white hover:bg-gray-100 text-gray-700"
            )}
          >
            {isDevLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Loading Dev Mode...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
                </svg>
                Continue in Dev Mode
              </>
            )}
          </button>

          <div className={cn(
            "mt-6 text-center text-xs",
            theme === 'dark' ? "text-gray-500" : "text-gray-600"
          )}>
            <p>By signing in, you authorize Bottleneck to access your GitHub account</p>
            <p className="mt-2">Required scopes: repo, read:org, read:user, workflow</p>
            <p className={cn(
              "mt-3",
              theme === 'dark' ? "text-yellow-600" : "text-yellow-700"
            )}>Dev Mode bypasses authentication for testing</p>
          </div>
        </div>

        <div className={cn(
          "text-center text-xs",
          theme === 'dark' ? "text-gray-600" : "text-gray-500"
        )}>
          <p>© 2025 Bottleneck. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
