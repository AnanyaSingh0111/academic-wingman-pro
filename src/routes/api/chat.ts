import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createClient } from "@supabase/supabase-js";

type Body = { messages?: unknown; threadId?: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token || token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error } = await sb.auth.getClaims(token);
        if (error || !claims?.claims?.sub) return new Response("Unauthorized", { status: 401 });
        const userId = claims.claims.sub as string;

        const body = (await request.json()) as Body;
        const messages = body.messages as UIMessage[];
        const threadId = body.threadId;
        if (!Array.isArray(messages)) return new Response("Bad request", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const gw = createLovableAiGatewayProvider(key);

        const result = streamText({
          model: gw("google/gemini-3-flash-preview"),
          system: "You are CampusPilot AI, a friendly tutor for college students. Explain step-by-step, use markdown, and include code blocks where helpful. Be concise but thorough. For math, use LaTeX-style inline `$...$` only when needed.",
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            try {
              if (!threadId) return;
              const last = finalMessages[finalMessages.length - 1];
              const userMsg = finalMessages[finalMessages.length - 2];
              const rows = [userMsg, last].filter(Boolean).map((m) => ({
                thread_id: threadId, user_id: userId, role: m.role, parts: m.parts as unknown as object,
              }));
              if (rows.length) await sb.from("chat_messages").insert(rows);
              await sb.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
            } catch (e) { console.error("persist failed", e); }
          },
        });
      },
    },
  },
});
