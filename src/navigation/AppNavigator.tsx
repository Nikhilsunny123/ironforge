import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { DashboardScreen } from '../screens/DashboardScreen';
import { WorkoutsScreen } from '../screens/WorkoutsScreen';
import { WorkoutSessionScreen } from '../screens/WorkoutSessionScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { MeasurementsScreen } from '../screens/MeasurementsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { useAuthStore } from '../store/authStore';

// Define navigation param lists
export type TabParamList = {
  Dashboard: undefined;
  Workouts: undefined;
  Progress: undefined;
  Measurements: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  WorkoutSession: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Bottom Tab Navigator Component
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'bar-chart';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Workouts') {
            iconName = focused ? 'barbell' : 'barbell-outline';
          } else if (route.name === 'Progress') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'Measurements') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ea580c', // brand orange
        tabBarInactiveTintColor: '#a1a1aa', // zinc-400 / dark-muted
        tabBarStyle: {
          backgroundColor: '#09090b', // zinc-950 / dark-bg
          borderTopColor: '#27272a', // zinc-800 / dark-border
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#09090b', // zinc-950 / dark-bg
          borderBottomColor: '#27272a', // zinc-800 / dark-border
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          color: '#f4f4f5', // zinc-100 / dark-text
          fontWeight: '900',
          fontSize: 18,
          letterSpacing: -0.5,
        },
        headerTitleAlign: 'center',
        screenContainerStyle: {
          backgroundColor: '#09090b', // zinc-950 / dark-bg
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Workouts"
        component={WorkoutsScreen}
        options={{ title: 'Workouts' }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{ title: 'Progress' }}
      />
      <Tab.Screen
        name="Measurements"
        component={MeasurementsScreen}
        options={{ title: 'Measures' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerRight: () => (
            <Pressable
              onPress={() => {
                useAuthStore.getState().signOut().catch((err) => console.error(err));
              }}
              className="mr-4 p-1 active:opacity-70"
            >
              <Ionicons name="log-out-outline" size={22} color="#ef4444" />
            </Pressable>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';

// Root Stack Navigator Component
export const AppNavigator = () => {
  const { user, isGuest } = useAuthStore();

  React.useEffect(() => {
    const parseAuthUrl = (url: string) => {
      const params: { [key: string]: string } = {};
      const queryPart = url.split('#')[1] || url.split('?')[1];
      if (queryPart) {
        queryPart.split('&').forEach((param) => {
          const [key, val] = param.split('=');
          if (key && val) {
            params[key] = decodeURIComponent(val);
          }
        });
      }
      return params;
    };

    const handleDeepLink = async (event: { url: string }) => {
      const params = parseAuthUrl(event.url);
      const { access_token, refresh_token } = params;
      if (access_token && refresh_token) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
        } catch (err) {
          console.error('Failed to set session from deep link:', err);
        }
      }
    };

    // Handle deep links when app was opened via link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#09090b' },
        }}
      >
        {user === null && !isGuest ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            {/* Bottom tab main navigator */}
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            
            {/* Active Workout Session presented as modal */}
            <Stack.Screen
              name="WorkoutSession"
              component={WorkoutSessionScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                gestureEnabled: true,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
export default AppNavigator;
