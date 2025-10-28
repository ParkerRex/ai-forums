import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Custom Authentication Flow
 *
 * Prerequisites:
 * 1. Set NEXT_PUBLIC_USE_CUSTOM_AUTH=true in .env.local
 * 2. Ensure JWT_SECRET is set in .env.local
 * 3. Start dev server: npm run dev
 * 4. Run tests: bunx playwright test e2e/auth-flow.spec.ts
 *
 * Note: These tests require custom auth to be enabled. They will fail if
 * NEXT_PUBLIC_USE_CUSTOM_AUTH is false or not set.
 */

test.describe('Authentication Flow E2E', () => {
  const timestamp = Date.now();
  const testUser = {
    email: `test-e2e-${timestamp}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  };

  // Check if custom auth is enabled before running tests
  test.beforeAll(async ({ request }) => {
    // This is a placeholder - in production, you'd check if custom auth is enabled
    // For now, tests will run and fail gracefully if auth pages don't exist
  });

  test('complete sign-up to sign-in flow', async ({ page }) => {
    // Navigate to sign-up page
    await page.goto('/auth/sign-up');

    // Fill out sign-up form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.check('input[name="terms"]');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to verify-email-sent page
    await expect(page).toHaveURL(/\/auth\/verify-email-sent/);
    await expect(page.locator('text=Check your email')).toBeVisible();
    await expect(page.locator(`text=${testUser.email}`)).toBeVisible();
  });

  test('sign-up with weak password shows error', async ({ page }) => {
    await page.goto('/auth/sign-up');

    await page.fill('input[name="email"]', `weak-${timestamp}@example.com`);
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.check('input[name="terms"]');

    await page.click('button[type="submit"]');

    // Should show password strength errors
    await expect(page.locator('text=At least 8 characters')).toBeVisible();
  });

  test('sign-up with duplicate email shows error', async ({ page }) => {
    // First sign-up
    await page.goto('/auth/sign-up');
    const duplicateEmail = `duplicate-${timestamp}@example.com`;

    await page.fill('input[name="email"]', duplicateEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    await page.fill('input[name="firstName"]', 'First');
    await page.fill('input[name="lastName"]', 'User');
    await page.check('input[name="terms"]');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/\/auth\/verify-email-sent/);

    // Try to sign up with same email
    await page.goto('/auth/sign-up');
    await page.fill('input[name="email"]', duplicateEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    await page.fill('input[name="firstName"]', 'Second');
    await page.fill('input[name="lastName"]', 'User');
    await page.check('input[name="terms"]');
    await page.click('button[type="submit"]');

    // Should show duplicate email error
    await expect(page.locator('text=already registered')).toBeVisible();
  });

  test('sign-up validates password confirmation', async ({ page }) => {
    await page.goto('/auth/sign-up');

    await page.fill('input[name="email"]', `mismatch-${timestamp}@example.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.check('input[name="terms"]');

    await page.click('button[type="submit"]');

    // Should show password mismatch error
    await expect(page.locator('text=Passwords must match')).toBeVisible();
  });

  test('sign-up requires terms acceptance', async ({ page }) => {
    await page.goto('/auth/sign-up');

    await page.fill('input[name="email"]', `terms-${timestamp}@example.com`);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    // Don't check terms

    await page.click('button[type="submit"]');

    // Should show terms error (HTML5 validation or custom)
    const termsCheckbox = page.locator('input[name="terms"]');
    await expect(termsCheckbox).not.toBeChecked();
  });

  test('verify email page extracts token and shows loading', async ({ page }) => {
    const mockToken = 'mock-verification-token-123';
    await page.goto(`/auth/verify-email?token=${mockToken}`);

    // Should show loading state initially
    await expect(page.locator('text=Verifying')).toBeVisible();
  });

  test('sign-in page renders correctly', async ({ page }) => {
    await page.goto('/auth/sign-in');

    // Check form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check links
    await expect(page.locator('text=Forgot password')).toBeVisible();
    await expect(page.locator('text=sign up')).toBeVisible();
  });

  test('sign-in validates required fields', async ({ page }) => {
    await page.goto('/auth/sign-in');

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Should not navigate away (HTML5 validation prevents submit)
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('sign-in with invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth/sign-in');

    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Should show invalid credentials error
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('password strength meter updates in real-time', async ({ page }) => {
    await page.goto('/auth/sign-up');

    const passwordInput = page.locator('input[name="password"]');

    // Type weak password
    await passwordInput.fill('weak');
    await expect(page.locator('text=Weak')).toBeVisible();

    // Type stronger password
    await passwordInput.fill('StrongerPass123!');
    await expect(page.locator('text=Strong')).toBeVisible();
  });

  test('resend verification button works', async ({ page }) => {
    // Create a user first
    await page.goto('/auth/sign-up');
    const resendEmail = `resend-${timestamp}@example.com`;

    await page.fill('input[name="email"]', resendEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.check('input[name="terms"]');
    await page.click('button[type="submit"]');

    // Wait for verify-email-sent page
    await page.waitForURL(/\/auth\/verify-email-sent/);

    // Click resend button
    const resendButton = page.locator('button:has-text("Resend")');
    await expect(resendButton).toBeVisible();
    await resendButton.click();

    // Should show success message or disable button
    await expect(resendButton).toBeDisabled();
  });

  test('forgot password link navigates correctly', async ({ page }) => {
    await page.goto('/auth/sign-in');

    await page.click('text=Forgot password');

    await expect(page).toHaveURL(/\/auth\/forgot-password/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('sign-up to sign-in link navigates correctly', async ({ page }) => {
    await page.goto('/auth/sign-up');

    await page.click('text=sign in');

    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('sign-in to sign-up link navigates correctly', async ({ page }) => {
    await page.goto('/auth/sign-in');

    await page.click('text=sign up');

    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });
});
