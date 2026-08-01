import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { AddTaskSheet } from '../../src/components/AddTaskSheet';
import { QuickExpenseSheet } from '../../src/components/QuickExpenseSheet';
import { PrayerStrip } from '../../src/components/PrayerStrip';
import { TaskRow } from '../../src/components/TaskRow';
import {
  Body,
  Card,
  EmptyState,
  Heading,
  Loading,
  Muted,
  ProgressBar,
  Screen,
  Title,
} from '../../src/components/ui';
import {
  useGoals,
  usePrayers,
  useProfile,
  useSetPrayer,
  useTasks,
  useToggleTask,
} from '../../src/hooks/queries';
import { longDateUz, todayISO } from '../../src/lib/dates';
import { formatPercent } from '../../src/lib/format';
import { hadithOfTheDay } from '../../src/lib/hadith';
import { DEFAULT_COORDS } from '../../src/lib/prayerTimes';
import { colors, radius, spacing, typography } from '../../src/theme';

export default function BugunScreen() {
  const today = todayISO();
  const profile = useProfile();
  const tasks = useTasks(today);
  const prayers = usePrayers(today);
  const goals = useGoals();
  const toggleTask = useToggleTask(today);
  const setPrayer = useSetPrayer(today);

  const [fabOpen, setFabOpen] = useState(false);
  const [taskSheet, setTaskSheet] = useState(false);
  const [expenseSheet, setExpenseSheet] = useState(false);

  const hadith = useMemo(() => hadithOfTheDay(today), [today]);

  const prayerOptions = useMemo(
    () => ({
      latitude: profile.data?.location_lat ?? DEFAULT_COORDS.latitude,
      longitude: profile.data?.location_lng ?? DEFAULT_COORDS.longitude,
      calcMethod: profile.data?.calc_method,
      madhab: profile.data?.asr_madhab,
      offsets: profile.data?.prayer_offsets,
    }),
    [profile.data],
  );

  const goalTitles = useMemo(() => {
    const map = new Map<number, string>();
    for (const goal of goals.data ?? []) map.set(goal.id, goal.title);
    return map;
  }, [goals.data]);

  const list = tasks.data ?? [];
  const doneCount = list.filter((task) => task.status === 'done').length;
  const ratio = list.length ? doneCount / list.length : 0;
  const refreshing = tasks.isRefetching || prayers.isRefetching;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void tasks.refetch();
            void prayers.refetch();
          }}
          tintColor={colors.gradientStart}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Title style={styles.brand}>Mizan</Title>
          <Muted style={styles.date}>{longDateUz()}</Muted>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sozlamalar"
          onPress={() => router.push('/(tabs)/mizan')}
        >
          <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Ionicons
          name="moon"
          size={90}
          color="#FFFFFF"
          style={styles.heroMoon}
        />
        <Body style={styles.heroText}>“{hadith.text}”</Body>
        <Muted style={styles.heroSource}>— {hadith.source}</Muted>
      </LinearGradient>

      <View style={styles.progressBlock}>
        <View style={styles.progressHeader}>
          <Heading>Bugungi progress</Heading>
          <View style={styles.progressRight}>
            <Body style={styles.progressPercent}>{formatPercent(ratio)}</Body>
            <Muted>
              {doneCount}/{list.length} bajarildi
            </Muted>
          </View>
        </View>
        <ProgressBar ratio={ratio} />
      </View>

      {profile.isPending ? (
        <Loading />
      ) : (
        <PrayerStrip
          prayers={prayers.data ?? []}
          options={prayerOptions}
          onToggle={(name, status) => setPrayer.mutate({ name, status })}
        />
      )}

      <Heading>Bugungi vazifalar</Heading>

      {tasks.isPending ? <Loading /> : null}

      {!tasks.isPending && list.length === 0 ? (
        <EmptyState
          title="Bugunga vazifa yo‘q"
          hint="Pastdagi tugma orqali vazifa qo‘shing yoki challenge boshlang."
        />
      ) : null}

      {list.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          goalTitle={task.goal ? goalTitles.get(task.goal) : undefined}
          onToggle={() => toggleTask.mutate(task)}
        />
      ))}

      <View style={styles.fabWrap} pointerEvents="box-none">
        {fabOpen ? (
          <View style={styles.fabMenu}>
            <Card style={styles.fabItem}>
              <Pressable
                accessibilityRole="button"
                style={styles.fabItemInner}
                onPress={() => {
                  setFabOpen(false);
                  setTaskSheet(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.gradientStart} />
                <Body style={styles.fabItemLabel}>Vazifa qo‘shish</Body>
              </Pressable>
            </Card>
            <Card style={styles.fabItem}>
              <Pressable
                accessibilityRole="button"
                style={styles.fabItemInner}
                onPress={() => {
                  setFabOpen(false);
                  setExpenseSheet(true);
                }}
              >
                <Ionicons name="wallet-outline" size={20} color={colors.gold} />
                <Body style={styles.fabItemLabel}>Xarajat qo‘shish</Body>
              </Pressable>
            </Card>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Qo‘shish"
          onPress={() => setFabOpen((open) => !open)}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={styles.fab}
          >
            <Ionicons name={fabOpen ? 'close' : 'add'} size={28} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>

      <AddTaskSheet
        visible={taskSheet}
        date={today}
        goals={goals.data ?? []}
        onClose={() => setTaskSheet(false)}
      />
      <QuickExpenseSheet
        visible={expenseSheet}
        date={today}
        onClose={() => setExpenseSheet(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  brand: { fontSize: 32, fontWeight: '800', color: colors.gradientStart },
  date: { letterSpacing: 1, marginTop: 2 },
  hero: {
    borderRadius: radius.card + 4,
    padding: spacing.xl,
    minHeight: 150,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroMoon: { position: 'absolute', right: 18, top: 10, opacity: 0.25 },
  heroText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', fontStyle: 'italic' },
  heroSource: { color: '#EAFBF3', marginTop: spacing.sm },
  progressBlock: { gap: spacing.md },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  progressRight: { alignItems: 'flex-end' },
  progressPercent: { ...typography.title, color: colors.gradientStart },
  fabWrap: { position: 'absolute', right: spacing.lg, bottom: spacing.xl, alignItems: 'flex-end', gap: spacing.md },
  fabMenu: { gap: spacing.sm, alignItems: 'flex-end' },
  fabItem: { padding: spacing.md },
  fabItemInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fabItemLabel: { fontWeight: '700' },
  fab: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
