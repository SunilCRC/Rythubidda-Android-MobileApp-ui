import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Button, OTPInput, Text, type OTPInputHandle } from '../common';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { accountService } from '../../api/services';

interface Props {
  visible: boolean;
  phone: string;
  password: string;
  /** True when the account is mid-deletion rather than just deactivated. */
  pendingDeletion: boolean;
  onClose: () => void;
  /** Account is live again — the caller retries the sign-in. */
  onRestored: () => void;
}

/**
 * Offered when sign-in is refused because the customer closed their own
 * account.
 *
 * The password was already correct at this point — the account is simply
 * switched off. Sending them to "contact support" for something they did
 * on purpose and can undo with a code to their own phone would be the
 * wrong answer.
 */
export const ReactivateSheet: React.FC<Props> = ({
  visible,
  phone,
  password,
  pendingDeletion,
  onClose,
  onRestored,
}) => {
  const [step, setStep] = useState<'intro' | 'otp'>('intro');
  const [otp, setOtp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpRef = useRef<OTPInputHandle>(null);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await accountService.sendRecoveryOtp(phone, password, 'REACTIVATE');
      setMaskedPhone(res?.phone ?? '');
      setOtp('');
      setStep('otp');
    } catch (e: any) {
      setError(e?.message ?? 'Could not send the code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (code: string) => {
    setBusy(true);
    setError(null);
    try {
      await accountService.confirmRecovery(phone, code, 'REACTIVATE');
      onRestored();
    } catch (e: any) {
      setError(e?.message ?? 'Could not restore your account.');
      otpRef.current?.shake();
      otpRef.current?.clear();
      setOtp('');
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    if (busy) return;
    setStep('intro');
    setOtp('');
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.iconWell}>
              <Icon name="rotate-ccw" size={18} color={colors.primary} />
            </View>
            <Text variant="h5" color={colors.textPrimary} style={{ flex: 1, marginLeft: spacing.md }}>
              Welcome back
            </Text>
            <Pressable onPress={dismiss} hitSlop={12} disabled={busy}>
              <Icon name="x" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text variant="bodySmall" color={colors.error}>
                {error}
              </Text>
            </View>
          ) : null}

          {step === 'intro' ? (
            <>
              <Text variant="bodySmall" color={colors.textSecondary}>
                {pendingDeletion
                  ? "Your account is scheduled for deletion, but nothing has been removed yet. Verify your phone number and we'll cancel it and restore everything."
                  : "Your account is deactivated. Verify your phone number and we'll switch it back on — your orders and addresses are all still there."}
              </Text>
              <Button
                title="Send verification code"
                variant="primary"
                fullWidth
                loading={busy}
                onPress={sendCode}
                style={{ marginTop: spacing.lg }}
              />
            </>
          ) : (
            <>
              <Text variant="bodySmall" color={colors.textSecondary}>
                We sent a 6-digit code to {maskedPhone || 'your registered number'}.
              </Text>
              <OTPInput
                ref={otpRef}
                value={otp}
                onChange={setOtp}
                onComplete={confirm}
                autoFocus
                disabled={busy}
                error={!!error}
                style={{ marginTop: spacing.lg }}
              />
              <Button
                title="Restore my account"
                variant="primary"
                fullWidth
                loading={busy}
                disabled={otp.length !== 6}
                onPress={() => confirm(otp)}
                style={{ marginTop: spacing.lg }}
              />
              <Button
                title="Resend code"
                variant="ghost"
                fullWidth
                disabled={busy}
                onPress={sendCode}
                style={{ marginTop: spacing.xs }}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.base,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
});
