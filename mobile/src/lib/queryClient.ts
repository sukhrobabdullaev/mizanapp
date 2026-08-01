/** TanStack Query client with an AsyncStorage cache so the app opens warm. */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'mizan.query-cache',
  throttleTime: 1000,
});

/** Cache keys, centralised so invalidation never drifts from the fetchers. */
export const keys = {
  profile: ['profile'] as const,
  goals: (filters?: Record<string, string>) => ['goals', filters ?? {}] as const,
  goal: (id: number) => ['goal', id] as const,
  tasks: (params?: Record<string, string>) => ['tasks', params ?? {}] as const,
  prayers: (date: string) => ['prayers', date] as const,
  prayerTimes: (date: string) => ['prayer-times', date] as const,
  categories: ['categories'] as const,
  transactions: (month: string) => ['transactions', month] as const,
  summary: (month: string) => ['summary', month] as const,
  challenges: ['challenges'] as const,
  reviews: (week: string) => ['reviews', week] as const,
  mizanScore: (week: string) => ['mizan-score', week] as const,
  streaks: ['streaks'] as const,
  heatmap: ['heatmap'] as const,
  stats: ['stats'] as const,
};
