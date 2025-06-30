import { test, expect } from '@playwright/test';

test.describe('Post Edit and Delete Flow - Expected Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Assuming we're already logged in
    // Navigate to a post created by the current user
    // Posts are at /[category]/[slug]
    const postLink = await page.locator('a[href^="/content/"], a[href^="/workflows/"], a[href^="/prompts/"], a[href^="/announcements/"], a[href^="/connect/"]').first();
    await postLink.click();
    await page.waitForURL(/\/(content|workflows|prompts|announcements|connect)\//);
  
  });

  test('clicking Edit Post should open edit modal', async ({ page }) => {
    // Open the more menu
    await page.locator('[data-testid="post-more-menu"]').click();
    
    // The dropdown menu should be visible
    await expect(page.getByRole('menu')).toBeVisible();
    
    // Click Edit Post
    await page.getByRole('menuitem', { name: 'Edit Post' }).click();
    
    // The edit modal should appear
    await expect(page.locator('[data-testid="post-edit-modal"]')).toBeVisible({ timeout: 5000 });
    
    // The modal should have the correct title
    await expect(page.getByRole('heading', { name: 'Edit Post' })).toBeVisible();
    
    // The form fields should be pre-filled with current post data
    const titleInput = page.locator('[data-testid="edit-post-title"]');
    await expect(titleInput).toBeVisible();
    await expect(titleInput).not.toHaveValue(''); // Should have current title
    
    // The content editor should be visible
    const contentEditor = page.locator('[data-testid="edit-post-content"]');
    await expect(contentEditor).toBeVisible();
    
    // Save and Cancel buttons should be visible
    await expect(page.locator('[data-testid="save-post-button"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('editing a post should update it successfully', async ({ page }) => {
    const originalUrl = page.url();
    
    // Open edit modal
    await page.locator('[data-testid="post-more-menu"]').click();
    await page.getByRole('menuitem', { name: 'Edit Post' }).click();
    
    // Wait for modal
    await expect(page.locator('[data-testid="post-edit-modal"]')).toBeVisible();
    
    // Get current title
    const titleInput = page.locator('[data-testid="edit-post-title"]');
    const originalTitle = await titleInput.inputValue();
    
    // Update the title with timestamp to ensure slug changes
    const newTitle = `${originalTitle} - Edited at ${Date.now()}`;
    await titleInput.clear();
    await titleInput.fill(newTitle);
    
    // Update content
    const contentArea = page.locator('[data-testid="edit-post-content"]');
    const contentEditor = contentArea.locator('textarea, [contenteditable="true"]').first();
    await contentEditor.clear();
    await contentEditor.fill('This content has been edited via automated test.');
    
    // Save the changes
    await page.locator('[data-testid="save-post-button"]').click();
    
    // Modal should close and page should redirect
    await expect(page.locator('[data-testid="post-edit-modal"]')).not.toBeVisible({ timeout: 5000 });
    
    // Wait for redirect to new URL (slug changed)
    await page.waitForURL(url => url !== originalUrl, { timeout: 10000 });
    
    // Verify we're on a new URL
    const newUrl = page.url();
    expect(newUrl).not.toBe(originalUrl);
    
    // The new title should be visible
    await expect(page.locator('h1')).toContainText(newTitle);
    
    // The content should be updated
    await expect(page.locator('[data-testid="post-content"]')).toContainText('This content has been edited');
    
    // There should be an "edited" indicator
    await expect(page.getByText(/edited/i)).toBeVisible();
    
    // Verify old URL shows 404
    await page.goto(originalUrl);
    await expect(page.getByText(/404|Not Found/i)).toBeVisible({ timeout: 5000 });
  });

  test('clicking Delete Post should open confirmation dialog', async ({ page }) => {
    // Open the more menu
    await page.locator('[data-testid="post-more-menu"]').click();
    
    // Click Delete Post
    await page.getByRole('menuitem', { name: 'Delete Post' }).click();
    
    // The delete confirmation modal should appear
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible({ timeout: 5000 });
    
    // The modal should show warning text
    await expect(page.getByText(/Are you sure you want to delete/i)).toBeVisible();
    
    // The post title should be shown in the confirmation
    const postTitle = await page.locator('h1').textContent();
    await expect(page.locator('[data-testid="delete-modal-title"]')).toContainText(postTitle || '');
    
    // Cancel and Delete buttons should be visible
    await expect(page.locator('[data-testid="cancel-delete-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirm-delete-button"]')).toBeVisible();
  });

  test('confirming delete should remove the post', async ({ page }) => {
    // Store the current URL
    const postUrl = page.url();
    
    // Open delete dialog
    await page.locator('[data-testid="post-more-menu"]').click();
    await page.getByRole('menuitem', { name: 'Delete Post' }).click();
    
    // Wait for confirmation modal
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible();
    
    // Confirm deletion
    await page.locator('[data-testid="confirm-delete-button"]').click();
    
    // Modal should close
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).not.toBeVisible({ timeout: 5000 });
    
    // Should redirect away from the deleted post
    await expect(page).not.toHaveURL(postUrl, { timeout: 5000 });
    
    // Should redirect to home or category page
    await expect(page).toHaveURL(/\/(content|general|$)/, { timeout: 5000 });
    
    // If we try to visit the deleted post URL, should show not found
    await page.goto(postUrl);
    await expect(page.getByText(/Post Not Found/i)).toBeVisible({ timeout: 5000 });
  });

  test('clicking View History should open history modal', async ({ page }) => {
    // Open the more menu
    await page.locator('[data-testid="post-more-menu"]').click();
    
    // Click View History
    await page.getByRole('menuitem', { name: 'View History' }).click();
    
    // The history modal should appear
    await expect(page.locator('[data-testid="post-history-modal"]')).toBeVisible({ timeout: 5000 });
    
    // The modal should have the correct title
    await expect(page.locator('[data-testid="history-modal-title"]')).toContainText('Post History');
    
    // Should show version cards or a message if no history
    const versionCards = page.locator('[data-testid="history-version-card"]');
    const noHistoryMessage = page.getByText(/No edit history available/i);
    
    // Either version cards or no history message should be visible
    const hasVersions = await versionCards.count() > 0;
    const hasNoHistoryMsg = await noHistoryMessage.isVisible().catch(() => false);
    
    expect(hasVersions || hasNoHistoryMsg).toBeTruthy();
    
    // If there are versions, test the tabs
    if (hasVersions) {
      // Rendered and Diff tabs should be visible
      await expect(page.getByRole('tab', { name: 'Rendered' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Diff' })).toBeVisible();
      
      // Clicking a version should show content
      await versionCards.first().click();
      await expect(page.locator('[data-testid="version-content"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('canceling edit should not modify the post', async ({ page }) => {
    // Get original title and URL
    const originalTitle = await page.locator('h1').textContent();
    const originalUrl = page.url();
    
    // Open edit modal
    await page.locator('[data-testid="post-more-menu"]').click();
    await page.getByRole('menuitem', { name: 'Edit Post' }).click();
    
    // Wait for modal
    await expect(page.locator('[data-testid="post-edit-modal"]')).toBeVisible();
    
    // Make changes
    const titleInput = page.locator('[data-testid="edit-post-title"]');
    await titleInput.clear();
    await titleInput.fill('This should not be saved');
    
    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Modal should close
    await expect(page.locator('[data-testid="post-edit-modal"]')).not.toBeVisible();
    
    // Should still be on the same URL (no redirect)
    expect(page.url()).toBe(originalUrl);
    
    // Title should remain unchanged
    await expect(page.locator('h1')).toHaveText(originalTitle || '');
  });

  test('canceling delete should not remove the post', async ({ page }) => {
    const postUrl = page.url();
    
    // Open delete dialog
    await page.locator('[data-testid="post-more-menu"]').click();
    await page.getByRole('menuitem', { name: 'Delete Post' }).click();
    
    // Wait for confirmation modal
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible();
    
    // Cancel deletion
    await page.locator('[data-testid="cancel-delete-button"]').click();
    
    // Modal should close
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).not.toBeVisible();
    
    // Should still be on the same post
    await expect(page).toHaveURL(postUrl);
    
    // Post content should still be visible
    await expect(page.locator('h1')).toBeVisible();
  });

  test('edit form validation should work correctly', async ({ page }) => {
    // Open edit modal
    await page.locator('[data-testid="post-more-menu"]').click();
    await page.getByRole('menuitem', { name: 'Edit Post' }).click();
    
    // Wait for modal
    await expect(page.locator('[data-testid="post-edit-modal"]')).toBeVisible();
    
    // Clear the title
    const titleInput = page.locator('[data-testid="edit-post-title"]');
    await titleInput.clear();
    
    // Save button should be disabled
    await expect(page.locator('[data-testid="save-post-button"]')).toBeDisabled();
    
    // Type a valid title
    await titleInput.fill('Valid Title');
    
    // Save button should be enabled
    await expect(page.locator('[data-testid="save-post-button"]')).toBeEnabled();
  });

  test('closing history modal with Escape key should work', async ({ page }) => {
    // Open history modal
    await page.locator('[data-testid="post-more-menu"]').click();
    await page.getByRole('menuitem', { name: 'View History' }).click();
    
    // Wait for modal
    await expect(page.locator('[data-testid="post-history-modal"]')).toBeVisible();
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Modal should close
    await expect(page.locator('[data-testid="post-history-modal"]')).not.toBeVisible();
  });

  test('non-owner should only see View History option', async ({ page }) => {
    // This test would need to navigate to a post not created by the current user
    // For now, we'll skip if we can't find such a post
    
    // Navigate back to home
    await page.goto('/');
    
    // Try to find a post by a different author
    const posts = await page.locator('article, [data-testid="post-card"]').all();
    let foundOtherUserPost = false;
    
    for (const post of posts) {
      const authorLink = await post.locator('a[href*="/members/"]').getAttribute('href');
      if (authorLink && !authorLink.includes('parker-rex')) {
        await post.click();
        foundOtherUserPost = true;
        break;
      }
    }
    
    if (!foundOtherUserPost) {
      test.skip();
      return;
    }
    
    // Open more menu
    await page.locator('[data-testid="post-more-menu"]').click();
    
    // Should only see View History
    await expect(page.getByRole('menuitem', { name: 'View History' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Edit Post' })).not.toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Delete Post' })).not.toBeVisible();
  });
});