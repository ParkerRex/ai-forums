"use client";

import React, { useState, useEffect } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Search } from "lucide-react";
import Image from "next/image";
import { GiphyFetch } from "@giphy/js-fetch-api";
import type { IGif } from "@giphy/js-types";

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
      const { data } = await gf.trending({ limit: 20, rating: "pg-13" });
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
      const { data } = await gf.search(searchTerm, {
        limit: 20,
        rating: "pg-13",
      });
      setGifs(data);
    } catch (error) {
      console.error("Failed to search GIFs:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background h-96 w-80 rounded-none border p-4">
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search GIFs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && searchGifs()}
        />
        <Button onClick={searchGifs} size="sm">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid h-80 grid-cols-2 gap-2 overflow-y-auto">
        {loading ? (
          <div className="col-span-2 flex items-center justify-center">
            Loading...
          </div>
        ) : (
          gifs.map((gif) => (
            <Image
              key={gif.id}
              src={gif.images.fixed_height_small.url}
              alt={gif.title}
              width={150}
              height={150}
              className="cursor-pointer rounded hover:opacity-80"
              onClick={() => onGifSelect(gif.images.original.url)}
            />
          ))
        )}
      </div>
    </div>
  );
}
