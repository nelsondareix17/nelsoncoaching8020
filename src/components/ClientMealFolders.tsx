import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { dayLabel, groupByDay, lastNDays, todayISO } from "@/lib/dates";

export function ClientMealFolders({ clientId, refreshKey }: { clientId: string; refreshKey: number }) {
  const from = lastNDays(28)[0]!;

  const { data } = useQuery({
    queryKey: ["client-meal-folders", clientId, refreshKey],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("meal_photos")
        .select("id, entry_date, taken_at, image_path, note, analysis_status")
        .eq("client_id", clientId)
        .gte("entry_date", from)
        .order("taken_at", { ascending: false });

      return Promise.all(
        (rows ?? []).map(async (m) => {
          const { data: url } = await supabase.storage
            .from("meal-photos")
            .createSignedUrl(m.image_path, 3600);
          return { ...m, url: url?.signedUrl ?? null };
        }),
      );
    },
  });

  const meals = data ?? [];
  if (!meals.length) return null;

  const groups = groupByDay(meals);
  const today = todayISO();

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Mes repas par jour</h2>
      <Accordion type="multiple" defaultValue={[today]} className="space-y-2">
        {groups.map((group) => (
          <AccordionItem
            key={group.day}
            value={group.day}
            className="rounded-xl border border-border bg-card px-3"
          >
            <AccordionTrigger className="py-3 hover:no-underline">
              <span className="flex flex-1 items-center justify-between gap-3 pr-2 text-left">
                <span className="text-sm font-semibold capitalize">{dayLabel(group.day)}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {group.items.length} repas
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="grid grid-cols-3 gap-2 pb-3 sm:grid-cols-4">
                {group.items.map((meal) => (
                  <li key={meal.id} className="space-y-1">
                    {meal.url ? (
                      <img
                        src={meal.url}
                        alt={meal.note ?? "Ma photo de repas"}
                        loading="lazy"
                        className="aspect-square w-full rounded-lg border border-border object-cover"
                      />
                    ) : (
                      <div className="aspect-square w-full rounded-lg border border-dashed border-border" />
                    )}
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Check className="size-3 text-success" />
                      {new Date(meal.taken_at).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
