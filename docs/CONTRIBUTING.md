# Contributing to VAI-VEX

Thank you for your interest in contributing to the VAI-VEX platform! This guide will help you get started with contributing to our community platform.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Payment System Guidelines](#payment-system-guidelines)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:
- Be respectful and constructive in discussions
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

For initial project setup, including cloning the repository, installing dependencies, and setting up environment variables, please refer to the [Project Overview](../docs/PROJECT_README.md).

### Local Development Setup

Once you have completed the initial setup, you can start your local development environment:

1. **Start Convex backend**
   ```bash
   npx convex dev
   ```

2. **Start Next.js frontend**
   ```bash
   npm run dev
   ```

3. **Run Tests**
   ```bash
   npm test          # Unit tests
   npm run test:e2e  # E2E tests (if available)
   ```

## Development Process

### Branch Naming

Use descriptive branch names:
- `feat/add-user-badges` - New features
- `fix/payment-webhook-retry` - Bug fixes
- `docs/update-api-reference` - Documentation
- `refactor/optimize-queries` - Code refactoring
- `test/add-member-tests` - Test additions

### Making Changes

1. Create a new branch from `master`
2. Make your changes following our code style
3. Add or update tests as needed
4. Update documentation if required
4. Commit with clear, descriptive messages

### Commit Messages

Follow conventional commits format:
```
feat: add member achievement system
fix: resolve payment webhook timeout
docs: update deployment guide
test: add subscription renewal tests
refactor: optimize member query performance
```

## Code Style

### TypeScript

- Always use TypeScript for type safety
- Define proper types, avoid `any`
- Use interfaces for object shapes
- Export types from a central location

```typescript
// Good
interface MemberProfile {
  id: string;
  tier: MemberTier;
  subscriptionStatus: SubscriptionStatus;
}

// Bad
const member: any = { id: "123" };
```

### React Components

- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Follow the project's component structure

```typescript
// Good
export function MemberCard({ member }: { member: Doc<"members"> }) {
  const subscription = useQuery(api.members.getSubscription, { 
    memberId: member._id 
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{member.firstName} {member.lastName}</CardTitle>
      </CardHeader>
    </Card>
  );
}
```

### Convex Guidelines

- Keep queries and mutations focused
- Use proper authentication checks
- Validate all inputs
- Handle errors gracefully

```typescript
// Good
export const updateProfile = mutation({
  args: {
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const member = await requireAuth(ctx);
    
    if (args.bio && args.bio.length > 500) {
      throw new ConvexError("Bio must be 500 characters or less");
    }
    
    await ctx.db.patch(member._id, args);
  },
});
```

### Styling

- Use Tailwind CSS utilities
- Follow existing patterns
- Keep responsive design in mind
- Use CSS variables for theming

```jsx
// Good
<div className="flex items-center gap-4 p-4 rounded-lg border">
  <Avatar className="h-10 w-10" />
  <div className="flex-1">
    <h3 className="font-semibold">{member.name}</h3>
  </div>
</div>
```

## Testing

### Unit Tests

Write tests for:
- Utility functions
- Custom hooks
- Component logic
- API helpers

```typescript
describe("canViewFullContent", () => {
  test("should return false for free tier members", () => {
    const member = createMockMember({ tier: "free" });
    expect(canViewFullContent(member)).toBe(false);
  });
});
```

### Integration Tests

Test complete flows:
- Payment processing
- Authentication flows
- Data mutations
- Webhook handling

### Test Coverage

- Aim for >80% coverage on new code
- Test edge cases and error conditions
- Mock external dependencies
- Use realistic test data

## Submitting Changes

### Pull Request Process

1. **Update your branch**
   ```bash
   git checkout master
   git pull upstream master
   git checkout your-feature-branch
   git rebase master
   ```

2. **Run all checks**
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

3. **Create Pull Request**
   - Use a descriptive title
   - Reference any related issues
   - Include screenshots for UI changes
   - List testing steps

4. **PR Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests pass
   - [ ] Manual testing completed
   - [ ] No console errors

   ## Screenshots (if applicable)
   ```

### Code Review

- Respond to feedback constructively
- Make requested changes promptly
- Ask questions if unclear
- Thank reviewers for their time

## Payment System Guidelines

When working on payment features, adhere to these guidelines:

### Security First
- Never log sensitive payment data.
- Always validate webhook signatures.
- Use idempotency for critical operations.
- Test with Stripe test mode.

### Follow Patterns
- Use existing payment types.
- Maintain tier hierarchy.
- Preserve grandfathered pricing.
- Update documentation as needed.

### Testing Payments
Use the following test card numbers for different scenarios:
```bash
# Success
4242 4242 4242 4242

# Decline
4000 0000 0000 0002
```

To test webhooks locally, use the Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Getting Help

### Resources
- [Documentation](./docs/)
- [API Reference](./docs/API.md)
- [Discord Dev Channel](#dev-support)
- [GitHub Discussions](https://github.com/vai-vex/vai-vex/discussions)

### Common Issues

**Convex connection errors**
- Check your Convex deployment URL
- Ensure `npx convex dev` is running

**Type errors**
- Run `npm run typecheck`
- Regenerate types: `npx convex dev`

**Payment webhook failures**
- Verify webhook secret
- Check Stripe dashboard for errors
- Use webhook CLI for local testing

## Convex Patterns
- **Schema-first design** in `convex/schema.ts`
- **Query functions** for reads, **mutations** for writes
- **Internal functions** prefixed with `internal`
- **Comprehensive JSDoc** on all functions
- **Organized structure**: main functions in root, grouped features in subdirectories
- **Test files** in `convex/test/`
- **Migrations** in `convex/migrations/` with README

## UI Guidelines
- **Animated icons**: https://icons.pqoqubbw.dev/
- **Static icons**: https://www.radix-ui.com/icons
- **Colors**: Follow Radix UI color guidelines for backgrounds, interactive components, borders, and accessible text
- **Components**: Use existing Radix UI + shadcn patterns

## Recognition

Contributors are recognized in:
- Release notes
- Contributors section in README
- Community announcements

Thank you for contributing to VAI-VEX! 🚀