import { NextRequest, NextResponse } from "next/server";
import { generateUploadUrl, uploadFile } from "@/lib/storage";
import { getCurrentMember } from "@/lib/auth";

/**
 * POST /api/upload
 * Generate a presigned URL for client-side upload OR upload file directly
 */
export async function POST(request: NextRequest) {
	try {
		// Check authentication
		const member = await getCurrentMember();
		if (!member) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const contentType = request.headers.get("content-type") || "";

		// Handle multipart form data (direct upload)
		if (contentType.includes("multipart/form-data")) {
			const formData = await request.formData();
			const file = formData.get("file") as File;

			if (!file) {
				return NextResponse.json({ error: "No file provided" }, { status: 400 });
			}

			// Validate file type
			const allowedTypes = [
				"image/jpeg",
				"image/jpg",
				"image/png",
				"image/gif",
				"image/webp",
				"video/mp4",
				"video/webm",
				"video/quicktime",
				"application/pdf",
				"application/msword",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			];

			if (!allowedTypes.includes(file.type)) {
				return NextResponse.json(
					{ error: "File type not allowed" },
					{ status: 400 },
				);
			}

			// Validate file size (100MB max)
			const maxSize = 100 * 1024 * 1024;
			if (file.size > maxSize) {
				return NextResponse.json(
					{ error: "File too large. Maximum size is 100MB" },
					{ status: 400 },
				);
			}

			// Upload the file
			const buffer = Buffer.from(await file.arrayBuffer());
			const result = await uploadFile(buffer, file.type, file.name);

			return NextResponse.json({
				url: result.publicUrl,
				objectKey: result.objectKey,
			});
		}

		// Handle JSON request (generate presigned URL)
		const body = await request.json();
		const { contentType: fileContentType, fileName } = body;

		if (!fileContentType || !fileName) {
			return NextResponse.json(
				{ error: "contentType and fileName are required" },
				{ status: 400 },
			);
		}

		const result = await generateUploadUrl(fileContentType, fileName);

		return NextResponse.json({
			uploadUrl: result.uploadUrl,
			publicUrl: result.publicUrl,
			objectKey: result.objectKey,
		});
	} catch (error) {
		console.error("Upload error:", error);
		return NextResponse.json(
			{ error: "Failed to process upload" },
			{ status: 500 },
		);
	}
}
