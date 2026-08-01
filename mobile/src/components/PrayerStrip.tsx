import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatCountdown } from '../lib/format';
import { nextPrayer, type ComputeOptions } from '../lib/prayerTimes';
import { colors, radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import type { Prayer, PrayerName, PrayerStatus } from '../types/api';
import { PRAYER_LABEL, PRAYER_ORDER } from '../types/api';
import { Card, Muted } from './ui';

interface PrayerStripProps {
  prayers: Prayer[];
  options: ComputeOptions;
  onToggle: (name: PrayerName, status: PrayerStatus) => void;
}

/** Five toggles plus a live countdown to the next prayer. */
export function PrayerStrip({ prayers, options, onToggle }: PrayerStripProps) {
  const { palette } = useTheme();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const upcoming = useMemo(() => nextPrayer(options, now), [options, now]);

  const statusOf = (name: PrayerName): PrayerStatus | undefined =>
    prayers.find((prayer) => prayer.name === name)?.status;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="notifications" size={18} color={colors.gradientStart} />
          <Muted style={styles.headerLabel}>Namoz vaqtlari</Muted>
        </View>
        <View style={styles.countdown}>
          <Muted style={styles.countdownText}>
            {PRAYER_LABEL[upcoming.name]} — {formatCountdown(upcoming.msRemaining)} qoldi
          </Muted>
        </View>
      </View>

      <View style={styles.row}>
        {PRAYER_ORDER.map((name) => {
          const status = statusOf(name);
          const kept = status === 'done' || status === 'excused';
          const isNext = name === upcoming.name;

          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityLabel={`${PRAYER_LABEL[name]} ${kept ? 'o‘qilgan' : 'belgilanmagan'}`}
              onPress={() => onToggle(name, kept ? 'missed' : 'done')}
              style={styles.item}
            >
              <View
                style={[
                  styles.circle,
                  kept
                    ? styles.circleDone
                    : {
                        borderColor: isNext ? colors.gradientStart : palette.border,
                        borderWidth: isNext ? 2 : 1.5,
                      },
                ]}
              >
                {kept ? (
                  <Ionicons name="checkmark" size={22} color="#FFFFFF" />
                ) : (
                  <View
                    style={[
                      styles.innerDot,
                      { borderColor: isNext ? colors.gradientStart : palette.border },
                    ]}
                  />
                )}
              </View>
              <Muted
                style={[
                  styles.itemLabel,
                  isNext && { color: colors.gradientStart, fontWeight: '800' },
                ]}
              >
                {PRAYER_LABEL[name]}
              </Muted>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerLabel: { ...typography.label },
  countdown: {
    backgroundColor: `${colors.gradientEnd}26`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  countdownText: { color: colors.gradientStart, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { alignItems: 'center', gap: spacing.sm },
  circle: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: { backgroundColor: colors.gradientEnd },
  innerDot: { width: 14, height: 14, borderRadius: radius.pill, borderWidth: 1.5 },
  itemLabel: { fontWeight: '600' },
});
