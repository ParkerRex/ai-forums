import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const linkPreviewSchema = z.object({
	url: z.string().url(),
});

interface LinkPreviewResult {
	title?: string;
	description?: string;
	image?: string;
	siteName?: string;
}

async function fetchLinkPreview(url: string): Promise<LinkPreviewResult> {
	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; LinkPreviewBot/1.0)",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch URL: ${response.status}`);
		}

		const html = await response.text();

		// Parse meta tags
		const titleMatch = html.match(
			/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
		) ||
			html.match(
				/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
			) ||
			html.match(/<title[^>]*>([^<]+)<\/title>/i);

		const descriptionMatch = html.match(
			/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
		) ||
			html.match(
				/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
			) ||
			html.match(
				/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
			);

		const imageMatch = html.match(
			/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
		) ||
			html.match(
				/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
			);

		const siteNameMatch = html.match(
			/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
		) ||
			html.match(
				/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
			);

		return {
			title: titleMatch?.[1]?.trim(),
			description: descriptionMatch?.[1]?.trim(),
			image: imageMatch?.[1]?.trim(),
			siteName: siteNameMatch?.[1]?.trim(),
		};
	} catch (error) {
		console.error("Error fetching link preview:", error);
		return {};
	}
}

// POST /api/link-preview - Fetch link preview data
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parsed = linkPreviewSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid URL provided" },
				{ status: 400 },
			);
		}

		const preview = await fetchLinkPreview(parsed.data.url);

		return NextResponse.json(preview);
	} catch (error) {
		console.error("Link preview error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch link preview" },
			{ status: 500 },
		);
	}
}
