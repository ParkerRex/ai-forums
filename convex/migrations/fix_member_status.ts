import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * Migration to fix member statuses based on CSV of active community members
 * 
 * The CSV contains active members who were incorrectly marked as "churned"
 * This migration updates their status to "active"
 */

// Active members from community_members (3).csv (extracted from the file)
const ACTIVE_MEMBER_EMAILS = [
  "aemaes@gmail.com",
  "david.manibod@gmail.com", 
  "ryanleerhodes@gmail.com",
  "rileyrmahoney@gmail.com",
  "kyle.m.marks@icloud.com",
  "joeypayne.freedom@gmail.com",
  "crusoebirkhead@gmail.com",
  "ifj.juhasz.peter@gmail.com",
  "scottdellinger@yahoo.com",
  "content@helpsmin.com",
  "pw911ebay@gmail.com",
  "boothe.jeff@gmail.com",
  "jachian.22@gmail.com",
  "arnavg2019@email.iimcal.ac.in",
  "matt@mattjdavidson.com",
  "taylor@growthsaloon.com",
  "cczaban@zerothprinciples.ai",
  "michael.j.tier@gmail.com",
  "jasen@glowing.io",
  "rick.kieffer@gmail.com",
  "davidram3rd@gmail.com",
  "morrisonb84@gmail.com",
  "micah.davis@letsmake.com",
  "james.loesch2@gmail.com",
  "schuilenburgchris@gmail.com",
  "merlin.floyd@gmail.com",
  "dtedesco1@gmail.com",
  "pietersz@gmail.com",
  "joe.hosemann@gmail.com",
  "josh@gracefulbydesign.com",
  "douglasdrew11@gmail.com",
  "ceo@getdatazen.com",
  "jschon@jschon.net",
  "javie@javierios.com",
  "andrewjohnharvey@gmail.com",
  "chensok@gmail.com",
  "anomalia.research@gmail.com",
  "mike@makeshapes.com",
  "mtorrescohencol@gmail.com",
  "seltzdesign@protonmail.com",
  "henrik@thepia.net",
  "corey@cmetech.io",
  "orakemu@gmail.com",
  "maximacademic@gmail.com",
  "romneycola@romeai.io",
  "bxbxbxbxbxr@gmail.com",
  "trent.swords@gmail.com",
  "martin.martinez.mit@gmail.com",
  "michaelduong@my.com",
  "daniel.jorge@sticorp.com.br",
  "j.te@nimbuscoreconnect.nl",
  "alekellegard@protonmail.com",
  "dustinw@flywheelaec.com",
  "davidp@brazenconsulting.co",
  "dev@webzi.ai",
  "willjoemo@gmail.com",
  "gbatesy@gmail.com",
  "guilherme1237@gmail.com",
  "contextsurfer@gmail.com",
  "hunterlapeyre@yahoo.com",
  "rick@pixelpod.co.uk",
  "me@iamfiscus.com",
  "joe.kim@gmail.com",
  "cje.amaya@gmail.com",
  "xamfifa@gmail.com",
  "shane@studiobr.io",
  "craig.cocker@gmail.com",
  "mandrew333@gmail.com",
  "jasen@humanig.com",
  "beda@mademarketing.ch",
  "iandunn@iandunn.net",
  "jdsmith2816@gmail.com",
  "keith@visualgov.com",
  "matt@mattjefferson.com",
  "wmcarsten@gmail.com",
  "rthutchison@gmail.com",
  "jakenicholas.mgmt@gmail.com",
  "amanlohia1995@gmail.com",
  "evandemkiw@gmail.com",
  "main@neurov.ai",
  "nnasoody@gmail.com",
  "andy@andydataguy.com",
  "jerin.stewart@gmail.com",
  "brandondmilligan@icloud.com",
  "thebigexample@gmail.com",
  "hamilton.lachlan@gmail.com",
  "jacobinicky@hotmail.com",
  "darnellpowers77@gmail.com",
  "nathaniel.j.garcia@gmail.com",
  "danishafzalkhan@gmail.com",
  "derek@getfwd.com",
  "haverondavid@gmail.com",
  "janos.jakab@gmail.com",
  "skfelix1@gmail.com",
  "subscriptions@gcservicesgroup.com",
  "michael@michaelosborne.tech",
  "samzemro@gmail.com",
  "muttahar127@gmail.com",
  "david@uhostx.com",
  "gdconnect@gmail.com",
  "pierre@cyberscaling.com",
  "skool.zlazj@passmail.net",
  "rathiharivansh@gmail.com",
  "robertogcb12@gmail.com",
  "cdragobusiness@gmail.com",
  "npbaron97@gmail.com",
  "pb@mintaveinc.com",
  "aiden@aidenhooper.com"
];

