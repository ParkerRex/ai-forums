"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { GiphyFetch, IGif } from "@giphy/js-fetch-api";

const gf = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY || "");

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
}

export function GifPicker({ onGifSelect }: GifPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [gifs, setGifs] = useState<IGif[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTrendingGifs();
  }, []);

  const loadTrendingGifs = async () => {
    setLoading(true);
    try {
      const { data } = await gf.trending({ limit: 20, rating: 'pg-13' });
      setGifs(data);
    } catch (error) {
      console.error("Failed to load trending GIFs:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async () => {
    if (!searchTerm.trim()) {
      loadTrendingGifs();
      return;
    }

    setLoading(true);
    try {
      const { data } = await gf.search(searchTerm, { limit: 20, rating: 'pg-13' });
      setGifs(data);
    } catch (error) {
      console.error("Failed to search GIFs:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-80 h-96 border rounded-lg p-4 bg-background">
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search GIFs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchGifs()}
        />
        <Button onClick={searchGifs} size="sm">
          <Search className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2 h-80 overflow-y-auto">
        {loading ? (
          <div className="col-span-2 flex items-center justify-center">
            Loading...
          </div>
        ) : (
          gifs.map((gif) => (
            <img
              key={gif.id}
              src={gif.images.fixed_height_small.url}
              alt={gif.title}
              className="cursor-pointer rounded hover:opacity-80"
              onClick={() => onGifSelect(gif.images.original.url)}
            />
          ))
        )}
      </div>
    </div>
  );
}
