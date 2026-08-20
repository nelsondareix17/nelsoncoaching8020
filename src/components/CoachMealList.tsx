import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { analyzeMealPhoto } from "@/lib/meals.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { dayLabel, groupByDay, todayISO } from "@/lib/dates";
import type { CoachMeal } from "@/components/MealCorrectionDialog";

export type DetectedItem = {
  nom: string;
  quantite: string | null;
  calories: number;
  proteines_g: number;
  glucides_g: number;
  lipides_g: number;
};

export function normalizeItems(raw: unknown): DetectedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const i = (entry ?? {}) as Record<string, unknown>;
    return {
      nom: String(i["nom"] ?? i["name"] ?? "Aliment"),
      quantite: i["quantite"] ? String(i["quantite"]) : null,
      calories: Math.round(Number(i["calories"] ?? i["kcal"] ?? 0)),
      proteines_g: Number(i["proteines_g"] ?? 0),
      glucides_g: Number(i["glucides_g"] ?? 0),
      lipides_g: Number(i["lipides_g"] ?? 0),
    };
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CoachMealList({
  meals,
  onCorrect,
  onRefresh,
}: {
  meals: CoachMeal[];
  onCorrect: (meal: CoachMeal) => void;
  onRefresh: () => void;
}) {
  const [retrying, setRetrying] = useState<string | null>(null);

  async function retry(mealId: string) {
    setRetrying(mealId);
    try {
      const res = await analyzeMealPhoto({ data: { mealId } });
      if (!res.ok) throw new Error("failed");
      toast.success("Analyse relancée ✅");
    } catch {
      toast.error("L'analyse a encore échoué.");
    } finally {
      setRetrying(null);
      onRefresh();
    }
  }

  if (!meals.length) {
    return <p className="text-xs text-muted-foreground">Aucune photo sur la période.</p>;
  }

  const groups = groupByDay(meals);
  const today = todayISO();

  return (
    <Accordion type="multiple" defaultValue={[today]} className="space-y-2">
      {groups.map((group) => {
        const dayKcal = group.items.reduce((sum, m) => sum + (m.calories_final ?? 0), 0);
        return (
          <AccordionItem
            key={group.day}
            value={group.day}
            className="rounded-xl border border-border px-3"
          >
            <AccordionTrigger className="py-3 hover:no-underline">
              <span className="flex flex-1 items-center justify-between gap-3 pr-2 text-left">
                <span className="text-sm font-semibold capitalize">{dayLabel(group.day)}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {group.items.length} repas · {dayKcal} kcal
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-4 pb-2">
                {group.items.map((meal) => {
                  const items = normalizeItems(meal.detected_items);
                  const failed = meal.analysis_status === "failed";
                  return (
                    <li
                      key={meal.id}
                      className="flex flex-col gap-4 rounded-xl border border-border p-3 sm:flex-row"
                    >
                      <button
                        type="button"
                        onClick={() => onCorrect(meal)}
                        className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {meal.url ? (
                          <img
                            src={meal.url}
                            alt={meal.note ?? "Photo de repas du client"}
                            loading="lazy"
                            className="size-28 rounded-lg border border-border object-cover"
                          />
                        ) : (
                          <div className="size-28 rounded-lg border border-dashed border-border" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-xs text-muted-foreground">{formatTime(meal.taken_at)}</p>

                        {failed ? (
                          <div className="space-y-2">
                            <p className="flex items-center gap-1.5 text-sm font-medium text-warning">
                              <AlertTriangle className="size-4" /> Analyse indisponible
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={retrying === meal.id}
                              onClick={() => void retry(meal.id)}
                            >
                              <RefreshCw className="mr-1.5 size-3.5" />
                              {retrying === meal.id ? "Analyse…" : "Relancer l'analyse"}
                            </Button>
                          </div>
                        ) : meal.calories_final ? (
                          <>
                            <p className="flex flex-wrap items-baseline gap-2">
                              <span className="text-base font-bold">
                                {meal.calories_final} kcal
                              </span>
                              {meal.calories_raw ? (
                                <span className="text-xs text-muted-foreground">
                                  brut {meal.calories_raw}
                                </span>
                              ) : null}
                              {meal.calories_source === "coach" ? (
                                <Badge variant="secondary" className="text-[10px] font-medium">
                                  Corrigé
                                </Badge>
                              ) : null}
                            </p>

                            {items.length ? (
                              <ul className="space-y-0.5">
                                {items.map((item, index) => (
                                  <li
                                    key={`${meal.id}-${index}`}
                                    className="text-sm text-muted-foreground"
                                  >
                                    {item.nom}
                                    {item.quantite ? ` · ${item.quantite}` : ""} · {item.calories}{" "}
                                    kcal
                                  </li>
                                ))}
                              </ul>
                            ) : null}

                            <p className="text-xs font-medium text-muted-foreground">
                              Protéines {Math.round(meal.total_protein_g ?? 0)}g · Glucides{" "}
                              {Math.round(meal.total_carbs_g ?? 0)}g · Lipides{" "}
                              {Math.round(meal.total_fat_g ?? 0)}g
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Analyse en cours…</p>
                        )}

                        {meal.note ? (
                          <p className="text-xs italic text-muted-foreground">{meal.note}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
