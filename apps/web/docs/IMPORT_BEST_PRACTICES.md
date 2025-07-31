# Convex Data Import Best Practices

Based on the official Convex documentation for [Internal Functions](https://docs.convex.dev/functions/internal-functions) and [HTTP Actions](https://docs.convex.dev/functions/http-actions).

## ✅ Correct Approach for Data Imports

### 1. Use Internal Functions for Import Logic

**Why**: Import operations should not be directly callable from clients for security reasons.

```typescript
// ✅ CORRECT: Internal mutation for imports
export const importPostsBatch = internalMutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // Import logic here
  },
});
```

### 2. Execution Methods (Both Are Valid)

#### Option A: CLI Execution (Development/One-time imports)
```bash
npx convex run importPostsComments:importPostsBatch
```

**Use cases**:
- Development and testing
- One-time data migrations
- Manual imports by developers

#### Option B: HTTP Actions (Production/Automated imports)
```typescript
// convex/http.ts
const importData = httpAction(async (ctx, request) => {
  // Authentication check
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.IMPORT_SECRET_TOKEN}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  // Call internal mutations
  await ctx.runMutation(internal.importPostsComments.importPostsBatch, data);
});
```

**Use cases**:
- Webhook integrations
- Automated imports from external systems
- Production data synchronization

### 3. Error Handling Best Practices

Use `ConvexError` for structured errors:

```typescript
import { ConvexError } from "convex/values";

// Throw structured errors
throw new ConvexError({
  message: "Import failed",
  errors: detailedErrors,
  type: "import_failure"
});
```

### 4. Batch Processing Guidelines

- Process data in reasonable batch sizes (e.g., 50-100 items)
- Return detailed results including success/failure counts
- Log errors but continue processing valid items

```typescript
return { 
  postIdMap: Object.fromEntries(postIdMap),
  importedCount: postIdMap.size,
  totalCount: args.posts.length,
  errors: errors
};
```

### 5. Security Considerations

For HTTP Actions:
- Always authenticate requests
- Use environment variables for secrets
- Validate input data
- Return appropriate HTTP status codes

```typescript
const expectedToken = process.env.IMPORT_SECRET_TOKEN;
if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
  return new Response("Unauthorized", { status: 401 });
}
```

## 🚫 Anti-Patterns to Avoid

### ❌ DON'T: Make import functions public
```typescript
// ❌ WRONG: Public mutation for imports
export const importData = mutation({
  // This exposes import logic to clients!
});
```

### ❌ DON'T: Import without error handling
```typescript
// ❌ WRONG: No error handling
for (const item of items) {
  await ctx.db.insert("table", item); // Could fail silently
}
```

### ❌ DON'T: Process everything in one transaction
```typescript
// ❌ WRONG: Too large for single transaction
await ctx.db.insert("posts", allThousandsOfPosts);
```

## 📋 Checklist for Production Imports

- [ ] Use `internalMutation` for import logic
- [ ] Implement proper error handling with `ConvexError`
- [ ] Process data in batches
- [ ] Return detailed import results
- [ ] Set up HTTP actions for automated imports (if needed)
- [ ] Add authentication to HTTP endpoints
- [ ] Test with small datasets first
- [ ] Monitor import progress and errors
- [ ] Document the import process

## 🔗 References

- [Internal Functions Documentation](https://docs.convex.dev/functions/internal-functions)
- [HTTP Actions Documentation](https://docs.convex.dev/functions/http-actions)
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices) 