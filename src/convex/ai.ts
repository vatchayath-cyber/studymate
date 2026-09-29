"use node";

import { vly } from "../lib/vly-integrations";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action } from "./_generated/server";

type Level = "easy" | "medium" | "detailed";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

/** Accepts a top-level array or a record wrapping one under any of the given keys. */
function extractArray(value: unknown, ...keys: string[]): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) {
    for (const key of keys) {
      const inner = value[key];
      if (Array.isArray(inner)) return inner;
    }
  }
  return null;
}

function levelInstruction(level: Level): string {
  if (level === "easy")
    return "Explain at an easy level: plain words, short sentences, everyday examples. No jargon without an immediate plain-language gloss.";
  if (level === "detailed")
    return "Explain in detail: include mechanisms, edge cases, and a worked example where useful.";
  return "Explain at a medium level: balanced depth, define technical terms once, one example where useful.";
}

function studentSystem(level: Level): string {
  return [
    "You are StudyMate, a friendly, focused study assistant for a college student living away from home (hostel or PG).",
    "Ground your answers in the study materials the student uploaded when they are relevant. If the materials don't cover the question, say so briefly and answer from general knowledge.",
    levelInstruction(level),
    "Keep answers compact and skimmable: short paragraphs, bullet lists where helpful, and bold for key terms.",
  ].join(" ");
}

function officeSystem(level: Level): string {
  return [
    "You are StudyMate, a practical work assistant for an office worker.",
    "Be concise, structured and professional: lead with the answer, then short supporting bullets.",
    levelInstruction(level),
    "When the user shares documents or pasted text, base your answer on them and quote specifics where useful.",
  ].join(" ");
}

/** Build the grounded context block from uploaded materials. */
function materialsBlock(mats: { title: string; text?: string }[]): string {
  const withText = mats.filter((m) => (m.text ?? "").trim().length > 0);
  if (withText.length === 0) return "";
  let budget = 14_000;
  const parts: string[] = [];
  for (const m of withText) {
    if (budget <= 0) break;
    const t = (m.text ?? "").slice(0, budget);
    budget -= t.length;
    parts.push(`--- MATERIAL: ${m.title} ---\n${t}`);
  }
  return `\n\nThe user has uploaded these study materials. Use them to ground your answer when relevant:\n\n${parts.join("\n\n")}`;
}

/** Parse a model response that should be JSON, tolerating code fences and stray prose. */
function parseJsonLoose(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Model did not return valid JSON");
  }
}

async function complete(messages: { role: "system" | "user" | "assistant"; content: string }[]): Promise<string> {
  const res = await vly.ai.completion({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.5,
    maxTokens: 1200,
  });
  if (!res.success || !res.data) {
    throw new Error(res.error || "AI request failed");
  }
  const content = res.data.choices[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("AI returned an empty response");
  return content;
}

/** Doubt-solving chat. */
export const chat = action({
  args: {
    mode: v.union(v.literal("student"), v.literal("office")),
    level: v.union(v.literal("easy"), v.literal("medium"), v.literal("detailed")),
    history: v.array(v.object({ role: v.union(v.literal("user"), v.literal("assistant")), content: v.string() })),
    message: v.string(),
    materials: v.array(v.object({ title: v.string(), text: v.optional(v.string()) })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const system = args.mode === "office" ? officeSystem(args.level) : studentSystem(args.level);
    const history = args.history.slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 4_000) }));
    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: system + materialsBlock(args.materials) },
      ...history,
      { role: "user", content: args.message.slice(0, 8_000) },
    ];
    return await complete(messages);
  },
});

