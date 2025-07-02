const { ConvexHttpClient } = require("convex/browser");

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function seedData() {
  try {
    const typescriptTopic = await client.mutation("topics:createTopic", {
      name: "typescript",
      displayName: "TypeScript",
      description: "A strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.",
      icon: "🔷"
    });

    const reactTopic = await client.mutation("topics:createTopic", {
      name: "react",
      displayName: "React", 
      description: "A JavaScript library for building user interfaces with component-based architecture.",
      icon: "⚛️"
    });

    const nextjsTopic = await client.mutation("topics:createTopic", {
      name: "nextjs",
      displayName: "Next.js",
      description: "The React framework for production with features like server-side rendering and static site generation.",
      icon: "▲"
    });

    console.log("Created topics:", { typescriptTopic, reactTopic, nextjsTopic });
  } catch (error) {
    console.error("Error seeding data:", error);
  }
}

seedData();
