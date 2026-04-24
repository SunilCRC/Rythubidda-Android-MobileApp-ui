import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { forgotPasswordSchema, ForgotPasswordInput } from '../../utils/validation';
import { authService } from '../../api/services';
import { showToast } from '../../utils/toast';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { phone: '' },
  });

  const onSubmit = async ({ phone }: ForgotPasswordInput) => {
    setSubmitting(true);
    try {
      const result = await authService.forgotPassword(phone);
      if (result.customerId) {
        showToast.success('OTP sent');
        navigation.navigate('OTP', {
          customerId: result.customerId,
          phone,
          flow: 'forgot',
        });
      } else {
        throw new Error('Could not initiate password reset');
      }
    } catch (e: any) {
      showToast.error('Reset failed', e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <ScreenHeader title="Forgot password" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text variant="h4">Reset your password</Text>
          <Text variant="bodySmall" color={colors.textSecondary} style={styles.sub}>
            Enter your mobile number. We'll send you an OTP to reset your password.
          </Text>

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Mobile number"
                placeholder="10-digit mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                leftIcon="phone"
                value={value}
                onChangeText={onChange}
                error={errors.phone?.message}
              />
            )}
          />

          <Button
            title="Send OTP"
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
