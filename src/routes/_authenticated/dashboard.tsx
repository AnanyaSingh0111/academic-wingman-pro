import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import {
  Brain, Zap, Target, Trophy, Timer, ListTodo, ClipboardCheck,
  ArrowUpRight, Sparkles, CalendarDays,
} from "lucide-react";
import { xpProgress } from "@/lib/xp";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CampusPilot AI" }] }),
  component: Dashboard,
});

function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const uid = u.user.id;
      const [profile, exams, assignments, attendance, tasks, achievements] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).single(),
        supabase.from("exams").select("*").gte("exam_date", new Date().toISOString()).order("exam_date").limit(3),
        supabase.from("assignments").select("*").neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(5),
        supabase.from("attendance_records").select("status,subject_id"),
        supabase.from("study_tasks").select("*").gte("scheduled_for", new Date(Date.now() - 86400000).toISOString()).order("scheduled_for").limit(6),
        supabase.from("achievements").select("*").order("earned_at", { ascending: false }).limit(6),
      ]);
      const total = attendance.data?.length ?? 0;
      const present = attendance.data?.filter((r: { status: string }) => r.status === "present").length ?? 0;
      const attendancePct = total ? Math.round((present / total) * 100) : 0;
      const doneTasks = tasks.data?.filter((t: { completed: boolean }) => t.completed).length ?? 0;
      const productivity = tasks.data?.length ? Math.round((doneTasks / tasks.data.length) * 100) : 0;
      return {
        profile: profile.data,
        exams: exams.data ?? [],
        assignments: assignments.data ?? [],
        attendancePct,
        tasks: tasks.data ?? [],
        achievements: achievements.data ?? [],
        productivity,
      };
    },
  });
}

