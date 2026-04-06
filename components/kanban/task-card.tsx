'use client';

import { Task, Label as LabelType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { Calendar, Flag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { taskQueries } from '@/lib/queries';
import { toast } from 'sonner';

interface TaskCardProps {
  task: Task;
  labels: LabelType[];
  onDelete?: () => void;
  onClick?: () => void;
}

export function TaskCard({ task, labels, onDelete, onClick }: TaskCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const taskLabels = labels.filter(l => task.labels.includes(l.id));

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await taskQueries.deleteTask(task.id);
      toast.success('Task deleted');
      onDelete?.();
    } catch (error) {
      toast.error('Failed to delete task');
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const priorityColor = {
    low: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    normal: 'bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300',
    high: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  };

  return (
    <Card
      onClick={onClick}
      className="p-3 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm text-gray-900 dark:text-white flex-1 line-clamp-2">
            {task.title}
          </h3>
          <Button
            size="sm"
            variant="ghost"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-1">
          {taskLabels.map(label => (
            <Badge
              key={label.id}
              variant="secondary"
              className="text-xs px-2 py-0.5"
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

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className={`text-xs px-2 py-0.5 ${priorityColor[task.priority]}`}>
              <Flag className="w-2.5 h-2.5 mr-1" />
              {task.priority}
            </Badge>
          </div>

          {task.due_date && (
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <Calendar className="w-3 h-3" />
              {format(new Date(task.due_date), 'MMM d')}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
