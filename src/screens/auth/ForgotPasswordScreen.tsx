import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { AuthHeader } from '../../components/layout/AuthHeader';
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
        showToast.success('Reset code sent');
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
            icon="lock"
            title="Forgot Password?"
            subtitle="No worries! Enter your registered mobile number and we'll send you a reset code."
          />

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
            title="Send Reset Code"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.sm }}
          />

          <View style={styles.footer}>
            <Text variant="bodySmall" weight="600" color={colors.textSecondary}>
              Remember your password?{' '}
            </Text>
            <Pressable onPress={() => navigation.goBack()} hitSlop={6}>
              <Text variant="bodySmall" weight="800" color={colors.primary}>
                Login
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingTop: spacing.lg },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
