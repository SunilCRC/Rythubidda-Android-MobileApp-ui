import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { catalogService } from '../../api/services';
import { EmptyState, Skeleton, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { ProductCard } from '../../components/ProductCard';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { toArray } from '../../utils/format';
import { hasProductImage } from '../../utils/image';
import type { HomeStackParamList } from '../../navigation/types';
import type { Product } from '../../types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Category'>;

export const CategoryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { categoryId, name } = route.params;
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['productsByCategory', categoryId],
    queryFn: () => catalogService.getProductsByCategory(categoryId),
  });

  const products = toArray<Product>(data).filter(hasProductImage);

  return (
    <Container edges={['top']}>
      <ScreenHeader title={name} />
      {isLoading ? (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              height={220}
              width="48%"
              style={{ marginBottom: spacing.base, borderRadius: radius.lg }}
            />
          ))}
        </View>
      ) : products.length === 0 ? (
        <EmptyState
          icon="package"
          title="No products yet"
          subtitle="This category is empty. Check back soon!"
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p, i) => `p-${p.id ?? p.productId ?? i}`}
          numColumns={2}
          refreshing={isFetching}
          onRefresh={refetch}
          contentContainerStyle={styles.list}
          columnWrapperStyle={{ gap: spacing.base }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.base }} />}
          ListHeaderComponent={
            <Text variant="bodySmall" color={colors.textSecondary} style={styles.count}>
              {products.length} products
            </Text>
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <ProductCard
                product={item}
                onPress={() =>
                  navigation.navigate('ProductDetail', {
                    productId: (item.id || item.productId)!,
                  })
                }
              />
            </View>
          )}
        />
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  list: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  count: { marginBottom: spacing.sm },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: spacing.base,
  },
});
