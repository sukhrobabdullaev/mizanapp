import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Heatmap, PentagonRadar, ProgressRing } from '../../src/components/charts';
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
import {
  useHeatmap,
  useMizanScore,
  useMizanStats,
  useReview,
  useStreaks,
} from '../../src/hooks/queries';
import { useAuth } from '../../src/hooks/useAuth';
import { weekStartISO } from '../../src/lib/dates';
import { formatPercent } from '../../src/lib/format';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useTheme } from '../../src/theme/useTheme';
import { DIMENSION_LABEL } from '../../src/types/api';

export default function MizanScreen() {
  const { palette } = useTheme();
  const week = weekStartISO();
  const score = useMizanScore(week);
  const stats = useMizanStats();
  const streaks = useStreaks();
  const heatmap = useHeatmap();
  const review = useReview(week);
  const { signOut } = useAuth();

  const confirmSignOut = () => {
    Alert.alert('Chiqish', 'Hisobingizdan chiqmoqchimisiz?', [
      { text: 'Bekor qilish', style: 'cancel' },
      { text: 'Chiqish', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const radar = score.data?.radar ?? {
    ruhiy: 0,
    jismoniy: 0,
    moliyaviy: 0,
    ijtimoiy: 0,
    ilmiy: 0,
  };
  const trend = score.data?.trend ?? null;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={score.isRefetching}
          onRefresh={() => {
            void score.refetch();
            void stats.refetch();
            void streaks.refetch();
            void heatmap.refetch();
          }}
          tintColor={colors.gradientStart}
        />
      }
    >
      <View style={styles.header}>
        <Title style={styles.brand}>Mizan</Title>
        <Pressable accessibilityRole="button" accessibilityLabel="Chiqish" onPress={confirmSignOut}>
          <Ionicons name="log-out-outline" size={24} color={palette.textMuted} />
        </Pressable>
      </View>

      <Card style={styles.radarCard}>
        <Heading>Tahlil</Heading>
        {score.isPending ? <Loading /> : <PentagonRadar values={radar} />}
      </Card>

      <Card style={styles.scoreCard}>
        <View style={styles.scoreRow}>
          <View style={styles.scoreIcon}>
            <Ionicons name="analytics" size={26} color={colors.gradientStart} />
          </View>
          <View style={styles.scoreText}>
            <View style={styles.scoreValueRow}>
              <Body style={[styles.scoreValue, { color: palette.text }]}>
                {score.data?.score ?? 0}
              </Body>
              <Muted style={styles.scoreMax}>/100</Muted>
            </View>
            <Muted>Muvozanat darajasi</Muted>
          </View>
          {trend !== null ? (
            <View
              style={[
                styles.trend,
                {
                  backgroundColor:
                    trend >= 0 ? `${colors.gradientStart}14` : `${colors.danger}14`,
                },
              ]}
            >
              <Ionicons
                name={trend >= 0 ? 'trending-up' : 'trending-down'}
                size={16}
                color={trend >= 0 ? colors.gradientStart : colors.danger}
              />
              <Muted
                style={{ color: trend >= 0 ? colors.gradientStart : colors.danger }}
              >
                {trend > 0 ? `+${trend}` : trend}
              </Muted>
            </View>
          ) : null}
        </View>

        {score.data?.weakest ? (
          <View style={[styles.nudge, { borderTopColor: palette.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.gold} />
            <Muted style={styles.nudgeText}>
              Bu hafta {DIMENSION_LABEL[score.data.weakest]} tomoningiz bo‘sh qoldi
            </Muted>
          </View>
        ) : null}
      </Card>

      <View style={styles.grid}>
        <Card style={styles.gridItem}>
          <ProgressRing
            ratio={stats.data?.prayers_ratio ?? 0}
            size={84}
            label={`${stats.data?.prayers_kept ?? 0}/${stats.data?.prayers_total ?? 0}`}
          />
          <Muted style={styles.gridLabel}>NAMOZ</Muted>
        </Card>
        <Card style={styles.gridItem}>
          <ProgressRing
            ratio={stats.data?.tasks_ratio ?? 0}
            size={84}
            label={formatPercent(stats.data?.tasks_ratio ?? 0)}
          />
          <Muted style={styles.gridLabel}>VAZIFALAR</Muted>
        </Card>
        <Card style={styles.gridItem}>
          <Body style={styles.bigStat}>🔥 {streaks.data?.prayers.current ?? 0}</Body>
          <Muted style={styles.gridLabel}>KETMA-KET KUN</Muted>
        </Card>
        <Card style={styles.gridItem}>
          <Body style={[styles.bigStat, { color: colors.gradientStart }]}>
            {streaks.data?.prayers.longest ?? 0}
          </Body>
          <Muted style={styles.gridLabel}>ENG UZUN SERIYA</Muted>
        </Card>
      </View>

      <Card style={styles.heatmapCard}>
        <Heading>Amallar bog‘i</Heading>
        {heatmap.isPending ? (
          <Loading />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Heatmap
              days={heatmap.data?.days ?? []}
              weeks={heatmap.data?.weeks ?? 12}
            />
          </ScrollView>
        )}
      </Card>

      <Card style={styles.muhosabaCard}>
        <Heading>Haftalik muhosaba</Heading>
        <Muted>
          {review.data
            ? `Bu hafta yakunlangan · ${review.data.mizan_score ?? 0} ball`
            : 'Haftangizni 5 qadamda sarhisob qiling.'}
        </Muted>
        <GradientButton
          label={review.data ? 'Natijani ko‘rish' : 'Muhosabani boshlash'}
          onPress={() =>
            router.push(review.data ? '/muhosaba/natija' : '/muhosaba')
          }
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 30, fontWeight: '800', color: colors.gradientStart },
  radarCard: { alignItems: 'center', gap: spacing.md },
  scoreCard: { gap: spacing.md },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  scoreIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: `${colors.gradientStart}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { flex: 1 },
  scoreValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  scoreValue: { fontSize: 34, fontWeight: '800' },
  scoreMax: { fontSize: 15, fontWeight: '700' },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  nudgeText: { fontStyle: 'italic', flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: {
    width: '47.5%',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  gridLabel: { ...typography.caption, letterSpacing: 1, fontWeight: '700' },
  bigStat: { fontSize: 30, fontWeight: '800' },
  heatmapCard: { gap: spacing.lg },
  muhosabaCard: { gap: spacing.md },
});
