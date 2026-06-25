import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Aurora } from "@/components/Aurora";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CampusPilot AI" },
      { name: "description", content: "Sign in or create your CampusPilot AI account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally { setBusy(false); }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) toast.error(String(result.error));
    } finally { setBusy(false); }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <Aurora />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="glass-strong rounded-3xl p-8 shadow-card">
          <h1 className="font-display text-2xl font-bold tracking-tight text-center">Welcome aboard 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground text-center">Your AI college companion is one click away.</p>

          <Button onClick={handleGoogle} disabled={busy} variant="outline" className="mt-6 w-full h-11 glass border-border/60">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.8 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.8 6.9 29.1 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 43c5 0 9.6-1.9 13-5l-6-5c-1.9 1.4-4.3 2.2-7 2.2-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.3 38.5 16 43 24 43z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4-4.2 5.3l6 5c-.4.4 6.4-4.7 6.4-14.3 0-1.2-.1-2.3-.4-3.5z"/></svg>
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /><span>or continue with email</span><div className="h-px flex-1 bg-border" />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <form onSubmit={handleEmail} className="mt-4 space-y-3">
              <TabsContent value="signup" className="space-y-3 m-0">
                <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aisha Patel" /></div>
              </TabsContent>
              <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" /></div>
              <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
              <Button type="submit" disabled={busy} className="w-full h-11 gradient-primary text-white border-0 shadow-glow">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tab === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
          </Tabs>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">By continuing you agree to our Terms & Privacy.</p>
      </div>
    </div>
  );
}
