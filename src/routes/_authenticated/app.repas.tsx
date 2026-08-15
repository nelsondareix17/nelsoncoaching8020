import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Check } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { analyzeMealPhoto } from "@/lib/meals.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile } from "@/hooks/useAuth";
import { todayISO } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/app/repas")({
  component: MealPage,
});

function MealPage() {
  const { data } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [count, setCount] = useState(0);

  async function handleFile(file: File) {
    if (!data) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${data.userId}/${crypto.randomUUID()}.${ext}`;

      const upload = await supabase.storage
        .from("meal-photos")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (upload.error) throw upload.error;

      const insert = await supabase
        .from("meal_photos")
        .insert({
          client_id: data.userId,
          image_path: path,
          entry_date: todayISO(),
          note: note.trim() || null,
        })
        .select("id")
        .single();
      if (insert.error) throw insert.error;

      setNote("");
      setCount((c) => c + 1);
      toast.success("Repas enregistré ✅");

      void analyzeMealPhoto({ data: { mealId: insert.data.id } }).catch(() => undefined);
    } catch {
      toast.error("Envoi impossible. Réessayez.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section className="space-y-6 pt-2">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Photo de mon repas</h1>
        <p className="text-sm text-muted-foreground">
          Prenez la photo, c'est enregistré. Aucun chiffre à gérer.
        </p>
      </div>

      {count > 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="size-4" />
          </span>
          <p className="text-sm font-medium">
            {count} repas envoyé{count > 1 ? "s" : ""} aujourd'hui
          </p>
        </div>
      ) : null}

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="note">Note (optionnel)</Label>
          <Input
            id="note"
            placeholder="Déjeuner au restaurant"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        <Button
          size="lg"
          className="h-16 w-full text-base"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <Camera className="mr-2 size-5" />
          {uploading ? "Envoi…" : "Prendre / choisir une photo"}
        </Button>
      </div>
    </section>
  );
}
