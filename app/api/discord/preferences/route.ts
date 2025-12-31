import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema/members";
import { eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";

/**
 * GET /api/discord/preferences
 * Get Discord preferences for the current user
 */
export async function GET() {
	try {
		const member = await getCurrentMember();
		if (!member) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const memberData = await db
			.select({
				newsPreferences: members.newsPreferences,
			})
			.from(members)
			.where(eq(members.id, member.id))
			.limit(1);

		if (!memberData[0]) {
			return NextResponse.json({ error: "Member not found" }, { status: 404 });
		}

		const prefs = memberData[0].newsPreferences as { discord?: { enabled: boolean; guildId?: string } } | null;

		return NextResponse.json({
			enabled: prefs?.discord?.enabled ?? false,
			guildId: prefs?.discord?.guildId ?? process.env.DISCORD_GUILD_ID ?? null,
		});
	} catch (error) {
		console.error("Error fetching discord preferences:", error);
		return NextResponse.json(
			{ error: "Failed to fetch preferences" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/discord/preferences
 * Update Discord preferences
 */
export async function POST(request: NextRequest) {
	try {
		const member = await getCurrentMember();
		if (!member) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const { enabled } = body;

		// Get current preferences
		const memberData = await db
			.select({
				newsPreferences: members.newsPreferences,
			})
			.from(members)
			.where(eq(members.id, member.id))
			.limit(1);

		const currentPrefs = (memberData[0]?.newsPreferences as { discord?: { enabled: boolean } } | null) || {};

		// Update discord preferences
		const newPrefs = {
			...currentPrefs,
			discord: {
				...currentPrefs.discord,
				enabled: Boolean(enabled),
				guildId: process.env.DISCORD_GUILD_ID,
			},
		};

		await db
			.update(members)
			.set({ newsPreferences: newPrefs })
			.where(eq(members.id, member.id));

		return NextResponse.json({ success: true, enabled: Boolean(enabled) });
	} catch (error) {
		console.error("Error updating discord preferences:", error);
		return NextResponse.json(
			{ error: "Failed to update preferences" },
			{ status: 500 },
		);
	}
}
