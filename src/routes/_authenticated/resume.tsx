import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { analyzeResume } from "@/lib/ai.functions";
import { useState } from "react";
import { Plus, Sparkles, Loader2, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/resume")({
  head: () => ({ meta: [{ title: "Resume ATS — CampusPilot AI" }] }),
  component: ResumePage,
});

type Resume = {
  id: string; file_name: string | null; version: number; resume_text: string | null;
  ats_score: number | null; suggestions: { strengths?: string[]; suggestions?: string[]; recommended_projects?: string[] } | null;
  missing_skills: string[] | null; created_at: string;
};

function ResumePage() {
  const qc = useQueryClient();
  const run = useServerFn(analyzeResume);
  const { data = [] } = useQuery<Resume[]>({
    queryKey: ["resumes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resumes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Resume[]) ?? [];
    },
  });
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const active = data[0] ?? null;

  const upload = async () => {
    if (!text.trim()) { toast.error("Paste your resume text"); return; }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const version = (data[0]?.version ?? 0) + 1;
    const { data: created, error } = await supabase.from("resumes").insert({
      user_id: u.user.id, resume_text: text, file_name: name || `Resume v${version}`, version,
    }).select().single();
    if (error || !created) { toast.error(error?.message ?? "Failed"); return; }
    setText(""); setName("");
    qc.invalidateQueries({ queryKey: ["resumes"] });
    toast.success("Resume saved. Analyzing...");
    setBusy(created.id);
    try {
      await run({ data: { resumeId: created.id } });
      toast.success("ATS analysis ready");
      qc.invalidateQueries({ queryKey: ["resumes"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI failed"); }
    finally { setBusy(null); }
  };
  const reanalyze = async (id: string) => {
    setBusy(id);
    try { await run({ data: { resumeId: id } }); toast.success("Re-analyzed"); qc.invalidateQueries({ queryKey: ["resumes"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(null); }
  };
  const remove = async (id: string) => {
    await supabase.from("resumes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["resumes"] });
  };

  return (
    <AppShell title="Resume ATS" subtitle="Get your resume reviewed like a real recruiter would.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass border-border/50 p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Upload a new version</h2>
          <p className="text-xs text-muted-foreground mt-1">Paste your resume text. (PDF parsing on roadmap.)</p>
          <div className="mt-4 space-y-3">
            <input className="w-full rounded-lg bg-input border border-border px-3 py-2 text-sm" placeholder="Resume name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            <Textarea rows={12} placeholder="Paste resume text here..." value={text} onChange={(e) => setText(e.target.value)} />
            <Button onClick={upload} className="gradient-primary text-white border-0">
              <Plus className="h-4 w-4 mr-1" /> Save & analyze
            </Button>
          </div>

          {active && (
            <div className="mt-8 border-t border-border/40 pt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{active.file_name} <span className="text-sm text-muted-foreground">v{active.version}</span></h3>
                <Button onClick={() => reanalyze(active.id)} disabled={busy === active.id} size="sm" variant="outline">
                  {busy === active.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} Re-analyze
                </Button>
              </div>
              {typeof active.ats_score === "number" ? (
                <>
                  <div className="mt-4 flex items-center gap-6">
                    <div className="relative">
                      <Ring pct={active.ats_score} />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">ATS Score</div>
                      <div className="font-display text-4xl font-bold">{active.ats_score}<span className="text-base text-muted-foreground">/100</span></div>
                      <Progress value={active.ats_score} className="mt-2" />
                    </div>
                  </div>
                  {active.suggestions?.strengths && (
                    <div className="mt-6"><h4 className="text-xs uppercase tracking-wider text-[var(--aurora-cyan)]">Strengths</h4>
                      <ul className="mt-2 list-disc pl-5 text-sm space-y-1">{active.suggestions.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                  )}
                  {active.suggestions?.suggestions && (
                    <div className="mt-4"><h4 className="text-xs uppercase tracking-wider text-amber-400">Improve</h4>
                      <ul className="mt-2 list-disc pl-5 text-sm space-y-1">{active.suggestions.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                  )}
                  {active.missing_skills && active.missing_skills.length > 0 && (
                    <div className="mt-4"><h4 className="text-xs uppercase tracking-wider text-rose-400">Missing skills</h4>
                      <div className="mt-2 flex flex-wrap gap-1.5">{active.missing_skills.map((s) => <Badge key={s} variant="outline" className="border-rose-500/30 text-rose-300">{s}</Badge>)}</div></div>
                  )}
                  {active.suggestions?.recommended_projects && (
                    <div className="mt-4"><h4 className="text-xs uppercase tracking-wider text-[var(--aurora-violet)]">Project ideas</h4>
                      <ul className="mt-2 list-disc pl-5 text-sm space-y-1">{active.suggestions.recommended_projects.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Analysis pending.</p>
              )}
            </div>
          )}
        </Card>

        <Card className="glass border-border/50 p-6">
          <h2 className="font-display text-lg font-semibold">Versions</h2>
          {data.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No resumes yet.</p> : (
            <div className="mt-3 space-y-2">
              {data.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-xl border border-border/50 p-3">
                  <FileText className="h-4 w-4 text-[var(--aurora-cyan)]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.file_name} <span className="text-xs text-muted-foreground">v{r.version}</span></div>
                    <div className="text-[10px] text-muted-foreground">{format(new Date(r.created_at), "MMM d, p")} · {r.ats_score ?? "—"}/100</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 36, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return (
    <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
      <circle cx="50" cy="50" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="8" fill="none" />
      <circle cx="50" cy="50" r={r} stroke="url(#rg)" strokeWidth="8" strokeLinecap="round" fill="none" strokeDasharray={c} strokeDashoffset={off} />
      <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#22D3EE" /></linearGradient></defs>
    </svg>
  );
}
