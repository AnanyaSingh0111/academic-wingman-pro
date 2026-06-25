import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTable<T = unknown>(table: string, query?: (q: ReturnType<typeof supabase.from>) => unknown) {
  return useQuery({
    queryKey: [table, query?.toString()],
    queryFn: async () => {
      const builder = query ? (query(supabase.from(table as never)) as unknown as Promise<{ data: T[] | null; error: unknown }>) : supabase.from(table as never).select("*").order("created_at", { ascending: false });
      const { data, error } = await (builder as Promise<{ data: T[] | null; error: { message: string } | null }>);
      if (error) throw new Error(error.message);
      return (data ?? []) as T[];
    },
  });
}

export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useProfile() {
  const [data, setData] = useState<{ full_name?: string; xp: number; level: number; streak: number } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: u }) => {
      if (!u.user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", u.user.id).single();
      if (p) setData(p as never);
    });
  }, []);
  return data;
}
