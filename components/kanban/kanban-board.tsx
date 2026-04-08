'use client';

import { useEffect, useMemo, useState } from 'react';
import { Board, Column, OrganizationMember, Profile, Task, Label as LabelType } from '@/lib/types';
import { BoardColumn } from './board-column';
import { BoardHeader } from './board-header';
import { TaskCard } from './task-card';
import { TaskForm } from './task-form';
import { activityQueries, boardQueries, columnQueries, taskQueries, labelQueries, profileQueries, teamQueries } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  closestCorners,
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragMoveEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { AlertTriangle, CheckCircle2, ListTodo, Plus, Search, UserCheck, Users } from 'lucide-react';

interface KanbanBoardProps {
  userId: string;
}

const columnStatusMap: Record<string, Task['status']> = {
  'To Do': 'todo',
  'In Progress': 'in_progress',
  'In Review': 'in_review',
  Done: 'done',
};

export function KanbanBoard({ userId }: KanbanBoardProps) {
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [labels, setLabels] = useState<LabelType[]>([]);
  const [selectedLabelFilterIds, setSelectedLabelFilterIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['priority']>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [teamMembers, setTeamMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isLabelManagerOpen, setIsLabelManagerOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#ef4444');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelName, setEditingLabelName] = useState('');
  const [editingLabelColor, setEditingLabelColor] = useState('#ef4444');
  const [busyLabelId, setBusyLabelId] = useState<string | null>(null);
  const [insertionIndicator, setInsertionIndicator] = useState<{
    columnId: string;
    taskId: string | null;
    position: 'before' | 'after' | null;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor)
  );
  const relatedTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.owner_id === userId) return true;
      if (task.assignee_id === userId) return true;
      return (task.participants ?? []).some((participant) => participant.user_id === userId);
    });
  }, [tasks, userId]);

  const visibleTasks = useMemo(() => {
    return relatedTasks
      .filter((task) => {
        if (selectedLabelFilterIds.length === 0) return true;
        return selectedLabelFilterIds.every((labelId) => task.labels.includes(labelId));
      })
      .filter((task) => {
        if (!searchQuery.trim()) return true;
        return task.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
      })
      .filter((task) => {
        if (priorityFilter === 'all') return true;
        return task.priority === priorityFilter;
      })
      .filter((task) => {
        if (assigneeFilter === 'all') return true;
        return (task.assignee_id ?? '') === assigneeFilter;
      });
  }, [assigneeFilter, priorityFilter, relatedTasks, searchQuery, selectedLabelFilterIds]);

  const summaryStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: relatedTasks.length,
      completed: relatedTasks.filter((task) => task.status === 'done').length,
      overdue: relatedTasks.filter((task) => {
        if (!task.due_date || task.status === 'done') return false;
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      }).length,
      assignedToMe: relatedTasks.filter((task) => task.assignee_id === userId).length,
      participating: relatedTasks.filter((task) =>
        (task.participants ?? []).some((participant) => participant.user_id === userId)
      ).length,
    };
  }, [relatedTasks, userId]);

  const loadBoardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const profile = await profileQueries.getCurrentProfile();
      setCurrentProfile(profile);

      let members: OrganizationMember[] = [];
      if (profile?.organization_id) {
        members = await teamQueries.getOrganizationMembers(profile.organization_id);
        setTeamMembers(members);
      } else {
        setTeamMembers([]);
      }

      const boardData = await boardQueries.getOrCreateBoard(
        userId,
        members.map((member) => member.user_id)
      );
      setBoard(boardData);

      const columnsData = await columnQueries.getOrCreateDefaultColumns(boardData.id);
      setColumns(columnsData);

      const tasksData = await taskQueries.getVisibleTasks(boardData.id);
      setTasks(tasksData);

      const labelsData = await labelQueries.getLabels(boardData.id);
      setLabels(labelsData);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Failed to load board';
      const details =
        err && typeof err === 'object' && 'details' in err && err.details
          ? ` Details: ${String(err.details)}`
          : '';
      const hint =
        err && typeof err === 'object' && 'hint' in err && err.hint
          ? ` Hint: ${String(err.hint)}`
          : '';
      const code =
        err && typeof err === 'object' && 'code' in err && err.code
          ? ` (${String(err.code)})`
          : '';

      setError(`${message}${code}${details}${hint}`);
      console.error('Load error:', err);
      toast.error('Failed to load board');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBoardData();
  }, [userId]);

  useEffect(() => {
    setSelectedLabelFilterIds((previous) => previous.filter((labelId) => labels.some((label) => label.id === labelId)));
  }, [labels]);

  useEffect(() => {
    setAssigneeFilter((previous) => {
      if (previous === 'all') return previous;
      return teamMembers.some((member) => member.user_id === previous) ? previous : 'all';
    });
  }, [teamMembers]);

  useEffect(() => {
    if (!board) return;

    const channel = supabase
      .channel(`board:${board.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks', filter: `board_id=eq.${board.id}` },
        (payload) => {
          setTasks(prev => [...prev, payload.new as Task]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `board_id=eq.${board.id}` },
        (payload) => {
          setTasks(prev =>
            prev.map(t => (t.id === payload.new.id ? (payload.new as Task) : t))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tasks', filter: `board_id=eq.${board.id}` },
        (payload) => {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [board?.id]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4 overflow-x-auto">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-80 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Failed to load board'}</p>
          <button
            onClick={loadBoardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getTasksByColumn = (columnId: string) => visibleTasks.filter(t => t.column_id === columnId);
  const activeTask = activeTaskId ? visibleTasks.find(task => task.id === activeTaskId) ?? null : null;
  const setInsertionIndicatorIfChanged = (
    nextIndicator: {
      columnId: string;
      taskId: string | null;
      position: 'before' | 'after' | null;
    } | null
  ) => {
    setInsertionIndicator(prev => {
      if (
        prev?.columnId === nextIndicator?.columnId &&
        prev?.taskId === nextIndicator?.taskId &&
        prev?.position === nextIndicator?.position
      ) {
        return prev;
      }

      return nextIndicator;
    });
  };

  const getDropState = (
    overId: string | undefined,
    activeId: string,
    activeMidY?: number,
    overTop?: number,
    overHeight?: number
  ) => {
    if (!overId) return null;

    if (overId.startsWith('column-')) {
      return {
        columnId: overId.replace('column-', ''),
        taskId: null,
        position: null as 'before' | 'after' | null,
      };
    }

    const overTask = visibleTasks.find(task => task.id === overId);
    if (!overTask) return null;

    const overMidY =
      typeof overTop === 'number' && typeof overHeight === 'number'
        ? overTop + overHeight / 2
        : undefined;
    const position =
      typeof activeMidY === 'number' && typeof overMidY === 'number' && activeMidY > overMidY
        ? 'after'
        : 'before';

    return {
      columnId: overTask.column_id,
      taskId: overTask.id === activeId ? null : overTask.id,
      position: overTask.id === activeId ? null : (position as 'before' | 'after'),
    };
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const overId = event.over?.id?.toString();
    const activeMidY = event.active.rect.current.translated
      ? event.active.rect.current.translated.top + event.active.rect.current.translated.height / 2
      : undefined;
    const dropState = getDropState(
      overId,
      event.active.id as string,
      activeMidY,
      event.over?.rect.top,
      event.over?.rect.height
    );

    setActiveColumnId(prev => (prev === (dropState?.columnId ?? null) ? prev : (dropState?.columnId ?? null)));
    setInsertionIndicatorIfChanged(
      dropState
        ? {
            columnId: dropState.columnId,
            taskId: dropState.taskId,
            position: dropState.position,
          }
        : null
    );
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveTaskId(null);
    setActiveColumnId(null);
    setInsertionIndicatorIfChanged(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);
    setActiveColumnId(null);
    setInsertionIndicatorIfChanged(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = visibleTasks.find(t => t.id === taskId);

    if (!task) return;

    const activeMidY = active.rect.current.translated
      ? active.rect.current.translated.top + active.rect.current.translated.height / 2
      : undefined;
    const dropState = getDropState(
      over.id.toString(),
      taskId,
      activeMidY,
      over.rect.top,
      over.rect.height
    );

    if (!dropState) return;

    const targetColumn = columns.find(c => c.id === dropState.columnId);
    if (!targetColumn) return;

    const nextStatus = columnStatusMap[targetColumn.name];
    if (!nextStatus) {
      toast.error('Unsupported target column');
      return;
    }

    const sourceColumnId = task.column_id;
    const movingAcrossColumns = sourceColumnId !== dropState.columnId;
    if (!movingAcrossColumns) {
      return;
    }

    const targetTasks = getTasksByColumn(dropState.columnId).filter(t => t.id !== taskId);
    const sourceTasks = movingAcrossColumns
      ? getTasksByColumn(sourceColumnId).filter(t => t.id !== taskId)
      : targetTasks;

    const insertionIndex = dropState.taskId
      ? Math.max(
          0,
          targetTasks.findIndex(t => t.id === dropState.taskId) +
            (dropState.position === 'after' ? 1 : 0)
        )
      : targetTasks.length;

    const reorderedTargetTasks = [...targetTasks];
    reorderedTargetTasks.splice(insertionIndex, 0, {
      ...task,
      column_id: dropState.columnId,
      status: nextStatus,
    });

    const nextTasks = visibleTasks.map(existingTask => {
      if (existingTask.id === taskId) {
        return {
          ...existingTask,
          column_id: dropState.columnId,
          status: nextStatus,
        };
      }
      return existingTask;
    });

    const sourceReorderPayload = sourceTasks.map((sourceTask, index) => ({
      id: sourceTask.id,
      order: index,
    }));
    const targetReorderPayload = reorderedTargetTasks.map((targetTask, index) => ({
      id: targetTask.id,
      order: index,
    }));

    try {
      setTasks(
        tasks.map(existingTask => {
          const sourceMatch = sourceReorderPayload.find(item => item.id === existingTask.id);
          if (sourceMatch) {
            return { ...existingTask, order: sourceMatch.order };
          }

          const targetMatch = targetReorderPayload.find(item => item.id === existingTask.id);
          if (targetMatch) {
            return {
              ...existingTask,
              order: targetMatch.order,
              column_id:
                existingTask.id === taskId ? dropState.columnId : existingTask.column_id,
              status: existingTask.id === taskId ? nextStatus : existingTask.status,
            };
          }

          return existingTask;
        })
      );

      await taskQueries.updateTaskStatus(taskId, dropState.columnId, nextStatus, insertionIndex);

      const reorderUpdates = movingAcrossColumns
        ? [...sourceReorderPayload, ...targetReorderPayload.filter(item => item.id !== taskId)]
        : targetReorderPayload.filter(item => item.id !== taskId);

      if (reorderUpdates.length > 0) {
        await taskQueries.reorderTasks(reorderUpdates);
      }

      await activityQueries.logActivity(
        taskId,
        userId,
        'status_changed',
        `Moved from ${task.status.replace('_', ' ')} to ${nextStatus.replace('_', ' ')}`,
        {
          from_status: task.status,
          to_status: nextStatus,
        }
      );

      toast.success('Task moved');
    } catch (error) {
      console.error('Failed to move task:', error);
      toast.error('Failed to move task');
      loadBoardData();
    }
  };

  const handleBoardNameChange = async (name: string) => {
    try {
      await boardQueries.updateBoard(board.id, name);
      setBoard(prev => prev ? { ...prev, name } : null);
      toast.success('Board name updated');
    } catch (error) {
      toast.error('Failed to update board name');
      console.error('Update error:', error);
    }
  };

  const handleTaskDeleted = (task: Task) => {
    setTasks(prev => prev.filter(existingTask => existingTask.id !== task.id));
  };

  const handleCreateTask = async (data: {
    title: string;
    description?: string;
    priority: Task['priority'];
    due_date: string;
    status?: Task['status'];
    assignee_id?: string;
    participant_ids: string[];
  }) => {
    const status = data.status ?? 'todo';
    const targetColumn = columns.find(column => columnStatusMap[column.name] === status);

    if (!targetColumn || !board) {
      toast.error('Target column not found');
      return;
    }

    setIsCreatingTask(true);
    try {
      await taskQueries.createTask(board.id, targetColumn.id, userId, {
        ...data,
        status,
      });
      toast.success('Task created');
      setIsCreateTaskOpen(false);
      loadBoardData();
    } catch (error) {
      toast.error('Failed to create task');
      console.error('Create error:', error);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const toggleLabelFilter = (labelId: string) => {
    setSelectedLabelFilterIds((previous) =>
      previous.includes(labelId)
        ? previous.filter((id) => id !== labelId)
        : [...previous, labelId]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setSelectedLabelFilterIds([]);
  };

  const handleCreateLabel = async () => {
    if (!board || !newLabelName.trim()) {
      toast.error('Label name is required');
      return;
    }

    setIsCreatingLabel(true);
    try {
      const createdLabel = await labelQueries.createLabel(board.id, newLabelName.trim(), newLabelColor);
      setLabels((previous) => [...previous, createdLabel]);
      setNewLabelName('');
      toast.success('Label created');
    } catch (error) {
      toast.error('Failed to create label');
      console.error('Create label error:', error);
    } finally {
      setIsCreatingLabel(false);
    }
  };

  const startEditingLabel = (label: LabelType) => {
    setEditingLabelId(label.id);
    setEditingLabelName(label.name);
    setEditingLabelColor(label.color);
  };

  const cancelEditingLabel = () => {
    setEditingLabelId(null);
    setEditingLabelName('');
    setEditingLabelColor('#ef4444');
  };

  const handleUpdateLabel = async () => {
    if (!editingLabelId || !editingLabelName.trim()) {
      toast.error('Label name is required');
      return;
    }

    setBusyLabelId(editingLabelId);
    try {
      const updatedLabel = await labelQueries.updateLabel(editingLabelId, {
        name: editingLabelName.trim(),
        color: editingLabelColor,
      });
      setLabels((previous) =>
        previous.map((label) => (label.id === updatedLabel.id ? updatedLabel : label))
      );
      cancelEditingLabel();
      toast.success('Label updated');
    } catch (error) {
      toast.error('Failed to update label');
      console.error('Update label error:', error);
    } finally {
      setBusyLabelId(null);
    }
  };

  const handleDeleteLabel = async (label: LabelType) => {
    if (!board) return;

    const confirmed = window.confirm(`Delete label "${label.name}"?\n\nIt will be removed from all tasks on this board.`);
    if (!confirmed) return;

    setBusyLabelId(label.id);
    try {
      await labelQueries.deleteLabel(label.id, board.id);
      setLabels((previous) => previous.filter((entry) => entry.id !== label.id));
      setSelectedLabelFilterIds((previous) => previous.filter((id) => id !== label.id));
      await loadBoardData();
      if (editingLabelId === label.id) {
        cancelEditingLabel();
      }
      toast.success('Label deleted');
    } catch (error) {
      toast.error('Failed to delete label');
      console.error('Delete label error:', error);
    } finally {
      setBusyLabelId(null);
    }
  };

  return (
    <DndContext
      collisionDetection={closestCorners}
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-screen bg-white dark:bg-slate-950">
        <BoardHeader
          boardName={board.name}
          onBoardNameChange={handleBoardNameChange}
          teamMembers={teamMembers}
        />

        <div className="flex-1 overflow-x-auto">
          <div className="p-4 space-y-3">
            <div className="sticky top-0 z-20 -mx-4 space-y-2 border-b border-slate-200/70 bg-white/90 px-4 py-1 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/90">
              <div className="flex items-center gap-3">
                <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-10 rounded-xl px-4 shadow-[0_12px_24px_-18px_rgba(37,99,235,0.8)]">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Task</DialogTitle>
                    </DialogHeader>
                    <TaskForm
                      onSubmit={handleCreateTask}
                      isLoading={isCreatingTask}
                      showStatusSelect
                      defaultStatus="todo"
                      teamMembers={teamMembers}
                      defaultAssigneeId={currentProfile?.id ?? userId}
                    />
                  </DialogContent>
                </Dialog>
                <Dialog open={isLabelManagerOpen} onOpenChange={setIsLabelManagerOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-10 rounded-xl px-4">
                      Label Manager
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Label Manager</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Existing Labels</Label>
                        {labels.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                            No labels yet. Create your first one below.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {labels.map((label) => (
                              <div
                                key={label.id}
                                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
                              >
                                {editingLabelId === label.id ? (
                                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto_auto]">
                                    <Input
                                      value={editingLabelName}
                                      onChange={(event) => setEditingLabelName(event.target.value)}
                                      disabled={busyLabelId === label.id}
                                    />
                                    <Input
                                      type="color"
                                      value={editingLabelColor}
                                      onChange={(event) => setEditingLabelColor(event.target.value)}
                                      className="h-10 p-1"
                                      disabled={busyLabelId === label.id}
                                    />
                                    <Button type="button" size="sm" onClick={handleUpdateLabel} disabled={busyLabelId === label.id || !editingLabelName.trim()}>
                                      Save
                                    </Button>
                                    <Button type="button" size="sm" variant="outline" onClick={cancelEditingLabel} disabled={busyLabelId === label.id}>
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-3">
                                    <div
                                      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm"
                                      style={{
                                        backgroundColor: `${label.color}20`,
                                        color: label.color,
                                        borderColor: label.color,
                                      }}
                                    >
                                      {label.name}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button type="button" size="sm" variant="outline" onClick={() => startEditingLabel(label)} disabled={busyLabelId === label.id}>
                                        Edit
                                      </Button>
                                      <Button type="button" size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteLabel(label)} disabled={busyLabelId === label.id}>
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                        <Label className="text-sm font-medium">Create Label</Label>
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
                          <Input
                            value={newLabelName}
                            onChange={(event) => setNewLabelName(event.target.value)}
                            placeholder="New label name"
                            disabled={isCreatingLabel}
                          />
                          <Input
                            type="color"
                            value={newLabelColor}
                            onChange={(event) => setNewLabelColor(event.target.value)}
                            className="h-10 p-1"
                            disabled={isCreatingLabel}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button type="button" onClick={handleCreateLabel} disabled={isCreatingLabel || !newLabelName.trim()}>
                            {isCreatingLabel ? 'Creating...' : 'Add Label'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search tasks by title"
                    className="h-8 rounded-full border-slate-200 bg-white pl-9 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Priority
                  </span>
                  <Select
                    value={priorityFilter}
                    onValueChange={(value) => setPriorityFilter(value as 'all' | Task['priority'])}
                  >
                    <SelectTrigger className="h-8 w-[146px] rounded-full border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Assignee
                  </span>
                  <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                    <SelectTrigger className="h-8 w-[190px] rounded-full border-slate-200 bg-white text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <SelectValue placeholder="All assignees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All assignees</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.profile?.display_name || member.profile?.username || member.profile?.email || member.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Label Filter
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full"
                  onClick={clearAllFilters}
                  disabled={
                    !searchQuery.trim() &&
                    priorityFilter === 'all' &&
                    assigneeFilter === 'all' &&
                    selectedLabelFilterIds.length === 0
                  }
                >
                  Clear All
                </Button>
                {labels.map((label) => {
                  const isActive = selectedLabelFilterIds.includes(label.id);

                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggleLabelFilter(label.id)}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition ${
                        isActive ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-950' : ''
                      }`}
                      style={{
                        backgroundColor: isActive ? `${label.color}20` : '#ffffff',
                        color: label.color,
                        borderColor: label.color,
                      }}
                    >
                      {label.name}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                {[
                  {
                    key: 'total',
                    label: 'Total tasks',
                    value: summaryStats.total,
                    icon: ListTodo,
                    tone: 'text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-200 dark:bg-slate-900/70 dark:border-slate-700',
                  },
                  {
                    key: 'completed',
                    label: 'Completed',
                    value: summaryStats.completed,
                    icon: CheckCircle2,
                    tone: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
                  },
                  {
                    key: 'overdue',
                    label: 'Overdue',
                    value: summaryStats.overdue,
                    icon: AlertTriangle,
                    tone: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-200 dark:bg-rose-950/30 dark:border-rose-800',
                  },
                  {
                    key: 'assigned',
                    label: 'Assigned to me',
                    value: summaryStats.assignedToMe,
                    icon: UserCheck,
                    tone: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
                  },
                  {
                    key: 'participating',
                    label: 'Participating',
                    value: summaryStats.participating,
                    icon: Users,
                    tone: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.key}
                      className={`rounded-2xl border px-3 py-2.5 shadow-sm ${item.tone}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                            {item.label}
                          </div>
                          <div className="mt-1.5 text-[1.7rem] font-bold leading-none">
                            {item.value}
                          </div>
                        </div>
                        <div className="rounded-full bg-white/70 p-2 shadow-sm dark:bg-slate-950/50">
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {columns.map(column => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  tasks={getTasksByColumn(column.id)}
                  labels={labels}
                  teamMembers={teamMembers}
                  userId={userId}
                  boardId={board.id}
                  onTaskCreated={loadBoardData}
                  onTaskDeleted={handleTaskDeleted}
                  isDropTarget={activeColumnId === column.id}
                  insertionTaskId={
                    insertionIndicator?.columnId === column.id
                      ? insertionIndicator.taskId
                      : null
                  }
                  insertionPosition={
                    insertionIndicator?.columnId === column.id
                      ? insertionIndicator.position
                      : null
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <DragOverlay adjustScale={false}>
        {activeTask ? (
          <div className="pointer-events-none w-80 translate-x-4 -translate-y-3 drop-shadow-[0_30px_40px_rgba(15,23,42,0.28)]">
            <TaskCard task={activeTask} labels={labels} userId={userId} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
