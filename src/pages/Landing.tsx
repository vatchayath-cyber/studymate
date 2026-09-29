import { motion } from "framer-motion";
import { ArrowRight, BookOpen, CalendarDays, MessageSquareText, Target, Wallet } from "lucide-react";
import { Link } from "react-router";

const FEATURES = [
  {
    icon: MessageSquareText,
    title: "AI study assistant",
    body: "Ask doubts in plain language. Answers are grounded in the notes and PDFs you upload — in easy, medium, or detailed depth.",
  },
  {
    icon: BookOpen,
    title: "Materials library",
    body: "Paste text or drop .txt, .md, .csv and .pdf files. Text is extracted in your browser so the assistant can quote your own material.",
  },
  {
    icon: Target,
    title: "Syllabus tracker",
    body: "Subjects, units, topics — with statuses and rolled-up progress. Bulk import a whole semester in one paste.",
  },
  {
    icon: CalendarDays,
    title: "Planner & tasks",
    body: "AI-drafted daily, weekly and monthly plans you can edit freely, plus a calendar for dated tasks and exams.",
  },
  {
    icon: Wallet,
    title: "Expenses & budget",
    body: "Track hostel-month spending by category, set limits, and get threshold alerts before the month runs out.",
  },
];

export default function Landing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-screen flex-col"
    >
      {/* Nav */}
      <header className="hairline-b">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md bg-foreground text-xs font-bold text-background">S</span>
            <span className="font-semibold tracking-tight">StudyMate</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className="rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-6 pb-20 pt-20 text-center sm:pt-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            For students living away from home
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
            Study smart.
            <br />
            Plan better.
            <br />
            <span className="text-muted-foreground">Spend wisely.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground">
            One quiet workspace for hostel and PG life: an AI assistant that knows your syllabus,
            a tracker that keeps progress honest, and a budget that keeps the month funded.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Start free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-md border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground/70">Email sign-in · Your data stays yours</p>
        </section>

        {/* Feature grid */}
        <section className="hairline-t">
          <div className="mx-auto grid w-full max-w-5xl gap-px bg-border px-0 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="bg-background p-8 lg:first:col-span-1">
                <f.icon className="size-5 text-muted-foreground" strokeWidth={1.5} />
                <h2 className="mt-4 text-sm font-medium">{f.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.body}</p>
                <span className="mt-6 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 tnum">
                  0{i + 1}
                </span>
              </div>
            ))}
            <div className="hidden bg-background p-8 lg:block">
              <div className="flex h-full flex-col justify-end">
                <p className="text-4xl font-semibold tracking-tight tnum">12</p>
                <p className="mt-1 text-sm text-muted-foreground">tables of your own data — syllabus, materials, tasks, expenses, streaks, chat history.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Modes */}
        <section className="hairline-t">
          <div className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-20 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Student mode</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Built around a semester</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Track every unit and topic, find what matters before exams, and plan revision weeks
                around your own materials — not generic advice.
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Office mode</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">The same discipline, at work</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Switch the assistant to a work tone for drafts and summaries, and keep the same
                calendar, focus timer and expense discipline.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="hairline-t">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-24 text-center">
            <h2 className="max-w-lg text-3xl font-semibold tracking-tight">
              One account. Every part of the month in view.
            </h2>
            <Link
              to="/auth"
              className="group mt-8 inline-flex items-center gap-2 rounded-md bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Create your workspace
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="hairline-t">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>StudyMate</span>
          <span>Study smart. Plan better. Spend wisely.</span>
        </div>
      </footer>
    </motion.div>
  );
}
