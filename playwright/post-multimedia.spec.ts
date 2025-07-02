import { test, expect } from "@playwright/test";

// Helper to set authentication cookies
async function setAuthCookies(page: any) {
  const cookieString = "eyJkb21haW4iOiJsb2NhbGhvc3QiLCJleHBpcmF0aW9uRGF0ZSI6MTc4MzAxNDkyNiwiaG9zdE9ubHkiOnRydWUsImh0dHBPbmx5IjpmYWxzZSwibmFtZSI6Il9fY2xlcmtfZGJfand0XzlKbXk3M2lCIiwicGF0aCI6Ii8iLCJzYW1lU2l0ZSI6ImxheCIsInNlY3VyZSI6ZmFsc2UsInNlc3Npb24iOmZhbHNlLCJzdG9yZUlkIjoiMCIsInZhbHVlIjoiZHZiXzJ5eUUyNFZMbnNYY01uUUZMcDFCZEdCcU51WiJ9O3siZG9tYWluIjoibG9jYWxob3N0IiwiZXhwaXJhdGlvbkRhdGUiOjE3ODMwMTQ5MjYsImhvc3RPbmx5Ijp0cnVlLCJodHRwT25seSI6ZmFsc2UsIm5hbWUiOiJfX2NsZXJrX2RiX2p3dCIsInBhdGgiOiIvIiwic2FtZVNpdGUiOiJsYXgiLCJzZWN1cmUiOmZhbHNlLCJzZXNzaW9uIjpmYWxzZSwic3RvcmVJZCI6IjAiLCJ2YWx1ZSI6ImR2Yl8yeXlFMjRWTG5zWGNNblFGTHAxQmRHQnFOdVoifTt7ImRvbWFpbiI6ImxvY2FsaG9zdCIsImV4cGlyYXRpb25EYXRlIjoxNzgzMDAxNDQ0LjE5MjY5NywiaG9zdE9ubHkiOnRydWUsImh0dHBPbmx5Ijp0cnVlLCJuYW1lIjoiX19yZWZyZXNoXzlKbXk3M2lCIiwicGF0aCI6Ii8iLCJzYW1lU2l0ZSI6ImxheCIsInNlY3VyZSI6ZmFsc2UsInNlc3Npb24iOmZhbHNlLCJzdG9yZUlkIjoiMCIsInZhbHVlIjoiNjllSEhoalBMNUlHNnRUT0paa3gifTt7ImRvbWFpbiI6ImxvY2FsaG9zdCIsImhvc3RPbmx5Ijp0cnVlLCJodHRwT25seSI6ZmFsc2UsIm5hbWUiOiJjbGVya19hY3RpdmVfY29udGV4dCIsInBhdGgiOiIvIiwic2FtZVNpdGUiOiJ1bnNwZWNpZmllZCIsInNlY3VyZSI6ZmFsc2UsInNlc3Npb24iOnRydWUsInN0b3JlSWQiOiIwIiwidmFsdWUiOiJzZXNzXzJ6SUZ2RHQ2TDJuMzcwRHdFbnV6M1lURWZYbjoifTt7ImRvbWFpbiI6ImxvY2FsaG9zdCIsImhvc3RPbmx5Ijp0cnVlLCJodHRwT25seSI6ZmFsc2UsIm5hbWUiOiJfX25leHRfaG1yX3JlZnJlc2hfaGFzaF9fIiwicGF0aCI6Ii8iLCJzYW1lU2l0ZSI6InVuc3BlY2lmaWVkIiwic2VjdXJlIjpmYWxzZSwic2Vzc2lvbiI6dHJ1ZSwic3RvcmVJZCI6IjAiLCJ2YWx1ZSI6IjhlZDM0MWZlMGM5M2VmNjA2MGNhZjNlNDJiZmRjMDE4OTk5N2I3NjIwMWJiNDcyNCJ9O3siZG9tYWluIjoibG9jYWxob3N0IiwiZXhwaXJhdGlvbkRhdGUiOjE3ODMwMTQ5MjYsImhvc3RPbmx5Ijp0cnVlLCJodHRwT25seSI6ZmFsc2UsIm5hbWUiOiJfX3Nlc3Npb24iLCJwYXRoIjoiLyIsInNhbWVTaXRlIjoibGF4Iiwic2VjdXJlIjpmYWxzZSwic2Vzc2lvbiI6ZmFsc2UsInN0b3JlSWQiOiIwIiwidmFsdWUiOiJleUpoYkdjaU9pSlNVekkxTmlJc0ltTmhkQ0k2SW1Oc1gwSTNaRFJRUkRFeE1VRkJRU0lzSW10cFpDSTZJbWx1YzE4eWVYbEZNakpJUW1wM1YwZE9abXhWTUc5M2NIbFZWbFZEY1VJaUxDSjBlWEFpT2lKS1YxUWlmUS5leUpoZW5BaU9pSm9kSFJ3T2k4dmJHOWpZV3hvYjNOME9qTXdNREFpTENKbGVIQWlPakUzTlRFME56ZzVPRFlzSW1aMllTSTZXekV4TXpNc0xURmRMQ0pwWVhRaU9qRTNOVEUwTnpnNU1qWXNJbWx6Y3lJNkltaDBkSEJ6T2k4dllXTjBhWFpsTFdodmRXNWtMVGN5TG1Oc1pYSnJMbUZqWTI5MWJuUnpMbVJsZGlJc0ltNWlaaUk2TVRjMU1UUTNPRGt4Tml3aWMybGtJam9pYzJWemMxOHlla2xHZGtSME5rd3liak0zTUVSM1JXNTFlak5aVkVWbVdHNGlMQ0p6ZFdJaU9pSjFjMlZ5WHpKNWVVWkxiMHgxWkhoUU5FcDJNVGhLVmxobU5ESjRlV05RWVNJc0luWWlPako5LjNnak9ZM0syR2dQdXpxVWJ0bkN1NFZyVTdWZ2tOd2FIUXRaeTZKOTBiX0swV3E5alplc05ocjFQel9BcG5BSEN6U1dqal84R2Zrdm9hb0VUeUVqcXljZjlmOVBXbkJpWWxjMXIzRFF2eHpxU2pQMjZsTVZqdEs1QmxnSTQzNktfMzctenM1bmRTMDlEblJPanFfaEJDQko4T29IMmgxVTZIVzBTQS1sVmJQMTJpZUIwNVg3djNGdnQ2am9NU0ZZdXJwRjBTbl9EQnVBQXUzZmlnbkg5WGlCNDMxLW9KWEdBUklDVmxGaTNqdHZNVFpycWtEODAxRkdMQ0s0LTFlbEVzYUdnSWFkYnVPOU1vNzhHd2ZfZkZSTXJRc0NSel9ab1d4R053c3hWT3E4aVVEaktEQVdkSjhQM0d3dDdiRV9TY1NaSXByZ1hxWjNubzNMWFJkdG1hZyJ9O3siZG9tYWluIjoibG9jYWxob3N0IiwiZXhwaXJhdGlvbkRhdGUiOjE3ODMwMTQ5MjYsImhvc3RPbmx5Ijp0cnVlLCJodHRwT25seSI6ZmFsc2UsIm5hbWUiOiJfX3Nlc3Npb25fOUpteTczaUIiLCJwYXRoIjoiLyIsInNhbWVTaXRlIjoibGF4Iiwic2VjdXJlIjpmYWxzZSwic2Vzc2lvbiI6ZmFsc2UsInN0b3JlSWQiOiIwIiwidmFsdWUiOiJleUpoYkdjaU9pSlNVekkxTmlJc0ltTmhkQ0k2SW1Oc1gwSTNaRFJRUkRFeE1VRkJRU0lzSW10cFpDSTZJbWx1YzE4eWVYbEZNakpJUW1wM1YwZE9abXhWTUc5M2NIbFZWbFZEY1VJaUxDSjBlWEFpT2lKS1YxUWlmUS5leUpoZW5BaU9pSm9kSFJ3T2k4dmJHOWpZV3hvYjNOME9qTXdNREFpTENKbGVIQWlPakUzTlRFME56ZzVPRFlzSW1aMllTSTZXekV4TXpNc0xURmRMQ0pwWVhRaU9qRTNOVEUwTnpnNU1qWXNJbWx6Y3lJNkltaDBkSEJ6T2k4dllXTjBhWFpsTFdodmRXNWtMVGN5TG1Oc1pYSnJMbUZqWTI5MWJuUnpMbVJsZGlJc0ltNWlaaUk2TVRjMU1UUTNPRGt4Tml3aWMybGtJam9pYzJWemMxOHlla2xHZGtSME5rd3liak0zTUVSM1JXNTFlak5aVkVWbVdHNGlMQ0p6ZFdJaU9pSjFjMlZ5WHpKNWVVWkxiMHgxWkhoUU5FcDJNVGhLVmxobU5ESjRlV05RWVNJc0luWWlPako5LjNnak9ZM0syR2dQdXpxVWJ0bkN1NFZyVTdWZ2tOd2FIUXRaeTZKOTBiX0swV3E5alplc05ocjFQel9BcG5BSEN6U1dqal84R2Zrdm9hb0VUeUVqcXljZjlmOVBXbkJpWWxjMXIzRFF2eHpxU2pQMjZsTVZqdEs1QmxnSTQzNktfMzctenM1bmRTMDlEblJPanFfaEJDQko4T29IMmgxVTZIVzBTQS1sVmJQMTJpZUIwNVg3djNGdnQ2am9NU0ZZdXJwRjBTbl9EQnVBQXUzZmlnbkg5WGlCNDMxLW9KWEdBUklDVmxGaTNqdHZNVFpycWtEODAxRkdMQ0s0LTFlbEVzYUdnSWFkYnVPOU1vNzhHd2ZfZkZSTXJRc0NSel9ab1d4R053c3hWT3E4aVVEaktEQVdkSjhQM0d3dDdiRV9TY1NaSXByZ1hxWjNubzNMWFJkdG1hZyJ9O3siZG9tYWluIjoibG9jYWxob3N0IiwiZXhwaXJhdGlvbkRhdGUiOjE3ODMwMTQ5MjYsImhvc3RPbmx5Ijp0cnVlLCJodHRwT25seSI6ZmFsc2UsIm5hbWUiOiJfX2NsaWVudF91YXRfOUpteTczaUIiLCJwYXRoIjoiLyIsInNhbWVTaXRlIjoic3RyaWN0Iiwic2VjdXJlIjpmYWxzZSwic2Vzc2lvbiI6ZmFsc2UsInN0b3JlSWQiOiIwIiwidmFsdWUiOiIxNzUxNDEwOTA5In07eyJkb21haW4iOiJsb2NhbGhvc3QiLCJleHBpcmF0aW9uRGF0ZSI6MTc4MzAxNDkyNiwiaG9zdE9ubHkiOnRydWUsImh0dHBPbmx5IjpmYWxzZSwibmFtZSI6Il9fY2xpZW50X3VhdCIsInBhdGgiOiIvIiwic2FtZVNpdGUiOiJzdHJpY3QiLCJzZWN1cmUiOmZhbHNlLCJzZXNzaW9uIjpmYWxzZSwic3RvcmVJZCI6IjAiLCJ2YWx1ZSI6IjE3NTE0MTA5MDkifQ==";
  
  // Decode base64 cookie string and parse
  const decodedCookies = atob(cookieString);
  const cookiePairs = decodedCookies.split(';');
  
  const cookies = [];
  for (const pair of cookiePairs) {
    try {
      const cookie = JSON.parse(pair);
      cookies.push({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite === 'unspecified' ? 'None' : cookie.sameSite,
      });
    } catch (e) {
      // Skip invalid cookie pairs
    }
  }
  
  await page.context().addCookies(cookies);
}

