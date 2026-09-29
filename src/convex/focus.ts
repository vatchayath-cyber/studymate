import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

/** Record a completed focus session. */
export const complete = mutation({
  args: { minutes: v.number(), day: v.string() },
  handler: async (ctx, { minutes, day }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not signed in");
    return await ctx.db.insert("focusSessions", {
      userId,
      minutes: Math.max(1, Math.round(minutes)),
      completedAt: Date.now(),
      day,
    });
  },
});
