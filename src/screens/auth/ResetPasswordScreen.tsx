import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { resetPasswordSchema, ResetPasswordInput } from '../../utils/validation';
import { authService } from '../../api/services';
import { useAuthStore } from '../../store';
import { showToast } from '../../utils/toast';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [submitting, setSubmitting] = useState(false);
  const refreshProfile = useAuthStore(s => s.refreshProfile);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setSubmitting(true);
    try {
      await authService.resetPassword(data.newPassword);
      showToast.success('Password updated');
      await refreshProfile();
      // Token from OTP verification already set — dismiss the auth modal
      navigation.getParent()?.goBack();
    } catch (e: any) {
      showToast.error('Reset failed', e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <ScreenHeader title="New password" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text variant="h4">Create a new password</Text>
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.sub}>
            Choose a strong password you haven't used before.
          </Text>

          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                label="New password"
                placeholder="At least 8 characters"
                isPassword
                leftIcon="lock"
                value={value}
                onChangeText={onChange}
                error={errors.newPassword?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Confirm password"
                placeholder="Re-enter your password"
                isPassword
                leftIcon="lock"
                value={value}
                onChangeText={onChange}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Button
            title="Update password"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl },
  sub: { marginTop: spacing.xs, marginBottom: spacing.xl },
});
