import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Button, Card, OTPInput, Text, type OTPInputHandle } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  accountService,
  blockingOrdersFromError,
  type AccountEligibility,
  type BlockingOrder,
} from '../../api/services';
import { useAuthStore } from '../../store';
import { showToast } from '../../utils/toast';
import type { ProfileStackParamList } from '../../navigation/types';

type Step = 'review' | 'otp' | 'done';

/**
 * Deactivate or delete the signed-in account.
 *
 * One screen for both because the shape is identical — check for open
 * orders, confirm, verify by SMS — and only the wording and the finality
 * differ. `mode` picks which.
 *
 * Every guard here is a courtesy to the customer, not a security boundary:
 * the server re-checks eligibility and the OTP before it writes anything.
 */
export const CloseAccountScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ProfileStackParamList, 'CloseAccount'>>();
  const mode = route.params?.mode ?? 'DEACTIVATE';
  const isDelete = mode === 'DELETE';

  const logout = useAuthStore(s => s.logout);
  const otpRef = useRef<OTPInputHandle>(null);

  const [step, setStep] = useState<Step>('review');
  const [eligibility, setEligibility] = useState<AccountEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [blockingOrders, setBlockingOrders] = useState<BlockingOrder[]>([]);

  const loadEligibility = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await accountService.getEligibility();
      setEligibility(data);
      setBlockingOrders(data.blockingOrders ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Could not check your orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEligibility();
  }, [loadEligibility]);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await accountService.sendOtp(mode);
      setOtp('');
      setStep('otp');
    } catch (e: any) {
      const orders = blockingOrdersFromError(e);
      if (orders.length > 0) setBlockingOrders(orders);
      setError(e?.message ?? 'Could not send the code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (code: string) => {
    setBusy(true);
    setError(null);
    try {
      if (isDelete) {
        await accountService.requestDeletion(code);
      } else {
        await accountService.deactivate(code);
      }
      setStep('done');
    } catch (e: any) {
      const orders = blockingOrdersFromError(e);
      if (orders.length > 0) setBlockingOrders(orders);
      setError(e?.message ?? 'Could not complete the request.');
      otpRef.current?.shake();
      otpRef.current?.clear();
      setOtp('');
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    // The token is already dead server-side (is_active = 0), so staying
    // "signed in" locally would just produce 401s on the next tap.
    logout();
    showToast.success(
      isDelete ? 'Account scheduled for deletion' : 'Account deactivated',
    );
  };

  const graceDays = eligibility?.graceDays ?? 30;
  const blocked = eligibility ? !eligibility.canDelete : false;

  return (
    <Container>
      <ScreenHeader title={isDelete ? 'Delete Account' : 'Deactivate Account'} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
            <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
              Checking your orders…
            </Text>
          </View>
        ) : (
          <>
            {error ? (
              <Card style={styles.errorCard}>
                <Text variant="bodySmall" color={colors.error}>
                  {error}
                </Text>
              </Card>
            ) : null}

            {/* Naming the order matters: "you have an open order" with no
                order number leaves the customer with nothing to do. */}
            {blocked && blockingOrders.length > 0 ? (
              <Card style={styles.warnCard}>
                <View style={styles.warnHeader}>
                  <Icon name="truck" size={18} color={colors.warning} />
                  <Text
                    variant="body"
                    weight="700"
                    color={colors.textPrimary}
                    style={{ marginLeft: spacing.sm, flex: 1 }}
                  >
                    You have an order on the way
                  </Text>
                </View>
                {/* Summary, not a dump — 3 rows tell the story; 24 rows
                    just bury it. */}
                {blockingOrders.slice(0, 3).map(order => (
                  <Text
                    key={order.orderId}
                    variant="bodySmall"
                    color={colors.textSecondary}
                    style={{ marginTop: spacing.xs }}
                  >
                    Order #{order.orderId} — {order.statusLabel}
                  </Text>
                ))}
                {blockingOrders.length > 3 ? (
                  <Text
                    variant="bodySmall"
                    color={colors.textTertiary}
                    style={{ marginTop: spacing.xs }}
                  >
                    …and {blockingOrders.length - 3} more
                  </Text>
                ) : null}
                <Text
                  variant="bodySmall"
                  color={colors.textSecondary}
                  style={{ marginTop: spacing.md }}
                >
                  You can close your account once it's delivered. We need to
                  stay in touch with you until then.
                </Text>
              </Card>
            ) : null}

            {step === 'review' && !blocked ? (
              <>
                <Card>
                  <Text variant="h5" color={colors.textPrimary}>
                    {isDelete ? 'This removes your data' : 'Take a break'}
                  </Text>

                  {isDelete ? (
                    <>
                      <Text
                        variant="bodySmall"
                        color={colors.textSecondary}
                        style={{ marginTop: spacing.sm }}
                      >
                        After {graceDays} days we permanently remove your name,
                        phone number, email address and saved delivery
                        addresses. This can't be undone once it runs.
                      </Text>
                      {/* Said plainly rather than buried — people are
                          entitled to know what survives a deletion. */}
                      <Text
                        variant="bodySmall"
                        color={colors.textSecondary}
                        style={{ marginTop: spacing.sm }}
                      >
                        Invoices for orders you already placed are kept without
                        your personal details, because tax law requires it.
                      </Text>
                      <Text
                        variant="bodySmall"
                        color={colors.textSecondary}
                        style={{ marginTop: spacing.sm }}
                      >
                        Changed your mind? Sign in within {graceDays} days and
                        we'll restore everything.
                      </Text>
                    </>
                  ) : (
                    <Text
                      variant="bodySmall"
                      color={colors.textSecondary}
                      style={{ marginTop: spacing.sm }}
                    >
                      Your account is hidden and you're signed out everywhere.
                      Nothing is deleted — your orders and addresses stay
                      exactly as they are, and signing back in brings it all
                      back.
                    </Text>
                  )}
                </Card>

                <Card style={{ marginTop: spacing.base }}>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    We'll text a 6-digit code to{' '}
                    <Text variant="bodySmall" weight="700" color={colors.textPrimary}>
                      {eligibility?.phone || 'your registered number'}
                    </Text>{' '}
                    to confirm it's you.
                  </Text>
                </Card>

                <Button
                  title={isDelete ? 'Send code to delete' : 'Send code to deactivate'}
                  variant={isDelete ? 'danger' : 'primary'}
                  fullWidth
                  loading={busy}
                  onPress={sendCode}
                  style={{ marginTop: spacing.lg }}
                />
                <Button
                  title="Cancel"
                  variant="ghost"
                  fullWidth
                  onPress={() => navigation.goBack()}
                  style={{ marginTop: spacing.sm }}
                />
              </>
            ) : null}

            {step === 'otp' ? (
              <>
                <Card>
                  <Text variant="h5" color={colors.textPrimary}>
                    Enter the code
                  </Text>
                  <Text
                    variant="bodySmall"
                    color={colors.textSecondary}
                    style={{ marginTop: spacing.xs }}
                  >
                    Sent to {eligibility?.phone || 'your registered number'}. It
                    expires in 10 minutes.
                  </Text>
                  <OTPInput
                    ref={otpRef}
                    value={otp}
                    onChange={setOtp}
                    onComplete={submit}
                    autoFocus
                    disabled={busy}
                    error={!!error}
                    style={{ marginTop: spacing.lg }}
                  />
                </Card>

                <Button
                  title={isDelete ? 'Delete my account' : 'Deactivate my account'}
                  variant={isDelete ? 'danger' : 'primary'}
                  fullWidth
                  loading={busy}
                  disabled={otp.length !== 6}
                  onPress={() => submit(otp)}
                  style={{ marginTop: spacing.lg }}
                />
                <Button
                  title="Resend code"
                  variant="ghost"
                  fullWidth
                  disabled={busy}
                  onPress={sendCode}
                  style={{ marginTop: spacing.sm }}
                />
              </>
            ) : null}

            {step === 'done' ? (
              <Card>
                <View style={styles.doneIcon}>
                  <Icon name="check" size={28} color={colors.success} />
                </View>
                <Text variant="h5" color={colors.textPrimary} align="center">
                  {isDelete ? 'Deletion scheduled' : 'Account deactivated'}
                </Text>
                <Text
                  variant="bodySmall"
                  color={colors.textSecondary}
                  align="center"
                  style={{ marginTop: spacing.sm }}
                >
                  {isDelete
                    ? `Your data will be permanently removed in ${graceDays} days. Sign in before then if you change your mind.`
                    : 'Sign in any time with your phone number to switch it back on.'}
                </Text>
                <Button
                  title="Done"
                  variant="primary"
                  fullWidth
                  onPress={finish}
                  style={{ marginTop: spacing.lg }}
                />
              </Card>
            ) : null}

            {blocked && step === 'review' ? (
              <Button
                title="Go back"
                variant="outline"
                fullWidth
                onPress={() => navigation.goBack()}
                style={{ marginTop: spacing.lg }}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'] },
  centered: { paddingVertical: spacing['3xl'], alignItems: 'center' },
  errorCard: {
    marginBottom: spacing.base,
    backgroundColor: colors.errorSoft,
  },
  warnCard: {
    marginBottom: spacing.base,
    backgroundColor: colors.warningSoft,
  },
  warnHeader: { flexDirection: 'row', alignItems: 'center' },
  doneIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.base,
  },
});
