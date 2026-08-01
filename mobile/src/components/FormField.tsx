import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import { useTheme } from '../theme/useTheme';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function FormField({ label, error, style, ...rest }: FormFieldProps) {
  const { palette } = useTheme();
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: palette.textMuted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: palette.card,
            borderColor: error ? colors.danger : palette.border,
            color: palette.text,
          },
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: { ...typography.label, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
  },
  error: { color: colors.danger, fontSize: 12, fontWeight: '600' },
});
