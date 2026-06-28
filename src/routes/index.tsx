import { createFileRoute, Link } from "@tanstack/react-router";
import { Aurora } from "@/components/Aurora";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Sparkles, BookOpen, ClipboardCheck, ListTodo, Timer, Bot, FileText,
  CalendarDays, Trophy, ArrowRight, Star, Zap, Brain, Target,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusPilot AI — The Ultimate College Companion" },
      { name: "description", content: "AI-powered study planner, notes summaries, attendance tracker, assignments, exam countdowns, doubt solver, and resume ATS — all in one workspace built for college students." },
      { property: "og:title", content: "CampusPilot AI" },
      { property: "og:description", content: "The AI-powered workspace built for college students, placement aspirants, and engineering students." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: CalendarDays, title: "AI Study Planner", desc: "Personalized daily, weekly, and monthly plans that adapt to your exams." },
  { icon: BookOpen, title: "Notes + AI Summaries", desc: "Drop your PDFs and get instant summaries, flashcards, and key questions." },
  { icon: ClipboardCheck, title: "Attendance Tracker", desc: "Know exactly how many classes you can skip — or must attend." },
  { icon: ListTodo, title: "Assignment Kanban", desc: "Beautiful boards, deadlines, priorities, and reminders that just work." },
  { icon: Timer, title: "Exam Countdown", desc: "Live timers, readiness scores, and revision checklists for every paper." },
  { icon: Bot, title: "AI Doubt Solver", desc: "ChatGPT-style assistant trained for engineering, math, and coding." },
  { icon: FileText, title: "Resume ATS Score", desc: "Upload your resume, get an ATS score and personalized fixes." },
  { icon: Trophy, title: "Gamified Growth", desc: "XP, streaks, badges — make studying feel like leveling up." },
];

const STATS = [
  { value: "12k+", label: "Students onboard" },
  { value: "3.2M", label: "Tasks completed" },
  { value: "94%", label: "Hit attendance goals" },
  { value: "4.9★", label: "Avg user rating" },
];

const TESTIMONIALS = [
  { name: "Ananya R.", role: "CSE, 3rd year", quote: "Cut my study planning time in half. The AI summaries are unreal." },
  { name: "Rohan M.", role: "ECE, Final year", quote: "Got a 38-point ATS bump on my resume before campus placements." },
  { name: "Sara K.", role: "MBA Aspirant", quote: "Streaks + the doubt solver — I actually enjoy revising now." },
];

