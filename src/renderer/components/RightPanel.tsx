import React from 'react';
import { 
  X, 
  CheckCircle, 
  XCircle, 
  Clock,
  GitCommit,
  Users,
  Tag,
  FolderTree,
  AlertCircle
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import { cn } from '../utils/cn';

interface RightPanelProps {
  className?: string;
}

export default function RightPanel({ className }: RightPanelProps) {
  const { toggleRightPanel, theme } = useUIStore();
  const [activeTab, setActiveTab] = React.useState<'checks' | 'participants' | 'labels' | 'files'>('checks');

  // Mock data - would come from PR context
  const checks = [
    { name: 'CI / Build', status: 'success', duration: '2m 34s' },
    { name: 'CI / Tests', status: 'pending', duration: null },
    { name: 'CI / Lint', status: 'failure', duration: '45s' },
    { name: 'Deploy Preview', status: 'success', duration: '3m 12s' },
  ];

  const participants = [
    { login: 'johndoe', avatar: 'https://github.com/johndoe.png', role: 'author' },
    { login: 'janedoe', avatar: 'https://github.com/janedoe.png', role: 'reviewer', approved: true },
    { login: 'bobsmith', avatar: 'https://github.com/bobsmith.png', role: 'reviewer', requested: true },
  ];

  const labels = [
    { name: 'bug', color: 'd73a4a' },
    { name: 'enhancement', color: 'a2eeef' },
    { name: 'documentation', color: '0075ca' },
  ];

  const files = [
    { path: 'src/components/Button.tsx', additions: 24, deletions: 3 },
    { path: 'src/components/Input.tsx', additions: 15, deletions: 8 },
    { path: 'src/styles/global.css', additions: 10, deletions: 2 },
    { path: 'package.json', additions: 2, deletions: 0 },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failure':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <aside className={cn(
      'flex flex-col overflow-hidden border-l',
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-gray-50 border-gray-200',
      className
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between p-4 border-b",
        theme === 'dark' ? "border-gray-700" : "border-gray-200"
      )}>
        <h2 className="text-sm font-semibold">Details</h2>
        <button
          onClick={toggleRightPanel}
          className={cn(
            "p-1 rounded transition-colors",
            theme === 'dark' ? "hover:bg-gray-700" : "hover:bg-gray-100"
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className={cn(
        "flex border-b",
        theme === 'dark' ? "border-gray-700" : "border-gray-200"
      )}>
        <button
          onClick={() => setActiveTab('checks')}
          className={cn('tab flex-1', activeTab === 'checks' && 'active')}
        >
          <GitCommit className="w-3 h-3 mr-1 inline" />
          Checks
        </button>
        <button
          onClick={() => setActiveTab('participants')}
          className={cn('tab flex-1', activeTab === 'participants' && 'active')}
        >
          <Users className="w-3 h-3 mr-1 inline" />
          People
        </button>
        <button
          onClick={() => setActiveTab('labels')}
          className={cn('tab flex-1', activeTab === 'labels' && 'active')}
        >
          <Tag className="w-3 h-3 mr-1 inline" />
          Labels
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={cn('tab flex-1', activeTab === 'files' && 'active')}
        >
          <FolderTree className="w-3 h-3 mr-1 inline" />
          Files
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'checks' && (
          <div className="space-y-3">
            {checks.map((check) => (
              <div key={check.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(check.status)}
                  <span className="text-sm">{check.name}</span>
                </div>
                {check.duration && (
                  <span className={cn(
                    "text-xs",
                    theme === 'dark' ? "text-gray-500" : "text-gray-600"
                  )}>{check.duration}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="space-y-3">
            {participants.map((participant) => (
              <div key={participant.login} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <img
                    src={participant.avatar}
                    alt={participant.login}
                    className="w-6 h-6 rounded-full"
                  />
                  <div>
                    <div className="text-sm">{participant.login}</div>
                    <div className={cn(
                      "text-xs",
                      theme === 'dark' ? "text-gray-500" : "text-gray-600"
                    )}>
                      {participant.role === 'author' && 'Author'}
                      {participant.approved && 'Approved'}
                      {participant.requested && 'Review requested'}
                    </div>
                  </div>
                </div>
                {participant.approved && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'labels' && (
          <div className="space-y-2">
            {labels.map((label) => (
              <div
                key={label.name}
                className="inline-block px-2 py-1 rounded text-xs font-medium mr-2"
                style={{ backgroundColor: `#${label.color}30`, color: `#${label.color}` }}
              >
                {label.name}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.path} className="text-sm">
                <div className={cn(
                  "font-mono text-xs truncate",
                  theme === 'dark' ? "text-gray-300" : "text-gray-700"
                )}>
                  {file.path}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-green-400 text-xs">+{file.additions}</span>
                  <span className="text-red-400 text-xs">-{file.deletions}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
