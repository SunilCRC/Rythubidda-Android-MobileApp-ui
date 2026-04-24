import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../../api/services';
import { Card, LoadingScreen, Text } from '../../components/common';
import { Container } from '../../components/layout/Container';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { colors } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';
import { toArray } from '../../utils/format';
import type { Category } from '../../types';

export const CategoriesListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['categories'],
    queryFn: catalogService.getCategories,
  });

  if (isLoading) return <LoadingScreen message="Loading categories..." />;

  const categories = toArray<Category>(data);

  return (
    <Container edges={['top']}>
      <ScreenHeader title="Shop by Category" showBack={false} />
      <FlatList
        data={categories}
        keyExtractor={(c, i) => `cat-${c.id ?? c.categoryId ?? i}`}
        contentContainerStyle={styles.list}
        refreshing={isFetching}
        onRefresh={refetch}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.base }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.base }} />}
        renderItem={({ item }) => <CategoryTile category={item} onPress={() => navigate(item)} />}
      />
    </Container>
  );

  function navigate(cat: Category) {
    navigation.navigate('Category', {
      categoryId: (cat.id || cat.categoryId)!,
      name: cat.name,
    });
  }
};

const CategoryTile: React.FC<{ category: Category; onPress: () => void }> = ({
  category,
  onPress,
}) => (
  <Card onPress={onPress} padded={false} style={styles.tile}>
    <View style={styles.tileIcon}>
      <Icon name="shopping-bag" size={28} color={colors.primary} />
    </View>
    <Text variant="bodyBold" color={colors.textPrimary} align="center" numberOfLines={2}>
      {category.name}
    </Text>
    {category.children?.length || category.subcategories?.length ? (
      <Text variant="caption" color={colors.textSecondary} align="center" style={{ marginTop: 2 }}>
        {(category.children?.length || category.subcategories?.length) ?? 0} items
      </Text>
    ) : null}
  </Card>
);

const styles = StyleSheet.create({
  list: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  tileIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.palette.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});
