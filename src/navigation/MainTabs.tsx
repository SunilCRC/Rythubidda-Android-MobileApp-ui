import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { Text } from '../components/common/Text';
import { useCartItemCount } from '../store';
import type {
  CartStackParamList,
  CategoriesStackParamList,
  HomeStackParamList,
  MainTabParamList,
  OrdersStackParamList,
  ProfileStackParamList,
} from './types';

// Screens
import { HomeScreen } from '../screens/home/HomeScreen';
import { CategoryScreen } from '../screens/catalog/CategoryScreen';
import { ProductDetailScreen } from '../screens/catalog/ProductDetailScreen';
import { SearchScreen } from '../screens/catalog/SearchScreen';
import { CategoriesListScreen } from '../screens/catalog/CategoriesListScreen';
import { CartScreen } from '../screens/cart/CartScreen';
import { CheckoutScreen } from '../screens/cart/CheckoutScreen';
import { AddressesScreen } from '../screens/profile/AddressesScreen';
import { AddEditAddressScreen } from '../screens/profile/AddEditAddressScreen';
import { OrderSuccessScreen } from '../screens/cart/OrderSuccessScreen';
import { OrdersScreen } from '../screens/orders/OrdersScreen';
import { OrderDetailScreen } from '../screens/orders/OrderDetailScreen';
import { InvoiceScreen } from '../screens/orders/InvoiceScreen';
import { WriteReviewScreen } from '../screens/orders/WriteReviewScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen';
import { AboutScreen } from '../screens/static/AboutScreen';
import { ContactScreen } from '../screens/static/ContactScreen';
import { TermsScreen } from '../screens/static/TermsScreen';
import { PrivacyScreen } from '../screens/static/PrivacyScreen';
import { RefundPolicyScreen } from '../screens/static/RefundPolicyScreen';
import { ShippingPolicyScreen } from '../screens/static/ShippingPolicyScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const HomeNav = createNativeStackNavigator<HomeStackParamList>();
const CategoriesNav = createNativeStackNavigator<CategoriesStackParamList>();
const CartNav = createNativeStackNavigator<CartStackParamList>();
const OrdersNav = createNativeStackNavigator<OrdersStackParamList>();
const ProfileNav = createNativeStackNavigator<ProfileStackParamList>();

const stackOptions = { headerShown: false, contentStyle: { backgroundColor: colors.background } };

const HomeStackScreen = () => (
  <HomeNav.Navigator screenOptions={stackOptions}>
    <HomeNav.Screen name="HomeMain" component={HomeScreen} />
    <HomeNav.Screen name="Category" component={CategoryScreen} />
    <HomeNav.Screen name="ProductDetail" component={ProductDetailScreen} />
    <HomeNav.Screen name="Search" component={SearchScreen} />
  </HomeNav.Navigator>
);

const CategoriesStackScreen = () => (
  <CategoriesNav.Navigator screenOptions={stackOptions}>
    <CategoriesNav.Screen name="CategoriesMain" component={CategoriesListScreen} />
    <CategoriesNav.Screen name="Category" component={CategoryScreen} />
    <CategoriesNav.Screen name="ProductDetail" component={ProductDetailScreen} />
    <CategoriesNav.Screen name="Search" component={SearchScreen} />
  </CategoriesNav.Navigator>
);

const CartStackScreen = () => (
  <CartNav.Navigator screenOptions={stackOptions}>
    <CartNav.Screen name="CartMain" component={CartScreen} />
    <CartNav.Screen name="Checkout" component={CheckoutScreen} />
    <CartNav.Screen name="Addresses" component={AddressesScreen} />
    <CartNav.Screen name="AddEditAddress" component={AddEditAddressScreen} />
    <CartNav.Screen name="OrderSuccess" component={OrderSuccessScreen} />
    <CartNav.Screen name="ProductDetail" component={ProductDetailScreen} />
  </CartNav.Navigator>
);

