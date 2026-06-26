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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const WeeklyPlanSchema = z.object({
  weeklyPlan: z.array(z.object({
    day: z.string(),
    tasks: z.array(z.object({
      subject: z.string().optional().default(""),
      task: z.string(),
      duration: z.number().min(15).max(240),
      priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
      learningObjective: z.string().optional().default(""),
      instructions: z.string().optional().default(""),
    })).default([]),
  })).default([]),
});
type WeeklyPlan = z.infer<typeof WeeklyPlanSchema>;

function defaultWeeklyPlan(days: number, subjects: { name: string }[], exams: { title: string; exam_date: string }[]): WeeklyPlan {
  const subjNames = subjects.length ? subjects.map((s) => s.name) : ["General Study"];
  const weeklyPlan = Array.from({ length: Math.min(days, 7) }).map((_, i) => {
    const subject = subjNames[i % subjNames.length];
    const tasks = [
      { subject, task: `Review ${subject} fundamentals`, duration: 60 },
      { subject, task: `Practice problems: ${subject}`, duration: 45 },
    ];
    if (exams[0]) tasks.push({ subject: exams[0].title, task: `Revise for ${exams[0].title}`, duration: 30 });
    return { day: DAYS[i % 7], tasks };
  });
  return { weeklyPlan };
}

export const generateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PlanInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: subjects }, { data: exams }] = await Promise.all([
      supabase.from("subjects").select("id,name").eq("user_id", userId),
      supabase.from("exams").select("title,exam_date,syllabus").eq("user_id", userId).gte("exam_date", new Date().toISOString()),
    ]);
    const subjList = subjects ?? [];
    const examList = exams ?? [];
    const g = gateway();

    const basePrompt = `You are an AI Study Planner. Create a ${Math.min(data.days, 7)}-day study plan.
Subjects: ${subjList.map((s) => s.name).join(", ") || "General"}.
Upcoming exams: ${JSON.stringify(examList)}.
Distribute focused sessions, mix subjects, include short revision blocks.

Respond ONLY with a JSON object that strictly matches this schema:
{
  "weeklyPlan": [
    { "day": "Monday", "tasks": [ { "subject": "string", "task": "string", "duration": 60 } ] }
  ]
}
Rules: duration is an integer number of minutes (no separators). No markdown fences. No extra text outside the JSON.`;

    const tryOnce = async (prompt: string): Promise<WeeklyPlan> => {
      const { output } = await generateText({
        model: g("google/gemini-3-flash-preview"),
        output: Output.object({ schema: WeeklyPlanSchema }),
        prompt,
      });
      return WeeklyPlanSchema.parse(output);
    };

    let plan: WeeklyPlan;
    try {
      plan = await tryOnce(basePrompt);
    } catch {
      try {
        plan = await tryOnce(basePrompt + "\n\nIMPORTANT: You MUST return valid JSON matching the schema exactly. No markdown, no commentary. Every task needs subject, task, and integer duration.");
      } catch {
        plan = defaultWeeklyPlan(data.days, subjList, examList);
      }
    }

    // Persist as study_tasks rows so the planner UI keeps working.
    const start = new Date(); start.setMinutes(0, 0, 0);
    const startDow = (start.getDay() + 6) % 7; // 0 = Monday
    const subjMap = new Map(subjList.map((s) => [s.name.toLowerCase(), s.id]));
    const rows: Array<{ user_id: string; title: string; subject_id: string | null; scheduled_for: string; duration_min: number; notes: string | null }> = [];
    for (const day of plan.weeklyPlan) {
      const dayIdx = DAYS.findIndex((d) => d.toLowerCase() === day.day.toLowerCase());
      if (dayIdx < 0) continue;
      const offset = (dayIdx - startDow + 7) % 7;
      let hour = 9;
      for (const t of day.tasks) {
        const when = new Date(start);
        when.setDate(when.getDate() + offset);
        when.setHours(hour, 0, 0, 0);
        rows.push({
          user_id: userId,
          title: t.task,
          subject_id: t.subject ? subjMap.get(t.subject.toLowerCase()) ?? null : null,
          scheduled_for: when.toISOString(),
          duration_min: Math.round(t.duration),
          notes: t.subject || null,
        });
        hour = Math.min(21, hour + Math.max(1, Math.ceil(t.duration / 60)));
      }
    }
    if (rows.length) await supabase.from("study_tasks").insert(rows);
    return { inserted: rows.length, weeklyPlan: plan.weeklyPlan };
  });

