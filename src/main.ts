import { createApp } from "vue";
import App from "./App.vue";
import "./styles.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

function initAnalytics() {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src*="https://www.googletagmanager.com/gtag/js?id=${measurementId}"]`
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  }

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  gtag("js", new Date());
  gtag("config", measurementId);
}

initAnalytics();

createApp(App).mount("#app");
