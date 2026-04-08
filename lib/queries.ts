import { supabase } from './supabase';
import {
  Board,
  Column,
  DeletedTask,
  Label,
  OrganizationMember,
  Profile,
  Task,
  TaskActivityLog,
  TaskAttachment,
  TaskComment,
  TaskParticipant,
} from './types';

function dedupeIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

async function getProfilesByIds(profileIds: string[]): Promise<Record<string, Profile>> {
  if (profileIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', profileIds);

  if (error) throw error;

  return (data as Profile[]).reduce<Record<string, Profile>>((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {});
}

async function getParticipantsForTasks(taskIds: string[]): Promise<Record<string, TaskParticipant[]>> {
  if (taskIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('task_participants')
    .select('*')
    .in('task_id', taskIds)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const participants = (data ?? []) as TaskParticipant[];
  const participantProfiles = await getProfilesByIds(dedupeIds(participants.map(participant => participant.user_id)));

  return participants.reduce<Record<string, TaskParticipant[]>>((acc, participant) => {
    const entry = {
      ...participant,
      profile: participantProfiles[participant.user_id] ?? undefined,
    };

    acc[participant.task_id] = [...(acc[participant.task_id] ?? []), entry];
    return acc;
  }, {});
}

async function hydrateTasks(rawTasks: Task[]): Promise<Task[]> {
  if (rawTasks.length === 0) {
    return [];
  }

  const profileIds = dedupeIds(
    rawTasks.flatMap(task => [task.owner_id, task.assignee_id])
  );
  const [profilesById, participantsByTaskId] = await Promise.all([
    getProfilesByIds(profileIds),
    getParticipantsForTasks(rawTasks.map(task => task.id)),
  ]);

  return rawTasks.map(task => ({
    ...task,
    owner: task.owner_id ? profilesById[task.owner_id] ?? null : null,
    assignee: task.assignee_id ? profilesById[task.assignee_id] ?? null : null,
    participants: participantsByTaskId[task.id] ?? [],
  }));
}

function isTaskVisibleToUser(task: Task, userId: string) {
  if (task.owner_id === userId) return true;
  if (task.assignee_id === userId) return true;
  return (task.participants ?? []).some((participant) => participant.user_id === userId);
}

export const boardQueries = {
  async getOrCreateBoard(userId: string, accessibleUserIds?: string[]): Promise<Board> {
    const boardOwnerIds = dedupeIds([...(accessibleUserIds ?? []), userId]);

    let existingBoard: Board | null = null;

    if (boardOwnerIds.length > 0) {
      const { data, error: fetchError } = await supabase
        .from('boards')
        .select('*')
        .in('user_id', boardOwnerIds)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      existingBoard = (data as Board | null) ?? null;
    } else {
      const { data, error: fetchError } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      existingBoard = (data as Board | null) ?? null;
    }

    if (existingBoard) {
      return existingBoard;
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
    return hydrateTasks((data ?? []) as Task[]);
  },

  async getTasksByColumn(columnId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('column_id', columnId)
      .order('order', { ascending: true });

    if (error) throw error;
    return hydrateTasks((data ?? []) as Task[]);
  },

  async getTask(taskId: string): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) throw error;

    const [task] = await hydrateTasks([data as Task]);
    return task;
  },

  async getVisibleTasks(boardId: string): Promise<Task[]> {
    return taskQueries.getTasks(boardId);
  },

  async createTask(
    boardId: string,
    columnId: string,
    userId: string,
    task: Partial<Task> & { participant_ids?: string[] }
  ): Promise<Task> {
    const tasksInColumn = await taskQueries.getTasksByColumn(columnId);
    const order = tasksInColumn.length;
    const defaultDueDate = new Date().toISOString().split('T')[0];
    const assigneeId = task.assignee_id ?? userId;

    const insertPayload = {
      board_id: boardId,
      column_id: columnId,
      user_id: userId,
      owner_id: userId,
      title: task.title,
      description: task.description,
      priority: task.priority || 'normal',
      due_date: task.due_date || defaultDueDate,
      assignee_id: assigneeId,
      labels: task.labels || [],
      status: task.status || 'todo',
      order,
    };

    const { error } = await supabase
      .from('tasks')
      .insert([insertPayload]);

    if (error) throw error;

    const { data: createdTasks, error: fetchCreatedError } = await supabase
      .from('tasks')
      .select('*')
      .eq('board_id', boardId)
      .eq('column_id', columnId)
      .eq('owner_id', userId)
      .eq('title', task.title)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchCreatedError) throw fetchCreatedError;

    const createdTask = (createdTasks?.[0] ?? null) as Task | null;
    if (!createdTask) {
      throw new Error('Task created but could not be reloaded');
    }

    const participantIds = dedupeIds(task.participant_ids ?? []);

    if (participantIds.length > 0) {
      const { error: participantError } = await supabase
        .from('task_participants')
        .insert(
          participantIds.map(participantId => ({
            task_id: createdTask.id,
            user_id: participantId,
          }))
        );

      if (participantError) throw participantError;
    }

    await activityQueries.logActivity(createdTask.id, userId, 'task_created', 'Created this task');

    return taskQueries.getTask(createdTask.id);
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

  async archiveTask(task: Task, deletedBy: string): Promise<DeletedTask> {
    const archivedPayload = {
      original_task_id: task.id,
      board_id: task.board_id,
      column_id: task.column_id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      assignee_id: task.assignee_id,
      user_id: task.user_id,
      labels: task.labels,
      order: task.order,
      created_at: task.created_at,
      updated_at: task.updated_at,
      deleted_at: new Date().toISOString(),
      deleted_by: deletedBy,
    };

    const { data: archivedTask, error: archiveError } = await supabase
      .from('deleted_tasks')
      .insert([archivedPayload])
      .select()
      .single();

    if (archiveError) throw archiveError;

    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', task.id);

    if (deleteError) throw deleteError;

    return archivedTask as DeletedTask;
  },

  async getDeletedTasks(boardId: string): Promise<DeletedTask[]> {
    const { data, error } = await supabase
      .from('deleted_tasks')
      .select('*')
      .eq('board_id', boardId)
      .order('deleted_at', { ascending: false });

    if (error) throw error;
    return data as DeletedTask[];
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

export const profileQueries = {
  async getCurrentProfile(): Promise<Profile | null> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data as Profile | null;
  },
};

export const teamQueries = {
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const members = (data ?? []) as OrganizationMember[];
    const profilesById = await getProfilesByIds(dedupeIds(members.map(member => member.user_id)));

    return members.map(member => ({
      ...member,
      profile: profilesById[member.user_id] ?? undefined,
    }));
  },
};

export const taskParticipantQueries = {
  async getParticipants(taskId: string): Promise<TaskParticipant[]> {
    const { data, error } = await supabase
      .from('task_participants')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const participants = (data ?? []) as TaskParticipant[];
    const profilesById = await getProfilesByIds(dedupeIds(participants.map(participant => participant.user_id)));

    return participants.map(participant => ({
      ...participant,
      profile: profilesById[participant.user_id] ?? undefined,
    }));
  },

  async addParticipants(taskId: string, participantIds: string[]): Promise<void> {
    const dedupedParticipantIds = dedupeIds(participantIds);
    if (dedupedParticipantIds.length === 0) return;

    const { error } = await supabase
      .from('task_participants')
      .insert(
        dedupedParticipantIds.map(participantId => ({
          task_id: taskId,
          user_id: participantId,
        }))
      );

    if (error) throw error;
  },

  async removeParticipant(taskId: string, participantId: string): Promise<void> {
    const { error } = await supabase
      .from('task_participants')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', participantId);

    if (error) throw error;
  },
};

export const commentQueries = {
  async getComments(taskId: string): Promise<TaskComment[]> {
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const comments = (data ?? []) as TaskComment[];
    const profilesById = await getProfilesByIds(dedupeIds(comments.map((comment) => comment.user_id)));

    return comments.map((comment) => ({
      ...comment,
      profile: profilesById[comment.user_id] ?? undefined,
    }));
  },

  async createComment(taskId: string, userId: string, body: string): Promise<TaskComment> {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      throw new Error('Comment body is required');
    }

    const { data, error } = await supabase
      .from('task_comments')
      .insert([
        {
          task_id: taskId,
          user_id: userId,
          body: trimmedBody,
        },
      ])
      .select('*')
      .single();

    if (error) throw error;

    await activityQueries.logActivity(taskId, userId, 'comment_added', 'Added a comment');

    const insertedComment = (await commentQueries.getComments(taskId)).find(
      (commentItem) => commentItem.id === (data as TaskComment).id
    );

    if (!insertedComment) {
      return {
        ...(data as TaskComment),
        profile: undefined,
      };
    }

    return insertedComment;
  },
};

export const activityQueries = {
  async getActivities(taskId: string): Promise<TaskActivityLog[]> {
    const { data, error } = await supabase
      .from('task_activity_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const activities = (data ?? []) as TaskActivityLog[];
    const profilesById = await getProfilesByIds(dedupeIds(activities.map((activity) => activity.actor_user_id)));

    return activities.map((activity) => ({
      ...activity,
      actor: profilesById[activity.actor_user_id] ?? undefined,
    }));
  },

  async logActivity(
    taskId: string,
    actorUserId: string,
    actionType: string,
    message: string,
    metadata: Record<string, string | string[] | null> = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('task_activity_logs')
      .insert([
        {
          task_id: taskId,
          actor_user_id: actorUserId,
          action_type: actionType,
          message,
          metadata,
        },
      ]);

    if (error) throw error;
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

  async updateLabel(labelId: string, updates: Pick<Label, 'name' | 'color'>): Promise<Label> {
    const { data, error } = await supabase
      .from('labels')
      .update(updates)
      .eq('id', labelId)
      .select()
      .single();

    if (error) throw error;
    return data as Label;
  },

  async deleteLabel(labelId: string, boardId: string): Promise<void> {
    const tasks = await taskQueries.getTasks(boardId);
    const affectedTasks = tasks.filter((task) => task.labels.includes(labelId));

    for (const task of affectedTasks) {
      const nextLabels = task.labels.filter((existingLabelId) => existingLabelId !== labelId);
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          labels: nextLabels,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (updateError) throw updateError;
    }

    const { error } = await supabase
      .from('labels')
      .delete()
      .eq('id', labelId);

    if (error) throw error;
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
