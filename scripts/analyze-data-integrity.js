const { ConvexClient } = require("convex/browser");

async function analyzeDataIntegrity() {
  const client = new ConvexClient("https://energized-ibis-736.convex.cloud");
  
  console.log("Starting data integrity analysis...\n");
  
  try {
    // 1. Find posts with missing author information
    console.log("1. CHECKING POSTS WITH MISSING AUTHORS");
    console.log("=" .repeat(50));
    
    const postsWithoutAuthors = await client.query("api.posts.list", {
      filter: { hasAuthor: false }
    }).catch(() => null);
    
    if (!postsWithoutAuthors) {
      // Try alternative approach - get all posts and filter client-side
      const allPosts = await client.query("api.posts.list", {}).catch(() => []);
      console.log(`Total posts found: ${allPosts.length}`);
      
      const postsWithIssues = allPosts.filter(post => !post.memberId);
      console.log(`Posts without memberId: ${postsWithIssues.length}`);
      
      if (postsWithIssues.length > 0) {
        console.log("\nSample posts without authors:");
        postsWithIssues.slice(0, 5).forEach(post => {
          console.log(`- ID: ${post._id}, Title: "${post.title}", Created: ${new Date(post.createdAt).toISOString()}`);
        });
      }
    }
    
    // 2. Find members with fake/placeholder emails
    console.log("\n\n2. CHECKING MEMBERS WITH PLACEHOLDER EMAILS");
    console.log("=" .repeat(50));
    
    const allMembers = await client.query("api.members.list", {}).catch(() => []);
    console.log(`Total members found: ${allMembers.length}`);
    
    const membersWithFakeEmails = allMembers.filter(member => 
      member.email && (
        member.email.includes('@imported.com') ||
        member.email.includes('@unknown.com') ||
        member.email.includes('@placeholder.com') ||
        member.email === 'unknown@imported.com'
      )
    );
    
    console.log(`Members with placeholder emails: ${membersWithFakeEmails.length}`);
    
    if (membersWithFakeEmails.length > 0) {
      console.log("\nBreakdown by email pattern:");
      const patterns = {};
      membersWithFakeEmails.forEach(member => {
        const domain = member.email.split('@')[1];
        patterns[domain] = (patterns[domain] || 0) + 1;
      });
      Object.entries(patterns).forEach(([domain, count]) => {
        console.log(`- @${domain}: ${count} members`);
      });
      
      console.log("\nSample members with placeholder emails:");
      membersWithFakeEmails.slice(0, 5).forEach(member => {
        console.log(`- ID: ${member._id}, Name: "${member.firstName} ${member.lastName}", Email: ${member.email}`);
      });
    }
    
    // 3. Find comments without associated posts
    console.log("\n\n3. CHECKING COMMENTS WITHOUT ASSOCIATED POSTS");
    console.log("=" .repeat(50));
    
    const allComments = await client.query("api.comments.list", {}).catch(() => []);
    console.log(`Total comments found: ${allComments.length}`);
    
    // Get all post IDs for validation
    const postIds = new Set(allPosts.map(p => p._id));
    
    const orphanedComments = allComments.filter(comment => 
      !comment.postId || !postIds.has(comment.postId)
    );
    
    console.log(`Comments without valid postId: ${orphanedComments.length}`);
    
    if (orphanedComments.length > 0) {
      console.log("\nSample orphaned comments:");
      orphanedComments.slice(0, 5).forEach(comment => {
        console.log(`- ID: ${comment._id}, PostId: ${comment.postId || 'null'}, Content: "${comment.content.substring(0, 50)}..."`);
      });
    }
    
    // 4. Additional data anomalies
    console.log("\n\n4. OTHER DATA ANOMALIES");
    console.log("=" .repeat(50));
    
    // Comments without authors
    const commentsWithoutAuthors = allComments.filter(comment => !comment.memberId);
    console.log(`Comments without memberId: ${commentsWithoutAuthors.length}`);
    
    // Posts with invalid categories
    const categories = await client.query("api.categories.list", {}).catch(() => []);
    const categoryIds = new Set(categories.map(c => c._id));
    const postsWithInvalidCategories = allPosts.filter(post => 
      !post.categoryId || !categoryIds.has(post.categoryId)
    );
    console.log(`Posts with invalid categoryId: ${postsWithInvalidCategories.length}`);
    
    // Members with missing required fields
    const membersWithMissingData = allMembers.filter(member => 
      !member.firstName || !member.lastName || !member.email || !member.slug
    );
    console.log(`Members with missing required fields: ${membersWithMissingData.length}`);
    
    // Posts with missing slugs
    const postsWithoutSlugs = allPosts.filter(post => !post.slug);
    console.log(`Posts without slugs: ${postsWithoutSlugs.length}`);
    
    // Summary
    console.log("\n\nSUMMARY OF DATA INTEGRITY ISSUES");
    console.log("=" .repeat(50));
    console.log(`Total records analyzed:`);
    console.log(`- Posts: ${allPosts.length}`);
    console.log(`- Comments: ${allComments.length}`);
    console.log(`- Members: ${allMembers.length}`);
    console.log(`- Categories: ${categories.length}`);
    console.log(`\nIssues found:`);
    console.log(`- Posts without authors: ${postsWithIssues.length}`);
    console.log(`- Members with placeholder emails: ${membersWithFakeEmails.length}`);
    console.log(`- Orphaned comments: ${orphanedComments.length}`);
    console.log(`- Comments without authors: ${commentsWithoutAuthors.length}`);
    console.log(`- Posts with invalid categories: ${postsWithInvalidCategories.length}`);
    console.log(`- Members with missing data: ${membersWithMissingData.length}`);
    console.log(`- Posts without slugs: ${postsWithoutSlugs.length}`);
    
  } catch (error) {
    console.error("Error during analysis:", error);
  } finally {
    client.close();
  }
}

analyzeDataIntegrity();