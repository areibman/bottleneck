import { GitCommit, Check, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { PullRequest } from '../../services/github';

interface BranchInfoProps {
  pr: PullRequest;
  theme: 'light' | 'dark';
}

export function BranchInfo({ pr, theme }: BranchInfoProps) {
  return (
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
  );
}
