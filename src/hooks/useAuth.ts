import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string;
  role: "client" | "coach";
  coach_id: string | null;
};

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<{ userId: string; email: string | null; profile: Profile } | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, coach_id")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;

      const profile: Profile =
        (data as Profile | null) ?? { id: user.id, full_name: "", role: "client", coach_id: null };

      return { userId: user.id, email: user.email ?? null, profile };
    },
    staleTime: 30_000,
  });
}

export async function signOut() {
  await supabase.auth.signOut();
}
