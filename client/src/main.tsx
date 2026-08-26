import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Registra o service worker para instalação na tela inicial (PWA)
void import("virtual:pwa-register").then(({ registerSW }) => {
  registerSW({ immediate: true });
});

createRoot(document.getElementById("root")!).render(<App />);
