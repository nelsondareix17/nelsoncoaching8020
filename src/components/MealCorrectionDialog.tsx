import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type CoachMeal = {
  id: string;
  url: string | null;
  note: string | null;
  taken_at: string;
  entry_date: string;
  calories_raw: number | null;
  calories_final: number | null;
  calories_source: string;
  analysis_status: string;
  detected_items?: unknown;
  total_protein_g?: number | null;
  total_carbs_g?: number | null;
  total_fat_g?: number | null;
};


export function MealCorrectionDialog({
  meal,
  open,
  onOpenChange,
  onSaved,
}: {
  meal: CoachMeal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next && meal) setValue(String(meal.calories_final ?? ""));
    onOpenChange(next);
  }

  async function save() {
    if (!meal) return;
    const kcal = Number(value);
    if (!Number.isFinite(kcal) || kcal <= 0 || kcal > 20000) {
      toast.error("Valeur calorique invalide.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("meal_photos")
      .update({ calories_final: Math.round(kcal), analysis_status: "done" })
      .eq("id", meal.id);
    setSaving(false);
    if (error) {
      toast.error("Correction impossible.");
      return;
    }
    toast.success("Calories corrigées ✅");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Corriger l'estimation</DialogTitle>
          <DialogDescription>
            Le client ne voit jamais cette valeur. L'estimation brute de l'IA est conservée.
          </DialogDescription>
        </DialogHeader>

        {meal?.url ? (
          <img
            src={meal.url}
            alt={meal.note ?? "Photo de repas du client"}
            className="max-h-72 w-full rounded-xl border border-border object-contain"
          />
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="kcal">Calories affichées</Label>
          <Input
            id="kcal"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Estimation IA d'origine :{" "}
            {meal?.calories_raw ? `${meal.calories_raw} kcal (brut)` : "indisponible"}
            {meal?.calories_source === "coach" ? " · déjà corrigée manuellement" : null}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
