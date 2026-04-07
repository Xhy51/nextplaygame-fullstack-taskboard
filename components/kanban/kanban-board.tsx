'use client';

import { useEffect, useState } from 'react';
import { Board, Column, Task, Label as LabelType } from '@/lib/types';
import { BoardColumn } from './board-column';
import { BoardHeader } from './board-header';
import { TaskCard } from './task-card';
import { TaskForm } from './task-form';
import { boardQueries, columnQueries, taskQueries, labelQueries } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Plus } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [insertionIndicator, setInsertionIndicator] = useState<{
    columnId: string;
    taskId: string | null;
    position: 'before' | 'after' | null;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  const loadBoardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const boardData = await boardQueries.getOrCreateBoard(userId);
      setBoard(boardData);

      const columnsData = await columnQueries.getOrCreateDefaultColumns(boardData.id);
      setColumns(columnsData);

      const tasksData = await taskQueries.getTasks(boardData.id);
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

  const getTasksByColumn = (columnId: string) => tasks.filter(t => t.column_id === columnId);
  const activeTask = activeTaskId ? tasks.find(task => task.id === activeTaskId) ?? null : null;
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

    const overTask = tasks.find(task => task.id === overId);
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
    const task = tasks.find(t => t.id === taskId);

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

    const nextTasks = tasks.map(existingTask => {
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
        nextTasks.map(existingTask => {
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
        />

        <div className="flex-1 overflow-x-auto">
          <div className="p-6 space-y-4">
            <div className="sticky top-0 z-20 -mx-6 border-b border-slate-200/70 bg-white/90 px-6 py-2 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/90">
              <div className="flex items-center gap-3">
                <div
                  data-testid="kanban-test-element"
                  className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-900"
                >
                  Test element
                </div>
                <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-xl px-4 shadow-[0_12px_24px_-18px_rgba(37,99,235,0.8)]">
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
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-6">
              {columns.map(column => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  tasks={getTasksByColumn(column.id)}
                  labels={labels}
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
