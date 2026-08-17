import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovableSignInWithGoogle } from "@/lib/google-auth";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "80/20 — Connexion coach & client" },
      {
        name: "description",
        content:
          "Connectez-vous à 80/20 : saisie rapide pour les clients, suivi complet du poids, des calories et de l'activité pour le coach.",
      },
      { property: "og:title", content: "80/20 — Connexion coach & client" },
      {
        property: "og:description",
        content: "Saisie rapide côté client, analyse complète côté coach.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"client" | "coach">("client");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) void goToSpace(navigate);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await goToSpace(navigate);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, role },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await goToSpace(navigate);
    } else {
      toast.success("Compte créé. Vérifiez votre e-mail pour confirmer.");
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const ok = await lovableSignInWithGoogle();
    if (!ok) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await goToSpace(navigate);
    }
    setLoading(false);
  }

  function GoogleBlock() {
    return (
      <div className="space-y-3 pt-6">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
          Continuer avec Google
        </Button>
      </div>
    );
  }


  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-6 py-12">
      <header className="space-y-6">
        <Brand subtitle="Suivi coaching" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Le suivi, sans obsession des chiffres</h1>
          <p className="text-sm text-muted-foreground">
            Le client saisit. Le coach analyse. Rien de plus.
          </p>
        </div>
      </header>

      <Tabs defaultValue="signin">
        <TabsList className="w-full">
          <TabsTrigger className="flex-1" value="signin">
            Connexion
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="signup">
            Créer un compte
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="pt-6">
          <form className="space-y-4" onSubmit={handleSignIn}>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              Se connecter
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup" className="pt-6">
          <form className="space-y-4" onSubmit={handleSignUp}>
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email2">E-mail</Label>
              <Input
                id="email2"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password2">Mot de passe</Label>
              <Input
                id="password2"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Je suis</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["client", "coach"] as const).map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant={role === r ? "default" : "outline"}
                    onClick={() => setRole(r)}
                  >
                    {r === "client" ? "Client" : "Coach"}
                  </Button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              Créer mon compte
            </Button>
          </form>
          <GoogleBlock />
        </TabsContent>
      </Tabs>

    </main>
  );
}

async function goToSpace(navigate: ReturnType<typeof useNavigate>) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  await navigate({ to: data?.role === "coach" ? "/coach" : "/app" });
}
