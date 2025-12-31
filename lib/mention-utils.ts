export function extractMentions(content: string): string[] {
	const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
	const mentions: string[] = [];
	let match;

	while ((match = mentionRegex.exec(content)) !== null) {
		mentions.push(match[1]);
	}

	return mentions;
}

export function parseMentionsFromContent(
	content: string,
	memberSlugs: Record<string, string>,
): string[] {
	const mentionSlugs = extractMentions(content);
	const memberIds: string[] = [];

	for (const slug of mentionSlugs) {
		if (memberSlugs[slug]) {
			memberIds.push(memberSlugs[slug]);
		}
	}

	return memberIds;
}
