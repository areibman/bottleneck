import { Bot, MessageSquare, CheckCircle2, XCircle, MessageCircle, ExternalLink, Check, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ParticipantStat } from './types';
import { VercelDeploymentCard } from './VercelDeploymentCard';

interface ParticipantCardProps {
  participant: ParticipantStat;
  theme: 'light' | 'dark';
}

export function ParticipantCard({ participant, theme }: ParticipantCardProps) {
  return (
    <div className={cn(
      "p-3 rounded-lg",
      theme === 'dark' ? "bg-gray-800" : "bg-white border border-gray-200"
    )}>
      <div className="flex items-start space-x-3">
        <img
          src={participant.user.avatar_url}
          alt={participant.user.login}
          className="w-10 h-10 rounded-full"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm truncate flex items-center">
                {participant.user.login}
                {participant.isBot && (
                  <span title="Bot account">
                    <Bot className="w-3 h-3 ml-1 text-gray-500" />
                  </span>
                )}
              </div>
              <div className={cn(
                "text-xs",
                theme === 'dark' ? "text-gray-400" : "text-gray-500"
              )}>
                {participant.role}
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {participant.latestReviewState === 'APPROVED' && (
                <div 
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20"
                  title="Approved"
                >
                  <Check className="w-3 h-3 text-green-400" />
                </div>
              )}
              {participant.latestReviewState === 'CHANGES_REQUESTED' && (
                <div 
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20"
                  title="Requested changes"
                >
                  <X className="w-3 h-3 text-red-400" />
                </div>
              )}
            </div>
          </div>
          
          {/* Contribution stats */}
          <div className={cn(
            "mt-2 flex flex-wrap gap-2 text-xs",
            theme === 'dark' ? "text-gray-400" : "text-gray-600"
          )}>
            {participant.comments > 0 && (
              <div className="flex items-center" title={`${participant.comments} comment${participant.comments > 1 ? 's' : ''}`}>
                <MessageSquare className="w-3 h-3 mr-1" />
                <span>{participant.comments}</span>
              </div>
            )}
            {participant.approvals > 0 && (
              <div className="flex items-center text-green-400" title={`Approved ${participant.approvals} time${participant.approvals > 1 ? 's' : ''}`}>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                <span>{participant.approvals}</span>
              </div>
            )}
            {participant.changesRequested > 0 && (
              <div className="flex items-center text-red-400" title={`Requested changes ${participant.changesRequested} time${participant.changesRequested > 1 ? 's' : ''}`}>
                <XCircle className="w-3 h-3 mr-1" />
                <span>{participant.changesRequested}</span>
              </div>
            )}
            {participant.reviewComments > 0 && (
              <div className="flex items-center" title={`${participant.reviewComments} review comment${participant.reviewComments > 1 ? 's' : ''}`}>
                <MessageCircle className="w-3 h-3 mr-1" />
                <span>{participant.reviewComments}</span>
              </div>
            )}
          </div>
          
          {/* Vercel Deployments */}
          {participant.vercelDeployments && participant.vercelDeployments.length > 0 && (
            <VercelDeploymentCard deployments={participant.vercelDeployments} theme={theme} />
          )}
          
          {/* Links from latest comment (for other bots) */}
          {!participant.vercelDeployments && participant.latestCommentLinks && participant.latestCommentLinks.length > 0 && (
            <div className={cn(
              "mt-2 pt-2 border-t space-y-1",
              theme === 'dark' ? "border-gray-700" : "border-gray-200"
            )}>
              {participant.latestCommentLinks.slice(0, 3).map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center text-xs transition-colors",
                    theme === 'dark' 
                      ? "text-blue-400 hover:text-blue-300" 
                      : "text-blue-600 hover:text-blue-700"
                  )}
                >
                  <ExternalLink className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{link.text}</span>
                </a>
              ))}
              {participant.latestCommentLinks.length > 3 && (
                <div className={cn(
                  "text-xs",
                  theme === 'dark' ? "text-gray-500" : "text-gray-600"
                )}>
                  +{participant.latestCommentLinks.length - 3} more link{participant.latestCommentLinks.length - 3 > 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
