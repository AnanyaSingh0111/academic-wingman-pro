import { createFileRoute, useNavigate, Link, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Send, Trash2, Bot, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doubt-solver/$threadId")({
  head: () => ({ meta: [{ title: "Doubt Solver — CampusPilot AI" }] }),
  component: DoubtThread,
});

type Thread = { id: string; title: string; updated_at: string };
type Msg = { id: string; role: string; parts: UIMessage["parts"]; created_at: string };

function DoubtThread() {
  const { threadId } = useParams({ from: "/_authenticated/doubt-solver/$threadId" });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: threads = [] } = useQuery<Thread[]>({
    queryKey: ["chat_threads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_threads").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as Thread[]) ?? [];
    },
  });
  const { data: initialMessages = [], isLoading } = useQuery<UIMessage[]>({
    queryKey: ["chat_messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_messages").select("*").eq("thread_id", threadId).order("created_at");
      if (error) throw error;
      return ((data as Msg[]) ?? []).map((m) => ({
        id: m.id, role: m.role as UIMessage["role"], parts: m.parts,
      } as UIMessage));
    },
  });

  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null)); }, []);

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    headers: () => (token ? { Authorization: `Bearer ${token}` } : {}),
    body: { threadId },
  }), [token, threadId]);

  const { messages, sendMessage, status, setMessages } = useChat({
    id: threadId,
    transport,
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => { if (initialMessages.length && messages.length === 0) setMessages(initialMessages); }, [initialMessages, messages.length, setMessages]);

  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    // Auto-rename thread on first message
    if (messages.length === 0) {
      await supabase.from("chat_threads").update({ title: text.slice(0, 60) }).eq("id", threadId);
      qc.invalidateQueries({ queryKey: ["chat_threads"] });
    }
    await sendMessage({ text });
  };

  const newThread = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: created, error } = await supabase.from("chat_threads").insert({ user_id: u.user.id }).select().single();
    if (error || !created) { toast.error(error?.message ?? "Failed"); return; }
    qc.invalidateQueries({ queryKey: ["chat_threads"] });
    navigate({ to: "/doubt-solver/$threadId", params: { threadId: created.id } });
  };

  const remove = async (id: string) => {
    await supabase.from("chat_threads").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["chat_threads"] });
    if (id === threadId) navigate({ to: "/doubt-solver" });
  };

  return (
    <AppShell title="AI Doubt Solver" subtitle="Ask anything — code, math, theory.">
      <div className="grid gap-4 lg:grid-cols-[260px_1fr] min-h-[70vh]">
        <Card className="glass border-border/50 p-3 flex flex-col">
          <Button onClick={newThread} className="gradient-primary text-white border-0 w-full"><Plus className="h-4 w-4 mr-1" />New chat</Button>
          <div className="mt-3 space-y-1 overflow-y-auto flex-1">
            {threads.map((t) => (
              <div key={t.id} className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${t.id === threadId ? "bg-primary/15" : "hover:bg-white/5"}`}>
                <Link to="/doubt-solver/$threadId" params={{ threadId: t.id }} className="flex-1 min-w-0 truncate">{t.title}</Link>
                <button onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass border-border/50 p-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoading && <div className="text-center text-sm text-muted-foreground">Loading...</div>}
            {!isLoading && messages.length === 0 && (
              <div className="h-full grid place-items-center text-center">
                <div>
                  <div className="mx-auto h-14 w-14 rounded-2xl gradient-primary grid place-items-center shadow-glow"><Bot className="h-7 w-7 text-white" /></div>
                  <h3 className="mt-4 font-display text-xl font-bold">Ask CampusPilot anything</h3>
                  <p className="text-sm text-muted-foreground mt-1">Try: "Explain dynamic programming with an example"</p>
                </div>
              </div>
            )}
            {messages.map((m) => {
              const text = m.parts.map((p) => p.type === "text" ? p.text : "").join("");
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
                  {!isUser && <div className="h-8 w-8 rounded-lg gradient-primary grid place-items-center shrink-0"><Bot className="h-4 w-4 text-white" /></div>}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? "gradient-primary text-white" : "glass"}`}>{text}</div>
                </div>
              );
            })}
            {busy && (
              <div className="flex gap-3"><div className="h-8 w-8 rounded-lg gradient-primary grid place-items-center"><Bot className="h-4 w-4 text-white" /></div>
                <div className="glass rounded-2xl px-4 py-2.5 text-sm inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Thinking...</div></div>
            )}
          </div>
          <form onSubmit={send} className="border-t border-border/40 p-4 flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask your doubt..." className="flex-1 rounded-xl bg-input border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" autoFocus />
            <Button type="submit" disabled={busy || !input.trim()} className="gradient-primary text-white border-0 h-12 px-5"><Send className="h-4 w-4" /></Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
