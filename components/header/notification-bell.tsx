"use client";

import React from "react";
import { BellIcon } from "@/components/icons/bell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentMember } from "@/hooks/use-current-member";
import { useNotifications } from "@/hooks/use-notifications";

interface NotificationBellProps {
	onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
	const { member } = useCurrentMember();
	const bellIconRef = React.useRef<{
		startAnimation: () => void;
		stopAnimation: () => void;
	}>(null);

	const { data: notifications } = useNotifications({ limit: 10 });
	const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

	if (!member) return null;

	return (
		<Button
			variant="ghost"
			size="sm"
			className="relative px-2 text-muted-foreground hover:text-foreground"
			onClick={onClick}
			onMouseEnter={() => bellIconRef.current?.startAnimation()}
			onMouseLeave={() => bellIconRef.current?.stopAnimation()}
		>
			<BellIcon ref={bellIconRef} size={18} />
			{unreadCount > 0 && (
				<Badge
					variant="destructive"
					className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
				>
					{unreadCount > 99 ? "99+" : unreadCount}
				</Badge>
			)}
		</Button>
	);
}
