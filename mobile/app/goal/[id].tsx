import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ProgressRing } from '../../src/components/charts';
import { TaskRow } from '../../src/components/TaskRow';
import {
  Body,
  Card,
  Chip,
  EmptyState,
  GradientButton,
  Heading,
  Loading,
  Muted,
  Screen,
  Title,
} from '../../src/components/ui';
import { useDeleteGoal, useGoal, useToggleTask, useUpdateGoal } from '../../src/hooks/queries';
import { apiErrorMessage } from '../../src/lib/api';
import { colors, radius, spacing } from '../../src/theme';
import { useTheme } from '../../src/theme/useTheme';
import { DIMENSION_LABEL } from '../../src/types/api';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goalId = Number(id);
  const { palette } = useTheme();

  const goal = useGoal(goalId);
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const toggleTask = useToggleTask();

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const confirmDelete = () => {
    Alert.alert('Maqsadni o‘chirish', 'Bu amalni qaytarib bo‘lmaydi.', [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'O‘chirish',
        style: 'destructive',
        onPress: () => {
          deleteGoal.mutate(goalId, {
            onSuccess: () => router.back(),
            onError: (error) =>
              Alert.alert('Xatolik', apiErrorMessage(error, 'O‘chirilmadi')),
          });
        },
      },
    ]);
  };

  if (goal.isPending) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  if (goal.isError || !goal.data) {
    return (
      <Screen>
        <EmptyState title="Maqsad topilmadi" />
        <GradientButton label="Orqaga" onPress={() => router.back()} />
      </Screen>
    );
  }

  const data = goal.data;
  const tint = colors.dimensions[data.dimension];
  const isDone = data.status === 'done';

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Orqaga" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={palette.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="O‘chirish" onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </Pressable>
      </View>

      <Card style={styles.hero}>
        <ProgressRing
          ratio={data.progress}
          size={92}
          color={tint}
          label={`${Math.round(data.progress * 100)}%`}
        />
        <View style={styles.heroText}>
          <Title style={styles.title}>{data.title}</Title>
          <Muted>
            {data.done_count}/{data.task_count} vazifa bajarildi
          </Muted>
          <View style={styles.chips}>
            <Chip label={DIMENSION_LABEL[data.dimension]} color={tint} />
            {data.target_date ? <Chip label={data.target_date} color={colors.textSecondary} /> : null}
          </View>
        </View>
      </Card>

      {data.description ? <Body>{data.description}</Body> : null}

      <GradientButton
        variant="ghost"
        label={isDone ? 'Qayta faollashtirish' : 'Bajarildi deb belgilash'}
        loading={updateGoal.isPending}
        onPress={() =>
          updateGoal.mutate({ id: goalId, patch: { status: isDone ? 'active' : 'done' } })
        }
      />

      <Heading>Bosqichlar</Heading>

      {data.milestones.length === 0 ? (
        <EmptyState title="Bosqich yo‘q" hint="Bu maqsad bosqichlarga bo‘linmagan." />
      ) : null}

      {data.milestones.map((milestone) => {
        const open = expanded[milestone.id] ?? false;
        const ratio = milestone.task_count ? milestone.done_count / milestone.task_count : 0;
        return (
          <Card key={milestone.id} style={styles.milestone}>
            <Pressable
              accessibilityRole="button"
              style={styles.milestoneHeader}
              onPress={() =>
                setExpanded((current) => ({ ...current, [milestone.id]: !open }))
              }
            >
              <View style={styles.milestoneText}>
                <Body style={styles.milestoneTitle}>{milestone.title}</Body>
                <Muted>
                  {milestone.done_count}/{milestone.task_count} · {Math.round(ratio * 100)}%
                  {milestone.due_date ? ` · ${milestone.due_date}` : ''}
                </Muted>
              </View>
              <Ionicons
                name={open ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={palette.textMuted}
              />
            </Pressable>

            {open ? (
              <View style={styles.tasks}>
                {milestone.tasks.length === 0 ? (
                  <Muted>Vazifa yo‘q</Muted>
                ) : (
                  milestone.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() =>
                        toggleTask.mutate(task, {
                          onSettled: () => void goal.refetch(),
                        })
                      }
                    />
                  ))
                )}
              </View>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroText: { flex: 1, gap: spacing.xs },
  title: { fontSize: 21 },
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' },
  milestone: { gap: spacing.md, padding: spacing.md },
  milestoneHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  milestoneText: { flex: 1, gap: 2 },
  milestoneTitle: { fontWeight: '800' },
  tasks: { gap: spacing.sm, borderRadius: radius.sm },
});
