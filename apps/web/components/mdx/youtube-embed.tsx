"use client";

import React from "react";

interface YouTubeEmbedProps {
  url: string;
  title?: string;
  aspectRatio?: "16:9" | "4:3" | "1:1";
}

export function YouTubeEmbed({
  url,
  title = "YouTube video",
  aspectRatio = "16:9",
}: YouTubeEmbedProps) {
  // Extract video ID from various YouTube URL formats
  const getVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*&v=([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  const videoId = getVideoId(url);

  if (!videoId) {
    return (
      <div className="my-8 rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
        Invalid YouTube URL: {url}
      </div>
    );
  }

  // Calculate padding based on aspect ratio
  const getPaddingBottom = () => {
    switch (aspectRatio) {
      case "4:3":
        return "75%";
      case "1:1":
        return "100%";
      default:
        return "56.25%"; // 16:9
    }
  };

  return (
    <div className="my-8">
      <div
        className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        style={{ paddingBottom: getPaddingBottom() }}
      >
        <iframe
          className="absolute left-0 top-0 h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}
