import { convexTest } from "convex-test";
import { expect, test, vi, beforeEach, afterEach } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

beforeEach(() => {
  // Reset mocks before each test
  mockFetch.mockReset();
  // Set up default environment variable
  process.env.GITHUB_TOKEN = 'test-github-token';
});

afterEach(() => {
  // Clean up environment
  delete process.env.GITHUB_TOKEN;
});

test("createFeatureRequest creates issue with authenticated user", async () => {
  const t = convexTest(schema);
  
  // Mock successful GitHub API response
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      number: 123,
      html_url: 'https://github.com/joinvai/vai-vex/issues/123'
    })
  });

  // Set up authentication
  const asAuthenticatedUser = t.withIdentity({ 
    email: 'user@example.com',
    name: 'Test User',
    subject: 'clerk-user-123'
  });

  // Call the action
  const result = await asAuthenticatedUser.action(api.github.createFeatureRequest, {
    title: 'Add dark mode',
    description: 'It would be great to have a dark mode option in the settings.',
    screenshotUrls: ['https://example.com/screenshot1.png', 'https://example.com/screenshot2.jpg']
  });

  // Verify the result
  expect(result).toEqual({
    issueNumber: 123,
    issueUrl: 'https://github.com/joinvai/vai-vex/issues/123',
    success: true
  });

  // Verify the fetch call
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith(
    'https://api.github.com/repos/joinvai/vai-vex/issues',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test-github-token',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      })
    })
  );

  // Verify the request body
  const fetchCall = mockFetch.mock.calls[0];
  const requestBody = JSON.parse(fetchCall[1].body);
  
  expect(requestBody.title).toBe('[Feature] Add dark mode');
  expect(requestBody.labels).toEqual(['user submitted', 'feature request']);
  expect(requestBody.body).toContain('## Feature Description');
  expect(requestBody.body).toContain('It would be great to have a dark mode option in the settings.');
  expect(requestBody.body).toContain('Test User (user@example.com)');
  expect(requestBody.body).toContain('## Screenshots');
  expect(requestBody.body).toContain('![screenshot1.png](https://example.com/screenshot1.png)');
  expect(requestBody.body).toContain('![screenshot2.jpg](https://example.com/screenshot2.jpg)');
});

test("createFeatureRequest creates issue with anonymous user", async () => {
  const t = convexTest(schema);
  
  // Mock successful GitHub API response
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      number: 124,
      html_url: 'https://github.com/joinvai/vai-vex/issues/124'
    })
  });

  // Call the action without authentication
  const result = await t.action(api.github.createFeatureRequest, {
    title: 'Add keyboard shortcuts',
    description: 'Support keyboard shortcuts for common actions.'
  });

  // Verify the result
  expect(result).toEqual({
    issueNumber: 124,
    issueUrl: 'https://github.com/joinvai/vai-vex/issues/124',
    success: true
  });

  // Verify the request body contains anonymous user
  const fetchCall = mockFetch.mock.calls[0];
  const requestBody = JSON.parse(fetchCall[1].body);
  
  expect(requestBody.body).toContain('Anonymous user');
  expect(requestBody.body).not.toContain('## Screenshots');
});

test("createFeatureRequest handles non-image attachments", async () => {
  const t = convexTest(schema);
  
  // Mock successful GitHub API response
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      number: 125,
      html_url: 'https://github.com/joinvai/vai-vex/issues/125'
    })
  });

  // Call the action with various attachment types
  await t.action(api.github.createFeatureRequest, {
    title: 'Feature with documents',
    description: 'This feature includes documentation.',
    screenshotUrls: [
      'https://example.com/document.pdf',
      'https://example.com/design.svg',
      'https://example.com/specs.doc'
    ]
  });

  // Verify the request body handles different file types
  const fetchCall = mockFetch.mock.calls[0];
  const requestBody = JSON.parse(fetchCall[1].body);
  
  expect(requestBody.body).toContain('[📎 document.pdf](https://example.com/document.pdf)');
  expect(requestBody.body).toContain('![design.svg](https://example.com/design.svg)'); // SVG is treated as image
  expect(requestBody.body).toContain('[📎 specs.doc](https://example.com/specs.doc)');
});

test("createFeatureRequest throws error when GitHub token is missing", async () => {
  const t = convexTest(schema);
  
  // Remove GitHub token
  delete process.env.GITHUB_TOKEN;

  // Expect the action to throw
  await expect(
    t.action(api.github.createFeatureRequest, {
      title: 'Test feature',
      description: 'Test description'
    })
  ).rejects.toThrow('GitHub token not configured');
});

test("createFeatureRequest handles GitHub API errors", async () => {
  const t = convexTest(schema);
  
  // Mock failed GitHub API response
  mockFetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({
      message: 'Bad credentials',
      errors: [
        { code: 'invalid_token', message: 'Token is expired' }
      ]
    })
  });

  // Expect the action to throw with detailed error
  await expect(
    t.action(api.github.createFeatureRequest, {
      title: 'Test feature',
      description: 'Test description'
    })
  ).rejects.toThrow('Failed to create GitHub issue: Bad credentials (Token is expired)');
});

test("createFeatureRequest handles network errors gracefully", async () => {
  const t = convexTest(schema);
  
  // Mock network error
  mockFetch.mockRejectedValueOnce(new Error('Network error'));

  // Expect the action to throw
  await expect(
    t.action(api.github.createFeatureRequest, {
      title: 'Test feature',
      description: 'Test description'
    })
  ).rejects.toThrow('Network error');
});

test("createFeatureRequest handles malformed API response", async () => {
  const t = convexTest(schema);
  
  // Mock response that fails to parse as JSON
  mockFetch.mockResolvedValueOnce({
    ok: false,
    json: async () => { throw new Error('Invalid JSON'); }
  });

  // Expect the action to throw generic error
  await expect(
    t.action(api.github.createFeatureRequest, {
      title: 'Test feature',
      description: 'Test description'
    })
  ).rejects.toThrow('Failed to create GitHub issue');
});