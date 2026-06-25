import { Link } from "@tanstack/react-router";

export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 group">
      <div className="relative h-9 w-9 rounded-xl gradient-primary grid place-items-center shadow-glow">
        <span className="font-display text-lg font-bold text-white">C</span>
        <div className="absolute -inset-1 rounded-xl bg-[var(--aurora-cyan)] opacity-0 group-hover:opacity-20 blur-md transition" />
      </div>
      <div className="leading-tight">
        <div className="font-display font-bold text-lg tracking-tight">CampusPilot</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground -mt-0.5">AI</div>
      </div>
    </Link>
  );
}
