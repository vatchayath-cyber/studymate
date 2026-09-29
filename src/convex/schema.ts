import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const topicStatuses = ["Not Started", "In Progress", "Completed", "Needs Revision"] as const;
export const taskTypes = ["study", "personal", "exam", "other"] as const;
export const priorities = ["High", "Medium", "Low"] as const;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(v.string()), // role of the user. do not remove

      // StudyMate profile
      mode: v.optional(v.union(v.literal("student"), v.literal("office"))),
      onboardingDone: v.optional(v.boolean()),
      college: v.optional(v.string()),
      course: v.optional(v.string()),
      dept: v.optional(v.string()),
      sem: v.optional(v.string()),
      monthlyBudget: v.optional(v.number()),
      jobTitle: v.optional(v.string()),

      // Study planner (editable freeform text)
      plannerText: v.optional(v.string()),
      plannerUpdatedAt: v.optional(v.number()),

      // Streak system
      streakCount: v.optional(v.number()),
      streakBest: v.optional(v.number()),
      streakLast: v.optional(v.string()), // YYYY-MM-DD
      streakDays: v.optional(v.array(v.string())), // recent active days
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Study materials (paste text or client-extracted file text)
    materials: defineTable({
      userId: v.id("users"),
      title: v.string(),
      kind: v.union(v.literal("text"), v.literal("file")),
      fileName: v.optional(v.string()),
      text: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // Syllabus: subjects -> units -> topics
    subjects: defineTable({
      userId: v.id("users"),
      name: v.string(),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    units: defineTable({
      userId: v.id("users"),
      subjectId: v.id("subjects"),
      title: v.string(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_subject", ["subjectId"]),

    topics: defineTable({
      userId: v.id("users"),
      subjectId: v.id("subjects"),
      unitId: v.id("units"),
      title: v.string(),
      status: v.union(
        v.literal("Not Started"),
        v.literal("In Progress"),
        v.literal("Completed"),
        v.literal("Needs Revision"),
      ),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_unit", ["unitId"]),

    // Append-only log of topic status changes
    studyProgress: defineTable({
      userId: v.id("users"),
      topicId: v.id("topics"),
      from: v.string(),
      to: v.string(),
      at: v.number(),
    }).index("by_user", ["userId"]),

    // AI chat history
    chatMessages: defineTable({
      userId: v.id("users"),
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // Calendar tasks
    tasks: defineTable({
      userId: v.id("users"),
      date: v.string(), // YYYY-MM-DD
      time: v.optional(v.string()), // HH:MM or empty
      title: v.string(),
      type: v.union(v.literal("study"), v.literal("personal"), v.literal("exam"), v.literal("other")),
      done: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_date", ["userId", "date"]),

    // Expenses
    expenses: defineTable({
      userId: v.id("users"),
      date: v.string(), // YYYY-MM-DD
      amount: v.number(),
      category: v.string(),
      note: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_date", ["userId", "date"]),

    expenseCategories: defineTable({
      userId: v.id("users"),
      name: v.string(),
    }).index("by_user", ["userId"]),

    // Per-category limits; overall budget lives on users.monthlyBudget
    budgets: defineTable({
      userId: v.id("users"),
      category: v.string(),
      limitAmount: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_category", ["userId", "category"]),

    // Important topics (AI-generated snapshot)
    priorityTopics: defineTable({
      userId: v.id("users"),
      items: v.array(
        v.object({
          topic: v.string(),
          priority: v.union(v.literal("High"), v.literal("Medium"), v.literal("Low")),
          reason: v.string(),
        }),
      ),
      generatedAt: v.number(),
    }).index("by_user", ["userId"]),

    // Focus sessions (completed)
    focusSessions: defineTable({
      userId: v.id("users"),
      minutes: v.number(),
      completedAt: v.number(),
      day: v.string(), // YYYY-MM-DD
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
