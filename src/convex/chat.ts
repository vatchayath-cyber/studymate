import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

async function uid(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not signed in");
  return userId;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await uid(ctx);
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});

export const addUserMessage = mutation({
  args: { content: v.string() },
  handler: async (ctx, { content }) => {
    const userId = await uid(ctx);
    return await ctx.db.insert("chatMessages", {
      userId,
      role: "user",
      content: content.slice(0, 20_000),
      createdAt: Date.now(),
    });
  },
});

export const addAssistantMessage = mutation({
  args: { content: v.string() },
  handler: async (ctx, { content }) => {
    const userId = await uid(ctx);
    return await ctx.db.insert("chatMessages", {
      userId,
      role: "assistant",
      content: content.slice(0, 40_000),
      createdAt: Date.now(),
    });
  },
});

export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await uid(ctx);
    for (const doc of await ctx.db.query("chatMessages").withIndex("by_user", (q) => q.eq("userId", userId)).collect()) {
      await ctx.db.delete(doc._id);
    }
  },
});
