import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { summarizeNote } from "@/lib/ai.functions";
import { useState } from "react";
import { Plus, Sparkles, Trash2, Bookmark, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({ meta: [{ title: "Notes — CampusPilot AI" }] }),
  component: NotesPage,
});

type Note = {
  id: string; title: string; content: string | null; tags: string[]; bookmarked: boolean;
  summary: string | null; flashcards: { q: string; a: string }[] | null;
  important_questions: string[] | null; created_at: string;
};

function NotesPage() {
  const qc = useQueryClient();
  const runSummarize = useServerFn(summarizeNote);
  const { data = [] } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notes").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as Note[]) ?? [];
    },
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", tags: "" });
  const [active, setActive] = useState<Note | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const create = async () => {
    if (!form.title.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("notes").insert({
      user_id: u.user.id, title: form.title, content: form.content || null,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    });
    if (error) toast.error(error.message);
    else { toast.success("Note saved"); setOpen(false); setForm({ title: "", content: "", tags: "" }); qc.invalidateQueries({ queryKey: ["notes"] }); }
  };

  const summarize = async (id: string) => {
    setBusy(id);
    try {
      await runSummarize({ data: { noteId: id } });
      toast.success("AI summary ready");
      qc.invalidateQueries({ queryKey: ["notes"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["notes"] });
  };
  const toggleBookmark = async (n: Note) => {
    await supabase.from("notes").update({ bookmarked: !n.bookmarked }).eq("id", n.id);
    qc.invalidateQueries({ queryKey: ["notes"] });
  };

  return (
    <AppShell title="Notes" subtitle="Capture, organize, and summarize with AI."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gradient-primary text-white border-0"><Plus className="h-4 w-4 mr-1" />New note</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>New note</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Content (paste text from PDF, lecture, etc.)</Label><Textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
              <div><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="dbms, joins, sql" /></div>
            </div>
            <DialogFooter><Button onClick={create} className="gradient-primary text-white border-0">Save note</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          {data.length === 0 && <Card className="glass border-border/50 p-10 text-center text-muted-foreground sm:col-span-2">Create your first note to get AI summaries and flashcards.</Card>}
          {data.map((n) => (
            <button key={n.id} onClick={() => setActive(n)} className="text-left">
              <Card className="glass border-border/50 p-5 h-full hover:shadow-glow transition cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-semibold line-clamp-2">{n.title}</h3>
                  <button onClick={(e) => { e.stopPropagation(); toggleBookmark(n); }}>
                    <Bookmark className={`h-4 w-4 ${n.bookmarked ? "fill-[var(--aurora-cyan)] text-[var(--aurora-cyan)]" : "text-muted-foreground"}`} />
                  </button>
                </div>
                {n.content && <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{n.content}</p>}
                <div className="mt-3 flex flex-wrap gap-1">
                  {n.tags.slice(0, 3).map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                  {n.summary && <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-300">AI ready</Badge>}
                </div>
              </Card>
            </button>
          ))}
        </div>
        <Card className="glass border-border/50 p-6 lg:sticky lg:top-24 self-start max-h-[80vh] overflow-y-auto">
          {!active ? (
            <p className="text-sm text-muted-foreground">Select a note to view AI summary & flashcards.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-xl font-bold">{active.title}</h2>
                <Button size="icon" variant="ghost" onClick={() => remove(active.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              </div>
              <Button disabled={busy === active.id} onClick={() => summarize(active.id)} className="w-full gradient-primary text-white border-0">
                {busy === active.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate AI summary & flashcards
              </Button>
              {active.summary && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[var(--aurora-cyan)]">Summary</h3>
                  <pre className="mt-2 text-sm whitespace-pre-wrap font-sans">{active.summary}</pre>
                </div>
              )}
              {active.important_questions && active.important_questions.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[var(--aurora-cyan)]">Important questions</h3>
                  <ul className="mt-2 space-y-1.5 text-sm list-disc pl-5">{active.important_questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
                </div>
              )}
              {active.flashcards && active.flashcards.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-[var(--aurora-cyan)]">Flashcards</h3>
                  <div className="mt-2 space-y-2">
                    {active.flashcards.map((f, i) => (
                      <details key={i} className="glass rounded-xl p-3 text-sm">
                        <summary className="cursor-pointer font-medium">{f.q}</summary>
                        <p className="mt-2 text-muted-foreground">{f.a}</p>
                      </details>
                    ))}
                  </div>
                </div>
              )}
              {active.content && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground">Original content</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-sm">{active.content}</pre>
                </details>
              )}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
