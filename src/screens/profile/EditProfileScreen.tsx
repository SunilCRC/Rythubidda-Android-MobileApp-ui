import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { profileSchema, ProfileInput } from '../../utils/validation';
import { authService } from '../../api/services';
import { useAuthStore } from '../../store';
import { showToast } from '../../utils/toast';
import { spacing } from '../../theme/spacing';

export const EditProfileScreen: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const refreshProfile = useAuthStore(s => s.refreshProfile);
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstname || user?.firstName || '',
      lastName: user?.lastname || user?.lastName || '',
    },
  });

  const onSubmit = async (data: ProfileInput) => {
    setSubmitting(true);
    try {
      await authService.updateProfile(data);
      await refreshProfile();
      showToast.success('Profile updated');
    } catch (e: any) {
      showToast.error('Update failed', e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <ScreenHeader title="Edit Profile" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, value } }) => (
              <Input
                label="First name"
                value={value}
                onChangeText={onChange}
                error={errors.firstName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Last name"
                value={value}
                onChangeText={onChange}
                error={errors.lastName?.message}
              />
            )}
          />
          <Button
            title="Save changes"
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

const styles = StyleSheet.create({ scroll: { padding: spacing.xl } });
