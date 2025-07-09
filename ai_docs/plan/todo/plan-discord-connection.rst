
# Syncing Paid Membership Tiers with Discord Roles in a Next.js + Convex + Clerk App

## Overview

To **link paid membership tiers to Discord roles** in your Next.js (TypeScript) app using Convex and Clerk, you need a robust system that:

* Identifies each member’s tier/status and maps it to the correct Discord role.
* Automatically updates roles on Discord whenever a user’s membership status changes (activation, cancellation, expiration, etc.).
* Runs continuously or at regular intervals to keep Discord roles in sync with your database.

This solution will involve setting up a Discord bot with the proper permissions, storing Discord account info for your users (especially those who didn’t log in via Discord), and writing Convex backend logic (using triggers or cron jobs) to handle role assignments. Below, we’ll break down the steps and considerations in detail.

## Discord Integration Setup

**1. Create a Discord Bot:** Start by creating a Discord **bot** for your server through the Discord Developer Portal. Invite the bot to your Discord server with the proper scopes and permissions. Specifically, give it the **“Manage Roles”** permission so it can assign roles to members. (When configuring the OAuth2 URL for your bot, select the `bot` scope and then grant *Manage Roles* permission in the permission slider.) This bot will be used to call Discord’s API on behalf of your server. According to Discord’s documentation, role management must be done by a bot authorized on the server. Ensure the bot’s role in Discord is positioned higher than the roles it will assign (Discord only allows bots to manage roles lower than their own role in the hierarchy).

**2. Determine Discord Role IDs:** In your Discord server, create the roles corresponding to each membership tier (e.g. **“Early Bird”**, **“Founding Member”**, **“Scholarship”**, **“Member”**, plus a default **“Free”** or restricted role for non-payers). Note down each role’s **ID** (you can enable Developer Mode in Discord to copy IDs). These IDs will be used in the API calls to assign/remove roles.

**3. Secure the Bot Token:** When you created the bot, Discord provided a **bot token**. Treat this like a password – store it securely. In Convex, you can store secrets using **Environment Variables** (for example, set `DISCORD_BOT_TOKEN` in your Convex deployment settings) and access it in your functions via `process.env.DISCORD_BOT_TOKEN`. This keeps the token out of your source code.

**4. Enable Guild Member Intent (if needed):** If you plan to query guild members or listen to member join events via the Discord gateway, enable the **“Server Members Intent”** in your bot settings. However, for simply adding/removing roles via REST API calls (as we’ll do), this intent may not be strictly necessary.

## Storing and Linking Discord Account Info

In order to assign roles to a user on Discord, you need to know **which Discord account** corresponds to that user. This means storing each user’s **Discord ID** (the unique user ID number on Discord) in your Convex `members` table or a related table. There are a couple of scenarios to handle:

* **Users Who Login via Discord:** If a user signs up or logs in using Discord (through Clerk’s OAuth), Clerk likely returns some Discord profile info. Check Clerk’s documentation or user object for an external account identifier. Often, OAuth providers return an ID – if Clerk’s Discord integration provides the Discord user’s ID, store it in the `members` table (perhaps add a field like `discordId`). If Clerk doesn’t automatically give you that, you might need to retrieve it via the Discord OAuth API. The Discord OAuth2 `identify` scope allows fetching a user’s Discord ID and username. Ensure your OAuth flow includes `identify` (and possibly `email` if needed).

* **Users Who Login via Google/Email:** For members who did not use Discord to sign in, you’ll need an **account linking flow**. This can be an onboarding step where the user clicks “Connect Discord Account.” Use Discord’s OAuth2 here: direct them to authorize your app with the `identify` scope (and the `guilds.join` scope if you want to auto-join them to your server). Discord’s official guide on *Account Linking with Discord* provides best practices for this process. After authorization, you’ll get an access token and the user’s Discord ID. Save that ID in Convex for future role assignments. If you included `guilds.join` and your bot is in the server, you can even have the bot add the user to your guild automatically upon linking (though this requires your bot OAuth to have the **Guild Join** permission and the user’s consent).

* **Handling Missing Discord Info:** Design your UI/UX such that if a paying user hasn’t linked Discord, you prompt them to do so. You might restrict certain community features until they join Discord, or at least notify them that they won’t have Discord benefits until linking. This ensures your sync logic can operate on all active members.

In summary, augment your `members` schema with a field for Discord account info (e.g., `discordId`). After either login or a manual connect action, populate this field. This way, your Convex functions can cross-reference a member to their Discord identity.

