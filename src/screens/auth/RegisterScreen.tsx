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
import Icon from 'react-native-vector-icons/Feather';
import {
  Button,
  Input,
  PasswordStrengthIndicator,
  Text,
} from '../../components/common';
import { Container } from '../../components/layout/Container';
import { AuthHeader } from '../../components/layout/AuthHeader';
import { signupSchema, SignupInput } from '../../utils/validation';
import { authService } from '../../api/services';
import { showToast } from '../../utils/toast';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [submitting, setSubmitting] = useState(false);
  const [agree, setAgree] = useState(false);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', password: '' },
  });

  const password = watch('password');

  const onSubmit = async (data: SignupInput) => {
    if (!agree) {
      showToast.error('Please accept the Terms & Conditions');
      return;
    }
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthHeader
            showBack
            title="Create Account"
            subtitle="Join Rythu Bidda for fresh produce at your doorstep."
          />

          <View style={styles.row}>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="First name"
                  placeholder="First name"
                  leftIcon="user"
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
              />
            )}
          />

          <PasswordStrengthIndicator password={password || ''} showChecklist />

          {/* Terms & Conditions checkbox */}
          <Pressable
            onPress={() => setAgree(a => !a)}
            style={styles.tcRow}
            hitSlop={6}
          >
            <View
              style={[
                styles.checkbox,
                agree && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              {agree ? <Icon name="check" size={14} color={colors.white} /> : null}
            </View>
            <Text
              variant="bodySmall"
              weight="600"
              color={colors.textSecondary}
              style={{ flex: 1, marginLeft: spacing.sm }}
            >
              I agree to the{' '}
              <Text
                variant="bodySmall"
                weight="800"
                color={colors.primary}
                onPress={() => navigation.getParent()?.navigate('Main', {
                  screen: 'ProfileTab',
                  params: { screen: 'Terms' },
                })}
              >
                Terms & Conditions
              </Text>{' '}
              and{' '}
              <Text
                variant="bodySmall"
                weight="800"
                color={colors.primary}
                onPress={() => navigation.getParent()?.navigate('Main', {
                  screen: 'ProfileTab',
                  params: { screen: 'Privacy' },
                })}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </Pressable>

          <Button
            title="Create Account"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            disabled={!agree}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.base }}
          />

          <View style={styles.footer}>
            <Text variant="bodySmall" weight="600" color={colors.textSecondary}>
              Already have an account?{' '}
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
  row: { flexDirection: 'row' },
  tcRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
