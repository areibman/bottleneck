import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '../../utils/cn';

interface KanbanColumnProps {
  id: string;
  title: string;
  description: string;
  issueCount: number;
  color: string;
  theme: 'light' | 'dark';
  isActive?: boolean;
  children: React.ReactNode;
}

export function KanbanColumn({
  id,
  title,
  description,
  issueCount,
  color,
  theme,
  isActive = false,
  children,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-80 min-w-80 max-w-80 h-full border-r',
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200',
        isOver && 'bg-opacity-50',
        isActive && 'ring-2 ring-blue-500 ring-opacity-50',
        'flex-shrink-0'
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          'p-4 border-b',
          color,
          theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <h3
            className={cn(
              'text-sm font-semibold',
              theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
            )}
          >
            {title}
          </h3>
          <span
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              theme === 'dark'
                ? 'bg-gray-700 text-gray-300'
                : 'bg-white text-gray-600'
            )}
          >
            {issueCount}
          </span>
        </div>
        <p
          className={cn(
            'text-xs',
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          )}
        >
          {description}
        </p>
      </div>

      {/* Column Content */}
      <div
        className={cn(
          'flex-1 overflow-y-auto p-2 space-y-2',
          isOver && 'bg-blue-50 bg-opacity-20',
          theme === 'dark' && isOver && 'bg-blue-900 bg-opacity-20'
        )}
      >
        {children}
      </div>
    </div>
  );
}