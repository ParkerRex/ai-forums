# 🚀 RUN THE EXTRACTION NOW

## Step 1: Test Your Login (Optional)
```bash
node scripts/test-skool-login.js
```
This will verify your credentials work.

## Step 2: Run Full Extraction
```bash
node scripts/run-skool-extraction.js
```

### What will happen:
1. **You'll be prompted for**:
   - Email: [enter your Skool email]
   - Password: [enter your Skool password]
   - Group: troublefreeai (just press Enter)

2. **A Chrome window will open** and you'll see:
   - Automatic login to Skool
   - Navigation to troublefreeai group
   - Scrolling to load all posts
   - Clicking each post to load comments (this takes ~10-15 min)

3. **Progress updates** in terminal:
   ```
   📊 Posts: 207 | Comments: 1748 | Users: 150
   [142/207] Loading comments...
   ```

4. **Final output**:
   ```
   ✅ Data saved to: migration-data/skool-complete-troublefreeai-2025-06-27.json
   
   📊 FINAL RESULTS:
      Parent Posts: 207
      Comments: 1748
      Users: 150+
      Duration: 852 seconds
   ```

## The Complete Data Structure You'll Get:

```json
{
  "metadata": {
    "extractedAt": "2025-06-27T...",
    "group": "troublefreeai",
    "stats": {
      "parentPosts": 207,
      "comments": 1748,
      "users": 150+
    }
  },
  "posts": [
    {
      "id": "post-id",
      "title": "Post Title",
      "content": "Full post content",
      "metadata": {
        "upvotes": 10,
        "comments": 5,
        "attachments": "attachment-id"
      },
      "user": {
        "id": "user-id",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ],
  "comments": [
    {
      "id": "comment-id",
      "rootId": "parent-post-id",
      "content": "Comment text",
      "user": {...}
    }
  ],
  "users": [
    {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "metadata": {
        "bio": "User bio",
        "location": "Location",
        "socialLinks": {...}
      }
    }
  ]
}
```

## 🎯 THIS IS IT! Run it now:
```bash
node scripts/run-skool-extraction.js
```