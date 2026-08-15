import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CalendarCheck, Camera, Footprints, Scale, User } from "lucide-react";

import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { useProfile, signOut } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/app")({
  component: ClientLayout,
});

const tabs = [
  { to: "/app", label: "Poids", icon: Scale },
  { to: "/app/repas", label: "Repas", icon: Camera },
  { to: "/app/activite", label: "Activité", icon: Footprints },
  { to: "/app/historique", label: "Suivi", icon: CalendarCheck },
  { to: "/app/compte", label: "Compte", icon: User },
] as const;

function ClientLayout() {
  const { data } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (data?.profile.role === "coach") void navigate({ to: "/coach" });
  }, [data?.profile.role, navigate]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <Brand subtitle={data?.profile.full_name || "Espace client"} />
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          Quitter
        </Button>
      </header>

      <main className="flex-1 px-5 pb-28">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-border bg-card/95 backdrop-blur">
        <ul className="grid grid-cols-5">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/app" }}
                activeProps={{ className: "text-foreground" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="flex flex-col items-center gap-1 py-3 text-[11px] font-medium"
              >
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
