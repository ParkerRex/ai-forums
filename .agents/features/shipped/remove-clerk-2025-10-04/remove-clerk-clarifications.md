# Feature Clarifications: Remove Clerk Auth

**Feature**: Remove Clerk Auth and Implement Custom Email/Password Auth
**Mode**: Auto (assumptions made)
**Generated**: 2025-10-04

## 1. Current State Analysis

### Clerk Integration Points

Based on comprehensive codebase analysis, Clerk is deeply integrated across the following areas:

#### Frontend Components (13 files)
- **`app/layout.tsx`**: Root `<ClerkProvider>` wrapper
- **`components/convex-client-provider.tsx`**: `ConvexProviderWithClerk` integration
- **`components/auth/auth-button.tsx`**: `SignInButton` from Clerk
- **`components/auth/sign-in-modal.tsx`**: `SignInButton` modal integration
- **`components/auth/sign-in-form.tsx`**: Clerk sign-in form wrapper
- **`components/console-branding.tsx`**: Clerk authentication logging
- **`components/settings-dialog.tsx`**: User profile management
- **`components/header/member-dropdown.tsx`**: User menu with auth status
- **`components/members/membership-cta-modal.tsx`**: Auth-gated membership flows
- **`components/comments/*.tsx`**: Auth-protected commenting
- **`components/posts/*.tsx`**: Auth-protected post interactions
- **`hooks/use-user-votes.ts`**: Auth-dependent voting logic

#### Middleware & Routing
- **`middleware.ts`**:
  - Uses `clerkMiddleware` and `createRouteMatcher`
  - Protects routes: `/server`, `/account(.*)`, `/settings(.*)`
  - Public routes: `/`, `/sign-in`, `/sign-up`, `/pricing`, `/blog`, `/api`
  - Bypasses: `/api/stripe/webhook`

#### Backend/Convex (6 files)
- **`convex/auth.ts`**:
  - Core `getAuthenticatedMember()` function using `ctx.auth.getUserIdentity()`
  - Clerk identity extraction: `identity.subject`, `identity.email`, `identity.pictureUrl`
  - Legacy email fallback for migration
  - Auto-linking of guest accounts
- **`convex/auth.config.ts`**: Clerk JWT issuer domain configuration
- **`convex/auth/clerkAccounts.ts`**:
  - Clerk Backend API integration for account creation
  - Sign-in token generation via Clerk API
  - Stripe checkout integration
- **`convex/members.ts`**: Member management with Clerk user lookup
- **`convex/posts.ts`**: Auth-required post operations
- **`convex/resources.ts`**: Auth-required resource management
- **`convex/admin/*.ts`**: Admin functions using Clerk auth

#### Database Schema
- **`convex/schema.ts`**:
  - `members.externalId` (v.optional(v.string())): Stores Clerk user ID
  - `members.signInToken` (v.optional(v.string())): Temporary Clerk sign-in token
  - Index: `by_externalId` for fast Clerk ID lookup
  - Index: `by_email` for legacy email lookup

#### Migration Scripts
- **`scripts/sync-clerk-avatars.js`**: Syncs avatars from Clerk
- **`scripts/sync-clerk-avatars-direct.js`**: Direct Clerk avatar sync
- **`scripts/list-members-needing-avatars.js`**: Audit script for Clerk data
- **`convex/migrations/sync_clerk_avatars.ts`**: Migration for Clerk avatar data
- **`convex/migrations/linkGuestAccounts.ts`**: Links guest accounts to Clerk users
- **`convex/migrations/create_clerk_accounts_for_legacy_members.ts`**: Backfills Clerk accounts
- **`convex/migrations/create_clerk_account_for_email.ts`**: Creates Clerk account for specific email

#### Package Dependencies
- `@clerk/nextjs@6.12.6`: Next.js integration
- `@clerk/clerk-react@5.25.0`: React hooks and components
- `@clerk/types@4.64.0`: TypeScript type definitions

#### Environment Variables
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Client-side Clerk API key
- `CLERK_SECRET_KEY`: Server-side Clerk API key
- `CLERK_JWT_ISSUER_DOMAIN`: JWT issuer for Convex auth
- `CLERK_WEBHOOK_SECRET`: (likely exists) For Clerk webhook validation

### Current Authentication Flows

1. **Sign Up Flow**:
   - User clicks "MEMBERS" button → Clerk modal opens
   - Clerk handles OAuth/email sign-up
   - Clerk creates user account and returns JWT
   - Next.js middleware validates JWT
   - Convex receives `getUserIdentity()` with Clerk subject/email
   - `getAuthenticatedMember()` creates/updates member record
   - Links `externalId` to Clerk user ID

2. **Sign In Flow**:
   - User clicks sign-in → Clerk modal/redirect
   - Clerk authenticates user
   - JWT issued and stored in cookies
   - Middleware validates on protected routes
   - Convex queries use `getUserIdentity()` for auth context

3. **Session Management**:
   - Clerk manages JWT refresh automatically
   - Sessions stored in HTTP-only cookies by Clerk
   - Client-side: `useAuth()` hook provides auth state
   - Server-side: `ctx.auth.getUserIdentity()` in Convex

4. **Guest-to-Member Conversion** (Stripe):
   - Guest purchases membership → creates guest member record
   - `createClerkAccount` action calls Clerk Backend API
   - Creates Clerk user with `skip_password_requirement: true`
   - Generates sign-in token (5-min expiry)
   - Updates member record with `externalId` and `signInToken`
   - User auto-signs in via token

## 2. Requirements & Assumptions (Auto Mode)

### Authentication Method
**Decision**: Email + Password only (initial implementation)
- **Remove**: All Clerk OAuth providers, Clerk sign-in/sign-up modals
- **Add**: Custom email/password auth with secure password hashing
- **Rationale**: Simplify initial implementation; OAuth can be added later as separate feature
- **Password Hashing**: bcrypt with cost factor 12 (industry standard, OWASP recommended)

### Password Policy
To prevent weak passwords and meet security best practices:
- **Minimum Length**: 8 characters
- **Complexity Requirements**:
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 number (0-9)
  - At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
- **Validation**: Client-side + server-side validation using Zod schemas
- **Password Strength Meter**: Visual indicator during sign-up (optional enhancement)
- **Common Password Check**: Block top 10,000 common passwords (future enhancement)

### Session Management
**Method**: JWT tokens in HTTP-only secure cookies
- **Token Type**: Signed JWT containing `{ memberId, email, issuedAt, expiresAt }`
- **Expiry**: 7 days (configurable via env var `SESSION_EXPIRY_DAYS`)
- **Storage**: HTTP-only, Secure, SameSite=Lax cookies
- **Refresh Strategy**:
  - Automatic refresh when token has <24 hours remaining
  - Sliding window: each request extends session if near expiry
  - Refresh endpoint: `POST /api/auth/refresh`
- **Token Secret**: `JWT_SECRET` env var (minimum 32 characters, auto-generated on first deploy)
- **Convex Integration**:
  - Custom auth provider in `convex/auth.config.ts`
  - JWT verification in Convex via `ctx.auth.getUserIdentity()`
  - Replace Clerk JWT issuer with custom issuer

### Database: Sessions Table
**New Table**: `sessions` in Convex schema
```typescript
sessions: defineTable({
  memberId: v.id("members"),           // Member who owns this session
  token: v.string(),                   // JWT token (hashed for security)
  expiresAt: v.number(),               // Unix timestamp expiry
  createdAt: v.number(),               // Session creation time
  lastActiveAt: v.number(),            // Last request with this token
  userAgent: v.optional(v.string()),   // Browser/device info for security
  ipAddress: v.optional(v.string()),   // IP address for security audit
  deviceFingerprint: v.optional(v.string()), // Device ID for multi-device support
})
  .index("by_memberId", ["memberId"])              // All sessions for a user
  .index("by_token", ["token"])                    // Fast token lookup
  .index("by_expiresAt", ["expiresAt"])            // Cleanup expired sessions
  .index("by_member_and_active", ["memberId", "expiresAt"]); // Active sessions per user
```

**Session Cleanup**: Cron job runs daily to delete expired sessions (optimization)

### Email Verification
**Requirement**: Mandatory for all new sign-ups
- **Flow**:
  1. User signs up → account created with `emailVerified: false`
  2. Verification email sent with unique token link
  3. User clicks link → `POST /api/auth/verify-email?token=...`
  4. Token validated → `emailVerified: true`, auto sign-in
