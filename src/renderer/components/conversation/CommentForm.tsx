import { useState } from 'react';
import { Send } from 'lucide-react';
import { cn } from '../../utils/cn';
import { PullRequest } from '../../services/github';

interface CommentFormProps {
  pr: PullRequest;
  user: { avatar_url: string; login: string } | null;
  token: string | null;
  theme: 'light' | 'dark';
  onCommentSubmit: () => void;
}

export function CommentForm({ pr, user, token, theme, onCommentSubmit }: CommentFormProps) {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewType, setReviewType] = useState<'comment' | 'approve' | 'request_changes'>('comment');

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !token) return;
    
    setIsSubmitting(true);
    try {
      const { GitHubAPI } = await import('../../services/github');
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

  if (pr.state !== 'open') return null;

  return (
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
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
