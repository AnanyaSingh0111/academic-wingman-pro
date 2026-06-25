import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Check, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/assignments")({
  head: () => ({ meta: [{ title: "Assignments — CampusPilot AI" }] }),
  component: AssignmentsPage,
});

type A = { id: string; title: string; description: string | null; due_date: string | null; priority: "low" | "medium" | "high"; status: "todo" | "in_progress" | "done" };
const COLS: { key: A["status"]; title: string; tint: string }[] = [
  { key: "todo", title: "To do", tint: "from-slate-500/10 to-slate-500/5" },
  { key: "in_progress", title: "In progress", tint: "from-violet-500/15 to-cyan-400/10" },
  { key: "done", title: "Done", tint: "from-emerald-500/15 to-emerald-500/5" },
];

function AssignmentsPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery<A[]>({
    queryKey: ["assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assignments").select("*").order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as A[]) ?? [];
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", priority: "medium" as A["priority"] });

  const create = async () => {
    if (!form.title.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("assignments").insert({
      user_id: u.user.id,
      title: form.title,
      description: form.description || null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      priority: form.priority,
    });
    if (error) toast.error(error.message);
    else { toast.success("Assignment added"); setOpen(false); setForm({ title: "", description: "", due_date: "", priority: "medium" }); qc.invalidateQueries({ queryKey: ["assignments"] }); }
  };

  const setStatus = async (id: string, status: A["status"]) => {
    const { error } = await supabase.from("assignments").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["assignments"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["assignments"] });
  };

  return (
    <AppShell title="Assignments" subtitle="Your kanban board for every deadline."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1" />New</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New assignment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Due date</Label><Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as A["priority"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={create} className="gradient-primary text-white border-0">Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        {COLS.map((col) => {
          const items = data.filter((a) => a.status === col.key);
          return (
            <Card key={col.key} className={`glass border-border/50 p-4 bg-gradient-to-b ${col.tint} min-h-[60vh]`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold">{col.title}</h3>
                <Badge variant="outline">{items.length}</Badge>
              </div>
              <div className="space-y-3">
                {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Drop tasks here.</p>}
                {items.map((a) => (
                  <div key={a.id} className="rounded-xl border border-border/50 bg-card/50 p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{a.title}</div>
                        {a.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</div>}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={priorityColor(a.priority)}>{a.priority}</Badge>
                          {a.due_date && <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(a.due_date), "MMM d, p")}</span>}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                    </div>
                    <div className="mt-2 flex gap-1">
                      {col.key !== "todo" && <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setStatus(a.id, prev(col.key))}>← {colLabel(prev(col.key))}</Button>}
                      {col.key !== "done" && <Button size="sm" variant="ghost" className="text-xs h-7 ml-auto" onClick={() => setStatus(a.id, next(col.key))}>{colLabel(next(col.key))} →</Button>}
                      {col.key === "in_progress" && <Button size="sm" className="text-xs h-7 ml-auto gradient-primary text-white border-0" onClick={() => setStatus(a.id, "done")}><Check className="h-3 w-3 mr-1" />Done</Button>}
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

function priorityColor(p: string) {
  if (p === "high") return "border-rose-500/40 text-rose-300 bg-rose-500/10";
  if (p === "medium") return "border-amber-500/40 text-amber-300 bg-amber-500/10";
  return "border-cyan-500/40 text-cyan-300 bg-cyan-500/10";
}
function next(s: A["status"]): A["status"] { return s === "todo" ? "in_progress" : "done"; }
function prev(s: A["status"]): A["status"] { return s === "done" ? "in_progress" : "todo"; }
function colLabel(s: A["status"]) { return s === "todo" ? "To do" : s === "in_progress" ? "In progress" : "Done"; }
