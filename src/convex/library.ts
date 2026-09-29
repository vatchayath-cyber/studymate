import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function uid(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not signed in");
  return userId;
}

/* ---------- Materials ---------- */

export const listMaterials = query({
  args: {},
  handler: async (ctx) => {
    const userId = await uid(ctx);
    return await ctx.db
      .query("materials")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const addMaterial = mutation({
  args: {
    title: v.string(),
    kind: v.union(v.literal("text"), v.literal("file")),
    fileName: v.optional(v.string()),
    text: v.optional(v.string()),
  },
  handler: async (ctx, { title, kind, fileName, text }) => {
    const userId = await uid(ctx);
    const id = await ctx.db.insert("materials", {
      userId,
      title: title.slice(0, 200),
      kind,
      fileName,
      text: (text ?? "").slice(0, 400_000),
      createdAt: Date.now(),
    });
    return id;
  },
});

export const deleteMaterial = mutation({
  args: { id: v.id("materials") },
  handler: async (ctx, { id }) => {
    const userId = await uid(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

/* ---------- Syllabus ---------- */

export const listSyllabus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await uid(ctx);
    const subjects = await ctx.db
      .query("subjects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const units = await ctx.db
      .query("units")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return { subjects, units, topics };
  },
});

export const addSubject = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await uid(ctx);
    return await ctx.db.insert("subjects", { userId, name: name.trim().slice(0, 120), createdAt: Date.now() });
  },
});

export const deleteSubject = mutation({
  args: { id: v.id("subjects") },
  handler: async (ctx, { id }) => {
    const userId = await uid(ctx);
    const subject = await ctx.db.get(id);
    if (!subject || subject.userId !== userId) throw new Error("Not found");
    for (const unit of await ctx.db.query("units").withIndex("by_subject", (q) => q.eq("subjectId", id)).collect()) {
      for (const topic of await ctx.db.query("topics").withIndex("by_unit", (q) => q.eq("unitId", unit._id)).collect()) {
        await ctx.db.delete(topic._id);
      }
      await ctx.db.delete(unit._id);
    }
    await ctx.db.delete(id);
  },
});

export const addUnit = mutation({
  args: { subjectId: v.id("subjects"), title: v.string() },
  handler: async (ctx, { subjectId, title }) => {
    const userId = await uid(ctx);
    const subject = await ctx.db.get(subjectId);
    if (!subject || subject.userId !== userId) throw new Error("Not found");
    return await ctx.db.insert("units", { userId, subjectId, title: title.trim().slice(0, 160), createdAt: Date.now() });
  },
});

export const deleteUnit = mutation({
  args: { id: v.id("units") },
  handler: async (ctx, { id }) => {
    const userId = await uid(ctx);
    const unit = await ctx.db.get(id);
    if (!unit || unit.userId !== userId) throw new Error("Not found");
    for (const topic of await ctx.db.query("topics").withIndex("by_unit", (q) => q.eq("unitId", id)).collect()) {
      await ctx.db.delete(topic._id);
    }
    await ctx.db.delete(id);
  },
});

export const addTopic = mutation({
  args: { unitId: v.id("units"), title: v.string() },
  handler: async (ctx, { unitId, title }) => {
    const userId = await uid(ctx);
    const unit = await ctx.db.get(unitId);
    if (!unit || unit.userId !== userId) throw new Error("Not found");
    return await ctx.db.insert("topics", {
      userId,
      subjectId: unit.subjectId,
      unitId,
      title: title.trim().slice(0, 200),
      status: "Not Started",
      createdAt: Date.now(),
    });
  },
});

export const deleteTopic = mutation({
  args: { id: v.id("topics") },
  handler: async (ctx, { id }) => {
    const userId = await uid(ctx);
    const topic = await ctx.db.get(id);
    if (!topic || topic.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

export const setTopicStatus = mutation({
  args: {
    id: v.id("topics"),
    status: v.union(v.literal("Not Started"), v.literal("In Progress"), v.literal("Completed"), v.literal("Needs Revision")),
  },
  handler: async (ctx, { id, status }) => {
    const userId = await uid(ctx);
    const topic = await ctx.db.get(id);
    if (!topic || topic.userId !== userId) throw new Error("Not found");
    if (topic.status === status) return;
    await ctx.db.patch(id, { status });
    await ctx.db.insert("studyProgress", { userId, topicId: id, from: topic.status, to: status, at: Date.now() });
  },
});

/** Bulk import: lines "# Subject", "## Unit", "- Topic" (or single-line subject names). */
export const bulkImport = mutation({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    const userId = await uid(ctx);
    const lines = text.split(/\r?\n/);
    let subjectId: Id<"subjects"> | null = null;
    let unitId: Id<"units"> | null = null;
    const counts = { subjects: 0, units: 0, topics: 0 };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith("## ")) {
        const title = line.slice(3).trim();
        if (subjectId && title) {
          unitId = await ctx.db.insert("units", { userId, subjectId, title, createdAt: Date.now() });
          counts.units++;
        }
      } else if (line.startsWith("# ")) {
        const name = line.slice(2).trim();
        if (name) {
          subjectId = await ctx.db.insert("subjects", { userId, name, createdAt: Date.now() });
          unitId = null;
          counts.subjects++;
        }
      } else if (line.startsWith("- ")) {
        const title = line.slice(2).trim();
        if (unitId && subjectId && title) {
          await ctx.db.insert("topics", { userId, subjectId, unitId, title, status: "Not Started", createdAt: Date.now() });
          counts.topics++;
        } else if (subjectId && title) {
          // topic directly under a subject: make an implicit unit
          unitId = await ctx.db.insert("units", { userId, subjectId, title: "Topics", createdAt: Date.now() });
          counts.units++;
          await ctx.db.insert("topics", { userId, subjectId, unitId, title, status: "Not Started", createdAt: Date.now() });
          counts.topics++;
        }
      } else {
        subjectId = await ctx.db.insert("subjects", { userId, name: line, createdAt: Date.now() });
        unitId = null;
        counts.subjects++;
      }
    }
    return counts;
  },
});

/* ---------- Priority topics ---------- */

export const getPriorityTopics = query({
  args: {},
  handler: async (ctx) => {
    const userId = await uid(ctx);
    return await ctx.db
      .query("priorityTopics")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .first();
  },
});

export const savePriorityTopics = mutation({
  args: {
    items: v.array(
      v.object({
        topic: v.string(),
        priority: v.union(v.literal("High"), v.literal("Medium"), v.literal("Low")),
        reason: v.string(),
      }),
    ),
  },
  handler: async (ctx, { items }) => {
    const userId = await uid(ctx);
    return await ctx.db.insert("priorityTopics", { userId, items, generatedAt: Date.now() });
  },
});

export const clearPriorityTopics = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await uid(ctx);
    for (const doc of await ctx.db.query("priorityTopics").withIndex("by_user", (q) => q.eq("userId", userId)).collect()) {
      await ctx.db.delete(doc._id);
    }
  },
});
