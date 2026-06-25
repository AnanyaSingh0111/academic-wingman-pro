import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard, CalendarDays, BookOpen, ClipboardCheck, ListTodo,
  Timer, Bot, FileText, Settings, LogOut, type LucideIcon,
} from "lucide-react";
import { Aurora } from "./Aurora";
import type { ReactNode } from "react";

const nav: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/planner", label: "Study Planner", icon: CalendarDays },
  { to: "/notes", label: "Notes", icon: BookOpen },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/assignments", label: "Assignments", icon: ListTodo },
  { to: "/exams", label: "Exams", icon: Timer },
  { to: "/doubt-solver", label: "Doubt Solver", icon: Bot },
  { to: "/resume", label: "Resume ATS", icon: FileText },
];

export function AppShell({ children, title, subtitle, actions }: {
  children: ReactNode; title?: string; subtitle?: string; actions?: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const initials = (user?.user_metadata?.full_name || user?.email || "U").slice(0, 1).toUpperCase();

  return (
    <div className="relative min-h-screen flex">
      <Aurora className="opacity-60" />
      {/* Sidebar */}
      <aside className="relative z-10 hidden md:flex w-64 flex-col gap-1 border-r border-border/60 glass-strong p-4">
        <div className="px-2 py-2"><Logo /></div>
        <nav className="mt-4 flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_oklch(0.62_0.22_295_/_0.35)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <item.icon className={`h-4 w-4 ${active ? "text-[var(--aurora-cyan)]" : ""}`} />
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--aurora-cyan)]" />}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <Link to="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground">
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <div className="mt-2 glass rounded-2xl p-3 flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-primary/40">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/20">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user?.user_metadata?.full_name || user?.email?.split("@")[0]}</div>
              <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="relative z-10 flex-1 min-w-0">
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/40 border-b border-border/50">
          <div className="px-6 py-4 flex items-center gap-4">
            <div className="md:hidden"><Logo /></div>
            <div className="flex-1 min-w-0">
              {title && <h1 className="font-display text-2xl font-bold tracking-tight truncate">{title}</h1>}
              {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
            </div>
            {actions}
          </div>
        </header>
        <div className="px-6 py-8 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
