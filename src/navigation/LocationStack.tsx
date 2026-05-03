import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { PermissionPrimerScreen } from '../screens/location/PermissionPrimerScreen';
import { LocationPickerScreen } from '../screens/location/LocationPickerScreen';
import type { LocationStackParamList } from './types';

const Stack = createNativeStackNavigator<LocationStackParamList>();

/**
 * Mounted at the root level (above the bottom tabs) so the picker overlays
 * the entire app — exactly like Zepto / Swiggy / Blinkit. From any screen,
 * tapping the "Deliver to" pill pushes this stack on top.
 *
 * Two entry points:
 *  • PermissionPrimer — first time, before we ask for the OS dialog
 *  • LocationPicker  — every time after that (or directly when the user
 *                      taps the home pill to change location)
 */
export const LocationStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="PermissionPrimer" component={PermissionPrimerScreen} />
    <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
  </Stack.Navigator>
);
