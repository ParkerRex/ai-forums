import { test, expect } from '@playwright/test';

test.describe('Post Deletion Redirect', () => {
  // Helper function to create a test post
  async function createTestPost(page) {
    // Navigate to home
    await page.goto('/');
    
    // Click on "Create Post" button - using role or text selector
    const createButton = await page.getByRole('button', { name: /create post/i }).first();
    if (await createButton.isVisible()) {
      await createButton.click();
    } else {
      // Fallback: look for link with "Create" text
      await page.click('a:has-text("Create")');
    }
    
    // Fill in post details
    const postTitle = `Test Post for Deletion ${Date.now()}`;
    await page.fill('input[placeholder*="title"]', postTitle);
    
    // Fill content - look for textarea or rich editor
    const contentEditor = await page.locator('textarea, [contenteditable="true"]').first();
    await contentEditor.fill('This is a test post that will be deleted to test redirect behavior.');
    
    // Submit the post - look for submit/publish button
    await page.click('button:has-text("Submit"), button:has-text("Publish"), button:has-text("Post")');
    
    // Wait for navigation to the new post
    await page.waitForURL(/\/[^\/]+\/[^\/]+$/, { timeout: 10000 });
    
    return { postTitle, postUrl: page.url() };
  }
  
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Use the auth cookie from environment variable if available
    const authCookie = process.env.TEMP_AUTH_COOKIE;
    if (authCookie) {
      // Parse the base64 encoded cookie data - it's a semicolon-separated list of JSON objects
      const cookieString = Buffer.from(authCookie, 'base64').toString();
      const cookieObjects = cookieString.split(';').map(cookie => JSON.parse(cookie.trim()));
      
      // Convert to Playwright cookie format and add to context
      const playwrightCookies = cookieObjects.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expirationDate ? cookie.expirationDate * 1000 : undefined,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite === 'lax' ? 'Lax' as const : 
                  cookie.sameSite === 'strict' ? 'Strict' as const : 
                  cookie.sameSite === 'none' ? 'None' as const : 'Lax' as const
      }));
      
      await page.context().addCookies(playwrightCookies);
      
      // Reload the page to apply the cookies
      await page.reload();
    }
  });

  test('should redirect to home page after deleting post', async ({ page }) => {
    // Create a test post
    const { postTitle, postUrl } = await createTestPost(page);
    
    // Verify we're on the post page
    expect(page.url()).toBe(postUrl);
    await expect(page.locator('h1')).toContainText(postTitle);
    
    // Click on the more options menu
    await page.waitForSelector('[data-testid="post-more-menu"]', { timeout: 10000 });
    await page.click('[data-testid="post-more-menu"]');
    
    // Click on Delete Post
    await page.waitForSelector('text=Delete Post', { timeout: 5000 });
    await page.click('text=Delete Post');
    
    // Wait for delete confirmation modal
    await page.waitForSelector('[data-testid="delete-confirm-modal"]', { timeout: 5000 });
    
    // Verify the modal shows the correct post title
    await expect(page.locator('[data-testid="delete-modal-title"]')).toContainText(postTitle);
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Wait for redirect to home page
    await page.waitForURL('/', { timeout: 10000 });
    
    // Verify we're on the home page
    expect(page.url()).toMatch(/\/$|\/$/);
    
    // Verify we can see the home page content
    await expect(page.locator('h1, [data-testid="home-title"]')).toBeVisible();
  });

  test('should show success toast after deletion', async ({ page }) => {
    // Create a test post
    await createTestPost(page);
    
    // Delete the post
    await page.click('[data-testid="post-more-menu"]');
    await page.click('text=Delete Post');
    await page.waitForSelector('[data-testid="delete-confirm-modal"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Wait for redirect
    await page.waitForURL('/', { timeout: 10000 });
    
    // Verify success toast appears
    await expect(page.locator('text=Post deleted successfully!')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to home when accessing deleted post URL directly', async ({ page }) => {
    // Create a test post
    const { postTitle, postUrl } = await createTestPost(page);
    
    // Delete the post
    await page.click('[data-testid="post-more-menu"]');
    await page.click('text=Delete Post');
    await page.waitForSelector('[data-testid="delete-confirm-modal"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Wait for redirect to home
    await page.waitForURL('/', { timeout: 10000 });
    
    // Now try to access the deleted post URL directly
    await page.goto(postUrl);
    
    // Should be redirected to home page
    await page.waitForURL('/', { timeout: 10000 });
    expect(page.url()).toMatch(/\/$|\/$/);
    
    // Should not see the deleted post content
    await expect(page.locator('h1')).not.toContainText(postTitle);
  });

  test('should handle deletion from different pages gracefully', async ({ page }) => {
    // Create a test post
    const { postUrl } = await createTestPost(page);
    
    // Navigate to a different page first (like bookmarks)
    await page.goto('/bookmarks');
    
    // Then navigate to the post
    await page.goto(postUrl);
    
    // Delete the post
    await page.click('[data-testid="post-more-menu"]');
    await page.click('text=Delete Post');
    await page.waitForSelector('[data-testid="delete-confirm-modal"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Should still redirect to home page
    await page.waitForURL('/', { timeout: 10000 });
    expect(page.url()).toMatch(/\/$|\/$/);
  });

  test('should not redirect if deletion is cancelled', async ({ page }) => {
    // Create a test post
    const { postTitle, postUrl } = await createTestPost(page);
    
    // Open delete modal
    await page.click('[data-testid="post-more-menu"]');
    await page.click('text=Delete Post');
    await page.waitForSelector('[data-testid="delete-confirm-modal"]');
    
    // Cancel deletion
    await page.click('[data-testid="cancel-delete-button"]');
    
    // Modal should close
    await page.waitForSelector('[data-testid="delete-confirm-modal"]', { state: 'hidden' });
    
    // Should still be on the same post page
    expect(page.url()).toBe(postUrl);
    await expect(page.locator('h1')).toContainText(postTitle);
  });

  test('should handle deletion errors gracefully', async ({ page }) => {
    // Create a test post
    const { postTitle, postUrl } = await createTestPost(page);
    
    // Mock a network error by intercepting the delete request
    await page.route('**/api/convex/posts/deletePost', route => {
      route.abort('failed');
    });
    
    // Try to delete the post
    await page.click('[data-testid="post-more-menu"]');
    await page.click('text=Delete Post');
    await page.waitForSelector('[data-testid="delete-confirm-modal"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Should show error message
    await expect(page.locator('text=Failed to delete post')).toBeVisible({ timeout: 5000 });
    
    // Should still be on the post page (not redirected)
    expect(page.url()).toBe(postUrl);
    await expect(page.locator('h1')).toContainText(postTitle);
    
    // Modal should still be open
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible();
  });

  test('should work with posts in different categories', async ({ page }) => {
    // Create a test post (will be in default category)
    const { postTitle, postUrl } = await createTestPost(page);
    
    // Extract category from URL
    const urlParts = postUrl.split('/');
    const category = urlParts[urlParts.length - 2];
    
    // Delete the post
    await page.click('[data-testid="post-more-menu"]');
    await page.click('text=Delete Post');
    await page.waitForSelector('[data-testid="delete-confirm-modal"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Should redirect to home page regardless of category
    await page.waitForURL('/', { timeout: 10000 });
    expect(page.url()).toMatch(/\/$|\/$/);
    
    // Verify accessing the category page doesn't show the deleted post
    await page.goto(`/${category}`);
    await expect(page.locator('h1')).not.toContainText(postTitle);
  });

  test('should preserve browser history after deletion redirect', async ({ page }) => {
    // Navigate to home first
    await page.goto('/');
    
    // Create a test post
    const { postUrl } = await createTestPost(page);
    
    // Delete the post
    await page.click('[data-testid="post-more-menu"]');
    await page.click('text=Delete Post');
    await page.waitForSelector('[data-testid="delete-confirm-modal"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Wait for redirect to home
    await page.waitForURL('/', { timeout: 10000 });
    
    // Going back should not take us to the deleted post
    await page.goBack();
    
    // Should either stay on home or go to previous valid page
    // but not the deleted post URL
    expect(page.url()).not.toBe(postUrl);
  });
}); 