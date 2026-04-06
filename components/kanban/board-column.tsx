'use client';

import { Column, Task, Label as LabelType } from '@/lib/types';
import { TaskDetailModal } from './task-detail-modal';
import { Button } from '@/components/ui/button';
import { CalendarDays, CheckCircle2, CircleDashed, Eye, Flag, TimerReset } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTaskCard } from './sortable-task-card';

interface BoardColumnProps {
  column: Column;
  tasks: Task[];
  labels: LabelType[];
  userId: string;
  boardId: string;
  onTaskCreated: () => void;
  onTaskDeleted: (task: Task) => void;
  isDropTarget?: boolean;
  insertionTaskId?: string | null;
  insertionPosition?: 'before' | 'after' | null;
}

const columnThemeMap: Record<
  string,
  {
    container: string;
    header: string;
    accent: string;
    badge: string;
    button: string;
    empty: string;
    icon: typeof CircleDashed;
    subtitle: string;
  }
> = {
  'To Do': {
    container:
      'border-slate-300 bg-slate-50/95 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900/90',
    header:
      'border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/90 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800',
    accent: 'from-slate-400 to-slate-600 dark:from-slate-300 dark:to-slate-500',
    badge:
      'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    button:
      'border-slate-300 bg-white/90 text-slate-700 shadow-[0_10px_20px_-16px_rgba(15,23,42,0.8)] hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white',
    empty: 'text-slate-500 dark:text-slate-400',
    icon: CircleDashed,
    subtitle: 'Ideas and planned work',
  },
  'In Progress': {
    container:
      'border-blue-300 bg-blue-50/95 shadow-[0_18px_40px_-30px_rgba(37,99,235,0.45)] dark:border-blue-800 dark:bg-blue-950/40',
    header:
      'border-blue-200 bg-gradient-to-br from-white via-blue-50 to-blue-100/90 dark:border-blue-800 dark:from-slate-900 dark:via-blue-950/60 dark:to-blue-900/40',
    accent: 'from-blue-400 to-blue-600 dark:from-blue-300 dark:to-blue-500',
    badge:
      'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
    button:
      'border-blue-300 bg-white/90 text-blue-700 shadow-[0_10px_20px_-16px_rgba(37,99,235,0.85)] hover:-translate-y-0.5 hover:bg-blue-100 hover:text-blue-900 dark:border-blue-700 dark:bg-slate-950 dark:text-blue-200 dark:hover:bg-blue-900/40 dark:hover:text-blue-100',
    empty: 'text-blue-600 dark:text-blue-300',
    icon: TimerReset,
    subtitle: 'Active execution lane',
  },
  'In Review': {
    container:
      'border-amber-300 bg-amber-50/95 shadow-[0_18px_40px_-30px_rgba(217,119,6,0.45)] dark:border-amber-800 dark:bg-amber-950/35',
    header:
      'border-amber-200 bg-gradient-to-br from-white via-amber-50 to-amber-100/90 dark:border-amber-800 dark:from-slate-900 dark:via-amber-950/60 dark:to-amber-900/40',
    accent: 'from-amber-400 to-orange-500 dark:from-amber-300 dark:to-orange-400',
    badge:
      'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    button:
      'border-amber-300 bg-white/90 text-amber-800 shadow-[0_10px_20px_-16px_rgba(217,119,6,0.85)] hover:-translate-y-0.5 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-700 dark:bg-slate-950 dark:text-amber-200 dark:hover:bg-amber-900/40 dark:hover:text-amber-100',
    empty: 'text-amber-700 dark:text-amber-300',
    icon: Eye,
    subtitle: 'Validation and feedback',
  },
  Done: {
    container:
      'border-emerald-300 bg-emerald-50/95 shadow-[0_18px_40px_-30px_rgba(5,150,105,0.45)] dark:border-emerald-800 dark:bg-emerald-950/35',
    header:
      'border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-emerald-100/90 dark:border-emerald-800 dark:from-slate-900 dark:via-emerald-950/60 dark:to-emerald-900/40',
    accent: 'from-emerald-400 to-emerald-600 dark:from-emerald-300 dark:to-emerald-500',
    badge:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    button:
      'border-emerald-300 bg-white/90 text-emerald-800 shadow-[0_10px_20px_-16px_rgba(5,150,105,0.85)] hover:-translate-y-0.5 hover:bg-emerald-100 hover:text-emerald-900 dark:border-emerald-700 dark:bg-slate-950 dark:text-emerald-200 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-100',
    empty: 'text-emerald-700 dark:text-emerald-300',
    icon: CheckCircle2,
    subtitle: 'Completed and ready',
  },
};

