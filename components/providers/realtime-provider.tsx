"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useRealtime } from "@/hooks/use-realtime";

interface RealtimeContextValue {
	connected: boolean;
	reconnecting: boolean;
	error: string | null;
	subscribe: (channels: string | string[]) => void;
	unsubscribe: (channels: string | string[]) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
	const realtime = useRealtime({
		// Subscribe to global channels by default
		channels: ["posts", "members"],
	});

	return (
		<RealtimeContext.Provider value={realtime}>
			{children}
		</RealtimeContext.Provider>
	);
}

export function useRealtimeContext() {
	const context = useContext(RealtimeContext);
	if (!context) {
		throw new Error(
			"useRealtimeContext must be used within a RealtimeProvider",
		);
	}
	return context;
}
