# Now

- [x] Set up Turborepo
- [x] swap out npm for bun
- [x] tsconfigs
- [x] Configure project settings

## Convex Components to Implement

- [ ] Swap out R2 for Convex Component
- [ ] Google docs component
- [ ] Chat component
- [ ] Swap out custom online for convex component - [ ] read source
- [x] swap out fonts for ibm plex mono google font
- [ ] role based auth
- [x] Implement Biome
- [x] setup resend transactional emails
- [ ]

### auth

files to update:

- [x] `middleware.ts`
- uses getSessionCookie from better auth.
- uses betterFetch -- whats this do?
- calls createAuth from from `lib/auth`
- [x] `lib/auth.ts`
      this is a combination of better auth plugins and resend. they split out the options, and use a generic ctx function.
- [x] `app/api/auth/[...all]/route.ts`
      uses a custom `nextJsHandler` function from their better-auth package.
      sets up an endpoint for `GET` and `POST`
- [x] `lib/auth-client.ts`
      imports `twoFactorClient`, `magicLinkClient`, `emailOTPClient`, `genericOAuthClient` from the better-auth client plugins.
      exports the authclients for use.

  > what i can remove: all the annoying preview stuff. just do the normal landing page.

- [x] `app/page.tsx` this goes to the dashboard right now...
- [x] `(unauth)/sign-in/page.tsx`
- [x] `(unauth)/sign-up/page.tsx`
- [x] `sign-in/SignIn.tsx`
- [x] `sign-up/SignUp.tsx`
- [x] `(auth)/hq/page.tsx`
- [x] `reset-password/page.tsx`
- [x] `settings/page.tsx`

**convex section...**

- [x] `auth.config.ts`
      brings in the providers aka the site url.
- [x] `auth.ts`
      the beefy part of the integration. it accounts for createUser, deleteUser, updateUser, createSession, isAuthenticated..

- we need to write a helper function for authenticating calls.

- [x] resend setup for onboarding emails
      Table cleanup
- [ ] remove `externalId`
- [ ] rewrite schema
- [ ] copy `members` schema to `table betterAuth`
- [ ]

Production Checklist

- [ ] Update all env vars
  - [ ] Remove the clerk ones
  - [ ] Update the vercel account
  - [ ] Remove the cloudflare ones
- [ ] env vars for `RESEND_API_KEY` `RESEND_WEBHOOK_SECRET``

how would this work for making calls?

questions:

- when do we put something in next app/api vs convex?
- do we use server actions for everything then client as needed?

- [ ] Implement flat server function structure:
  - [ ] Create `actions.ts`
  - [ ] Create `helpers.ts`
  - [ ] Create `internal.ts`
  - [ ] Create `mutations.ts`
  - [ ] Create `queries.ts`
  - [ ] Create `updates.ts`

# Later

- [ ] Upload content to MarbleCMS
- [ ] react-email package

```json
{
  "node": {
    "externalPackages": ["@react-email/render"]
  }
}
```

## Skill Issues:

- Testing
- Unit tests first. Backend matters. Mock out the front end with fake stuff.
- Integration tests: eg. if we work with twilio we want mock returns.
- End to end tests with playwright.

how would i set up the members table?

```typescript
interface Users {
  subscriptionStatus;
  membershipTier;
  bio;
  commentCount;
  country;
  email;
  firstName;
  lastName;
  joinedDate;
  lastOnline;
  lastPayment;
  linkGithub;
  linkX;
  linkYouTube;
  city;
  netVoteCount;
  postCount;
  role;
  slug;
  stripeCustomerId;
  subscriptionEndDate;
  subscriptionStatus;
  tier;
  websiteUrl;
  _creationTime;
}
```
