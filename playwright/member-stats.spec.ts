import { test, expect } from '@playwright/test';

test.describe('Member Stats', () => {
  test('members directory shows non-zero stats for active members', async ({ page }) => {
    // Navigate to members directory
    await page.goto('/members');

    // Wait for members to load
    await page.waitForSelector('[data-testid="member-card"]', { timeout: 10000 });

    // Get all member cards
    const memberCards = await page.locator('[data-testid="member-card"]').all();
    
    // Ensure we have at least one member card
    expect(memberCards.length).toBeGreaterThan(0);

    let foundNonZeroStats = false;

    // Check each member card for stats
    for (const card of memberCards) {
      // Look for stats display elements
      const postStat = await card.locator('[data-testid="post-count"]').textContent();
      const commentStat = await card.locator('[data-testid="comment-count"]').textContent();
      const voteStat = await card.locator('[data-testid="vote-count"]').textContent();

      // Extract numeric values (assuming format like "5 Posts")
      const postCount = parseInt(postStat?.match(/\d+/)?.[0] || '0');
      const commentCount = parseInt(commentStat?.match(/\d+/)?.[0] || '0');
      const voteCount = parseInt(voteStat?.match(/\d+/)?.[0] || '0');

      // If any member has non-zero stats, test passes
      if (postCount > 0 || commentCount > 0 || voteCount > 0) {
        foundNonZeroStats = true;
        console.log(`Found member with stats: ${postCount} posts, ${commentCount} comments, ${voteCount} votes`);
        break;
      }
    }

    // Assert that at least one member has non-zero stats
    expect(foundNonZeroStats).toBe(true);
  });

  test('member cards display stats in correct format', async ({ page }) => {
    await page.goto('/members');
    
    // Wait for first member card
    await page.waitForSelector('[data-testid="member-card"]', { timeout: 10000 });
    
    const firstCard = page.locator('[data-testid="member-card"]').first();
    
    // Check that stats elements exist and have proper format
    await expect(firstCard.locator('[data-testid="post-count"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="comment-count"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="vote-count"]')).toBeVisible();

    // Check format (should be like "5 Posts", "10 Comments", "3 Votes")
    const postText = await firstCard.locator('[data-testid="post-count"]').textContent();
    const commentText = await firstCard.locator('[data-testid="comment-count"]').textContent();
    const voteText = await firstCard.locator('[data-testid="vote-count"]').textContent();

    expect(postText).toMatch(/\d+\s+(Post|Posts)/);
    expect(commentText).toMatch(/\d+\s+(Comment|Comments)/);
    expect(voteText).toMatch(/\d+\s+(Vote|Votes)/);
  });

  test('search preserves member stats', async ({ page }) => {
    await page.goto('/members');
    
    // Wait for members to load
    await page.waitForSelector('[data-testid="member-card"]', { timeout: 10000 });
    
    // Get stats from first member before search
    const firstCardBefore = page.locator('[data-testid="member-card"]').first();
    const memberNameBefore = await firstCardBefore.locator('[data-testid="member-name"]').textContent();
    const postStatBefore = await firstCardBefore.locator('[data-testid="post-count"]').textContent();
    
    // Search for that member by name
    const searchInput = page.locator('input[placeholder*="Search members"]');
    await searchInput.fill(memberNameBefore?.split(' ')[0] || '');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Check that the same member appears with same stats
    const searchResult = page.locator('[data-testid="member-card"]').first();
    const memberNameAfter = await searchResult.locator('[data-testid="member-name"]').textContent();
    const postStatAfter = await searchResult.locator('[data-testid="post-count"]').textContent();
    
    expect(memberNameBefore).toBe(memberNameAfter);
    expect(postStatBefore).toBe(postStatAfter);
  });

  test('no members show placeholder or missing stats', async ({ page }) => {
    await page.goto('/members');
    
    // Wait for members to load
    await page.waitForSelector('[data-testid="member-card"]', { timeout: 10000 });
    
    const memberCards = await page.locator('[data-testid="member-card"]').all();
    
    for (const card of memberCards) {
      // Check that no stats show placeholder values like "..." or "Loading" or are missing
      const postStat = await card.locator('[data-testid="post-count"]').textContent();
      const commentStat = await card.locator('[data-testid="comment-count"]').textContent();
      const voteStat = await card.locator('[data-testid="vote-count"]').textContent();
      
      expect(postStat).not.toContain('...');
      expect(postStat).not.toContain('Loading');
      expect(postStat).not.toBe('');
      
      expect(commentStat).not.toContain('...');
      expect(commentStat).not.toContain('Loading');
      expect(commentStat).not.toBe('');
      
      expect(voteStat).not.toContain('...');
      expect(voteStat).not.toContain('Loading');
      expect(voteStat).not.toBe('');
    }
  });
}); 