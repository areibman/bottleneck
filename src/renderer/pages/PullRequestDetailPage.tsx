import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  GitPullRequest,
  GitMerge,
  MessageSquare,
  FileText,
  Check,
  X,
  AlertCircle,
  Clock,
  ChevronLeft,
  MoreVertical,
  Tag,
  Users,
  GitCommit,
  ExternalLink,
} from 'lucide-react';
import DiffViewer from '../components/DiffViewer';
import ConversationTab from '../components/ConversationTab';
import FilesTab from '../components/FilesTab';

const PullRequestDetailPage: React.FC = () => {
  const { owner, repo, number } = useParams<{ owner: string; repo: string; number: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'conversation' | 'files'>('conversation');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewComments, setReviewComments] = useState<any[]>([]);

  const { data: pr, isLoading: prLoading } = useQuery({
    queryKey: ['pr-detail', owner, repo, number],
    queryFn: async () => {
      return await window.electronAPI.github.getPR(owner!, repo!, parseInt(number!));
    },
    enabled: !!(owner && repo && number),
  });

  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ['pr-files', owner, repo, number],
    queryFn: async () => {
      return await window.electronAPI.github.getPRFiles(owner!, repo!, parseInt(number!));
    },
    enabled: !!(owner && repo && number),
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['pr-comments', owner, repo, number],
    queryFn: async () => {
      return await window.electronAPI.github.getPRComments(owner!, repo!, parseInt(number!));
    },
    enabled: !!(owner && repo && number),
  });

  const getPRStateColor = () => {
    if (pr?.merged_at) return 'bg-purple-500';
    if (pr?.state === 'closed') return 'bg-red-500';
    if (pr?.draft) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPRStateIcon = () => {
    if (pr?.merged_at) return <GitMerge size={16} />;
    if (pr?.state === 'closed') return <X size={16} />;
    if (pr?.draft) return <AlertCircle size={16} />;
    return <Check size={16} />;
  };

  const getPRStateLabel = () => {
    if (pr?.merged_at) return 'Merged';
    if (pr?.state === 'closed') return 'Closed';
    if (pr?.draft) return 'Draft';
    return 'Open';
  };

  const handleMerge = async () => {
    if (!pr || !owner || !repo) return;
    
    try {
      await window.electronAPI.github.mergePR(owner, repo, pr.number, {
        method: 'merge',
        title: pr.title,
      });
      // Refresh PR data
    } catch (error) {
      console.error('Failed to merge PR:', error);
    }
  };

  const handleCheckout = async () => {
    // Implementation for checking out the branch locally
    console.log('Checkout branch:', pr?.head.ref);
  };

  const startReview = () => {
    setIsReviewing(true);
    setReviewComments([]);
  };

  const submitReview = async (event: 'COMMENT' | 'APPROVE' | 'REQUEST_CHANGES') => {
    if (!owner || !repo || !pr) return;
    
    try {
      await window.electronAPI.github.createReview(owner, repo, pr.number, {
        event,
        body: '', // Review body from a form
        comments: reviewComments,
      });
      setIsReviewing(false);
      setReviewComments([]);
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  if (prLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]" />
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
          <p>Pull request not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/pulls')}
            className="p-1 rounded hover:bg-[var(--bg-hover)]"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                {pr.title}
              </h1>
              <span className="text-[var(--text-tertiary)]">#{pr.number}</span>
            </div>
            
            <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-secondary)]">
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-white ${getPRStateColor()}`}>
                {getPRStateIcon()}
                <span>{getPRStateLabel()}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <img
                  src={pr.user.avatar_url}
                  alt={pr.user.login}
                  className="w-5 h-5 rounded-full"
                />
                <span>{pr.user.login}</span>
              </div>
              
              <span>wants to merge {pr.commits} commit{pr.commits !== 1 ? 's' : ''} into</span>
              <code className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded">
                {pr.base.ref}
              </code>
              <span>from</span>
              <code className="px-2 py-0.5 bg-[var(--bg-secondary)] rounded">
                {pr.head.ref}
              </code>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {pr.state === 'open' && !pr.draft && (
              <>
                {!isReviewing ? (
                  <button
                    onClick={startReview}
                    className="px-3 py-1.5 bg-[var(--accent-primary)] text-white rounded text-sm hover:bg-[var(--accent-secondary)]"
                  >
                    Start Review
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => submitReview('COMMENT')}
                      className="px-3 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded text-sm hover:bg-[var(--bg-hover)]"
                    >
                      Comment
                    </button>
                    <button
                      onClick={() => submitReview('APPROVE')}
                      className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => submitReview('REQUEST_CHANGES')}
                      className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Request Changes
                    </button>
                  </>
                )}
                
                {pr.mergeable && (
                  <button
                    onClick={handleMerge}
                    className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    <GitMerge size={16} className="inline mr-1" />
                    Merge
                  </button>
                )}
              </>
            )}
            
            <button
              onClick={handleCheckout}
              className="px-3 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded text-sm hover:bg-[var(--bg-hover)]"
            >
              Checkout
            </button>
            
            <button className="p-1.5 rounded hover:bg-[var(--bg-hover)]">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-[var(--border-color)]">
          <button
            onClick={() => setActiveTab('conversation')}
            className={`flex items-center gap-2 px-3 py-2 border-b-2 transition-colors ${
              activeTab === 'conversation'
                ? 'border-[var(--accent-primary)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <MessageSquare size={16} />
            <span>Conversation</span>
            {comments && comments.length > 0 && (
              <span className="px-1.5 py-0.5 bg-[var(--bg-hover)] rounded-full text-xs">
                {comments.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-3 py-2 border-b-2 transition-colors ${
              activeTab === 'files'
                ? 'border-[var(--accent-primary)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText size={16} />
            <span>Files changed</span>
            {files && (
              <span className="px-1.5 py-0.5 bg-[var(--bg-hover)] rounded-full text-xs">
                {files.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'conversation' ? (
          <ConversationTab
            pr={pr}
            comments={comments || []}
            isLoading={commentsLoading}
          />
        ) : (
          <FilesTab
            pr={pr}
            files={files || []}
            isLoading={filesLoading}
            isReviewing={isReviewing}
            onAddComment={(comment) => setReviewComments([...reviewComments, comment])}
          />
        )}
      </div>
    </div>
  );
};

export default PullRequestDetailPage;