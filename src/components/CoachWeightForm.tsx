import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayISO } from "@/lib/dates";

export function CoachWeightForm({
  clientId,
  onSaved,
}: {
  clientId: string;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const kg = Number(weight.replace(",", "."));
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
      toast.error("Poids invalide (entre 20 et 400 kg).");
      return;
    }
    if (!date) {
      toast.error("Choisissez une date.");
      return;
    }

    setSaving(true);
    const { data: existing } = await supabase
      .from("weight_entries")
      .select("id")
      .eq("client_id", clientId)
      .eq("entry_date", date)
      .maybeSingle();

    const { error } = existing
      ? await supabase
          .from("weight_entries")
          .update({ weight_kg: kg })
          .eq("id", existing.id)
      : await supabase
          .from("weight_entries")
          .insert({ client_id: clientId, entry_date: date, weight_kg: kg });
    setSaving(false);

    if (error) {
      toast.error("Enregistrement impossible.");
      return;
    }
    toast.success(existing ? "Poids mis à jour ✅" : "Poids enregistré ✅");
    setWeight("");
    onSaved();
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">Ajouter un poids</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Si le client vous communique son poids, saisissez-le ici. Une valeur déjà présente à cette
        date sera remplacée.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="weight-date">Date</Label>
          <Input
            id="weight-date"
            type="date"
            max={todayISO()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex-1 space-y-2">
          <Label htmlFor="weight-kg">Poids (kg)</Label>
          <Input
            id="weight-kg"
            inputMode="decimal"
            placeholder="72.4"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        <Button onClick={() => void save()} disabled={saving} className="sm:w-40">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </section>
  );
}
