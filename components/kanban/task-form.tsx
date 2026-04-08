'use client';

import { useForm } from 'react-hook-form';
import { Check, UserRound } from 'lucide-react';
import { useEffect, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrganizationMember, Task, Priority } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TaskFormValues {
  title: string;
  description?: string;
  priority: Priority;
  due_date: string;
  status?: Task['status'];
  assignee_id?: string;
  participant_ids: string[];
}

interface TaskFormProps {
  onSubmit: (data: TaskFormValues) => Promise<void>;
  isLoading?: boolean;
  showStatusSelect?: boolean;
  defaultStatus?: Task['status'];
  teamMembers?: OrganizationMember[];
  defaultAssigneeId?: string;
}

const today = new Date().toISOString().split('T')[0];

export function TaskForm({
  onSubmit,
  isLoading = false,
  showStatusSelect = false,
  defaultStatus = 'todo',
  teamMembers = [],
  defaultAssigneeId,
}: TaskFormProps) {
  const { register, handleSubmit, reset, watch, setValue } = useForm<TaskFormValues>({
    defaultValues: {
      title: '',
      description: '',
      priority: 'normal' as Priority,
      due_date: today,
      status: defaultStatus,
      assignee_id: defaultAssigneeId,
      participant_ids: [],
    },
  });

  const priority = watch('priority');
  const status = watch('status');
  const assigneeId = watch('assignee_id');
  const participantIds = watch('participant_ids');
  const participantCandidates = useMemo(
    () => teamMembers.filter((member) => member.user_id !== assigneeId),
    [assigneeId, teamMembers]
  );

  useEffect(() => {
    if (!assigneeId) return;

    const nextParticipantIds = participantIds.filter((id) => id !== assigneeId);
    if (nextParticipantIds.length !== participantIds.length) {
      setValue('participant_ids', nextParticipantIds, { shouldDirty: true });
    }
  }, [assigneeId, participantIds, setValue]);

  const onSubmitForm = async (data: TaskFormValues) => {
    await onSubmit(data);
    reset({
      title: '',
      description: '',
      priority: 'normal',
      due_date: today,
      status: defaultStatus,
      assignee_id: defaultAssigneeId,
      participant_ids: [],
    });
  };

  const toggleParticipant = (memberId: string, checked: boolean) => {
    const nextParticipantIds = checked
      ? [...participantIds, memberId]
      : participantIds.filter((id) => id !== memberId);

    setValue('participant_ids', nextParticipantIds, { shouldDirty: true });
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

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <Label htmlFor="assignee" className="text-sm font-medium">
            Assignee
          </Label>
          <Select
            value={assigneeId}
            onValueChange={(value) => setValue('assignee_id', value, { shouldDirty: true })}
          >
            <SelectTrigger id="assignee" className="mt-1">
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.profile?.display_name || member.profile?.username || member.profile?.email || member.user_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Participants</Label>
          <ScrollArea className="h-40 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="space-y-2">
              {participantCandidates.length === 0 ? (
                <p className="px-1 py-2 text-sm text-slate-500">No team members available yet.</p>
              ) : (
                participantCandidates.map((member) => {
                  const isSelected = participantIds.includes(member.user_id);
                  const initials =
                    member.profile?.display_name?.slice(0, 1).toUpperCase() ||
                    member.profile?.username?.slice(0, 1).toUpperCase() ||
                    member.profile?.email?.slice(0, 1).toUpperCase() ||
                    '?';

                  return (
                    <label
                      key={member.user_id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent bg-white px-3 py-2 transition hover:border-slate-200"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleParticipant(member.user_id, checked === true)}
                        disabled={isLoading}
                      />
                      <Avatar className="h-9 w-9 border border-slate-200">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback
                          className="text-xs font-semibold"
                          style={{ backgroundColor: member.profile?.color || undefined }}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                          <span className="truncate">
                            {member.profile?.display_name || member.profile?.username || member.profile?.email}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {member.profile?.email || member.role}
                        </div>
                      </div>
                      {isSelected ? <Check className="h-4 w-4 text-emerald-600" /> : <UserRound className="h-4 w-4 text-slate-300" />}
                    </label>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Task'}
      </Button>
    </form>
  );
}
