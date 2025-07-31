"use client";

import { useState, useRef, useEffect } from "react";
import { MediaItem } from "@/types";
import { Play, Pause, Video, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/web/components/ui/button";
import { formatDuration } from "@/lib/utils";

interface VideoPreviewProps {
  media: MediaItem;
}

export function VideoPreview({ media }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div
      className="bg-background group relative h-full w-full"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={media.url}
        className="h-full w-full object-contain"
        muted={isMuted}
        loop
        playsInline
      />

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Play/Pause Button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="bg-background/20 hover:bg-background/30 h-16 w-16 rounded-full backdrop-blur-sm"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="text-primary-foreground h-8 w-8" />
            ) : (
              <Play className="text-primary-foreground fill-primary-foreground ml-1 h-8 w-8" />
            )}
          </Button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <div className="text-primary-foreground flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-primary-foreground hover:bg-background/20 h-6 w-6"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>
              {duration && (
                <span>
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              )}
            </div>
            {media.resolution && (
              <span className="bg-background/20 rounded px-1.5 py-0.5 text-xs">
                {media.resolution}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Video Info */}
      {!showControls && (
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/50 px-2 py-1">
          <Video className="text-primary-foreground h-3 w-3" />
          <span className="text-primary-foreground text-xs">
            {media.format?.toUpperCase() || "VIDEO"}
          </span>
        </div>
      )}
    </div>
  );
}
