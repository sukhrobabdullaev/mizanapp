import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Dots } from '../../src/components/Dots';
import {
  Body,
  Card,
  ErrorNote,
  GradientButton,
  Muted,
  Screen,
  Title,
} from '../../src/components/ui';
import { useProfile, useUpdateProfile } from '../../src/hooks/queries';
import { apiErrorMessage } from '../../src/lib/api';
import {
  requestNotificationPermission,
  rescheduleAll,
} from '../../src/lib/notifications';
import { computePrayerTimes, DEFAULT_COORDS } from '../../src/lib/prayerTimes';
import { colors, spacing } from '../../src/theme';

const TOGGLES = [
  { key: 'prayers', label: 'Namoz vaqtlari', hint: 'Har bir namoz vaqtida eslatma' },
  { key: 'tasks', label: 'Kunlik vazifalar', hint: 'Har kuni ertalab 8:30 da' },
  { key: 'muhosaba', label: 'Haftalik muhosaba', hint: 'Yakshanba kuni 20:00 da' },
] as const;

export default function OnboardingEslatmalar() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    prayers: true,
    tasks: true,
    muhosaba: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      const anyEnabled = Object.values(prefs).some(Boolean);
      let granted = false;
      if (anyEnabled) granted = await requestNotificationPermission();

      if (granted) {
        const times = computePrayerTimes({
          latitude: profile.data?.location_lat ?? DEFAULT_COORDS.latitude,
          longitude: profile.data?.location_lng ?? DEFAULT_COORDS.longitude,
          calcMethod: profile.data?.calc_method,
          madhab: profile.data?.asr_madhab,
          offsets: profile.data?.prayer_offsets,
        });
        await rescheduleAll({
          prayers: prefs.prayers ? times : [],
          dailyTaskReminder: prefs.tasks,
          weeklyMuhosaba: prefs.muhosaba,
        });
      }

      await updateProfile.mutateAsync({
        notif_prefs: { ...prefs, granted },
        onboarded_at: new Date().toISOString(),
      });
      router.replace('/(tabs)/bugun');
    } catch (mutationError) {
      setError(apiErrorMessage(mutationError, 'Saqlab bo‘lmadi'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.top}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications-outline" size={40} color={colors.gradientStart} />
          </View>
          <Title style={styles.title}>Eslatmalar</Title>
          <Body style={styles.subtitle}>
            Nimalarni eslatib turishimizni tanlang. Keyinroq sozlamalardan
            o‘zgartirishingiz mumkin.
          </Body>
        </View>

        <Card style={styles.card}>
          {TOGGLES.map((toggle) => (
            <View key={toggle.key} style={styles.row}>
              <View style={styles.rowText}>
                <Body style={styles.rowLabel}>{toggle.label}</Body>
                <Muted>{toggle.hint}</Muted>
              </View>
              <Switch
                value={prefs[toggle.key] ?? false}
                onValueChange={(value) =>
                  setPrefs((current) => ({ ...current, [toggle.key]: value }))
                }
                trackColor={{ true: colors.gradientEnd, false: undefined }}
                thumbColor={undefined}
              />
            </View>
          ))}
        </Card>

        {error ? <ErrorNote message={error} /> : null}

        <View style={styles.footer}>
          <GradientButton
            label="Boshlash"
            loading={busy}
            onPress={() => void finish()}
          />
          <Dots count={3} active={2} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  top: { gap: spacing.md, alignItems: 'center', paddingTop: spacing.xxl },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${colors.gradientStart}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowText: { gap: 2, flexShrink: 1, paddingRight: spacing.md },
  rowLabel: { fontWeight: '700' },
  footer: { gap: spacing.lg, paddingBottom: spacing.xl },
});