## Membership Tier to Role Mapping Logic

With the groundwork laid, implement the core **role assignment logic**. Define clearly how each membership **tier** and **status** translates to Discord roles:

* **Active Paying Members:** For users with `status: "active"` (and possibly those in `"cancelled"` status but still within a grace period) and a specific `tier`, assign the corresponding Discord role. For example, if a user’s `tier` is `"early_bird"` and their subscription is active, they should have the **Early Bird** role on Discord. A `"founding_member"` would get the Founding Member role, and so on. Standard paying members (tier `"member"`) might get a generic “Member” role. If you have multiple paid tiers, each should map to a distinct role so you can differentiate access in Discord.

* **Free or Inactive Users:** Users with `status: "free"` (no subscription) or those who **churned** (subscription ended, `status: "churned"` or `subscriptionStatus: "expired"/"none"`) should be placed into a restricted role, such as a **“Free”** or **“Guest”** role that has limited server access. That likely means **removing any premium roles** they previously had and ensuring they have the Free role. This role can be used to hide most channels from them while still keeping them in the server for potential re-engagement.

* **Grace Periods and Cancellation:** If `status: "cancelled"` but you have a grace period until `subscriptionEndDate`, you might decide to *temporarily* keep their role until that date passes. You could treat “cancelled” with a future end date as still active. Conversely, `subscriptionStatus: "past_due"` might indicate a payment issue – you could choose to preemptively revoke roles or send a warning. Define how each intermediate state is handled:

  * **past\_due**: maybe treat similar to active for a short time, but if it remains past due for long, move to free.
  * **cancelled (grace)**: keep roles until actual end date, then remove.
  * **churned/expired**: immediately remove paid roles, assign Free role.

* **Duplicate Accounts:** If `status: "duplicate"`, likely treat them as a free member (or possibly exclude them entirely from Discord sync if these accounts are slated for deletion).

* **Admin/Moderator Roles:** Your schema has a `role: "admin" | "user"` field. Admins or moderators might have special roles on Discord (outside the membership tiers). **Important:** Your sync logic should **not override manual roles** like an “Admin” or “Moderator” role that staff have. Focus only on the **membership roles**. You should design the system to add/remove the tier-based roles while preserving any additional roles a user might have. For example, if an admin is also a paying member, they might have both an “Admin” role and a “Member” role on Discord. If their membership lapses, you’d remove the “Member” role but **leave their Admin role intact**. Make sure your bot only manages the roles it is responsible for (perhaps keep a list of role IDs that are *managed*, and ignore others).

Implement this mapping logic in a Convex function. It could be as simple as a function `syncMemberRoles(member)` that:

* Looks at `member.tier` and `member.subscriptionStatus`/`status`.
* Determines the target Discord role(s) the user should have (e.g., \["Early Bird"] or \["Free"] etc.).
* Calls the Discord API to ensure the member has those and doesn’t have roles they shouldn’t. (Discord allows multiple roles per user, so you might give an active user both a tier role and the “Member” role if needed for general access, but in many cases a single tier role suffices if the tier roles are all considered paying roles.)

## Using Discord APIs for Role Management

Discord provides RESTful **API endpoints** to manage guild memberships and roles. You will use the bot’s token to authenticate these requests. Key points for using the Discord API in this context:

* **Add a Role:** The endpoint to add a role to a guild member is:

  ```
  PUT /guilds/{guild.id}/members/{user.id}/roles/{role.id}
  ```

  This will assign the specified role to the user. If successful, the API returns HTTP 204 No Content. Your Convex function can call this endpoint for each role you need to add. Use the bot token in the `Authorization` header (as a **Bearer** token). For example, `Authorization: Bot YOUR_BOT_TOKEN`. (Make sure to include the literal word "Bot " before the token.)

* **Remove a Role:** Similarly, to remove a role, you can call:

  ```
  DELETE /guilds/{guild.id}/members/{user.id}/roles/{role.id}
  ```

  This removes that role from the user (also returns 204 on success). Removal will be used when a user’s tier is downgraded or their membership expires, to strip paid roles.

* **Check Membership:** If needed, you can call `GET /guilds/{guild.id}/members/{user.id}` to check if the user is in the guild and see their current roles. However, since you know which roles you intend them to have (from your Convex DB), you might not need to fetch first in many cases – you can just issue the add/remove calls. If a user is not in the guild at all, these role API calls will return an error. In that case, you should handle that gracefully (possibly log it and notify the user to join the Discord server). If you included the `guilds.join` scope in OAuth and have an access token for the user, you could add them to the guild via API, but doing so requires an endpoint `PUT /guilds/{guild.id}/members/{user.id}` with a user token and your bot’s authorization — this is a more advanced step. In many setups, it’s acceptable to require the user to click a Discord invite link to join manually.

