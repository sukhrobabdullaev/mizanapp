import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useCreateTask } from '../hooks/queries';
import { apiErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme';
import { useTheme } from '../theme/useTheme';
import type { Goal, Priority } from '../types/api';
import { FormField } from './FormField';
import { Body, ErrorNote, GradientButton, Heading, Muted } from './ui';

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'high', label: 'Yuqori' },
  { key: 'medium', label: 'O‘rta' },
  { key: 'low', label: 'Past' },
];

export function AddTaskSheet({
  visible,
  date,
  goals,
  onClose,
}: {
  visible: boolean;
  date: string;
  goals: Goal[];
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const createTask = useCreateTask();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [goalId, setGoalId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setPriority('medium');
    setGoalId(null);
    setError(null);
  };

  const submit = async () => {
    if (!title.trim()) {
      setError('Vazifa nomini kiriting');
      return;
    }
    try {
      await createTask.mutateAsync({ title: title.trim(), date, priority, goal: goalId });
      reset();
      onClose();
    } catch (mutationError) {
      setError(apiErrorMessage(mutationError, 'Vazifa qo‘shilmadi'));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: palette.card }]}>
        <View style={[styles.grabber, { backgroundColor: palette.border }]} />
        <Heading>Yangi vazifa</Heading>

        <FormField
          label="Nomi"
          value={title}
          onChangeText={setTitle}
          placeholder="Masalan: 20 daqiqa kitob o‘qish"
          autoFocus
        />

        <View style={styles.block}>
          <Muted style={styles.blockLabel}>MUHIMLIGI</Muted>
          <View style={styles.row}>
            {PRIORITIES.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                onPress={() => setPriority(item.key)}
                style={[
                  styles.pill,
                  { borderColor: palette.border },
                  priority === item.key && styles.pillActive,
                ]}
              >
                <Body
                  style={[styles.pillLabel, priority === item.key && styles.pillLabelActive]}
                >
                  {item.label}
                </Body>
              </Pressable>
            ))}
          </View>
        </View>

        {goals.length > 0 ? (
          <View style={styles.block}>
            <Muted style={styles.blockLabel}>MAQSAD (IXTIYORIY)</Muted>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setGoalId(null)}
                  style={[
                    styles.pill,
                    { borderColor: palette.border },
                    goalId === null && styles.pillActive,
                  ]}
                >
                  <Body style={[styles.pillLabel, goalId === null && styles.pillLabelActive]}>
                    Yo‘q
                  </Body>
                </Pressable>
                {goals.map((goal) => (
                  <Pressable
                    key={goal.id}
                    accessibilityRole="button"
                    onPress={() => setGoalId(goal.id)}
                    style={[
                      styles.pill,
                      { borderColor: palette.border },
                      goalId === goal.id && styles.pillActive,
                    ]}
                  >
                    <Body
                      style={[styles.pillLabel, goalId === goal.id && styles.pillLabelActive]}
                      numberOfLines={1}
                    >
                      {goal.title}
                    </Body>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {error ? <ErrorNote message={error} /> : null}

        <GradientButton
          label="Qo‘shish"
          loading={createTask.isPending}
          onPress={() => void submit()}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0A171266' },
  sheet: {
    borderTopLeftRadius: radius.card + 8,
    borderTopRightRadius: radius.card + 8,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  grabber: { width: 44, height: 5, borderRadius: radius.pill, alignSelf: 'center' },
  block: { gap: spacing.sm },
  blockLabel: { letterSpacing: 0.8 },
  row: { flexDirection: 'row', gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: 180,
  },
  pillActive: {
    backgroundColor: `${colors.gradientStart}14`,
    borderColor: colors.gradientStart,
  },
  pillLabel: { fontWeight: '600' },
  pillLabelActive: { color: colors.gradientStart, fontWeight: '800' },
});
