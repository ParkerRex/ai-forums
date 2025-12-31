import { realtimeServer } from "../lib/realtime";

const PORT = Number.parseInt(process.env.WS_PORT || "3001", 10);

console.log("Starting WebSocket real-time server...");

realtimeServer.start(PORT);

// Handle graceful shutdown
process.on("SIGINT", () => {
	console.log("\nShutting down WebSocket server...");
	realtimeServer.stop();
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.log("\nShutting down WebSocket server...");
	realtimeServer.stop();
	process.exit(0);
});

// Keep the process alive
process.stdin.resume();