* **API Rate Limits:** Discord’s API has rate limits (typically \~10k requests per 10 minutes per guild for adding/removing roles, and smaller per-second limits). **Batch your calls efficiently:** If your app is small (a manageable number of members), doing a few calls on changes is fine. If you ever need to sync a large number of users (say a daily cron that checks hundreds of members), be mindful to not hit rate limits. You might add short delays between calls or chunk them. Fortunately, updating roles is not usually a high-frequency operation per user.

* **Bot Permissions:** Recall that the bot must have permission to manage roles. If your role-assignment calls are failing, double-check the bot’s role hierarchy and permissions. The bot cannot edit roles higher than its own and cannot affect server owners. Ensure the roles you want it to assign are below the bot’s role. Discord’s docs emphasize that your bot **“must have appropriate permissions within the server”** to manage roles.

* **Security:** Only your backend (Convex functions) should hold and use the bot token. Never expose it to the client. The Convex environment variable approach mentioned earlier keeps this secret safe.

In Convex, you will implement an **Action** (Convex “action” functions are ideal for calling external services) that performs the HTTP requests to Discord. For example, using the Fetch API or a library like `node-fetch` inside the Convex action to call Discord’s endpoints. Convex actions run in a Node.js environment on the server and can perform network requests (unlike Convex mutations/queries which are pure and transactional). This separation is important: **do not call external APIs directly inside Convex mutations**, because mutations need to be deterministic and free of side effects. Instead, have the mutation (or trigger/cron) **invoke an action** to call Discord. You can structure it such that `syncMemberRoles` is an action that reads the member’s data and hits the Discord API, or a mutation that schedules an action.

For example, Convex’s scheduling API allows a mutation to schedule an action immediately after it commits, which is useful for these cases. You could do: `await ctx.scheduler.runAfter(0, internal.discord.syncRoles, { memberId })` inside a mutation that updates a member’s status. This schedules your Discord sync action right after the mutation succeeds (similar to `setTimeout(fn, 0)` in concept).

## Implementing Continuous Sync with Convex (Realtime Updates)

To keep Discord roles in sync continuously, you have a few options in Convex:

**Option A: Event-Driven Updates (Triggers or Explicit Calls)**
Ideally, whenever a user’s membership status or tier changes, you trigger an immediate role sync for that user. This ensures minimal delay. There are two ways to achieve this:

* *Within your business logic*: If you have Convex functions that handle subscription updates (e.g., a webhook from Stripe or a mutation that changes `members.status`/`tier`), simply **call the Discord sync action** at that point for the affected user. This is straightforward — for example, in your Stripe webhook handler (could be a Convex HTTP function), after updating the user’s record to `"churned"` or `"active"`, call an action like `discordAssignRole(userId, newTier)` to update Discord. This way, every membership change is immediately reflected on Discord.

* *Using Convex Triggers*: Convex supports database triggers (via the `convex-helpers` package) that can automatically run code when data in a table changes. You can register a trigger on the `members` table so that whenever a member’s `status` or `tier` is updated, it fires a function. For example:

  ```ts
  triggers.register("members", async (ctx, change) => {
    if (!change.oldDoc || !change.newDoc) return;
    const { status: oldStatus, tier: oldTier } = change.oldDoc;
    const { status: newStatus, tier: newTier, _id, discordId } = change.newDoc;
    // If membership status or tier changed, sync Discord roles
    if ( (oldStatus !== newStatus) || (oldTier !== newTier) ) {
      if (discordId) {
        // Schedule an action to update Discord roles for this user:
        await ctx.scheduler.runAfter(0, internal.discord.syncRoles, { discordId, newStatus, newTier });
      }
    }
  });
  ```

  This trigger function (running server-side) detects changes and uses the scheduler to invoke the `syncRoles` action immediately. The reason to schedule an action (rather than calling Discord directly in the trigger) is to avoid doing external API calls in the middle of a DB transaction. By scheduling, the role update will happen just after the Convex transaction completes, keeping things robust. Using triggers gives you **real-time responsiveness** – as soon as a membership updates, the Discord role is queued to update. (Make sure to only call `ctx.scheduler` if `discordId` exists; if not, you might want to notify the user to link their Discord.)

  *Note:* Setting up triggers requires installing the convex-helpers library and wrapping your mutations as shown in Convex’s docs. If you prefer not to introduce that, the explicit call approach above is simpler.

