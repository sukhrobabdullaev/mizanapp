import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, priorityColor, radius, spacing } from '../theme';
import { useTheme } from '../theme/useTheme';
import type { Task } from '../types/api';
import { Body, Card, Muted } from './ui';

export function TaskRow({
  task,
  goalTitle,
  onToggle,
}: {
  task: Task;
  goalTitle?: string;
  onToggle: () => void;
}) {
  const { palette } = useTheme();
  const done = task.status === 'done';

  return (
    <Card style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: `${priorityColor[task.priority]}14` }]}>
        <View style={[styles.dot, { backgroundColor: priorityColor[task.priority] }]} />
      </View>

      <View style={styles.text}>
        <Body
          numberOfLines={2}
          style={[styles.title, done && { color: palette.textMuted }]}
        >
          {task.title}
        </Body>
        {goalTitle ? <Muted numberOfLines={1}>{goalTitle}</Muted> : null}
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={task.title}
        onPress={onToggle}
        hitSlop={8}
        style={[
          styles.check,
          done ? styles.checkDone : { borderColor: palette.border, borderWidth: 1.5 },
        ]}
      >
        {done ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  text: { flex: 1, gap: 2 },
  title: { fontWeight: '700' },
  check: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.gradientEnd },
});
