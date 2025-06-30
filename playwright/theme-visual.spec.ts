import { test, expect } from '@playwright/test';

test.describe('Dark Mode Theme Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should not have white backgrounds in dark mode', async ({ page }) => {
    // Set dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Wait for theme to apply
    await page.waitForTimeout(500);
    
    // Check that body doesn't have white background
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      };
    });
    
    // In dark mode, background should not be white
    expect(bodyStyles.backgroundColor).not.toBe('rgb(255, 255, 255)');
    expect(bodyStyles.backgroundColor).not.toBe('white');
  });

  test('should have proper dark mode styling on member pages', async ({ page }) => {
    // Set dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Navigate to members page
    await page.goto('/members');
    await page.waitForTimeout(500);
    
    // Check that the page background is dark
    const pageStyles = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="bg-"]');
      const whiteBackgrounds = Array.from(elements).filter(el => {
        const styles = window.getComputedStyle(el);
        return styles.backgroundColor === 'rgb(255, 255, 255)' || 
               styles.backgroundColor === 'white';
      });
      return whiteBackgrounds.length;
    });
    
    // Should have no white backgrounds in dark mode
    expect(pageStyles).toBe(0);
  });

  test('should maintain contrast in both light and dark modes', async ({ page }) => {
    // Test light mode first
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(500);
    
    const lightModeStyles = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      };
    });
    
    // Test dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);
    
    const darkModeStyles = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      };
    });
    
    // Colors should be different between modes
    expect(lightModeStyles.backgroundColor).not.toBe(darkModeStyles.backgroundColor);
    expect(lightModeStyles.color).not.toBe(darkModeStyles.color);
  });

  test('should have semantic color tokens applied', async ({ page }) => {
    // Check that we're using CSS custom properties for colors
    const customProperties = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      
      // Check if background uses CSS custom properties
      const backgroundColor = styles.backgroundColor;
      const color = styles.color;
      
      // These should be using CSS custom properties from our theme
      return {
        hasCustomBackground: backgroundColor.includes('var(') || 
                           backgroundColor.includes('oklch'),
        hasCustomColor: color.includes('var(') || 
                       color.includes('oklch'),
        backgroundColor,
        color
      };
    });
    
    // Should be using custom properties or oklch colors from our theme
    expect(customProperties.hasCustomBackground || customProperties.hasCustomColor).toBe(true);
  });

  test('should not have hardcoded gray colors in HTML', async ({ page }) => {
    // Check that rendered HTML doesn't contain hardcoded gray classes
    const htmlContent = await page.content();
    
    // These patterns should not appear in the rendered HTML
    const bannedPatterns = [
      /class="[^"]*bg-gray-\d+/g,
      /class="[^"]*text-gray-\d+/g,
      /class="[^"]*border-gray-\d+/g,
      /class="[^"]*bg-white(?!\s)/g, // Allow bg-white with modifiers
    ];
    
    bannedPatterns.forEach((pattern, index) => {
      const matches = htmlContent.match(pattern);
      expect(matches, `Found banned pattern ${index}: ${pattern}`).toBeNull();
    });
  });
});

test.describe('Member Profile Linking', () => {
  test('should navigate to member profile when clicking member links', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');
    
    // Wait for posts to load
    await page.waitForSelector('[data-testid="member-link"]', { timeout: 10000 });
    
    // Click on the first member link
    const memberLink = page.locator('[data-testid="member-link"]').first();
    await expect(memberLink).toBeVisible();
    
    // Get the href to verify it's a member profile URL
    const href = await memberLink.getAttribute('href');
    expect(href).toMatch(/^\/members\/[a-z0-9-]+$/);
    
    // Click the link
    await memberLink.click();
    
    // Wait for navigation to complete
    await page.waitForURL(/\/members\/[a-z0-9-]+$/);
    
    // Verify we're on a member profile page
    expect(page.url()).toMatch(/\/members\/[a-z0-9-]+$/);
    
    // Verify profile content is visible
    await expect(page.locator('h1')).toBeVisible();
  });
}); 