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
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { signupSchema, SignupInput } from '../../utils/validation';
import { authService } from '../../api/services';
import { showToast } from '../../utils/toast';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', password: '' },
  });

  const onSubmit = async (data: SignupInput) => {
    setSubmitting(true);
    try {
      const result = await authService.signup(data);
      if (result.customerId) {
        showToast.success('OTP sent to your mobile');
        navigation.navigate('OTP', {
          customerId: result.customerId,
          phone: data.phone,
          flow: 'signup',
        });
      } else {
        throw new Error('Signup failed');
      }
    } catch (e: any) {
      showToast.error('Could not create account', e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <ScreenHeader title="Create account" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text variant="h4">Join Rythu Bidda</Text>
          <Text
            variant="bodySmall"
            color={colors.textSecondary}
            style={{ marginBottom: spacing.lg }}
          >
            We'll send a 6-digit OTP to verify your mobile number.
          </Text>

          <View style={styles.row}>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="First name"
                  placeholder="First name"
                  value={value}
                  onChangeText={onChange}
                  error={errors.firstName?.message}
                  containerStyle={{ flex: 1 }}
                />
              )}
            />
            <View style={{ width: spacing.md }} />
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Last name"
                  placeholder="Last name"
                  value={value}
                  onChangeText={onChange}
                  error={errors.lastName?.message}
                  containerStyle={{ flex: 1 }}
                />
              )}
            />
          </View>

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
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Password"
                placeholder="At least 8 characters"
                isPassword
                leftIcon="lock"
                value={value}
                onChangeText={onChange}
                error={errors.password?.message}
                helper="Include uppercase, lowercase, number & special character."
              />
            )}
          />

          <Button
            title="Send OTP"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.base }}
          />

          <View style={styles.footer}>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => navigation.goBack()} hitSlop={6}>
              <Text variant="bodySmall" color={colors.primary} weight="700">
                Sign in
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingTop: spacing.base },
  row: { flexDirection: 'row' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
