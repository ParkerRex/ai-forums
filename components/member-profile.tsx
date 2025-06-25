import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Github, Twitter, Youtube, MapPin, CalendarDays, Globe, Mail, Clock } from "lucide-react"

interface Member {
  id: string
  firstName: string
  lastName: string
  email: string
  status: "active" | "churned" | "free"
  joinedDate: string
  country: string
  updatedAt: string
  bio: string
  lastOnline: string
  linkGithub?: string
  linkX?: string
  linkYouTube?: string
  location?: string
}

interface MemberProfileProps {
  member: Member
}

const statusColors = {
  active: "bg-green-100 text-green-800 border-green-300",
  churned: "bg-red-100 text-red-800 border-red-300",
  free: "bg-blue-100 text-blue-800 border-blue-300",
}

export default function MemberProfile({ member }: MemberProfileProps) {
  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
  const joinedDateFormatted = new Date(member.joinedDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8">
      <div className="flex flex-col md:flex-row items-start">
        <Avatar className="h-32 w-32 mr-8 mb-6 md:mb-0 flex-shrink-0">
          <AvatarImage
            src={`/placeholder.svg?width=128&height=128&query=${member.firstName}+${member.lastName}+profile+picture`}
          />
          <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {member.firstName} {member.lastName}
            </h1>
            <Badge variant="outline" className={`text-sm capitalize ${statusColors[member.status]}`}>
              {member.status}
            </Badge>
          </div>
          <p className="text-gray-600 mb-6">{member.bio}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-600 mb-6">
            <div className="flex items-center">
              <Mail className="w-4 h-4 mr-2 text-gray-400" />
              {member.email}
            </div>
            {member.location && (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                {member.location}
              </div>
            )}
            <div className="flex items-center">
              <CalendarDays className="w-4 h-4 mr-2 text-gray-400" />
              Joined: {joinedDateFormatted}
            </div>
            <div className="flex items-center">
              <Globe className="w-4 h-4 mr-2 text-gray-400" />
              {member.country}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-gray-400" />
              Last online: {member.lastOnline}
            </div>
            {/* Add more fields like "Role" or "Interests" if available */}
          </div>

          <div className="flex space-x-4">
            {member.linkGithub && (
              <a
                href={member.linkGithub}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-gray-500 hover:text-green-700 transition-colors"
              >
                <Github className="w-5 h-5 mr-1.5" /> GitHub
              </a>
            )}
            {member.linkX && (
              <a
                href={member.linkX}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-gray-500 hover:text-green-700 transition-colors"
              >
                <Twitter className="w-5 h-5 mr-1.5" /> X (Twitter)
              </a>
            )}
            {member.linkYouTube && (
              <a
                href={member.linkYouTube}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-gray-500 hover:text-green-700 transition-colors"
              >
                <Youtube className="w-5 h-5 mr-1.5" /> YouTube
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
