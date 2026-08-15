/**
 * Emplacement réservé au logo. Remplacer le bloc <span> par une balise <img>
 * (ex: import logo from "@/assets/logo.png") sans toucher au reste de l'app.
 */
export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-[11px] font-extrabold tracking-tight text-secondary-foreground"
      >
        80/20
      </span>
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-tight">80/20</p>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}
