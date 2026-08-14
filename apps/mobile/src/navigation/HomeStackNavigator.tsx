import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import WalletScreen from '../screens/WalletScreen';
import SendScreen from '../screens/SendScreen';
import DepositScreen from '../screens/DepositScreen';
import RequestMoneyScreen from '../screens/RequestMoneyScreen';
import PaymentRequestsScreen from '../screens/PaymentRequestsScreen';

const Stack = createNativeStackNavigator();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={HomeScreen} />
      <Stack.Screen name="WalletHome" component={WalletScreen} />
      <Stack.Screen name="Send" component={SendScreen} />
      <Stack.Screen name="Deposit" component={DepositScreen} />
      <Stack.Screen name="RequestMoney" component={RequestMoneyScreen} />
      <Stack.Screen name="PaymentRequests" component={PaymentRequestsScreen} />
    </Stack.Navigator>
  );
}
