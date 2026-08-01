import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useCategories, useCreateTransaction } from '../hooks/queries';
import { apiErrorMessage } from '../lib/api';
import { formatAmount } from '../lib/format';
import { colors, radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import type { TransactionType } from '../types/api';
import { Body, ErrorNote, Muted } from './ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const;

/** Amount-first entry: type digits, tap a category, save. Three taps minimum. */
export function QuickExpenseSheet({
  visible,
  date,
  onClose,
}: {
  visible: boolean;
  date: string;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const categories = useCategories();
  const createTransaction = useCreateTransaction();

  const [type, setType] = useState<TransactionType>('expense');
  const [raw, setRaw] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const visibleCategories = useMemo(
    () => (categories.data ?? []).filter((category) => category.type === type),
    [categories.data, type],
  );

  const press = (key: (typeof KEYS)[number]) => {
    setError(null);
    if (key === 'del') {
      setRaw((current) => current.slice(0, -1));
      return;
    }
    if (key === '.' && raw.includes('.')) return;
    if (raw.includes('.') && raw.split('.')[1]?.length === 2) return;
    if (raw.replace('.', '').length >= 12) return;
    setRaw((current) => (current === '0' && key !== '.' ? key : current + key));
  };

  const reset = () => {
    setRaw('');
    setCategoryId(null);
    setNote('');
    setError(null);
  };

  const submit = async () => {
    const amount = Number(raw);
    if (!raw || !Number.isFinite(amount) || amount <= 0) {
      setError('Summani kiriting');
      return;
    }
    try {
      await createTransaction.mutateAsync({
        amount: amount.toFixed(2),
        type,
        category: categoryId,
        date,
        note: note.trim(),
      });
      reset();
      onClose();
    } catch (mutationError) {
      setError(apiErrorMessage(mutationError, 'Saqlanmadi'));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: palette.card }]}>
        <View style={[styles.grabber, { backgroundColor: palette.border }]} />

        <View style={styles.segment}>
          {(['expense', 'income'] as const).map((option) => {
            const active = type === option;
            const label = option === 'expense' ? 'Chiqim' : 'Kirim';
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                style={styles.segmentItem}
                onPress={() => {
                  setType(option);
                  setCategoryId(null);
                }}
              >
                {active ? (
                  <LinearGradient
                    colors={[colors.gradientStart, colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.segmentActive}
                  >
                    <Body style={styles.segmentLabelActive}>{label}</Body>
                  </LinearGradient>
                ) : (
                  <Body style={[styles.segmentLabel, { color: palette.textMuted }]}>
                    {label}
                  </Body>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.amountRow}>
          <Body style={[styles.amount, { color: palette.text }]}>
            {raw ? formatAmount(raw) : '0'}
          </Body>
          <Muted style={styles.currency}>so‘m</Muted>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categories}>
            {visibleCategories.map((category) => {
              const active = categoryId === category.id;
              const tint = category.is_sadaqa
                ? colors.gold
                : category.dimension
                  ? colors.dimensions[category.dimension]
                  : colors.gradientStart;
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  style={styles.category}
                  onPress={() => setCategoryId(active ? null : category.id)}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: `${tint}1F` },
                      active && { borderColor: tint, borderWidth: 2 },
                    ]}
                  >
                    <Ionicons
                      name={(category.icon || 'pricetag') as keyof typeof Ionicons.glyphMap}
                      size={22}
                      color={tint}
                    />
                  </View>
                  <Muted numberOfLines={1} style={styles.categoryLabel}>
                    {category.name_uz}
                  </Muted>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Izoh…"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.note,
            { backgroundColor: palette.background, color: palette.text },
          ]}
        />

        {error ? <ErrorNote message={error} /> : null}

        <View style={styles.keypadRow}>
          <View style={styles.keypad}>
            {KEYS.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={key === 'del' ? 'O‘chirish' : key}
                onPress={() => press(key)}
                style={[styles.key, { backgroundColor: palette.background }]}
              >
                {key === 'del' ? (
                  <Ionicons name="backspace-outline" size={22} color={palette.text} />
                ) : (
                  <Body style={[styles.keyLabel, { color: palette.text }]}>{key}</Body>
                )}
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Saqlash"
            disabled={createTransaction.isPending}
            onPress={() => void submit()}
            style={styles.saveWrap}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={styles.save}
            >
              <Ionicons name="checkmark-circle-outline" size={30} color="#FFFFFF" />
              <Body style={styles.saveLabel}>Saqlash</Body>
            </LinearGradient>
          </Pressable>
        </View>
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
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  grabber: { width: 44, height: 5, borderRadius: radius.pill, alignSelf: 'center' },
  segment: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  segmentItem: { flex: 1, alignItems: 'center' },
  segmentActive: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    width: '100%',
    alignItems: 'center',
  },
  segmentLabel: { fontSize: 17, fontWeight: '600' },
  segmentLabelActive: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.sm },
  amount: { fontSize: 44, fontWeight: '800' },
  currency: { fontSize: 18, fontWeight: '700' },
  categories: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.xs },
  category: { alignItems: 'center', gap: spacing.sm, width: 76 },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: { ...typography.caption, textAlign: 'center' },
  note: { height: 48, borderRadius: radius.md, paddingHorizontal: spacing.lg, fontSize: 15 },
  keypadRow: { flexDirection: 'row', gap: spacing.md },
  keypad: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  key: {
    width: '31%',
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: { fontSize: 22, fontWeight: '700' },
  saveWrap: { width: 96 },
  save: {
    flex: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  saveLabel: { color: '#FFFFFF', fontWeight: '800' },
});
