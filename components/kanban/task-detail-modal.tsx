'use client';

import { useEffect, useMemo, useState } from 'react';
import { OrganizationMember, Task, Label as LabelType, TaskActivityLog, TaskAttachment, TaskComment } from '@/lib/types';
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
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { activityQueries, attachmentQueries, commentQueries, taskParticipantQueries, taskQueries } from '@/lib/queries';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { Check, File, Loader as Loader2, Upload, UserRound, X } from 'lucide-react';
import { MemberAvatar } from '@/components/team/member-avatar';
import { MemberAvatarGroup } from '@/components/team/member-avatar-group';
import { useAuth } from '@/lib/auth-context';

interface TaskDetailModalProps {
  task: Task | null;
  labels: LabelType[];
  teamMembers?: OrganizationMember[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetailModal({
  task,
  labels,
  teamMembers = [],
  isOpen,
  onClose,
  onUpdate,
}: TaskDetailModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<LabelType[]>(labels);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activities, setActivities] = useState<TaskActivityLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const participantCandidates = useMemo(
    () => teamMembers.filter((member) => member.user_id !== assigneeId),
    [assigneeId, teamMembers]
  );

  useEffect(() => {
    setAvailableLabels(labels);
  }, [labels]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.due_date || '');
      setAssigneeId(task.assignee_id || '');
      setParticipantIds((task.participants ?? []).map((participant) => participant.user_id));
      setSelectedLabelIds(task.labels ?? []);
      setNewComment('');
      loadAttachments();
      loadComments();
      loadActivities();
    }
  }, [task]);

  useEffect(() => {
    if (!assigneeId) return;
    setParticipantIds((previous) => previous.filter((id) => id !== assigneeId));
  }, [assigneeId]);

  const loadAttachments = async () => {
    if (!task) return;
    try {
      const data = await attachmentQueries.getAttachments(task.id);
      setAttachments(data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  const loadComments = async () => {
    if (!task) return;
    try {
      const data = await commentQueries.getComments(task.id);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const loadActivities = async () => {
    if (!task) return;
    try {
      const data = await activityQueries.getActivities(task.id);
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const handleUpdate = async () => {
    if (!task || !title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsUpdating(true);
    try {
      const previousAssigneeId = task.assignee_id || '';
      const previousParticipantIds = (task.participants ?? []).map((participant) => participant.user_id);
      const nextAssigneeId = assigneeId || task.assignee_id;

      await taskQueries.updateTask(task.id, {
        title,
        description,
        priority: priority as any,
        due_date: dueDate,
        assignee_id: nextAssigneeId,
        labels: selectedLabelIds,
      });

      const nextParticipantIds = participantIds.filter((id) => id !== assigneeId);
      const participantIdsToAdd = nextParticipantIds.filter((id) => !previousParticipantIds.includes(id));
      const participantIdsToRemove = previousParticipantIds.filter((id) => !nextParticipantIds.includes(id));

      if (participantIdsToAdd.length > 0) {
        await taskParticipantQueries.addParticipants(task.id, participantIdsToAdd);
      }

      if (participantIdsToRemove.length > 0) {
        await Promise.all(
          participantIdsToRemove.map((participantId) =>
            taskParticipantQueries.removeParticipant(task.id, participantId)
          )
        );
      }

      if (user?.id) {
        if (task.title !== title.trim()) {
          await activityQueries.logActivity(task.id, user.id, 'title_changed', `Renamed task to "${title.trim()}"`);
        }

        if ((task.description || '') !== description) {
          await activityQueries.logActivity(task.id, user.id, 'description_changed', 'Updated the description');
        }

        if (task.priority !== priority) {
          await activityQueries.logActivity(task.id, user.id, 'priority_changed', `Changed priority from ${task.priority} to ${priority}`);
        }

        if ((task.due_date || '') !== dueDate) {
          await activityQueries.logActivity(task.id, user.id, 'due_date_changed', `Changed due date to ${dueDate || 'none'}`);
        }

        if (previousAssigneeId !== nextAssigneeId) {
          const nextAssignee = teamMembers.find((member) => member.user_id === nextAssigneeId);
          await activityQueries.logActivity(
            task.id,
            user.id,
            'assignee_changed',
            `Changed assignee to ${nextAssignee?.profile?.display_name || nextAssignee?.profile?.username || nextAssignee?.profile?.email || 'unknown'}`
          );
        }

        if (participantIdsToAdd.length > 0 || participantIdsToRemove.length > 0) {
          const participantNames = nextParticipantIds
            .map((participantId) => {
              const member = teamMembers.find((entry) => entry.user_id === participantId);
              return member?.profile?.display_name || member?.profile?.username || member?.profile?.email;
            })
            .filter(Boolean)
            .join(', ');

          await activityQueries.logActivity(
            task.id,
            user.id,
            'participants_changed',
            participantNames ? `Updated participants: ${participantNames}` : 'Cleared participants'
          );
        }

        if ((task.labels ?? []).join('|') !== selectedLabelIds.join('|')) {
          const labelNames = availableLabels
            .filter((label) => selectedLabelIds.includes(label.id))
            .map((label) => label.name)
            .join(', ');

          await activityQueries.logActivity(
            task.id,
            user.id,
            'labels_changed',
            labelNames ? `Updated labels: ${labelNames}` : 'Cleared labels'
          );
        }
      }

      toast.success('Task updated');
      onUpdate();
    } catch (error) {
      toast.error('Failed to update task');
      console.error('Update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleParticipant = (memberId: string, checked: boolean) => {
    setParticipantIds((previous) =>
      checked ? [...previous, memberId] : previous.filter((id) => id !== memberId)
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      // In a real app, you would upload to Supabase Storage
      // For now, we'll create a mock file URL
      const fileUrl = URL.createObjectURL(file);

      await attachmentQueries.createAttachment(
        task.id,
        fileUrl,
        file.name,
        file.size
      );

      toast.success('File attached');
      await loadAttachments();
    } catch (error) {
      toast.error('Failed to upload file');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await attachmentQueries.deleteAttachment(attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast.success('Attachment removed');
    } catch (error) {
      toast.error('Failed to delete attachment');
      console.error('Delete error:', error);
    }
  };

  const handleAddComment = async () => {
    if (!task || !user?.id) return;
    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsCommenting(true);
    try {
      await commentQueries.createComment(task.id, user.id, newComment);
      setNewComment('');
      await loadComments();
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
      console.error('Comment error:', error);
    } finally {
      setIsCommenting(false);
    }
  };

  const toggleLabel = (labelId: string, checked: boolean) => {
    setSelectedLabelIds((previous) =>
      checked ? [...previous, labelId] : previous.filter((id) => id !== labelId)
    );
  };

  const taskLabels = task ? availableLabels.filter(l => selectedLabelIds.includes(l.id)) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <DialogTitle>Task Details</DialogTitle>
        </DialogHeader>

        {task && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
                disabled={isUpdating}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                disabled={isUpdating}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Priority</Label>
                <Select value={priority} onValueChange={setPriority} disabled={isUpdating}>
                  <SelectTrigger className="mt-1">
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
                <Label className="text-sm font-medium">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1"
                  disabled={isUpdating}
                />
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] dark:border-slate-700 dark:bg-slate-900/60">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Owner</Label>
                <div className="flex items-center gap-3">
                  <MemberAvatar profile={task.owner} size="md" />
                  <div className="text-sm text-slate-700 dark:text-slate-200">
                    {task.owner?.display_name || task.owner?.username || task.owner?.email || 'Unknown owner'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Assignee</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId} disabled={isUpdating}>
                  <SelectTrigger className="mt-1">
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
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Participants</Label>
              <ScrollArea className="h-44 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="space-y-2">
                  {participantCandidates.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-slate-500">No additional participants available.</p>
                  ) : (
                    participantCandidates.map((member) => {
                      const isSelected = participantIds.includes(member.user_id);

                      return (
                        <label
                          key={member.user_id}
                          className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent bg-white px-3 py-2 transition hover:border-slate-200 dark:bg-slate-950/60"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => toggleParticipant(member.user_id, checked === true)}
                            disabled={isUpdating}
                          />
                          <MemberAvatar profile={member.profile} size="md" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                              {member.profile?.display_name || member.profile?.username || member.profile?.email}
                            </div>
                            <div className="truncate text-xs text-slate-500">
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

            {(task.participants?.length ?? 0) > 0 || participantIds.length > 0 ? (
              <div>
                <Label className="text-sm font-medium mb-2 block">Current Participant View</Label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
                  <MemberAvatarGroup
                    profiles={participantIds
                      .map((participantId) => teamMembers.find((member) => member.user_id === participantId)?.profile)
                      .filter(Boolean)}
                    maxVisible={5}
                  />
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    {participantIds
                      .map((participantId) => {
                        const member = teamMembers.find((entry) => entry.user_id === participantId);
                        return member?.profile?.display_name || member?.profile?.username || member?.profile?.email;
                      })
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                </div>
              </div>
            ) : null}

            {taskLabels.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Labels</Label>
                <div className="flex flex-wrap gap-2">
                  {taskLabels.map(label => (
                    <Badge
                      key={label.id}
                      variant="secondary"
                      style={{
                        backgroundColor: label.color + '20',
                        color: label.color,
                      }}
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-medium block">Labels</Label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="flex flex-wrap gap-2">
                  {availableLabels.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                      No labels available yet. Use the Label Manager in the top toolbar to create one.
                    </div>
                  ) : (
                    availableLabels.map((label) => {
                      const isSelected = selectedLabelIds.includes(label.id);

                      return (
                        <label
                          key={label.id}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm shadow-sm transition"
                          style={{
                            backgroundColor: isSelected ? `${label.color}20` : '#ffffff',
                            color: label.color,
                            borderColor: label.color,
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => toggleLabel(label.id, checked === true)}
                            disabled={isUpdating}
                          />
                          <span>{label.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium block">Comments</Label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="space-y-3">
                  <Textarea
                    value={newComment}
                    onChange={(event) => setNewComment(event.target.value)}
                    placeholder="Write a comment..."
                    rows={3}
                    disabled={isCommenting}
                  />
                  <div className="flex justify-end">
                    <Button type="button" onClick={handleAddComment} disabled={isCommenting || !newComment.trim()}>
                      {isCommenting ? 'Posting...' : 'Add Comment'}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {comments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                      No comments yet.
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-950/60"
                      >
                        <div className="flex items-start gap-3">
                          <MemberAvatar profile={comment.profile} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                                {comment.profile?.display_name || comment.profile?.username || comment.profile?.email || 'Unknown user'}
                              </div>
                              <div className="shrink-0 text-xs text-slate-500">
                                {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                              </div>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                              {comment.body}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium block">Activity</Label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                      No activity yet.
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-950/60"
                      >
                        <div className="flex items-start gap-3">
                          <MemberAvatar profile={activity.actor} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                                {activity.actor?.display_name || activity.actor?.username || activity.actor?.email || 'Unknown user'}
                              </div>
                              <div className="shrink-0 text-xs text-slate-500" title={format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}>
                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                              </div>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                              {activity.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Attachments</Label>
              <div className="space-y-2">
                {attachments.length > 0 && (
                  <div className="space-y-1">
                    {attachments.map(attachment => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 rounded"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                          <a
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
                          >
                            {attachment.file_name}
                          </a>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-2">
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {isUploading ? 'Uploading...' : 'Upload file'}
                    </span>
                  </div>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={isUpdating}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
