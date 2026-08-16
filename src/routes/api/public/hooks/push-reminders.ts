import { createFileRoute } from "@tanstack/react-router";
import { buildPushPayload } from "@block65/webcrypto-web-push";

type Slot = { hour: number; kind: "weight" | "meal"; title: string; body: string };

const SLOTS: Slot[] = [
  {
    hour: 7,
    kind: "weight",
    title: "80/20 — Pesée du matin",
    body: "Bonjour ! Note ton poids du jour en 5 secondes.",
  },
  {
    hour: 9,
    kind: "meal",
    title: "80/20 — Petit-déjeuner",
    body: "Prends une photo de ton petit-déjeuner.",
  },
  {
    hour: 12,
    kind: "meal",
    title: "80/20 — Déjeuner",
    body: "Photo de ton déjeuner : c'est le moment.",
  },
  {
    hour: 20,
    kind: "meal",
    title: "80/20 — Dîner",
    body: "Photo de ton dîner pour compléter la journée.",
  },
];

function parisNow(): { hour: number; day: string } {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    hour: Number(get("hour")),
    day: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

export const Route = createFileRoute("/api/public/hooks/push-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const { hour, day } = parisNow();
        const slot = SLOTS.find((s) => s.hour === hour);
        if (!slot) return Response.json({ skipped: true, hour });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: subs, error } = await supabaseAdmin
          .from("push_subscriptions")
          .select("id, client_id, endpoint, p256dh, auth")
          .eq("enabled", true);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        if (!subs || subs.length === 0) return Response.json({ sent: 0 });

        const clientIds = [...new Set(subs.map((s) => s.client_id))];

        // Only remind clients that haven't logged yet today.
        const done = new Set<string>();
        if (slot.kind === "weight") {
          const { data } = await supabaseAdmin
            .from("weight_entries")
            .select("client_id")
            .eq("entry_date", day)
            .in("client_id", clientIds);
          for (const row of data ?? []) done.add(row.client_id);
        } else {
          const { data } = await supabaseAdmin
            .from("meal_photos")
            .select("client_id, taken_at")
            .eq("entry_date", day)
            .in("client_id", clientIds);
          // A meal logged within the last 4h means the current slot is covered.
          const cutoff = Date.now() - 4 * 60 * 60 * 1000;
          for (const row of data ?? []) {
            if (new Date(row.taken_at).getTime() >= cutoff) done.add(row.client_id);
          }
        }

        const vapid = {
          subject: process.env["VAPID_SUBJECT"] ?? "mailto:coach@8020.app",
          publicKey: process.env["VAPID_PUBLIC_KEY"]!,
          privateKey: process.env["VAPID_PRIVATE_KEY"]!,
        };

        let sent = 0;
        for (const clientId of clientIds) {
          if (done.has(clientId)) continue;

          const { error: logError } = await supabaseAdmin.from("reminder_log").insert({
            client_id: clientId,
            kind: slot.kind,
            entry_date: day,
            slot_hour: slot.hour,
          });
          if (logError) continue; // already sent for this slot

          for (const sub of subs.filter((s) => s.client_id === clientId)) {
            const subscription = {
              endpoint: sub.endpoint,
              expirationTime: null,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            };
            try {
              const payload = await buildPushPayload(
                {
                  data: {
                    title: slot.title,
                    body: slot.body,
                    url: slot.kind === "weight" ? "/app" : "/app/repas",
                    tag: `8020-${slot.kind}-${slot.hour}`,
                  },
                  options: { ttl: 3600, urgency: "normal" },
                },
                subscription,
                vapid,
              );

              const res = await fetch(sub.endpoint, {
                method: payload.method,
                headers: payload.headers,
                body: payload.body as unknown as BodyInit,
              });

              if (res.status === 404 || res.status === 410) {
                await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
              } else if (res.ok) {
                sent += 1;
              }
            } catch (err) {
              console.error("push send failed", err);
            }
          }
        }

        return Response.json({ sent, slot: slot.kind, hour });
      },
    },
  },
});
