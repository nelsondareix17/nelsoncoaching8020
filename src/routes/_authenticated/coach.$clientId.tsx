import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Dumbbell } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { lastNDays, shortLabel } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/coach/$clientId")({
  component: ClientDetail,
});

const PERIODS = [
  { label: "7 j", days: 7 },
  { label: "1 mois", days: 30 },
  { label: "3 mois", days: 90 },
] as const;

function ClientDetail() {
  const { clientId } = Route.useParams();
  const [days, setDays] = useState<number>(7);
  const range = lastNDays(days);
  const from = range[0]!;

  const { data, isLoading } = useQuery({
    queryKey: ["coach-client", clientId, days],
    queryFn: async () => {
      const [profile, weights, meals, activity, workouts] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", clientId).maybeSingle(),
        supabase
          .from("weight_entries")
          .select("entry_date, weight_kg")
          .eq("client_id", clientId)
          .gte("entry_date", from)
          .order("entry_date"),
        supabase
          .from("meal_photos")
          .select("id, entry_date, taken_at, image_path, note, calories_final, analysis_status")
          .eq("client_id", clientId)
          .gte("entry_date", from)
          .order("taken_at", { ascending: false }),
        supabase
          .from("activity_entries")
          .select("entry_date, steps, source")
          .eq("client_id", clientId)
          .gte("entry_date", from),
        supabase
          .from("workouts")
          .select("id, entry_date, workout_type, duration_min, note")
          .eq("client_id", clientId)
          .gte("entry_date", from)
          .order("entry_date", { ascending: false }),
      ]);

      const mealRows = meals.data ?? [];
      const signed = await Promise.all(
        mealRows.map(async (m) => {
          const { data: url } = await supabase.storage
            .from("meal-photos")
            .createSignedUrl(m.image_path, 3600);
          return { ...m, url: url?.signedUrl ?? null };
        }),
      );

      const weightByDay = new Map((weights.data ?? []).map((w) => [w.entry_date, Number(w.weight_kg)]));
      const kcalByDay = new Map<string, number>();
      for (const m of mealRows) {
        kcalByDay.set(m.entry_date, (kcalByDay.get(m.entry_date) ?? 0) + (m.calories_final ?? 0));
      }
      const stepsByDay = new Map((activity.data ?? []).map((a) => [a.entry_date, a.steps]));
      const workoutsByDay = new Map<string, number>();
      for (const w of workouts.data ?? []) {
        workoutsByDay.set(w.entry_date, (workoutsByDay.get(w.entry_date) ?? 0) + 1);
      }

      const series = range.map((day) => ({
        day: shortLabel(day),
        weight: weightByDay.get(day) ?? null,
        kcal: kcalByDay.get(day) ?? 0,
        steps: stepsByDay.get(day) ?? 0,
        workouts: workoutsByDay.get(day) ?? 0,
      }));

      return {
        name: profile.data?.full_name ?? "Client",
        series,
        meals: signed,
        workouts: workouts.data ?? [],
      };
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-6">
      <div className="flex items-center justify-between gap-4">
        <Link to="/coach" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> Mes clients
        </Link>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.days}
              size="sm"
              variant={days === p.days ? "default" : "outline"}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <h1 className="mt-6 text-2xl font-bold tracking-tight">{data?.name ?? "Chargement…"}</h1>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement des données…</p>
      ) : (
        <div className="mt-6 space-y-6">
          <ChartCard title="Évolution du poids" subtitle="kg, jour par jour">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Calories par jour" subtitle="Estimation IA, marge de sécurité +15% incluse">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="kcal" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Activité physique" subtitle="Pas quotidiens et séances réalisées">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.series ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="steps" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap gap-2">
              {data?.workouts.length ? (
                data.workouts.map((w) => (
                  <Badge key={w.id} variant="secondary" className="gap-1">
                    <Dumbbell className="size-3" />
                    {shortLabel(w.entry_date)} · {w.workout_type} · {w.duration_min} min
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Aucune séance sur la période.</p>
              )}
            </div>
          </ChartCard>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Photos de repas</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Estimation calorique finale (marge +15%) sous chaque photo.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {data?.meals.length ? (
                data.meals.map((m) => (
                  <figure key={m.id} className="space-y-2">
                    {m.url ? (
                      <img
                        src={m.url}
                        alt={m.note ?? "Photo de repas du client"}
                        loading="lazy"
                        className="aspect-square w-full rounded-xl border border-border object-cover"
                      />
                    ) : (
                      <div className="aspect-square w-full rounded-xl border border-dashed border-border" />
                    )}
                    <figcaption className="space-y-0.5">
                      <p className="text-sm font-semibold">
                        {m.calories_final
                          ? `${m.calories_final} kcal`
                          : m.analysis_status === "failed"
                            ? "Estimation indisponible"
                            : "Analyse en cours…"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.taken_at).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {m.note ? <p className="text-xs text-muted-foreground">{m.note}</p> : null}
                    </figcaption>
                  </figure>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Aucune photo sur la période.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mb-4 mt-1 text-xs text-muted-foreground">{subtitle}</p>
      {children}
    </section>
  );
}
