'use client';

import { Task, Label as LabelType } from '@/lib/types';
import { TaskCard } from './task-card';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableTaskCardProps {
  task: Task;
  labels: LabelType[];
  userId: string;
  onDelete?: (task: Task) => void;
  onClick?: () => void;
}

export function SortableTaskCard({ task, labels, userId, onDelete, onClick }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.18 : 1,
    zIndex: isDragging ? 20 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'brightness-95 saturate-75' : ''}
    >
      <TaskCard
        task={task}
        labels={labels}
        userId={userId}
        onDelete={onDelete}
        onClick={onClick}
        dragAreaProps={{
          attributes,
          listeners,
        }}
      />
    </div>
  );
}