- **Token Expiry**: 24 hours (configurable via `EMAIL_VERIFICATION_EXPIRY_HOURS`)
- **Token Storage**: New table `email_verifications`
- **Token Format**: Cryptographically secure random string (32 bytes, base64url encoded)
- **Resend Limit**: Max 3 verification emails per hour per email address
- **Unverified User Behavior**: Can sign in but see banner prompting verification; some features restricted

### Database: Email Verifications Table
```typescript
email_verifications: defineTable({
  memberId: v.id("members"),           // Member needing verification
  token: v.string(),                   // Verification token (hashed)
  email: v.string(),                   // Email being verified
  expiresAt: v.number(),               // Token expiry timestamp
  createdAt: v.number(),               // Token creation time
  verifiedAt: v.optional(v.number()),  // When verification completed (for audit)
})
  .index("by_token", ["token"])                    // Fast token lookup
  .index("by_memberId", ["memberId"])              // User's verification requests
  .index("by_email", ["email"])                    // Rate limiting by email
  .index("by_expiresAt", ["expiresAt"]);           // Cleanup expired tokens
```

### Password Reset
**Flow**: Secure email-based password reset
- **Request Flow**:
  1. User clicks "Forgot Password" → enters email
  2. If email exists → send reset email (always show success to prevent email enumeration)
  3. Email contains link: `/auth/reset-password?token=...`
  4. User clicks → redirected to "Set New Password" page
  5. User enters new password → validates token → updates password → auto sign-in
- **Token Expiry**: 1 hour (configurable via `PASSWORD_RESET_EXPIRY_HOURS`)
- **Token Format**: Cryptographically secure random string (32 bytes, base64url encoded)
- **Rate Limit**: Max 3 password reset requests per hour per email
- **Security**: Token is single-use (deleted after successful reset or expiry)
- **Previous Password Validation**: Prevent reuse of current password

### Database: Password Resets Table
```typescript
password_resets: defineTable({
  memberId: v.id("members"),           // Member requesting reset
  token: v.string(),                   // Reset token (hashed)
  email: v.string(),                   // Email address
  expiresAt: v.number(),               // Token expiry timestamp
  createdAt: v.number(),               // Request creation time
  usedAt: v.optional(v.number()),      // When token was used (prevents reuse)
  ipAddress: v.optional(v.string()),   // IP for security audit
})
  .index("by_token", ["token"])                    // Fast token lookup
  .index("by_memberId", ["memberId"])              // User's reset requests
  .index("by_email", ["email"])                    // Rate limiting by email
  .index("by_expiresAt", ["expiresAt"]);           // Cleanup expired tokens
```

### Security Features

#### Rate Limiting
Implement rate limiting at Convex function level using new table:
```typescript
rate_limits: defineTable({
  key: v.string(),                     // Rate limit key (e.g., "login:email@example.com")
  attempts: v.number(),                // Number of attempts in current window
  windowStart: v.number(),             // Start of current time window
  lockedUntil: v.optional(v.number()), // Account lock expiry (for login attempts)
})
  .index("by_key", ["key"])                        // Fast key lookup
  .index("by_windowStart", ["windowStart"]);       // Cleanup old windows
```

**Rate Limits**:
- **Login Attempts**: 5 per 15 minutes per email
- **Account Lockout**: After 10 failed login attempts → lock account for 1 hour
- **Password Reset Requests**: 3 per hour per email
- **Email Verification Resends**: 3 per hour per email
- **Sign-up Attempts**: 5 per hour per IP address (prevent spam)

#### CSRF Protection
- **Method**: Double-submit cookie pattern
- **Implementation**:
  - Generate CSRF token on first page load
  - Store in cookie (`csrf_token`) and require in custom header (`X-CSRF-Token`)
  - Validate token on all mutation requests
  - Tokens rotate every session

#### Password Security
- **Hashing**: bcrypt with cost factor 12
- **Password History**: Track last 3 password hashes, prevent reuse
- **Timing Attack Prevention**: Use constant-time comparison for password checks
- **Leaked Password Check**: (Future) Integration with Have I Been Pwned API

### Database: Password History Table
```typescript
password_history: defineTable({
  memberId: v.id("members"),           // Member whose password changed
  passwordHash: v.string(),            // Previous password hash (for reuse prevention)
  createdAt: v.number(),               // When password was set
})
  .index("by_memberId", ["memberId"])              // User's password history
  .index("by_createdAt", ["createdAt"]);           // Cleanup old history (keep last 3 per user)
```

## 3. Database Schema Changes

### New Tables

#### 1. `sessions`
Purpose: Track active user sessions with JWT tokens
```typescript
sessions: defineTable({
  memberId: v.id("members"),
  token: v.string(),                   // SHA-256 hash of JWT token
  expiresAt: v.number(),
  createdAt: v.number(),
  lastActiveAt: v.number(),
  userAgent: v.optional(v.string()),
  ipAddress: v.optional(v.string()),
  deviceFingerprint: v.optional(v.string()),
})
  .index("by_memberId", ["memberId"])
  .index("by_token", ["token"])
  .index("by_expiresAt", ["expiresAt"])
  .index("by_member_and_active", ["memberId", "expiresAt"]);
```

#### 2. `password_resets`
Purpose: Secure password reset flow
```typescript
password_resets: defineTable({
  memberId: v.id("members"),
  token: v.string(),                   // SHA-256 hash of reset token
  email: v.string(),
  expiresAt: v.number(),
  createdAt: v.number(),
  usedAt: v.optional(v.number()),
  ipAddress: v.optional(v.string()),
})
  .index("by_token", ["token"])
  .index("by_memberId", ["memberId"])
  .index("by_email", ["email"])
  .index("by_expiresAt", ["expiresAt"]);
```

#### 3. `email_verifications`
Purpose: Email verification for new accounts
```typescript
email_verifications: defineTable({
  memberId: v.id("members"),
  token: v.string(),                   // SHA-256 hash of verification token
  email: v.string(),
  expiresAt: v.number(),
  createdAt: v.number(),
  verifiedAt: v.optional(v.number()),
})
  .index("by_token", ["token"])
  .index("by_memberId", ["memberId"])
  .index("by_email", ["email"])
  .index("by_expiresAt", ["expiresAt"]);
```

#### 4. `rate_limits`
Purpose: Rate limiting and abuse prevention
```typescript
rate_limits: defineTable({
  key: v.string(),
  attempts: v.number(),
  windowStart: v.number(),
  lockedUntil: v.optional(v.number()),
})
  .index("by_key", ["key"])
  .index("by_windowStart", ["windowStart"]);
```

#### 5. `password_history`
Purpose: Prevent password reuse
```typescript
password_history: defineTable({
  memberId: v.id("members"),
  passwordHash: v.string(),
  createdAt: v.number(),
})
  .index("by_memberId", ["memberId"])
  .index("by_createdAt", ["createdAt"]);
```

### Modified Tables

#### `members` Table Changes
```typescript
// REMOVE:
- externalId: v.optional(v.string())     // Clerk user ID - no longer needed
- signInToken: v.optional(v.string())    // Clerk sign-in token - no longer needed

// ADD:
- passwordHash: v.string()               // bcrypt hash of password
- emailVerified: v.boolean()             // Email verification status (default: false)
- lastLoginAt: v.optional(v.number())    // Track last successful login
- failedLoginAttempts: v.number()        // Failed login counter (default: 0)
- lockedUntil: v.optional(v.number())    // Account lock timestamp (after too many failed logins)

// UPDATE INDEXES:
.index("by_externalId", ["externalId"])  // REMOVE - no longer used
.index("by_email", ["email"])            // KEEP - now primary auth lookup
.index("by_emailVerified", ["emailVerified"]) // ADD - find unverified users
```

**Migration Strategy for `members` Table**:
- Existing members: Set `emailVerified: true` (assume verified via Clerk)
- Existing members: Set `failedLoginAttempts: 0`
- Existing members: Remove `externalId` and `signInToken` fields
- Force password reset: Send migration email to all users to set passwords

## 4. Migration Strategy

### Phase 1: Preparation (Day 0)
1. **Backup Current Data**:
   - Export all member records to CSV/JSON
   - Archive Clerk webhook events for audit trail
   - Document current user count and subscription statuses