/** Important topics: returns {topic, priority, reason}[] grounded in the syllabus. */
export const importantTopics = action({
  args: {
    syllabus: v.string(),
    materials: v.array(v.object({ title: v.string(), text: v.optional(v.string()) })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    if (!args.syllabus.trim()) throw new Error("Add a few topics in Syllabus first, then come back.");

    const sys =
      "You are an experienced faculty member predicting the most exam-relevant topics from a syllabus. " +
      "Return ONLY a JSON array, no prose, of 8-12 objects: {\"topic\": string, \"priority\": \"High\"|\"Medium\"|\"Low\", \"reason\": string}. " +
      "The reason must be one sentence, specific to the topic.";
    const user =
      `Syllabus:\n${args.syllabus.slice(0, 12_000)}` + materialsBlock(args.materials);

    let arr: unknown[] | null = null;
    try {
      arr = extractArray(parseJsonLoose(await complete([{ role: "system", content: sys }, { role: "user", content: user }])), "topics", "items");
    } catch {
      const retry = await complete([
        { role: "system", content: sys },
        { role: "user", content: user },
        { role: "assistant", content: "I could not parse my previous output." },
        { role: "user", content: "Return ONLY the JSON array now." },
      ]);
      arr = extractArray(parseJsonLoose(retry), "topics", "items");
    }
    if (!arr) throw new Error("Unexpected AI response shape");
    const items = arr
      .filter((x): x is UnknownRecord => isRecord(x) && typeof x.topic === "string")
      .slice(0, 14)
      .map((x) => ({
        topic: String(x.topic).slice(0, 200),
        priority: x.priority === "High" ? ("High" as const) : x.priority === "Low" ? ("Low" as const) : ("Medium" as const),
        reason: String(x.reason ?? "").slice(0, 300),
      }));
    if (items.length === 0) throw new Error("AI returned no usable topics");
    return items;
  },
});

/** Study planner: generates a plan for the given horizon. */
export const studyPlan = action({
  args: {
    mode: v.union(v.literal("student"), v.literal("office")),
    horizon: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
    syllabus: v.string(),
    materials: v.array(v.object({ title: v.string(), text: v.optional(v.string()) })),
    extraNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    if (!args.syllabus.trim() && !(args.extraNotes ?? "").trim()) {
      throw new Error("Add topics in Syllabus (or some notes) first, then generate a plan.");
    }

    const role = args.mode === "office" ? "an office worker planning around a workweek" : "a college student";
    const sys =
      `You are a study-planning coach for ${role}. ` +
      "Produce a realistic, specific plan as plain text: use short headed sections and bullet lines with concrete time blocks (e.g. '6:30-7:30 pm — Unit 2 revision'). " +
      "No markdown headings, just CAPS section labels and dashes. Keep it under 450 words.";
    const user = [
      `Plan type: ${args.horizon}`,
      args.syllabus ? `Syllabus/progress:\n${args.syllabus.slice(0, 10_000)}` : "",
      (args.extraNotes ?? "").trim() ? `Extra notes from the user: ${args.extraNotes!.slice(0, 2_000)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n") + materialsBlock(args.materials);

    return await complete([{ role: "system", content: sys }, { role: "user", content: user }]);
  },
});

/** Dashboard suggestions: short, actionable next steps. */
export const suggestions = action({
  args: {
    mode: v.union(v.literal("student"), v.literal("office")),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const role = args.mode === "office" ? "an office worker" : "a college student";
    const sys =
      `You give three crisp next-step suggestions to ${role} based on their data. ` +
      'Return ONLY a JSON array of exactly 3 strings, each under 140 characters, concrete and specific. No numbering.';
    let arr: unknown[] | null = null;
    try {
      arr = extractArray(parseJsonLoose(await complete([{ role: "system", content: sys }, { role: "user", content: args.summary.slice(0, 6_000) }])), "suggestions");
    } catch {
      const retry = await complete([
        { role: "system", content: sys },
        { role: "user", content: args.summary.slice(0, 6_000) },
        { role: "assistant", content: "I could not parse my previous output." },
        { role: "user", content: "Return ONLY the JSON array of 3 strings now." },
      ]);
      arr = extractArray(parseJsonLoose(retry), "suggestions");
    }
    if (!arr) throw new Error("Unexpected AI response shape");
    const items = arr.filter((x): x is string => typeof x === "string").slice(0, 3).map((s) => s.slice(0, 200));
    if (items.length === 0) throw new Error("AI returned no suggestions");
    return items;
  },
});
