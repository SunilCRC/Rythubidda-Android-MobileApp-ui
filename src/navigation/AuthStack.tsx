import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { OTPScreen } from '../screens/auth/OTPScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import type { AuthStackParamList } from './types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Small "X" in the top-right so users can dismiss the auth modal
 * and continue browsing as a guest. Only rendered on Login screen.
 */
const CloseButton: React.FC = () => {
  const navigation = useNavigation<any>();
  const closeAuth = () => {
    // Close the entire auth modal (parent root stack), not just the current screen
    navigation.getParent()?.goBack();
  };
  return (
    <Pressable
      onPress={closeAuth}
      hitSlop={12}
      style={styles.close}
      android_ripple={{ color: colors.pressed, radius: 22, borderless: true }}
    >
      <Icon name="x" size={22} color={colors.textPrimary} />
    </Pressable>
  );
};

/**
 * A wrapper that injects the close button above the login screen.
 */
const LoginWithClose: React.FC<any> = props => (
  <View style={styles.withClose}>
    <CloseButton />
    <LoginScreen {...props} />
  </View>
);

export const AuthStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="Login" component={LoginWithClose} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="OTP" component={OTPScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  withClose: { flex: 1 },
  close: {
    position: 'absolute',
    top: spacing.base,
    right: spacing.base,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.palette.secondary[100],
  },
});
