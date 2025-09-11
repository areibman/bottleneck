import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Reply,
  Edit,
  Trash2
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { formatDistanceToNow } from 'date-fns';

export const ConversationTab: React.FC = () => {
  const { selectedPR, loadPRDetails } = useAppStore();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPR) {
      loadComments();
    }
  }, [selectedPR]);

  const loadComments = async () => {
    if (!selectedPR) return;
    
    setLoading(true);
    try {
      const commentsData = await window.electronAPI.github.getPRComments(
        selectedPR.repo, 
        selectedPR.number
      );
      setComments(commentsData);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!selectedPR || !newComment.trim()) return;

    try {
      await window.electronAPI.github.createReview(selectedPR.repo, selectedPR.number, {
        body: newComment,
        event: 'COMMENT'
      });
      setNewComment('');
      setReplyingTo(null);
      loadComments();
    } catch (error) {
      console.error('Failed to submit comment:', error);
    }
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
  };

  if (!selectedPR) return null;

  return (
    <div className="h-full flex flex-col">
      {/* PR Description */}
      <div className="p-6 border-b border-[#30363d]">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-[#21262d] rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">{selectedPR.author}</span>
              <span className="text-sm text-gray">
                {formatDistanceToNow(new Date(selectedPR.createdAt), { addSuffix: true })}
              </span>
            </div>
            <div className="prose prose-invert max-w-none">
              {selectedPR.body ? (
                <div 
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedPR.body }}
                />
              ) : (
                <p className="text-gray italic">No description provided</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="spinner" />
          </div>
        ) : comments.length === 0 ? (
          <div className="p-6 text-center text-gray">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No comments yet</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-4">
                <div className="w-8 h-8 bg-[#21262d] rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{comment.author}</span>
                    <span className="text-sm text-gray">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                    {comment.updatedAt !== comment.createdAt && (
                      <span className="text-xs text-gray">(edited)</span>
                    )}
                  </div>
                  
                  <div className="prose prose-invert max-w-none mb-3">
                    <div 
                      className="text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: comment.body }}
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1 text-sm text-gray hover:text-white">
                      <ThumbsUp className="w-4 h-4" />
                      <span>0</span>
                    </button>
                    <button className="flex items-center gap-1 text-sm text-gray hover:text-white">
                      <ThumbsDown className="w-4 h-4" />
                      <span>0</span>
                    </button>
                    <button 
                      className="flex items-center gap-1 text-sm text-gray hover:text-white"
                      onClick={() => handleReply(comment.id)}
                    >
                      <Reply className="w-4 h-4" />
                      <span>Reply</span>
                    </button>
                    <button className="flex items-center gap-1 text-sm text-gray hover:text-white">
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button className="flex items-center gap-1 text-sm text-red-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>

                  {/* Reply form */}
                  {replyingTo === comment.id && (
                    <div className="mt-4 p-4 bg-[#0d1117] rounded border border-[#30363d]">
                      <textarea
                        className="w-full p-3 bg-[#161b22] border border-[#30363d] rounded text-sm resize-none"
                        rows={3}
                        placeholder="Write a reply..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                      <div className="flex items-center justify-end gap-2 mt-3">
                        <button
                          className="btn btn-secondary text-sm"
                          onClick={() => setReplyingTo(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-primary text-sm"
                          onClick={handleSubmitComment}
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Comment Form */}
      <div className="p-6 border-t border-[#30363d] bg-[#161b22]">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-[#21262d] rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <textarea
              className="w-full p-3 bg-[#0d1117] border border-[#30363d] rounded text-sm resize-none"
              rows={4}
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-gray">
                Press Ctrl+Enter to submit
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-secondary text-sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </button>
                <button className="btn btn-secondary text-sm">
                  <XCircle className="w-4 h-4 mr-1" />
                  Request Changes
                </button>
                <button
                  className="btn btn-primary text-sm"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim()}
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};