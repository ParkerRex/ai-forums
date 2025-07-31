import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// HTTP action for triggering imports with authentication
const importData = httpAction(async (ctx, request) => {
  // Add authentication check
  const authHeader = request.headers.get("Authorization");
  const expectedToken = process.env.IMPORT_SECRET_TOKEN;
  
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { type, data } = await request.json();
    
    if (type === "posts") {
      const result = await ctx.runMutation(internal.importPostsComments.importPostsBatch, {
        posts: data.posts,
      });
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } else if (type === "comments") {
      const result = await ctx.runMutation(internal.importPostsComments.importCommentsBatch, {
        comments: data.comments,
        postIdMap: data.postIdMap,
      });
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } else if (type === "members") {
      const result = await ctx.runMutation(internal.importPostsComments.createMissingMember, {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        joinedDate: data.joinedDate,
      });
      
      return new Response(JSON.stringify({ memberId: result }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
    
    return new Response("Invalid import type", { status: 400 });
  } catch (error) {
    console.error("Import error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
});

http.route({
  path: "/import",
  method: "POST",
  handler: importData,
});

// Health check endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response("OK", { status: 200 });
  }),
});

export default http;