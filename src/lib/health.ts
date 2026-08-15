/**
 * Passerelle santé (Apple HealthKit / Android Health Connect).
 *
 * En version web, ces API natives ne sont pas accessibles depuis le navigateur.
 * Le code ci-dessous détecte un pont natif injecté par une future coque
 * mobile (Capacitor / React Native WebView) exposant `window.HealthBridge`.
 * Sans pont disponible, on retombe sur la saisie manuelle.
 */
type HealthBridge = {
  requestPermissions?: () => Promise<boolean>;
  getTodaySteps: () => Promise<number>;
};

declare global {
  interface Window {
    HealthBridge?: HealthBridge;
  }
}

export function healthPlatformLabel(): string {
  if (typeof navigator === "undefined") return "Apple Santé / Health Connect";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "Apple Santé";
  if (/Android/i.test(ua)) return "Health Connect";
  return "Apple Santé / Health Connect";
}

export type HealthSyncResult =
  | { available: true; steps: number }
  | { available: false; message: string };

export async function syncHealthSteps(): Promise<HealthSyncResult> {
  const bridge = typeof window !== "undefined" ? window.HealthBridge : undefined;
  if (!bridge) {
    return {
      available: false,
      message:
        "La synchronisation santé est disponible dans l'app mobile. Saisissez vos pas manuellement pour l'instant.",
    };
  }
  try {
    if (bridge.requestPermissions) {
      const granted = await bridge.requestPermissions();
      if (!granted) {
        return {
          available: false,
          message: "Accès aux données santé refusé. Saisissez vos pas manuellement.",
        };
      }
    }
    const steps = await bridge.getTodaySteps();
    return { available: true, steps: Math.max(0, Math.round(steps)) };
  } catch {
    return {
      available: false,
      message: "Synchronisation santé indisponible. Saisissez vos pas manuellement.",
    };
  }
}
