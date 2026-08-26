import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cunoku.game",
  appName: "Cunoku",
  webDir: "dist/public",
  server: {
    // Permite HTTP na LAN (partida Wi‑Fi local)
    androidScheme: "https",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#1c1917",
    },
  },
};

export default config;
