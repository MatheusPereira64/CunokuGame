import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cunoku.game",
  appName: "Cunoku",
  webDir: "dist/public",
  server: {
    // Permite HTTP na LAN (partida Wi‑Fi local)
    androidScheme: "https",
    iosScheme: "https",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: "automatic",
    scheme: "Cunoku",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#1c1917",
    },
  },
};

export default config;
