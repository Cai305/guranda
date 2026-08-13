import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeStackNavigator from './HomeStackNavigator';
import ChatStackNavigator from './ChatStackNavigator';
import ExploreScreen from '../screens/ExploreScreen';
import HubStackNavigator from './HubStackNavigator';
import ProfileScreen from '../screens/ProfileScreen';
import CustomTabBar from './CustomTabBar';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Chat" component={ChatStackNavigator} options={{ tabBarLabel: 'Chats' }} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      {/* Life keeps its own stack alive (Home's "Your Life" links still
          navigate here) but no longer gets a bottom-bar slot — its tiles
          now surface directly on Home instead. CustomTabBar also skips it
          explicitly, but options.tabBarButton is kept as a fallback. */}
      <Tab.Screen name="Life" component={HubStackNavigator} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
