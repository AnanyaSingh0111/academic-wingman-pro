import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Check, X, Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { computeAttendance } from "@/lib/attendance";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: [{ title: "Attendance — CampusPilot AI" }] }),
  component: AttendancePage,
});

type Subject = { id: string; name: string; color: string; target_attendance: number };
type Rec = { id: string; subject_id: string; status: "present" | "absent" | "cancelled"; date: string };

function AttendancePage() {
  const qc = useQueryClient();
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("name");
      if (error) throw error;
      return (data as Subject[]) ?? [];
    },
  });
  const { data: records = [] } = useQuery<Rec[]>({
    queryKey: ["attendance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance_records").select("*");
      if (error) throw error;
      return (data as Rec[]) ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState(75);

  const addSubject = async () => {
    if (!name.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const palette = ["#7C3AED", "#22D3EE", "#F472B6", "#F59E0B", "#22C55E", "#EF4444"];
    const color = palette[subjects.length % palette.length];
    const { error } = await supabase.from("subjects").insert({ user_id: u.user.id, name, color, target_attendance: target });
    if (error) toast.error(error.message); else { toast.success("Subject added"); setName(""); setOpen(false); qc.invalidateQueries({ queryKey: ["subjects"] }); }
  };

  const mark = async (subject_id: string, status: Rec["status"]) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("attendance_records").insert({ user_id: u.user.id, subject_id, status });
    if (error) toast.error(error.message); else { qc.invalidateQueries({ queryKey: ["attendance"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); toast.success(`Marked ${status}`); }
  };

  const removeSubject = async (id: string) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) toast.error(error.message); else { qc.invalidateQueries({ queryKey: ["subjects"] }); qc.invalidateQueries({ queryKey: ["attendance"] }); }
  };

  return (
    <AppShell title="Attendance" subtitle="Track every class. Know exactly how many you can skip."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1" /> Add subject</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New subject</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="DBMS" /></div>
              <div><Label>Target attendance %</Label><Input type="number" min={50} max={100} value={target} onChange={(e) => setTarget(Number(e.target.value))} /></div>
            </div>
            <DialogFooter><Button onClick={addSubject} className="gradient-primary text-white border-0">Add</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {subjects.length === 0 ? (
        <Card className="glass border-border/50 p-10 text-center">
          <p className="text-muted-foreground">No subjects yet. Add your first subject to start tracking.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => {
            const recs = records.filter((r) => r.subject_id === s.id);
            const stats = computeAttendance(recs);
            const { present, counted: total, percentage: pct } = stats;
            const need = stats.hasClasses ? neededClasses(present, total, s.target_attendance) : "No classes yet — mark your first.";
            return (
              <Card key={s.id} className="glass border-border/50 p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: s.color }} />
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">Target {s.target_attendance}%</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeSubject(s.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <div className="font-display text-4xl font-bold">{pct}<span className="text-xl text-muted-foreground">%</span></div>
                  <div className="text-xs text-muted-foreground">{present}/{total} classes</div>
                </div>
                <Progress value={pct} className="mt-2" />
                <p className="mt-3 text-xs text-muted-foreground">{need}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" onClick={() => mark(s.id, "present")} className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"><Check className="h-4 w-4 mr-1" />Present</Button>
                  <Button size="sm" variant="outline" onClick={() => mark(s.id, "absent")} className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"><X className="h-4 w-4 mr-1" />Absent</Button>
                  <Button size="sm" variant="outline" onClick={() => mark(s.id, "cancelled")} className="border-border"><Ban className="h-4 w-4 mr-1" />Off</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function neededClasses(present: number, total: number, target: number) {
  const pct = total ? (present / total) * 100 : 0;
  if (total === 0) return "Mark your first class.";
  if (pct >= target) {
    const canSkip = Math.floor((present * 100) / target) - total;
    return canSkip > 0 ? `You can skip ${canSkip} more class${canSkip === 1 ? "" : "es"}.` : "On target — don't skip.";
  }
  const need = Math.ceil((target * total - 100 * present) / (100 - target));
  return `Attend next ${need} class${need === 1 ? "" : "es"} to hit ${target}%.`;
}
