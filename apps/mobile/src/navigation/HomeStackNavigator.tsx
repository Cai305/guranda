import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import WalletDashboardScreen from '../screens/WalletDashboardScreen';
import WalletTransactionsScreen from '../screens/WalletTransactionsScreen';
import SendScreen from '../screens/SendScreen';
import DepositScreen from '../screens/DepositScreen';
import RequestMoneyScreen from '../screens/RequestMoneyScreen';
import PaymentRequestsScreen from '../screens/PaymentRequestsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AirPayScreen from '../screens/AirPayScreen';
import PayShapScreen from '../screens/PayShapScreen';
import PayShapLinkScreen from '../screens/PayShapLinkScreen';
import PayShapAirPayScreen from '../screens/PayShapAirPayScreen';

const Stack = createNativeStackNavigator();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={HomeScreen} />
      <Stack.Screen name="WalletHome" component={WalletDashboardScreen} />
      <Stack.Screen name="WalletTransactions" component={WalletTransactionsScreen} />
      <Stack.Screen name="Send" component={SendScreen} />
      <Stack.Screen name="Deposit" component={DepositScreen} />
      <Stack.Screen name="RequestMoney" component={RequestMoneyScreen} />
      <Stack.Screen name="AirPay" component={AirPayScreen} />
      <Stack.Screen name="PayShap" component={PayShapScreen} />
      <Stack.Screen name="PayShapLink" component={PayShapLinkScreen} />
      <Stack.Screen name="PayShapAirPay" component={PayShapAirPayScreen} />
      <Stack.Screen name="PaymentRequests" component={PaymentRequestsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
