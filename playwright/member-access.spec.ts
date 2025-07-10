import { test, expect } from "@playwright/test";

test.describe("Member Access Control", () => {
  test("Guest visiting /members redirects to sign-in", async ({ page }) => {
    // Visit members page as guest
    await page.goto("/members");
    
    // Should redirect to Clerk's sign-in page
    // The middleware redirects to /sign-in, which then loads Clerk's hosted sign-in
    await expect(page.url()).toContain("sign-in");
    await expect(page.url()).toContain("redirect_url");
    
    // Verify we're on a sign-in page (either our custom page or Clerk's hosted page)
    // The exact content depends on whether Clerk is in development or production mode
    await expect(
      page.getByRole("heading", { name: /sign in/i }).first()
    ).toBeVisible();
  });

  test("Guest visiting member profile redirects to sign-in with slug", async ({ page }) => {
    // Visit specific member profile as guest
    await page.goto("/members/john-doe");
    
    // Should redirect to sign-in with return URL including slug
    await expect(page.url()).toContain("sign-in");
    await expect(page.url()).toContain("redirect_url");
    await expect(page.url()).toContain("members%2Fjohn-doe");
  });

  test("Free tier user visiting /members redirects to pricing", async ({ page }) => {
    // TODO: This test requires setting up authentication state
    // For now, we'll mark it as skipped until we have proper test infrastructure
    test.skip();
    
    // Mock authentication as free tier user
    // await authenticateAs(page, { tier: "free" });
    
    // Visit members page
    // await page.goto("/members");
    
    // Should redirect to pricing page
    // await expect(page).toHaveURL("/pricing");
  });

  test("Paid user can access /members successfully", async ({ page }) => {
    // TODO: This test requires setting up authentication state
    // For now, we'll mark it as skipped until we have proper test infrastructure
    test.skip();
    
    // Mock authentication as paid user
    // await authenticateAs(page, { tier: "founding_member", subscriptionStatus: "active" });
    
    // Visit members page
    // await page.goto("/members");
    
    // Should stay on members page
    // await expect(page).toHaveURL("/members");
    
    // Verify members directory content
    // await expect(page.getByRole("heading", { name: "Members Directory" })).toBeVisible();
  });
});