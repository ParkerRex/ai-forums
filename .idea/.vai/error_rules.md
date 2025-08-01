---
description: This document outlines best practices for error handling in our React + Convex application. Follow these guidelines to ensure consistent, user-friendly error handling across the codebase.
globs: 
alwaysApply: false
---
# Error Handling Guidelines

## Overview
This document outlines best practices for error handling in our React + Convex application. Follow these guidelines to ensure consistent, user-friendly error handling across the codebase.

## Core Principles
1. **User-First**: Always provide clear, actionable error messages to users
2. **Graceful Degradation**: Applications should continue functioning when non-critical parts fail
3. **Retry Logic**: Implement smart retry mechanisms where appropriate
4. **Contextual Messaging**: Error messages should be specific to the operation that failed
5. **Network Awareness**: Handle offline/online states and connectivity issues

## Error Types and Handling Strategies

### 1. Convex Query Errors
**Strategy**: React Error Boundaries (Convex recommended approach)

```typescript
// ✅ DO: Wrap components with error boundaries
<PageErrorBoundary context="loading members directory">
  <MembersContent />
</PageErrorBoundary>

// ✅ DO: Use section-level boundaries for granular control
<QueryErrorBoundary context="loading member posts">
  <PostsList />
</QueryErrorBoundary>
```

**Key Points**:
- Queries are deterministic - retrying with same args will always fail
- Use Error Boundaries to catch errors thrown from `useQuery`
- Provide page reload as retry option for query failures
- Never retry queries automatically

### 2. Convex Mutation Errors
**Strategy**: Try/Catch with Toast Notifications

```typescript
// ✅ DO: Use mutation error hook for consistent handling
const { handleMutationError, handleMutationSuccess } = useMutationError();

const updateProfile = async (data) => {
  try {
    await updateMemberProfile(data);
    handleMutationSuccess("Profile updated successfully");
  } catch (error) {
    handleMutationError(error, () => updateMemberProfile(data), {
      context: "updating profile",
      maxRetries: 3
    });
  }
};
```

**Key Points**:
- Mutations can be retried (non-deterministic)
- Use toast notifications with retry buttons
- Implement exponential backoff (1s, 2s, 4s)
- Maximum 3 retry attempts

### 3. Network Errors
**Strategy**: Detection + User Feedback + Smart Retries

```typescript
// ✅ DO: Use network status hook
const { isOnline, wasOffline } = useNetworkStatus();

// ✅ DO: Show network status indicators
<NetworkStatusIndicator />

// ✅ DO: Handle offline states in error processing
if (!isOnline && processedError.type === "network") {
  // Don't show toast, show offline indicator instead
  return;
}
```

## Error Processing Utilities

### Error Classification
Use `lib/error-utils.ts` for consistent error processing:

```typescript
// ✅ DO: Process errors through utility functions
const processedError = processError(error, "loading members");

// ✅ DO: Check error types for appropriate handling
if (isConvexError(error)) {
  // Handle structured ConvexError with error.data
} else if (isNetworkError(error)) {
  // Handle network connectivity issues
}
```

### Error Types
- **ConvexError**: Application errors with structured data (`error.data`)
- **Network Error**: Connectivity issues, timeouts, fetch failures
- **Server Error**: Backend/database errors
- **Unknown Error**: Generic fallback errors

## Component Error Boundaries

### Page-Level Boundaries
Use for major page failures:

```typescript
// ✅ DO: Wrap entire pages for critical failures
export default function MembersPage() {
  return (
    <PageErrorBoundary context="loading members directory">
      <MembersPageContent />
    </PageErrorBoundary>
  );
}
```

### Section-Level Boundaries
Use for granular error control:

```typescript
// ✅ DO: Wrap individual sections that can fail independently
<QueryErrorBoundary context="loading member posts">
  <PostsSection />
</QueryErrorBoundary>

<QueryErrorBoundary context="loading member activity">
  <ActivitySection />
</QueryErrorBoundary>
```

## Error Display Components

### Available Components
- `ErrorDisplay`: Generic error with Alert styling
- `InlineErrorDisplay`: Compact error for smaller spaces
- `FullPageErrorDisplay`: Full-screen error fallback
- `NetworkStatusIndicator`: Fixed position network status

### Usage Guidelines

```typescript
// ✅ DO: Use appropriate error display for context
<ErrorDisplay 
  error={error} 
  context="loading data"
  onRetry={handleRetry}
  className="my-4"
/>

// ✅ DO: Provide retry functions where appropriate
const handleRetry = () => {
  // Reset error state or reload data
};
```

## Toast Notifications

