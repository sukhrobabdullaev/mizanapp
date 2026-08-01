import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Dots } from '../../src/components/Dots';
import { Body, GradientButton, Muted, Screen, Title } from '../../src/components/ui';
import { colors, radius, spacing } from '../../src/theme';
import { DIMENSION_LABEL, DIMENSION_ORDER } from '../../src/types/api';

export default function OnboardingValue() {
  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={styles.circle}
          />
        </View>

        <View style={styles.copy}>
          <Title style={styles.title}>Hayotingiz mizonda</Title>
          <Body style={styles.subtitle}>
            Mizan hayotingizning beshta tomonini bir joyda kuzatadi va haftalik
            muhosaba bilan muvozanatni ko‘rsatadi.
          </Body>
        </View>

        <View style={styles.chips}>
          {DIMENSION_ORDER.map((key) => (
            <View
              key={key}
              style={[styles.chip, { backgroundColor: `${colors.dimensions[key]}22` }]}
            >
              <View
                style={[styles.chipDot, { backgroundColor: colors.dimensions[key] }]}
              />
              <Muted style={styles.chipLabel}>{DIMENSION_LABEL[key]}</Muted>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <GradientButton
            label="Boshlash"
            onPress={() => router.push('/(onboarding)/namoz')}
          />
          <Dots count={3} active={0} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  hero: { alignItems: 'center', paddingTop: spacing.xxl },
  circle: { width: 190, height: 190, borderRadius: radius.pill },
  copy: { gap: spacing.md, alignItems: 'center' },
  title: { fontSize: 30, textAlign: 'center' },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  chipDot: { width: 8, height: 8, borderRadius: radius.pill },
  chipLabel: { fontSize: 13, fontWeight: '700' },
  footer: { gap: spacing.lg, paddingBottom: spacing.xl },
});
