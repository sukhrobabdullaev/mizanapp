import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PentagonRadar } from '../../src/components/charts';
import {
  Body,
  Card,
  GradientButton,
  Heading,
  Loading,
  Muted,
  Screen,
  Title,
} from '../../src/components/ui';
import { useMizanScore, useReview } from '../../src/hooks/queries';
import { weekStartISO } from '../../src/lib/dates';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useTheme } from '../../src/theme/useTheme';
import { DIMENSION_LABEL, DIMENSION_ORDER } from '../../src/types/api';

export default function MuhosabaNatijaScreen() {
  const { palette } = useTheme();
  const week = weekStartISO();
  const score = useMizanScore(week);
  const review = useReview(week);

  if (score.isPending) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  const radar = score.data?.radar ?? {
    ruhiy: 0,
    jismoniy: 0,
    moliyaviy: 0,
    ijtimoiy: 0,
    ilmiy: 0,
  };

  return (
    <Screen>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Ionicons name="checkmark" size={26} color="#FFFFFF" />
        </View>
        <Title style={styles.title}>Haftalik muhosaba yakunlandi</Title>
        <Muted style={styles.subtitle}>{week} dan boshlangan hafta</Muted>
      </View>

      <Card style={styles.scoreCard}>
        <Body style={[styles.score, { color: palette.text }]}>{score.data?.score ?? 0}</Body>
        <Muted style={styles.scoreLabel}>MUVOZANAT DARAJASI</Muted>
        {score.data?.weakest ? (
          <Muted style={styles.weakest}>
            Eng bo‘sh tomon: {DIMENSION_LABEL[score.data.weakest]}
          </Muted>
        ) : null}
      </Card>

      <Card style={styles.radarCard}>
        <Heading>Yo‘nalishlar</Heading>
        <PentagonRadar values={radar} />
      </Card>

      <Card style={styles.breakdown}>
        {DIMENSION_ORDER.map((key) => {
          const answer = review.data?.answers?.[key];
          return (
            <View key={key} style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <View
                  style={[styles.dot, { backgroundColor: colors.dimensions[key] }]}
                />
                <Body style={styles.breakdownLabel}>{DIMENSION_LABEL[key]}</Body>
              </View>
              <Muted style={styles.breakdownScore}>{answer?.score ?? '—'}/5</Muted>
            </View>
          );
        })}
      </Card>

      <GradientButton label="Yopish" onPress={() => router.replace('/(tabs)/mizan')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg },
  badge: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.gradientStart,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  scoreCard: { alignItems: 'center', gap: spacing.xs },
  score: { fontSize: 56, fontWeight: '800' },
  scoreLabel: { ...typography.caption, letterSpacing: 1.2, fontWeight: '700' },
  weakest: { marginTop: spacing.sm },
  radarCard: { alignItems: 'center', gap: spacing.md },
  breakdown: { gap: spacing.md },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  breakdownLabel: { fontWeight: '700' },
  breakdownScore: { fontWeight: '800' },
});
