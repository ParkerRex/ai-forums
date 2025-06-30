import { test, expect } from '@playwright/test';

test.describe('Post Edit and Delete Flow - Existing Posts', () => {
  // This test suite assumes you're already logged in
  // Run it after manually logging in or with saved auth state
  
  test('should show edit/delete options on own posts', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Look for a post link - navigate to the first post
    const postLinks = await page.locator('a[href^="/content/"], a[href^="/workflows/"], a[href^="/prompts/"], a[href^="/announcements/"], a[href^="/connect/"]');
    const postCount = await postLinks.count();
    
    if (postCount === 0) {
      test.skip();
      return;
    }
    
    // Click on the first post
    await postLinks.first().click();
    
    // Wait for the post page to load
    await page.waitForURL(/\/post\/[a-zA-Z0-9]+/);
    
    // Check if the more menu is visible
    const moreMenu = page.locator('[data-testid="post-more-menu"]');
    await expect(moreMenu).toBeVisible({ timeout: 10000 });
    
    // Click on the more menu
    await moreMenu.click();
    
    // Check what options are available
    const editOption = page.locator('text=Edit Post');
    const deleteOption = page.locator('text=Delete Post');
    const historyOption = page.locator('text=View History');
    
    // History should always be visible
    await expect(historyOption).toBeVisible();
    
    // Store whether this is our own post
    const isOwnPost = await editOption.isVisible();
    
    if (isOwnPost) {
      console.log('Found own post - testing edit/delete functionality');
      
      // Test Edit functionality
      await editOption.click();
      
      // Wait for edit modal
      await expect(page.locator('[data-testid="post-edit-modal"]')).toBeVisible();
      
      // Get current title
      const titleInput = page.locator('[data-testid="edit-post-title"]');
      const currentTitle = await titleInput.inputValue();
      
      // Update title
      const updatedTitle = currentTitle + ' (Edited)';
      await titleInput.fill(updatedTitle);
      
      // Save changes
      await page.click('[data-testid="save-post-button"]');
      
      // Wait for modal to close
      await expect(page.locator('[data-testid="post-edit-modal"]')).not.toBeVisible();
      
      // Verify title was updated
      await expect(page.locator('h1')).toContainText('(Edited)');
    } else {
      console.log('Not own post - verifying no edit/delete options');
      
      // Verify edit and delete are not visible
      await expect(editOption).not.toBeVisible();
      await expect(deleteOption).not.toBeVisible();
    }
  });
  
  test('should show post history modal', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Navigate to a post
    const postLinks = await page.locator('a[href^="/content/"], a[href^="/workflows/"], a[href^="/prompts/"], a[href^="/announcements/"], a[href^="/connect/"]');
    if (await postLinks.count() === 0) {
      test.skip();
      return;
    }
    
    await postLinks.first().click();
    await page.waitForURL(/\/post\/[a-zA-Z0-9]+/);
    
    // Open more menu
    const moreMenu = page.locator('[data-testid="post-more-menu"]');
    await moreMenu.click();
    
    // Click View History
    await page.click('text=View History');
    
    // Verify history modal opens
    await expect(page.locator('[data-testid="post-history-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="history-modal-title"]')).toContainText('Post History');
    
    // Check for version cards
    const versionCards = page.locator('[data-testid="history-version-card"]');
    const cardCount = await versionCards.count();
    
    if (cardCount > 0) {
      // Click on first version
      await versionCards.first().click();
      
      // Check tabs are visible
      await expect(page.locator('text=Rendered')).toBeVisible();
      await expect(page.locator('text=Diff')).toBeVisible();
    }
    
    // Close modal with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="post-history-modal"]')).not.toBeVisible();
  });
  
  test('should validate edit form', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Find a post we can edit (need to be the owner)
    const postLinks = await page.locator('a[href^="/content/"], a[href^="/workflows/"], a[href^="/prompts/"], a[href^="/announcements/"], a[href^="/connect/"]');
    let foundEditablePost = false;
    
    for (let i = 0; i < await postLinks.count(); i++) {
      await postLinks.nth(i).click();
      await page.waitForURL(/\/post\/[a-zA-Z0-9]+/);
      
      // Check if we can edit this post
      await page.click('[data-testid="post-more-menu"]');
      
      if (await page.locator('text=Edit Post').isVisible()) {
        foundEditablePost = true;
        break;
      }
      
      // Go back to home to try next post
      await page.goto('/');
    }
    
    if (!foundEditablePost) {
      test.skip();
      return;
    }
    
    // Click Edit Post
    await page.click('text=Edit Post');
    await expect(page.locator('[data-testid="post-edit-modal"]')).toBeVisible();
    
    // Clear title to test validation
    const titleInput = page.locator('[data-testid="edit-post-title"]');
    await titleInput.clear();
    
    // Save button should be disabled
    const saveButton = page.locator('[data-testid="save-post-button"]');
    await expect(saveButton).toBeDisabled();
    
    // Add valid title
    await titleInput.fill('Valid Title');
    await expect(saveButton).toBeEnabled();
    
    // Cancel edit
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="post-edit-modal"]')).not.toBeVisible();
  });
});