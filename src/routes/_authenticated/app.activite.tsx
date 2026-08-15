import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Activity, HeartPulse } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfile } from "@/hooks/useAuth";
import { todayISO } from "@/lib/dates";
import { syncHealthSteps, healthPlatformLabel } from "@/lib/health";

export const Route = createFileRoute("/_authenticated/app/activite")({
  component: ActivityPage,
});

const WORKOUT_TYPES = ["Musculation", "Cardio", "HIIT", "Séance coach", "Sport collectif", "Autre"];

function ActivityPage() {
  const { data } = useProfile();
  const [steps, setSteps] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [type, setType] = useState(WORKOUT_TYPES[0]!);
  const [duration, setDuration] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveSteps(value: number, source: "manual" | "health") {
    if (!data) return;
    const { error } = await supabase.from("activity_entries").upsert(
      { client_id: data.userId, entry_date: todayISO(), steps: value, source },
      { onConflict: "client_id,entry_date" },
    );
    if (error) {
      toast.error("Enregistrement impossible.");
      return;
    }
    setSteps("");
    toast.success("Activité enregistrée ✅");
  }

  async function handleSync() {
    setSyncing(true);
    const result = await syncHealthSteps();
    setSyncing(false);
    if (!result.available) {
      toast.info(result.message);
      return;
    }
    await saveSteps(result.steps, "health");
  }

  async function saveWorkout(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    const minutes = Number(duration);
    if (!minutes || minutes <= 0) {
      toast.error("Indiquez une durée en minutes.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("workouts").insert({
      client_id: data.userId,
      entry_date: todayISO(),
      workout_type: type,
      duration_min: minutes,
      note: note.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Enregistrement impossible.");
      return;
    }
    setDuration("");
    setNote("");
    toast.success("Séance enregistrée ✅");
  }

  return (
    <section className="space-y-6 pt-2">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Mon activité</h1>
        <p className="text-sm text-muted-foreground">
          Pas synchronisés automatiquement, séances ajoutées à la main.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <HeartPulse className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Pas quotidiens</p>
        </div>
        <Button variant="outline" className="w-full" onClick={handleSync} disabled={syncing}>
          {syncing ? "Synchronisation…" : `Synchroniser ${healthPlatformLabel()}`}
        </Button>
        <div className="space-y-2">
          <Label htmlFor="steps">Sinon, saisie manuelle</Label>
          <div className="flex gap-2">
            <Input
              id="steps"
              inputMode="numeric"
              placeholder="8 500"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
            />
            <Button
              onClick={() => {
                const value = Number(steps.replace(/\s/g, ""));
                if (!value || value < 0) {
                  toast.error("Nombre de pas invalide.");
                  return;
                }
                void saveSteps(value, "manual");
              }}
            >
              OK
            </Button>
          </div>
        </div>
      </div>

      <form onSubmit={saveWorkout} className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Ajouter une séance</p>
        </div>
        <div className="space-y-2">
          <Label>Type de séance</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORKOUT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Durée (minutes)</Label>
          <Input
            id="duration"
            inputMode="numeric"
            placeholder="45"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wnote">Note (optionnel)</Label>
          <Textarea
            id="wnote"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ressenti, charges…"
          />
        </div>
        <Button type="submit" className="w-full" disabled={saving}>
          Enregistrer la séance
        </Button>
      </form>
    </section>
  );
}
