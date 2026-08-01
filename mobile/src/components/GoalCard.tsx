import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme';
import type { Goal } from '../types/api';
import { DIMENSION_LABEL } from '../types/api';
import { ProgressRing } from './charts';
import { Body, Card, Chip, Muted } from './ui';

export function GoalCard({ goal, onPress }: { goal: Goal; onPress: () => void }) {
  const tint = colors.dimensions[goal.dimension];

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card style={styles.card}>
        <ProgressRing
          ratio={goal.progress}
          size={64}
          stroke={7}
          color={tint}
          label={`${Math.round(goal.progress * 100)}%`}
        />
        <View style={styles.text}>
          <Body numberOfLines={2} style={styles.title}>
            {goal.title}
          </Body>
          <Muted>
            {goal.done_count}/{goal.task_count} vazifa
            {goal.target_date ? ` · ${goal.target_date}` : ''}
          </Muted>
          <View style={styles.chips}>
            <Chip label={DIMENSION_LABEL[goal.dimension]} color={tint} />
            {goal.status !== 'active' ? (
              <Chip
                label={goal.status === 'done' ? 'Bajarilgan' : 'Arxiv'}
                color={colors.textSecondary}
              />
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  text: { flex: 1, gap: spacing.xs },
  title: { fontSize: 17, fontWeight: '800' },
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
