import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SAFETY_MARGIN = 1.15;

/**
 * Analyse la photo de repas et enregistre l'estimation calorique
 * (brute + marge de sécurité de 15%) ainsi que les macros. Jamais renvoyée au client.
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
    if (!meal) throw new Error("Repas introuvable");

    if (meal.client_id !== userId) {
      // Autorise le coach assigné à relancer l'analyse.
      const { data: client } = await supabase
        .from("profiles")
        .select("coach_id")
        .eq("id", meal.client_id)
        .maybeSingle();
      if (!client || client.coach_id !== userId) throw new Error("Repas introuvable");
    }

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
      await supabaseAdmin
        .from("meal_photos")
        .update({ analysis_status: "pending" })
        .eq("id", meal.id);

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
                'Tu es un nutritionniste. Identifie chaque aliment visible, estime sa quantité, ses calories et ses macronutriments. Réponds uniquement en JSON strict: {"aliments":[{"nom":string,"quantite":string,"calories":number,"proteines_g":number,"glucides_g":number,"lipides_g":number}],"calories_estimees":number}.',
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Estime les calories et les macros de ce repas." },
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
        aliments?: {
          nom?: string;
          quantite?: string;
          calories?: number;
          proteines_g?: number;
          glucides_g?: number;
          lipides_g?: number;
        }[];
        calories_estimees?: number;
      };

      const items = (parsed.aliments ?? []).map((i) => ({
        nom: String(i.nom ?? "Aliment"),
        quantite: i.quantite ? String(i.quantite) : null,
        calories: Math.round(Number(i.calories) || 0),
        proteines_g: Number(i.proteines_g) || 0,
        glucides_g: Number(i.glucides_g) || 0,
        lipides_g: Number(i.lipides_g) || 0,
      }));

      const rawKcal = Math.round(
        Number(parsed.calories_estimees) || items.reduce((sum, i) => sum + i.calories, 0),
      );
      if (!rawKcal || rawKcal <= 0) throw new Error("Estimation vide");

      const sum = (key: "proteines_g" | "glucides_g" | "lipides_g") =>
        Math.round(items.reduce((total, i) => total + i[key], 0));

      const finalKcal = Math.round(rawKcal * SAFETY_MARGIN);

      const { error: updateError } = await supabaseAdmin
        .from("meal_photos")
        .update({
          calories_raw: rawKcal,
          calories_final: finalKcal,
          detected_items: items,
          total_protein_g: sum("proteines_g"),
          total_carbs_g: sum("glucides_g"),
          total_fat_g: sum("lipides_g"),
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
