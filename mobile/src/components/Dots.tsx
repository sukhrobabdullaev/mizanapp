import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { useTheme } from '../theme/useTheme';

/** Onboarding page indicator; the active dot stretches into a pill. */
export function Dots({ count, active }: { count: number; active: number }) {
  const { palette } = useTheme();
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === active
              ? { width: 24, backgroundColor: colors.gradientEnd }
              : { backgroundColor: palette.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
});
