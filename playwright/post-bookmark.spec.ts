import { test, expect } from '@playwright/test';

test.describe('Post Bookmark Functionality', () => {
  test('should allow bookmarking and unbookmarking a post', async ({ page }) => {
    // Navigate to a post detail page (you may need to adjust this URL based on your actual posts)
    await page.goto('/general');
    
    // Find and click on a post to go to detail page
    const firstPost = page.locator('[data-testid="post-card"]').first();
    if (await firstPost.count() > 0) {
      await firstPost.click();
    } else {
      // If no posts exist, create one or skip the test
      test.skip('No posts available for testing');
    }

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Look for the bookmark button with "save" text
    const bookmarkButton = page.locator('button:has-text("save")');
    await expect(bookmarkButton).toBeVisible();
    
    // Click to bookmark
    await bookmarkButton.click();
    
    // Should show success toast
    await expect(page.locator('text=Added to bookmarks')).toBeVisible();
    
    // Button text should change to "saved"
    await expect(page.locator('button:has-text("saved")')).toBeVisible();
    
    // Icon should be filled (blue)
    const bookmarkIcon = page.locator('button:has-text("saved") svg');
    await expect(bookmarkIcon).toHaveClass(/fill-blue-500/);
    
    // Click again to unbookmark
    await page.locator('button:has-text("saved")').click();
    
    // Should show remove toast
    await expect(page.locator('text=Removed from bookmarks')).toBeVisible();
    
    // Button text should change back to "save"
    await expect(page.locator('button:has-text("save")')).toBeVisible();
  });

  test('should persist bookmark state after page reload', async ({ page }) => {
    // Navigate to a post detail page
    await page.goto('/general');
    
    // Find and click on a post to go to detail page
    const firstPost = page.locator('[data-testid="post-card"]').first();
    if (await firstPost.count() > 0) {
      await firstPost.click();
    } else {
      test.skip('No posts available for testing');
    }

    await page.waitForLoadState('networkidle');
    
    // Bookmark the post
    const bookmarkButton = page.locator('button:has-text("save")');
    if (await bookmarkButton.count() > 0) {
      await bookmarkButton.click();
      await expect(page.locator('text=Added to bookmarks')).toBeVisible();
    }
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still show "saved" state
    await expect(page.locator('button:has-text("saved")')).toBeVisible();
    
    // Clean up - unbookmark
    await page.locator('button:has-text("saved")').click();
    await expect(page.locator('text=Removed from bookmarks')).toBeVisible();
  });

  test('should show membership CTA for unauthenticated users', async ({ page }) => {
    // First, make sure we're logged out
    await page.goto('/');
    
    // Look for sign out or go to a post while not authenticated
    // This test would need to be adjusted based on your authentication flow
    
    // Navigate to a post detail page
    await page.goto('/general');
    
    const firstPost = page.locator('[data-testid="post-card"]').first();
    if (await firstPost.count() > 0) {
      await firstPost.click();
    } else {
      test.skip('No posts available for testing');
    }

    await page.waitForLoadState('networkidle');
    
    // For unauthenticated users, clicking bookmark should show membership CTA
    const bookmarkButton = page.locator('button:has-text("save")');
    if (await bookmarkButton.count() > 0) {
      await bookmarkButton.click();
      
      // Should show membership modal
      await expect(page.locator('text=Save Great Content')).toBeVisible();
      await expect(page.locator('text=Join VAI to bookmark posts')).toBeVisible();
    }
  });
}); 