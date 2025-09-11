import React, { useState } from 'react';
import { 
  Github, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  XCircle,
  Loader
} from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const { setAuthenticated } = useAppStore();
  const [step, setStep] = useState<'device' | 'authorize' | 'success' | 'error'>('device');
  const [deviceCode, setDeviceCode] = useState('');
  const [userCode, setUserCode] = useState('');
  const [verificationUri, setVerificationUri] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAuthenticate = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await window.electronAPI.github.authenticate();
      
      if (result.success && result.token) {
        // Store token
        localStorage.setItem('github_token', result.token);
        setAuthenticated(true, undefined, result.token);
        setStep('success');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setError(result.error || 'Authentication failed');
        setStep('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleOpenBrowser = () => {
    window.open(verificationUri, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="p-6 border-b border-[#30363d]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Github className="w-8 h-8" />
              <h2 className="text-xl font-semibold">Sign in to GitHub</h2>
            </div>
            <button
              className="p-1 hover:bg-[#21262d] rounded"
              onClick={onClose}
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'device' && (
            <div className="space-y-4">
              <p className="text-gray">
                To get started, you'll need to authenticate with GitHub. This will allow Bottleneck to access your repositories and pull requests.
              </p>
              
              <div className="bg-[#0d1117] border border-[#30363d] rounded p-4">
                <h3 className="text-sm font-medium mb-2">Required Permissions</h3>
                <ul className="text-sm text-gray space-y-1">
                  <li>• Read access to repositories</li>
                  <li>• Read access to pull requests and issues</li>
                  <li>• Write access to comments and reviews</li>
                  <li>• Read access to organization data</li>
                </ul>
              </div>

              <button
                className="btn btn-primary w-full"
                onClick={handleAuthenticate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4 mr-2" />
                    Sign in with GitHub
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'authorize' && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Authorization Required</h3>
                <p className="text-gray">
                  Please complete the authorization in your browser
                </p>
              </div>

              <div className="bg-[#0d1117] border border-[#30363d] rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">User Code:</span>
                  <button
                    className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-400"
                    onClick={handleCopyCode}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-lg text-center p-2 bg-[#161b22] rounded">
                  {userCode}
                </div>
              </div>

              <button
                className="btn btn-primary w-full"
                onClick={handleOpenBrowser}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open GitHub
              </button>

              <p className="text-xs text-gray text-center">
                After authorizing, return to this window to continue
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-medium">Successfully Authenticated!</h3>
              <p className="text-gray">
                You're now signed in to GitHub. Loading your repositories...
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center space-y-4">
              <XCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-medium">Authentication Failed</h3>
              <p className="text-gray">{error}</p>
              <button
                className="btn btn-primary"
                onClick={() => setStep('device')}
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#30363d] bg-[#0d1117] rounded-b-lg">
          <p className="text-xs text-gray text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};