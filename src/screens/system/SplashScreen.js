// screens/SplashScreen.js
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import splashIcon from "@/assets/images/splash-icon.png";
//source={require("../assets/images/splash-icon.png")}

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current; // valor inicial de opacidad 0

  useEffect(() => {
    // 🎬 Animar entrada (fade-in)
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200, // duración de la animación en ms
      useNativeDriver: true,
    }).start();

    // ⏳ Después de un breve tiempo, pasar al Tab principal
    const timer = setTimeout(() => {
      navigation.replace("Main"); // reemplaza el stack actual
    }, 2000);

    return () => clearTimeout(timer);
  }, [fadeAnim, navigation]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ alignItems: "center", opacity: fadeAnim }}>
        <Image source={splashIcon} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Shopp</Text>
        <Text style={styles.subtitle}>Tu lista de compras inteligente</Text>
      </Animated.View>

      <ActivityIndicator
        size="large"
        color="#007AFF"
        style={{ marginTop: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  logo: {
    width: 130,
    height: 130,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#007AFF",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginTop: 6,
  },
});
