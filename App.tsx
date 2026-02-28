import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen1 from './components/OnboardingScreen1';
import OnboardingScreen2 from './components/OnboardingScreen2';
import OnboardingScreen3 from './components/OnboardingScreen3';
import OnboardingScreen4 from './components/OnboardingScreen4';
import OnboardingComplete from './components/OnboardingComplete';
import BottomTabNavigator from './components/BottomTabNavigator';

export type RootStackParamList = {
  Onboarding1: undefined;
  Onboarding2: undefined;
  Onboarding3: undefined;
  Onboarding4: { role: string };
  OnboardingComplete: { role: string };
  MainApp: { role: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="MainApp"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Onboarding1" component={OnboardingScreen1} />
          <Stack.Screen name="Onboarding2" component={OnboardingScreen2} />
          <Stack.Screen name="Onboarding3" component={OnboardingScreen3} />
          <Stack.Screen name="Onboarding4" component={OnboardingScreen4} />
          <Stack.Screen name="OnboardingComplete" component={OnboardingComplete} />
          <Stack.Screen name="MainApp" component={BottomTabNavigator} initialParams={{ role: 'real_estate_agent' }}/>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}