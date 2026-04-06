'use client';

import { Column, Task, Label as LabelType } from '@/lib/types';
import { TaskCard } from './task-card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TaskForm } from './task-form';
import { TaskDetailModal } from './task-detail-modal';
import { Plus } from 'lucide-react';
import { taskQueries } from '@/lib/queries';
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
  onTaskDeleted: () => void;
}

export function BoardColumn({
  column,
  tasks,
  labels,
  userId,
  boardId,
  onTaskCreated,
  onTaskDeleted,
}: BoardColumnProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
  });

  const handleCreateTask = async (data: {
    title: string;
    description?: string;
    priority: any;
    due_date?: string;
  }) => {
    setIsCreating(true);
    try {
      await taskQueries.createTask(boardId, column.id, userId, {
        ...data,
        status: 'todo',
      });
      toast.success('Task created');
      setIsOpen(false);
      onTaskCreated();
    } catch (error) {
      toast.error('Failed to create task');
      console.error('Create error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-shrink-0 w-80 bg-gray-50 dark:bg-slate-900 rounded-lg p-4 flex flex-col h-[calc(100vh-180px)] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
          {column.name}
        </h2>
        <span className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-slate-800 px-2 py-1 rounded-md">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 space-y-2 overflow-y-auto pr-2 mb-3 rounded transition-colors ${
            isOver
              ? 'bg-blue-100 dark:bg-blue-950'
              : 'bg-transparent'
          }`}
        >
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-sm">No tasks yet</p>
            </div>
          ) : (
            tasks.map(task => (
              <SortableTaskCard
                key={task.id}
                task={task}
                labels={labels}
                onDelete={onTaskDeleted}
                onClick={() => {
                  setSelectedTask(task);
                  setIsDetailOpen(true);
                }}
              />
            ))
          )}
        </div>
      </SortableContext>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <TaskForm onSubmit={handleCreateTask} isLoading={isCreating} />
        </DialogContent>
      </Dialog>

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
