"use client";

import { useTheme } from "next-themes";
import * as React from "react";
import { cn } from "@/utils/cn";
import { LaptopMinimalCheckIcon } from "./icons/laptop-minimal-check";
import { MoonIcon } from "./icons/moon";
import { SunIcon } from "./icons/sun";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

export function ThemeToggleSwitch({ className }: { className?: string }) {
	const [mounted, setMounted] = React.useState(false);
	const { theme, setTheme } = useTheme();

	React.useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<div className={cn("bg-muted/50 h-9 rounded-md p-0.5", className)}>
				<div className="flex gap-0.5">
					<div className="h-8 w-7 rounded-none" />
					<div className="h-8 w-7 rounded-none" />
					<div className="h-8 w-7 rounded-none" />
				</div>
			</div>
		);
	}

	return (
		<ToggleGroup
			type="single"
			value={theme}
			onValueChange={(value) => {
				if (value) setTheme(value);
			}}
			className={cn("bg-muted/50 h-9 p-0.5", className)}
		>
			<ToggleGroupItem
				value="light"
				aria-label="Light theme"
				className="data-[state=on]:bg-background h-full w-7 p-0 data-[state=on]:shadow-sm"
			>
				<SunIcon size={12} />
			</ToggleGroupItem>
			<ToggleGroupItem
				value="system"
				aria-label="System theme"
				className="data-[state=on]:bg-background h-full w-7 p-0 data-[state=on]:shadow-sm"
			>
				<LaptopMinimalCheckIcon size={12} />
			</ToggleGroupItem>
			<ToggleGroupItem
				value="dark"
				aria-label="Dark theme"
				className="data-[state=on]:bg-background h-full w-7 p-0 data-[state=on]:shadow-sm"
			>
				<MoonIcon size={12} />
			</ToggleGroupItem>
		</ToggleGroup>
	);
}
