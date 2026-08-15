import { toast } from "sonner";

/**
 * Connexion Google via le module managé Lovable.
 * Retourne true si la session est établie ou si une redirection est en cours.
 */
export async function lovableSignInWithGoogle(): Promise<boolean> {
  try {
    const mod = await import("@/integrations/lovable/index");
    const result = await mod.lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Connexion Google impossible pour le moment.");
      return false;
    }
    return true;
  } catch {
    toast.error("Connexion Google indisponible.");
    return false;
  }
}