const FAQ = [
  { q: "Is CampusPilot AI free?", a: "Yes — CampusPilot AI is completely free for students. Every module, including the AI features, is included at no cost." },
  { q: "Will my data be safe?", a: "Your notes, attendance, and resumes are stored with row-level security. Only you can read them." },
  { q: "Does the AI understand engineering subjects?", a: "Yes — it's tuned for DSA, mathematics, electronics, and core CS topics." },
  { q: "Can I use it on mobile?", a: "Yes, the platform is fully responsive and feels great on every screen." },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aurora />

      {/* Nav */}
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">Features</a>
          <a href="#testimonials" className="hover:text-foreground transition">Loved by</a>
          <a href="#faq" className="hover:text-foreground transition">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Sign in</Link>
          <Button asChild className="gradient-primary text-white shadow-glow border-0">
            <Link to="/auth">Get started <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-[var(--aurora-cyan)]" />
          <span className="font-medium">Now with AI Doubt Solver & Resume ATS</span>
        </div>
        <h1 className="mt-6 font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
          The AI workspace<br />built for <span className="gradient-text">college life</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Plan smarter, study faster, track attendance, ship assignments, and crack placements — all from one beautifully designed dashboard.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="gradient-primary text-white shadow-glow border-0 h-12 px-6">
            <Link to="/auth">Start free — no card</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-6 glass border-border/60">
            <a href="#features">Explore features</a>
          </Button>
        </div>

        {/* Hero preview card */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="absolute -inset-6 rounded-3xl gradient-primary opacity-30 blur-3xl" />
          <div className="relative glass-strong rounded-3xl p-2 shadow-card">
            <div className="rounded-2xl bg-background/60 p-6 text-left">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { icon: Brain, label: "Productivity", value: "87", suffix: "/100", tint: "from-violet-500/30 to-cyan-400/20" },
                  { icon: Target, label: "Placement Ready", value: "72", suffix: "%", tint: "from-cyan-400/30 to-fuchsia-500/20" },
                  { icon: Zap, label: "Study Streak", value: "23", suffix: " days", tint: "from-fuchsia-500/30 to-violet-500/20" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-2xl p-5 bg-gradient-to-br ${s.tint} border border-white/10`}>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><s.icon className="h-3.5 w-3.5" /> {s.label}</div>
                    <div className="mt-2 font-display text-4xl font-bold">{s.value}<span className="text-base font-medium text-muted-foreground">{s.suffix}</span></div>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border/50 p-4 flex items-center gap-3">
                  <Timer className="h-5 w-5 text-[var(--aurora-cyan)]" />
                  <div className="flex-1"><div className="text-sm font-medium">DBMS Mid-term</div><div className="text-xs text-muted-foreground">in 4 days · 64% ready</div></div>
                  <div className="text-xs font-mono">04:12:33:21</div>
                </div>
                <div className="rounded-xl border border-border/50 p-4 flex items-center gap-3">
                  <ListTodo className="h-5 w-5 text-[var(--aurora-violet)]" />
                  <div className="flex-1"><div className="text-sm font-medium">AI Lab assignment</div><div className="text-xs text-muted-foreground">Due tomorrow · in progress</div></div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">High</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 border-y border-border/40 glass">
        <div className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-3xl md:text-4xl font-bold gradient-text">{s.value}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--aurora-cyan)]">Everything you need</div>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">One app. Eight superpowers.</h2>
          <p className="mt-4 text-muted-foreground">Replace 6 different tools with one beautifully integrated workspace.</p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group relative rounded-2xl glass p-6 hover:translate-y-[-4px] transition-all duration-300 hover:shadow-glow"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="h-11 w-11 rounded-xl gradient-primary grid place-items-center shadow-glow">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <div className="text-center"><div className="text-xs uppercase tracking-[0.2em] text-[var(--aurora-cyan)]">Loved by students</div>
          <h2 className="mt-3 font-display text-4xl md:text-5xl font-bold tracking-tight">Built with feedback from real campuses</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="glass rounded-2xl p-6">
              <div className="flex gap-1 text-[var(--aurora-cyan)]">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
              <p className="mt-4 text-sm leading-relaxed">"{t.quote}"</p>
              <div className="mt-5 text-sm"><div className="font-semibold">{t.name}</div><div className="text-xs text-muted-foreground">{t.role}</div></div>
            </div>
          ))}
        </div>
      </section>




      {/* FAQ */}
      <section id="faq" className="relative z-10 mx-auto max-w-3xl px-6 py-24">
        <div className="text-center"><h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Questions, answered</h2></div>
        <div className="mt-10 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group glass rounded-2xl p-5 open:shadow-glow">
              <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
                <span className="font-medium">{f.q}</span>
                <span className="text-muted-foreground group-open:rotate-45 transition">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl gradient-primary p-12 text-center text-white shadow-glow">
          <Aurora className="opacity-40 mix-blend-overlay" />
          <h2 className="relative font-display text-4xl md:text-5xl font-bold tracking-tight">Your campus deserves an unfair advantage.</h2>
          <p className="relative mt-3 opacity-90">Join 12,000+ students already shipping with CampusPilot AI.</p>
          <div className="relative mt-8">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 h-12 px-8">
              <Link to="/auth">Create your free account</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/40 py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CampusPilot AI · Built for students, by students.
      </footer>
    </div>
  );
}
