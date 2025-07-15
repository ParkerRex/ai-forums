import { describe, it, expect } from 'vitest';
import { fetchFromSource } from '../index';
import { DiscordNewsSource } from '../types';

describe('Discord News Source', () => {
  it('should be included in supported source types', async () => {
    const discordSource: DiscordNewsSource = {
      type: 'discord',
      url: 'https://discord.com/channels/1355280592962453585',
      name: 'VAI VEX Discord',
      guildId: '1355280592962453585',
      channels: ['general', 'announcements']
    };

    // Should not throw an error for unsupported source type
    const result = await fetchFromSource(discordSource);
    
    // Should return empty array (placeholder implementation)
    expect(result).toEqual([]);
  });

  it('should handle Discord source without channels', async () => {
    const discordSource: DiscordNewsSource = {
      type: 'discord',
      url: 'https://discord.com/channels/1355280592962453585',
      name: 'VAI VEX Discord',
      guildId: '1355280592962453585'
    };

    const result = await fetchFromSource(discordSource);
    expect(result).toEqual([]);
  });
});