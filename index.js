import { registerRootComponent } from "expo";
import "./web.css";
import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Expo Web generates the application shell, while this worker makes the
// deployed site installable and keeps the shell available after first load.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("No se pudo registrar el service worker de Shopp", error);
    });
  });
}
