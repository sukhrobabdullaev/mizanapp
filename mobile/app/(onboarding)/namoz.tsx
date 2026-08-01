import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
import { useUpdateProfile } from '../../src/hooks/queries';
import { apiErrorMessage } from '../../src/lib/api';
import { CALC_METHOD_LABELS, type CalcMethodKey } from '../../src/lib/prayerTimes';
import { colors, radius, spacing, typography } from '../../src/theme';
import { useTheme } from '../../src/theme/useTheme';

const METHOD_KEYS = Object.keys(CALC_METHOD_LABELS) as CalcMethodKey[];

export default function OnboardingNamoz() {
  const { palette } = useTheme();
  const updateProfile = useUpdateProfile();

  const [method, setMethod] = useState<CalcMethodKey>('MuslimWorldLeague');
  const [madhab, setMadhab] = useState<'Hanafi' | 'Shafi'>('Hanafi');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = async () => {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Joylashuvga ruxsat berilmadi. Toshkent vaqtlari ishlatiladi.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      const [place] = await Location.reverseGeocodeAsync(position.coords);
      setPlaceName(place?.city ?? place?.region ?? 'Joylashuv aniqlandi');
    } catch {
      setError('Joylashuvni aniqlab bo‘lmadi.');
    } finally {
      setLocating(false);
    }
  };

  const goNext = async () => {
    setError(null);
    try {
      await updateProfile.mutateAsync({
        calc_method: method,
        asr_madhab: madhab,
        ...(coords ? { location_lat: coords.lat, location_lng: coords.lng } : {}),
        ...(placeName ? { location_name: placeName } : {}),
      });
      router.push('/(onboarding)/eslatmalar');
    } catch (mutationError) {
      setError(apiErrorMessage(mutationError, 'Saqlab bo‘lmadi'));
    }
  };

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.copy}>
            <Title style={styles.title}>Namoz vaqtlari</Title>
            <Body style={styles.subtitle}>
              Joylashuvingiz asosida aniq vaqtlar va bildirishnomalar
            </Body>
          </View>

          <Card style={styles.settings}>
            <Pressable
              accessibilityRole="button"
              style={styles.row}
              onPress={() => setPickerOpen((open) => !open)}
            >
              <View style={styles.rowText}>
                <Muted style={styles.rowLabel}>HISOBLASH USULI</Muted>
                <Body style={styles.rowValue}>{CALC_METHOD_LABELS[method]}</Body>
              </View>
              <Ionicons
                name={pickerOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={palette.textMuted}
              />
            </Pressable>

            {pickerOpen
              ? METHOD_KEYS.map((key) => (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    style={styles.option}
                    onPress={() => {
                      setMethod(key);
                      setPickerOpen(false);
                    }}
                  >
                    <Body>{CALC_METHOD_LABELS[key]}</Body>
                    {key === method ? (
                      <Ionicons name="checkmark" size={18} color={colors.gradientStart} />
                    ) : null}
                  </Pressable>
                ))
              : null}

            <View style={[styles.divider, { backgroundColor: palette.border }]} />

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Muted style={styles.rowLabel}>ASR VAQTI</Muted>
                <Body style={styles.rowValue}>
                  {madhab === 'Hanafi' ? 'Hanafiy' : 'Shofeiy'}
                </Body>
              </View>
              <View style={styles.segment}>
                {(['Hanafi', 'Shafi'] as const).map((option) => (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    onPress={() => setMadhab(option)}
                    style={[
                      styles.segmentItem,
                      madhab === option && styles.segmentItemActive,
                    ]}
                  >
                    <Muted
                      style={[
                        styles.segmentLabel,
                        madhab === option && styles.segmentLabelActive,
                      ]}
                    >
                      {option === 'Hanafi' ? 'Hanafiy' : 'Shofeiy'}
                    </Muted>
                  </Pressable>
                ))}
              </View>
            </View>
          </Card>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={palette.textMuted} />
            <Muted>{placeName ?? 'Joylashuv aniqlanmagan'}</Muted>
          </View>

          {error ? <ErrorNote message={error} /> : null}
        </ScrollView>

        <View style={styles.footer}>
          <GradientButton
            label={locating ? 'Aniqlanmoqda…' : 'Joylashuvga ruxsat berish'}
            loading={locating}
            onPress={() => void requestLocation()}
          />
          <GradientButton
            variant="ghost"
            label="Davom etish"
            loading={updateProfile.isPending}
            onPress={() => void goNext()}
          />
          <Dots count={3} active={1} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  scroll: { gap: spacing.xl, paddingTop: spacing.xxl },
  copy: { gap: spacing.sm, alignItems: 'center' },
  title: { fontSize: 28, textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  settings: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowText: { gap: spacing.xs, flexShrink: 1 },
  rowLabel: { ...typography.caption, letterSpacing: 0.8 },
  rowValue: { fontSize: 17, fontWeight: '700' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  divider: { height: 1, marginVertical: spacing.sm },
  segment: { flexDirection: 'row', gap: spacing.xs },
  segmentItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  segmentItemActive: { backgroundColor: `${colors.gradientStart}1A` },
  segmentLabel: { fontWeight: '700' },
  segmentLabelActive: { color: colors.gradientStart },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  footer: { gap: spacing.md, paddingBottom: spacing.xl },
});