**Option B: Scheduled Sync (Cron Job)**
In addition to event-driven updates, it’s wise to have a **periodic sync** as a safety net. This can correct any discrepancies that slip through (for example, if a Discord API call failed temporarily or someone manually changed roles). Convex supports **Cron Jobs** – recurring scheduled functions defined in `convex/crons.ts`. You could set up a cron job to run, say, every day at midnight (or even every hour) to verify and synchronize all members’ roles. For instance:

```ts
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("daily discord role sync", { hourUTC: 3, minuteUTC: 0 }, internal.discord.syncAllRoles);
// The above runs syncAllRoles every day at 3:00 AM UTC
// (adjust frequency as needed, or use crons.interval for hourly sync)

export default crons;
```

In the `syncAllRoles` internal function, you would:

* Fetch all members from the Convex DB who have a paid tier or recently churned.
* For each member, check their Discord roles (if you track what they should have or by querying Discord) and fix any mismatches. In practice, you might simplify this by unconditionally setting the roles based on the DB (Discord will ignore if a user already has a role or doesn’t have it, so sending the same assign twice isn’t harmful other than rate limits).
* Also remove roles for churned members, etc.

Using a cron job ensures **consistency over time**, even if edge cases or missed events happened. Convex’s cron feature makes it easy to schedule recurring tasks in code. Just be mindful to avoid doing too many Discord API calls in one go if you have many users; you might implement some batching or limits per run if needed (or run more frequently to spread load).

**Real-Time UI Feedback:** Because Convex is realtime, you can also leverage that for user feedback. For example, after a user links their Discord account or changes their subscription, you can update their member document and have the frontend listen (via a Convex query subscription) for the `members.role` or `members.tier` field. Once the Discord sync is done, you might update a field like `discordRoleSynced: true` or update their `role` field in Convex to reflect they now have “Early Bird” access. This could trigger a UI change like “Your Discord role has been updated!” to confirm to the user. This is optional but enhances transparency. Convex’s real-time queries will push updates to the client whenever the database changes.

## Handling Edge Cases and Ensuring Reliability

Carefully consider edge cases to make the system **solid and automatic**:

* **Subscription Expiry and Grace Periods:** If a user cancels and has a grace period until the end of the billing cycle, decide when to remove their role. A safe approach is to schedule a Convex job for the `subscriptionEndDate` that, when that date passes, double-checks the user’s status and removes roles if now churned. This could be another use of `ctx.scheduler.runAt(subscriptionEndDate, ...)` when a cancelation is processed.

* **Re-subscribes and Tier Changes:** If a churned user re-subscribes or a user upgrades/downgrades tier, ensure your logic **adds the new role and removes the old one**. For example, going from “Early Bird” to “Member” tier might mean removing the Early Bird role and adding the Member role. The trigger or update logic should handle changes in the `tier` field (comparing old vs new tier) and adjust roles accordingly.

* **User Not in Discord:** If your sync action finds that a user’s `discordId` is set but adding a role returns an error (e.g., Discord says the user ID is not a member of the guild), this means the user hasn’t joined your Discord server yet or left it. Handle this by:

  * Possibly catching the error and logging it in your database (maybe mark the member as `discordPending: true`). You could then notify the user via your app UI or email that they need to join the Discord server to get their role.
  * Optionally, if you have their Discord ID and an OAuth token with `guilds.join`, you could attempt to add them to the guild automatically. This requires your bot to have the ability to add guild members (which is only possible if the user authorized that scope and your bot is setup for it). That flow is complex, so many implementations simply alert the user to join via invite link.
  * Ensure that once they do join, perhaps by linking accounts or on next login, the roles get assigned (your daily cron would catch it, or you can trigger sync when a user links Discord).

* **Manual Role Overrides:** As mentioned, do not remove roles that are outside the scope of membership. If a moderator manually assigns a special role to a user (e.g., “Contest Winner”), your sync script should leave it untouched. One strategy is to maintain a constant list of roles your bot manages (the tier roles and the Free role). When syncing, only toggle those roles. For instance, if a user churns, remove only the roles that match any known tier roles they had, and add Free. If a user becomes active, add the tier role; do not mess with any other roles like “Moderator” or custom community roles.

