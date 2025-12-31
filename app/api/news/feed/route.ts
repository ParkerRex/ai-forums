import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { newsFeedCache } from "@/db/schema";
import { eq, gt } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import type { NewsFeedArticle, NewsFeedSource } from "@/db/schema/news-feed-cache";

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Default sources for the news feed
const DEFAULT_SOURCES: NewsFeedSource[] = [
	{
		type: "rss",
		name: "Hacker News",
		url: "https://news.ycombinator.com/rss",
	},
	{
		type: "rss",
		name: "TechCrunch",
		url: "https://techcrunch.com/feed/",
	},
];

async function fetchFromRSS(source: NewsFeedSource): Promise<NewsFeedArticle[]> {
	if (!source.url) return [];

	try {
		const response = await fetch(source.url, {
			next: { revalidate: 60 * 15 }, // Cache for 15 minutes
		});

		if (!response.ok) {
			console.error(`Failed to fetch RSS from ${source.name}: ${response.status}`);
			return [];
		}

		const text = await response.text();

		// Simple RSS parsing (production should use a proper RSS parser)
		const items: NewsFeedArticle[] = [];
		const itemRegex = /<item>([\s\S]*?)<\/item>/g;
		let match;

		while ((match = itemRegex.exec(text)) !== null && items.length < 10) {
			const itemContent = match[1];

			const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
			const linkMatch = itemContent.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/);
			const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
			const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);

			if (titleMatch && linkMatch) {
				items.push({
					title: titleMatch[1].trim(),
					url: linkMatch[1].trim(),
					summary: descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 300) : undefined,
					publishedDate: pubDateMatch ? pubDateMatch[1] : undefined,
					source: source.name,
				});
			}
		}

		return items;
	} catch (error) {
		console.error(`Error fetching RSS from ${source.name}:`, error);
		return [];
	}
}

async function fetchNewsArticles(sources: NewsFeedSource[]): Promise<NewsFeedArticle[]> {
	const allArticles: NewsFeedArticle[] = [];

	for (const source of sources) {
		if (source.type === "rss") {
			const articles = await fetchFromRSS(source);
			allArticles.push(...articles);
		}
		// Add other source types (github, discord) as needed
	}

	// Sort by published date (most recent first) and deduplicate by URL
	const seen = new Set<string>();
	const uniqueArticles = allArticles.filter((article) => {
		if (seen.has(article.url)) return false;
		seen.add(article.url);
		return true;
	});

	return uniqueArticles.slice(0, 50); // Limit to 50 articles
}

// GET /api/news/feed - Get aggregated news feed
export async function GET(request: NextRequest) {
	try {
		const member = await getCurrentMember();
		const cacheKey = member ? `user:${member.id}` : "global";

		// Check for cached data
		const cached = await db.query.newsFeedCache.findFirst({
			where: eq(newsFeedCache.cacheKey, cacheKey),
		});

		// Return cached data if still valid
		if (cached && cached.expiresAt > new Date()) {
			return NextResponse.json({
				articles: cached.articles || [],
				sources: cached.sources || [],
				cached: true,
				expiresAt: cached.expiresAt.toISOString(),
			});
		}

		// Fetch fresh data
		const sources = DEFAULT_SOURCES;
		const articles = await fetchNewsArticles(sources);

		// Store in cache
		const expiresAt = new Date(Date.now() + CACHE_DURATION_MS);

		if (cached) {
			await db
				.update(newsFeedCache)
				.set({
					articles,
					sources,
					expiresAt,
					createdAt: new Date(),
				})
				.where(eq(newsFeedCache.id, cached.id));
		} else {
			await db.insert(newsFeedCache).values({
				userId: member?.id || null,
				cacheKey,
				articles,
				sources,
				expiresAt,
			});
		}

		return NextResponse.json({
			articles,
			sources,
			cached: false,
			expiresAt: expiresAt.toISOString(),
		});
	} catch (error) {
		console.error("News feed error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch news feed" },
			{ status: 500 },
		);
	}
}

// POST /api/news/feed - Force refresh news feed
export async function POST(request: NextRequest) {
	try {
		const member = await getCurrentMember();
		const cacheKey = member ? `user:${member.id}` : "global";

		// Delete existing cache
		await db.delete(newsFeedCache).where(eq(newsFeedCache.cacheKey, cacheKey));

		// Fetch fresh data
		const sources = DEFAULT_SOURCES;
		const articles = await fetchNewsArticles(sources);

		// Store in cache
		const expiresAt = new Date(Date.now() + CACHE_DURATION_MS);

		await db.insert(newsFeedCache).values({
			userId: member?.id || null,
			cacheKey,
			articles,
			sources,
			expiresAt,
		});

		return NextResponse.json({
			articles,
			sources,
			cached: false,
			expiresAt: expiresAt.toISOString(),
		});
	} catch (error) {
		console.error("News feed refresh error:", error);
		return NextResponse.json(
			{ error: "Failed to refresh news feed" },
			{ status: 500 },
		);
	}
}
