import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import { Card, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const AboutScreen: React.FC = () => (
  <Container edges={['top']}>
    <ScreenHeader title="About" />
    <ScrollView contentContainerStyle={{ padding: spacing.base }}>
      <View style={styles.header}>
        <FastImage
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode={FastImage.resizeMode.contain}
        />
        <Text variant="h3" color={colors.primaryDark} align="center">
          Rythu Bidda
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} align="center">
          Farm-fresh, farmer-first.
        </Text>
      </View>
      <Card>
        <Text variant="body" color={colors.textPrimary}>
          Rythu Bidda is a farmer-first marketplace that brings fresh, traceable produce straight to
          your doorstep. We work directly with local farmers across India to ensure fair prices,
          consistent quality, and shorter supply chains.
        </Text>
        <Text variant="body" color={colors.textPrimary} style={{ marginTop: spacing.base }}>
          From natural grains and pulses to pantry staples and wellness products — every item on
          Rythu Bidda is carefully curated to support sustainable agriculture and healthier kitchens.
        </Text>
      </Card>
    </ScrollView>
  </Container>
);

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 96, height: 96, marginBottom: spacing.sm },
});
