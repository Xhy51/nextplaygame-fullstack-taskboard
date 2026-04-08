'use client';

import { Task, Label as LabelType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { Calendar, Flag, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { taskQueries } from '@/lib/queries';
import { toast } from 'sonner';
import { MemberAvatar } from '@/components/team/member-avatar';
import { MemberAvatarGroup } from '@/components/team/member-avatar-group';

interface DragAreaProps {
  attributes?: any;
  listeners?: any;
}

interface TaskCardProps {
  task: Task;
  labels: LabelType[];
  userId: string;
  onDelete?: (task: Task) => void;
  onClick?: () => void;
  dragAreaProps?: DragAreaProps;
}

export function TaskCard({
  task,
  labels,
  userId,
  onDelete,
  onClick,
  dragAreaProps,
}: TaskCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const taskLabels = labels.filter(l => task.labels.includes(l.id));
  const participantProfiles = (task.participants ?? [])
    .map((participant) => participant.profile)
    .filter(Boolean);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = Boolean(
    task.due_date &&
      task.status !== 'done' &&
      new Date(task.due_date).setHours(0, 0, 0, 0) < today.getTime()
  );

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmed = window.confirm(
      `Delete "${task.title}"?\n\nThe task will be removed from the board and archived in the deleted list.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await taskQueries.archiveTask(task, userId);
      onDelete?.(task);
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const stopDragGesture = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  const priorityColor = {
    low: 'border-blue-200 bg-blue-50/90 text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300',
    normal: 'border-slate-200 bg-slate-50/90 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300',
    high: 'border-rose-200 bg-rose-50/90 text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300',
  };

  return (
    <Card
      className="group relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-white via-white to-slate-50/90 p-3 shadow-[0_16px_30px_-20px_rgba(15,23,42,0.45),0_8px_16px_-12px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_40px_-22px_rgba(15,23,42,0.55),0_14px_24px_-18px_rgba(15,23,42,0.24)] dark:border-slate-700/80 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900"
    >
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80 dark:via-slate-300/30" />
      <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 rounded-full bg-white/60 blur-2xl dark:bg-white/5" />
      <div
        className="space-y-2 cursor-grab active:cursor-grabbing"
        {...dragAreaProps?.attributes}
        {...dragAreaProps?.listeners}
      >
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className={`flex-1 rounded-xl pr-2 text-left font-semibold text-sm underline decoration-2 underline-offset-4 transition-colors ${
              isOverdue
                ? 'bg-rose-50/90 px-2 py-1.5 text-rose-800 decoration-rose-300 hover:text-rose-900 hover:decoration-rose-400 dark:bg-rose-950/50 dark:text-rose-200 dark:decoration-rose-700'
                : 'text-gray-900 decoration-slate-300 hover:text-blue-700 hover:decoration-blue-400 dark:text-white dark:decoration-slate-600 dark:hover:text-blue-300 dark:hover:decoration-blue-500'
            }`}
            onPointerDown={stopDragGesture}
            onMouseDown={stopDragGesture}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            <span className="line-clamp-2">{task.title}</span>
          </button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 rounded-full border border-transparent p-0 opacity-0 transition-all group-hover:opacity-100 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900 dark:hover:bg-red-950/50 dark:hover:text-red-300"
            onPointerDown={stopDragGesture}
            onMouseDown={stopDragGesture}
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        {task.description && (
          <p className="line-clamp-2 text-xs leading-5 text-gray-600 dark:text-gray-300">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1">
          {isOverdue ? (
            <Badge
              variant="secondary"
              className="rounded-full border border-rose-200 bg-rose-50/90 px-2 py-0.5 text-xs font-semibold text-rose-700 shadow-sm dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300"
            >
              Overdue
            </Badge>
          ) : null}
          {taskLabels.map(label => (
            <Badge
              key={label.id}
              variant="secondary"
              className="rounded-full border px-2 py-0.5 text-xs shadow-sm"
              style={{
                backgroundColor: label.color + '20',
                color: label.color,
                borderColor: label.color,
              }}
            >
              {label.name}
            </Badge>
          ))}
        </div>

        {(task.assignee || participantProfiles.length > 0) && (
          <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/60">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <MemberAvatar profile={task.assignee} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <UserRound className="h-3 w-3" />
                    Assignee
                  </div>
                  <div className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                    {task.assignee?.display_name || task.assignee?.username || task.assignee?.email || 'Unassigned'}
                  </div>
                </div>
              </div>
            </div>

            {participantProfiles.length > 0 ? (
              <div className="flex items-center justify-end gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Team
                </div>
                <MemberAvatarGroup profiles={participantProfiles} />
              </div>
            ) : null}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className={`rounded-full border text-xs px-2 py-0.5 shadow-sm ${priorityColor[task.priority]}`}>
              <Flag className="w-2.5 h-2.5 mr-1" />
              {task.priority}
            </Badge>
          </div>

          {task.due_date && (
            <div
              className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs shadow-sm ${
                isOverdue
                  ? 'border-rose-200 bg-rose-50/90 text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'border-slate-200 bg-white/80 text-gray-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-gray-300'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {format(new Date(task.due_date), 'MMM d')}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