* **Race Conditions and Delays:** Using triggers or immediate calls on events should prevent long delays, but network issues could introduce slight delays. That’s where a periodic cron helps as backup. Also, consider the scenario of someone renewing their subscription after being marked churned – there could be a window where they lost the role and got it back. That’s generally fine; just ensure idempotency (i.e., if they already have the role, adding again is okay; if they don’t have it, then add). Discord API calls to add a role that a user already has simply do nothing (and return 204), so your logic can be simplistic.

* **Logging and Monitoring:** It’s wise to log the outcome of each role sync action. If a Discord API call fails (network error or non-200 status), log it to Convex (maybe in a `roleSyncLog` table or at least console.error for later inspection). That way you can monitor issues (e.g., invalid token, permissions error, etc.). Convex’s dashboard can show function logs, and you can also build an admin panel to see users out-of-sync.

* **Testing:** Try the integration with test users. For example, create a dummy user in your Convex `members` with each tier and run the sync to see if the Discord roles update correctly. Also test the edge cases: user cancels (simulate Stripe webhook), user links Discord after already being active, user leaves server, etc., to ensure your code handles them gracefully.

## Summary

**In summary,** the best approach is a combination of **event-driven updates** (using Convex triggers or direct calls in your business logic when a membership changes) and a **fallback scheduled sync** to handle anything missed. Set up your Discord bot with the right permissions and use Discord’s role management APIs via a secure backend integration. Make sure to store each user’s Discord ID (using Clerk’s OAuth or a custom linking flow) so you know who to assign roles to. Map your Convex membership schema to Discord roles, and automate the assignments and removals based on subscription status.

By thinking through edge cases like expired memberships, manual role changes, and users not yet on Discord, you can create a **solid, automatic sync system**. This will ensure that your Discord community’s access control reflects the up-to-date membership status from your application, enhancing security and user experience. With Convex’s real-time capabilities, you can keep everything in sync seamlessly, providing immediate role updates and consistent channel access for your members. Good luck implementing your Discord role sync – once in place, it will greatly streamline community management! 🚀

**Sources:** Discord Developer Documentation (API and OAuth guides); Convex Documentation (Triggers, Cron Jobs, Scheduling, Environment Variables).

DECISIONS (resolved)
====================

* **Guild ID:** ``1355280592962453585`` (constant ``DISCORD_GUILD_ID``)
* **Paid‐member role ID:** ``1387242935992713216`` (constant ``DISCORD_ROLE_MEMBER_ID``)
* **Observer (free) role ID:** ``1392614035261751387`` (constant ``DISCORD_ROLE_OBSERVER_ID``)
* **Auto-join:** YES – backend will attempt to join members to the guild via ``guilds.join`` immediately after account linking and before role sync.
* **Grace period:** Users in *cancelled* status retain their paid role until ``subscriptionEndDate``.


TASK CHECKLIST
==============

Phase 1 – Foundation
--------------------
☐ add `discordId` field to ``convex/schema.ts`` and run codegen  
☐ create migration script ``convex/migrations/add_discord_id.ts``  
☐ extend validators in ``convex/members.ts`` (UI + server)  
☐ commit env vars: ``DISCORD_BOT_TOKEN``, ``DISCORD_GUILD_ID``, ``DISCORD_ROLE_MEMBER_ID``, ``DISCORD_ROLE_OBSERVER_ID``  
☐ unit test schema update (ensure read/write with `discordId`)

Phase 2 – Backend Sync
----------------------
☐ new file ``convex/discord/actions.ts`` – low-level REST helpers  
☐ new internal action ``internal.discord.syncRoles``  
☐ new internal action ``internal.discord.joinGuild`` (auto-add user using `guilds.join`)  
☐ helper ``getTargetRolesForMember()`` with exhaustive tier/status mapping  
☐ update ``stripe/webhooks.ts`` + membership mutations to `ctx.scheduler.runAfter(0, internal.discord.syncRoles, …)`  
☐ register trigger on ``members`` (tier/status change) using *convex-helpers*  
☐ nightly cron in ``convex/crons.ts`` → ``internal.discord.syncAllRoles``  
☐ unit tests (mock fetch) for mapping + action error paths

Phase 3 – Account Linking & UI
------------------------------
☐ OAuth route ``app/api/discord/oauth/route.ts`` (Discord `identify` scope)  
☐ mutation ``discord.linkAccount`` – persist `discordId`  
☐ component ``ConnectDiscordButton`` + settings section prompting un-linked payers  
☐ e2e test: user links Discord → paid role assigned within 30 s


