"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Github, Twitter, Youtube, MapPin, CalendarDays, Globe, Linkedin } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Member {
  id: string
  firstName: string
  lastName: string
  status: "active" | "churned" | "free"
  joinedDate: string
  country: string
  bio: string
  linkGithub?: string
  linkX?: string
  linkYouTube?: string
  location?: string
  linkedinUrl?: string
  websiteUrl?: string
}

interface MemberCardProps {
  member: Member
}

// Updated status colors with dark mode support
const statusVariants = {
  active: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary",
  inactive: "bg-muted text-muted-foreground border-border",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
  churned: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  free: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
}

export default function MemberCard({ member }: MemberCardProps) {
  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
  // Use the pre-formatted date from server (member.joinedDate is already formatted)
  const joinedDateFormatted = member.joinedDate

  return (
    <Link href={`/members/${member.id}`} className="block group">
      <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow h-full flex flex-col">
        <div className="flex items-start mb-4">
          <Avatar className="h-16 w-16 mr-4">
            <AvatarImage
              src=""
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-card-foreground group-hover:text-primary transition-colors">
              {member.firstName} {member.lastName}
            </h2>
            <Badge variant="outline" className={`text-xs capitalize mt-1 ${statusVariants[member.status]}`}>
              {member.status}
            </Badge>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-grow">{member.bio}</p>

        <div className="text-xs text-muted-foreground space-y-2 mb-4">
          <div className="flex items-center">
            <CalendarDays className="w-3.5 h-3.5 mr-2" />
            Joined: {joinedDateFormatted}
          </div>
          {member.location && (
            <div className="flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-2" />
              {member.location}
            </div>
          )}
          <div className="flex items-center">
            <Globe className="w-3.5 h-3.5 mr-2" />
            {member.country}
          </div>
        </div>

        <div className="flex space-x-3 mt-auto pt-4 border-t border-gray-100">
          {member.linkGithub && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              <Github className="w-4 h-4" />
            </Button>
          )}
          {member.linkX && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              <Twitter className="w-4 h-4" />
            </Button>
          )}
          {member.linkYouTube && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              <Youtube className="w-4 h-4" />
            </Button>
          )}
          {member.linkedinUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              <Linkedin className="w-4 h-4" />
            </Button>
          )}
          {member.websiteUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
            >
              <Globe className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Link>
  )
}
