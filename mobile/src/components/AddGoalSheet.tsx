import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useCreateGoal } from '../hooks/queries';
import { apiErrorMessage } from '../lib/api';
import { colors, radius, spacing } from '../theme';
import { useTheme } from '../theme/useTheme';
import type { DimensionKey, Priority } from '../types/api';
import { DIMENSION_LABEL, DIMENSION_ORDER } from '../types/api';
import { FormField } from './FormField';
import { Body, ErrorNote, GradientButton, Heading, Muted } from './ui';

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'high', label: 'Yuqori' },
  { key: 'medium', label: 'O‘rta' },
  { key: 'low', label: 'Past' },
];

export function AddGoalSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const createGoal = useCreateGoal();

  const [title, setTitle] = useState('');
  const [dimension, setDimension] = useState<DimensionKey>('ruhiy');
  const [priority, setPriority] = useState<Priority>('medium');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) {
      setError('Maqsad nomini kiriting');
      return;
    }
    try {
      await createGoal.mutateAsync({ title: title.trim(), dimension, priority });
      setTitle('');
      setError(null);
      onClose();
    } catch (mutationError) {
      setError(apiErrorMessage(mutationError, 'Maqsad qo‘shilmadi'));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: palette.card }]}>
        <View style={[styles.grabber, { backgroundColor: palette.border }]} />
        <Heading>Yangi maqsad</Heading>

        <FormField
          label="Nomi"
          value={title}
          onChangeText={setTitle}
          placeholder="Masalan: Qur’on yodlash"
          autoFocus
        />

        <View style={styles.block}>
          <Muted style={styles.blockLabel}>YO‘NALISH</Muted>
          <View style={styles.wrap}>
            {DIMENSION_ORDER.map((key) => {
              const active = dimension === key;
              const tint = colors.dimensions[key];
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  onPress={() => setDimension(key)}
                  style={[
                    styles.pill,
                    { borderColor: active ? tint : palette.border },
                    active && { backgroundColor: `${tint}1F` },
                  ]}
                >
                  <Body style={[styles.pillLabel, active && { color: tint, fontWeight: '800' }]}>
                    {DIMENSION_LABEL[key]}
                  </Body>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.block}>
          <Muted style={styles.blockLabel}>MUHIMLIGI</Muted>
          <View style={styles.wrap}>
            {PRIORITIES.map((item) => {
              const active = priority === item.key;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  onPress={() => setPriority(item.key)}
                  style={[
                    styles.pill,
                    { borderColor: active ? colors.gradientStart : palette.border },
                    active && { backgroundColor: `${colors.gradientStart}14` },
                  ]}
                >
                  <Body
                    style={[
                      styles.pillLabel,
                      active && { color: colors.gradientStart, fontWeight: '800' },
                    ]}
                  >
                    {item.label}
                  </Body>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? <ErrorNote message={error} /> : null}

        <GradientButton
          label="Saqlash"
          loading={createGoal.isPending}
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
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillLabel: { fontWeight: '600' },
});
