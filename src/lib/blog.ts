/**
 * Blog post utilities for static blog content
 */

import fs from "fs";
import matter from "gray-matter";
import path from "path";

export interface BlogPost {
	slug: string;
	title: string;
	date: string;
	excerpt?: string;
	content: string;
	author?: string;
	tags?: string[];
	[key: string]: any;
}

const postsDirectory = path.join(process.cwd(), "content/blog");

/**
 * Get all blog post slugs for static generation
 */
export function getAllPostSlugs(): string[] {
	// Check if the directory exists
	if (!fs.existsSync(postsDirectory)) {
		return [];
	}

	const fileNames = fs.readdirSync(postsDirectory);
	return fileNames
		.filter((fileName) => fileName.endsWith(".md") || fileName.endsWith(".mdx"))
		.map((fileName) => fileName.replace(/\.(md|mdx)$/, ""));
}

/**
 * Get a single blog post by slug
 */
export function getPostBySlug(slug: string): BlogPost | null {
	try {
		// Try both .md and .mdx extensions
		let fullPath = path.join(postsDirectory, `${slug}.mdx`);
		if (!fs.existsSync(fullPath)) {
			fullPath = path.join(postsDirectory, `${slug}.md`);
		}

		if (!fs.existsSync(fullPath)) {
			return null;
		}

		const fileContents = fs.readFileSync(fullPath, "utf8");
		const { data, content } = matter(fileContents);

		return {
			slug,
			content,
			title: data.title || slug,
			date: data.date || new Date().toISOString(),
			excerpt: data.excerpt,
			author: data.author,
			tags: data.tags,
			...data,
		};
	} catch (error) {
		console.error(`Error reading post ${slug}:`, error);
		return null;
	}
}

/**
 * Get all blog posts sorted by date
 */
export function getAllPosts(): BlogPost[] {
	const slugs = getAllPostSlugs();
	const posts = slugs
		.map((slug) => getPostBySlug(slug))
		.filter((post): post is BlogPost => post !== null)
		.sort((a, b) => {
			// Sort by date, newest first
			return new Date(b.date).getTime() - new Date(a.date).getTime();
		});

	return posts;
}
