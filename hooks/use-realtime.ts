"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import type { RealtimeEvent, RealtimeEventType } from "@/lib/realtime/events";

interface UseRealtimeOptions {
	channels?: string[];
	onEvent?: (event: RealtimeEvent) => void;
	enabled?: boolean;
}

interface ConnectionState {
	connected: boolean;
	reconnecting: boolean;
	error: string | null;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function useRealtime(options: UseRealtimeOptions = {}) {
	const { channels = [], onEvent, enabled = true } = options;
	const { member } = useAuth();
	const queryClient = useQueryClient();
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const reconnectDelayRef = useRef(RECONNECT_DELAY);
	const subscribedChannelsRef = useRef<Set<string>>(new Set());

	const [connectionState, setConnectionState] = useState<ConnectionState>({
		connected: false,
		reconnecting: false,
		error: null,
	});

	const connect = useCallback(() => {
		if (wsRef.current?.readyState === WebSocket.OPEN) return;

		const url = member?.id ? `${WS_URL}?memberId=${member.id}` : WS_URL;
		const ws = new WebSocket(url);
		wsRef.current = ws;

		ws.onopen = () => {
			console.log("WebSocket connected");
			setConnectionState({
				connected: true,
				reconnecting: false,
				error: null,
			});
			reconnectDelayRef.current = RECONNECT_DELAY;

			// Subscribe to channels
			if (subscribedChannelsRef.current.size > 0) {
				ws.send(
					JSON.stringify({
						type: "subscribe",
						channels: Array.from(subscribedChannelsRef.current),
					}),
				);
			}
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as RealtimeEvent;

				// Handle built-in events
				if (data.type === ("connected" as RealtimeEventType)) {
					return;
				}

				if (data.type === ("subscribed" as RealtimeEventType)) {
					return;
				}

				// Invalidate relevant React Query caches based on event type
				invalidateQueriesForEvent(data);

				// Call custom event handler
				onEvent?.(data);
			} catch (error) {
				console.error("Error parsing WebSocket message:", error);
			}
		};

		ws.onclose = () => {
			console.log("WebSocket disconnected");
			setConnectionState((prev) => ({
				...prev,
				connected: false,
			}));
			wsRef.current = null;

			// Reconnect with exponential backoff
			if (enabled) {
				setConnectionState((prev) => ({
					...prev,
					reconnecting: true,
				}));

				reconnectTimeoutRef.current = setTimeout(() => {
					reconnectDelayRef.current = Math.min(
						reconnectDelayRef.current * 2,
						MAX_RECONNECT_DELAY,
					);
					connect();
				}, reconnectDelayRef.current);
			}
		};

		ws.onerror = (error) => {
			console.error("WebSocket error:", error);
			setConnectionState((prev) => ({
				...prev,
				error: "Connection error",
			}));
		};
	}, [member?.id, enabled, onEvent]);

	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}

		setConnectionState({
			connected: false,
			reconnecting: false,
			error: null,
		});
	}, []);

	const subscribe = useCallback((newChannels: string | string[]) => {
		const channelList = Array.isArray(newChannels)
			? newChannels
			: [newChannels];

		for (const channel of channelList) {
			subscribedChannelsRef.current.add(channel);
		}

		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(
				JSON.stringify({
					type: "subscribe",
					channels: channelList,
				}),
			);
		}
	}, []);

	const unsubscribe = useCallback((channelsToRemove: string | string[]) => {
		const channelList = Array.isArray(channelsToRemove)
			? channelsToRemove
			: [channelsToRemove];

		for (const channel of channelList) {
			subscribedChannelsRef.current.delete(channel);
		}

		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(
				JSON.stringify({
					type: "unsubscribe",
					channels: channelList,
				}),
			);
		}
	}, []);

	// Invalidate queries based on event type
	const invalidateQueriesForEvent = (event: RealtimeEvent) => {
		switch (event.type) {
			case "post:created":
			case "post:updated":
			case "post:deleted":
			case "post:voted":
				queryClient.invalidateQueries({ queryKey: ["posts"] });
				if (event.payload && typeof event.payload === "object") {
					const payload = event.payload as { postId?: string };
					if (payload.postId) {
						queryClient.invalidateQueries({
							queryKey: ["posts", payload.postId],
						});
					}
				}
				break;

			case "comment:created":
			case "comment:updated":
			case "comment:deleted":
			case "comment:voted":
				if (event.payload && typeof event.payload === "object") {
					const payload = event.payload as { postId?: string };
					if (payload.postId) {
						queryClient.invalidateQueries({
							queryKey: ["comments", payload.postId],
						});
					}
				}
				break;

			case "notification:created":
				queryClient.invalidateQueries({ queryKey: ["notifications"] });
				break;

			case "member:updated":
				queryClient.invalidateQueries({ queryKey: ["members"] });
				if (event.payload && typeof event.payload === "object") {
					const payload = event.payload as { memberId?: string };
					if (payload.memberId) {
						queryClient.invalidateQueries({
							queryKey: ["members", payload.memberId],
						});
					}
				}
				break;
		}
	};

	// Connect on mount, disconnect on unmount
	useEffect(() => {
		if (enabled) {
			connect();
		}

		return () => {
			disconnect();
		};
	}, [enabled, connect, disconnect]);

	// Update subscriptions when channels prop changes
	useEffect(() => {
		const currentChannels = subscribedChannelsRef.current;
		const newChannels = new Set(channels);

		// Subscribe to new channels
		const toSubscribe = channels.filter((c) => !currentChannels.has(c));
		if (toSubscribe.length > 0) {
			subscribe(toSubscribe);
		}

		// Unsubscribe from removed channels
		const toUnsubscribe = Array.from(currentChannels).filter(
			(c) => !newChannels.has(c),
		);
		if (toUnsubscribe.length > 0) {
			unsubscribe(toUnsubscribe);
		}
	}, [channels, subscribe, unsubscribe]);

	return {
		...connectionState,
		subscribe,
		unsubscribe,
		disconnect,
		reconnect: connect,
	};
}

// Convenience hook for subscribing to post updates
export function usePostRealtime(postId: string) {
	return useRealtime({
		channels: [`posts:${postId}`],
	});
}

// Convenience hook for subscribing to notifications
export function useNotificationRealtime() {
	const { member } = useAuth();

	return useRealtime({
		channels: member ? [`notifications:${member.id}`] : [],
		enabled: !!member,
	});
}

// Convenience hook for global feed updates
export function useFeedRealtime() {
	return useRealtime({
		channels: ["posts"],
	});
}
