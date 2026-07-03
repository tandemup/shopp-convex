import React from "react";
import { Pressable, Text } from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";

export default function LogoutButton() {
  const { signOut } = useAuthActions();

  return (
    <Pressable onPress={() => void signOut()}>
      <Text>Cerrar sesión</Text>
    </Pressable>
  );
}
