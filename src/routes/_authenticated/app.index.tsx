import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/useAuth";
import { todayISO } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/app/")({
  component: WeightPage,
});

function WeightPage() {
  const { data } = useProfile();
  const [weight, setWeight] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    const value = Number(weight.replace(",", "."));
    if (!value || value < 20 || value > 400) {
      toast.error("Entrez un poids valide en kg.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("weight_entries").upsert(
      { client_id: data.userId, entry_date: todayISO(), weight_kg: value },
      { onConflict: "client_id,entry_date" },
    );
    setLoading(false);
    if (error) {
      toast.error("Enregistrement impossible.");
      return;
    }
    setWeight("");
    setSaved(true);
    toast.success("Poids enregistré ✅");
  }

  return (
    <section className="space-y-6 pt-2">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Mon poids du jour</h1>
        <p className="text-sm text-muted-foreground">Un chiffre, une fois par jour. C'est tout.</p>
      </div>

      {saved ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="size-4" />
          </span>
          <p className="text-sm font-medium">Poids enregistré pour aujourd'hui</p>
        </div>
      ) : null}

      <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="weight">Poids (kg)</Label>
          <Input
            id="weight"
            inputMode="decimal"
            autoFocus
            placeholder="72,4"
            className="h-14 text-2xl font-semibold"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          Enregistrer
        </Button>
      </form>
    </section>
  );
}
