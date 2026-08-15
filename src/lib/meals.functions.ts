import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SAFETY_MARGIN = 1.15;

/**
 * Analyse la photo de repas et enregistre l'estimation calorique
 * (brute + marge de sécurité de 15%). Jamais renvoyée au client.
 */
export const analyzeMealPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ mealId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: meal, error } = await supabase
      .from("meal_photos")
      .select("id, client_id, image_path")
      .eq("id", data.mealId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!meal || meal.client_id !== userId) throw new Error("Repas introuvable");

    const apiKey = process.env["LOVABLE_API_KEY"];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const markFailed = async () => {
      await supabaseAdmin
        .from("meal_photos")
        .update({ analysis_status: "failed" })
        .eq("id", meal.id);
    };

    if (!apiKey) {
      await markFailed();
      return { ok: false } as const;
    }

    try {
      const file = await supabaseAdmin.storage.from("meal-photos").download(meal.image_path);
      if (file.error || !file.data) throw new Error("Image indisponible");

      const bytes = new Uint8Array(await file.data.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
      const base64 = btoa(binary);
      const mime = file.data.type || "image/jpeg";

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            {
              role: "system",
              content:
                "Tu es un nutritionniste. Identifie les aliments visibles et estime les calories totales du repas. Réponds uniquement en JSON: {\"items\":[{\"name\":string,\"kcal\":number}],\"total_kcal\":number}.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Estime les calories de ce repas." },
                { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
              ],
            },
          ],
        }),
      });

      if (!res.ok) throw new Error(`Gateway ${res.status}`);
      const payload = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = payload.choices?.[0]?.message?.content ?? "";
      const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const parsed = JSON.parse(jsonText) as {
        items?: { name: string; kcal: number }[];
        total_kcal?: number;
      };

      const rawKcal = Math.round(
        parsed.total_kcal ?? (parsed.items ?? []).reduce((sum, i) => sum + (i.kcal || 0), 0),
      );
      if (!rawKcal || rawKcal <= 0) throw new Error("Estimation vide");

      const finalKcal = Math.round(rawKcal * SAFETY_MARGIN);

      const { error: updateError } = await supabaseAdmin
        .from("meal_photos")
        .update({
          calories_raw: rawKcal,
          calories_final: finalKcal,
          detected_items: parsed.items ?? [],
          analysis_status: "done",
        })
        .eq("id", meal.id);
      if (updateError) throw new Error(updateError.message);

      return { ok: true } as const;
    } catch (err) {
      console.error("analyzeMealPhoto", err);
      await markFailed();
      return { ok: false } as const;
    }
  });
