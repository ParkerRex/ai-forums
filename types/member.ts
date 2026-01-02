// Member-related type definitions

export type MemberStatus = "active" | "churned";
export type MemberTier = "founding_member" | "early_bird" | "member";
export type MemberRole = "user" | "admin";

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  location: string | null;
  skills: string[] | null;
  postCount: number;
  commentCount: number;
  netVoteCount: number;
  joinedDate: string;
  lastOnline: string | null;
  role: string;
  email?: string;
  status: MemberStatus;
  tier?: MemberTier;
  linkGithub?: string | null;
  linkX?: string | null;
  linkYouTube?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
}

export interface UpdateMemberInput {
  firstName?: string;
  lastName?: string;
  bio?: string;
  country?: string;
  location?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  linkGithub?: string;
  linkX?: string;
  linkYouTube?: string;
  skills?: string[];
  avatarUrl?: string;
}

export interface MemberPost {
  id: string;
  title: string;
  content: string;
  slug: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  commentCount: number;
  viewCount: number;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
    avatarUrl: string | null;
  };
  category?: {
    id: string;
    name: string;
    displayName: string;
    icon?: string | null;
  };
}

export interface MemberActivity {
  id: string;
  type: "comment";
  content: string;
  createdAt: string;
  timeAgo?: string;
  postId: string;
  post?: {
    title?: string;
    slug?: string;
    categoryName?: string;
  };
  netVotes: number;
}
