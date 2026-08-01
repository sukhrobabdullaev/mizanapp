/** Every server interaction in the app. Screens never touch axios directly. */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { api } from '../lib/api';
import { currentMonthISO, todayISO, weekStartISO } from '../lib/dates';
import { enqueue } from '../lib/offlineQueue';
import { keys } from '../lib/queryClient';
import type {
  Category,
  ChallengeTemplate,
  Goal,
  GoalDetail,
  HeatmapResponse,
  MizanScore,
  MizanStats,
  MonthSummary,
  Prayer,
  PrayerName,
  PrayerStatus,
  Profile,
  Review,
  Streaks,
  Task,
  Transaction,
} from '../types/api';

const isOffline = (error: unknown): boolean => {
  const err = error as { response?: unknown; code?: string };
  return !err.response || err.code === 'ECONNABORTED';
};

/* ------------------------------------------------------------------ profile */

export function useProfile(): UseQueryResult<Profile> {
  return useQuery({
    queryKey: keys.profile,
    queryFn: async () => (await api.get<Profile>('/profile/')).data,
  });
}

export function useUpdateProfile(): UseMutationResult<Profile, Error, Partial<Profile>> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) =>
      (await api.patch<Profile>('/profile/', patch)).data,
    onSuccess: (data) => queryClient.setQueryData(keys.profile, data),
  });
}

/* -------------------------------------------------------------------- goals */

export function useGoals(filters?: Record<string, string>): UseQueryResult<Goal[]> {
  return useQuery({
    queryKey: keys.goals(filters),
    queryFn: async () =>
      (await api.get<Goal[]>('/goals/', { params: filters })).data,
  });
}

export function useGoal(id: number): UseQueryResult<GoalDetail> {
  return useQuery({
    queryKey: keys.goal(id),
    queryFn: async () => (await api.get<GoalDetail>(`/goals/${id}/`)).data,
    enabled: Number.isFinite(id),
  });
}

export interface GoalInput {
  title: string;
  dimension: string;
  priority?: string;
  target_date?: string | null;
  description?: string;
}

export function useCreateGoal(): UseMutationResult<Goal, Error, GoalInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: GoalInput) =>
      (await api.post<Goal>('/goals/', input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useUpdateGoal(): UseMutationResult<
  Goal,
  Error,
  { id: number; patch: Partial<Goal> }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) =>
      (await api.patch<Goal>(`/goals/${id}/`, patch)).data,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
      void queryClient.invalidateQueries({ queryKey: keys.goal(variables.id) });
    },
  });
}

