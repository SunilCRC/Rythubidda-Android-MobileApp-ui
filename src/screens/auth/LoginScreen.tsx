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
import { showToast } from '../../utils/toast';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore(s => s.login);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    setSubmitting(true);
    try {
      await login(data.phone, data.password);
      showToast.success('Welcome back!');
      // Dismiss the auth modal and return to whatever screen requested auth
      navigation.getParent()?.goBack();
    } catch (e: any) {
      showToast.error('Login failed', e?.message);
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
          <View style={styles.brand}>
            <FastImage
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode={FastImage.resizeMode.contain}
            />
            <Text variant="h3" color={colors.primaryDark} align="center">
              RYTHU BIDDA
            </Text>
            <Text
              variant="bodySmall"
              color={colors.textSecondary}
              align="center"
              style={{ marginTop: spacing.xs }}
            >
              Farm-fresh essentials, delivered.
            </Text>
          </View>

          <View style={styles.form}>
            <Text variant="h4" color={colors.textPrimary}>
              Sign in
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.lg }}>
              Welcome back. Login with your mobile number and password.
            </Text>

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
              <Text variant="bodySmall" color={colors.primary} weight="600">
                Forgot password?
              </Text>
            </Pressable>

            <Button
              title="Sign in"
              onPress={handleSubmit(onSubmit)}
              loading={submitting}
              fullWidth
              size="lg"
              style={{ marginTop: spacing.base }}
            />

            <View style={styles.footer}>
              <Text variant="bodySmall" color={colors.textSecondary}>
                New here?{' '}
              </Text>
              <Pressable onPress={() => navigation.navigate('Register')} hitSlop={6}>
                <Text variant="bodySmall" color={colors.primary} weight="700">
                  Create an account
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing['3xl'] },
  brand: { alignItems: 'center', marginBottom: spacing['2xl'] },
  logo: { width: 90, height: 90, marginBottom: spacing.sm },
  form: {},
  forgot: { alignSelf: 'flex-end', marginTop: -spacing.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
