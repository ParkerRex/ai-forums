"use client"
import PostList from '@/components/post-list'
import PostSidebar from '@/components/post-sidebar'
import React from 'react'

export default function Home() {
  return (
     <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <PostList />
          </div>
          <div className="lg:col-span-1">
            <PostSidebar/>
          </div>
        </div>
      </div>
  )
}
