import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Button,
  Card,
  EmptyState,
  LoadingScreen,
  Text,
} from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { addressService } from '../../api/services';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { showToast } from '../../utils/toast';
import { toArray } from '../../utils/format';
import type { CustomerAddress } from '../../types';

export const AddressesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null);
  // Refreshing flag — keeps the existing list visible while a fresh fetch
  // runs in the background, instead of flashing the LoadingScreen every
  // time the user comes back from AddEditAddress.
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const raw = await addressService.list();
      setAddresses(toArray<CustomerAddress>(raw));
    } catch (e: any) {
      showToast.error('Could not load addresses', e?.message);
      setAddresses(prev => prev ?? []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Refresh every time the screen gains focus (after returning from
  // AddEditAddress, after deleting, etc.). Old list stays visible during
  // the fetch so the user doesn't see a loading flicker.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = (id: number) => {
    Alert.alert('Delete address?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await addressService.remove(id);
            showToast.success('Address deleted');
            load();
          } catch (e: any) {
            showToast.error('Delete failed', e?.message);
          }
        },
      },
    ]);
  };

  if (addresses === null) return <LoadingScreen />;

  return (
    <Container edges={['top']}>
      <ScreenHeader
        title="My Addresses"
        right={
          refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : undefined
        }
      />
      {addresses.length === 0 ? (
        <EmptyState
          icon="map-pin"
          title="No addresses saved"
          subtitle="Add a delivery address so you can check out in seconds."
          actionLabel="Add address"
          onAction={() => navigation.navigate('AddEditAddress')}
        />
      ) : (
        <>
          <FlatList
            data={addresses}
            keyExtractor={a => `a-${a.customerAddressId}`}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={load}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            renderItem={({ item }) => (
              <Card>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyBold">
                      {item.firstname} {item.lastname}
                    </Text>
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      {item.address1}
                      {item.address2 ? `, ${item.address2}` : ''}
                    </Text>
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      {item.city}, {item.state} - {item.postcode}
                    </Text>
                    <Text variant="caption" color={colors.textTertiary}>
                      {item.telephone}
                    </Text>
                  </View>
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() =>
                        navigation.navigate('AddEditAddress', {
                          addressId: item.customerAddressId,
                        })
                      }
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      <Icon name="edit-2" size={16} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(item.customerAddressId!)}
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      <Icon name="trash-2" size={16} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            )}
          />
          <View style={styles.addBar}>
            <Button
              title="Add new address"
              onPress={() => navigation.navigate('AddEditAddress')}
              fullWidth
              size="lg"
              variant="primary"
            />
          </View>
        </>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  list: { padding: spacing.base, paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  actions: { flexDirection: 'row' },
  iconBtn: { padding: spacing.xs, marginLeft: spacing.xs },
  addBar: {
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
