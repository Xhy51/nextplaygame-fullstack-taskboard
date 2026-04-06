'use client';

import { Task, Label as LabelType } from '@/lib/types';
import { TaskCard } from './task-card';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableTaskCardProps {
  task: Task;
  labels: LabelType[];
  onDelete?: () => void;
  onClick?: () => void;
}

export function SortableTaskCard({ task, labels, onDelete, onClick }: SortableTaskCardProps) {
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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <TaskCard
        task={task}
        labels={labels}
        onDelete={onDelete}
        onClick={onClick}
      />
    </div>
  );
}
