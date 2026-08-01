/** Wire types mirroring the Django REST API. */

export type DimensionKey =
  | 'ruhiy'
  | 'jismoniy'
  | 'moliyaviy'
  | 'ijtimoiy'
  | 'ilmiy';

export type Priority = 'high' | 'medium' | 'low';
export type GoalStatus = 'active' | 'done' | 'archived';
export type TaskStatus = 'pending' | 'done' | 'skipped';
export type PrayerName = 'bomdod' | 'peshin' | 'asr' | 'shom' | 'xufton';
export type PrayerStatus = 'done' | 'missed' | 'excused' | 'late';
export type TransactionType = 'income' | 'expense';

export const PRAYER_ORDER: readonly PrayerName[] = [
  'bomdod',
  'peshin',
  'asr',
  'shom',
  'xufton',
] as const;

export const DIMENSION_ORDER: readonly DimensionKey[] = [
  'ruhiy',
  'jismoniy',
  'moliyaviy',
  'ijtimoiy',
  'ilmiy',
] as const;

export const DIMENSION_LABEL: Record<DimensionKey, string> = {
  ruhiy: 'Ruhiy',
  jismoniy: 'Jismoniy',
  moliyaviy: 'Moliyaviy',
  ijtimoiy: 'Ijtimoiy',
  ilmiy: 'Ilmiy',
};

export const PRAYER_LABEL: Record<PrayerName, string> = {
  bomdod: 'Bomdod',
  peshin: 'Peshin',
  asr: 'Asr',
  shom: 'Shom',
  xufton: 'Xufton',
};

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
}

export interface RegisterResponse extends TokenPair {
  user: AuthUser;
}

export interface Profile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  location_lat: number | null;
  location_lng: number | null;
  location_name: string;
  calc_method: string;
  asr_madhab: 'Hanafi' | 'Shafi';
  prayer_offsets: Partial<Record<PrayerName, number>>;
  hide_sadaqa: boolean;
  notif_prefs: Record<string, boolean>;
  onboarded_at: string | null;
}

export interface Task {
  id: number;
  title: string;
  date: string;
  priority: Priority;
  status: TaskStatus;
  sort_order: number;
  goal: number | null;
  milestone: number | null;
  completed_at: string | null;
}

export interface Milestone {
  id: number;
  goal: number;
  title: string;
  due_date: string | null;
  sort_order: number;
  status: GoalStatus;
  tasks: Task[];
  task_count: number;
  done_count: number;
}

export interface Goal {
  id: number;
  title: string;
  description: string;
  dimension: DimensionKey;
  priority: Priority;
  target_date: string | null;
  status: GoalStatus;
  source_template: number | null;
  task_count: number;
  done_count: number;
  progress: number;
  created_at: string;
}

export interface GoalDetail extends Goal {
  milestones: Milestone[];
}

export interface ChallengeTemplate {
  id: number;
  slug: string;
  title_uz: string;
  description_uz: string;
  dimension: DimensionKey;
  duration_days: number;
  schedule: Record<string, unknown>;
  is_builtin: boolean;
}

export interface Prayer {
  id: number;
  date: string;
  name: PrayerName;
  status: PrayerStatus;
}

export interface PrayerTimesResponse {
  date: string;
  lat: number;
  lng: number;
  calc_method: string;
  asr_madhab: 'Hanafi' | 'Shafi';
  times: Record<PrayerName, string>;
}

export interface Category {
  id: number;
  name_uz: string;
  type: TransactionType;
  dimension: DimensionKey | null;
  icon: string;
  is_sadaqa: boolean;
  sort_order: number;
}

export interface Transaction {
  id: number;
  /** Decimal string — never parse into a float for display. */
  amount: string;
  currency: string;
  type: TransactionType;
  category: number | null;
  category_name: string | null;
  is_sadaqa: boolean | null;
  note: string;
  date: string;
  created_at: string;
}

export interface MonthSummary {
  month: string;
  income: string;
  expense: string;
  sadaqa: string;
  balance: string;
  by_category: {
    category: number | null;
    name: string | null;
    is_sadaqa: boolean | null;
    dimension: DimensionKey | null;
    total: string;
  }[];
}

export interface Review {
  id: number;
  week_start: string;
  answers: Record<DimensionKey, { score: number; note?: string }>;
  mizan_score: number | null;
  created_at: string;
}

export interface MizanScore {
  week_start: string;
  score: number;
  weakest: DimensionKey | null;
  radar: Record<DimensionKey, number>;
  trend: number | null;
  has_review: boolean;
}

export interface Streak {
  current: number;
  longest: number;
}

export interface Streaks {
  prayers: Streak;
  tasks: Streak;
}

export interface HeatmapDay {
  date: string;
  ratio: number;
  total: number;
}

export interface HeatmapResponse {
  weeks: number;
  days: HeatmapDay[];
}

export interface MizanStats {
  week_start: string;
  tasks_total: number;
  tasks_done: number;
  tasks_ratio: number;
  prayers_total: number;
  prayers_kept: number;
  prayers_ratio: number;
}