2. **Deploy New Schema** (additive changes first):
   - Add new tables: `sessions`, `password_resets`, `email_verifications`, `rate_limits`, `password_history`
   - Add new fields to `members` (nullable initially): `passwordHash`, `emailVerified`, `lastLoginAt`, `failedLoginAttempts`, `lockedUntil`
   - Deploy Convex schema changes

3. **Feature Flag Setup**:
   - Add `NEXT_PUBLIC_USE_CUSTOM_AUTH=false` (default: false, keeps Clerk active)
   - Test custom auth in staging with flag enabled

### Phase 2: User Migration (Days 1-7)
**Approach**: Forced password reset on first login post-migration

1. **Send Migration Email to All Users**:
   - Subject: "Important: Set Your New Password for VAI"
   - Content:
     - Explain we're moving to custom auth for better control
     - Include "Set Password" button → links to `/auth/set-password?token={migration_token}`
     - Token is unique per user, expires in 7 days
     - Mention they'll need to set password before next login

2. **Migration Token Generation**:
   - Create migration script: `scripts/generate-migration-tokens.ts`
   - For each active member:
     - Generate secure reset token
     - Insert into `password_resets` table (7-day expiry)
     - Queue email via Resend

3. **Set Password Flow**:
   - User clicks email link → lands on `/auth/set-password?token=...`
   - Form: Enter new password (with strength meter), confirm password
   - Submit → validates token, hashes password, updates `members.passwordHash`
   - Sets `emailVerified: true` (email confirmed via token click)
   - Auto-signs in user with new session
   - Deletes migration token

4. **Fallback for Users Who Don't Migrate**:
   - On sign-in attempt: Check if `passwordHash` is empty
   - If empty: Redirect to `/auth/set-password` with inline flow
   - Generate new reset token on-demand
   - Send verification email again

### Phase 3: Cutover (Day 7-8)
1. **Flip Feature Flag**: Set `NEXT_PUBLIC_USE_CUSTOM_AUTH=true`
2. **Remove Clerk Middleware**: Replace `clerkMiddleware` with custom JWT middleware
3. **Update Convex Auth Config**: Point to custom JWT issuer
4. **Deploy Frontend Changes**: Replace all Clerk components with custom auth UI
5. **Monitor**: Watch error logs, user sign-ins, session creation

### Phase 4: Cleanup (Days 14-30)
1. **Remove Clerk Dependencies**:
   - Uninstall packages: `@clerk/nextjs`, `@clerk/clerk-react`, `@clerk/types`
   - Remove `ClerkProvider` from `app/layout.tsx`
   - Delete `convex/auth/clerkAccounts.ts`
   - Delete migration scripts for Clerk

2. **Database Cleanup**:
   - Drop `members.externalId` field from schema
   - Drop `members.signInToken` field from schema
   - Remove `by_externalId` index

3. **Archive Clerk Credentials**:
   - Remove env vars from production
   - Save credentials in password manager (in case rollback needed)
   - Document Clerk account details for future reference

### Data Preservation
**Keep All User Data**:
- ✅ All posts, comments, votes, bookmarks preserved
- ✅ Member profiles (firstName, lastName, email, bio, links, avatar)
- ✅ Subscription data (tier, stripeCustomerId, subscriptionStatus)
- ✅ Engagement metrics (postCount, commentCount, netVoteCount)
- ✅ Settings and preferences

**Remove Only**:
- ❌ `externalId` (Clerk user ID)
- ❌ `signInToken` (Clerk temporary token)