PHASE 1 – FOUNDATION
====================

**Affected Files**
``convex/schema.ts`` – add optional field ``discordId: string | null`` to *members* table + regenerate indexes.
``convex/migrations/add_discord_id.ts`` – backfill script (no-op defaulting to null).
``convex/members.ts`` – update *MemberUIValidator* + helper transformers.

**Code Changes**
* Add ``discordId`` (nullable `string`) to members schema; expose via generated types.
* Run ``npx convex codegen`` (CI will fail if not run).
* Migration inserts ``discordId = null`` for existing docs.
* Update validators in both server & UI layers to include the new field.
* Add env var stubs in sample ``.env.example``.

**Unit Tests**
* Extend ``convex/test/members.test.ts`` to create a member with a mock ``discordId`` and verify round-trip via query.


PHASE 2 – BACKEND SYNC
======================

**Affected Files & New Files**
``convex/discord/actions.ts`` (NEW) – thin wrapper around Discord REST:
  * `putRole(userId, roleId)`
  * `deleteRole(userId, roleId)`
  * `getMemberRoles(userId)` (optional cache)
  * `joinGuild(userId, accessToken)` – uses `PUT /guilds/{guild.id}/members/{user.id}` with user token.
``convex/discord/roleMappings.ts`` (NEW) – exports constant ``TIER_TO_ROLE_ID`` + ``FREE_ROLE_ID``.
``convex/discord/sync.ts`` (NEW internal action) – exports:
  * ``syncRoles(memberId)`` – calculate desired roles vs current and issue add/remove calls (idempotent).
  * ``syncAllRoles()`` – iterate active members in batches of 100, throttled.
``convex/triggers/members.ts`` (NEW) – trigger on *members*; schedules `syncRoles` when `tier` or `subscriptionStatus` changes.
``convex/stripe/webhooks.ts`` – after each patch, schedule `syncRoles` for the affected member.
``convex/crons.ts`` – add nightly cron at 03:00 UTC.

**Code Changes**
* ``actions.ts`` uses ``fetch`` with ``Authorization: Bot ${token}``; handles 429 with retry-after.
* ``getTargetRolesForMember(member)`` logic table:
  * status == *active* → ``DISCORD_ROLE_MEMBER_ID``.
  * status in (*past_due*, *cancelled*) && ``subscriptionEndDate`` future → keep ``DISCORD_ROLE_MEMBER_ID``.
  * else → remove paid role, add ``DISCORD_ROLE_OBSERVER_ID``.
* ``joinGuild`` uses user access token (from OAuth) + bot token as reason header; called immediately after linking.
* `syncRoles`:
  1. Skip if `discordId` absent.
  2. Ensure member is in guild (optionally call `joinGuild` if not and access token stored <15 min old).
  3. Fetch current roles vs target; PUT/DELETE accordingly; log failures to ``roleSyncLog``.
  4. Patch member doc ``discordRoleSyncedAt``.
* Triggers & webhooks call ``ctx.scheduler.runAfter(0, internal.discord.syncRoles, { memberId })``.
* ``syncAllRoles`` same logic in batch.

**Unit Tests**
* ``convex/test/discordSync.test.ts`` mocks global ``fetch``; asserts correct PUT/DELETE payloads given sample member states.
* Failure path: Discord returns 403 → action logs error row.


PHASE 3 – ACCOUNT LINKING & UI
==============================

**Affected Files & New Files**
``app/api/discord/oauth/route.ts`` (NEW) – handles OAuth callback, exchanges code for access token (`identify`, `guilds.join`), fetches Discord user (`/users/@me`), **calls internal.discord.joinGuild** then returns `discordId`.
``convex/discord/linkAccount.ts`` (NEW mutation) – persists `discordId` + `discordAccessToken` (TTL 15 min) on member, schedules immediate role sync.
``components/ConnectDiscordButton.tsx`` (NEW) – opens OAuth URL; after callback, shows success toast.
``components/settings/DiscordSection.tsx`` – renders connect button when `currentMember.discordId` missing.
``lib/discord.ts`` – add `getDiscordOAuthUrl()` helper.

**Code Changes**
* OAuth flow uses *Discord PKCE* or standard OAuth depending on security review.
* After successful callback, Next.js route calls convex mutation to store id; then redirects to settings with `?discord=success`.
* UI shows banner until `discordId` exists.

**Unit & E2E Tests**
* Playwright spec `discord-link.spec.ts` – mocks Discord OAuth endpoint, verifies role assigned after link.
