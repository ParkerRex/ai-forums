"use client";
import PostHeader from "../components/posts/post-header";
import PostList from "../components/posts/post-list";

import React, { useState, useEffect } from "react";

export default function Home() {
  return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <PostHeader sortBy={sortBy} onSortChange={setSortBy} />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <PostList sortBy={sortBy} />
          </div>
          <div className="lg:col-span-1">
      </div>
      )
}