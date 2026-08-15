import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAuth";
import { lastNDays, shortLabel } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/app/historique")({
  component: HistoryPage,
});

function HistoryPage() {
  const { data: me } = useProfile();
  const days = lastNDays(28);

  const { data } = useQuery({
    queryKey: ["client-checkins", me?.userId],
    enabled: Boolean(me),
    queryFn: async () => {
      const from = days[0]!;
      const [weights, meals, activity, workouts] = await Promise.all([
        supabase.from("weight_entries").select("entry_date").gte("entry_date", from),
        supabase.from("meal_photos").select("entry_date").gte("entry_date", from),
        supabase.from("activity_entries").select("entry_date").gte("entry_date", from),
        supabase.from("workouts").select("entry_date").gte("entry_date", from),
      ]);
      const set = (rows: { entry_date: string }[] | null) =>
        new Set((rows ?? []).map((r) => r.entry_date));
      return {
        weights: set(weights.data),
        meals: set(meals.data),
        activity: new Set([
          ...set(activity.data),
          ...set(workouts.data),
        ]),
      };
    },
  });

  return (
    <section className="space-y-6 pt-2">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Mes saisies</h1>
        <p className="text-sm text-muted-foreground">
          Une coche par catégorie renseignée. Aucun chiffre, juste la régularité.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-y-1 text-xs">
          <span />
          <span className="pb-2 text-center font-semibold text-muted-foreground">Poids</span>
          <span className="pb-2 text-center font-semibold text-muted-foreground">Repas</span>
          <span className="pb-2 text-center font-semibold text-muted-foreground">Activité</span>
          {[...days].reverse().map((day) => (
            <Row
              key={day}
              day={day}
              weight={data?.weights.has(day) ?? false}
              meal={data?.meals.has(day) ?? false}
              activity={data?.activity.has(day) ?? false}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Row({
  day,
  weight,
  meal,
  activity,
}: {
  day: string;
  weight: boolean;
  meal: boolean;
  activity: boolean;
}) {
  return (
    <>
      <span className="py-2 pr-3 text-muted-foreground">{shortLabel(day)}</span>
      <Cell ok={weight} />
      <Cell ok={meal} />
      <Cell ok={activity} />
    </>
  );
}

function Cell({ ok }: { ok: boolean }) {
  return (
    <span className="flex items-center justify-center py-2">
      {ok ? (
        <span className="flex size-5 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="size-3" />
        </span>
      ) : (
        <span className="size-5 rounded-full border border-dashed border-border" />
      )}
    </span>
  );
}
