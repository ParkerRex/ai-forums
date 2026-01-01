import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const previewSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

/**
 * Generate a preview snippet from post content.
 * This creates a short summary suitable for displaying in post lists.
 */
function generatePreview(_title: string, content: string): string {
  // Strip HTML tags and get plain text
  const plainText = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Get first 2-3 sentences, max 300 characters
  const sentences = plainText.split(/[.!?]+/).filter((s) => s.trim());
  let preview = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (preview.length + trimmed.length + 2 <= 300) {
      preview += (preview ? ". " : "") + trimmed;
    } else if (!preview) {
      // If even the first sentence is too long, truncate it
      preview = `${trimmed.substring(0, 297)}...`;
      break;
    } else {
      break;
    }
  }

  // Add period if missing
  if (preview && !preview.endsWith(".") && !preview.endsWith("...")) {
    preview += ".";
  }

  return preview;
}

// POST /api/post-preview - Generate post preview text
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = previewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const preview = generatePreview(parsed.data.title, parsed.data.content);

    return NextResponse.json({ preview });
  } catch (error) {
    console.error("Post preview generation error:", error);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}
