import { PullRequest, Comment, Review } from '../services/github';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { PRDescription } from './conversation/PRDescription';
import { BranchInfo } from './conversation/BranchInfo';
import { PRLabels } from './conversation/PRLabels';
import { TimelineItem } from './conversation/TimelineItem';
import { CommentForm } from './conversation/CommentForm';
import { ParticipantsSidebar } from './conversation/ParticipantsSidebar';
import { useParticipantStats } from './conversation/useParticipantStats';

interface ConversationTabProps {
  pr: PullRequest;
  comments: Comment[];
  reviews: Review[];
  onCommentSubmit: () => void;
}

export function ConversationTab({ pr, comments, reviews, onCommentSubmit }: ConversationTabProps) {
  const { user, token } = useAuthStore();
  const { theme } = useUIStore();
  
  // Calculate participant stats
  const participantStats = useParticipantStats(pr, comments, reviews);

  // Combine comments and reviews into a timeline
  // Filter out reviews that are PENDING or have no submitted_at timestamp
  const timeline = [
    ...comments
      .filter(c => c.created_at && c.user) // Filter out invalid comments
      .map(c => ({ ...c, type: 'comment' as const, timestamp: c.created_at })),
    ...reviews
      .filter(r => 
        r.state !== 'PENDING' && 
        r.state !== 'DISMISSED' && 
        r.submitted_at && 
        r.user
      ) // Only show submitted, non-dismissed reviews with valid data
      .map(r => ({ ...r, type: 'review' as const, timestamp: r.submitted_at || '' })),
  ]
    .filter(item => item.timestamp && new Date(item.timestamp).getTime() > 0) // Filter out items with invalid timestamps
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 pr-2">
          {/* PR Description */}
          <PRDescription pr={pr} theme={theme} />

          {/* Branch info */}
          <BranchInfo pr={pr} theme={theme} />

          {/* Labels */}
          <PRLabels labels={pr.labels} theme={theme} />

          {/* Timeline */}
          <div className="space-y-4">
            {timeline.map((item, index) => (
              <TimelineItem
                key={`${item.type}-${item.id}-${index}`}
                item={item}
                theme={theme}
              />
            ))}
          </div>

          {/* Comment form */}
          <CommentForm
            pr={pr}
            user={user}
            token={token}
            theme={theme}
            onCommentSubmit={onCommentSubmit}
          />
        </div>
      </div>
      
      {/* Participants Sidebar */}
      <ParticipantsSidebar participants={participantStats} theme={theme} />
    </div>
  );
}