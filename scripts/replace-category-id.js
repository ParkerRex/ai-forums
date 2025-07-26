// Quick script to replace category IDs after you have the actual ID
const fs = require("fs");

const SKOOL_CATEGORY_ID = "jh789zhr5zyev7h79b6kjxzv3n7mbv3f"; // <-- Replace this

const batches = JSON.parse(
  fs.readFileSync("./migration-data/post-batches-skool.json", "utf8"),
);
const updated = JSON.stringify(batches, null, 2).replace(
  /SKOOL_CATEGORY_ID/g,
  SKOOL_CATEGORY_ID,
);
fs.writeFileSync("./migration-data/post-batches-ready.json", updated);
console.log("✅ Created post-batches-ready.json with actual category IDs");
