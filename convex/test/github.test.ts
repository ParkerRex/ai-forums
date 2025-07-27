/**
 * @fileoverview GitHub Integration Test Suite
 * 
 * This comprehensive test suite validates the GitHub API integration for feature
 * request submission functionality. The tests extensively cover:
 * - Authenticated vs anonymous user feature request creation
 * - Comprehensive error handling for API failures
 * - Network error resilience and graceful degradation
 * - File attachment handling (screenshots, documents)
 * - GitHub API response parsing and validation
 * - Environment configuration validation
 * 
 * The GitHub integration allows users to submit feature requests directly from
 * the application, which are automatically created as GitHub issues with proper
 * formatting, labels, and metadata attribution.
 * 
 * Testing Strategy:
 * This suite uses extensive mocking of the fetch API to simulate various GitHub
 * API response scenarios without making actual network requests during testing.
 * 
 * @module convex/test/github.test
 */

import { convexTest } from "convex-test";
import { expect, test, vi, beforeEach, afterEach } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

// Global fetch mock for controlling GitHub API responses during testing
// This allows us to simulate various API scenarios without network calls
const mockFetch = vi.fn<typeof fetch>();
global.fetch = mockFetch;

// Helper function to create a mock Response object with all required properties
function createMockResponse(config: {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<any>;
  text?: () => Promise<string>;
}): Response {
  const { ok, status, statusText, json, text } = config;
  const jsonText = text || (async () => JSON.stringify(await json()));
  
  return {
    ok,
    status,
    statusText,
    json,
    text: jsonText,
    headers: new Headers(),
    redirected: false,
    type: 'default',
    url: 'https://api.github.com/repos/joinvai/VAI/issues',
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    bytes: async () => new Uint8Array(),
    formData: async () => new FormData(),
    clone: () => ({} as Response)
  } as Response;
}

/**
 * Test setup and teardown hooks
 * 
 * These hooks ensure each test starts with a clean state and proper
 * environment configuration for GitHub API testing.
 */
beforeEach(() => {
  // Reset all mock function call history and implementations
  // This prevents test interference and ensures isolation
  mockFetch.mockReset();
  
  // Set up default GitHub token for testing
  // In production, this would be a real GitHub personal access token
  process.env.GITHUB_TOKEN = 'test-github-token';
});

afterEach(() => {
  // Clean up environment to prevent test pollution
  // This ensures subsequent tests don't inherit modified environment
  delete process.env.GITHUB_TOKEN;
});

/**
 * Test: Feature request creation with authenticated user
 * 
 * Validates the complete feature request workflow for an authenticated user,
 * including proper GitHub issue formatting, label application, and metadata
 * attribution. This is the primary happy path for the feature.
 * 
 * @test Authenticated Feature Request Creation
 * @expects GitHub issue created with user attribution and proper formatting
 */
