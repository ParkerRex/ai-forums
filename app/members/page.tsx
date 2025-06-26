"use client";

import MemberCard from "@/components/member-card";
import { MemberCardSkeletonGrid } from "@/components/member-skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function MembersPage() {
  const membersData = useQuery(api.members.getAllMembers);

  // Transform server data to match MemberCard interface (minimal transformation now)
  const members =
    membersData?.map((member) => ({
      id: member._id, // Convert _id to id for MemberCard
      firstName: member.firstName,
      lastName: member.lastName,
      status: member.status,
      joinedDate: member.joinedDateFormatted, // Use server-formatted date
      country: member.country,
      bio: member.bio,
      linkGithub: member.linkGithub,
      linkX: member.linkX,
      linkYouTube: member.linkYouTube,
      location: member.location,
    })) || [];

  if (membersData === undefined) {
    return (
      <div className="font-mono min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Members Directory
            </h1>
            <p className="text-gray-600">
              Discover and connect with developers in the VAI community.
            </p>
          </div>

          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search members by name, skill, or location..."
                className="pl-12 py-3 text-md border-gray-300 focus:border-green-700 focus:ring-green-700"
                disabled
              />
            </div>
          </div>

          <MemberCardSkeletonGrid count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="font-mono min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Members Directory
          </h1>
          <p className="text-gray-600">
            Discover and connect with developers in the VAI community.
          </p>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search members by name, skill, or location..."
              className="pl-12 py-3 text-md border-gray-300 focus:border-green-700 focus:ring-green-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      </div>
    </div>
  );
}
