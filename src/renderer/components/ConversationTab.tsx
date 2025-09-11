import React, { useState } from 'react';
import { 
  MessageSquare, 
  GitCommit, 
  GitMerge,
  Tag,
  Users,
  Check,
  X,
  AlertCircle,
  Clock
} from 'lucide-react';
import { PullRequest, Comment, Review } from '../services/github';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ConversationTabProps {
  pr: PullRequest;
  comments: Comment[];
  reviews: Review[];
  onCommentSubmit: () => void;
}

export function ConversationTab({ pr, comments, reviews, onCommentSubmit }: ConversationTabProps) {
  const { user, token } = useAuthStore();
  const { theme } = useUIStore();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewType, setReviewType] = useState<'comment' | 'approve' | 'request_changes'>('comment');

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !token) return;
    
    setIsSubmitting(true);
    try {
      const { GitHubAPI } = await import('../services/github');
      const api = new GitHubAPI(token);
      
      if (reviewType === 'comment') {
        await api.createComment(
          pr.base.repo.owner.login,
          pr.base.repo.name,
          pr.number,
          commentText
        );
      } else {
        await api.createReview(
          pr.base.repo.owner.login,
          pr.base.repo.name,
          pr.number,
          commentText,
          reviewType === 'approve' ? 'APPROVE' : 'REQUEST_CHANGES'
        );
      }
      
      setCommentText('');
      onCommentSubmit();
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Combine comments and reviews into a timeline
  const timeline = [
    ...comments.map(c => ({ ...c, type: 'comment' as const, timestamp: c.created_at })),
    ...reviews.map(r => ({ ...r, type: 'review' as const, timestamp: r.submitted_at || '' })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const getReviewIcon = (state: string) => {
    switch (state) {
      case 'APPROVED':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'CHANGES_REQUESTED':
        return <X className="w-4 h-4 text-red-400" />;
      case 'COMMENTED':
        return <MessageSquare className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* PR Description */}
          <div className="card p-6 mb-6">
            <div className="flex items-start space-x-3">
              <img
                src={pr.user.avatar_url}
                alt={pr.user.login}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-semibold">{pr.user.login}</span>
                  <span className={cn(
                    "text-sm",
                    theme === 'dark' ? "text-gray-500" : "text-gray-600"
                  )}>
                    opened this pull request {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className={cn(
                  "max-w-none prose break-words",
                  "prose-pre:whitespace-pre-wrap"
                )}>
                  {pr.body ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {pr.body}
                    </ReactMarkdown>
                  ) : (
                    <em className={cn(
                      theme === 'dark' ? "text-gray-500" : "text-gray-600"
                    )}>No description provided</em>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Branch info */}
          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <GitCommit className={cn(
                  "w-5 h-5",
                  theme === 'dark' ? "text-gray-400" : "text-gray-600"
                )} />
                <span className="text-sm">
                  <span className={cn(
                    "font-mono px-2 py-1 rounded",
                    theme === 'dark' ? "bg-gray-700" : "bg-gray-200"
                  )}>{pr.head.ref}</span>
                  <span className="mx-2">→</span>
                  <span className={cn(
                    "font-mono px-2 py-1 rounded",
                    theme === 'dark' ? "bg-gray-700" : "bg-gray-200"
                  )}>{pr.base.ref}</span>
                </span>
              </div>
              
              {pr.mergeable !== null && (
                <div className="flex items-center space-x-2">
                  {pr.mergeable ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400">Can be merged</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-400">Conflicts must be resolved</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Labels */}
          {pr.labels.length > 0 && (
            <div className="card p-4 mb-6">
              <div className="flex items-center space-x-3">
                <Tag className={cn(
                  "w-5 h-5",
                  theme === 'dark' ? "text-gray-400" : "text-gray-600"
                )} />
                <div className="flex flex-wrap gap-2">
                  {pr.labels.map((label) => (
                    <span
                      key={label.name}
                      className="px-3 py-1 rounded text-sm font-medium"
                      style={{
                        backgroundColor: `#${label.color}30`,
                        color: `#${label.color}`,
                      }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Participants */}
          <div className="card p-4 mb-6">
            <div className="flex items-center space-x-3">
              <Users className={cn(
                "w-5 h-5",
                theme === 'dark' ? "text-gray-400" : "text-gray-600"
              )} />
              <div className="flex -space-x-2">
                <img
                  src={pr.user.avatar_url}
                  alt={pr.user.login}
                  className={cn(
                    "w-8 h-8 rounded-full border-2",
                    theme === 'dark' ? "border-gray-800" : "border-white"
                  )}
                  title={`Author: ${pr.user.login}`}
                />
                {pr.assignees.map((assignee) => (
                  <img
                    key={assignee.login}
                    src={assignee.avatar_url}
                    alt={assignee.login}
                    className={cn(
                      "w-8 h-8 rounded-full border-2",
                      theme === 'dark' ? "border-gray-800" : "border-white"
                    )}
                    title={`Assignee: ${assignee.login}`}
                  />
                ))}
                {pr.requested_reviewers.map((reviewer) => (
                  <img
                    key={reviewer.login}
                    src={reviewer.avatar_url}
                    alt={reviewer.login}
                    className={cn(
                      "w-8 h-8 rounded-full border-2",
                      theme === 'dark' ? "border-gray-800" : "border-white"
                    )}
                    title={`Reviewer: ${reviewer.login}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            {timeline.map((item, index) => (
              <div key={`${item.type}-${item.id}`} className="card p-4">
                <div className="flex items-start space-x-3">
                  <img
                    src={item.user.avatar_url}
                    alt={item.user.login}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {item.type === 'review' && getReviewIcon((item as Review).state)}
                      <span className="font-semibold">{item.user.login}</span>
                      {item.type === 'review' && (
                        <span className="text-sm">
                          {(item as Review).state === 'APPROVED' && 'approved these changes'}
                          {(item as Review).state === 'CHANGES_REQUESTED' && 'requested changes'}
                          {(item as Review).state === 'COMMENTED' && 'reviewed'}
                        </span>
                      )}
                      <span className={cn(
                        "text-sm",
                        theme === 'dark' ? "text-gray-500" : "text-gray-600"
                      )}>
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <div className={cn(
                      theme === 'dark' ? "text-gray-300" : "text-gray-700"
                    )}>
                      {item.body || <em className={cn(
                        theme === 'dark' ? "text-gray-500" : "text-gray-600"
                      )}>No comment</em>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comment form */}
          {pr.state === 'open' && (
            <div className="card p-6 mt-6">
              <div className="flex items-start space-x-3">
                <img
                  src={user?.avatar_url || ''}
                  alt={user?.login || 'You'}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="input w-full h-32 resize-none mb-3"
                    placeholder="Leave a comment..."
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setReviewType('comment')}
                        className={cn(
                          'px-3 py-1 rounded text-sm',
                          reviewType === 'comment' 
                            ? (theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200')
                            : (theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100')
                        )}
                      >
                        Comment
                      </button>
                      <button
                        onClick={() => setReviewType('approve')}
                        className={cn(
                          'px-3 py-1 rounded text-sm',
                          reviewType === 'approve' 
                            ? (theme === 'dark' ? 'bg-green-900' : 'bg-green-100')
                            : (theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100')
                        )}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setReviewType('request_changes')}
                        className={cn(
                          'px-3 py-1 rounded text-sm',
                          reviewType === 'request_changes' 
                            ? (theme === 'dark' ? 'bg-red-900' : 'bg-red-100')
                            : (theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100')
                        )}
                      >
                        Request changes
                      </button>
                    </div>
                    
                    <button
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || isSubmitting}
                      className="btn btn-primary text-sm"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
