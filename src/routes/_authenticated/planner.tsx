import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateStudyPlan } from "@/lib/ai.functions";
import { useState } from "react";
import { Plus, Sparkles, Loader2, Check, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, isSameDay, addDays, startOfDay } from "date-fns";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [{ title: "Study Planner — CampusPilot AI" }] }),
  component: PlannerPage,
});

type Task = { id: string; title: string; notes: string | null; scheduled_for: string; duration_min: number; completed: boolean };

function PlannerPage() {
  const qc = useQueryClient();
  const runPlan = useServerFn(generateStudyPlan);
  const { data = [] } = useQuery<Task[]>({
    queryKey: ["study_tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("study_tasks").select("*").order("scheduled_for");
      if (error) throw error;
      return (data as Task[]) ?? [];
    },
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", scheduled_for: "", duration_min: 60 });
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!form.title || !form.scheduled_for) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("study_tasks").insert({
      user_id: u.user.id, title: form.title,
      scheduled_for: new Date(form.scheduled_for).toISOString(),
      duration_min: form.duration_min,
    });
    if (error) toast.error(error.message);
    else { toast.success("Task added"); setOpen(false); setForm({ title: "", scheduled_for: "", duration_min: 60 }); qc.invalidateQueries({ queryKey: ["study_tasks"] }); }
  };
  const toggle = async (t: Task) => {
    await supabase.from("study_tasks").update({ completed: !t.completed }).eq("id", t.id);
    qc.invalidateQueries({ queryKey: ["study_tasks"] });
  };
  const remove = async (id: string) => {
    await supabase.from("study_tasks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["study_tasks"] });
  };
  const genPlan = async () => {
    setBusy(true);
    try {
      const r = await runPlan({ data: { days: 7 } });
      toast.success(`AI generated ${r.inserted} sessions`);
      qc.invalidateQueries({ queryKey: ["study_tasks"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  const days = Array.from({ length: 7 }).map((_, i) => addDays(startOfDay(new Date()), i));

  return (
    <AppShell title="Study Planner" subtitle="A 7-day plan you'll actually follow."
      actions={
        <div className="flex gap-2">
          <Button disabled={busy} onClick={genPlan} variant="outline" className="glass border-border/60">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} AI plan
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1" />Task</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New study task</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>When</Label><Input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} /></div>
                  <div><Label>Duration (min)</Label><Input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} /></div>
                </div>
              </div>
              <DialogFooter><Button onClick={create} className="gradient-primary text-white border-0">Add</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((d) => {
          const dayTasks = data.filter((t) => isSameDay(new Date(t.scheduled_for), d));
          const done = dayTasks.filter((t) => t.completed).length;
          return (
            <Card key={d.toISOString()} className="glass border-border/50 p-3 min-h-[280px]">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, "EEE")}</div>
                  <div className="font-display text-lg font-bold">{format(d, "d")}</div>
                </div>
                {dayTasks.length > 0 && <div className="text-[10px] text-muted-foreground">{done}/{dayTasks.length}</div>}
              </div>
              <div className="mt-3 space-y-2">
                {dayTasks.length === 0 && <p className="text-[10px] text-muted-foreground">—</p>}
                {dayTasks.map((t) => (
                  <div key={t.id} className={`group rounded-lg border border-border/40 p-2 text-xs ${t.completed ? "opacity-60 line-through" : ""}`}>
                    <div className="flex items-start gap-1.5">
                      <button onClick={() => toggle(t)} className={`mt-0.5 h-3.5 w-3.5 rounded border border-border grid place-items-center ${t.completed ? "bg-[var(--aurora-cyan)]" : ""}`}>
                        {t.completed && <Check className="h-2.5 w-2.5 text-background" />}
                      </button>
                      <div className="flex-1 min-w-0"><div className="font-medium truncate">{t.title}</div>
                        <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{format(new Date(t.scheduled_for), "HH:mm")} · {t.duration_min}m</div>
                      </div>
                      <button onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
