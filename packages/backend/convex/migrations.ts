import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import { DataModel } from "./_generated/dataModel.js";
import { convexToJson } from "convex/values";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

// defining a migration

export const setDefaultValue = migrations.define({
  table: "members",
  migrateOne: async (ctx, doc) => {
    if (doc.optionalField === undefined) {
      await ctx.db.patch(doc._id, { optionalField: "default" });
    }
  },
});