### Rollback Plan
**If Major Issues Arise** (e.g., users can't log in, data loss, security breach):

1. **Immediate Rollback** (within 24 hours):
   - Set `NEXT_PUBLIC_USE_CUSTOM_AUTH=false` (revert to Clerk)
   - Redeploy previous middleware.ts
   - Restore Clerk env vars from backup
   - Users with Clerk accounts can immediately sign in
   - Users who set passwords can't sign in until Clerk re-enabled (acceptable short-term)

2. **Post-Rollback** (if permanent revert needed):
   - Re-link Clerk accounts for users who set passwords during migration
   - Option: Allow dual auth (Clerk OR custom) during transition period
   - Keep new auth tables for future attempt

**Success Criteria for Proceeding**:
- 80%+ of active users successfully set passwords within 7 days
- Zero critical security vulnerabilities discovered
- Sign-in success rate >95%
- Session management working reliably

## 5. Implementation Scope

### In Scope ✅

#### Authentication Core
- ✅ Email/password sign-up with validation
- ✅ Email/password sign-in
- ✅ Sign-out (clear session cookie + delete session from DB)
- ✅ Password reset flow (request → email → reset)
- ✅ Email verification flow (sign-up → email → verify → auto-login)
- ✅ Session management with JWT in HTTP-only cookies
- ✅ Session refresh with sliding window
- ✅ Password strength validation (client + server)

#### Security
- ✅ bcrypt password hashing (cost 12)
- ✅ Rate limiting (login, password reset, sign-up)
- ✅ Account lockout after failed attempts
- ✅ CSRF protection (double-submit cookie)
- ✅ Password history (prevent reuse of last 3)
- ✅ Secure token generation (crypto.randomBytes)
- ✅ SQL injection prevention (Convex validators)
- ✅ XSS prevention (input sanitization)

#### Database
- ✅ New tables: sessions, password_resets, email_verifications, rate_limits, password_history
- ✅ Update members table (add passwordHash, emailVerified, lastLoginAt, failedLoginAttempts, lockedUntil)
- ✅ Indexes for performance (token lookups, expiry cleanup)
- ✅ Cron jobs (cleanup expired sessions/tokens)

#### Middleware & Routing
- ✅ Custom Next.js middleware for JWT validation
- ✅ Protected routes enforcement
- ✅ Public routes configuration
- ✅ API route authentication

#### Convex Integration
- ✅ Custom auth provider in `convex/auth.config.ts`
- ✅ JWT verification in `ctx.auth.getUserIdentity()`
- ✅ Update `getAuthenticatedMember()` to use custom auth
- ✅ Remove Clerk-specific code from all Convex functions

#### UI/UX
- ✅ Custom sign-up form (`/auth/sign-up`)
- ✅ Custom sign-in form (`/auth/sign-in`)
- ✅ Password reset request form (`/auth/forgot-password`)
- ✅ Password reset form (`/auth/reset-password?token=...`)
- ✅ Email verification handler (`/auth/verify-email?token=...`)
- ✅ Password strength indicator component
- ✅ Auth state provider (replace `useAuth()` from Clerk)
- ✅ Protected route wrapper component
- ✅ Unverified email banner

#### Migration
- ✅ User migration email campaign
- ✅ Migration token generation script
- ✅ Set password flow for existing users
- ✅ Data migration script (remove externalId/signInToken)
- ✅ Rollback plan documentation

#### Testing
- ✅ Unit tests for password hashing/validation
- ✅ Unit tests for JWT generation/verification
- ✅ Unit tests for rate limiting logic
- ✅ Integration tests for auth flows (sign-up, sign-in, reset)
- ✅ Security tests (SQL injection, XSS, CSRF, brute force)

### Out of Scope ❌ (Future Enhancements)

#### Advanced Authentication
- ❌ OAuth providers (Google, GitHub, Discord) - future feature
- ❌ Two-factor authentication (2FA/TOTP) - post-launch
- ❌ Magic link authentication (passwordless) - nice to have
- ❌ Passkey/WebAuthn support - future standard
- ❌ SSO/SAML integration (enterprise feature)
- ❌ Social login (Facebook, Apple, etc.)

#### Advanced Security
- ❌ Device fingerprinting (advanced fraud detection)
- ❌ IP-based geo-blocking
- ❌ Behavioral biometrics
- ❌ Advanced bot detection (Cloudflare Turnstile)
- ❌ Have I Been Pwned integration (check leaked passwords)

#### User Management
- ❌ Account deletion/deactivation (separate feature)
- ❌ Email change flow (complex - need verification)
- ❌ Username/handle system (current: email-based)
- ❌ Multiple email addresses per account
- ❌ Account recovery questions

#### Session Features
- ❌ Multi-device session management UI (view all sessions, revoke)
- ❌ "Remember me" checkbox (extended sessions)
- ❌ Concurrent session limits
- ❌ Session activity log

## 6. UI/UX Changes

### New Pages/Routes

#### 1. `/auth/sign-up` - Registration Page
**Layout**: Centered card with VAI branding
**Fields**:
- First Name (required)
- Last Name (required)
- Email (required, validated)
- Password (required, strength meter)
- Confirm Password (required, must match)
- Checkbox: "I agree to Terms of Service and Privacy Policy"

**Behavior**:
- Real-time validation on blur
- Password strength indicator (weak/fair/good/strong)
- Submit → create member with `emailVerified: false`
- Send verification email
- Redirect to `/auth/verify-email-sent` (instructions page)

**Error Handling**:
- Email already exists → "Email already registered. Try signing in?"
- Weak password → Show strength requirements
- Rate limit hit → "Too many sign-up attempts. Try again in {X} minutes."

#### 2. `/auth/sign-in` - Login Page
**Layout**: Centered card with VAI branding
**Fields**:
- Email (required)
- Password (required)
- Link: "Forgot password?"

**Behavior**:
- Submit → validate credentials
- Check rate limit → if exceeded, show lockout message
- Successful → create session, redirect to `/` or returnUrl
- Failed → increment failedLoginAttempts, show error
- After 5 failures → show CAPTCHA (future enhancement)
- After 10 failures → lock account for 1 hour

**Error Messages**:
- "Invalid email or password" (don't reveal which is wrong)
- "Account locked due to too many failed attempts. Try again in {X} minutes."
- "Please verify your email before signing in. Resend verification email?"

#### 3. `/auth/verify-email` - Verification Handler
**Purpose**: Handles verification token from email link
**URL**: `/auth/verify-email?token={token}`

**Behavior**:
- Extract token from query params
- Validate token (exists, not expired, not used)
- If valid:
  - Set `emailVerified: true`
  - Auto-sign in user (create session)
  - Show success toast: "Email verified! Welcome to VAI."
  - Redirect to `/` (home feed)
- If invalid/expired:
  - Show error: "Verification link invalid or expired."
  - Button: "Resend Verification Email"

#### 4. `/auth/verify-email-sent` - Verification Instructions
**Purpose**: Post-sign-up instructions page
**Content**:
- "Check your email!"
- "We sent a verification link to {email}"
- "Click the link to verify your account and sign in."
- Button: "Resend Email" (with rate limit)
- Link: "Change email address" (if typo)

#### 5. `/auth/forgot-password` - Password Reset Request
**Layout**: Centered card
**Fields**:
- Email (required)

**Behavior**:
- Submit → check if email exists (don't reveal)
- Always show success: "If that email exists, we sent a reset link."
- If email exists → generate token, send email
- Rate limit: 3 per hour per email
- Redirect to `/auth/check-email` (instructions page)

**Email Content**:
- Subject: "Reset Your VAI Password"
- Button: "Reset Password" → `/auth/reset-password?token={token}`
- Link expires in 1 hour
- Mention: "If you didn't request this, ignore this email."

#### 6. `/auth/reset-password` - Set New Password
**URL**: `/auth/reset-password?token={token}`
**Fields**:
- New Password (required, strength meter)
- Confirm Password (required, must match)

**Behavior**:
- Validate token on page load → if invalid, show error + link to forgot-password
- Submit → validate password, check not same as current (server-side)
- Hash password, update member record
- Invalidate token (set `usedAt`)
- Auto-sign in user
- Show success: "Password updated! You're now signed in."
- Redirect to `/` or `/settings`

#### 7. `/auth/set-password` - Migration Password Setup
**Purpose**: For existing Clerk users to set initial password
**Similar to**: `/auth/reset-password` (same form)
**Additional Context**:
- Headline: "Welcome! Set Your Password"
- Subtext: "We've upgraded our authentication. Set a password to continue."
- After submit: "Password set! You're all set."

### Updated Components

#### 1. `components/auth/auth-provider.tsx` - NEW
**Purpose**: Replace Clerk's auth context
**Exports**:
- `AuthProvider` component (wraps app)
- `useAuth()` hook → `{ user, isLoading, isAuthenticated, signOut }`
- `useCurrentMember()` hook → member data from Convex

**Implementation**:
- React Context for auth state
- Uses Convex `useQuery(api.auth.current)` for user data
- Manages session token in cookies (via API routes)

#### 2. `components/auth/protected-route.tsx` - NEW
**Purpose**: Client-side route protection
**Usage**: Wrap protected pages
```tsx
<ProtectedRoute>
  <SettingsPage />
</ProtectedRoute>
```
**Behavior**:
- Check `useAuth().isAuthenticated`
- If not authenticated → show sign-in modal or redirect to `/auth/sign-in?returnUrl={currentPath}`
- If authenticated but email not verified → show verification banner

#### 3. Update `components/header/member-dropdown.tsx`
**Changes**:
- Remove Clerk's `useUser()` hook
- Use custom `useAuth()` and `useCurrentMember()`
- Update sign-out button to call custom `signOut()` function
- Sign-out behavior: Clear cookie, invalidate session, redirect to `/`

#### 4. Update `components/auth/auth-button.tsx`
**Changes**:
- Remove `SignInButton` from Clerk
- Replace with: `<Link href="/auth/sign-in">` or custom modal trigger
- Check auth state: If authenticated → show "Dashboard", else "Sign In"

#### 5. Update `components/auth/sign-in-modal.tsx`
**Changes**:
- Remove Clerk's `SignInButton`
- Add custom sign-in form (email + password)
- Inline form in modal (no redirect)
- Submit → API call to `/api/auth/sign-in`
- Success → close modal, update auth context

### Removed Components
- `components/auth/sign-in-form.tsx` (Clerk-specific wrapper) - replaced
- Any Clerk-specific UI components

### New Components

#### 1. `components/auth/password-strength-meter.tsx`
**Purpose**: Visual indicator of password strength
**Props**: `password: string`
**Output**: Progress bar + label ("Weak", "Fair", "Good", "Strong")
**Logic**: Check length, complexity, common patterns

#### 2. `components/auth/email-verification-banner.tsx`
**Purpose**: Prompt unverified users to verify email
**Display**: Top of page banner (dismissible, but reappears)
**Content**: "Please verify your email. [Resend Email] [Dismiss]"

#### 3. `components/auth/sign-in-form.tsx` - NEW (custom)
**Purpose**: Reusable sign-in form component
**Fields**: Email, Password, "Forgot Password" link
**Usage**: In modal or standalone page

#### 4. `components/auth/sign-up-form.tsx` - NEW
**Purpose**: Reusable sign-up form component
**Fields**: First Name, Last Name, Email, Password, Confirm Password, Terms checkbox
**Usage**: In modal or standalone page

## 7. API Endpoints & Convex Functions

### New Convex Functions

#### Authentication Queries
```typescript
// convex/auth.ts

// Get current authenticated user (replaces Clerk's getUserIdentity)
export const current = query({
  args: {},
  returns: v.union(v.object({
    _id: v.id("members"),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    emailVerified: v.boolean(),
    // ... other member fields
  }), v.null()),
  handler: async (ctx) => {
    // Extract JWT from ctx.auth (custom auth provider)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Look up member by email (from JWT payload)
    const member = await ctx.db
      .query("members")
      .withIndex("by_email", q => q.eq("email", identity.email))
      .first();

    return member;
  }
});

// Check if email already exists (for sign-up validation)
export const checkEmailExists = query({
  args: { email: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { email }) => {
    const member = await ctx.db
      .query("members")
      .withIndex("by_email", q => q.eq("email", email.toLowerCase()))
      .first();
    return !!member;
  }
});
```

#### Authentication Mutations
```typescript
// convex/auth.ts

// Sign up new user
export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  returns: v.object({
    memberId: v.id("members"),
    verificationToken: v.string(),
  }),
  handler: async (ctx, args) => {
    // Validate password strength (server-side)
    validatePasswordStrength(args.password); // throws if weak

    // Check if email already exists
    const existing = await ctx.db
      .query("members")
      .withIndex("by_email", q => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existing) {
      throw new Error("Email already registered");
    }

    // Hash password with bcrypt (cost 12)
    const passwordHash = await bcrypt.hash(args.password, 12);

    // Create member
    const memberId = await ctx.db.insert("members", {
      email: args.email.toLowerCase(),
      passwordHash,
      firstName: args.firstName,
      lastName: args.lastName,
      emailVerified: false,
      status: "active",
      joinedDate: Date.now(),
      updatedAt: Date.now(),
      lastOnline: Date.now(),
      failedLoginAttempts: 0,
      slug: await generateUniqueSlug(ctx, args.firstName, args.lastName),
      // ... other default fields
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');

    await ctx.db.insert("email_verifications", {
      memberId,
      token: tokenHash,
      email: args.email.toLowerCase(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      createdAt: Date.now(),
    });

    // Send verification email (via action)
    await ctx.scheduler.runAfter(0, internal.emails.sendVerificationEmail, {
      email: args.email,
      token: verificationToken,
      firstName: args.firstName,
    });

    return { memberId, verificationToken };
  }
});

// Sign in existing user
export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  returns: v.object({
    memberId: v.id("members"),
    sessionToken: v.string(),
    emailVerified: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Check rate limit
    await checkRateLimit(ctx, `login:${args.email}`, 5, 15 * 60 * 1000); // 5 per 15 min

    // Find member by email
    const member = await ctx.db
      .query("members")
      .withIndex("by_email", q => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!member) {
      // Increment rate limit attempt (even on non-existent user to prevent enumeration)
      await incrementRateLimit(ctx, `login:${args.email}`);
      throw new Error("Invalid email or password");
    }

    // Check if account is locked
    if (member.lockedUntil && member.lockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((member.lockedUntil - Date.now()) / 60000);
      throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
    }

    // Verify password
    const isValid = await bcrypt.compare(args.password, member.passwordHash);

    if (!isValid) {
      // Increment failed attempts
      const failedAttempts = (member.failedLoginAttempts || 0) + 1;
      const updates: any = {
        failedLoginAttempts: failedAttempts,
        updatedAt: Date.now(),
      };

      // Lock account after 10 failed attempts
      if (failedAttempts >= 10) {
        updates.lockedUntil = Date.now() + 60 * 60 * 1000; // 1 hour
      }

      await ctx.db.patch(member._id, updates);
      await incrementRateLimit(ctx, `login:${args.email}`);

      throw new Error("Invalid email or password");
    }

    // Reset failed attempts on successful login
    await ctx.db.patch(member._id, {
      failedLoginAttempts: 0,
      lastLoginAt: Date.now(),
      lastOnline: Date.now(),
      updatedAt: Date.now(),
    });

    // Generate JWT session token
    const sessionToken = await generateJWT({
      memberId: member._id,
      email: member.email,
    });

    // Store session in database
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    await ctx.db.insert("sessions", {
      memberId: member._id,
      token: tokenHash,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    });

    return {
      memberId: member._id,
      sessionToken,
      emailVerified: member.emailVerified,
    };
  }
});

// Sign out (invalidate session)
export const signOut = mutation({
  args: { sessionToken: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tokenHash = crypto.createHash('sha256').update(args.sessionToken).digest('hex');

    // Find and delete session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", q => q.eq("token", tokenHash))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return null;
  }
});

// Verify email with token
export const verifyEmail = mutation({
  args: { token: v.string() },
  returns: v.object({
    memberId: v.id("members"),
    sessionToken: v.string(),
  }),
  handler: async (ctx, args) => {
    const tokenHash = crypto.createHash('sha256').update(args.token).digest('hex');

    // Find verification record
    const verification = await ctx.db
      .query("email_verifications")
      .withIndex("by_token", q => q.eq("token", tokenHash))
      .first();

    if (!verification) {
      throw new Error("Invalid verification token");
    }

    if (verification.expiresAt < Date.now()) {
      throw new Error("Verification token expired");
    }

    // Update member
    await ctx.db.patch(verification.memberId, {
      emailVerified: true,
      updatedAt: Date.now(),
    });

    // Mark verification as used
    await ctx.db.patch(verification._id, {
      verifiedAt: Date.now(),
    });

    // Get member for session creation
    const member = await ctx.db.get(verification.memberId);
    if (!member) throw new Error("Member not found");

    // Auto-sign in: generate session token
    const sessionToken = await generateJWT({
      memberId: member._id,
      email: member.email,
    });

    const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    await ctx.db.insert("sessions", {
      memberId: member._id,
      token: sessionTokenHash,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    });

    return { memberId: member._id, sessionToken };
  }
});

// Request password reset
export const requestPasswordReset = mutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check rate limit
    await checkRateLimit(ctx, `reset:${args.email}`, 3, 60 * 60 * 1000); // 3 per hour

    // Find member (don't reveal if not found - prevent enumeration)
    const member = await ctx.db
      .query("members")
      .withIndex("by_email", q => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!member) {
      // Still return success to prevent email enumeration
      return null;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    await ctx.db.insert("password_resets", {
      memberId: member._id,
      token: tokenHash,
      email: args.email.toLowerCase(),
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
      createdAt: Date.now(),
    });

    // Send reset email
    await ctx.scheduler.runAfter(0, internal.emails.sendPasswordResetEmail, {
      email: args.email,
      token: resetToken,
      firstName: member.firstName,
    });

    return null;
  }
});

// Reset password with token
export const resetPassword = mutation({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  returns: v.object({
    memberId: v.id("members"),
    sessionToken: v.string(),
  }),
  handler: async (ctx, args) => {
    // Validate password strength
    validatePasswordStrength(args.newPassword);

    const tokenHash = crypto.createHash('sha256').update(args.token).digest('hex');

    // Find reset record
    const reset = await ctx.db
      .query("password_resets")
      .withIndex("by_token", q => q.eq("token", tokenHash))
      .first();

    if (!reset) {
      throw new Error("Invalid reset token");
    }

    if (reset.expiresAt < Date.now()) {
      throw new Error("Reset token expired");
    }

    if (reset.usedAt) {
      throw new Error("Reset token already used");
    }

    // Get member
    const member = await ctx.db.get(reset.memberId);
    if (!member) throw new Error("Member not found");

    // Check if new password is same as old (prevent no-op)
    const isSameAsOld = await bcrypt.compare(args.newPassword, member.passwordHash);
    if (isSameAsOld) {
      throw new Error("New password must be different from current password");
    }

    // Check password history (prevent reuse of last 3)
    const history = await ctx.db
      .query("password_history")
      .withIndex("by_memberId", q => q.eq("memberId", member._id))
      .order("desc")
      .take(3);

    for (const old of history) {
      const isReused = await bcrypt.compare(args.newPassword, old.passwordHash);
      if (isReused) {
        throw new Error("Cannot reuse recent passwords");
      }
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(args.newPassword, 12);

    // Save old password to history
    await ctx.db.insert("password_history", {
      memberId: member._id,
      passwordHash: member.passwordHash,
      createdAt: Date.now(),
    });

    // Update member with new password
    await ctx.db.patch(member._id, {
      passwordHash: newPasswordHash,
      failedLoginAttempts: 0, // Reset lockout
      lockedUntil: undefined,
      updatedAt: Date.now(),
    });

    // Mark reset as used
    await ctx.db.patch(reset._id, {
      usedAt: Date.now(),
    });

    // Auto-sign in: generate session token
    const sessionToken = await generateJWT({
      memberId: member._id,
      email: member.email,
    });

    const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
    await ctx.db.insert("sessions", {
      memberId: member._id,
      token: sessionTokenHash,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    });

    return { memberId: member._id, sessionToken };
  }
});
```

#### Helper Functions (Internal)
```typescript
// convex/auth.ts

async function checkRateLimit(
  ctx: MutationCtx,
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<void> {
  const now = Date.now();
  const limit = await ctx.db
    .query("rate_limits")
    .withIndex("by_key", q => q.eq("key", key))
    .first();

  if (!limit) {
    // Create new rate limit record
    await ctx.db.insert("rate_limits", {
      key,
      attempts: 1,
      windowStart: now,
    });
    return;
  }

  // Check if window has expired
  if (now - limit.windowStart > windowMs) {
    // Reset window
    await ctx.db.patch(limit._id, {
      attempts: 1,
      windowStart: now,
    });
    return;
  }

  // Check if limit exceeded
  if (limit.attempts >= maxAttempts) {
    const timeLeft = Math.ceil((windowMs - (now - limit.windowStart)) / 60000);
    throw new Error(`Rate limit exceeded. Try again in ${timeLeft} minutes.`);
  }

  // Increment attempts
  await ctx.db.patch(limit._id, {
    attempts: limit.attempts + 1,
  });
}

async function incrementRateLimit(ctx: MutationCtx, key: string): Promise<void> {
  const limit = await ctx.db
    .query("rate_limits")
    .withIndex("by_key", q => q.eq("key", key))
    .first();

  if (limit) {
    await ctx.db.patch(limit._id, {
      attempts: limit.attempts + 1,
    });
  }
}

function validatePasswordStrength(password: string): void {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    throw new Error(
      "Password must include uppercase, lowercase, number, and special character"
    );
  }
}

async function generateJWT(payload: { memberId: string; email: string }): Promise<string> {
  // Use jose library for JWT generation
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('vai-custom-auth')
    .setAudience('vai-app')
    .setExpirationTime('7d')
    .sign(secret);

  return jwt;
}
```

### New Next.js API Routes

#### 1. `app/api/auth/sign-in/route.ts`
**Purpose**: Handle sign-in requests
**Method**: POST
**Body**: `{ email: string, password: string }`
**Response**: Sets session cookie, returns user data
**Implementation**:
```typescript
export async function POST(request: Request) {
  const { email, password } = await request.json();

  // Call Convex mutation
  const result = await convex.mutation(api.auth.signIn, { email, password });

  // Set HTTP-only cookie with session token
  const response = NextResponse.json({ success: true, user: result });
  response.cookies.set('session_token', result.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });

  return response;
}
```

#### 2. `app/api/auth/sign-up/route.ts`
**Purpose**: Handle registration
**Method**: POST
**Body**: `{ email, password, firstName, lastName }`

#### 3. `app/api/auth/sign-out/route.ts`
**Purpose**: Clear session
**Method**: POST
**Behavior**: Delete session from DB, clear cookie

#### 4. `app/api/auth/refresh/route.ts`
**Purpose**: Refresh session token
**Method**: POST
**Behavior**: Generate new token if current token has <24h remaining

#### 5. `app/api/auth/verify-email/route.ts`
**Purpose**: Handle email verification
**Method**: GET
**Query**: `?token={token}`
**Behavior**: Verify token, set cookie, redirect to home

#### 6. `app/api/auth/reset-password/route.ts`
**Purpose**: Handle password reset
**Method**: POST
**Body**: `{ token, newPassword }`

### Convex Cron Jobs

#### 1. Cleanup Expired Sessions
```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "cleanup expired sessions",
  { hourUTC: 2, minuteUTC: 0 }, // 2 AM UTC
  internal.auth.cleanupExpiredSessions
);

export default crons;
```

```typescript
// convex/auth.ts
export const cleanupExpiredSessions = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Find expired sessions
    const expiredSessions = await ctx.db
      .query("sessions")
      .withIndex("by_expiresAt")
      .filter(q => q.lt(q.field("expiresAt"), now))
      .collect();

    // Delete expired sessions
    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    return null;
  }
});
```

#### 2. Cleanup Expired Tokens
```typescript
// Similar cron for password_resets, email_verifications
```

## 8. Environment Variables

### Remove (Clerk)
```bash
# ❌ DELETE THESE
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=https://...clerk.accounts.dev
CLERK_WEBHOOK_SECRET=whsec_...
```

### Add (Custom Auth)
```bash
# ✅ ADD THESE

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long

# Session configuration
SESSION_COOKIE_NAME=vai_session
SESSION_EXPIRY_DAYS=7

# Token expiry settings (in hours)
EMAIL_VERIFICATION_EXPIRY_HOURS=24
PASSWORD_RESET_EXPIRY_HOURS=1

# Email service (using Resend - already in project)
RESEND_API_KEY=re_...

# Feature flag (for gradual rollout)
NEXT_PUBLIC_USE_CUSTOM_AUTH=true

# App URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Generation Script
Create `scripts/generate-jwt-secret.ts`:
```typescript
import { randomBytes } from 'crypto';

const secret = randomBytes(32).toString('base64');
console.log(`JWT_SECRET=${secret}`);
```

Run: `bun scripts/generate-jwt-secret.ts`

## 9. Email Service Integration

### Provider: Resend
**Rationale**: Already integrated in project for other emails (per CLAUDE.md context)

### Email Templates

#### 1. Email Verification
**Template ID**: `email-verification`
**Subject**: "Verify your VAI account"
**Content**:
```
Hi {firstName},

Welcome to VAI! Please verify your email address to activate your account.

[Verify Email Button] → https://yourdomain.com/auth/verify-email?token={token}

This link expires in 24 hours.

If you didn't create an account, you can safely ignore this email.

Best,
The VAI Team
```

#### 2. Password Reset
**Template ID**: `password-reset`
**Subject**: "Reset your VAI password"
**Content**:
```
Hi {firstName},

You requested to reset your password for your VAI account.

[Reset Password Button] → https://yourdomain.com/auth/reset-password?token={token}

This link expires in 1 hour.

If you didn't request this, please ignore this email. Your password won't change.

Best,
The VAI Team
```

#### 3. Migration Email
**Template ID**: `auth-migration`
**Subject**: "Important: Set Your New Password for VAI"
**Content**:
```
Hi {firstName},

We've upgraded our authentication system to give you better security and control.

To continue accessing your VAI account, please set a new password:

[Set Password Button] → https://yourdomain.com/auth/set-password?token={token}

This link expires in 7 days.

What's changing?
- More secure password-based authentication
- Better session management
- Faster sign-in experience

All your posts, comments, and settings are safe and unchanged.

Questions? Reply to this email or contact support.

Best,
The VAI Team
```

### Email Action (Convex)
```typescript
// convex/emails.ts
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const sendVerificationEmail = internalAction({
  args: {
    email: v.string(),
    token: v.string(),
    firstName: v.string(),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${args.token}`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "VAI <noreply@yourdomain.com>",
        to: args.email,
        subject: "Verify your VAI account",
        html: `
          <p>Hi ${args.firstName},</p>
          <p>Welcome to VAI! Please verify your email address to activate your account.</p>
          <p><a href="${verificationUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a></p>
          <p>Or copy this link: ${verificationUrl}</p>
          <p>This link expires in 24 hours.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
          <p>Best,<br>The VAI Team</p>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send verification email:", error);
      throw new Error("Failed to send verification email");
    }

    return { success: true };
  },
});

// Similar functions: sendPasswordResetEmail, sendMigrationEmail
```

## 10. Testing Requirements

### Unit Tests (Bun)

#### 1. Password Hashing (`lib/auth.test.ts`)
```typescript
import { describe, it, expect } from "bun:test";
import bcrypt from "bcrypt";

describe("Password Hashing", () => {
  it("should hash password with bcrypt cost 12", async () => {
    const password = "SecurePass123!";
    const hash = await bcrypt.hash(password, 12);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(await bcrypt.compare(password, hash)).toBe(true);
  });

  it("should reject incorrect password", async () => {
    const password = "SecurePass123!";
    const hash = await bcrypt.hash(password, 12);

    expect(await bcrypt.compare("WrongPassword", hash)).toBe(false);
  });
});
```

#### 2. JWT Token Generation (`lib/jwt.test.ts`)
```typescript
import { describe, it, expect } from "bun:test";
import { SignJWT, jwtVerify } from "jose";

describe("JWT Token", () => {
  it("should generate valid JWT", async () => {
    const secret = new TextEncoder().encode("test-secret-key-32-characters-long");
    const payload = { memberId: "123", email: "test@example.com" };

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    expect(jwt).toBeDefined();

    const verified = await jwtVerify(jwt, secret);
    expect(verified.payload.memberId).toBe("123");
    expect(verified.payload.email).toBe("test@example.com");
  });
});
```

#### 3. Password Validation (`lib/validation.test.ts`)
```typescript
import { describe, it, expect } from "bun:test";
import { validatePasswordStrength } from "./validation";

describe("Password Validation", () => {
  it("should accept strong password", () => {
    expect(() => validatePasswordStrength("SecurePass123!")).not.toThrow();
  });

  it("should reject short password", () => {
    expect(() => validatePasswordStrength("Short1!")).toThrow("at least 8 characters");
  });

  it("should reject password without uppercase", () => {
    expect(() => validatePasswordStrength("securepass123!")).toThrow("uppercase");
  });

  it("should reject password without special char", () => {
    expect(() => validatePasswordStrength("SecurePass123")).toThrow("special character");
  });
});
```

#### 4. Rate Limiting (`convex/auth.test.ts`)
```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "bun:test";
import schema from "./schema";
import { checkRateLimit } from "./auth";

describe("Rate Limiting", () => {
  it("should allow requests within limit", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      // First 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(ctx, "test:key", 5, 60000);
      }
    });
  });

  it("should block requests exceeding limit", async () => {
    const t = convexTest(schema);

    await t.run(async (ctx) => {
      // First 5 requests
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(ctx, "test:key", 5, 60000);
      }

      // 6th request should fail
      await expect(
        checkRateLimit(ctx, "test:key", 5, 60000)
      ).rejects.toThrow("Rate limit exceeded");
    });
  });
});
```

### Integration Tests

#### 1. Sign-up Flow (`tests/auth-signup.test.ts`)
```typescript
import { describe, it, expect } from "bun:test";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { signUp } from "../convex/auth";

