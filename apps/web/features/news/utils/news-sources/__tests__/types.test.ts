import { describe, it, expect } from 'vitest';
import { SourceType, DiscordNewsSource } from '../types';

describe('News Source Types', () => {
  it('should include discord in SourceType union', () => {
    const discordType: SourceType = 'discord';
    expect(discordType).toBe('discord');
  });

  it('should allow creating DiscordNewsSource with required properties', () => {
    const discordSource: DiscordNewsSource = {
      type: 'discord',
      url: 'https://discord.com/channels/1355280592962453585',
      name: 'VAI Discord',
      guildId: '1355280592962453585'
    };

    expect(discordSource.type).toBe('discord');
    expect(discordSource.guildId).toBe('1355280592962453585');
    expect(discordSource.channels).toBeUndefined();
  });

  it('should allow creating DiscordNewsSource with optional channels', () => {
    const discordSource: DiscordNewsSource = {
      type: 'discord',
      url: 'https://discord.com/channels/1355280592962453585',
      name: 'VAI Discord',
      guildId: '1355280592962453585',
      channels: ['general', 'announcements']
    };

    expect(discordSource.channels).toEqual(['general', 'announcements']);
  });
});