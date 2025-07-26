# Convex Dev to Prod Migration Guide

This guide walks you through migrating new posts and member data from your development Convex database to production while preserving existing production data, especially payment information.

## 🚀 Quick Start

```bash
# 1. Export data from both environments
npx convex dev
node scripts/export-convex-data.js dev

npx convex prod  
node scripts/export-convex-data.js prod

# 2. Analyze differences
node scripts/analyze-migration-diff.js

# 3. Prepare migration data
node scripts/prepare-migration-data.js

# 4. Execute migration (with dry run first)
IMPORT_SECRET_TOKEN=your-secret-token CONVEX_URL=https://your-prod.convex.site node scripts/execute-migration.js

# 5. Verify results
node scripts/verify-migration.js
```

## 📋 Prerequisites

1. **Environment Variables**
   - `IMPORT_SECRET_TOKEN`: Secret token for HTTP import endpoint
   - `CONVEX_URL`: Your production Convex deployment URL

2. **Convex Setup**
   - Ensure you have the HTTP import endpoint deployed (convex/http.ts)
   - Ensure you have the import mutations deployed (convex/importPostsComments.ts)

## 🔧 Scripts Overview

### 1. `export-convex-data.js`
Exports data from Convex database for analysis.

**Usage:**
```bash
node scripts/export-convex-data.js [environment]
```

**What it does:**
- Exports all relevant tables (members, posts, comments, etc.)
- Saves to `migration-data/export-{env}-{date}/`
- Creates an export summary

### 2. `analyze-migration-diff.js`
Compares dev and prod data to identify what needs migration.

**Usage:**
```bash
node scripts/analyze-migration-diff.js
```

**What it does:**
- Identifies new members (in dev but not in prod)
- Identifies new posts and their authors
- Finds posts with missing authors
- Creates category ID mappings
- Saves analysis to `migration-data/analysis-{date}/`

### 3. `prepare-migration-data.js`
Prepares clean data files for import.

**Usage:**
```bash
node scripts/prepare-migration-data.js
```

**What it does:**
- Cleans member data (removes system fields, preserves required fields)
- Prepares posts with author email references
- Identifies additional members needed for orphaned posts
- Saves to `migration-data/import-ready-{date}/`

### 4. `execute-migration.js`
Performs the actual migration to production.

**Usage:**
```bash
IMPORT_SECRET_TOKEN=xxx CONVEX_URL=xxx node scripts/execute-migration.js
```

**What it does:**
- Prompts for confirmation before proceeding
- Offers dry run option
- Imports data in order: members → posts → comments
- Tracks ID mappings between systems
- Saves results to `migration-data/migration-results-{date}/`

### 5. `verify-migration.js`
Verifies the migration was successful.

**Usage:**
```bash
node scripts/verify-migration.js
```

**What it does:**
- Samples imported data to verify it exists
- Checks payment data integrity
- Generates verification report
- Provides recommendations for any issues

## 🔒 Security Considerations

1. **Authentication**: The HTTP import endpoint requires a bearer token
2. **Environment Isolation**: Always verify you're connected to the right environment
3. **Dry Run**: Always do a dry run first before actual migration
4. **Backups**: Export production data before migration as a backup

## 📊 Migration Order

The migration follows this specific order to maintain referential integrity:

1. **Members First**: All members must exist before posts can reference them
2. **Posts Second**: Posts need valid member IDs and category IDs
3. **Comments Last**: Comments need valid post IDs and member IDs

## ⚠️ Important Notes

### Payment Data Protection
- The migration scripts specifically avoid modifying payment-related fields
- Fields like `stripeCustomerId`, `subscriptionStatus`, etc. are preserved
- New members get default/null payment fields

### ID Mapping
- Original IDs are tracked throughout the migration
- Mappings are saved for debugging and verification
- Comments maintain their threading relationships

### Error Handling
- The migration continues even if individual items fail
- All errors are logged and saved to results files
- Review error logs after migration

## 🐛 Troubleshooting

### Common Issues

1. **"Member not found for email"**
   - The post author doesn't exist in the target database
   - Solution: The script creates these members automatically

2. **"Post not found for Skool ID"**
   - Comment references a post that wasn't migrated
   - Solution: Check post migration errors

3. **Rate Limiting**
   - Too many requests too quickly
   - Solution: Adjust `BATCH_SIZE` and `DELAY_BETWEEN_BATCHES`

### Verification Failures

If verification shows issues:
1. Check the detailed error logs in the results directory
2. Use Convex dashboard to manually inspect data
3. Re-run specific failed batches if needed

## 📁 Output Structure

```
migration-data/
├── export-dev-2024-01-26/       # Dev data export
├── export-prod-2024-01-26/      # Prod data export
├── analysis-2024-01-26/         # Diff analysis results
├── import-ready-2024-01-26/     # Prepared import files
└── migration-results-2024-01-26/ # Migration results & logs
    ├── member-import-results.json
    ├── post-import-results.json
    ├── comment-import-results.json
    ├── migration-summary.json
    └── verification-report.json
```

## 🔄 Rollback

If you need to rollback:
1. The migration doesn't delete any existing data
2. You can identify imported items by their creation timestamps
3. Use the ID mappings to track what was imported
4. Consider implementing a cleanup script using the saved ID mappings

## 📝 Best Practices

1. **Test First**: Always test with a small subset of data
2. **Monitor**: Watch the Convex dashboard during migration
3. **Verify**: Run verification after each migration
4. **Document**: Keep notes on any manual interventions
5. **Backup**: Export production data before starting

## 🤝 Support

If you encounter issues:
1. Check the error logs in the results directory
2. Review the Convex dashboard for any errors
3. Ensure all environment variables are set correctly
4. Verify the HTTP endpoint is deployed and accessible