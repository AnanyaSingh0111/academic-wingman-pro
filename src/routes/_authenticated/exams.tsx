import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Plus, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: [{ title: "Exams — CampusPilot AI" }] }),
  component: ExamsPage,
});

type Exam = { id: string; title: string; exam_date: string; syllabus: string | null; readiness: number };

function ExamsPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery<Exam[]>({
    queryKey: ["exams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("*").order("exam_date");
      if (error) throw error;
      return (data as Exam[]) ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", exam_date: "", syllabus: "" });
  const create = async () => {
    if (!form.title || !form.exam_date) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("exams").insert({
      user_id: u.user.id, title: form.title, exam_date: new Date(form.exam_date).toISOString(), syllabus: form.syllabus || null,
    });
    if (error) toast.error(error.message); else { toast.success("Exam added"); setOpen(false); setForm({ title: "", exam_date: "", syllabus: "" }); qc.invalidateQueries({ queryKey: ["exams"] }); }
  };
  const setReadiness = async (id: string, readiness: number) => {
    const { error } = await supabase.from("exams").update({ readiness }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["exams"] });
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["exams"] });
  };

  return (
    <AppShell title="Exam Countdown" subtitle="Live timers and readiness for every paper."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1" />New exam</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule an exam</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="DBMS Mid-term" /></div>
              <div><Label>Date & time</Label><Input type="datetime-local" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} /></div>
              <div><Label>Syllabus / notes</Label><Textarea value={form.syllabus} onChange={(e) => setForm({ ...form, syllabus: e.target.value })} placeholder="Units 1-4, joins, normalization..." /></div>
            </div>
            <DialogFooter><Button onClick={create} className="gradient-primary text-white border-0">Add exam</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {data.length === 0 ? (
        <Card className="glass border-border/50 p-10 text-center text-muted-foreground">Schedule an exam to start the countdown.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((e) => (
            <Card key={e.id} className="glass border-border/50 p-6 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full gradient-primary opacity-20 blur-3xl" />
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold">{e.title}</h3>
                  <p className="text-xs text-muted-foreground">{new Date(e.exam_date).toLocaleString()}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              </div>
              <Countdown target={e.exam_date} />
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Readiness</span><span className="font-semibold">{e.readiness}%</span></div>
                <Progress value={e.readiness} className="mt-1.5" />
                <Slider className="mt-3" defaultValue={[e.readiness]} min={0} max={100} step={5} onValueCommit={(v) => setReadiness(e.id, v[0])} />
              </div>
              {e.syllabus && <p className="mt-4 text-xs text-muted-foreground line-clamp-3 border-t border-border/40 pt-3">{e.syllabus}</p>}
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  return (
    <div className="mt-4 flex items-center gap-3">
      <Timer className="h-5 w-5 text-[var(--aurora-cyan)]" />
      <div className="grid grid-cols-4 gap-2 flex-1">
        {[{ v: d, l: "days" }, { v: h, l: "hrs" }, { v: m, l: "min" }, { v: s, l: "sec" }].map((x) => (
          <div key={x.l} className="text-center rounded-lg bg-white/5 py-2">
            <div className="font-display text-xl font-bold tabular-nums">{String(x.v).padStart(2, "0")}</div>
            <div className="text-[10px] uppercase text-muted-foreground">{x.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
