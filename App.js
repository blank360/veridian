import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { setStatusBarHidden, StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Home from './Screens/Home';
import Login from './Screens/Login';
import Interview from './Screens/Interview';
import Profile from './Screens/Profile';
import * as Navigation from "expo-navigation-bar";
import { useEffect } from 'react';

export default function App() {
  const Stack = createStackNavigator();

   useEffect(()=>{
     if (Platform.OS === 'android') {
        setStatusBarHidden(true,'none');
        Navigation.setVisibilityAsync("hidden");
      }      
  },[]);
  
  return (
      <NavigationContainer>
           <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{ animationEnabled: true }}
          >
            <Stack.Screen
              name="Home"
              component={Home}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Login"
              component={Login}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Interview"
              component={Interview}
              options={{ headerShown: false }}
            />
             <Stack.Screen
              name="Profile"
              component={Profile}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
          <StatusBar hidden={true} backgroundColor="transparent" />
      </NavigationContainer>
  );
}
