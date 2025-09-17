import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  GitPullRequest,
  GitPullRequestDraft,
  GitMerge,
  X,
  Check,
  Terminal,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { PullRequest } from '../../services/github';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../utils/cn';
import { CheckoutDropdown } from './CheckoutDropdown';

interface PRHeaderProps {
  pr: PullRequest;
  theme: 'dark' | 'light';
  fileStats: {
    additions: number;
    deletions: number;
    changed: number;
  };
  currentUser: { login: string; avatar_url?: string } | null;
  isApproving: boolean;
  onApprove: () => void;
  onRequestChanges: () => void;
  onMerge: () => void;
}

export function PRHeader({
  pr,
  theme,
  fileStats,
  currentUser,
  isApproving,
  onApprove,
  onRequestChanges,
  onMerge,
}: PRHeaderProps) {
  const navigate = useNavigate();
  const [showCheckoutDropdown, setShowCheckoutDropdown] = useState(false);
  const checkoutDropdownRef = useRef<HTMLDivElement>(null);

  const isAuthor = currentUser && pr.user.login === currentUser.login;
  const hasApproved = currentUser && pr.approvedBy?.some(
    r => r.login === currentUser.login
  );
  const hasRequestedChanges = currentUser && pr.changesRequestedBy?.some(
    r => r.login === currentUser.login
  );

  return (
    <div className={cn(
      "p-4 border-b",
      theme === 'dark'
        ? "bg-gray-800 border-gray-700"
        : "bg-gray-50 border-gray-200"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/pulls')}
            className={cn(
              "p-1 rounded transition-colors",
              theme === 'dark' ? "hover:bg-gray-700" : "hover:bg-gray-100"
            )}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            {pr.draft ? (
              <div title="Draft">
                <GitPullRequestDraft className="w-5 h-5 text-gray-400" />
              </div>
            ) : pr.merged ? (
              <GitMerge className="w-5 h-5 text-purple-400" />
            ) : pr.state === 'open' ? (
              <GitPullRequest className="w-5 h-5 text-green-400" />
            ) : (
              <X className="w-5 h-5 text-red-400" />
            )}

            <h1 className="text-base font-semibold">
              {pr.title}
              <span className={cn(
                "ml-2 text-xs",
                theme === 'dark' ? "text-gray-500" : "text-gray-600"
              )}>#{pr.number}</span>
            </h1>

            {/* GitHub Link */}
            <a
              href={`https://github.com/${pr.base.repo.owner.login}/${pr.base.repo.name}/pull/${pr.number}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "p-1 rounded transition-colors",
                theme === 'dark'
                  ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                  : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
              )}
              title="Open in GitHub"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative" ref={checkoutDropdownRef}>
            <button
              onClick={() => setShowCheckoutDropdown(!showCheckoutDropdown)}
              className="btn btn-secondary text-xs flex items-center"
            >
              <Terminal className="w-3 h-3 mr-1" />
              Checkout
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>

            {showCheckoutDropdown && (
              <CheckoutDropdown
                pr={pr}
                theme={theme}
                onClose={() => setShowCheckoutDropdown(false)}
                checkoutDropdownRef={checkoutDropdownRef}
              />
            )}
          </div>

          {pr.state === 'open' && !pr.merged && (
            <>
              {/* Don't show review buttons for PR authors */}
              {!isAuthor && (
                <>
                  <button
                    onClick={onApprove}
                    disabled={isApproving || !!hasApproved}
                    className={cn(
                      "btn text-xs",
                      hasApproved ? "btn-success" : "btn-secondary"
                    )}
                    title={
                      hasApproved ? "You have already approved this PR" :
                        "Approve this pull request"
                    }
                  >
                    {isApproving ? (
                      <>
                        <div className="w-3 h-3 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Reviewing...
                      </>
                    ) : hasApproved ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Approved
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Approve
                      </>
                    )}
                  </button>

                  <button
                    onClick={onRequestChanges}
                    disabled={isApproving}
                    className={cn(
                      "btn text-xs",
                      hasRequestedChanges ? "btn-danger" : "btn-secondary"
                    )}
                    title={
                      hasRequestedChanges ? "You have requested changes on this PR" :
                        "Request changes to this pull request"
                    }
                  >
                    {hasRequestedChanges ? (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Changes Requested
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Request Changes
                      </>
                    )}
                  </button>
                </>
              )}

              <button
                onClick={onMerge}
                className="btn btn-primary text-xs"
              >
                <GitMerge className="w-3 h-3 mr-1" />
                Merge
              </button>
            </>
          )}
        </div>
      </div>

      {/* PR Info */}
      <div className={cn(
        "flex items-center space-x-4 text-xs",
        theme === 'dark' ? "text-gray-400" : "text-gray-600"
      )}>
        <div className="flex items-center space-x-2">
          <img
            src={pr.user.avatar_url}
            alt={pr.user.login}
            className="w-4 h-4 rounded-full"
          />
          <span>{pr.user.login}</span>
        </div>

        <span>wants to merge {pr.head.ref} into {pr.base.ref}</span>

        <span>
          {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
        </span>

        <div className="flex items-center space-x-2">
          <span className="text-green-400">+{fileStats.additions}</span>
          <span className="text-red-400">-{fileStats.deletions}</span>
          <span>{fileStats.changed} files</span>
        </div>

        {/* Approval Status Badge */}
        {pr.state === 'open' && !pr.merged && (
          <div className="flex items-center">
            {pr.approvalStatus === 'approved' ? (
              <div className="flex items-center px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                <span className="text-xs">
                  Approved {pr.approvedBy && pr.approvedBy.length > 0 && `(${pr.approvedBy.length})`}
                </span>
              </div>
            ) : pr.approvalStatus === 'changes_requested' ? (
              <div className="flex items-center px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                <XCircle className="w-3 h-3 mr-1" />
                <span className="text-xs">Changes requested</span>
              </div>
            ) : pr.approvalStatus === 'pending' ? (
              <div className="flex items-center px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                <Clock className="w-3 h-3 mr-1" />
                <span className="text-xs">Review pending</span>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