export function BoardColumn({
  column,
  tasks,
  labels,
  userId,
  boardId,
  onTaskCreated,
  onTaskDeleted,
  isDropTarget = false,
  insertionTaskId = null,
  insertionPosition = null,
}: BoardColumnProps) {
  const [dueDateSortDirection, setDueDateSortDirection] = useState<'asc' | 'desc'>('asc');
  const [prioritySortDirection, setPrioritySortDirection] = useState<'asc' | 'desc' | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
  });
  const theme = columnThemeMap[column.name] ?? columnThemeMap['To Do'];
  const Icon = theme.icon;
  const priorityRank = { low: 0, normal: 1, high: 2 };
  const displayedTasks = [...tasks].sort((left, right) => {
    if (prioritySortDirection) {
      const leftPriority = priorityRank[left.priority];
      const rightPriority = priorityRank[right.priority];

      if (leftPriority !== rightPriority) {
        return prioritySortDirection === 'asc'
          ? leftPriority - rightPriority
          : rightPriority - leftPriority;
      }
    }

    const leftHasDate = Boolean(left.due_date);
    const rightHasDate = Boolean(right.due_date);
    const leftTime = left.due_date ? new Date(left.due_date).getTime() : 0;
    const rightTime = right.due_date ? new Date(right.due_date).getTime() : 0;

    if (!leftHasDate && !rightHasDate) {
      return left.order - right.order;
    }

    if (!leftHasDate) return 1;
    if (!rightHasDate) return -1;

    if (leftTime !== rightTime) {
      return dueDateSortDirection === 'asc' ? leftTime - rightTime : rightTime - leftTime;
    }

    return left.order - right.order;
  });

  const handleDueDateSort = () => {
    const nextDirection = dueDateSortDirection === 'asc' ? 'desc' : 'asc';
    setDueDateSortDirection(nextDirection);
    setPrioritySortDirection(null);
    toast.success(`Sorted by due date (${nextDirection})`);
  };

  const handlePrioritySort = () => {
    const nextDirection = prioritySortDirection === 'asc' ? 'desc' : 'asc';
    setPrioritySortDirection(nextDirection);
    toast.success(`Sorted by priority (${nextDirection})`);
  };

  return (
    <div
      className={`flex-shrink-0 w-80 rounded-xl border p-4 flex flex-col h-[calc(100vh-180px)] shadow-sm transition-all ${theme.container} ${
        isDropTarget
          ? 'ring-2 ring-offset-2 ring-offset-white ring-blue-400 shadow-[0_22px_50px_-26px_rgba(59,130,246,0.6)] dark:ring-offset-slate-950 dark:ring-blue-500'
          : ''
      }`}
    >
      <div className={`relative mb-4 overflow-hidden rounded-2xl border p-4 ${theme.header}`}>
        <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${theme.accent}`} />
        <div className="absolute right-3 top-3 h-16 w-16 rounded-full bg-white/40 blur-2xl dark:bg-white/5" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl border border-white/60 bg-white/70 p-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
              <Icon className="h-4 w-4 text-gray-700 dark:text-gray-100" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-base">
                {column.name}
              </h2>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                {theme.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-full border border-white/60 bg-white/75 p-0 text-gray-600 shadow-sm transition-colors hover:bg-white hover:text-gray-900 dark:border-white/10 dark:bg-slate-900/70 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white"
              onClick={handleDueDateSort}
              disabled={tasks.length < 2}
              title={`Sort by due date ${dueDateSortDirection === 'asc' ? 'descending' : 'ascending'}`}
            >
              <CalendarDays className={`h-4 w-4 ${dueDateSortDirection === 'desc' ? 'rotate-180' : ''}`} />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 rounded-full border border-white/60 bg-white/75 p-0 text-gray-600 shadow-sm transition-colors hover:bg-white hover:text-gray-900 dark:border-white/10 dark:bg-slate-900/70 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white"
              onClick={handlePrioritySort}
              disabled={tasks.length < 2}
              title={`Sort by priority ${prioritySortDirection === 'asc' ? 'descending' : 'ascending'}`}
            >
              <Flag className={`h-4 w-4 ${prioritySortDirection === 'desc' ? 'rotate-180' : ''}`} />
            </Button>
            <span className={`text-xs md:text-sm font-medium px-2.5 py-1 rounded-full shadow-sm ${theme.badge}`}>
              {tasks.length}
            </span>
          </div>
        </div>
      </div>

      <SortableContext items={displayedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`relative flex-1 space-y-3 overflow-y-auto pr-2 mb-3 rounded-2xl border border-dashed border-white/40 p-2 transition-all dark:border-white/5 ${
            isOver || isDropTarget
              ? 'bg-white/80 shadow-inner shadow-blue-200/50 dark:bg-slate-900/75 dark:shadow-blue-950/40'
              : 'bg-white/30 dark:bg-slate-950/10'
          }`}
        >
          {isDropTarget ? (
            <div className="pointer-events-none sticky top-2 z-10 mb-2 flex justify-center">
              <div className="rounded-full border border-blue-200 bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 shadow-[0_10px_24px_-18px_rgba(59,130,246,0.8)] backdrop-blur dark:border-blue-800 dark:bg-slate-900/95 dark:text-blue-300">
                Drop here
              </div>
            </div>
          ) : null}
          {tasks.length === 0 ? (
            <div className={`rounded-xl border border-dashed border-current/20 bg-white/40 py-8 text-center dark:bg-slate-950/20 ${theme.empty}`}>
              <p className="text-sm">No tasks yet</p>
            </div>
          ) : (
            displayedTasks.map(task => (
              <div key={task.id} className="relative">
                {insertionTaskId === task.id && insertionPosition === 'before' ? (
                  <div className="pointer-events-none absolute inset-x-2 -top-2 z-10 h-1.5 rounded-full bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400 shadow-[0_0_0_1px_rgba(96,165,250,0.2),0_8px_18px_-10px_rgba(59,130,246,0.85)]" />
                ) : null}
                <SortableTaskCard
                  task={task}
                  labels={labels}
                  userId={userId}
                  onDelete={onTaskDeleted}
                  onClick={() => {
                    setSelectedTask(task);
                    setIsDetailOpen(true);
                  }}
                />
                {insertionTaskId === task.id && insertionPosition === 'after' ? (
                  <div className="pointer-events-none absolute inset-x-2 -bottom-2 z-10 h-1.5 rounded-full bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400 shadow-[0_0_0_1px_rgba(96,165,250,0.2),0_8px_18px_-10px_rgba(59,130,246,0.85)]" />
                ) : null}
              </div>
            ))
          )}
        </div>
      </SortableContext>

      <TaskDetailModal
        task={selectedTask}
        labels={labels}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
          onTaskCreated();
        }}
      />
    </div>
  );
}
