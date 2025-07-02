"use client";

import { useState, useRef, useEffect } from "react";
import { MediaItem } from "@/types";
import { Play, Pause, Video, Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";
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
      className="relative w-full h-full bg-background group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={media.url}
        className="w-full h-full object-contain"
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
            className="w-16 h-16 rounded-full bg-background/20 backdrop-blur-sm hover:bg-background/30"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 text-primary-foreground" />
            ) : (
              <Play className="h-8 w-8 text-primary-foreground fill-primary-foreground ml-1" />
            )}
          </Button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-between text-primary-foreground text-xs">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-primary-foreground hover:bg-background/20"
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
              <span className="bg-background/20 px-1.5 py-0.5 rounded text-xs">
                {media.resolution}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Video Info */}
      {!showControls && (
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 px-2 py-1 rounded">
          <Video className="h-3 w-3 text-primary-foreground" />
          <span className="text-xs text-primary-foreground">
            {media.format?.toUpperCase() || "VIDEO"}
          </span>
        </div>
      )}
    </div>
  );
}