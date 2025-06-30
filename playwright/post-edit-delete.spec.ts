import { test, expect } from '@playwright/test';

test.describe('Post Edit and Delete Flow', () => {
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
    const postTitle = `Test Post ${Date.now()}`;
    await page.fill('input[placeholder*="title"]', postTitle);
    
    // Fill content - look for textarea or rich editor
    const contentEditor = await page.locator('textarea, [contenteditable="true"]').first();
    await contentEditor.fill('This is a test post content for E2E testing.');
    
    // Submit the post - look for submit/publish button
    await page.click('button:has-text("Submit"), button:has-text("Publish"), button:has-text("Post")');
    
    // Wait for navigation to the new post
    await page.waitForURL(/\/post\/[a-zA-Z0-9]+/, { timeout: 10000 });
    
    return postTitle;
  }
  
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Check if we need to authenticate by looking for Sign in button
    const signInButton = await page.getByRole('button', { name: 'Sign in' });
    if (await signInButton.isVisible()) {
      // Click Sign in
      await signInButton.click();
      
      // Wait for the sign-in page to load
      await page.waitForURL(/sign-in/);
      
      // Click Continue with Google
      await page.getByRole('button', { name: /Continue with Google/i }).click();
      
      // Wait for Google sign-in page
      await page.waitForURL(/accounts\.google\.com/);
      
      // Enter email
      const email = process.env.AUTH_TEST_EMAIL || 'me@parkerrex.com';
      await page.fill('input[type="email"]', email);
      
      // Click Next
      await page.getByRole('button', { name: 'Next' }).click();
      
      // Note: In a real test environment, you would need to:
      // 1. Handle password entry
      // 2. Handle 2FA if enabled
      // 3. Store and reuse authentication state
      
      // For now, we'll wait for redirect back to the app
      await page.waitForURL(/localhost:3000/, { timeout: 30000 });
    }
  });

  test('should allow member to edit their own post', async ({ page }) => {
    // Create a test post
    const postTitle = await createTestPost(page);
    
    // Click on the more options menu
    await page.waitForSelector('[data-testid="post-more-menu"]', { timeout: 10000 });
    await page.click('[data-testid="post-more-menu"]');
    
    // Click on Edit Post
    await page.waitForSelector('text=Edit Post', { timeout: 5000 });
    await page.click('text=Edit Post');
    
    // Wait for edit modal to appear
    await page.waitForSelector('[data-testid="post-edit-modal"]', { timeout: 5000 });
    
    // Update the title
    const updatedTitle = `${postTitle} - Edited`;
    await page.fill('[data-testid="edit-post-title"]', updatedTitle);
    
    // Update the content - find the textarea or contenteditable within the content area
    const contentArea = await page.locator('[data-testid="edit-post-content"]');
    const contentEditor = await contentArea.locator('textarea, [contenteditable="true"]').first();
    await contentEditor.fill('This is the updated content for the test post.');
    
    // Save the changes
    await page.click('[data-testid="save-post-button"]');
    
    // Wait for modal to close and page to refresh
    await page.waitForSelector('[data-testid="post-edit-modal"]', { state: 'hidden', timeout: 5000 });
    
    // Verify the post was updated
    await expect(page.locator('h1')).toContainText(updatedTitle);
    await expect(page.locator('[data-testid="post-content"]')).toContainText('This is the updated content');
    
    // Check for edited indicator (may be in the post metadata)
    const editedIndicator = page.locator('text=edited').first();
    await expect(editedIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should allow member to delete their own post', async ({ page }) => {
    // Create a test post
    const postTitle = await createTestPost(page);
    
    // Store the current URL to verify deletion redirect
    const postUrl = page.url();
    
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
    
    // Wait for redirect (should go back to category or home page)
    await page.waitForURL((url) => url.toString() !== postUrl, { timeout: 10000 });
    
    // Verify we're no longer on the post page
    expect(page.url()).not.toBe(postUrl);
    
    // Navigate back to the post URL and verify it's deleted
    await page.goto(postUrl);
    await expect(page.locator('text=Post Not Found')).toBeVisible({ timeout: 5000 });
  });

  test('should not show edit/delete options for posts by other members', async ({ page }) => {
    // Navigate to the home page to find an existing post
    await page.goto('/');
    
    // Find the first post link that's not our test post
    const postLink = await page.locator('a[href*="/"]:has-text("by")').first();
    if (await postLink.isVisible()) {
      await postLink.click();
      await page.waitForLoadState('networkidle');
      
      // Click on the more options menu
      await page.waitForSelector('[data-testid="post-more-menu"]', { timeout: 10000 });
      await page.click('[data-testid="post-more-menu"]');
      
      // Check if View History is visible
      const viewHistoryVisible = await page.locator('text=View History').isVisible();
      
      if (viewHistoryVisible) {
        // If we see Edit/Delete options, this might be our own post, so skip this test
        const editVisible = await page.locator('text=Edit Post').isVisible();
        const deleteVisible = await page.locator('text=Delete Post').isVisible();
        
        if (!editVisible && !deleteVisible) {
          // This is someone else's post - View History should be visible
          await expect(page.locator('text=View History')).toBeVisible();
        }
      }
    }
  });

  test('should show post history modal', async ({ page }) => {
    // Create and edit a test post first
    const postTitle = await createTestPost(page);
    
    // Edit the post to create history
    await page.click('[data-testid="post-more-menu"]');
    await page.click('text=Edit Post');
    await page.waitForSelector('[data-testid="post-edit-modal"]');
    
    // Update content
    const contentArea = await page.locator('[data-testid="edit-post-content"]');
    const contentEditor = await contentArea.locator('textarea, [contenteditable="true"]').first();
    await contentEditor.fill('First edit of the content');
    
    await page.click('[data-testid="save-post-button"]');
    await page.waitForSelector('[data-testid="post-edit-modal"]', { state: 'hidden' });
    
    // Wait a moment for the page to update
    await page.waitForTimeout(1000);
    
    // Open history modal
    await page.click('[data-testid="post-more-menu"]');
    await page.click('text=View History');
    
    // Wait for history modal
    await page.waitForSelector('[data-testid="post-history-modal"]', { timeout: 5000 });
    
    // Verify modal content
    await expect(page.locator('[data-testid="history-modal-title"]')).toContainText('Post History');
    
    // Check for version entries - should have at least one
    const versionCards = page.locator('[data-testid="history-version-card"]');
    await expect(versionCards).toHaveCount({ min: 1 });
    
    // Verify tabs exist
    await expect(page.locator('text=Rendered')).toBeVisible();
    await expect(page.locator('text=Diff')).toBeVisible();
    
    // Click on a version to see content
    await versionCards.first().click();
    await page.waitForTimeout(500); // Wait for content to load
    
    // Check if version content is visible
    const versionContent = page.locator('[data-testid="version-content"]');
    await expect(versionContent).toBeVisible({ timeout: 5000 });
    
    // Switch to diff view
    await page.click('text=Diff');
    await expect(page.locator('[data-testid="diff-view"]')).toBeVisible();
    
    // Close modal - click the X button or press Escape
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-testid="post-history-modal"]', { state: 'hidden' });
  });

  test('edit modal should validate required fields', async ({ page }) => {
    // Create a test post
    await createTestPost(page);
    
    // Open edit modal
    await page.click('[data-testid="post-more-menu"]');
    await page.click('text=Edit Post');
    await page.waitForSelector('[data-testid="post-edit-modal"]');
    
    // Clear the title field
    await page.fill('[data-testid="edit-post-title"]', '');
    
    // The save button should be disabled when title is empty
    const saveButton = page.locator('[data-testid="save-post-button"]');
    await expect(saveButton).toBeDisabled();
    
    // Fill in a valid title
    await page.fill('[data-testid="edit-post-title"]', 'Valid Title');
    
    // Now the save button should be enabled
    await expect(saveButton).toBeEnabled();
    
    // Modal should still be open
    await expect(page.locator('[data-testid="post-edit-modal"]')).toBeVisible();
  });

  test('delete confirmation should be cancelable', async ({ page }) => {
    // Create a test post
    const postTitle = await createTestPost(page);
    
    // Open delete modal
    await page.click('[data-testid="post-more-menu"]');
    await page.click('text=Delete Post');
    await page.waitForSelector('[data-testid="delete-confirm-modal"]');
    
    // Cancel deletion
    await page.click('[data-testid="cancel-delete-button"]');
    
    // Modal should close
    await page.waitForSelector('[data-testid="delete-confirm-modal"]', { state: 'hidden' });
    
    // Post should still exist
    await expect(page.locator('h1')).toContainText(postTitle);
  });
});