import { AlertTriangle, GitMerge } from 'lucide-react';
import { PullRequest } from '../../services/github';
import { cn } from '../../utils/cn';

interface MergeConfirmDialogProps {
  pr: PullRequest;
  theme: 'dark' | 'light';
  mergeMethod: 'merge' | 'squash' | 'rebase';
  isMerging: boolean;
  onMergeMethodChange: (method: 'merge' | 'squash' | 'rebase') => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MergeConfirmDialog({
  pr,
  theme,
  mergeMethod,
  isMerging,
  onMergeMethodChange,
  onConfirm,
  onCancel,
}: MergeConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={cn(
        "rounded-lg shadow-xl p-6 max-w-md w-full mx-4",
        theme === 'dark'
          ? "bg-gray-800 border border-gray-700"
          : "bg-white border border-gray-200"
      )}>
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
          <h2 className="text-lg font-semibold">Confirm Merge</h2>
        </div>

        <p className={cn(
          "text-sm mb-4",
          theme === 'dark' ? "text-gray-300" : "text-gray-700"
        )}>
          Are you sure you want to merge <strong>#{pr.number} {pr.title}</strong>?
        </p>

        <div className="mb-4">
          <label className={cn(
            "block text-xs font-medium mb-2",
            theme === 'dark' ? "text-gray-400" : "text-gray-600"
          )}>
            Merge method:
          </label>
          <select
            value={mergeMethod}
            onChange={(e) => onMergeMethodChange(e.target.value as 'merge' | 'squash' | 'rebase')}
            className={cn(
              "w-full px-3 py-2 text-sm rounded border",
              theme === 'dark'
                ? "bg-gray-900 border-gray-700 text-gray-300"
                : "bg-white border-gray-300 text-gray-900"
            )}
          >
            <option value="merge">Create a merge commit</option>
            <option value="squash">Squash and merge</option>
            <option value="rebase">Rebase and merge</option>
          </select>
        </div>

        {pr.mergeable === false && (
          <div className={cn(
            "mb-4 p-3 rounded text-sm",
            theme === 'dark'
              ? "bg-red-900/20 text-red-400 border border-red-800"
              : "bg-red-50 text-red-700 border border-red-200"
          )}>
            <strong>Warning:</strong> This pull request has conflicts that must be resolved before merging.
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="btn btn-secondary text-sm"
            disabled={isMerging}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isMerging || pr.mergeable === false}
            className="btn btn-primary text-sm"
          >
            {isMerging ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <GitMerge className="w-4 h-4 mr-2" />
                Confirm Merge
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
