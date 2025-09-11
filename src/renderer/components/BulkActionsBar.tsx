import React, { useState } from 'react';
import {
  GitMerge,
  XCircle,
  Tag,
  Users,
  CheckCircle,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { usePullRequestStore } from '../store/pullRequestStore';
import { useAppStore } from '../store/appStore';

const BulkActionsBar: React.FC = () => {
  const { selectedPRs, pullRequests, clearSelection } = usePullRequestStore();
  const { selectedRepo } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedPRsList = Array.from(selectedPRs)
    .map(id => pullRequests.find(pr => pr.id === id))
    .filter(Boolean);

  const canMerge = selectedPRsList.every(pr => 
    pr?.state === 'open' && !pr?.draft && pr?.mergeable
  );

  const handleBulkMerge = async () => {
    if (!selectedRepo || !canMerge) return;
    
    setIsProcessing(true);
    const [owner, repo] = selectedRepo.full_name.split('/');
    
    for (const pr of selectedPRsList) {
      if (pr) {
        try {
          await window.electronAPI.github.mergePR(owner, repo, pr.number, {
            method: 'merge',
          });
        } catch (error) {
          console.error(`Failed to merge PR #${pr.number}:`, error);
        }
      }
    }
    
    setIsProcessing(false);
    clearSelection();
  };

  const handleBulkClose = async () => {
    if (!selectedRepo) return;
    
    setIsProcessing(true);
    const [owner, repo] = selectedRepo.full_name.split('/');
    
    // Implementation for bulk close
    // Similar to merge but closes PRs instead
    
    setIsProcessing(false);
    clearSelection();
  };

  const handleBulkLabel = async () => {
    // Show label selector modal
    console.log('Add labels to selected PRs');
  };

  const handleBulkReviewers = async () => {
    // Show reviewer selector modal
    console.log('Request reviewers for selected PRs');
  };

  const handleMarkReady = async () => {
    if (!selectedRepo) return;
    
    setIsProcessing(true);
    const [owner, repo] = selectedRepo.full_name.split('/');
    
    // Implementation for marking PRs as ready for review
    
    setIsProcessing(false);
    clearSelection();
  };

  return (
    <div className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)]">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--text-secondary)]">
          {selectedPRs.size} pull request{selectedPRs.size !== 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleBulkMerge}
          disabled={!canMerge || isProcessing}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GitMerge size={16} />
          <span>Merge</span>
        </button>

        <button
          onClick={handleBulkClose}
          disabled={isProcessing}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
        >
          <XCircle size={16} />
          <span>Close</span>
        </button>

        <button
          onClick={handleBulkLabel}
          disabled={isProcessing}
          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          <Tag size={16} />
          <span>Label</span>
        </button>

        <button
          onClick={handleBulkReviewers}
          disabled={isProcessing}
          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          <Users size={16} />
          <span>Reviewers</span>
        </button>

        <button
          onClick={handleMarkReady}
          disabled={isProcessing}
          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          <CheckCircle size={16} />
          <span>Mark Ready</span>
        </button>

        <button
          disabled={isProcessing}
          className="p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      <button
        onClick={clearSelection}
        className="text-sm text-[var(--accent-primary)] hover:underline"
      >
        Cancel
      </button>
    </div>
  );
};

export default BulkActionsBar;