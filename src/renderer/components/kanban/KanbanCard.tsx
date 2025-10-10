import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, CheckCircle, MessageSquare, Edit2, User, GitBranch, GitPullRequest } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../utils/cn';
import { getLabelColors } from '../../utils/labelColors';
import { KanbanIssue } from './KanbanBoard';

interface KanbanCardProps {
  issue: KanbanIssue;
  onClick: () => void;
  onEdit: () => void;
  theme: 'light' | 'dark';
  isDragging?: boolean;
}

export function KanbanCard({ issue, onClick, onEdit, theme, isDragging = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: issue.id.toString(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const getStatusIcon = () => {
    switch (issue.kanbanStatus) {
      case 'unassigned':
        return <User className="w-4 h-4 text-gray-500" />;
      case 'todo':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'in-progress':
        return <GitBranch className="w-4 h-4 text-yellow-500" />;
      case 'in-review':
        return <GitPullRequest className="w-4 h-4 text-purple-500" />;
      case 'done':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'closed':
        return <CheckCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:scale-[1.02]',
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
          : 'bg-white border-gray-200 hover:bg-gray-50',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg scale-105',
        'group'
      )}
      onClick={onClick}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {getStatusIcon()}
          <span
            className={cn(
              'text-xs font-medium',
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            )}
          >
            #{issue.number}
          </span>
        </div>
        <button
          onClick={handleEditClick}
          className={cn(
            'opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity',
            theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
          )}
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </div>

      {/* Card Title */}
      <h4
        className={cn(
          'text-sm font-medium mb-2 line-clamp-2',
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        )}
      >
        {issue.title}
      </h4>

      {/* Card Body - Show first part of description if available */}
      {issue.body && (
        <p
          className={cn(
            'text-xs mb-3 line-clamp-3',
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          )}
        >
          {issue.body.replace(/[#*`]/g, '').substring(0, 120)}
          {issue.body.length > 120 && '...'}
        </p>
      )}

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {issue.labels.slice(0, 3).map((label) => {
            const labelColors = getLabelColors(label.color, theme);
            return (
              <span
                key={label.name}
                className="px-2 py-0.5 text-xs rounded font-medium"
                style={{
                  backgroundColor: labelColors.backgroundColor,
                  color: labelColors.color,
                }}
              >
                {label.name}
              </span>
            );
          })}
          {issue.labels.length > 3 && (
            <span
              className={cn(
                'px-2 py-0.5 text-xs rounded font-medium',
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-200 text-gray-600'
              )}
            >
              +{issue.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Card Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          {/* Author */}
          <div className="flex items-center space-x-1">
            <img
              src={issue.user.avatar_url}
              alt={issue.user.login}
              className="w-4 h-4 rounded-full"
            />
            <span
              className={cn(
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              )}
            >
              {issue.user.login}
            </span>
          </div>

          {/* Comments */}
          {issue.comments > 0 && (
            <div className="flex items-center space-x-1">
              <MessageSquare className="w-3 h-3" />
              <span
                className={cn(
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                )}
              >
                {issue.comments}
              </span>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span
          className={cn(
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          )}
        >
          {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}
        </span>
      </div>

      {/* Assignees */}
      {issue.assignees.length > 0 && (
        <div className="flex items-center space-x-1 mt-2">
          <span
            className={cn(
              'text-xs',
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            )}
          >
            Assigned:
          </span>
          <div className="flex -space-x-1">
            {issue.assignees.slice(0, 3).map((assignee) => (
              <img
                key={assignee.login}
                src={assignee.avatar_url}
                alt={assignee.login}
                className={cn(
                  'w-5 h-5 rounded-full border-2',
                  theme === 'dark' ? 'border-gray-800' : 'border-white'
                )}
                title={assignee.login}
              />
            ))}
            {issue.assignees.length > 3 && (
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-medium',
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-800 text-gray-300'
                    : 'bg-gray-200 border-white text-gray-600'
                )}
                title={`+${issue.assignees.length - 3} more`}
              >
                +{issue.assignees.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Associated Work Indicators */}
      <div className="flex items-center space-x-2 mt-2">
        {issue.hasAssociatedPRs && (
          <div
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              theme === 'dark'
                ? 'bg-blue-900 text-blue-300'
                : 'bg-blue-100 text-blue-700'
            )}
          >
            <GitPullRequest className="w-3 h-3 inline mr-1" />
            PR
          </div>
        )}
        {issue.hasAssociatedBranches && (
          <div
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              theme === 'dark'
                ? 'bg-green-900 text-green-300'
                : 'bg-green-100 text-green-700'
            )}
          >
            <GitBranch className="w-3 h-3 inline mr-1" />
            Branch
          </div>
        )}
      </div>
    </div>
  );
}