import Header from "@/components/header";
import MemberCard from "@/components/member-card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Mock member data - in a real app this would come from a database
const members = [
  {
    id: "1",
    firstName: "Alice",
    lastName: "Smith",
    email: "alice.smith@example.com",
    status: "active",
    joinedDate: "2023-01-15",
    country: "USA",
    updatedAt: "2024-06-20",
    bio: "Full-stack developer passionate about open source and AI. Building tools to make developers' lives easier.",
    lastOnline: "2 hours ago",
    linkGithub: "https://github.com/alicesmith",
    linkX: "https://x.com/alicesmithdev",
    linkYouTube: "https://youtube.com/alicesmithcodes",
    location: "San Francisco, CA",
  },
  {
    id: "2",
    firstName: "Bob",
    lastName: "Johnson",
    email: "bob.johnson@example.com",
    status: "active",
    joinedDate: "2022-11-01",
    country: "Canada",
    updatedAt: "2024-06-18",
    bio: "AI researcher focused on large language models and their applications in software development.",
    lastOnline: "Online now",
    linkGithub: "https://github.com/bobjohnson",
    linkX: "https://x.com/bobjohnsonai",
    location: "Toronto, ON",
  },
  {
    id: "3",
    firstName: "Carol",
    lastName: "Williams",
    email: "carol.williams@example.com",
    status: "free",
    joinedDate: "2024-03-10",
    country: "UK",
    updatedAt: "2024-06-21",
    bio: "Frontend developer exploring the intersection of UI/UX and AI. Loves building intuitive interfaces.",
    lastOnline: "Yesterday",
    linkGithub: "https://github.com/carolwilliams",
    linkYouTube: "https://youtube.com/carolcodesui",
    location: "London, UK",
  },
  {
    id: "4",
    firstName: "David",
    lastName: "Brown",
    email: "david.brown@example.com",
    status: "churned",
    joinedDate: "2023-05-20",
    country: "Australia",
    updatedAt: "2024-05-01",
    bio: "DevOps engineer specializing in cloud infrastructure and MLOps. Always learning new tools.",
    lastOnline: "1 month ago",
    linkX: "https://x.com/davidbrownops",
    location: "Sydney, AU",
  },
];

export default function MembersPage() {
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
