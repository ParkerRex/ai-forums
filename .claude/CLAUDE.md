Do the following in this sequence after new work is complete:
1. Run npm run test
2. Run npm run lint after you run tests and then recursively loop until things fix
3. Run npx tsc --noEmit after lint passes to ensure type safety

When we work on features or bugs that involve our database, use the convex MCP to fetch information. 

The convex MCP includes: 

##### Convex Tools:
Deployments
Each app deployed to Convex corresponds to an project, which can have multiple deployments: a single production deployment, a development deployment per team member, and potentially many preview deployments. The `status` tool lets the model query which deployments it has access to and gives it a "deployment selector" it can pass to subsequent tool calls:

#### Tables
The model can list all of a deployments tables with the `tables` tool. In addition to listing the table's names, this tool returns each table's declared schema (if present) and its inferred schema. Convex automatically tracks the shape of data in your deployment, even if you haven't declared a schema yet, and agents can use this to suggest improvements to your schema. This can be useful for filling out v.any() types in your schema or finding unused optional fields. Once it has listed table metadata, the agent can use the `data` tool to paginate through a table's documents.

One of our principles for effective autonomous coding is to express as much as possible in code. So, the `runOneoffQuery` tool lets the model just write code for querying a deployment's data. This code is fully sandboxed and can't modify the database, so it can't do any harm! Here's an example of it writing a one-off query to find the most frequently occurring word in my chat app's messages

#### Functions
The `functionSpec` tool similarly lets the model see all of the functions deployed along with their types and visibility. Even though the agent could figure this out by reading through all of the code in the convex/ directory, it's a lot more efficient to get the API in a single tool call.

Just like with tables, after reading functions' metadata, the agent can use the `run` tool to actually run them. In this example, I ask the agent to demonstrate running an internal query, and it intelligently looks at the function's interface, realizes it needs a conversation ID to pass in, and then uses the `data` tool to pick an example before proceeding.

#### Environment variables
These aren't as exciting, but the `envList`, `envGet`, `envSet`, and `envRemove` tools let the agent manipulate a deployment's environment variables.
