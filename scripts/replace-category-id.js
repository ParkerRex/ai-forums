
// Quick script to replace category IDs after you have the actual ID
const fs = require('fs');
const path = require('path');

const SKOOL_CATEGORY_ID = "jh7cfp5t50f6d9pd1h1s0ecw0d7jn2jg";

const batches = JSON.parse(fs.readFileSync(path.join(__dirname, '../migration-data/post-batches-skool.json'), 'utf8'));
const updated = JSON.stringify(batches, null, 2).replace(/SKOOL_CATEGORY_ID/g, SKOOL_CATEGORY_ID);
fs.writeFileSync(path.join(__dirname, '../migration-data/post-batches-ready.json'), updated);
console.log('✅ Created post-batches-ready.json with actual category IDs');
