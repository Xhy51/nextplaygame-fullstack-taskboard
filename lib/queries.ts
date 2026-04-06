import { supabase } from './supabase';
import { Board, Column, Task, Label, TaskAttachment } from './types';

export const boardQueries = {
  async getOrCreateBoard(userId: string): Promise<Board> {
    const { data: existingBoard, error: fetchError } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingBoard) {
      return existingBoard as Board;
    }

    const { data: newBoard, error: createError } = await supabase
      .from('boards')
      .insert([{ name: 'My First Board', user_id: userId }])
      .select()
      .single();

    if (createError) throw createError;
    return newBoard as Board;
  },

  async getBoard(boardId: string): Promise<Board> {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single();

    if (error) throw error;
    return data as Board;
  },

  async updateBoard(boardId: string, name: string): Promise<Board> {
    const { data, error } = await supabase
      .from('boards')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', boardId)
      .select()
      .single();

    if (error) throw error;
    return data as Board;
  },
};

export const columnQueries = {
  async getColumns(boardId: string): Promise<Column[]> {
    const { data, error } = await supabase
      .from('columns')
      .select('*')
      .eq('board_id', boardId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data as Column[];
  },

  async getOrCreateDefaultColumns(boardId: string): Promise<Column[]> {
    const existing = await columnQueries.getColumns(boardId);

    if (existing.length > 0) {
      return existing;
    }

    const defaultColumns = [
      { board_id: boardId, name: 'To Do', order: 0 },
      { board_id: boardId, name: 'In Progress', order: 1 },
      { board_id: boardId, name: 'In Review', order: 2 },
      { board_id: boardId, name: 'Done', order: 3 },
    ];

    const { data, error } = await supabase
      .from('columns')
      .insert(defaultColumns)
      .select()
      .order('order', { ascending: true });

    if (error) throw error;
    return data as Column[];
  },
};

export const taskQueries = {
  async getTasks(boardId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('board_id', boardId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data as Task[];
  },

  async getTasksByColumn(columnId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('column_id', columnId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data as Task[];
  },

  async getTask(taskId: string): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) throw error;
    return data as Task;
  },

  async createTask(
    boardId: string,
    columnId: string,
    userId: string,
    task: Partial<Task>
  ): Promise<Task> {
    const tasksInColumn = await taskQueries.getTasksByColumn(columnId);
    const order = tasksInColumn.length;

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          board_id: boardId,
          column_id: columnId,
          user_id: userId,
          title: task.title,
          description: task.description,
          priority: task.priority || 'normal',
          due_date: task.due_date,
          assignee_id: task.assignee_id,
          labels: task.labels || [],
          status: 'todo',
          order,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  async updateTaskStatus(
    taskId: string,
    columnId: string,
    status: string,
    order: number
  ): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        column_id: columnId,
        status,
        order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  },

  async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  },

  async reorderTasks(updates: Array<{ id: string; order: number }>): Promise<void> {
    for (const update of updates) {
      const { error } = await supabase
        .from('tasks')
        .update({ order: update.order, updated_at: new Date().toISOString() })
        .eq('id', update.id);

      if (error) throw error;
    }
  },
};

export const labelQueries = {
  async getLabels(boardId: string): Promise<Label[]> {
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .eq('board_id', boardId);

    if (error) throw error;
    return data as Label[];
  },

  async createLabel(boardId: string, name: string, color: string): Promise<Label> {
    const { data, error } = await supabase
      .from('labels')
      .insert([{ board_id: boardId, name, color }])
      .select()
      .single();

    if (error) throw error;
    return data as Label;
  },
};

export const attachmentQueries = {
  async getAttachments(taskId: string): Promise<TaskAttachment[]> {
    const { data, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId);

    if (error) throw error;
    return data as TaskAttachment[];
  },

  async createAttachment(
    taskId: string,
    fileUrl: string,
    fileName: string,
    fileSize?: number
  ): Promise<TaskAttachment> {
    const { data, error } = await supabase
      .from('task_attachments')
      .insert([
        {
          task_id: taskId,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as TaskAttachment;
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    const { error } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) throw error;
  },
};