function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboardData();
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
  const xp = data?.profile?.xp ?? 0;
  const streak = data?.profile?.streak ?? 0;
  const { lvl, pct } = xpProgress(xp);
  const placementReadiness = Math.min(100, Math.round((xp / 10) + (data?.productivity ?? 0) / 2));

  return (
    <AppShell title={`Hello, ${name} 👋`} subtitle="Here's what your campus life looks like today.">
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="h-32 animate-pulse bg-card/40 border-border/40" />)}</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={Brain} label="Productivity" value={`${data?.productivity ?? 0}`} suffix="/100" tint="from-violet-500/30 to-cyan-400/15" />
            <KpiCard icon={Target} label="Placement Ready" value={`${placementReadiness}`} suffix="%" tint="from-cyan-400/30 to-fuchsia-500/15" />
            <KpiCard icon={Zap} label="Study Streak" value={`${streak}`} suffix=" days" tint="from-fuchsia-500/30 to-violet-500/15" />
            <KpiCard icon={Trophy} label={`Level ${lvl}`} value={`${xp}`} suffix=" XP" tint="from-amber-500/30 to-rose-500/15" progress={pct} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {/* Exam countdowns */}
            <Card className="lg:col-span-2 glass border-border/50 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Timer className="h-4 w-4 text-[var(--aurora-cyan)]" /> Upcoming exams</h2>
                <Link to="/exams" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center">View all <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
              </div>
              <div className="mt-4 space-y-3">
                {data?.exams.length === 0 && <Empty msg="No exams scheduled. Add one to start the countdown." href="/exams" />}
                {data?.exams.map((e: { id: string; title: string; exam_date: string; readiness: number }) => {
                  const days = Math.ceil((new Date(e.exam_date).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={e.id} className="rounded-xl border border-border/50 p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl gradient-primary grid place-items-center text-white font-display font-bold">{days}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{e.title}</div>
                        <div className="text-xs text-muted-foreground">in {days} days · {new Date(e.exam_date).toLocaleDateString()}</div>
                      </div>
                      <div className="w-32"><Progress value={e.readiness} /><div className="text-[10px] text-right mt-1 text-muted-foreground">{e.readiness}% ready</div></div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Attendance ring */}
            <Card className="glass border-border/50 p-6 flex flex-col">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-[var(--aurora-cyan)]" /> Attendance</h2>
              <div className="mt-6 flex-1 grid place-items-center">
                <Ring pct={data?.attendancePct ?? 0} />
              </div>
              <Link to="/attendance" className="mt-4 text-xs text-center text-muted-foreground hover:text-foreground">Mark today's classes →</Link>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {/* Today's plan */}
            <Card className="glass border-border/50 p-6 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[var(--aurora-cyan)]" /> Today's plan</h2>
                <Link to="/planner" className="text-xs text-muted-foreground hover:text-foreground">Open planner →</Link>
              </div>
              <div className="mt-4 space-y-2">
                {data?.tasks.length === 0 && <Empty msg="No tasks yet — generate a study plan with AI." href="/planner" />}
                {data?.tasks.map((t: { id: string; title: string; scheduled_for: string; duration_min: number; completed: boolean }) => (
                  <div key={t.id} className={`rounded-xl border border-border/50 p-3 flex items-center gap-3 ${t.completed ? "opacity-60 line-through" : ""}`}>
                    <div className="h-2 w-2 rounded-full bg-[var(--aurora-cyan)]" />
                    <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{t.title}</div><div className="text-xs text-muted-foreground">{new Date(t.scheduled_for).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {t.duration_min} min</div></div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Assignments */}
            <Card className="glass border-border/50 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2"><ListTodo className="h-4 w-4 text-[var(--aurora-cyan)]" /> Open assignments</h2>
              </div>
              <div className="mt-4 space-y-3">
                {data?.assignments.length === 0 && <Empty msg="All caught up." href="/assignments" />}
                {data?.assignments.map((a: { id: string; title: string; due_date: string | null; priority: string }) => (
                  <Link key={a.id} to="/assignments" className="block rounded-xl border border-border/50 p-3 hover:bg-white/5 transition">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate flex-1">{a.title}</div>
                      <Badge variant="outline" className={priorityColor(a.priority)}>{a.priority}</Badge>
                    </div>
                    {a.due_date && <div className="text-xs text-muted-foreground mt-1">due {formatDistanceToNow(new Date(a.due_date), { addSuffix: true })}</div>}
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          {/* Achievements */}
          <Card className="glass border-border/50 p-6 mt-6">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-[var(--aurora-cyan)]" /> Achievements</h2>
            {data?.achievements.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Earn your first badge by completing a task today.</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                {data?.achievements.map((a: { id: string; title: string; description: string | null }) => (
                  <div key={a.id} className="glass rounded-xl px-4 py-3">
                    <div className="text-sm font-medium">{a.title}</div>
                    {a.description && <div className="text-xs text-muted-foreground">{a.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </AppShell>
  );
}

function KpiCard({ icon: Icon, label, value, suffix, tint, progress }: { icon: typeof Brain; label: string; value: string; suffix?: string; tint: string; progress?: number }) {
  return (
    <Card className={`relative overflow-hidden border-border/50 p-5 bg-gradient-to-br ${tint} glass`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className="mt-2 font-display text-4xl font-bold">{value}<span className="text-base font-medium text-muted-foreground">{suffix}</span></div>
      {typeof progress === "number" && <Progress value={progress} className="mt-3" />}
    </Card>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 56, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return (
    <div className="relative h-40 w-40">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="12" fill="none" />
        <circle cx="70" cy="70" r={r} stroke="url(#g)" strokeWidth="12" strokeLinecap="round" fill="none" strokeDasharray={c} strokeDashoffset={off} />
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#22D3EE" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center"><div className="text-center"><div className="font-display text-4xl font-bold">{pct}%</div><div className="text-xs text-muted-foreground">overall</div></div></div>
    </div>
  );
}

function Empty({ msg, href }: { msg: string; href: string }) {
  return <Link to={href} className="block rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground hover:bg-white/5">{msg}</Link>;
}

function priorityColor(p: string) {
  if (p === "high") return "border-rose-500/40 text-rose-300 bg-rose-500/10";
  if (p === "medium") return "border-amber-500/40 text-amber-300 bg-amber-500/10";
  return "border-cyan-500/40 text-cyan-300 bg-cyan-500/10";
}
