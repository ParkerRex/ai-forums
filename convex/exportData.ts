import { v } from "convex/values";
import { query } from "./_generated/server";

export const exportTable = query({
  args: {
    tableName: v.string(),
  },
  handler: async (ctx, args) => {
    const validTables = [
      "members",
      "posts",
      "comments",
      "categories",
      "votes",
      "subscriptions",
      "payments",
    ];

    if (!validTables.includes(args.tableName)) {
      throw new Error(`Invalid table name: ${args.tableName}`);
    }

    // Query all records from the specified table
    const data = await ctx.db.query(args.tableName as any).collect();
    return data;
  },
});

export const exportAllTables = query({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "members",
      "posts",
      "comments",
      "categories",
      "votes",
      "subscriptions",
      "payments",
    ];

    const exportData: Record<string, any[]> = {};

    for (const tableName of tables) {
      try {
        const data = await ctx.db.query(tableName as any).collect();
        exportData[tableName] = data;
      } catch (error) {
        console.error(`Failed to export ${tableName}:`, error);
        exportData[tableName] = [];
      }
    }

    return exportData;
  },
});
