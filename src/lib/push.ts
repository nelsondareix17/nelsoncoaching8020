import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY =
  "BISkdKU6iCbnMT-pKPOehzAlcoHTkaHpuWcWsF7_b72XtIn8k-W6GQF47ZJ7LpOUIcctb3oPcaxCQN6da6i3t68";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function keyToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function enableReminders(userId: string): Promise<void> {
  if (!pushSupported()) throw new Error("unsupported");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("denied");

  const reg =
    (await navigator.serviceWorker.getRegistration("/sw.js")) ??
    (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }));

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      client_id: userId,
      endpoint: sub.endpoint,
      p256dh: keyToBase64(sub.getKey("p256dh")),
      auth: keyToBase64(sub.getKey("auth")),
      enabled: true,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

export async function disableReminders(): Promise<void> {
  const sub = await getExistingSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
