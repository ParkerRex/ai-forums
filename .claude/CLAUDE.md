Do the following in this sequence after new work is complete:
1. Run npm run test
2. Run npm run lint after you run tests and then recursively loop until things fix
3. Run npx tsc --noEmit after lint passes to ensure type safety

