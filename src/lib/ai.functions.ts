import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const NoteInput = z.object({ noteId: z.string().uuid() });
const ResumeInput = z.object({ resumeId: z.string().uuid() });
const PlanInput = z.object({ days: z.number().min(1).max(14).default(7) });

function gateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

export const summarizeNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => NoteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: note, error } = await supabase.from("notes").select("*").eq("id", data.noteId).eq("user_id", userId).single();
    if (error || !note) throw new Error("Note not found");
    const source = (note.content as string | null) ?? "";
    if (!source.trim()) throw new Error("Note has no content to summarize. Paste text into the note first.");
    const g = gateway();

    const schema = z.object({
      summary: z.string(),
      flashcards: z.array(z.object({ question: z.string(), answer: z.string() })),
      importantQuestions: z.array(z.string()),
    });
    const prompt = `Summarize this note for a college student. Generate up to 10 flashcards and up to 8 important exam questions. Return strictly the JSON object matching the schema with keys: summary (string), flashcards (array of {question, answer}), importantQuestions (array of strings).\n\nNOTE:\n${source.slice(0, 12000)}`;

    const tryOnce = async () => {
      const { output } = await generateText({
        model: g("google/gemini-3-flash-preview"),
        output: Output.object({ schema }),
        prompt,
      });
      return schema.parse(output);
    };

    let result: z.infer<typeof schema>;
    try {
      result = await tryOnce();
    } catch (e) {
      try {
        result = await tryOnce();
      } catch (e2) {
        throw new Error("AI could not generate a valid summary. Please try again in a moment.");
      }
    }

    await supabase.from("notes").update({
      summary: result.summary,
      flashcards: result.flashcards.map((f) => ({ q: f.question, a: f.answer })),
      important_questions: result.importantQuestions,
    }).eq("id", data.noteId);
    return result;
  });

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResumeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: resume, error } = await supabase.from("resumes").select("*").eq("id", data.resumeId).eq("user_id", userId).single();
    if (error || !resume) throw new Error("Resume not found");
    const text = (resume.resume_text as string | null) ?? "";
    if (!text.trim()) throw new Error("Paste resume text to analyze.");
    const g = gateway();
    const { output } = await generateText({
      model: g("google/gemini-3-flash-preview"),
      output: Output.object({
        schema: z.object({
          ats_score: z.number().min(0).max(100),
          strengths: z.array(z.string()).max(6),
          suggestions: z.array(z.string()).max(8),
          missing_skills: z.array(z.string()).max(10),
          recommended_projects: z.array(z.string()).max(5),
        }),
      }),
      prompt: `You are an ATS resume reviewer for tech/college placements. Score this resume out of 100, list strengths, weaknesses, missing in-demand skills, and recommend portfolio projects.\n\nRESUME:\n${text.slice(0, 12000)}`,
    });
    await supabase.from("resumes").update({
      ats_score: output.ats_score,
      suggestions: output,
      missing_skills: output.missing_skills,
    }).eq("id", data.resumeId);
    return output;
  });

export const generateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PlanInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: subjects }, { data: exams }] = await Promise.all([
      supabase.from("subjects").select("id,name").eq("user_id", userId),
      supabase.from("exams").select("title,exam_date,syllabus").eq("user_id", userId).gte("exam_date", new Date().toISOString()),
    ]);
    const g = gateway();
    const { output } = await generateText({
      model: g("google/gemini-3-flash-preview"),
      output: Output.object({
        schema: z.object({
          tasks: z.array(z.object({
            title: z.string(),
            subject: z.string().optional(),
            day_offset: z.number().min(0).max(14),
            hour: z.number().min(6).max(22),
            duration_min: z.number().min(15).max(180),
            notes: z.string().optional(),
          })).max(40),
        }),
      }),
      prompt: `Generate a ${data.days}-day study plan. Subjects: ${(subjects ?? []).map((s) => s.name).join(", ") || "general"}. Upcoming exams: ${JSON.stringify(exams ?? [])}. Distribute focused sessions, mix subjects, include short revision blocks.`,
    });
    const start = new Date(); start.setMinutes(0, 0, 0);
    const subjMap = new Map((subjects ?? []).map((s) => [s.name.toLowerCase(), s.id]));
    const rows = output.tasks.map((t) => {
      const when = new Date(start); when.setDate(when.getDate() + t.day_offset); when.setHours(t.hour, 0, 0, 0);
      return {
        user_id: userId,
        title: t.title,
        subject_id: t.subject ? subjMap.get(t.subject.toLowerCase()) ?? null : null,
        scheduled_for: when.toISOString(),
        duration_min: t.duration_min,
        notes: t.notes ?? null,
      };
    });
    if (rows.length) await supabase.from("study_tasks").insert(rows);
    return { inserted: rows.length };
  });