const OrdersStackScreen = () => (
  <OrdersNav.Navigator screenOptions={stackOptions}>
    <OrdersNav.Screen name="OrdersMain" component={OrdersScreen} />
    <OrdersNav.Screen name="OrderDetail" component={OrderDetailScreen} />
    <OrdersNav.Screen name="Invoice" component={InvoiceScreen} />
    <OrdersNav.Screen name="WriteReview" component={WriteReviewScreen} />
  </OrdersNav.Navigator>
);

const ProfileStackScreen = () => (
  <ProfileNav.Navigator screenOptions={stackOptions}>
    <ProfileNav.Screen name="ProfileMain" component={ProfileScreen} />
    <ProfileNav.Screen name="EditProfile" component={EditProfileScreen} />
    <ProfileNav.Screen name="ChangePassword" component={ChangePasswordScreen} />
    <ProfileNav.Screen name="Addresses" component={AddressesScreen} />
    <ProfileNav.Screen name="AddEditAddress" component={AddEditAddressScreen} />
    <ProfileNav.Screen name="About" component={AboutScreen} />
    <ProfileNav.Screen name="Contact" component={ContactScreen} />
    <ProfileNav.Screen name="Terms" component={TermsScreen} />
    <ProfileNav.Screen name="Privacy" component={PrivacyScreen} />
    <ProfileNav.Screen name="RefundPolicy" component={RefundPolicyScreen} />
    <ProfileNav.Screen name="ShippingPolicy" component={ShippingPolicyScreen} />
  </ProfileNav.Navigator>
);

/**
 * Tab icon with a scale+color animation when it becomes focused.
 */
const AnimatedTabIcon: React.FC<{
  name: string;
  focused: boolean;
  color: string;
  size: number;
  badge?: number;
}> = ({ name, focused, color, size, badge }) => {
  const scale = useSharedValue(focused ? 1.1 : 1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, {
      damping: 14,
      stiffness: 180,
    });
  }, [focused, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.iconWrap}>
      <Animated.View style={animStyle}>
        <Icon name={name} size={size} color={color} />
      </Animated.View>
      {focused ? <View style={styles.activeDot} /> : null}
      {badge && badge > 0 ? (
        <View style={styles.badge}>
          <Text variant="caption" color={colors.white} style={styles.badgeText}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const CartTabIcon: React.FC<{ color: string; size: number; focused: boolean }> = ({
  color,
  size,
  focused,
}) => {
  const count = useCartItemCount();
  return (
    <AnimatedTabIcon
      name="shopping-bag"
      focused={focused}
      color={color}
      size={size}
      badge={count}
    />
  );
};

export const MainTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textTertiary,
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopColor: colors.divider,
        height: 64,
        paddingBottom: 8,
        paddingTop: 6,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      tabBarIcon: ({ color, size, focused }) => {
        if (route.name === 'CartTab')
          return <CartTabIcon color={color} size={size} focused={focused} />;
        const map: Record<string, string> = {
          HomeTab: 'home',
          CategoriesTab: 'grid',
          OrdersTab: 'package',
          ProfileTab: 'user',
        };
        return (
          <AnimatedTabIcon
            name={map[route.name] ?? 'circle'}
            focused={focused}
            color={color}
            size={size}
          />
        );
      },
    })}
  >
    <Tab.Screen name="HomeTab" component={HomeStackScreen} options={{ tabBarLabel: 'Home' }} />
    <Tab.Screen
      name="CategoriesTab"
      component={CategoriesStackScreen}
      options={{ tabBarLabel: 'Shop' }}
    />
    <Tab.Screen name="CartTab" component={CartStackScreen} options={{ tabBarLabel: 'Cart' }} />
    <Tab.Screen name="OrdersTab" component={OrdersStackScreen} options={{ tabBarLabel: 'Orders' }} />
    <Tab.Screen name="ProfileTab" component={ProfileStackScreen} options={{ tabBarLabel: 'Profile' }} />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  activeDot: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
