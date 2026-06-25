import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/doubt-solver/")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: existing } = await supabase.from("chat_threads").select("id").order("updated_at", { ascending: false }).limit(1);
    let threadId = existing?.[0]?.id as string | undefined;
    if (!threadId) {
      const { data: created } = await supabase.from("chat_threads").insert({ user_id: u.user.id }).select("id").single();
      threadId = created?.id;
    }
    if (threadId) throw redirect({ to: "/doubt-solver/$threadId", params: { threadId } });
  },
  component: () => null,
});
