'use client';

import { useState, useEffect } from 'react';
import { Task, Label as LabelType, TaskAttachment } from '@/lib/types';
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
import { taskQueries, attachmentQueries } from '@/lib/queries';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { File, X, Upload, Loader as Loader2 } from 'lucide-react';

interface TaskDetailModalProps {
  task: Task | null;
  labels: LabelType[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetailModal({
  task,
  labels,
  isOpen,
  onClose,
  onUpdate,
}: TaskDetailModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.due_date || '');
      loadAttachments();
    }
  }, [task]);

  const loadAttachments = async () => {
    if (!task) return;
    try {
      const data = await attachmentQueries.getAttachments(task.id);
      setAttachments(data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  const handleUpdate = async () => {
    if (!task || !title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsUpdating(true);
    try {
      await taskQueries.updateTask(task.id, {
        title,
        description,
        priority: priority as any,
        due_date: dueDate,
      });
      toast.success('Task updated');
      onUpdate();
    } catch (error) {
      toast.error('Failed to update task');
      console.error('Update error:', error);
    } finally {
      setIsUpdating(false);
    }
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

  const taskLabels = task ? labels.filter(l => task.labels.includes(l.id)) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
        </DialogHeader>

        {task && (
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

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isUpdating}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
