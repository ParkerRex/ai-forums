import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, TrendingUp } from "lucide-react"

const trendingPosts = [
  { name: "programming", members: "2.1M", description: "General programming discussions" },
  { name: "webdev", members: "890K", description: "Web development and design" },
  { name: "typescript", members: "456K", description: "TypeScript language discussions" },
  { name: "devops", members: "234K", description: "DevOps practices and tools" },
  { name: "architecture", members: "178K", description: "Software architecture patterns" },
]

export default function PostSidebar() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full bg-green-700 hover:bg-green-800">
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
          <p className="text-xs text-gray-500">Share your thoughts, questions, or projects with the dev community</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Trending Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trendingPosts.map((community, index) => (
              <div key={community.name} className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 w-6">{index + 1}</span>
                    <Link href={`/ai/${community.name}`} className="text-green-700 hover:underline font-medium">
                      /ai/{community.name}
                    </Link>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">{community.description}</p>
                  <p className="text-xs text-gray-400 ml-6">{community.members} members</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About VAI</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 leading-relaxed">
            A minimal, developer-focused community platform for sharing conversations, insights, and building
            connections in the tech world.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
