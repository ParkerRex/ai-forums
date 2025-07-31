// import { internalAction, internalMutation, query } from "../_generated/server";
// import { v } from "convex/values";
// import { internal } from "../_generated/api";
// import { Id } from "../_generated/dataModel";

// /**
//  * Migration to sync avatar URLs from Clerk for all members with externalIds
//  * Run this after uploading avatars to Clerk to sync them to the database
//  */
// export const syncClerkAvatars = internalAction({
//   args: {},
//   handler: async (ctx): Promise<{ total: number; updated: number; errors: number }> => {
//     const clerkSecretKey = process.env.CLERK_SECRET_KEY;
//     if (!clerkSecretKey) {
//       throw new Error("CLERK_SECRET_KEY not configured");
//     }

//     // Get all members with externalIds (Clerk user IDs)
//     const members = await ctx.runQuery(internal.migrations.sync_clerk_avatars.getMembersWithClerkIds);

//     console.log(`Found ${members.length} members with Clerk IDs to sync`);

//     let updated = 0;
//     let errors = 0;

//     for (const member of members) {
//       if (!member.externalId) continue;

//       try {
//         // Fetch user data from Clerk
//         const response = await fetch(
//           `https://api.clerk.com/v1/users/${member.externalId}`,
//           {
//             headers: {
//               Authorization: `Bearer ${clerkSecretKey}`,
//             },
//           }
//         );

//         if (!response.ok) {
//           console.error(`Failed to fetch Clerk user ${member.externalId}: ${response.status}`);
//           errors++;
//           continue;
//         }

//         const clerkUser = await response.json();
        
//         // Check if Clerk has an avatar URL
//         if (clerkUser.image_url && clerkUser.image_url !== member.avatarUrl) {
//           // Update member with new avatar URL
//           await ctx.runMutation(internal.migrations.sync_clerk_avatars.updateMemberAvatar, {
//             memberId: member._id,
//             avatarUrl: clerkUser.image_url,
//           });
          
//           console.log(`Updated avatar for ${member.firstName} ${member.lastName}`);
//           updated++;
//         }
//       } catch (error) {
//         console.error(`Error syncing avatar for member ${member._id}:`, error);
//         errors++;
//       }
//     }

//     console.log(`Avatar sync complete: ${updated} updated, ${errors} errors`);
    
//     return {
//       total: members.length,
//       updated,
//       errors,
//     };
//   },
// });

// /**
//  * Public query to get members with Clerk IDs for avatar sync
//  */
// export const getMembersForAvatarSync = query({
//   args: {},
//   handler: async (ctx) => {
//     const members = await ctx.db
//       .query("members")
//       .filter((q) => q.neq(q.field("externalId"), undefined))
//       .collect();
    
//     return members.map(m => ({
//       _id: m._id,
//       externalId: m.externalId || '',
//       firstName: m.firstName,
//       lastName: m.lastName,
//       avatarUrl: m.avatarUrl,
//     }));
//   },
// });

// /**
//  * Helper query to get a single member by ID
//  */
// export const getMemberById = query({
//   args: {
//     memberId: v.id("members"),
//   },
//   handler: async (ctx, args) => {
//     const member = await ctx.db.get(args.memberId);
//     if (!member) return null;
    
//     return {
//       _id: member._id,
//       externalId: member.externalId,
//       firstName: member.firstName,
//       lastName: member.lastName,
//       avatarUrl: member.avatarUrl,
//     };
//   },
// });

// /**
//  * Helper mutation to update member avatar
//  */
// export const updateMemberAvatar = internalMutation({
//   args: {
//     memberId: v.id("members"),
//     avatarUrl: v.string(),
//   },
//   handler: async (ctx, args) => {
//     await ctx.db.patch(args.memberId, {
//       avatarUrl: args.avatarUrl,
//       updatedAt: Date.now(),
//     });
//   },
// });

// /**
//  * Migration to sync a single member's avatar from Clerk
//  * Useful for testing or updating individual members
//  */
// export const syncSingleMemberAvatar = internalAction({
//   args: {
//     memberId: v.id("members"),
//   },
//   handler: async (ctx, args): Promise<{ memberId: Id<"members">; previousAvatar: string | null; newAvatar: string | null; message?: string }> => {
//     const clerkSecretKey = process.env.CLERK_SECRET_KEY;
//     if (!clerkSecretKey) {
//       throw new Error("CLERK_SECRET_KEY not configured");
//     }

//     const member = await ctx.runQuery(internal.migrations.sync_clerk_avatars.getMemberById, { memberId: args.memberId });
//     if (!member) {
//       throw new Error("Member not found");
//     }

//     if (!member.externalId) {
//       throw new Error("Member does not have a Clerk ID");
//     }

//     // Fetch user data from Clerk
//     const response = await fetch(
//       `https://api.clerk.com/v1/users/${member.externalId}`,
//       {
//         headers: {
//           Authorization: `Bearer ${clerkSecretKey}`,
//         },
//       }
//     );

//     if (!response.ok) {
//       throw new Error(`Failed to fetch Clerk user: ${response.status}`);
//     }

//     const clerkUser = await response.json();
    
//     // Update member with avatar URL from Clerk
//     if (clerkUser.image_url) {
//       await ctx.runMutation(internal.migrations.sync_clerk_avatars.updateMemberAvatar, {
//         memberId: member._id,
//         avatarUrl: clerkUser.image_url,
//       });
      
//       console.log(`Updated avatar for ${member.firstName} ${member.lastName}: ${clerkUser.image_url}`);
      
//       return {
//         memberId: member._id,
//         previousAvatar: member.avatarUrl,
//         newAvatar: clerkUser.image_url,
//       };
//     } else {
//       return {
//         memberId: member._id,
//         message: "No avatar found in Clerk",
//       };
//     }
//   },
// });