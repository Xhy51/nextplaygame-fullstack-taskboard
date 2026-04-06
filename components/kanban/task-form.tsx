'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Task, Priority } from '@/lib/types';

interface TaskFormProps {
  onSubmit: (data: {
    title: string;
    description?: string;
    priority: Priority;
    due_date: string;
    status?: Task['status'];
  }) => Promise<void>;
  isLoading?: boolean;
  showStatusSelect?: boolean;
  defaultStatus?: Task['status'];
}

const today = new Date().toISOString().split('T')[0];

export function TaskForm({
  onSubmit,
  isLoading = false,
  showStatusSelect = false,
  defaultStatus = 'todo',
}: TaskFormProps) {
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      title: '',
      description: '',
      priority: 'normal' as Priority,
      due_date: today,
      status: defaultStatus,
    },
  });

  const priority = watch('priority');
  const status = watch('status');

  const onSubmitForm = async (data: any) => {
    await onSubmit(data);
    reset({
      title: '',
      description: '',
      priority: 'normal',
      due_date: today,
      status: defaultStatus,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div>
        <Label htmlFor="title" className="text-sm font-medium">
          Task Title *
        </Label>
        <Input
          id="title"
          placeholder="Enter task title..."
          {...register('title', { required: 'Title is required' })}
          className="mt-1"
          disabled={isLoading}
        />
      </div>

      <div>
        <Label htmlFor="description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="Add task description..."
          {...register('description')}
          className="mt-1"
          disabled={isLoading}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {showStatusSelect ? (
          <div>
            <Label htmlFor="status" className="text-sm font-medium">
              Status
            </Label>
            <Select value={status} onValueChange={(value) => setValue('status', value as Task['status'])}>
              <SelectTrigger id="status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div>
          <Label htmlFor="priority" className="text-sm font-medium">
            Priority
          </Label>
          <Select value={priority} onValueChange={(value) => setValue('priority', value as Priority)}>
            <SelectTrigger id="priority" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="due_date" className="text-sm font-medium">
            Due Date *
          </Label>
          <Input
            id="due_date"
            type="date"
            {...register('due_date', { required: 'Due date is required' })}
            className="mt-1"
            disabled={isLoading}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Task'}
      </Button>
    </form>
  );
}
