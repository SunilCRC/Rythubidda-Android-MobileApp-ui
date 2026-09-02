import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import FastImage from 'react-native-fast-image';
import { Button, Input, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { loginSchema, LoginInput } from '../../utils/validation';
import { useAuthStore } from '../../store';
import { errorCodeFrom } from '../../api/services';
import { ReactivateSheet } from '../../components/account/ReactivateSheet';
import { showToast } from '../../utils/toast';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [submitting, setSubmitting] = useState(false);
  const [reactivateFor, setReactivateFor] = useState<{
    phone: string;
    password: string;
    pendingDeletion: boolean;
  } | null>(null);
  const login = useAuthStore(s => s.login);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    setSubmitting(true);
    try {
      await login(data.phone, data.password);
      showToast.success('Welcome back!');
      navigation.getParent()?.goBack();
    } catch (e: any) {
      // The password was right — the account is just switched off, and the
      // customer switched it off themselves. Offer the way back rather than
      // a dead-end "login failed".
      const code = errorCodeFrom(e);
      if (code === 'ACCOUNT_DEACTIVATED' || code === 'ACCOUNT_PENDING_DELETION') {
        setReactivateFor({
          phone: data.phone,
          password: data.password,
          pendingDeletion: code === 'ACCOUNT_PENDING_DELETION',
        });
        return;
      }
      showToast.error('Login failed', e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  const retryAfterRestore = async () => {
    const creds = reactivateFor;
    setReactivateFor(null);
    if (!creds) return;
    try {
      // The account is live again but this device still has no token — the
      // earlier sign-in was rejected before one was issued.
      await login(creds.phone, creds.password);
      showToast.success('Your account is active again. Welcome back!');
      navigation.getParent()?.goBack();
    } catch {
      showToast.success('Your account is active again — please sign in.');
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
          {/* Brand halo */}
          <View style={styles.brand}>
            <View style={styles.halo}>
              <FastImage
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode={FastImage.resizeMode.contain}
              />
            </View>
            <Text
              variant="h3"
              weight="800"
              color={colors.primaryDark}
              align="center"
              style={{ marginTop: spacing.base, letterSpacing: 1 }}
            >
              RYTHU BIDDA
            </Text>
            <Text
              variant="bodySmall"
              weight="600"
              color={colors.textSecondary}
              align="center"
              style={{ marginTop: 2 }}
            >
              Farm-fresh essentials, delivered.
            </Text>
          </View>

          {/* Heading */}
          <Text variant="h2" weight="800" color={colors.textPrimary}>
            Welcome Back 👋
          </Text>
          <Text
            variant="body"
            weight="600"
            color={colors.textSecondary}
            style={{ marginTop: 6, marginBottom: spacing.lg }}
          >
            Login to continue shopping fresh farm produce.
          </Text>

          {/* Form */}
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Mobile number"
                placeholder="10-digit mobile number"
                keyboardType="phone-pad"
                maxLength={10}
                leftIcon="phone"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.phone?.message}
                autoCapitalize="none"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Your password"
                isPassword
                leftIcon="lock"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />

          <Pressable
            onPress={() => navigation.navigate('ForgotPassword')}
            hitSlop={6}
            style={styles.forgot}
          >
            <Text variant="bodySmall" weight="700" color={colors.primary}>
              Forgot Password?
            </Text>
          </Pressable>

          <Button
            title="Login"
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.base }}
          />

          <View style={styles.footer}>
            <Text variant="bodySmall" weight="600" color={colors.textSecondary}>
              Don't have an account?{' '}
            </Text>
            <Pressable onPress={() => navigation.navigate('Register')} hitSlop={6}>
              <Text variant="bodySmall" weight="800" color={colors.primary}>
                Sign Up
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ReactivateSheet
        visible={reactivateFor !== null}
        phone={reactivateFor?.phone ?? ''}
        password={reactivateFor?.password ?? ''}
        pendingDeletion={reactivateFor?.pendingDeletion ?? false}
        onClose={() => setReactivateFor(null)}
        onRestored={retryAfterRestore}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing['2xl'] },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  halo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.tintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 84, height: 84 },
  forgot: { alignSelf: 'flex-end', marginTop: -spacing.xs, marginBottom: spacing.xs },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
