import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { CartStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CartStackParamList, 'OrderSuccess'>;

export const OrderSuccessScreen: React.FC<Props> = ({ navigation }) => {
  const goHome = () => navigation.getParent()?.navigate('HomeTab', { screen: 'HomeMain' });
  const goOrders = () => navigation.getParent()?.navigate('OrdersTab', { screen: 'OrdersMain' });

  return (
    <Container>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Icon name="check-circle" size={72} color={colors.success} />
        </View>
        <Text variant="h3" align="center" color={colors.textPrimary}>
          Order Placed!
        </Text>
        <Text
          variant="body"
          color={colors.textSecondary}
          align="center"
          style={{ marginTop: spacing.sm, maxWidth: 320 }}
        >
          Thank you for shopping with Rythu Bidda. You'll receive an SMS confirmation shortly.
        </Text>
        <View style={styles.actions}>
          <Button title="View Orders" onPress={goOrders} variant="primary" fullWidth size="lg" />
          <Button
            title="Continue Shopping"
            onPress={goHome}
            variant="outline"
            fullWidth
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconWrap: { marginBottom: spacing.lg },
  actions: { alignSelf: 'stretch', marginTop: spacing['2xl'] },
});
