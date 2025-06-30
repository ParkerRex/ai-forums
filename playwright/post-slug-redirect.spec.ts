import { test, expect } from '@playwright/test';

test.describe('Post Slug Redirect on Title Change', () => {
  test('should redirect to new URL when post title is changed', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Navigate to a post
    const postLink = await page.locator('a[href^="/content/"], a[href^="/workflows/"], a[href^="/prompts/"], a[href^="/announcements/"], a[href^="/connect/"]').first();
    const originalHref = await postLink.getAttribute('href');
    
    if (!originalHref) {
      test.skip();
      return;
    }
    
    await postLink.click();
    await page.waitForURL(originalHref);
    
    // Store original URL and title
    const originalUrl = page.url();
    const originalTitle = await page.locator('h1').textContent();
    
    // Open edit modal
    await page.locator('[data-testid="post-more-menu"]').click();
    
    // Check if Edit Post is visible (user owns the post)
    const editMenuItem = page.getByRole('menuitem', { name: 'Edit Post' });
    if (!await editMenuItem.isVisible()) {
      test.skip();
      return;
    }
    
    await editMenuItem.click();
    
    // Wait for edit modal
    await expect(page.locator('[data-testid="post-edit-modal"]')).toBeVisible();
    
    // Change the title significantly to ensure slug changes
    const newTitle = `Updated Title ${Date.now()}`;
    const titleInput = page.locator('[data-testid="edit-post-title"]');
    await titleInput.clear();
    await titleInput.fill(newTitle);
    
    // Save the changes
    await page.locator('[data-testid="save-post-button"]').click();
    
    // Wait for navigation to new URL
    await page.waitForURL(url => url !== originalUrl, { timeout: 10000 });
    
    // Verify we're on a new URL
    const newUrl = page.url();
    expect(newUrl).not.toBe(originalUrl);
    
    // Verify the new URL contains a slug based on the new title
    const expectedSlugPart = newTitle.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    expect(newUrl).toContain(expectedSlugPart.substring(0, 20)); // Check partial match
    
    // Verify the new title is displayed
    await expect(page.locator('h1')).toContainText(newTitle);
    
    // Verify the old URL now shows 404
    await page.goto(originalUrl);
    await expect(page.getByText(/404|Not Found/i)).toBeVisible({ timeout: 5000 });
  });
  
  test('custom 404 page should have proper navigation options', async ({ page }) => {
    // Navigate to a non-existent URL
    await page.goto('/content/this-post-does-not-exist-123456789');
    
    // Verify 404 page elements
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('Page Not Found')).toBeVisible();
    
    // Verify navigation buttons
    await expect(page.getByRole('link', { name: /Go Home/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Search Posts/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Go Back/i })).toBeVisible();
    
    // Test Go Home button
    await page.getByRole('link', { name: /Go Home/i }).click();
    await expect(page).toHaveURL('/');
  });
  
  test('should not redirect if title change does not affect slug', async ({ page }) => {
    // Navigate to a post
    await page.goto('/');
    const postLink = await page.locator('a[href^="/content/"], a[href^="/workflows/"], a[href^="/prompts/"]').first();
    await postLink.click();
    
    const originalUrl = page.url();
    
    // Open edit modal
    await page.locator('[data-testid="post-more-menu"]').click();
    const editMenuItem = page.getByRole('menuitem', { name: 'Edit Post' });
    if (!await editMenuItem.isVisible()) {
      test.skip();
      return;
    }
    
    await editMenuItem.click();
    await expect(page.locator('[data-testid="post-edit-modal"]')).toBeVisible();
    
    // Make a minor change that won't affect the slug (e.g., capitalization)
    const titleInput = page.locator('[data-testid="edit-post-title"]');
    const currentTitle = await titleInput.inputValue();
    await titleInput.clear();
    await titleInput.fill(currentTitle.toUpperCase());
    
    // Save changes
    await page.locator('[data-testid="save-post-button"]').click();
    
    // Should reload the same page, not redirect
    await page.waitForTimeout(2000); // Give time for any redirect
    
    // Verify we're still on the same URL
    expect(page.url()).toBe(originalUrl);
  });
});