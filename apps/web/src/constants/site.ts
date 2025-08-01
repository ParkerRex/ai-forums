export const SITE_URL = "https://joinvai.com"

export const SITE_INFO = {
  title: "VAI",
  description:
    "A place for AI engineers to learn and share",
  url: SITE_URL,
  openGraphImage: "/open-graph/default.jpg",
  twitterImage: "/open-graph/default.jpg",
  favicon: "/favicon.ico",
};

export const EXTERNAL_TOOLS = [
  {
    name: "Marble",
    description:
      "Modern headless CMS for content management and the blog for VAI",
    url: "https://marblecms.com?utm_source=joinvai",
    icon: "MarbleIcon" as const,
  },
  {
    name: "Vercel",
    description: "Platform where we deploy and host VAI",
    url: "https://vercel.com?utm_source=vai",
    icon: "VercelIcon" as const,
  },
  {
    name: "Databuddy",
    description: "GDPR compliant analytics and user insights for VAI",
    url: "https://databuddy.cc?utm_source=joinvai",
    icon: "DataBuddyIcon" as const,
  },
];
