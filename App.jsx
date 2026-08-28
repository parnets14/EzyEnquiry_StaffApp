import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme';

const App = () => (
  <SafeAreaProvider>
    <StatusBar backgroundColor={colors.navy} barStyle="light-content" />
    <AppProvider>
      <AppNavigator />
    </AppProvider>
  </SafeAreaProvider>
);

export default App;
