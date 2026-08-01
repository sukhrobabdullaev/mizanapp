import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AddGoalSheet } from '../../src/components/AddGoalSheet';
import { GoalCard } from '../../src/components/GoalCard';
import {
  Body,
  Card,
  Chip,
  EmptyState,
  Heading,
  Loading,
  Muted,
  Screen,
  Title,
} from '../../src/components/ui';
import { useChallenges, useGoals, useStartChallenge } from '../../src/hooks/queries';
import { apiErrorMessage } from '../../src/lib/api';
import { colors, radius, spacing } from '../../src/theme';
import { DIMENSION_LABEL } from '../../src/types/api';

export default function MaqsadlarScreen() {
  const goals = useGoals({ status: 'active' });
  const challenges = useChallenges();
  const startChallenge = useStartChallenge();
  const [sheetOpen, setSheetOpen] = useState(false);

  const begin = async (id: number, title: string) => {
    try {
      const goal = await startChallenge.mutateAsync({ id });
      router.push({ pathname: '/goal/[id]', params: { id: String(goal.id) } });
    } catch (error) {
      Alert.alert(title, apiErrorMessage(error, 'Challenge boshlanmadi'));
    }
  };

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={goals.isRefetching}
          onRefresh={() => void goals.refetch()}
          tintColor={colors.gradientStart}
        />
      }
    >
      <View style={styles.header}>
        <Title style={styles.brand}>Maqsadlar</Title>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Maqsad qo‘shish"
          onPress={() => setSheetOpen(true)}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={styles.addButton}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>

      {goals.isPending ? <Loading /> : null}

      {!goals.isPending && (goals.data ?? []).length === 0 ? (
        <EmptyState
          title="Hali maqsad yo‘q"
          hint="O‘zingiz qo‘shing yoki quyidagi challenge’lardan birini boshlang."
        />
      ) : null}

      {(goals.data ?? []).map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          onPress={() =>
            router.push({ pathname: '/goal/[id]', params: { id: String(goal.id) } })
          }
        />
      ))}

      <Heading style={styles.sectionTitle}>Challenge’lar</Heading>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.gallery}>
          {(challenges.data ?? []).map((template) => (
            <Card key={template.id} style={styles.challenge}>
              <Chip
                label={DIMENSION_LABEL[template.dimension]}
                color={colors.dimensions[template.dimension]}
              />
              <Body style={styles.challengeTitle}>{template.title_uz}</Body>
              <Muted numberOfLines={3}>{template.description_uz}</Muted>
              <Muted style={styles.duration}>{template.duration_days} kun</Muted>
              <Pressable
                accessibilityRole="button"
                disabled={startChallenge.isPending}
                onPress={() => void begin(template.id, template.title_uz)}
              >
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.challengeButton}
                >
                  <Body style={styles.challengeButtonLabel}>Boshlash</Body>
                </LinearGradient>
              </Pressable>
            </Card>
          ))}
        </View>
      </ScrollView>

      <AddGoalSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 30, fontWeight: '800', color: colors.gradientStart },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { marginTop: spacing.sm },
  gallery: { flexDirection: 'row', gap: spacing.md, paddingRight: spacing.lg },
  challenge: { width: 240, gap: spacing.sm },
  challengeTitle: { fontSize: 17, fontWeight: '800' },
  duration: { fontWeight: '700' },
  challengeButton: {
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  challengeButtonLabel: { color: '#FFFFFF', fontWeight: '800' },
});
