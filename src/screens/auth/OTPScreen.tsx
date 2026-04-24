import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  OTPInput,
  OTPInputHandle,
  Text,
} from '../../components/common';
import { Container } from '../../components/layout/Container';
import { AuthHeader } from '../../components/layout/AuthHeader';
import { authService } from '../../api/services';
import { useAuthStore } from '../../store';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { APP_CONFIG } from '../../constants/config';
import { showToast } from '../../utils/toast';
import { formatPhone } from '../../utils/format';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;

const OTP_LEN = APP_CONFIG.OTP_LENGTH;

function formatMmSs(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const OTPScreen: React.FC<Props> = ({ navigation, route }) => {
  const { customerId, phone, flow } = route.params;
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(APP_CONFIG.OTP_RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const otpRef = useRef<OTPInputHandle>(null);
  const verifyOtp = useAuthStore(s => s.verifyOtp);
  const verifyForgot = useAuthStore(s => s.verifyForgotPasswordOtp);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleVerify = useCallback(
    async (code: string) => {
      if (code.length !== OTP_LEN || submitting) return;
      setSubmitting(true);
      setOtpError(false);
      try {
        if (flow === 'signup') {
          await verifyOtp(customerId, code);
          showToast.success('Account verified');
          navigation.getParent()?.goBack();
        } else {
          await verifyForgot(customerId, code);
          showToast.success('OTP verified');
          navigation.replace('ResetPassword', { customerId });
        }
      } catch (e: any) {
        setOtpError(true);
        otpRef.current?.shake();
        otpRef.current?.clear();
        showToast.error('Invalid OTP', e?.message ?? 'Please try again');
      } finally {
        setSubmitting(false);
      }
    },
    [customerId, flow, navigation, submitting, verifyForgot, verifyOtp],
  );

  const handleManualSubmit = () => {
    if (otp.length !== OTP_LEN) {
      setOtpError(true);
      otpRef.current?.shake();
      showToast.error(`Enter the ${OTP_LEN}-digit OTP`);
      return;
    }
    handleVerify(otp);
  };

  const handleResend = async () => {
    setResending(true);
    setOtpError(false);
    try {
      if (flow === 'signup') {
        await authService.resendOtp(customerId, phone);
      } else {
        await authService.forgotPassword(phone);
      }
      setResendTimer(APP_CONFIG.OTP_RESEND_SECONDS);
      otpRef.current?.clear();
      showToast.success('OTP sent');
    } catch (e: any) {
      showToast.error('Could not resend OTP', e?.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <AuthHeader
          showBack
          title="Verify Your Number"
          subtitle={
            <Text variant="bodySmall" weight="600" color={colors.textSecondary}>
              Enter the {OTP_LEN}-digit code sent to{' '}
              <Text variant="bodySmall" weight="800" color={colors.primary}>
                {formatPhone(phone)}
              </Text>
            </Text>
          }
        />

        <OTPInput
          ref={otpRef}
          length={OTP_LEN}
          value={otp}
          onChange={val => {
            setOtp(val);
            if (otpError) setOtpError(false);
          }}
          onComplete={handleVerify}
          error={otpError}
          autoFocus
        />

        <Button
          title={submitting ? 'Verifying...' : 'Verify'}
          onPress={handleManualSubmit}
          loading={submitting}
          disabled={otp.length !== OTP_LEN}
          fullWidth
          size="lg"
          style={{ marginTop: spacing.xl }}
        />

        <View style={styles.resend}>
          <Text variant="bodySmall" weight="600" color={colors.textSecondary}>
            Didn't receive the code?{' '}
          </Text>
          {resendTimer > 0 ? (
            <Text variant="bodySmall" weight="700" color={colors.textSecondary}>
              Resend in {formatMmSs(resendTimer)}
            </Text>
          ) : (
            <Pressable onPress={handleResend} disabled={resending} hitSlop={6}>
              <Text variant="bodySmall" weight="800" color={colors.primary}>
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
  resend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});
