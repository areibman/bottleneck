import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../utils/cn';
import { Markdown } from '../Markdown';
import { PullRequest } from '../../services/github';

interface PRDescriptionProps {
  pr: PullRequest;
  theme: 'light' | 'dark';
}

export function PRDescription({ pr, theme }: PRDescriptionProps) {
  return (
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
            theme === 'dark' ? "text-gray-300" : "text-gray-700"
          )}>
            {pr.body ? (
              <Markdown content={pr.body} />
            ) : (
              <em className={cn(
                theme === 'dark' ? "text-gray-500" : "text-gray-600"
              )}>No description provided</em>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
