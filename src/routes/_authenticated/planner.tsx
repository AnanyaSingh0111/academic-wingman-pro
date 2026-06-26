import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { generateStudyPlan } from "@/lib/ai.functions";
import { useMemo, useState } from "react";
import { Plus, Sparkles, Loader2, Check, Trash2, Clock, BookOpen, Target, Pencil, CalendarClock, Flag, GraduationCap, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { format, isSameDay, addDays, startOfDay } from "date-fns";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({ meta: [{ title: "Study Planner — CampusPilot AI" }] }),
  component: PlannerPage,
});

type Task = {
  id: string;
  title: string;
  notes: string | null;
  description: string | null;
  scheduled_for: string;
  duration_min: number;
  completed: boolean;
  priority: "low" | "medium" | "high" | string;
  ai_generated: boolean;
  ai_instructions: string | null;
  learning_objective: string | null;
  subject_id: string | null;
  exam_id: string | null;
};
type Subject = { id: string; name: string; color: string };
type Exam = { id: string; title: string; exam_date: string };

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function PlannerPage() {
  const qc = useQueryClient();
  const runPlan = useServerFn(generateStudyPlan);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["study_tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("study_tasks").select("*").order("scheduled_for");
      if (error) throw error;
      return (data as Task[]) ?? [];
    },
  });
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id,name,color").order("name");
      if (error) throw error;
      return (data as Subject[]) ?? [];
    },
  });
  const { data: exams = [] } = useQuery<Exam[]>({
    queryKey: ["exams_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("id,title,exam_date").order("exam_date");
      if (error) throw error;
      return (data as Exam[]) ?? [];
    },
  });

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const examMap = useMemo(() => new Map(exams.map((e) => [e.id, e])), [exams]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", scheduled_for: "", duration_min: 60, subject_id: "", priority: "medium", description: "" });
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<Partial<Task>>({});

  const refresh = () => qc.invalidateQueries({ queryKey: ["study_tasks"] });

  const create = async () => {
    if (!form.title || !form.scheduled_for) { toast.error("Title and date required"); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("study_tasks").insert({
      user_id: u.user.id,
      title: form.title,
      scheduled_for: new Date(form.scheduled_for).toISOString(),
      duration_min: form.duration_min,
      subject_id: form.subject_id || null,
      priority: form.priority,
      description: form.description || null,
      ai_generated: false,
    } as never);
    if (error) toast.error(error.message);
    else {
      toast.success("Task added");
      setOpen(false);
      setForm({ title: "", scheduled_for: "", duration_min: 60, subject_id: "", priority: "medium", description: "" });
      refresh();
    }
  };

  const toggle = async (t: Task) => {
    await supabase.from("study_tasks").update({ completed: !t.completed } as never).eq("id", t.id);
    refresh();
    if (selected?.id === t.id) setSelected({ ...t, completed: !t.completed });
  };
  const remove = async (id: string) => {
    await supabase.from("study_tasks").delete().eq("id", id);
    refresh();
    if (selected?.id === id) setSelected(null);
  };
  const saveEdit = async () => {
    if (!selected) return;
    const payload: Record<string, unknown> = {
      title: edit.title ?? selected.title,
      description: edit.description ?? selected.description,
      duration_min: edit.duration_min ?? selected.duration_min,
      priority: edit.priority ?? selected.priority,
      subject_id: edit.subject_id ?? selected.subject_id,
      exam_id: edit.exam_id ?? selected.exam_id,
      learning_objective: edit.learning_objective ?? selected.learning_objective,
      scheduled_for: edit.scheduled_for ? new Date(edit.scheduled_for as string).toISOString() : selected.scheduled_for,
    };
    const { error } = await supabase.from("study_tasks").update(payload as never).eq("id", selected.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Task updated");
    setEditing(false);
    setEdit({});
    refresh();
    setSelected({ ...selected, ...(payload as Partial<Task>) } as Task);
  };

  const genPlan = async () => {
    setBusy(true);
    try {
      const r = await runPlan({ data: { days: 7 } });
      toast.success(`AI generated ${r.inserted} sessions`);
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  const days = Array.from({ length: 7 }).map((_, i) => addDays(startOfDay(new Date()), i));

  const subjectColor = (t: Task) => (t.subject_id && subjectMap.get(t.subject_id)?.color) || "#7C3AED";
  const subjectName = (t: Task) => (t.subject_id && subjectMap.get(t.subject_id)?.name) || t.notes || "Study";
  const examFor = (t: Task) => (t.exam_id && examMap.get(t.exam_id)) || null;

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
                <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>When</Label><Input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} /></div>
                  <div><Label>Duration (min)</Label><Input type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Subject</Label>
                    <Select value={form.subject_id || "none"} onValueChange={(v) => setForm({ ...form, subject_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
          const dayTasks = tasks.filter((t) => isSameDay(new Date(t.scheduled_for), d));
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
                {dayTasks.map((t) => {
                  const color = subjectColor(t);
                  return (
                    <div
                      key={t.id}
                      onClick={() => { setSelected(t); setEditing(false); }}
                      className={`group cursor-pointer rounded-lg border border-border/40 bg-card/40 p-2 text-xs transition hover:border-border hover:bg-card/70 ${t.completed ? "opacity-60" : ""}`}
                      style={{ borderLeft: `3px solid ${color}` }}
                    >
                      <div className="flex items-start gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggle(t); }}
                          className={`mt-0.5 h-3.5 w-3.5 rounded border border-border grid place-items-center ${t.completed ? "bg-[var(--aurora-cyan)]" : ""}`}
                        >
                          {t.completed && <Check className="h-2.5 w-2.5 text-background" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate ${t.completed ? "line-through" : ""}`}>{t.title}</div>
                          <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />{format(new Date(t.scheduled_for), "HH:mm")} · {t.duration_min}m
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <span className="inline-flex items-center gap-1 rounded px-1 py-px text-[9px]" style={{ backgroundColor: `${color}22`, color }}>
                              <BookOpen className="h-2.5 w-2.5" />{subjectName(t)}
                            </span>
                            {t.ai_generated && (
                              <span className="inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] bg-[var(--aurora-violet)]/20 text-[var(--aurora-violet)]">
                                <Sparkles className="h-2.5 w-2.5" />AI
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setEditing(false); setEdit({}); } }}>
        <DialogContent className="max-w-xl glass border-border/60">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subjectColor(selected) }} />
                  <Badge variant="outline" className={`text-[10px] ${PRIORITY_STYLES[selected.priority] ?? PRIORITY_STYLES.medium}`}>
                    <Flag className="h-3 w-3 mr-1" />{selected.priority}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${selected.completed ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-muted/40"}`}>
                    {selected.completed ? "Completed" : "Pending"}
                  </Badge>
                  {selected.ai_generated && (
                    <Badge variant="outline" className="text-[10px] bg-[var(--aurora-violet)]/20 text-[var(--aurora-violet)] border-[var(--aurora-violet)]/40">
                      <Sparkles className="h-3 w-3 mr-1" />AI Generated
                    </Badge>
                  )}
                </div>
                {editing ? (
                  <Input value={(edit.title as string) ?? selected.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className="text-lg font-semibold" />
                ) : (
                  <DialogTitle className="font-display text-2xl">{selected.title}</DialogTitle>
                )}
                <DialogDescription className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" />{subjectName(selected)}</span>
                  <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{format(new Date(selected.scheduled_for), "EEE, MMM d · HH:mm")}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{selected.duration_min} min</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                {editing ? (
                  <div className="space-y-3">
                    <div><Label>Description</Label><Textarea rows={3} value={(edit.description as string) ?? selected.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
                    <div><Label>Learning objective</Label><Input value={(edit.learning_objective as string) ?? selected.learning_objective ?? ""} onChange={(e) => setEdit({ ...edit, learning_objective: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>When</Label><Input type="datetime-local" value={(edit.scheduled_for as string) ?? format(new Date(selected.scheduled_for), "yyyy-MM-dd'T'HH:mm")} onChange={(e) => setEdit({ ...edit, scheduled_for: e.target.value })} /></div>
                      <div><Label>Duration (min)</Label><Input type="number" value={(edit.duration_min as number) ?? selected.duration_min} onChange={(e) => setEdit({ ...edit, duration_min: Number(e.target.value) })} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Subject</Label>
                        <Select value={(edit.subject_id as string) ?? selected.subject_id ?? "none"} onValueChange={(v) => setEdit({ ...edit, subject_id: v === "none" ? null : v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select value={(edit.priority as string) ?? selected.priority} onValueChange={(v) => setEdit({ ...edit, priority: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Exam</Label>
                        <Select value={(edit.exam_id as string) ?? selected.exam_id ?? "none"} onValueChange={(v) => setEdit({ ...edit, exam_id: v === "none" ? null : v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {selected.description && (
                      <section>
                        <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Description</h4>
                        <p className="text-foreground/90 whitespace-pre-wrap">{selected.description}</p>
                      </section>
                    )}
                    {selected.learning_objective && (
                      <section>
                        <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1 inline-flex items-center gap-1"><Target className="h-3 w-3" />Learning objective</h4>
                        <p className="text-foreground/90">{selected.learning_objective}</p>
                      </section>
                    )}
                    {selected.ai_instructions && (
                      <section className="rounded-lg border border-[var(--aurora-violet)]/30 bg-[var(--aurora-violet)]/5 p-3">
                        <h4 className="text-xs uppercase tracking-wider text-[var(--aurora-violet)] mb-1 inline-flex items-center gap-1"><Wand2 className="h-3 w-3" />AI study instructions</h4>
                        <p className="text-foreground/90 whitespace-pre-wrap">{selected.ai_instructions}</p>
                      </section>
                    )}
                    {examFor(selected) && (
                      <section>
                        <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-1 inline-flex items-center gap-1"><GraduationCap className="h-3 w-3" />Related exam</h4>
                        <p className="text-foreground/90">{examFor(selected)!.title} — {format(new Date(examFor(selected)!.exam_date), "MMM d, yyyy")}</p>
                      </section>
                    )}
                  </>
                )}
              </div>

              <DialogFooter className="flex-wrap gap-2 sm:justify-between">
                <Button variant="outline" size="sm" onClick={() => remove(selected.id)} className="text-rose-300 border-rose-500/30 hover:bg-rose-500/10">
                  <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                </Button>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEdit({}); }}>Cancel</Button>
                      <Button size="sm" onClick={saveEdit} className="gradient-primary text-white border-0">Save</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
                      <Button size="sm" onClick={() => toggle(selected)} className={selected.completed ? "" : "gradient-primary text-white border-0"} variant={selected.completed ? "outline" : "default"}>
                        <Check className="h-3.5 w-3.5 mr-1" />{selected.completed ? "Mark pending" : "Mark complete"}
                      </Button>
                    </>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
