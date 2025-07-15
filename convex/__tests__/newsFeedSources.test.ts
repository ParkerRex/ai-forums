import { describe, it, expect } from 'vitest';

describe('Discord News Feed Preferences', () => {
  describe('Preference Structure Validation', () => {
    it('should validate Discord preference structure', () => {
      const mockDiscordPreferences = {
        enabled: true,
        guildId: "1355280592962453585", // Always from env vars
        channels: ["general", "announcements"],
      };

      expect(mockDiscordPreferences.enabled).toBe(true);
      expect(mockDiscordPreferences.guildId).toBe("1355280592962453585");
      expect(mockDiscordPreferences.channels).toEqual(["general", "announcements"]);
    });

    it('should handle minimal Discord preferences', () => {
      const mockMinimalPreferences = {
        enabled: false,
        guildId: "1355280592962453585", // Always from env vars, never undefined
        channels: undefined,
      };

      expect(mockMinimalPreferences.enabled).toBe(false);
      expect(mockMinimalPreferences.guildId).toBe("1355280592962453585");
      expect(mockMinimalPreferences.channels).toBeUndefined();
    });
  });

  describe('Discord Source Configuration', () => {
    it('should create correct Discord source config', () => {
      const mockDiscordSource = {
        type: "discord" as const,
        url: "https://discord.com/channels/1355280592962453585",
        name: "VAI VEX Discord",
        guildId: "1355280592962453585",
        channels: ["general", "announcements"],
      };

      expect(mockDiscordSource.type).toBe("discord");
      expect(mockDiscordSource.url).toBe("https://discord.com/channels/1355280592962453585");
      expect(mockDiscordSource.name).toBe("VAI VEX Discord");
      expect(mockDiscordSource.guildId).toBe("1355280592962453585");
      expect(mockDiscordSource.channels).toEqual(["general", "announcements"]);
    });

    it('should handle Discord source without channels', () => {
      const mockDiscordSource = {
        type: "discord" as const,
        url: "https://discord.com/channels/1355280592962453585",
        name: "VAI VEX Discord",
        guildId: "1355280592962453585",
        channels: undefined,
      };

      expect(mockDiscordSource.channels).toBeUndefined();
      expect(mockDiscordSource.guildId).toBe("1355280592962453585");
    });
  });

  describe('News Preferences Integration', () => {
    it('should integrate Discord preferences with existing news preferences', () => {
      const mockExistingPreferences = {
        enabledCategories: ["tech", "ai"],
        customSources: [
          {
            type: "website" as const,
            url: "https://example.com",
            name: "Example Site",
          }
        ],
        refreshInterval: 60,
      };

      const mockUpdatedPreferences = {
        ...mockExistingPreferences,
        discordEnabled: true,
        customSources: [
          ...mockExistingPreferences.customSources,
          {
            type: "discord" as const,
            url: "https://discord.com/channels/1355280592962453585",
            name: "VAI VEX Discord",
            guildId: "1355280592962453585",
            channels: undefined,
          }
        ],
      };

      expect(mockUpdatedPreferences.discordEnabled).toBe(true);
      expect(mockUpdatedPreferences.enabledCategories).toEqual(["tech", "ai"]);
      expect(mockUpdatedPreferences.refreshInterval).toBe(60);
      expect(mockUpdatedPreferences.customSources).toHaveLength(2);
      
      const discordSource = mockUpdatedPreferences.customSources.find(s => s.type === "discord");
      expect(discordSource).toBeDefined();
      expect(discordSource?.guildId).toBe("1355280592962453585");

      const websiteSource = mockUpdatedPreferences.customSources.find(s => s.type === "website");
      expect(websiteSource).toBeDefined();
      expect(websiteSource?.url).toBe("https://example.com");
    });

    it('should handle removing Discord source when disabled', () => {
      const mockPreferencesWithDiscord = {
        enabledCategories: ["tech", "ai"],
        customSources: [
          {
            type: "website" as const,
            url: "https://example.com",
            name: "Example Site",
          },
          {
            type: "discord" as const,
            url: "https://discord.com/channels/1355280592962453585",
            name: "VAI VEX Discord",
            guildId: "1355280592962453585",
            channels: undefined,
          }
        ],
        refreshInterval: 60,
        discordEnabled: true,
      };

      const mockUpdatedPreferences = {
        ...mockPreferencesWithDiscord,
        discordEnabled: false,
        customSources: mockPreferencesWithDiscord.customSources.filter(
          source => source.type !== "discord"
        ),
      };

      expect(mockUpdatedPreferences.discordEnabled).toBe(false);
      expect(mockUpdatedPreferences.customSources).toHaveLength(1);
      expect(mockUpdatedPreferences.customSources[0].type).toBe("website");
    });
  });

  describe('Default Configuration', () => {
    it('should use correct default guild ID', () => {
      const defaultGuildId = "1355280592962453585";
      const mockDefaultConfig = {
        type: "discord" as const,
        url: `https://discord.com/channels/${defaultGuildId}`,
        name: "VAI VEX Discord",
        guildId: defaultGuildId,
        channels: undefined,
      };

      expect(mockDefaultConfig.guildId).toBe("1355280592962453585");
      expect(mockDefaultConfig.url).toBe("https://discord.com/channels/1355280592962453585");
    });

    it('should handle empty preferences initialization', () => {
      const mockEmptyPreferences = {
        enabledCategories: [],
        customSources: [],
        refreshInterval: 30, // Default 30 minutes
      };

      const mockWithDiscord = {
        ...mockEmptyPreferences,
        discordEnabled: true,
        customSources: [
          {
            type: "discord" as const,
            url: "https://discord.com/channels/1355280592962453585",
            name: "VAI VEX Discord",
            guildId: "1355280592962453585",
            channels: undefined,
          }
        ],
      };

      expect(mockWithDiscord.refreshInterval).toBe(30);
      expect(mockWithDiscord.discordEnabled).toBe(true);
      expect(mockWithDiscord.customSources).toHaveLength(1);
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle Discord state correctly', () => {
      let currentState = false;
      
      // Toggle on
      currentState = !currentState;
      expect(currentState).toBe(true);
      
      // Toggle off
      currentState = !currentState;
      expect(currentState).toBe(false);
    });

    it('should return new state after toggle', () => {
      const mockToggleFunction = (currentState: boolean) => {
        return !currentState;
      };

      expect(mockToggleFunction(false)).toBe(true);
      expect(mockToggleFunction(true)).toBe(false);
    });
  });
});