import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { FormField } from '../../src/components/FormField';
import {
  Body,
  ErrorNote,
  GradientButton,
  Muted,
  Screen,
  Title,
} from '../../src/components/ui';
import { useAuth } from '../../src/hooks/useAuth';
import { apiErrorMessage } from '../../src/lib/api';
import { colors, spacing } from '../../src/theme';

const schema = z.object({
  username: z.string().min(1, 'Foydalanuvchi nomini kiriting'),
  password: z.string().min(1, 'Parolni kiriting'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signIn(values.username.trim(), values.password);
      router.replace('/');
    } catch (error) {
      setError('root', { message: apiErrorMessage(error, 'Kirish amalga oshmadi') });
    }
  });

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Title style={styles.brand}>Mizan</Title>
          <Muted>Hayotingizni muvozanatda saqlang</Muted>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField
                label="Foydalanuvchi nomi"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.username?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField
                label="Parol"
                secureTextEntry
                autoCapitalize="none"
                textContentType="password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
                onSubmitEditing={() => void onSubmit()}
              />
            )}
          />

          {errors.root?.message ? <ErrorNote message={errors.root.message} /> : null}

          <GradientButton
            label="Kirish"
            loading={isSubmitting}
            onPress={() => void onSubmit()}
          />

          <View style={styles.footer}>
            <Body>Hisobingiz yo‘qmi? </Body>
            <Link href="/(auth)/register" style={styles.link}>
              Ro‘yxatdan o‘tish
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.xxl },
  header: { alignItems: 'center', gap: spacing.sm },
  brand: { fontSize: 40, fontWeight: '800', color: colors.gradientStart },
  form: { gap: spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  link: { color: colors.gradientStart, fontWeight: '700', fontSize: 15 },
});
