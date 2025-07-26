import { api } from "../convex/_generated/api.js";
import { ConvexClient } from "convex/browser";
import * as dotenv from "dotenv";
import fs from "fs";
import { parse } from "csv-parse";

dotenv.config({ path: ".env.local" });

const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function fixMemberEmails() {
  console.log("Starting member email fixes...");

  // First, handle the specific name changes and updates
  const specificUpdates = [
    {
      oldName: "John Victory",
      newFirstName: "Derek",
      newLastName: "Victory",
      email: "derek@getfwd.com",
      joinedDate: "2025-04-16",
      subscription: { amount: 50, interval: "monthly" }
    },
    {
      firstName: "Emm",
      lastName: "Ess",
      newFirstName: "Malvinder",
      newLastName: "",
      email: "aemaes@gmail.com",
      joinedDate: "2025-06-23",
      subscription: { amount: 50, interval: "monthly" }
    },
    {
      oldName: "Sin Adain",
      newFirstName: "Hiram",
      newLastName: "Clark",
      joinedDate: "2025-07-08",
      subscription: { amount: 50, interval: "monthly" }
    }
  ];

  // Apply specific updates
  for (const update of specificUpdates) {
    try {
      if (update.oldName) {
        // Handle name changes
        const members = await convex.query(api.members.searchByName, {
          name: update.oldName
        });
        
        if (members && members.length > 0) {
          const member = members[0];
          await convex.mutation(api.members.updateMember, {
            memberId: member._id,
            firstName: update.newFirstName,
            lastName: update.newLastName,
            email: update.email || member.email
          });
          console.log(`Updated ${update.oldName} -> ${update.newFirstName} ${update.newLastName}`);
        }
      } else {
        // Handle email updates
        const members = await convex.query(api.members.searchByName, {
          firstName: update.firstName,
          lastName: update.lastName
        });
        
        if (members && members.length > 0) {
          const member = members[0];
          await convex.mutation(api.members.updateMember, {
            memberId: member._id,
            firstName: update.newFirstName || member.firstName,
            lastName: update.newLastName || member.lastName,
            email: update.email
          });
          console.log(`Updated ${update.firstName} ${update.lastName} with email ${update.email}`);
        }
      }
    } catch (error) {
      console.error(`Error updating member:`, error);
    }
  }

  // Now read CSV and update all @imported.com emails
  const emailMap = new Map();
  
  await new Promise((resolve, reject) => {
    fs.createReadStream("migration-data/community_members-latest.csv")
      .pipe(parse({ columns: true }))
      .on("data", (row) => {
        if (row.FirstName && row.LastName && row.Email) {
          const key = `${row.FirstName.trim()} ${row.LastName.trim()}`;
          emailMap.set(key, row.Email.trim());
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`Loaded ${emailMap.size} email mappings from CSV`);

  // Get all members with @imported.com emails
  const importedMembers = await convex.query(api.members.getMembersWithImportedEmails);
  
  console.log(`Found ${importedMembers.length} members with @imported.com emails`);

  for (const member of importedMembers) {
    const fullName = `${member.firstName} ${member.lastName}`;
    const correctEmail = emailMap.get(fullName);
    
    if (correctEmail) {
      try {
        await convex.mutation(api.members.updateMember, {
          memberId: member._id,
          email: correctEmail
        });
        console.log(`Updated ${fullName}: ${member.email} -> ${correctEmail}`);
      } catch (error) {
        console.error(`Error updating ${fullName}:`, error);
      }
    } else {
      console.log(`No email found in CSV for ${fullName}`);
    }
  }

  console.log("Member email fixes completed!");
}

fixMemberEmails()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