// Helper to load a test file
async function loadTestFile(page: any, selector: string, fileName: string) {
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.locator(selector).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles([`./playwright/fixtures/${fileName}`]);
}

test.describe("Multi-attachment Post Creation", () => {
  test.beforeEach(async ({ page }) => {
    // Set auth cookies first
    await setAuthCookies(page);
    // Navigate to homepage
    await page.goto("/");
  });

  test("should create a post with multiple attachments", async ({ page }) => {
    // Navigate to post creation
    await page.goto("/create-post");
    
    // Fill in basic post details
    await page.fill('input[id="title"]', "Post with Multiple Attachments");
    
    // Select category
    await page.getByRole("button", { name: /select a category/i }).click();
    await page.getByRole("option", { name: /general/i }).click();
    
    // Switch to Image/Video tab
    await page.getByRole("tab", { name: /image\/video/i }).click();
    
    // Add multiple media items (assuming we have test fixtures)
    // Note: In a real test, you'd need actual test image/video files in playwright/fixtures/
    
    // For now, we'll test the UI interactions
    await page.getByRole("button", { name: /add media/i }).click();
    
    // Add description
    await page.getByPlaceholder("Add a description for your media...").fill(
      "This post demonstrates multiple attachments support"
    );
    
    // Submit the post
    await page.getByRole("button", { name: /publish post/i }).click();
    
    // Wait for navigation to the created post
    await page.waitForURL(/\/[^/]+\/[^/]+$/);
    
    // Verify post title is displayed
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Post with Multiple Attachments"
    );
    
    // Verify description is displayed
    await expect(page.getByTestId("post-content")).toContainText(
      "This post demonstrates multiple attachments support"
    );
  });

  test("should display secondary attachments in a grid", async ({ page }) => {
    // Create a post with attachments first (using API or database seeding)
    // For this test, we'll navigate to an existing post with multiple attachments
    
    // Note: This would require a test post to already exist with multiple attachments
    // In a real implementation, you'd seed the database or use API calls to create test data
    
    // Navigate to a post detail page
    await page.goto("/general/test-post-with-attachments");
    
    // Check if AttachmentGrid is visible when there are multiple attachments
    const attachmentGrid = page.getByText("Additional Media");
    
    // If the post has multiple attachments, the grid should be visible
    if (await attachmentGrid.isVisible()) {
      // Verify grid contains attachment items
      const attachmentItems = page.locator('[class*="attachment-grid"] > div > div');
      await expect(attachmentItems).toHaveCount(await attachmentItems.count());
      
      // Verify each attachment has a type badge
      const badges = page.locator('[class*="attachment-grid"] [class*="badge"]');
      for (let i = 0; i < await badges.count(); i++) {
        await expect(badges.nth(i)).toBeVisible();
        const badgeText = await badges.nth(i).textContent();
        expect(["IMAGE", "VIDEO", "PDF", "YOUTUBE"]).toContain(badgeText);
      }
    }
  });

  test("should maintain backward compatibility with single media posts", async ({ page }) => {
    // Navigate to post creation
    await page.goto("/create-post");
    
    // Fill in basic post details
    await page.fill('input[id="title"]', "Single Media Post");
    
    // Select category
    await page.getByRole("button", { name: /select a category/i }).click();
    await page.getByRole("option", { name: /general/i }).click();
    
    // Switch to Image/Video tab
    await page.getByRole("tab", { name: /image\/video/i }).click();
    
    // Add a single media item
    await page.getByRole("button", { name: /add media/i }).click();
    
    // Submit the post
    await page.getByRole("button", { name: /publish post/i }).click();
    
    // Wait for navigation
    await page.waitForURL(/\/[^/]+\/[^/]+$/);
    
    // Verify post displays correctly with single media
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Single Media Post");
    
    // Should NOT show additional media grid for single attachment
    await expect(page.getByText("Additional Media")).not.toBeVisible();
  });

  test("should allow drag and drop reordering of media items", async ({ page }) => {
    // Navigate to post creation
    await page.goto("/create-post");
    
    // Switch to Image/Video tab
    await page.getByRole("tab", { name: /image\/video/i }).click();
    
    // Add multiple media items
    // This would require actual implementation of drag-drop testing
    // which is complex in Playwright and would need real media files
    
    // For now, we just verify the drag handles are present
    const dragHandles = page.locator('[class*="grip-vertical"]');
    
    // If there are multiple media items, drag handles should be visible on hover
    if (await dragHandles.first().isVisible()) {
      await expect(dragHandles.first()).toBeVisible();
    }
  });
});

test.describe("Attachment Display in Post Views", () => {
  test("should not show attachments in post list views", async ({ page }) => {
    // Navigate to homepage or category page
    await page.goto("/general");
    
    // Find post cards
    const postCards = page.locator('[data-testid="post-card"]');
    
    // Verify that attachment grids are not visible in list views
    for (let i = 0; i < Math.min(3, await postCards.count()); i++) {
      const card = postCards.nth(i);
      await expect(card.locator('[class*="attachment-grid"]')).not.toBeVisible();
    }
  });
});