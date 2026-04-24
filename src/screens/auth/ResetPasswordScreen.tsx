import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  Input,
  PasswordStrengthIndicator,
} from '../../components/common';
import { Container } from '../../components/layout/Container';
import { AuthHeader } from '../../components/layout/AuthHeader';
import { resetPasswordSchema, ResetPasswordInput } from '../../utils/validation';
import { authService } from '../../api/services';
import { useAuthStore } from '../../store';
import { showToast } from '../../utils/toast';
import { spacing } from '../../theme/spacing';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [submitting, setSubmitting] = useState(false);
  const refreshProfile = useAuthStore(s => s.refreshProfile);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const newPassword = watch('newPassword');

  const onSubmit = async (data: ResetPasswordInput) => {
    setSubmitting(true);
    try {
      await authService.resetPassword(data.newPassword);
      await refreshProfile();
      showToast.success('Password Reset Successfully!', 'You are now signed in.');
      // Brief pause so user sees the toast before dismissing the modal
      setTimeout(() => navigation.getParent()?.goBack(), 400);
    } catch (e: any) {
      showToast.error('Reset failed', e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <AuthHeader
            showBack
            icon="shield"
            title="Reset Password"
            subtitle="Create a strong new password for your account."
          />

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

          <PasswordStrengthIndicator password={newPassword || ''} showChecklist />

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
            title="Reset Password"
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
  scroll: { padding: spacing.xl, paddingTop: spacing.lg },
});