test("createFeatureRequest creates issue with authenticated user", async () => {
  // Initialize test environment
  const t = convexTest(schema);
  
  // Mock successful GitHub API response
  // This simulates a successful issue creation on GitHub
  mockFetch.mockResolvedValueOnce(createMockResponse({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      number: 123, // GitHub issue number
      html_url: 'https://github.com/joinvai/VAI/issues/123' // Public issue URL
    })
  }));

  // Set up authenticated user context for the feature request
  // This simulates a logged-in user submitting a feature request
  const asAuthenticatedUser = t.withIdentity({ 
    email: 'user@example.com',
    name: 'Test User',
    subject: 'clerk-user-123' // Clerk authentication identifier
  });

  // Call the GitHub integration action with comprehensive test data
  const result = await asAuthenticatedUser.action(api.github.createFeatureRequest, {
    title: 'Add dark mode',
    description: 'It would be great to have a dark mode option in the settings.',
    screenshotUrls: [
      'https://example.com/screenshot1.png', 
      'https://example.com/screenshot2.jpg'
    ] // Test file attachments
  });

  // Verify the action returned expected success response
  expect(result).toEqual({
    issueNumber: 123,
    issueUrl: 'https://github.com/joinvai/VAI/issues/123',
    success: true
  });

  // Verify the GitHub API was called correctly
  expect(mockFetch).toHaveBeenCalledTimes(1); // Single API call made
  expect(mockFetch).toHaveBeenCalledWith(
    'https://api.github.com/repos/joinvai/VAI/issues', // Correct API endpoint
    expect.objectContaining({
      method: 'POST', // HTTP POST for issue creation
      headers: expect.objectContaining({
        Authorization: 'Bearer test-github-token', // Proper authentication
        Accept: 'application/vnd.github+json', // GitHub API version header
        'X-GitHub-Api-Version': '2022-11-28', // Specific API version
        'Content-Type': 'application/json' // JSON payload
      })
    })
  );

  // Verify the request payload was formatted correctly
  const fetchCall = mockFetch.mock.calls[0];
  const requestBody = JSON.parse(fetchCall[1]?.body as string);
  
  // Validate issue title formatting
  expect(requestBody.title).toBe('[Feature] Add dark mode');
  
  // Validate GitHub labels are applied correctly
  expect(requestBody.labels).toEqual(['user submitted', 'feature request']);
  
  // Validate issue body contains all required sections
  expect(requestBody.body).toContain('## Feature Description');
  expect(requestBody.body).toContain('It would be great to have a dark mode option in the settings.');
  expect(requestBody.body).toContain('Test User (user@example.com)'); // User attribution
  expect(requestBody.body).toContain('## Screenshots');
  
  // Validate screenshot attachments are properly formatted as markdown images
  expect(requestBody.body).toContain('![screenshot1.png](https://example.com/screenshot1.png)');
  expect(requestBody.body).toContain('![screenshot2.jpg](https://example.com/screenshot2.jpg)');
});

/**
 * Test: Feature request creation with anonymous user
 * 
 * Validates that anonymous (unauthenticated) users can still submit feature
 * requests, with appropriate fallback attribution indicating anonymous
 * submission. This ensures the feature is accessible to all users.
 * 
 * @test Anonymous Feature Request Creation
 * @expects GitHub issue created with anonymous attribution
 */
test("createFeatureRequest creates issue with anonymous user", async () => {
  // Initialize test environment
  const t = convexTest(schema);
  
  // Mock successful GitHub API response for anonymous submission
  mockFetch.mockResolvedValueOnce(createMockResponse({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      number: 124, // Different issue number for isolation
      html_url: 'https://github.com/joinvai/VAI/issues/124'
    })
  }));

  // Call action without authentication context (anonymous user)
  const result = await t.action(api.github.createFeatureRequest, {
    title: 'Add keyboard shortcuts',
    description: 'Support keyboard shortcuts for common actions.'
    // No screenshotUrls - testing minimal payload
  });

  // Verify successful anonymous submission
  expect(result).toEqual({
    issueNumber: 124,
    issueUrl: 'https://github.com/joinvai/VAI/issues/124',
    success: true
  });

  // Verify request body handles anonymous user correctly
  const fetchCall = mockFetch.mock.calls[0];
  const requestBody = JSON.parse(fetchCall[1]?.body as string);
  
  // Anonymous users should be clearly identified in the issue
  expect(requestBody.body).toContain('Anonymous user');
  
  // Screenshots section should be omitted when no attachments provided
  expect(requestBody.body).not.toContain('## Screenshots');
});

/**
 * Test: Handling of non-image attachments
 * 
 * Validates that the system properly handles various file types as attachments,
 * formatting images as embedded markdown images and other files as download
 * links with appropriate icons.
 * 
 * @test File Attachment Type Handling
 * @expects Proper markdown formatting for different file types
 */
test("createFeatureRequest handles non-image attachments", async () => {
  // Initialize test environment
  const t = convexTest(schema);
  
  // Mock successful API response
  mockFetch.mockResolvedValueOnce(createMockResponse({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      number: 125,
      html_url: 'https://github.com/joinvai/VAI/issues/125'
    })
  }));

  // Test with various file types to validate attachment handling
  await t.action(api.github.createFeatureRequest, {
    title: 'Feature with documents',
    description: 'This feature includes documentation.',
    screenshotUrls: [
      'https://example.com/document.pdf',    // PDF document
      'https://example.com/design.svg',      // Vector image
      'https://example.com/specs.doc'        // Word document
    ]
  });

  // Verify different file types are handled appropriately
  const fetchCall = mockFetch.mock.calls[0];
  const requestBody = JSON.parse(fetchCall[1]?.body as string);
  
  // PDF should be formatted as download link with document icon
  expect(requestBody.body).toContain('[📎 document.pdf](https://example.com/document.pdf)');
  
  // SVG should be treated as image (vector graphics are displayable)
  expect(requestBody.body).toContain('![design.svg](https://example.com/design.svg)');
  
  // DOC should be formatted as download link with document icon
  expect(requestBody.body).toContain('[📎 specs.doc](https://example.com/specs.doc)');
});

