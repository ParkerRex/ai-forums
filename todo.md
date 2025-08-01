# Now

- [ ] Set up Turborepo
- [ ] swap out npm for bun
- [ ] tsconfigs
- [x] Configure project settings

## Convex Components to Implement

- [ ] Swap out R2 for Convex Component
- [ ] Google docs component
- [ ] Chat component
- [ ] Swap out custom online for convex component
- [x] swap out fonts for ibm plex mono google font
- [ ] role based auth
- [ ] swap out clerk for convex auth
- [ ] Implement Biome

### auth

- [ ] `middleware.ts`
- uses getSessionCookie from better auth.
- uses betterFetch -- whats this do?
- calls createAuth from from `lib/auth`
- [ ] `lib/auth.ts`
      this is a combination of better auth plugins and resend. they split out the options, and use a generic ctx function.
- [ ] `app/api/auth/[...all]/route.ts`
      uses a custom `nextJsHandler` function from their better-auth package.
      sets up an endpoint for `GET` and `POST`
- [ ] `lib/auth-client.ts`
      imports `twoFactorClient`, `magicLinkClient`, `emailOTPClient`, `genericOAuthClient` from the better-auth client plugins.
      exports the authclients for use.

what i can remove: all the annoying preview stuff.

just do the normal landing page.

- [ ] `app/page.tsx`
- [ ] `(unauth)/sign-in/page.tsx`
- [ ] `(unauth)/sign-up/page.tsx`
- [ ] `sign-in/SignIn.tsx`
- [ ] `sign-up/SignUp.tsx`
- [ ] `(auth)/hq/page.tsx`
- [ ] `reset-password/page.tsx`
- [ ] `settings/page.tsx`

- we need to write a helper function for authenticating calls.

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
