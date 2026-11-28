import { APP_VERSION } from "./appVersion";

/**
 * Relatório de erros (Sentry). Só liga quando o build tem VITE_SENTRY_DSN:
 * sem ele, nada é carregado nem enviado. O SDK vem em um pedaço separado do bundle.
 */
export function startErrorReporting(native: boolean): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || import.meta.env.DEV) return;
  void import("@sentry/react")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        release: `cunoku@${APP_VERSION}`,
        environment: native ? "app" : "web",
        // Só erros: sem rastreamento de navegação, replay ou dados pessoais
        sendDefaultPii: false,
        tracesSampleRate: 0,
        ignoreErrors: ["ResizeObserver loop", "Failed to fetch", "Load failed", "NetworkError"],
        beforeSend(event) {
          // O código da sala fica na URL: não é pessoal, mas não precisa ir junto
          if (event.request?.url) event.request.url = event.request.url.replace(/\/game\/[^/?#]+/, "/game/:code");
          return event;
        },
      });
    })
    .catch(() => undefined);
}
