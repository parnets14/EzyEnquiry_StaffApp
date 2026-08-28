import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useApp } from '../AppContext';
import { colors } from '../theme';
import { LoginScreen, OtpScreen, SplashScreen } from '../screens/AuthScreens';
import {
  DashboardScreen,
  NotificationsScreen,
  ProfileScreen,
} from '../screens/HomeScreens';
import {
  CustomerDetailScreen,
  CustomerFormScreen,
  CustomersScreen,
  QuotationDetailScreen,
  QuotationFormScreen,
  QuotationsScreen,
} from '../screens/CustomerQuotationScreens';
import {
  DispatchDetailScreen,
  DispatchesScreen,
  FinanceScreen,
  InvoiceDetailScreen,
  InvoicesScreen,
  OrderDetailScreen,
  OrdersScreen,
} from '../screens/OrderFinanceScreens';
import {
  CollectionDetailScreen,
  CollectionsScreen,
} from '../screens/CollectionScreens';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navigationTheme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.navy,
    border: colors.border,
    notification: colors.primary,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

const tabIcons = {
  Dashboard: 'view-dashboard-outline',
  Customers: 'account-group-outline',
  Orders: 'clipboard-text-outline',
  Finance: 'wallet-outline',
  Profile: 'account-circle-outline',
};

const mainTabScreenOptions = ({ route }, insets) => ({
  headerShown: false,
  tabBarAccessibilityLabel: `${route.name} tab`,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: '#D5DEE9',
  tabBarActiveBackgroundColor: colors.navyLight,
  tabBarInactiveBackgroundColor: colors.navy,
  tabBarHideOnKeyboard: true,
  tabBarIcon: ({ color, focused, size }) => (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Icon color={color} name={tabIcons[route.name]} size={size + 1} />
    </View>
  ),
  tabBarItemStyle: styles.tabItem,
  tabBarLabelStyle: styles.tabLabel,
  tabBarStyle: [
    styles.tabBar,
    {
      minHeight: 68 + insets.bottom,
      paddingBottom: Math.max(insets.bottom, 8),
      paddingLeft: Math.max(insets.left, 4),
      paddingRight: Math.max(insets.right, 4),
    },
  ],
});

const MainTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={options => mainTabScreenOptions(options, insets)}>
      <Tab.Screen component={DashboardScreen} name="Dashboard" />
      <Tab.Screen component={CustomersScreen} name="Customers" />
      <Tab.Screen component={OrdersScreen} name="Orders" />
      <Tab.Screen component={FinanceScreen} name="Finance" />
      <Tab.Screen component={ProfileScreen} name="Profile" />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated } = useApp();
  const [showSplash, setShowSplash] = React.useState(true);
  const finishSplash = React.useCallback(() => setShowSplash(false), []);

  if (showSplash) {
    return <SplashScreen onFinish={finishSplash} />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{ animation: 'slide_from_right', headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen component={MainTabs} name="Main" />
            <Stack.Screen
              component={NotificationsScreen}
              name="Notifications"
            />
            <Stack.Screen component={CustomerFormScreen} name="CustomerForm" />
            <Stack.Screen
              component={CustomerDetailScreen}
              name="CustomerDetail"
            />
            <Stack.Screen component={QuotationsScreen} name="Quotations" />
            <Stack.Screen
              component={QuotationFormScreen}
              name="QuotationForm"
            />
            <Stack.Screen
              component={QuotationDetailScreen}
              name="QuotationDetail"
            />
            <Stack.Screen component={OrderDetailScreen} name="OrderDetail" />
            <Stack.Screen component={DispatchesScreen} name="Dispatches" />
            <Stack.Screen
              component={DispatchDetailScreen}
              name="DispatchDetail"
            />
            <Stack.Screen component={InvoicesScreen} name="Invoices" />
            <Stack.Screen
              component={InvoiceDetailScreen}
              name="InvoiceDetail"
            />
            <Stack.Screen component={CollectionsScreen} name="Collections" />
            <Stack.Screen
              component={CollectionDetailScreen}
              name="CollectionDetail"
            />
          </>
        ) : (
          <>
            <Stack.Screen component={LoginScreen} name="Login" />
            <Stack.Screen component={OtpScreen} name="Otp" />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.navy,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    elevation: 12,
    paddingTop: 6,
    shadowColor: colors.navy,
    shadowOffset: { height: -4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  tabIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 30,
    justifyContent: 'center',
    width: 38,
  },
  tabIconActive: {
    backgroundColor: 'rgba(255,75,10,0.14)',
  },
  tabItem: {
    borderRadius: 12,
    marginHorizontal: 2,
    minWidth: 52,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
});

export default AppNavigator;
