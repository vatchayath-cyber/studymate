import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Local date as YYYY-MM-DD. */
export function localDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Get (or lazily create) the current user's profile. */
export const getMy = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

export const update = mutation({
  args: {
    name: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("student"), v.literal("office"))),
    onboardingDone: v.optional(v.boolean()),
    college: v.optional(v.string()),
    course: v.optional(v.string()),
    dept: v.optional(v.string()),
    sem: v.optional(v.string()),
    monthlyBudget: v.optional(v.number()),
    jobTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    await ctx.db.patch(userId, args);
  },
});

/** Bump the daily streak (deduped per calendar day). Returns celebration milestones hit. */
export const bumpStreak = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("No profile");

    const today = localDay();
    if (user.streakLast === today) return { milestone: null as number | null };

    let count = 1;
    if (user.streakLast) {
      const last = new Date(`${user.streakLast}T00:00:00`);
      const now = new Date(`${today}T00:00:00`);
      const diffDays = Math.round((now.getTime() - last.getTime()) / 86400000);
      count = diffDays === 1 ? (user.streakCount ?? 0) + 1 : 1;
    }
    const best = Math.max(count, user.streakBest ?? 0);
    const days = [...(user.streakDays ?? []), today].filter(Boolean).slice(-120);

    await ctx.db.patch(userId, { streakCount: count, streakBest: best, streakLast: today, streakDays: days });

    const milestones = [3, 7, 14, 30, 50, 100];
    const milestone = milestones.includes(count) ? count : null;
    return { milestone };
  },
});

export const savePlanner = mutation({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    await ctx.db.patch(userId, { plannerText: text, plannerUpdatedAt: Date.now() });
  },
});

/** Delete every app-data row belonging to the user (keeps the auth account). */
export const deleteMyData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");

    const tables = [
      "materials",
      "studyProgress",
      "chatMessages",
      "tasks",
      "expenses",
      "expenseCategories",
      "budgets",
      "priorityTopics",
      "focusSessions",
      "topics",
      "units",
      "subjects",
    ] as const;
    let deleted = 0;
    for (const table of tables) {
      for (const doc of await ctx.db
        .query(table)
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .collect()) {
        await ctx.db.delete(doc._id);
        deleted++;
      }
    }
    await ctx.db.patch(userId, {
      college: undefined,
      course: undefined,
      dept: undefined,
      sem: undefined,
      monthlyBudget: 0,
      jobTitle: undefined,
      plannerText: undefined,
      plannerUpdatedAt: undefined,
      streakCount: 0,
      streakBest: 0,
      streakLast: undefined,
      streakDays: [],
    });
    return { deleted };
  },
});
