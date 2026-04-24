import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { authService } from '../../api/services';
import { useAuthStore } from '../../store';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { fonts } from '../../theme/typography';
import { APP_CONFIG } from '../../constants/config';
import { showToast } from '../../utils/toast';
import { formatPhone } from '../../utils/format';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;

const OTP_LEN = APP_CONFIG.OTP_LENGTH;

export const OTPScreen: React.FC<Props> = ({ navigation, route }) => {
  const { customerId, phone, flow } = route.params;
  const [digits, setDigits] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(APP_CONFIG.OTP_RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef<Array<TextInput | null>>([]);
  const verifyOtp = useAuthStore(s => s.verifyOtp);
  const verifyForgot = useAuthStore(s => s.verifyForgotPasswordOtp);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleChange = (idx: number, val: string) => {
    const sanitised = val.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[idx] = sanitised;
    setDigits(next);
    if (sanitised && idx < OTP_LEN - 1) inputsRef.current[idx + 1]?.focus();
    if (!sanitised && idx > 0) inputsRef.current[idx - 1]?.focus();
  };

  const handleSubmit = async () => {
    const otp = digits.join('');
    if (otp.length !== OTP_LEN) {
      showToast.error(`Enter the ${OTP_LEN}-digit OTP`);
      return;
    }
    setSubmitting(true);
    try {
      if (flow === 'signup') {
        await verifyOtp(customerId, otp);
        showToast.success('Account verified');
        // Dismiss auth modal — user is now logged in
        navigation.getParent()?.goBack();
      } else {
        await verifyForgot(customerId, otp);
        showToast.success('OTP verified');
        navigation.replace('ResetPassword', { customerId });
      }
    } catch (e: any) {
      showToast.error('Invalid OTP', e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      if (flow === 'signup') {
        await authService.resendOtp(customerId, phone);
      } else {
        await authService.forgotPassword(phone);
      }
      setResendTimer(APP_CONFIG.OTP_RESEND_SECONDS);
      setDigits(Array(OTP_LEN).fill(''));
      inputsRef.current[0]?.focus();
      showToast.success('OTP sent');
    } catch (e: any) {
      showToast.error('Could not resend OTP', e?.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Container>
      <ScreenHeader title="Verify OTP" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <Text variant="h4">Enter the {OTP_LEN}-digit code</Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.sub}>
          We sent an OTP to {formatPhone(phone)}
        </Text>

        <View style={styles.boxes}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={r => {
                inputsRef.current[i] = r;
              }}
              value={d}
              onChangeText={v => handleChange(i, v)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && !digits[i] && i > 0) {
                  inputsRef.current[i - 1]?.focus();
                }
              }}
              keyboardType="number-pad"
              maxLength={1}
              style={styles.box}
              selectionColor={colors.primary}
              autoFocus={i === 0}
            />
          ))}
        </View>

        <Button
          title="Verify"
          onPress={handleSubmit}
          loading={submitting}
          fullWidth
          size="lg"
          style={{ marginTop: spacing.xl }}
        />

        <View style={styles.resend}>
          <Text variant="bodySmall" color={colors.textSecondary}>
            Didn't get it?{' '}
          </Text>
          {resendTimer > 0 ? (
            <Text variant="bodySmall" color={colors.textTertiary}>
              Resend in {resendTimer}s
            </Text>
          ) : (
            <Pressable onPress={handleResend} disabled={resending} hitSlop={6}>
              <Text variant="bodySmall" color={colors.primary} weight="700">
                {resending ? 'Sending...' : 'Resend OTP'}
              </Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: { flex: 1, padding: spacing.xl },
  sub: { marginTop: spacing.xs, marginBottom: spacing.xl },
  boxes: { flexDirection: 'row', justifyContent: 'space-between' },
  box: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.base,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  resend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
});