/**
 * Test: Error handling for missing GitHub token
 * 
 * Validates that the system properly handles configuration errors when
 * the GitHub personal access token is not configured in the environment.
 * This is a critical configuration validation test.
 * 
 * @test Configuration Validation
 * @expects Clear error message for missing configuration
 */
test("createFeatureRequest throws error when GitHub token is missing", async () => {
  // Initialize test environment
  const t = convexTest(schema);
  
  // Remove GitHub token to simulate misconfiguration
  delete process.env.GITHUB_TOKEN;

  // Attempt to create feature request without proper configuration
  await expect(
    t.action(api.github.createFeatureRequest, {
      title: 'Test feature',
      description: 'Test description'
    })
  ).rejects.toThrow('GitHub token not configured'); // Expected configuration error
});

/**
 * Test: GitHub API error handling
 * 
 * Validates that the system properly handles and reports GitHub API errors,
 * including authentication failures, rate limiting, and other API-specific
 * error conditions. This ensures robust error reporting to users.
 * 
 * @test GitHub API Error Handling
 * @expects Detailed error message with GitHub API error details
 */
test("createFeatureRequest handles GitHub API errors", async () => {
  // Initialize test environment
  const t = convexTest(schema);
  
  // Mock GitHub API error response (e.g., authentication failure)
  mockFetch.mockResolvedValueOnce(createMockResponse({
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
    json: async () => ({
      message: 'Bad credentials', // GitHub error message
      errors: [
        { code: 'invalid_token', message: 'Token is expired' } // Detailed error info
      ]
    })
  }));

  // Attempt feature request creation with invalid token
  await expect(
    t.action(api.github.createFeatureRequest, {
      title: 'Test feature',
      description: 'Test description'
    })
  ).rejects.toThrow('Failed to create GitHub issue: Bad credentials (Token is expired)');
  // Error should include both main message and specific error details
});

/**
 * Test: Network error handling
 * 
 * Validates that the system gracefully handles network-level errors such as
 * DNS failures, connection timeouts, or service unavailability. This ensures
 * the application remains stable during network issues.
 * 
 * @test Network Error Resilience
 * @expects Network error propagation with clear messaging
 */
test("createFeatureRequest handles network errors gracefully", async () => {
  // Initialize test environment
  const t = convexTest(schema);
  
  // Mock network-level error (connection failure, timeout, etc.)
  mockFetch.mockRejectedValueOnce(new Error('Network error'));

  // Attempt feature request creation during network failure
  await expect(
    t.action(api.github.createFeatureRequest, {
      title: 'Test feature',
      description: 'Test description'
    })
  ).rejects.toThrow('Network error'); // Network error should propagate clearly
});

/**
 * Test: Malformed API response handling
 * 
 * Validates that the system handles cases where the GitHub API returns
 * malformed or unparseable responses. This could occur during GitHub
 * service degradation or API changes.
 * 
 * @test Malformed Response Handling
 * @expects Generic error message for unparseable responses
 */
test("createFeatureRequest handles malformed API response", async () => {
  // Initialize test environment
  const t = convexTest(schema);
  
  // Mock malformed API response that fails to parse as JSON
  mockFetch.mockResolvedValueOnce(createMockResponse({
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    json: async () => { 
      throw new Error('Invalid JSON'); // Simulate JSON parsing failure
    },
    text: async () => 'Invalid response'
  }));

  // Attempt feature request creation with malformed response
  await expect(
    t.action(api.github.createFeatureRequest, {
      title: 'Test feature',
      description: 'Test description'
    })
  ).rejects.toThrow('Failed to create GitHub issue'); // Generic error for unparseable response
  // Should fall back to generic error when specific error details unavailable
}); // End of GitHub integration test suite