#!/bin/bash

# Vercel Ignored Build Step Script
# This script restricts preview builds to only the 'staging' branch
# Exit code 0 = Cancel build
# Exit code 1 = Proceed with build

echo "VERCEL_GIT_COMMIT_REF: $VERCEL_GIT_COMMIT_REF"

if [[ "$VERCEL_GIT_COMMIT_REF" == "staging" ]]; then
    echo "✅ - Build can proceed"
    exit 1;
else
    echo "🛑 - Build cancelled"
    exit 0;
fi