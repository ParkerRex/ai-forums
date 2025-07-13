import ActivityCard from "../activity-card";

// Visual test to see how activity cards look
export function ActivityCardVisualTest() {
  const sampleActivity = {
    id: "test-1",
    type: "comment" as const,
    content: "This is a sample comment that shows how the activity card will look. It can contain multiple lines of text and should be truncated based on the size prop.",
    timeAgo: "2 hours ago",
    postId: "post-1",
    postTitle: "How to build a modern web application with Next.js and Convex",
    postSlug: "modern-web-app-nextjs-convex",
    categoryName: "general",
    netVotes: 42,
  };

  return (
    <div className="p-8 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Activity Card Visual Test</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Small Size</h2>
          <ActivityCard activity={sampleActivity} size="small" />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Medium Size (Default)</h2>
          <ActivityCard activity={sampleActivity} size="medium" />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Large Size</h2>
          <ActivityCard activity={sampleActivity} size="large" />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Multiple Cards (As in member page)</h2>
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4">
                <ActivityCard 
                  activity={{
                    ...sampleActivity,
                    id: `test-${i}`,
                    content: i === 1 
                      ? "Short comment."
                      : i === 2
                      ? "This is a medium length comment that provides some context and information about the topic being discussed."
                      : "This is a very long comment that contains multiple sentences and lots of information. It should demonstrate how the card handles longer content and how it truncates based on the size property. The card should maintain good readability while fitting within the design constraints.",
                    netVotes: i * 15,
                    timeAgo: `${i * 3} hours ago`,
                  }} 
                  size="medium" 
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}