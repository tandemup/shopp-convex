import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthHomeScreen from "@/src/screens/auth/AuthHomeScreen";
import LoginScreen from "@/src/screens/auth/LoginScreen";
import RegisterScreen from "@/src/screens/auth/RegisterScreen";
import ResetPasswordScreen from "@/src/screens/auth/ResetPasswordScreen";

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
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{
          title: "Restablecer contraseña",
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