### Error Toasts
```typescript
// ✅ DO: Use structured error handling with toasts
toast.error(processedError.message, {
  action: {
    label: "Retry",
    onClick: async () => {
      await retryWithBackoff(retryFn, maxRetries);
      toast.success("Action completed successfully");
    }
  },
  duration: 10000 // Keep error toasts longer
});
```

### Success Toasts
```typescript
// ✅ DO: Provide positive feedback for successful operations
toast.success("Profile updated successfully", {
  duration: 4000
});
```

## Network Status Management

### Network Detection
```typescript
// ✅ DO: Use network status hook for connectivity awareness
const { isOnline, wasOffline } = useNetworkStatus();

// ✅ DO: Disable actions when offline for network-dependent operations
<Button 
  disabled={!isOnline && processedError.type === "network"}
  onClick={handleAction}
>
  Retry
</Button>
```

### Network Indicators
```typescript
// ✅ DO: Show network status in layout
// In app/layout.tsx
<NetworkStatusIndicator />
```

## Error Message Guidelines

### User-Friendly Messages
```typescript
// ✅ DO: Provide contextual, actionable error messages
const contextMessages = {
  "loading members": "Failed to load members directory",
  "loading member profile": "Failed to load member profile", 
  "updating profile": "Failed to update profile",
  "searching members": "Search failed"
};
```

### ConvexError Handling
```typescript
// ✅ DO: Extract meaningful messages from ConvexError.data
if (isConvexError(error)) {
  const errorData = error.data;
  if (typeof errorData === "string") {
    message = errorData;
  } else if (errorData?.message) {
    message = errorData.message;
  }
}
```

## Retry Mechanisms

### Exponential Backoff
```typescript
// ✅ DO: Use exponential backoff for retries
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  // Implementation with 1s, 2s, 4s delays
}
```

### Retry Guidelines
- **Queries**: No automatic retry (page reload only)
- **Mutations**: Up to 3 automatic retries with exponential backoff
- **Network Errors**: Retry when connection restored
- **Server Errors**: Retry with backoff
- **Application Errors**: Retry based on error type

## Layout Integration

### Required Components
Add to `app/layout.tsx`:

```typescript
// ✅ DO: Include global error handling components
import { Toaster } from "@/components/ui/sonner";
import { NetworkStatusIndicator } from "@/components/error-display";

// In component return:
<Toaster />
<NetworkStatusIndicator />
```

## Testing Error States

### Manual Testing
- Disconnect network to test offline states
- Modify Convex queries to throw errors
- Test retry mechanisms with temporary failures
- Verify error boundaries catch and display errors
- Check toast notifications appear and function correctly

### Error Simulation
```typescript
// ✅ DO: Create error simulation for testing
const simulateError = () => {
  throw new ConvexError("Simulated error for testing");
};
```

## Anti-Patterns

### ❌ DON'T: Generic Error Handling
```typescript
// ❌ DON'T: Use generic try/catch without proper error processing
try {
  await someOperation();
} catch (error) {
  console.error(error); // Not user-friendly
}
```

### ❌ DON'T: Retry Queries
```typescript
// ❌ DON'T: Retry queries automatically (they're deterministic)
const retryQuery = () => {
  // This will always fail with the same error
  refetch();
};
```

### ❌ DON'T: Ignore Network States
```typescript
// ❌ DON'T: Show network errors when offline
if (!isOnline) {
  toast.error("Network error"); // Confusing when user knows they're offline
}
```

### ❌ DON'T: Unclear Error Messages
```typescript
// ❌ DON'T: Show technical error messages to users
toast.error(error.stack); // Too technical
toast.error("Error 500"); // Not actionable
```

## File Structure

### Error Handling Files
```
lib/
  error-utils.ts          # Error processing utilities
hooks/
  use-network-status.ts   # Network connectivity detection
  use-mutation-error.ts   # Mutation error handling with toasts
components/
  error-display.tsx       # Error UI components
  error-boundary.tsx      # React Error Boundaries
```

### Integration Points
- `app/layout.tsx`: Global Toaster and NetworkStatusIndicator
- Page components: PageErrorBoundary wrappers
- Section components: QueryErrorBoundary wrappers
- Mutation calls: useMutationError hook usage

## Best Practices Summary

1. **Always use Error Boundaries for query errors** (Convex recommended)
2. **Use toast notifications for mutation errors** with retry buttons
3. **Process errors through utility functions** for consistency
4. **Provide contextual error messages** based on operation
5. **Handle network states appropriately** with status indicators
6. **Implement smart retry logic** with exponential backoff
7. **Test error scenarios thoroughly** including offline states
8. **Follow the principle of graceful degradation**
9. **Give users actionable feedback** and retry options
10. **Log errors for debugging** while showing user-friendly messages

This error handling system ensures a robust, user-friendly experience while maintaining developer productivity and debugging capabilities.