export function useDeleteGoal(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/goals/${id}/`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useCreateMilestone(): UseMutationResult<
  unknown,
  Error,
  { goalId: number; title: string; due_date?: string | null }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, ...body }) =>
      (await api.post(`/goals/${goalId}/milestones/`, body)).data,
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: keys.goal(variables.goalId) }),
  });
}

/* -------------------------------------------------------------------- tasks */

export function useTasks(date: string = todayISO()): UseQueryResult<Task[]> {
  return useQuery({
    queryKey: keys.tasks({ date }),
    queryFn: async () =>
      (await api.get<Task[]>('/tasks/', { params: { date } })).data,
  });
}

export interface TaskInput {
  title: string;
  date: string;
  priority?: string;
  goal?: number | null;
  milestone?: number | null;
}

export function useCreateTask(): UseMutationResult<Task, Error, TaskInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TaskInput) =>
      (await api.post<Task>('/tasks/', input)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

/**
 * Toggling a task is optimistic and offline-safe: the cache flips immediately,
 * and if the request cannot reach the server the mutation is queued for replay.
 */
export function useToggleTask(
  date: string = todayISO(),
): UseMutationResult<Task | null, Error, Task, { previous?: Task[] }> {
  const queryClient = useQueryClient();
  const queryKey = keys.tasks({ date });

  return useMutation({
    mutationFn: async (task: Task) => {
      const status = task.status === 'done' ? 'pending' : 'done';
      try {
        return (await api.patch<Task>(`/tasks/${task.id}/`, { status })).data;
      } catch (error) {
        if (isOffline(error)) {
          await enqueue('PATCH', `/tasks/${task.id}/`, { status });
          return null;
        }
        throw error;
      }
    },
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Task[]>(queryKey);
      queryClient.setQueryData<Task[]>(queryKey, (old) =>
        (old ?? []).map((item) =>
          item.id === task.id
            ? { ...item, status: item.status === 'done' ? 'pending' : 'done' }
            : item,
        ),
      );
      return { previous };
    },
    onError: (_error, _task, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
      void queryClient.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

/* ------------------------------------------------------------------ prayers */

export function usePrayers(date: string = todayISO()): UseQueryResult<Prayer[]> {
  return useQuery({
    queryKey: keys.prayers(date),
    queryFn: async () =>
      (await api.get<Prayer[]>('/prayers/', { params: { date } })).data,
  });
}

export function useSetPrayer(
  date: string = todayISO(),
): UseMutationResult<
  Prayer[] | null,
  Error,
  { name: PrayerName; status: PrayerStatus },
  { previous?: Prayer[] }
> {
  const queryClient = useQueryClient();
  const queryKey = keys.prayers(date);

  return useMutation({
    mutationFn: async ({ name, status }) => {
      const body = { date, prayers: [{ name, status }] };
      try {
        return (await api.post<Prayer[]>('/prayers/bulk/', body)).data;
      } catch (error) {
        if (isOffline(error)) {
          await enqueue('POST', '/prayers/bulk/', body);
          return null;
        }
        throw error;
      }
    },
    onMutate: async ({ name, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Prayer[]>(queryKey);
      queryClient.setQueryData<Prayer[]>(queryKey, (old) => {
        const rows = old ?? [];
        const existing = rows.find((row) => row.name === name);
        if (existing) {
          return rows.map((row) => (row.name === name ? { ...row, status } : row));
        }
        return [...rows, { id: -Date.now(), date, name, status }];
      });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
      void queryClient.invalidateQueries({ queryKey: keys.streaks });
      void queryClient.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

/* ------------------------------------------------------------------ finance */

export function useCategories(): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: keys.categories,
    queryFn: async () => (await api.get<Category[]>('/categories/')).data,
    staleTime: 1000 * 60 * 30,
  });
}

export function useTransactions(
  month: string = currentMonthISO(),
): UseQueryResult<Transaction[]> {
  return useQuery({
    queryKey: keys.transactions(month),
    queryFn: async () =>
      (await api.get<Transaction[]>('/transactions/', { params: { month } })).data,
  });
}

export function useMonthSummary(
  month: string = currentMonthISO(),
): UseQueryResult<MonthSummary> {
  return useQuery({
    queryKey: keys.summary(month),
    queryFn: async () =>
      (await api.get<MonthSummary>('/transactions/summary/', { params: { month } })).data,
  });
}

export interface TransactionInput {
  amount: string;
  type: 'income' | 'expense';
  category: number | null;
  date: string;
  note?: string;
}

export function useCreateTransaction(): UseMutationResult<
  Transaction | null,
  Error,
  TransactionInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      try {
        return (await api.post<Transaction>('/transactions/', input)).data;
      } catch (error) {
        if (isOffline(error)) {
          await enqueue('POST', '/transactions/', input);
          return null;
        }
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export function useDeleteTransaction(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/transactions/${id}/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

/* --------------------------------------------------------------- challenges */

export function useChallenges(): UseQueryResult<ChallengeTemplate[]> {
  return useQuery({
    queryKey: keys.challenges,
    queryFn: async () => (await api.get<ChallengeTemplate[]>('/challenges/')).data,
    staleTime: 1000 * 60 * 60,
  });
}

export function useStartChallenge(): UseMutationResult<
  GoalDetail,
  Error,
  { id: number; start_date?: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, start_date }) =>
      (await api.post<GoalDetail>(`/challenges/${id}/start/`, { start_date })).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/* -------------------------------------------------------------------- mizan */

export function useMizanScore(week: string = weekStartISO()): UseQueryResult<MizanScore> {
  return useQuery({
    queryKey: keys.mizanScore(week),
    queryFn: async () =>
      (await api.get<MizanScore>('/mizan/score/', { params: { week } })).data,
  });
}

export function useStreaks(): UseQueryResult<Streaks> {
  return useQuery({
    queryKey: keys.streaks,
    queryFn: async () => (await api.get<Streaks>('/mizan/streaks/')).data,
  });
}

export function useHeatmap(): UseQueryResult<HeatmapResponse> {
  return useQuery({
    queryKey: keys.heatmap,
    queryFn: async () => (await api.get<HeatmapResponse>('/mizan/heatmap/')).data,
  });
}

export function useMizanStats(): UseQueryResult<MizanStats> {
  return useQuery({
    queryKey: keys.stats,
    queryFn: async () => (await api.get<MizanStats>('/mizan/stats/')).data,
  });
}

export function useReview(week: string = weekStartISO()): UseQueryResult<Review | null> {
  return useQuery({
    queryKey: keys.reviews(week),
    queryFn: async () => {
      const { data } = await api.get<Review[]>('/reviews/', { params: { week } });
      return data[0] ?? null;
    },
  });
}

export function useCreateReview(): UseMutationResult<
  Review,
  Error,
  { week_start: string; answers: Review['answers'] }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input) => (await api.post<Review>('/reviews/', input)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['mizan-score'] });
    },
  });
}
