import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthHomeScreen from "@/src/screens/auth/AuthHomeScreen";
import LoginScreen from "@/src/screens/auth/LoginScreen";
import RegisterScreen from "@/src/screens/auth/RegisterScreen";

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="AuthHome"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AuthHome" component={AuthHomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
