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

const schema = z
  .object({
    firstName: z.string().max(150).optional(),
    username: z
      .string()
      .min(3, 'Kamida 3 ta belgi')
      .max(150)
      .regex(/^[\w.@+-]+$/, 'Faqat harf, raqam va . @ + - _ belgilari'),
    password: z.string().min(8, 'Kamida 8 ta belgi'),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'Parollar mos kelmadi',
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', username: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signUp(values.username.trim(), values.password, values.firstName?.trim());
      router.replace('/');
    } catch (error) {
      setError('root', {
        message: apiErrorMessage(error, 'Ro‘yxatdan o‘tish amalga oshmadi'),
      });
    }
  });

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Title style={styles.brand}>Hisob yaratish</Title>
          <Muted>Bir daqiqada boshlang</Muted>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField
                label="Ismingiz (ixtiyoriy)"
                value={value ?? ''}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.firstName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField
                label="Foydalanuvchi nomi"
                autoCapitalize="none"
                autoCorrect={false}
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
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="confirm"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField
                label="Parolni tasdiqlang"
                secureTextEntry
                autoCapitalize="none"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.confirm?.message}
              />
            )}
          />

          {errors.root?.message ? <ErrorNote message={errors.root.message} /> : null}

          <GradientButton
            label="Davom etish"
            loading={isSubmitting}
            onPress={() => void onSubmit()}
          />

          <View style={styles.footer}>
            <Body>Hisobingiz bormi? </Body>
            <Link href="/(auth)/login" style={styles.link}>
              Kirish
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm },
  brand: { color: colors.gradientStart },
  form: { gap: spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  link: { color: colors.gradientStart, fontWeight: '700', fontSize: 15 },
});
