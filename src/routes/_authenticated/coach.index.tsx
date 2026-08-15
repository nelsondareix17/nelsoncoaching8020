import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { ChevronRight, Copy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfile, signOut } from "@/hooks/useAuth";
import { lastNDays } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/coach/")({
  component: CoachHome,
});

function CoachHome() {
  const { data: me } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (me && me.profile.role !== "coach") void navigate({ to: "/app" });
  }, [me, navigate]);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["coach-clients", me?.userId],
    enabled: me?.profile.role === "coach",
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("coach_id", me!.userId)
        .order("full_name");
      if (error) throw error;

      const since = lastNDays(3)[0]!;
      const [weights, meals, activity] = await Promise.all([
        supabase.from("weight_entries").select("client_id, entry_date").gte("entry_date", since),
        supabase.from("meal_photos").select("client_id, entry_date").gte("entry_date", since),
        supabase.from("activity_entries").select("client_id, entry_date").gte("entry_date", since),
      ]);

      const recent = new Set<string>();
      for (const rows of [weights.data, meals.data, activity.data]) {
        for (const row of rows ?? []) recent.add(row.client_id);
      }

      return (profiles ?? []).map((p) => ({ ...p, upToDate: recent.has(p.id) }));
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6">
      <header className="flex items-center justify-between">
        <Brand subtitle="Espace coach" />
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          Quitter
        </Button>
      </header>

      <section className="mt-8 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Mes clients</h1>
        <p className="text-sm text-muted-foreground">
          Statut de saisie sur les 3 derniers jours.
        </p>
      </section>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold">Code d'invitation</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Votre client colle ce code dans son onglet « Compte » pour vous rattacher.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg bg-secondary px-3 py-2 text-xs">
            {me?.userId}
          </code>
          <Button
            variant="outline"
            size="icon"
            aria-label="Copier le code"
            onClick={() => {
              if (me?.userId) {
                void navigator.clipboard.writeText(me.userId);
                toast.success("Code copié");
              }
            }}
          >
            <Copy className="size-4" />
          </Button>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {isLoading ? <li className="text-sm text-muted-foreground">Chargement…</li> : null}
        {clients?.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aucun client rattaché pour le moment.
          </li>
        ) : null}
        {clients?.map((client) => (
          <li key={client.id}>
            <Link
              to="/coach/$clientId"
              params={{ clientId: client.id }}
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:bg-accent"
            >
              <div className="space-y-1">
                <p className="font-semibold">{client.full_name || "Client sans nom"}</p>
                <Badge variant={client.upToDate ? "secondary" : "destructive"}>
                  {client.upToDate ? "À jour" : "En retard"}
                </Badge>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
