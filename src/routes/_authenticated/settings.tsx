import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — CampusPilot AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const [form, setForm] = useState({ full_name: "", college: "", branch: "", year: 1 });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) setForm({ full_name: data.full_name ?? "", college: data.college ?? "", branch: data.branch ?? "", year: data.year ?? 1 });
    });
  }, [user]);
  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  };
  const initials = (form.full_name || user?.email || "U").slice(0, 1).toUpperCase();

  return (
    <AppShell title="Settings" subtitle="Profile and preferences.">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass border-border/50 p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Profile</h2>
          <div className="mt-4 flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-primary/40">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/20 text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div><div className="font-medium">{user?.email}</div><div className="text-xs text-muted-foreground">Signed in</div></div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>College</Label><Input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} /></div>
            <div><Label>Branch</Label><Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="CSE" /></div>
            <div><Label>Year</Label><Input type="number" min={1} max={5} value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></div>
          </div>
          <Button onClick={save} disabled={busy} className="mt-6 gradient-primary text-white border-0">Save changes</Button>
        </Card>

        <Card className="glass border-border/50 p-6">
          <h2 className="font-display text-lg font-semibold">Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign out of CampusPilot AI on this device.</p>
          <Button onClick={signOut} variant="outline" className="mt-4 w-full"><LogOut className="h-4 w-4 mr-2" />Sign out</Button>
        </Card>
      </div>
    </AppShell>
  );
}
