import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Discord-specific preference management for news feed sources
 * Handles enabling/disabling Discord digest and managing Discord-specific settings
 */

export const updateDiscordPreferences = mutation({
  args: {
    userId: v.id("members"),
    enabled: v.boolean(),
    channels: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.userId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Get guild ID from environment variables
    const guildId = process.env.DISCORD_GUILD_ID || "1355280592962453585";

    // Get current news preferences or create default structure
    const currentPreferences = member.newsPreferences || {
      enabledCategories: [],
      customSources: [],
      refreshInterval: 30, // Default 30 minutes
    };

    // Update Discord-specific settings
    const updatedPreferences = {
      ...currentPreferences,
      discordEnabled: args.enabled,
    };

    // If enabling Discord, add or update Discord source in customSources
    if (args.enabled) {
      const discordSourceIndex = updatedPreferences.customSources.findIndex(
        source => source.type === "discord"
      );

      const discordSource = {
        type: "discord" as const,
        url: `https://discord.com/channels/${guildId}`,
        name: "VAI Discord",
        guildId,
        channels: args.channels,
      };

      if (discordSourceIndex >= 0) {
        // Update existing Discord source
        updatedPreferences.customSources[discordSourceIndex] = discordSource;
      } else {
        // Add new Discord source
        updatedPreferences.customSources.push(discordSource);
      }
    } else {
      // If disabling Discord, remove Discord source from customSources
      updatedPreferences.customSources = updatedPreferences.customSources.filter(
        source => source.type !== "discord"
      );
    }

    // Update member preferences
    await ctx.db.patch(args.userId, {
      newsPreferences: updatedPreferences,
    });

    return null;
  },
});

export const getDiscordPreferences = query({
  args: {
    userId: v.id("members"),
  },
  returns: v.union(
    v.null(),
    v.object({
      enabled: v.boolean(),
      guildId: v.string(),
      channels: v.optional(v.array(v.string())),
    })
  ),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.userId);
    if (!member || !member.newsPreferences) {
      return null;
    }

    const { newsPreferences } = member;
    
    // Check if Discord is enabled via the quick toggle
    const discordEnabled = newsPreferences.discordEnabled || false;
    
    // Get guild ID from environment variables (always the same for all users)
    const guildId = process.env.DISCORD_GUILD_ID || "1355280592962453585";
    
    // Find Discord source in customSources for channel config
    const discordSource = newsPreferences.customSources.find(
      source => source.type === "discord"
    );

    return {
      enabled: discordEnabled,
      guildId,
      channels: discordSource?.channels,
    };
  },
});

export const toggleDiscordDigest = mutation({
  args: {
    userId: v.id("members"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.userId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Get guild ID from environment variables
    const guildId = process.env.DISCORD_GUILD_ID || "1355280592962453585";

    const currentPreferences = member.newsPreferences || {
      enabledCategories: [],
      customSources: [],
      refreshInterval: 30,
    };

    const currentlyEnabled = currentPreferences.discordEnabled || false;
    const newEnabledState = !currentlyEnabled;

    // Update Discord preferences directly
    const updatedPreferences = {
      ...currentPreferences,
      discordEnabled: newEnabledState,
    };

    if (newEnabledState) {
      // Add Discord source if enabling
      const discordSourceIndex = updatedPreferences.customSources.findIndex(
        source => source.type === "discord"
      );

      const discordSource = {
        type: "discord" as const,
        url: `https://discord.com/channels/${guildId}`,
        name: "VAI Discord",
        guildId,
        channels: undefined,
      };

      if (discordSourceIndex >= 0) {
        updatedPreferences.customSources[discordSourceIndex] = discordSource;
      } else {
        updatedPreferences.customSources.push(discordSource);
      }
    } else {
      // Remove Discord source if disabling
      updatedPreferences.customSources = updatedPreferences.customSources.filter(
        source => source.type !== "discord"
      );
    }

    await ctx.db.patch(args.userId, {
      newsPreferences: updatedPreferences,
    });

    return newEnabledState;
  },
});

export const getDiscordSourceConfig = query({
  args: {
    userId: v.id("members"),
  },
  returns: v.union(
    v.null(),
    v.object({
      type: v.literal("discord"),
      url: v.string(),
      name: v.string(),
      guildId: v.optional(v.string()),
      channels: v.optional(v.array(v.string())),
    })
  ),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.userId);
    if (!member || !member.newsPreferences) {
      return null;
    }

    // Find Discord source in customSources
    const discordSource = member.newsPreferences.customSources.find(
      source => source.type === "discord"
    );

    // Type guard to ensure we only return Discord sources
    if (discordSource && discordSource.type === "discord") {
      return {
        type: "discord" as const,
        url: discordSource.url,
        name: discordSource.name,
        guildId: discordSource.guildId,
        channels: discordSource.channels,
      };
    }

    return null;
  },
});

export const isDiscordEnabled = query({
  args: {
    userId: v.id("members"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.userId);
    if (!member || !member.newsPreferences) {
      return false;
    }

    return member.newsPreferences.discordEnabled || false;
  },
});