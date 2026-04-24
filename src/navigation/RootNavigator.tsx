import React, { useEffect } from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { SplashScreen } from '../screens/splash/SplashScreen';
import { setOnUnauthorized } from '../api/client';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Open the auth stack as a modal. Any screen that needs the user
 * to sign in calls this; after login, the user returns to where they were.
 */
export function navigateToAuth() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Auth', { screen: 'Login' });
  }
}

/**
 * Called by the axios interceptor on HTTP 401. Clears stored auth
 * and presents the login screen.
 */
export function handleUnauthorized() {
  navigateToAuth();
}

export const RootNavigator: React.FC = () => {
  const logout = useAuthStore(s => s.logout);

  useEffect(() => {
    setOnUnauthorized(async () => {
      await logout();
      handleUnauthorized();
    });
    return () => setOnUnauthorized(null);
  }, [logout]);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="Auth"
          component={AuthStack}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
