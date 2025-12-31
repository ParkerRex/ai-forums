import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import type { RealtimeEvent } from "./events";

interface Client {
	ws: WebSocket;
	memberId: string | null;
	subscriptions: Set<string>;
	lastPing: number;
}

class RealtimeServer {
	private wss: WebSocketServer | null = null;
	private clients: Map<WebSocket, Client> = new Map();
	private channelSubscribers: Map<string, Set<WebSocket>> = new Map();
	private pingInterval: ReturnType<typeof setInterval> | null = null;

	start(port: number = 3001) {
		if (this.wss) {
			console.log("WebSocket server already running");
			return;
		}

		this.wss = new WebSocketServer({ port });

		this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
			this.handleConnection(ws, req);
		});

		this.wss.on("error", (error: Error) => {
			console.error("WebSocket server error:", error);
		});

		// Ping clients every 30 seconds to keep connections alive
		this.pingInterval = setInterval(() => {
			this.pingClients();
		}, 30000);

		console.log(`WebSocket server started on port ${port}`);
	}

	stop() {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}

		if (this.wss) {
			this.wss.close();
			this.wss = null;
		}

		this.clients.clear();
		this.channelSubscribers.clear();
		console.log("WebSocket server stopped");
	}

	private handleConnection(ws: WebSocket, req: IncomingMessage) {
		// Parse member ID from query string if provided
		const url = new URL(req.url || "", `http://${req.headers.host}`);
		const memberId = url.searchParams.get("memberId");

		const client: Client = {
			ws,
			memberId,
			subscriptions: new Set(),
			lastPing: Date.now(),
		};

		this.clients.set(ws, client);
		console.log(
			`Client connected: ${memberId || "anonymous"} (${this.clients.size} total)`,
		);

		ws.on("message", (data: Buffer) => {
			this.handleMessage(ws, data);
		});

		ws.on("close", () => {
			this.handleDisconnect(ws);
		});

		ws.on("error", (error: Error) => {
			console.error("WebSocket client error:", error);
			this.handleDisconnect(ws);
		});

		ws.on("pong", () => {
			const client = this.clients.get(ws);
			if (client) {
				client.lastPing = Date.now();
			}
		});

		// Send welcome message
		this.send(ws, {
			type: "connected",
			memberId,
			timestamp: Date.now(),
		});
	}

	private handleMessage(ws: WebSocket, data: Buffer) {
		const client = this.clients.get(ws);
		if (!client) return;

		try {
			const message = JSON.parse(data.toString());

			switch (message.type) {
				case "subscribe":
					this.subscribe(ws, message.channels);
					break;

				case "unsubscribe":
					this.unsubscribe(ws, message.channels);
					break;

				case "auth":
					// Update member ID after authentication
					client.memberId = message.memberId;
					console.log(`Client authenticated: ${message.memberId}`);
					break;

				default:
					console.log("Unknown message type:", message.type);
			}
		} catch (error) {
			console.error("Error parsing WebSocket message:", error);
		}
	}

	private handleDisconnect(ws: WebSocket) {
		const client = this.clients.get(ws);
		if (!client) return;

		// Remove from all channel subscriptions
		for (const channel of client.subscriptions) {
			const subscribers = this.channelSubscribers.get(channel);
			if (subscribers) {
				subscribers.delete(ws);
				if (subscribers.size === 0) {
					this.channelSubscribers.delete(channel);
				}
			}
		}

		this.clients.delete(ws);
		console.log(
			`Client disconnected: ${client.memberId || "anonymous"} (${this.clients.size} total)`,
		);
	}

	private subscribe(ws: WebSocket, channels: string | string[]) {
		const client = this.clients.get(ws);
		if (!client) return;

		const channelList = Array.isArray(channels) ? channels : [channels];

		for (const channel of channelList) {
			client.subscriptions.add(channel);

			if (!this.channelSubscribers.has(channel)) {
				this.channelSubscribers.set(channel, new Set());
			}
			this.channelSubscribers.get(channel)!.add(ws);
		}

		this.send(ws, {
			type: "subscribed",
			channels: channelList,
			timestamp: Date.now(),
		});
	}

	private unsubscribe(ws: WebSocket, channels: string | string[]) {
		const client = this.clients.get(ws);
		if (!client) return;

		const channelList = Array.isArray(channels) ? channels : [channels];

		for (const channel of channelList) {
			client.subscriptions.delete(channel);

			const subscribers = this.channelSubscribers.get(channel);
			if (subscribers) {
				subscribers.delete(ws);
				if (subscribers.size === 0) {
					this.channelSubscribers.delete(channel);
				}
			}
		}

		this.send(ws, {
			type: "unsubscribed",
			channels: channelList,
			timestamp: Date.now(),
		});
	}

	private pingClients() {
		const now = Date.now();
		const timeout = 60000; // 60 seconds

		for (const [ws, client] of this.clients) {
			if (now - client.lastPing > timeout) {
				// Client hasn't responded to ping, disconnect
				console.log(
					`Client timeout: ${client.memberId || "anonymous"}`,
				);
				ws.terminate();
				this.handleDisconnect(ws);
			} else if (ws.readyState === WebSocket.OPEN) {
				ws.ping();
			}
		}
	}

	private send(ws: WebSocket, data: unknown) {
		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(data));
		}
	}

	// Public method to publish events to channels
	publish(event: RealtimeEvent) {
		const subscribers = this.channelSubscribers.get(event.channel);
		if (!subscribers || subscribers.size === 0) return;

		const message = JSON.stringify(event);

		for (const ws of subscribers) {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(message);
			}
		}
	}

	// Publish to multiple channels at once
	publishToChannels(channels: string[], event: Omit<RealtimeEvent, "channel">) {
		for (const channel of channels) {
			this.publish({ ...event, channel } as RealtimeEvent);
		}
	}

	// Get connection stats
	getStats() {
		return {
			totalClients: this.clients.size,
			totalChannels: this.channelSubscribers.size,
			channels: Object.fromEntries(
				Array.from(this.channelSubscribers.entries()).map(
					([channel, subscribers]) => [channel, subscribers.size],
				),
			),
		};
	}
}

// Singleton instance
export const realtimeServer = new RealtimeServer();

// Helper function to publish from API routes
export function publishEvent(event: RealtimeEvent) {
	realtimeServer.publish(event);
}

export function publishToChannels(
	channels: string[],
	event: Omit<RealtimeEvent, "channel">,
) {
	realtimeServer.publishToChannels(channels, event);
}