export const fixMemberStatus = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    
    console.log(`🔄 Starting member status fix (dryRun: ${dryRun})`);
    
    // Get all members
    const allMembers = await ctx.db.query("members").collect();
    console.log(`📊 Total members in database: ${allMembers.length}`);
    
    // Group members by email to find duplicates
    const membersByEmail = new Map<string, typeof allMembers>();
    allMembers.forEach(member => {
      const email = member.email.toLowerCase();
      if (!membersByEmail.has(email)) {
        membersByEmail.set(email, []);
      }
      membersByEmail.get(email)!.push(member);
    });
    
    let updatedCount = 0;
    let duplicatesFound = 0;
    let activeMembersFound = 0;
    
    // Process each active email from CSV
    for (const activeEmail of ACTIVE_MEMBER_EMAILS) {
      const email = activeEmail.toLowerCase();
      const members = membersByEmail.get(email);
      
      if (!members || members.length === 0) {
        console.log(`⚠️  Email not found in database: ${activeEmail}`);
        continue;
      }
      
      activeMembersFound++;
      
      if (members.length > 1) {
        duplicatesFound++;
        console.log(`🔀 Found ${members.length} duplicates for ${activeEmail}`);
        
        // Find the member with the highest activity (posts + comments)
        let bestMember = members[0];
        let maxActivity = (bestMember.postCount || 0) + (bestMember.commentCount || 0);
        
        for (const member of members) {
          const activity = (member.postCount || 0) + (member.commentCount || 0);
          if (activity > maxActivity) {
            bestMember = member;
            maxActivity = activity;
          }
        }
        
        // Update the best member to active
        if (bestMember.status !== "active") {
          if (!dryRun) {
            await ctx.db.patch(bestMember._id, { status: "active" });
          }
          console.log(`✅ ${dryRun ? '[DRY RUN] ' : ''}Updated best member to active: ${bestMember.firstName} ${bestMember.lastName} (${bestMember.email})`);
          updatedCount++;
        }
        
        // Mark others as duplicates
        for (const member of members) {
          if (member._id !== bestMember._id && member.status !== "duplicate") {
            if (!dryRun) {
              await ctx.db.patch(member._id, { 
                status: "duplicate",
                mergedInto: bestMember._id
              });
            }
            console.log(`🔄 ${dryRun ? '[DRY RUN] ' : ''}Marked duplicate: ${member.firstName} ${member.lastName} (${member.email})`);
          }
        }
      } else {
        // Single member - just update status to active if needed
        const member = members[0];
        if (member.status !== "active") {
          if (!dryRun) {
            await ctx.db.patch(member._id, { status: "active" });
          }
          console.log(`✅ ${dryRun ? '[DRY RUN] ' : ''}Updated to active: ${member.firstName} ${member.lastName} (${member.email})`);
          updatedCount++;
        }
      }
    }
    
    const summary = {
      totalMembers: allMembers.length,
      activeMembersInCSV: ACTIVE_MEMBER_EMAILS.length,
      activeMembersFound,
      duplicatesFound,
      membersUpdated: updatedCount,
      dryRun
    };
    
    console.log(`📋 Migration Summary:`, summary);
    return summary;
  },
}); 