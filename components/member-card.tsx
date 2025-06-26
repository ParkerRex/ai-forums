"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Github, Twitter, Youtube, MapPin, CalendarDays, Globe } from "lucide-react"

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
}

interface MemberCardProps {
  member: Member
}

const statusColors = {
  active: "bg-green-100 text-green-800 border-green-300",
  churned: "bg-red-100 text-red-800 border-red-300",
  free: "bg-blue-100 text-blue-800 border-blue-300",
}

export default function MemberCard({ member }: MemberCardProps) {
  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
  // Use the pre-formatted date from server (member.joinedDate is already formatted)
  const joinedDateFormatted = member.joinedDate

  return (
    <Link href={`/members/${member.id}`} className="block group">
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow h-full flex flex-col">
        <div className="flex items-start mb-4">
          <Avatar className="h-16 w-16 mr-4">
            <AvatarImage
              src={`/placeholder.svg?width=64&height=64&query=${member.firstName}+${member.lastName}+avatar`}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
              {member.firstName} {member.lastName}
            </h2>
            <Badge variant="outline" className={`text-xs capitalize mt-1 ${statusColors[member.status]}`}>
              {member.status}
            </Badge>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-grow">{member.bio}</p>

        <div className="text-xs text-gray-500 space-y-2 mb-4">
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
            <a
              href={member.linkGithub}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-green-700"
              onClick={(e) => e.stopPropagation()}
            >
              <Github className="w-5 h-5" />
            </a>
          )}
          {member.linkX && (
            <a
              href={member.linkX}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-green-700"
              onClick={(e) => e.stopPropagation()}
            >
              <Twitter className="w-5 h-5" />
            </a>
          )}
          {member.linkYouTube && (
            <a
              href={member.linkYouTube}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-green-700"
              onClick={(e) => e.stopPropagation()}
            >
              <Youtube className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>
    </Link>
  )
}
