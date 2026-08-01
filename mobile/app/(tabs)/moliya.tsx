import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { DonutChart, type DonutSlice, Legend } from '../../src/components/charts';
import { QuickExpenseSheet } from '../../src/components/QuickExpenseSheet';
import {
  Body,
  Card,
  EmptyState,
  Heading,
  Loading,
  Muted,
  Screen,
  Title,
} from '../../src/components/ui';
import {
  useMonthSummary,
  useProfile,
  useTransactions,
} from '../../src/hooks/queries';
import { currentMonthISO, relativeDayUz, todayISO } from '../../src/lib/dates';
import { formatAmount, formatCompact, formatSigned } from '../../src/lib/format';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useTheme } from '../../src/theme/useTheme';
import type { Transaction } from '../../src/types/api';

const OTHER_COLOR = '#8A948F';

export default function MoliyaScreen() {
  const { palette } = useTheme();
  const month = currentMonthISO();
  const summary = useMonthSummary(month);
  const transactions = useTransactions(month);
  const profile = useProfile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const slices: DonutSlice[] = useMemo(() => {
    const rows = summary.data?.by_category ?? [];
    const top = rows.slice(0, 3).map((row) => ({
      label: row.name ?? 'Boshqa',
      value: Number(row.total),
      color: row.is_sadaqa
        ? colors.gold
        : row.dimension
          ? colors.dimensions[row.dimension]
          : OTHER_COLOR,
    }));
    const rest = rows.slice(3).reduce((sum, row) => sum + Number(row.total), 0);
    return rest > 0 ? [...top, { label: 'Boshqa', value: rest, color: OTHER_COLOR }] : top;
  }, [summary.data]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const item of transactions.data ?? []) {
      const bucket = map.get(item.date) ?? [];
      bucket.push(item);
      map.set(item.date, bucket);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [transactions.data]);

  const hideSadaqa = profile.data?.hide_sadaqa ?? false;
  const sadaqa = summary.data?.sadaqa ?? '0';
  const expense = Number(summary.data?.expense ?? 0);
  const sadaqaShare = expense > 0 ? Math.round((Number(sadaqa) / expense) * 100) : 0;

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={transactions.isRefetching}
          onRefresh={() => {
            void transactions.refetch();
            void summary.refetch();
          }}
          tintColor={colors.gradientStart}
        />
      }
    >
      <View style={styles.header}>
        <Title style={styles.brand}>Moliya</Title>
      </View>

      <Card>
        <Muted style={styles.balanceLabel}>UMUMIY BALANS</Muted>
        <View style={styles.balanceRow}>
          <Body style={[styles.balance, { color: palette.text }]}>
            {formatAmount(summary.data?.balance ?? '0')}
          </Body>
          <Muted style={styles.currency}>so‘m</Muted>
        </View>

        <View style={styles.totals}>
          <View style={[styles.total, { backgroundColor: `${colors.gradientStart}12` }]}>
            <View style={styles.totalHead}>
              <Ionicons name="arrow-down" size={14} color={colors.gradientStart} />
              <Muted style={styles.totalLabel}>KIRIM</Muted>
            </View>
            <Body style={[styles.totalValue, { color: colors.gradientStart }]}>
              +{formatAmount(summary.data?.income ?? '0')}
            </Body>
          </View>
          <View style={[styles.total, { backgroundColor: `${colors.danger}10` }]}>
            <View style={styles.totalHead}>
              <Ionicons name="arrow-up" size={14} color={colors.danger} />
              <Muted style={styles.totalLabel}>CHIQIM</Muted>
            </View>
            <Body style={[styles.totalValue, { color: colors.danger }]}>
              -{formatAmount(summary.data?.expense ?? '0')}
            </Body>
          </View>
        </View>
      </Card>

      <Card style={styles.chartCard}>
        <Heading>Xarajatlar tahlili</Heading>
        {summary.isPending ? (
          <Loading />
        ) : (
          <>
            <DonutChart
              slices={slices}
              centerCaption="JAMI"
              centerLabel={formatCompact(summary.data?.expense ?? '0')}
            />
            <Legend slices={slices} />
          </>
        )}
      </Card>

      {!hideSadaqa && Number(sadaqa) > 0 ? (
        <Card style={[styles.sadaqaCard, { backgroundColor: palette.sadaqaCard }]}>
          <Body style={styles.sadaqaTitle}>Muborak Sadaqa</Body>
          <Muted style={[styles.sadaqaText, { color: palette.sadaqaText }]}>
            “Sadaqa molni kamaytirmaydi.” Bu oydagi xayr-ehsoningiz jami
            xarajatlarning {sadaqaShare}% ini tashkil qildi.
          </Muted>
          <View style={[styles.sadaqaBalance, { backgroundColor: palette.sadaqaInner }]}>
            <View style={styles.sadaqaIcon}>
              <Ionicons name="heart" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Muted style={styles.balanceLabel}>SADAQA BALANSI</Muted>
              <Body style={[styles.sadaqaAmount, { color: palette.sadaqaStrong }]}>{formatAmount(sadaqa)} so‘m</Body>
            </View>
          </View>
        </Card>
      ) : null}

      <Heading>Oxirgi tranzaksiyalar</Heading>

      {transactions.isPending ? <Loading /> : null}

      {!transactions.isPending && grouped.length === 0 ? (
        <EmptyState title="Bu oyda yozuv yo‘q" hint="Pastdagi tugma orqali qo‘shing." />
      ) : null}

      {grouped.map(([date, rows]) => (
        <View key={date} style={styles.group}>
          <Muted style={styles.groupLabel}>{relativeDayUz(date)}</Muted>
          {rows.map((item) => (
            <Card key={item.id} style={styles.txRow}>
              <View
                style={[
                  styles.txIcon,
                  {
                    backgroundColor: item.is_sadaqa
                      ? `${colors.gold}1F`
                      : `${colors.textSecondary}14`,
                  },
                ]}
              >
                <Ionicons
                  name="pricetag-outline"
                  size={18}
                  color={item.is_sadaqa ? colors.gold : palette.textMuted}
                />
              </View>
              <View style={styles.txText}>
                <Body style={styles.txTitle}>{item.category_name ?? 'Boshqa'}</Body>
                {item.note ? <Muted numberOfLines={1}>{item.note}</Muted> : null}
              </View>
              <Body
                style={[
                  styles.txAmount,
                  {
                    color:
                      item.type === 'income'
                        ? colors.gradientStart
                        : item.is_sadaqa
                          ? colors.gold
                          : colors.danger,
                  },
                ]}
              >
                {formatSigned(item.amount, item.type)}
              </Body>
            </Card>
          ))}
        </View>
      ))}

      <View style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tranzaksiya qo‘shish"
          onPress={() => setSheetOpen(true)}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>

      <QuickExpenseSheet
        visible={sheetOpen}
        date={todayISO()}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 30, fontWeight: '800', color: colors.gradientStart },
  balanceLabel: { ...typography.caption, letterSpacing: 1 },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  balance: { fontSize: 40, fontWeight: '800' },
  currency: { fontSize: 18, fontWeight: '700' },
  totals: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  total: { flex: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  totalHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  totalLabel: { ...typography.caption, letterSpacing: 0.8 },
  totalValue: { fontSize: 17, fontWeight: '800' },
  chartCard: { alignItems: 'center', gap: spacing.lg },
  sadaqaCard: { gap: spacing.md },
  sadaqaTitle: { color: colors.gold, fontWeight: '800', fontSize: 16 },
  sadaqaText: { lineHeight: 20 },
  sadaqaBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sadaqaIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sadaqaAmount: { fontWeight: '800' },
  group: { gap: spacing.sm },
  groupLabel: { letterSpacing: 1, marginTop: spacing.sm },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txText: { flex: 1, gap: 2 },
  txTitle: { fontWeight: '700' },
  txAmount: { fontWeight: '800' },
  fabWrap: { position: 'absolute', right: spacing.lg, bottom: spacing.xl },
  fab: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
