import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function uid(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not signed in");
  return userId;
}

/* ---------- Tasks ---------- */

export const listTasks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await uid(ctx);
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const addTask = mutation({
  args: {
    date: v.string(),
    time: v.optional(v.string()),
    title: v.string(),
    type: v.union(v.literal("study"), v.literal("personal"), v.literal("exam"), v.literal("other")),
  },
  handler: async (ctx, { date, time, title, type }) => {
    const userId = await uid(ctx);
    return await ctx.db.insert("tasks", {
      userId,
      date,
      time: time ? time : undefined,
      title: title.trim().slice(0, 200),
      type,
      done: false,
      createdAt: Date.now(),
    });
  },
});

export const setTaskDone = mutation({
  args: { id: v.id("tasks"), done: v.boolean() },
  handler: async (ctx, { id, done }) => {
    const userId = await uid(ctx);
    const task = await ctx.db.get(id);
    if (!task || task.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { done });
  },
});

export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    const userId = await uid(ctx);
    const task = await ctx.db.get(id);
    if (!task || task.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

/* ---------- Expenses ---------- */

export const listExpenses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await uid(ctx);
    return await ctx.db
      .query("expenses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const addExpense = mutation({
  args: { date: v.string(), amount: v.number(), category: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, { date, amount, category, note }) => {
    const userId = await uid(ctx);
    if (!(amount > 0)) throw new Error("Amount must be greater than zero");
    return await ctx.db.insert("expenses", {
      userId,
      date,
      amount: Math.round(amount * 100) / 100,
      category: category.trim().slice(0, 60),
      note: note?.trim().slice(0, 200) || undefined,
      createdAt: Date.now(),
    });
  },
});

export const deleteExpense = mutation({
  args: { id: v.id("expenses") },
  handler: async (ctx, { id }) => {
    const userId = await uid(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

/* ---------- Categories ---------- */

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const userId = await uid(ctx);
    return await ctx.db
      .query("expenseCategories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const addCategory = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await uid(ctx);
    const clean = name.trim().slice(0, 60);
    if (!clean) throw new Error("Name required");
    const existing = await ctx.db
      .query("expenseCategories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (existing.some((c) => c.name.toLowerCase() === clean.toLowerCase())) {
      throw new Error("Category already exists");
    }
    return await ctx.db.insert("expenseCategories", { userId, name: clean });
  },
});

export const deleteCategory = mutation({
  args: { id: v.id("expenseCategories") },
  handler: async (ctx, { id }) => {
    const userId = await uid(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

/* ---------- Budgets (per-category limits) ---------- */

export const listBudgets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await uid(ctx);
    return await ctx.db
      .query("budgets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const setBudget = mutation({
  args: { category: v.string(), limitAmount: v.number() },
  handler: async (ctx, { category, limitAmount }) => {
    const userId = await uid(ctx);
    const clean = category.trim().slice(0, 60);
    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_user_category", (q) => q.eq("userId", userId).eq("category", clean))
      .first();
    if (limitAmount <= 0) {
      if (existing) await ctx.db.delete(existing._id);
      return;
    }
    if (existing) await ctx.db.patch(existing._id, { limitAmount });
    else await ctx.db.insert("budgets", { userId, category: clean, limitAmount });
  },
});
