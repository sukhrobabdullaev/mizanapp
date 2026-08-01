/** Shared UI primitives: Card, GradientButton, Chip, ProgressBar, Screen. */

import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, shadow, spacing, typography } from '../theme';
import { useTheme } from '../theme/useTheme';

export function Screen({
  children,
  scroll = true,
  ...rest
}: { children: ReactNode; scroll?: boolean } & ScrollViewProps) {
  const { palette } = useTheme();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      {...rest}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.flex, { backgroundColor: palette.background }]}
    >
      {body}
    </SafeAreaView>
  );
}

export function Card({ style, children, ...rest }: ViewProps & { children: ReactNode }) {
  const { palette } = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: palette.card }, shadow.card, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

export function Title({ style, ...rest }: TextProps) {
  const { palette } = useTheme();
  return <Text style={[styles.title, { color: palette.text }, style]} {...rest} />;
}

export function Heading({ style, ...rest }: TextProps) {
  const { palette } = useTheme();
  return <Text style={[styles.heading, { color: palette.text }, style]} {...rest} />;
}

export function Body({ style, ...rest }: TextProps) {
  const { palette } = useTheme();
  return <Text style={[styles.body, { color: palette.text }, style]} {...rest} />;
}

export function Muted({ style, ...rest }: TextProps) {
  const { palette } = useTheme();
  return <Text style={[styles.muted, { color: palette.textMuted }, style]} {...rest} />;
}

interface GradientButtonProps extends PressableProps {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
}

export function GradientButton({
  label,
  loading = false,
  variant = 'primary',
  disabled,
  style,
  ...rest
}: GradientButtonProps) {
  const { palette } = useTheme();
  const isDisabled = disabled === true || loading;

  if (variant === 'ghost') {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        style={[
          styles.button,
          styles.ghost,
          { borderColor: palette.border, opacity: isDisabled ? 0.5 : 1 },
        ]}
        {...rest}
      >
        <Text style={[styles.buttonLabel, { color: palette.text }]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={[{ opacity: isDisabled ? 0.6 : 1 }, style as ViewStyle]}
      {...rest}
    >
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[styles.buttonLabel, styles.buttonLabelOnGradient]}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function Chip({
  label,
  color = colors.gradientStart,
  filled = false,
}: {
  label: string;
  color?: string;
  filled?: boolean;
}) {
  return (
    <View
      style={[
        styles.chip,
        filled ? { backgroundColor: color } : { backgroundColor: `${color}1A` },
      ]}
    >
      <Text style={[styles.chipLabel, { color: filled ? '#FFFFFF' : color }]}>
        {label}
      </Text>
    </View>
  );
}

export function ProgressBar({ ratio, height = 8 }: { ratio: number; height?: number }) {
  const { palette } = useTheme();
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <View style={[styles.progressTrack, { height, backgroundColor: palette.track }]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ width: `${clamped * 100}%`, height }}
      />
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.empty}>
      <Heading style={styles.emptyTitle}>{title}</Heading>
      {hint ? <Muted style={styles.emptyHint}>{hint}</Muted> : null}
    </View>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <View style={styles.errorNote}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.gradientStart} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.lg },
  card: { borderRadius: radius.card, padding: spacing.lg },
  title: { ...typography.title },
  heading: { ...typography.heading },
  body: { ...typography.body },
  muted: { ...typography.caption },
  button: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  ghost: { borderWidth: 1 },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
  buttonLabelOnGradient: { color: '#FFFFFF' },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  chipLabel: { fontSize: 12, fontWeight: '700' },
  progressTrack: { borderRadius: radius.pill, overflow: 'hidden', width: '100%' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyTitle: { textAlign: 'center' },
  emptyHint: { textAlign: 'center' },
  errorNote: {
    backgroundColor: `${colors.danger}14`,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  loading: { paddingVertical: spacing.xl, alignItems: 'center' },
});
