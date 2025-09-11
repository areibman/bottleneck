import React, { useState } from 'react';
import {
  MessageSquare,
  GitCommit,
  Tag,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConversationTabProps {
  pr: any;
  comments: any[];
  isLoading: boolean;
}

const ConversationTab: React.FC<ConversationTabProps> = ({ pr, comments, isLoading }) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    try {
      // Submit comment via API
      setNewComment('');
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTimelineItem = (item: any) => {
    const Icon = item.type === 'commit' ? GitCommit :
                 item.type === 'label' ? Tag :
                 item.type === 'review' ? CheckCircle :
                 MessageSquare;

    return (
      <div key={item.id} className="flex gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-[var(--bg-hover)] flex items-center justify-center">
            <Icon size={16} className="text-[var(--text-secondary)]" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
            <div className="px-4 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={item.user?.avatar_url || ''}
                  alt={item.user?.login || 'User'}
                  className="w-5 h-5 rounded-full"
                />
                <span className="font-medium text-sm text-[var(--text-primary)]">
                  {item.user?.login || 'System'}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            
            <div className="p-4">
              <div className="prose prose-sm text-[var(--text-primary)]">
                {item.body || item.message}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6">
        {/* PR Description */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <img
              src={pr.user.avatar_url}
              alt={pr.user.login}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <div className="font-medium text-[var(--text-primary)]">
                {pr.user.login}
              </div>
              <div className="text-sm text-[var(--text-tertiary)]">
                opened this pull request {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
          
          {pr.body && (
            <div className="bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] p-4">
              <div className="prose prose-sm text-[var(--text-primary)] whitespace-pre-wrap">
                {pr.body}
              </div>
            </div>
          )}
        </div>

        {/* Labels */}
        {pr.labels && pr.labels.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-sm text-[var(--text-secondary)]">
              <Tag size={16} />
              <span>Labels</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {pr.labels.map((label: any) => (
                <span
                  key={label.id}
                  className="px-2 py-1 text-xs rounded-full"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    color: `#${label.color}`,
                    border: `1px solid #${label.color}40`,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reviewers */}
        {pr.requested_reviewers && pr.requested_reviewers.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-sm text-[var(--text-secondary)]">
              <Users size={16} />
              <span>Reviewers</span>
            </div>
            <div className="flex gap-2">
              {pr.requested_reviewers.map((reviewer: any) => (
                <div key={reviewer.login} className="flex items-center gap-2">
                  <img
                    src={reviewer.avatar_url}
                    alt={reviewer.login}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm text-[var(--text-primary)]">
                    {reviewer.login}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-4">
          {comments.map(renderTimelineItem)}
        </div>
      </div>

      {/* Comment Form */}
      <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
        <div className="flex gap-3">
          <img
            src={pr.user.avatar_url}
            alt={pr.user.login}
            className="w-8 h-8 rounded-full"
          />
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Leave a comment..."
              className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                className="px-4 py-1.5 bg-[var(--accent-primary)] text-white rounded text-sm hover:bg-[var(--accent-secondary)] disabled:opacity-50"
              >
                Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationTab;