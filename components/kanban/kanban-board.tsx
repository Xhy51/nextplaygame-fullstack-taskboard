'use client';

import { useEffect, useState } from 'react';
import { Board, Column, Task, Label as LabelType } from '@/lib/types';
import { BoardColumn } from './board-column';
import { BoardHeader } from './board-header';
import { boardQueries, columnQueries, taskQueries, labelQueries } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

interface KanbanBoardProps {
  userId: string;
}

export function KanbanBoard({ userId }: KanbanBoardProps) {
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [labels, setLabels] = useState<LabelType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError('Failed to load board');
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);

    if (!task) return;

    if (over.id.toString().startsWith('column-')) {
      const columnId = over.id.toString().replace('column-', '');
      const targetColumn = columns.find(c => c.id === columnId);

      if (!targetColumn || task.column_id === columnId) return;

      try {
        const columnTasks = getTasksByColumn(columnId);
        const newOrder = columnTasks.length;

        await taskQueries.updateTaskStatus(taskId, columnId, targetColumn.name.toLowerCase().replace(' ', '_'), newOrder);

        setTasks(prev =>
          prev.map(t =>
            t.id === taskId
              ? { ...t, column_id: columnId, order: newOrder }
              : t
          )
        );

        toast.success('Task moved');
      } catch (error) {
        console.error('Failed to move task:', error);
        toast.error('Failed to move task');
      }
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

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen bg-white dark:bg-slate-950">
        <BoardHeader
          boardName={board.name}
          onBoardNameChange={handleBoardNameChange}
        />

        <div className="flex-1 overflow-x-auto">
          <div className="p-6 space-y-4">
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
                  onTaskDeleted={loadBoardData}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}
