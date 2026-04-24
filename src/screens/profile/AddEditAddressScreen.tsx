import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, LoadingScreen } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { addressService } from '../../api/services';
import { useAuthStore } from '../../store';
import { addressSchema, AddressInput } from '../../utils/validation';
import { showToast } from '../../utils/toast';
import { spacing } from '../../theme/spacing';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'AddEditAddress'>;

export const AddEditAddressScreen: React.FC<Props> = ({ route, navigation }) => {
  const addressId = route.params?.addressId;
  const isEdit = !!addressId;
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      firstname: user?.firstname || user?.firstName || '',
      lastname: user?.lastname || user?.lastName || '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      postcode: '',
      telephone: user?.phone || '',
      email: user?.email || '',
    },
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const list = await addressService.list();
        const found = list.find(a => a.customerAddressId === addressId);
        if (found) {
          reset({
            firstname: found.firstname || '',
            lastname: found.lastname || '',
            address1: found.address1,
            address2: found.address2 || '',
            city: found.city,
            state: found.state,
            postcode: found.postcode,
            telephone: found.telephone,
            email: found.email || '',
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, addressId, reset]);

  const onSubmit = async (data: AddressInput) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await addressService.update({ ...data, customerAddressId: addressId });
      } else {
        await addressService.save(data);
      }
      showToast.success(isEdit ? 'Address updated' : 'Address saved');
      navigation.goBack();
    } catch (e: any) {
      showToast.error('Save failed', e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <Container>
      <ScreenHeader title={isEdit ? 'Edit address' : 'Add address'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.row}>
            <Controller
              control={control}
              name="firstname"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="First name"
                  value={value}
                  onChangeText={onChange}
                  error={errors.firstname?.message}
                  containerStyle={{ flex: 1 }}
                />
              )}
            />
            <View style={{ width: spacing.md }} />
            <Controller
              control={control}
              name="lastname"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Last name"
                  value={value}
                  onChangeText={onChange}
                  error={errors.lastname?.message}
                  containerStyle={{ flex: 1 }}
                />
              )}
            />
          </View>
          <Controller
            control={control}
            name="address1"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Address line 1"
                placeholder="House no, street"
                value={value}
                onChangeText={onChange}
                error={errors.address1?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="address2"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Address line 2 (optional)"
                placeholder="Landmark, area"
                value={value}
                onChangeText={onChange}
                error={errors.address2?.message}
              />
            )}
          />
          <View style={styles.row}>
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="City"
                  value={value}
                  onChangeText={onChange}
                  error={errors.city?.message}
                  containerStyle={{ flex: 1 }}
                />
              )}
            />
            <View style={{ width: spacing.md }} />
            <Controller
              control={control}
              name="state"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="State"
                  value={value}
                  onChangeText={onChange}
                  error={errors.state?.message}
                  containerStyle={{ flex: 1 }}
                />
              )}
            />
          </View>
          <View style={styles.row}>
            <Controller
              control={control}
              name="postcode"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Pincode"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={value}
                  onChangeText={onChange}
                  error={errors.postcode?.message}
                  containerStyle={{ flex: 1 }}
                />
              )}
            />
            <View style={{ width: spacing.md }} />
            <Controller
              control={control}
              name="telephone"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Phone"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={value}
                  onChangeText={onChange}
                  error={errors.telephone?.message}
                  containerStyle={{ flex: 1 }}
                />
              )}
            />
          </View>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Email (optional)"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                error={errors.email?.message}
              />
            )}
          />
          <Button
            title={isEdit ? 'Update address' : 'Save address'}
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

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl },
  row: { flexDirection: 'row' },
});
