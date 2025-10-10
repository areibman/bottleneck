import React, { useMemo, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Issue } from '../../services/github';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { cn } from '../../utils/cn';

export type KanbanStatus = 'unassigned' | 'todo' | 'in-progress' | 'in-review' | 'done' | 'closed';

export interface KanbanIssue extends Issue {
  kanbanStatus: KanbanStatus;
  hasAssociatedPRs?: boolean;
  hasAssociatedBranches?: boolean;
}

interface KanbanBoardProps {
  issues: KanbanIssue[];
  onIssueStatusChange: (issueId: number, newStatus: KanbanStatus) => Promise<void>;
  onIssueClick: (issue: KanbanIssue) => void;
  onIssueEdit: (issue: KanbanIssue) => void;
  theme: 'light' | 'dark';
  loading?: boolean;
}

const COLUMNS: Array<{
  id: KanbanStatus;
  title: string;
  description: string;
  color: string;
}> = [
  {
    id: 'unassigned',
    title: 'Unassigned',
    description: 'Issues without assignees or associated work',
    color: 'bg-gray-100 border-gray-300',
  },
  {
    id: 'todo',
    title: 'TODO',
    description: 'Issues ready to be worked on',
    color: 'bg-blue-100 border-blue-300',
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    description: 'Issues being actively worked on',
    color: 'bg-yellow-100 border-yellow-300',
  },
  {
    id: 'in-review',
    title: 'In Review',
    description: 'Issues under human review',
    color: 'bg-purple-100 border-purple-300',
  },
  {
    id: 'done',
    title: 'Done',
    description: 'Merged and completed',
    color: 'bg-green-100 border-green-300',
  },
  {
    id: 'closed',
    title: 'Closed',
    description: 'Closed without merging',
    color: 'bg-red-100 border-red-300',
  },
];

const DARK_COLORS: Record<KanbanStatus, string> = {
  unassigned: 'bg-gray-800 border-gray-600',
  todo: 'bg-blue-900 border-blue-600',
  'in-progress': 'bg-yellow-900 border-yellow-600',
  'in-review': 'bg-purple-900 border-purple-600',
  done: 'bg-green-900 border-green-600',
  closed: 'bg-red-900 border-red-600',
};

export function KanbanBoard({
  issues,
  onIssueStatusChange,
  onIssueClick,
  onIssueEdit,
  theme,
  loading = false,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Group issues by status
  const issuesByStatus = useMemo(() => {
    const grouped: Record<KanbanStatus, KanbanIssue[]> = {
      unassigned: [],
      todo: [],
      'in-progress': [],
      'in-review': [],
      done: [],
      closed: [],
    };

    issues.forEach((issue) => {
      grouped[issue.kanbanStatus].push(issue);
    });

    return grouped;
  }, [issues]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Handle drag over events if needed
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) {
        return;
      }

      const issueId = parseInt(active.id as string);
      const newStatus = over.id as KanbanStatus;

      // Find the issue to get its current status
      const issue = issues.find((i) => i.id === issueId);
      if (!issue || issue.kanbanStatus === newStatus) {
        return;
      }

      try {
        await onIssueStatusChange(issueId, newStatus);
      } catch (error) {
        console.error('Failed to update issue status:', error);
        // TODO: Show error notification to user
      }
    },
    [issues, onIssueStatusChange]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={cn('text-lg', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>
          Loading issues...
        </div>
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <div className="flex h-full overflow-x-auto overflow-y-hidden">
        <div className="flex min-w-max h-full">
          {COLUMNS.map((column) => {
            const columnIssues = issuesByStatus[column.id];
            const isActive = activeId && columnIssues.some((issue) => issue.id.toString() === activeId);

            return (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                description={column.description}
                issueCount={columnIssues.length}
                color={theme === 'dark' ? DARK_COLORS[column.id] : column.color}
                theme={theme}
                isActive={isActive}
              >
                <SortableContext items={columnIssues.map((issue) => issue.id.toString())} strategy={verticalListSortingStrategy}>
                  {columnIssues.map((issue) => (
                    <KanbanCard
                      key={issue.id}
                      issue={issue}
                      onClick={() => onIssueClick(issue)}
                      onEdit={() => onIssueEdit(issue)}
                      theme={theme}
                      isDragging={activeId === issue.id.toString()}
                    />
                  ))}
                </SortableContext>
              </KanbanColumn>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}