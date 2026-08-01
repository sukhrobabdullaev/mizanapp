import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  Body,
  Card,
  ErrorNote,
  GradientButton,
  Muted,
  ProgressBar,
  Screen,
  Title,
} from '../../src/components/ui';
import { useCreateReview } from '../../src/hooks/queries';
import { apiErrorMessage } from '../../src/lib/api';
import { weekStartISO } from '../../src/lib/dates';
import { colors, radius, spacing } from '../../src/theme';
import { useTheme } from '../../src/theme/useTheme';
import type { DimensionKey } from '../../src/types/api';
import { DIMENSION_LABEL, DIMENSION_ORDER } from '../../src/types/api';

const QUESTIONS: Record<DimensionKey, string> = {
  ruhiy: 'Bu hafta ibodat va ruhiy holatingiz qanday kechdi?',
  jismoniy: 'Jismoniy sog‘liq, uyqu va harakat qanday bo‘ldi?',
  moliyaviy: 'Moliyaviy intizomingiz qanchalik mustahkam edi?',
  ijtimoiy: 'Oila, qarindosh va do‘stlar bilan aloqangiz qanday?',
  ilmiy: 'Ilm olish va o‘qishga qancha vaqt ajratdingiz?',
};

const SCALE = [1, 2, 3, 4, 5] as const;

export default function MuhosabaScreen() {
  const { palette } = useTheme();
  const createReview = useCreateReview();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { score: number; note: string }>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);

  const key = DIMENSION_ORDER[step] as DimensionKey;
  const current = answers[key];
  const isLast = step === DIMENSION_ORDER.length - 1;

  const setScore = (score: number) =>
    setAnswers((state) => ({
      ...state,
      [key]: { score, note: state[key]?.note ?? '' },
    }));

  const setNote = (note: string) =>
    setAnswers((state) => ({
      ...state,
      [key]: { score: state[key]?.score ?? 3, note },
    }));

  const next = async () => {
    if (!current?.score) {
      setError('Bahoni tanlang');
      return;
    }
    setError(null);

    if (!isLast) {
      setStep((value) => value + 1);
      return;
    }

    try {
      const payload = Object.fromEntries(
        DIMENSION_ORDER.map((dimension) => [
          dimension,
          {
            score: answers[dimension]?.score ?? 3,
            note: answers[dimension]?.note ?? '',
          },
        ]),
      ) as Record<DimensionKey, { score: number; note: string }>;

      await createReview.mutateAsync({ week_start: weekStartISO(), answers: payload });
      router.replace('/muhosaba/natija');
    } catch (mutationError) {
      setError(apiErrorMessage(mutationError, 'Muhosaba saqlanmadi'));
    }
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Yopish"
          onPress={() => (step === 0 ? router.back() : setStep((value) => value - 1))}
        >
          <Ionicons
            name={step === 0 ? 'close' : 'chevron-back'}
            size={26}
            color={palette.text}
          />
        </Pressable>
        <Muted>
          {step + 1} / {DIMENSION_ORDER.length}
        </Muted>
      </View>

      <ProgressBar ratio={(step + 1) / DIMENSION_ORDER.length} />

      <View style={styles.head}>
        <View
          style={[styles.badge, { backgroundColor: `${colors.dimensions[key]}1F` }]}
        >
          <View style={[styles.badgeDot, { backgroundColor: colors.dimensions[key] }]} />
          <Muted style={[styles.badgeLabel, { color: colors.dimensions[key] }]}>
            {DIMENSION_LABEL[key]}
          </Muted>
        </View>
        <Title style={styles.question}>{QUESTIONS[key]}</Title>
      </View>

      <Card style={styles.scaleCard}>
        <View style={styles.scale}>
          {SCALE.map((value) => {
            const active = current?.score === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Baho ${value}`}
                onPress={() => setScore(value)}
                style={[
                  styles.scaleItem,
                  { borderColor: active ? colors.gradientStart : palette.border },
                  active && { backgroundColor: `${colors.gradientStart}14` },
                ]}
              >
                <Body
                  style={[
                    styles.scaleValue,
                    active && { color: colors.gradientStart, fontWeight: '800' },
                  ]}
                >
                  {value}
                </Body>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.scaleLegend}>
          <Muted>Juda past</Muted>
          <Muted>A’lo</Muted>
        </View>
      </Card>

      <TextInput
        value={current?.note ?? ''}
        onChangeText={setNote}
        placeholder="Izoh (ixtiyoriy)…"
        placeholderTextColor={palette.textMuted}
        multiline
        style={[
          styles.note,
          { backgroundColor: palette.card, color: palette.text, borderColor: palette.border },
        ]}
      />

      {error ? <ErrorNote message={error} /> : null}

      <GradientButton
        label={isLast ? 'Yakunlash' : 'Keyingi'}
        loading={createReview.isPending}
        onPress={() => void next()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  head: { gap: spacing.md },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  badgeDot: { width: 8, height: 8, borderRadius: radius.pill },
  badgeLabel: { fontWeight: '800' },
  question: { fontSize: 22, lineHeight: 30 },
  scaleCard: { gap: spacing.md },
  scale: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  scaleItem: {
    flex: 1,
    height: 60,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleValue: { fontSize: 20, fontWeight: '700' },
  scaleLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  note: {
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    fontSize: 15,
    textAlignVertical: 'top',
  },
});
