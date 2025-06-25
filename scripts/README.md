# Member Import Scripts

This directory contains scripts for importing member data from CSV files into your Convex database.

## Files

- **`transform-members.js`** - Transforms CSV data to match Convex schema (outputs JSON file)
- **`import-members.js`** - Complete solution: transforms CSV and imports directly to Convex
- **`../convex/importMembers.ts`** - Convex mutations for importing member data

## Quick Start

### Option 1: Complete Import (Recommended)

```bash
# 1. Place your CSV file as 'members.json' in project root
# 2. Run the import script
node scripts/import-members.js
```

### Option 2: Transform Only

```bash
# Transforms CSV to JSON format
node scripts/transform-members.js
# Then manually import the generated 'transformed-members.json'
```

## Sample Data

See `members-sample.csv` for the expected CSV format with example data.

## CSV Format Expected

Your CSV file should have these columns:

```
FirstName,LastName,Email,Invited By,JoinedDate,Question1,Answer1,Question2,Answer2,Question3,Answer3
```

## Data Mapping

| CSV Column | Convex Field | Notes                                         |
| ---------- | ------------ | --------------------------------------------- |
| FirstName  | firstName    | Required                                      |
| LastName   | lastName     | Required                                      |
| Email      | email        | Required                                      |
| JoinedDate | joinedDate   | Converted to milliseconds timestamp           |
| -          | status       | Set to "active"                               |
| -          | updatedAt    | Current timestamp                             |
| -          | bio          | Set to "I need to update this in my profile!" |
| -          | lastOnline   | Uses joinedDate value                         |
| -          | country      | Optional, empty by default                    |

## Schema

The member schema in `convex/schema.ts`:

```typescript
members: defineTable({
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  status: v.union(v.literal("active"), v.literal("churned"), v.literal("free")),
  joinedDate: v.number(), // milliseconds since epoch
  country: v.optional(v.string()),
  updatedAt: v.number(), // milliseconds since epoch
  bio: v.optional(v.string()),
  lastOnline: v.number(), // milliseconds since epoch
  linkGithub: v.optional(v.string()),
  linkX: v.optional(v.string()),
  linkYouTube: v.optional(v.string()),
  location: v.optional(v.string()),
});
```

## Notes

- Timestamps are stored as numbers (milliseconds since epoch) following Convex best practices
- Duplicate detection is handled by email address
- Import runs in batches of 10 members to avoid rate limits
- The script includes error handling and progress reporting