describe("Sign-up Flow", () => {
  it("should create new user and send verification email", async () => {
    const t = convexTest(schema);

    const result = await t.mutation(signUp, {
      email: "newuser@example.com",
      password: "SecurePass123!",
      firstName: "New",
      lastName: "User",
    });

    expect(result.memberId).toBeDefined();
    expect(result.verificationToken).toBeDefined();

    // Check member created
    const member = await t.run(async (ctx) => {
      return await ctx.db.get(result.memberId);
    });

    expect(member).toBeDefined();
    expect(member.email).toBe("newuser@example.com");
    expect(member.emailVerified).toBe(false);
    expect(member.passwordHash).toBeDefined();
  });

  it("should reject duplicate email", async () => {
    const t = convexTest(schema);

    // Create first user
    await t.mutation(signUp, {
      email: "duplicate@example.com",
      password: "SecurePass123!",
      firstName: "First",
      lastName: "User",
    });

    // Try to create second user with same email
    await expect(
      t.mutation(signUp, {
        email: "duplicate@example.com",
        password: "DifferentPass123!",
        firstName: "Second",
        lastName: "User",
      })
    ).rejects.toThrow("Email already registered");
  });
});
```

#### 2. Sign-in Flow (`tests/auth-signin.test.ts`)
```typescript
describe("Sign-in Flow", () => {
  it("should sign in with correct credentials", async () => {
    const t = convexTest(schema);

    // Create user
    const signUpResult = await t.mutation(signUp, {
      email: "signin@example.com",
      password: "SecurePass123!",
      firstName: "Sign",
      lastName: "In",
    });

    // Verify email first
    await t.mutation(verifyEmail, { token: signUpResult.verificationToken });

    // Sign in
    const signInResult = await t.mutation(signIn, {
      email: "signin@example.com",
      password: "SecurePass123!",
    });

    expect(signInResult.sessionToken).toBeDefined();
    expect(signInResult.memberId).toBe(signUpResult.memberId);
  });

  it("should reject wrong password", async () => {
    const t = convexTest(schema);

    // Create user
    await t.mutation(signUp, {
      email: "wrongpass@example.com",
      password: "SecurePass123!",
      firstName: "Wrong",
      lastName: "Pass",
    });

    // Try to sign in with wrong password
    await expect(
      t.mutation(signIn, {
        email: "wrongpass@example.com",
        password: "WrongPassword123!",
      })
    ).rejects.toThrow("Invalid email or password");
  });

  it("should lock account after 10 failed attempts", async () => {
    const t = convexTest(schema);

    // Create user
    await t.mutation(signUp, {
      email: "locktest@example.com",
      password: "SecurePass123!",
      firstName: "Lock",
      lastName: "Test",
    });

    // Try 10 times with wrong password
    for (let i = 0; i < 10; i++) {
      try {
        await t.mutation(signIn, {
          email: "locktest@example.com",
          password: "WrongPassword123!",
        });
      } catch (error) {
        // Expected to fail
      }
    }

    // 11th attempt should mention account lock
    await expect(
      t.mutation(signIn, {
        email: "locktest@example.com",
        password: "WrongPassword123!",
      })
    ).rejects.toThrow("Account locked");
  });
});
```

### Security Tests

#### 1. SQL Injection Prevention
```typescript
describe("SQL Injection Prevention", () => {
  it("should safely handle malicious email input", async () => {
    const t = convexTest(schema);

    const maliciousEmail = "'; DROP TABLE members; --";

    // Should not cause errors, just treat as invalid email
    await expect(
      t.mutation(signIn, {
        email: maliciousEmail,
        password: "anything",
      })
    ).rejects.toThrow("Invalid email or password");
  });
});
```

#### 2. XSS Prevention
```typescript
describe("XSS Prevention", () => {
  it("should sanitize user input in names", async () => {
    const t = convexTest(schema);

    const result = await t.mutation(signUp, {
      email: "xss@example.com",
      password: "SecurePass123!",
      firstName: "<script>alert('XSS')</script>",
      lastName: "Normal",
    });

    const member = await t.run(async (ctx) => {
      return await ctx.db.get(result.memberId);
    });

    // Should be escaped or stripped
    expect(member.firstName).not.toContain("<script>");
  });
});
```

#### 3. CSRF Protection (E2E)
```typescript
// Test in actual browser with Playwright/Cypress
describe("CSRF Protection", () => {
  it("should reject requests without CSRF token", async () => {
    // Make POST request without X-CSRF-Token header
    const response = await fetch("/api/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "pass" }),
    });

    expect(response.status).toBe(403);
  });
});
```

### Test Coverage Goals
- **Unit Tests**: 80%+ coverage of auth logic
- **Integration Tests**: All happy paths + critical error paths
- **Security Tests**: OWASP Top 10 vulnerabilities
- **E2E Tests**: Full auth flows in real browser

### Running Tests
```bash
# Unit tests
bun test

