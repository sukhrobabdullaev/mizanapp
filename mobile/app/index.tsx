import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useProfile } from '../src/hooks/queries';
import { useAuth } from '../src/hooks/useAuth';
import { colors } from '../src/theme';

/** Entry gate: signed out -> auth, first run -> onboarding, otherwise tabs. */
export default function Index() {
  const { isReady, isSignedIn } = useAuth();
  const profile = useProfile();

  if (!isReady) return <Splash />;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  if (profile.isPending) return <Splash />;
  if (profile.data && !profile.data.onboarded_at) {
    return <Redirect href="/(onboarding)/value" />;
  }
  return <Redirect href="/(tabs)/bugun" />;
}

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator color={colors.gradientStart} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
