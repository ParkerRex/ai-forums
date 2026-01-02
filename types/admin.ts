// Member type for admin
export interface Member {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  slug: string;
  avatarUrl?: string | null;
  bio?: string | null;
  tier?: "founding_member" | "early_bird" | "member" | null;
  role?: "admin" | "user" | "member" | null;
  status: "active" | "churned";
  postCount?: number;
  commentCount?: number;
  netVoteCount?: number;
  joinedDate?: number | string | null;
  lastOnline?: number | string | null;
  location?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Extended member type for admin list views with additional fields
export interface MemberWithStatus extends Member {
  _id: string;
  billingInterval?: "monthly" | "yearly" | null;
  subscriptionEndDate?: number | string | null;
}

// Activity item types
export type ActivityPost = {
  id?: string;
  _id?: string;
  title: string;
  slug?: string;
  createdAt: string | number;
};

export type ActivityComment = {
  id?: string;
  _id?: string;
  content: string;
  createdAt: string | number;
};

// Member details response
export type MemberDetailsResponse = {
  member: Member;
  status: "active" | "churned";
  activity: {
    posts: ActivityPost[];
    comments: ActivityComment[];
    postCount: number;
    commentCount: number;
  };
};

// Membership stats
export type MembershipStats = {
  totalMembers: number;
  tierStats: {
    founding_member: number;
    early_bird: number;
    member: number;
  };
  statusStats: {
    active: number;
    churned: number;
  };
};