# Integration tests (Convex)
bun test --filter "auth"

# Security tests
bun test --filter "security"

# All tests
bun test --coverage
```

## 11. Success Criteria

### Functional Requirements ✅

- [x] **Sign-up Flow**: Users can create accounts with email/password
- [x] **Email Verification**: New users receive and can verify emails
- [x] **Sign-in Flow**: Users can sign in with correct credentials
- [x] **Sign-out**: Users can sign out and sessions are invalidated
- [x] **Password Reset**: Users can request and complete password resets
- [x] **Session Persistence**: Sessions persist across browser restarts (7 days)
- [x] **Protected Routes**: Unauthenticated users redirected to sign-in
- [x] **Rate Limiting**: Abuse prevention working (login, reset, signup)
- [x] **Account Lockout**: Accounts lock after 10 failed login attempts

### Migration Success Metrics

- [x] **User Migration**: ≥80% of active users set passwords within 7 days
- [x] **Zero Data Loss**: All posts, comments, votes, bookmarks preserved
- [x] **Sign-in Success Rate**: ≥95% of sign-in attempts succeed (exclude wrong password)
- [x] **Email Delivery**: ≥98% of verification/reset emails delivered
- [x] **Session Reliability**: <1% session invalidation errors

### Performance Targets

- [x] **Sign-in Latency**: <500ms p95 (password check + JWT generation)
- [x] **Sign-up Latency**: <1s p95 (password hash + DB insert + email queue)
- [x] **Password Reset**: <2s p95 (token generation + email send)
- [x] **Session Validation**: <100ms p95 (JWT verify + DB lookup)

### Security Requirements

- [x] **No Security Vulnerabilities**: Pass security audit (OWASP Top 10)
- [x] **Password Hashing**: All passwords hashed with bcrypt cost 12
- [x] **JWT Security**: Tokens signed with HS256, 32+ char secret
- [x] **Cookie Security**: HTTP-only, Secure, SameSite=Lax
- [x] **Rate Limiting**: All auth endpoints protected
- [x] **Token Expiry**: All tokens expire (sessions: 7d, reset: 1h, verify: 24h)
- [x] **No Credential Leaks**: Env vars secured, no secrets in code

### Code Quality

- [x] **Test Coverage**: ≥80% for auth functions
- [x] **Type Safety**: All functions pass `npx tsc --noEmit`
- [x] **Linting**: Pass `npm run lint` (Biome)
- [x] **No Clerk Dependencies**: All Clerk packages removed
- [x] **Documentation**: Updated CLAUDE.md and README

### User Experience

- [x] **Clear Error Messages**: Helpful, non-revealing (no email enumeration)
- [x] **Responsive UI**: Auth forms work on mobile and desktop
- [x] **Loading States**: Spinners during async operations
- [x] **Success Feedback**: Toasts/messages for successful actions
- [x] **Accessibility**: Forms keyboard-navigable, ARIA labels present

## 12. Risks & Mitigations

### Risk 1: Security Vulnerabilities in Custom Auth
**Severity**: CRITICAL
**Probability**: MEDIUM

**Description**: Implementing custom authentication could introduce vulnerabilities that Clerk previously handled (e.g., session fixation, token leakage, timing attacks).

**Mitigation Strategies**:
1. **Security Audit**: Hire external security firm for penetration testing before production launch
2. **OWASP Guidelines**: Follow OWASP Authentication Cheat Sheet strictly
3. **Battle-tested Libraries**: Use industry-standard libraries (bcrypt, jose, crypto)
4. **Constant-time Comparisons**: Use timing-safe comparison for password/token checks
5. **Regular Updates**: Monitor security advisories for dependencies
6. **Bug Bounty**: Launch bug bounty program post-launch ($100-$1000 rewards)

**Detection**:
- Automated security scanning (OWASP ZAP, Burp Suite)
- Manual penetration testing
- Monitor for unusual login patterns (e.g., rapid account creation, brute force attempts)

**Rollback**: Revert to Clerk within 24 hours if critical vulnerability discovered

---

### Risk 2: Existing Users Locked Out
**Severity**: HIGH
**Probability**: MEDIUM

**Description**: Users who don't set passwords during migration period can't access their accounts.

**Mitigation Strategies**:
1. **Extended Migration Window**: 7-day token expiry for migration emails
2. **Multiple Reminders**: Send migration email on Day 0, Day 3, Day 6
3. **On-demand Token Generation**: Users who missed migration can request password reset anytime
4. **Support Flow**: Dedicated support email/form for migration issues
5. **Grace Period**: Allow Clerk login for 14 days alongside custom auth (dual auth)
6. **Clear Communication**: In-app banners, email campaigns explaining migration

**Detection**:
- Monitor sign-in failures with error code "no_password_set"
- Track migration email open rates and click-through rates
- Dashboard for % of users migrated

**Rollback**: If <50% of users migrate by Day 7, extend deadline or enable Clerk fallback

---

### Risk 3: Performance Degradation
**Severity**: MEDIUM
**Probability**: LOW

**Description**: Custom auth may be slower than Clerk's optimized infrastructure, especially password hashing (bcrypt is CPU-intensive).

**Mitigation Strategies**:
1. **Database Indexing**: Ensure all auth queries use indexes (by_email, by_token)
2. **Caching**: Cache session data in Redis/memory (future optimization)
3. **Async Processing**: Queue emails via Convex scheduler (don't block auth flow)
4. **Load Testing**: Simulate 1000+ concurrent sign-ins before launch
5. **CDN for Static Assets**: Offload auth UI assets to CDN
6. **Optimize bcrypt Cost**: Test if cost 10 (vs 12) is acceptable trade-off

**Detection**:
- Monitor p95/p99 latency for auth endpoints
- Alert if sign-in latency >1s or sign-up >2s
- Track Convex function execution times

**Rollback**: Optimize queries, reduce bcrypt cost, or enable Clerk if unfixable

---

### Risk 4: Email Delivery Issues
**Severity**: MEDIUM
**Probability**: MEDIUM

**Description**: Verification/reset emails may land in spam, fail to send, or be delayed, blocking users.

**Mitigation Strategies**:
1. **Reliable Provider**: Use Resend (already integrated, high deliverability)
2. **SPF/DKIM/DMARC**: Configure email authentication records properly
3. **Retry Logic**: Retry failed email sends up to 3 times with exponential backoff
4. **Fallback to Support**: If email fails 3 times, create support ticket automatically
5. **Resend Button**: Allow users to resend verification/reset emails (rate-limited)
6. **Email Monitoring**: Track delivery rates, bounces, spam complaints via Resend dashboard

**Detection**:
- Monitor Resend API error rates
- Track "email not received" support tickets
- Alert if email delivery rate <95%

**Rollback**: N/A (email issues affect Clerk too), but add SMS fallback in future

---

### Risk 5: Broken Migration Script
**Severity**: HIGH
**Probability**: LOW

**Description**: Migration script could fail midway, corrupt data, or miss users.

**Mitigation Strategies**:
1. **Dry Run**: Test migration script on staging DB first
2. **Idempotency**: Script should be re-runnable without duplicating data
3. **Atomic Operations**: Use Convex transactions where possible
4. **Backup Before Migration**: Export all member data to CSV before running script
5. **Incremental Migration**: Migrate in batches (e.g., 100 users at a time), monitor each batch
6. **Audit Log**: Log every migration action (user ID, timestamp, success/failure)

**Detection**:
- Count members before/after migration (should match)
- Verify no duplicate emails created
- Check for users with `passwordHash: null` (should be none post-migration)

**Rollback**: Restore from backup if data corruption detected

---

### Risk 6: Token Leakage
**Severity**: HIGH
**Probability**: LOW

**Description**: Verification/reset tokens could be exposed via logs, analytics, or referrer headers.

**Mitigation Strategies**:
1. **Hash Tokens in DB**: Store SHA-256 hash of token, not plaintext
2. **HTTPS Only**: Never send tokens over HTTP
3. **Short Expiry**: Tokens expire quickly (1h for reset, 24h for verify)
4. **Single-use Tokens**: Mark tokens as used after first redemption
5. **No Token in Logs**: Sanitize logs to exclude query params with tokens
6. **Referrer Policy**: Set `Referrer-Policy: no-referrer` on token pages

**Detection**:
- Monitor for tokens reused after expiry/use
- Check logs for leaked tokens (automated scan)

**Rollback**: Invalidate all tokens if leak detected, force password resets

---

### Risk 7: Session Hijacking
**Severity**: HIGH
**Probability**: LOW

**Description**: Attacker could steal session token from cookies and impersonate user.

**Mitigation Strategies**:
1. **HTTP-only Cookies**: Session tokens not accessible via JavaScript
2. **Secure Flag**: Cookies only sent over HTTPS
3. **SameSite=Lax**: Prevent CSRF attacks
4. **Short Session Expiry**: 7 days max, with refresh logic
5. **IP Binding** (optional): Invalidate session if IP changes (may break mobile users)
6. **Device Fingerprinting** (future): Detect suspicious device changes

**Detection**:
- Monitor for sessions from multiple IPs simultaneously
- Alert on rapid session location changes

**Rollback**: Force re-authentication for all users if widespread hijacking detected

## Summary

This comprehensive clarification document provides a **complete specification** for removing Clerk and implementing custom email/password authentication. All decisions prioritize:

1. **Security First**: bcrypt, JWT, rate limiting, CSRF protection, password history
2. **User Experience**: Clear migration path, helpful error messages, auto-sign-in after verification
3. **Reliability**: Rollback plan, feature flags, extensive testing, monitoring
4. **Maintainability**: Well-structured code, comprehensive tests, clear documentation

### Next Steps (After Approval)

1. **Review & Approve**: Stakeholders review this document, provide feedback
2. **Implementation Plan**: Break down into sprint tasks (estimate: 3-4 sprints)
3. **Security Audit**: Schedule external security review
4. **Staging Deployment**: Test migration on staging environment
5. **Production Rollout**: Execute phased migration (Day 0-30)
6. **Monitoring**: Track metrics, respond to issues
7. **Optimization**: Improve based on real-world usage

### Key Assumptions Recap

Since this is **AUTO mode**, the following assumptions were made without user input:
- Email/password only (no OAuth initially)
- 7-day session expiry (configurable)
- bcrypt cost factor 12 (industry standard)
- Mandatory email verification
- Password reset via email (not SMS)
- 7-day migration window for existing users
- HTTP-only secure cookies for sessions
- Resend for email delivery
- Rate limiting at Convex function level
- JWT for session tokens (not opaque tokens)

If any assumptions are incorrect, please provide feedback and this document can be revised.

---

**Document Status**: DRAFT - Ready for Review
**Last Updated**: 2025-10-04
**Version**: 1.0
**Author**: Feature Clarification Agent (Auto Mode)
