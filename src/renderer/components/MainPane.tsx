import React from 'react';
import { GitPullRequest, MessageSquare, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { ConversationTab } from './ConversationTab';
import { FilesTab } from './FilesTab';

export const MainPane: React.FC = () => {
  const { selectedPR, activeTab, setActiveTab, loading } = useAppStore();

  if (!selectedPR) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <GitPullRequest className="w-16 h-16 mx-auto mb-4 text-gray opacity-50" />
          <h2 className="text-xl font-semibold mb-2">Select a Pull Request</h2>
          <p className="text-gray">Choose a pull request from the sidebar to start reviewing</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (selectedPR.state === 'merged') {
      return <CheckCircle className="w-5 h-5 text-purple-500" />;
    }
    if (selectedPR.state === 'closed') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    if (selectedPR.checksStatus === 'success') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (selectedPR.checksStatus === 'failure' || selectedPR.checksStatus === 'error') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    if (selectedPR.checksStatus === 'pending') {
      return <Clock className="w-5 h-5 text-yellow-500" />;
    }
    return <Clock className="w-5 h-5 text-gray-500" />;
  };

  const getStatusText = () => {
    if (selectedPR.state === 'merged') return 'Merged';
    if (selectedPR.state === 'closed') return 'Closed';
    if (selectedPR.checksStatus === 'success') return 'All checks passed';
    if (selectedPR.checksStatus === 'failure') return 'Checks failed';
    if (selectedPR.checksStatus === 'error') return 'Checks errored';
    if (selectedPR.checksStatus === 'pending') return 'Checks pending';
    return 'Unknown status';
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117]">
      {/* Header */}
      <div className="border-b border-[#30363d] bg-[#161b22]">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon()}
                <h1 className="text-xl font-semibold truncate">
                  {selectedPR.title}
                </h1>
                <span className="px-2 py-1 text-sm bg-[#21262d] text-gray rounded">
                  #{selectedPR.number}
                </span>
                {selectedPR.draft && (
                  <span className="px-2 py-1 text-sm bg-yellow-900 text-yellow-200 rounded">
                    Draft
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray">
                <span>{getStatusText()}</span>
                <span>•</span>
                <span>{selectedPR.author}</span>
                <span>•</span>
                <span>{selectedPR.additions} additions, {selectedPR.deletions} deletions</span>
                <span>•</span>
                <span>{selectedPR.changedFiles} files changed</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="btn btn-secondary">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </button>
              <button className="btn btn-secondary">
                <XCircle className="w-4 h-4 mr-2" />
                Request Changes
              </button>
              <button className="btn btn-primary">
                <MessageSquare className="w-4 h-4 mr-2" />
                Comment
              </button>
            </div>
          </div>

          {/* Labels */}
          {selectedPR.labels.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              {selectedPR.labels.map((label, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-[#21262d] text-gray rounded"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#30363d]">
          <button
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'conversation'
                ? 'border-[#1f6feb] text-white'
                : 'border-transparent text-gray hover:text-white'
            }`}
            onClick={() => setActiveTab('conversation')}
          >
            <MessageSquare className="w-4 h-4" />
            Conversation
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'files'
                ? 'border-[#1f6feb] text-white'
                : 'border-transparent text-gray hover:text-white'
            }`}
            onClick={() => setActiveTab('files')}
          >
            <FileText className="w-4 h-4" />
            Files
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading.prDetails ? (
          <div className="flex items-center justify-center h-full">
            <div className="spinner" />
          </div>
        ) : (
          <>
            {activeTab === 'conversation' && <ConversationTab />}
            {activeTab === 'files' && <FilesTab />}
          </>
        )}
      </div>
    </div>
  );
};