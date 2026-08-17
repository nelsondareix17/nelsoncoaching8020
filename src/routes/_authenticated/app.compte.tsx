import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile, signOut } from "@/hooks/useAuth";
import {
  disableReminders,
  enableReminders,
  getExistingSubscription,
  pushSupported,
} from "@/lib/push";

export const Route = createFileRoute("/_authenticated/app/compte")({
  component: AccountPage,
});

function AccountPage() {
  const { data } = useProfile();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [coachCode, setCoachCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const supported = pushSupported();

  useEffect(() => {
    if (data) setName(data.profile.full_name);
  }, [data]);

  useEffect(() => {
    void getExistingSubscription().then((sub) => setPushOn(Boolean(sub)));
  }, []);

  async function toggleReminders() {
    if (!data) return;
    setPushBusy(true);
    try {
      if (pushOn) {
        await disableReminders();
        setPushOn(false);
        toast.success("Rappels désactivés.");
      } else {
        await enableReminders(data.userId);
        setPushOn(true);
        toast.success("Rappels activés ✅");
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      toast.error(
        code === "denied"
          ? "Autorisation refusée dans les réglages du navigateur."
          : "Activation impossible sur cet appareil.",
      );
    } finally {
      setPushBusy(false);
    }
  }


  async function saveName() {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name })
      .eq("id", data.userId);
    setSaving(false);
    if (error) {
      toast.error("Enregistrement impossible.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profil mis à jour ✅");
  }

  async function joinCoach() {
    if (!data) return;
    const code = coachCode.trim();
    if (code.length < 10) {
      toast.error("Code coach invalide.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ coach_id: code })
      .eq("id", data.userId);
    setSaving(false);
    if (error) {
      toast.error("Code coach introuvable.");
      return;
    }
    setCoachCode("");
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Coach rattaché ✅");
  }

  return (
    <section className="space-y-6 pt-2">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Mon compte</h1>
        <p className="text-sm text-muted-foreground">{data?.email}</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nom complet</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button className="w-full" onClick={saveName} disabled={saving}>
          Enregistrer
        </Button>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Mon coach</p>
          <p className="text-xs text-muted-foreground">
            {data?.profile.coach_id
              ? "Vous êtes rattaché à votre coach."
              : "Collez le code fourni par votre coach pour partager vos saisies."}
          </p>
        </div>
        {data?.profile.coach_id ? null : (
          <div className="flex gap-2">
            <Input
              placeholder="Code coach"
              value={coachCode}
              onChange={(e) => setCoachCode(e.target.value)}
            />
            <Button onClick={joinCoach} disabled={saving}>
              Lier
            </Button>
          </div>
        )}
      </div>

      <Button variant="outline" className="w-full" onClick={() => void signOut()}>
        Se déconnecter
      </Button>
    </section>
  );
}
