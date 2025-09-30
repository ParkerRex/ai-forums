/**
 * Common technical skills for member profiles
 * Sorted by popularity/usage frequency
 */
export const COMMON_SKILLS = [
  // Programming Languages (most popular first)
  "typescript",
  "javascript",
  "python",
  "react",
  "node.js",
  "java",
  "go",
  "rust",
  "php",
  "c++",
  "c#",
  "swift",
  "kotlin",

  // Frontend Frameworks & Libraries
  "next.js",
  "vue.js",
  "angular",
  "svelte",
  "nuxt.js",
  "gatsby",
  "remix",

  // UI Libraries & Design Systems
  "shadcn/ui",
  "tailwind css",
  "material-ui",
  "chakra ui",
  "ant design",
  "bootstrap",
  "styled-components",

  // Backend Frameworks
  "fastapi",
  "express.js",
  "django",
  "flask",
  "spring boot",
  "laravel",
  "rails",
  "nest.js",
  "koa.js",

  // Build Tools & Bundlers
  "vite",
  "webpack",
  "rollup",
  "parcel",
  "esbuild",
  "turbo",

  // Databases
  "postgresql",
  "mysql",
  "mongodb",
  "redis",
  "sqlite",
  "prisma",
  "supabase",
  "firebase",

  // Cloud & DevOps
  "aws",
  "vercel",
  "netlify",
  "docker",
  "kubernetes",
  "terraform",
  "github actions",
  "azure",
  "gcp",

  // AI/ML
  "openai",
  "langchain",
  "hugging face",
  "pytorch",
  "tensorflow",
  "scikit-learn",
  "pandas",
  "numpy",

  // Mobile Development
  "react native",
  "flutter",
  "expo",
  "ios",
  "android",

  // Testing
  "jest",
  "cypress",
  "playwright",
  "vitest",
  "testing library",

  // Other Tools
  "git",
  "figma",
  "notion",
  "linear",
  "slack",
  "discord",
] as const;

/**
 * Normalize skills input - lowercase and deduplicate
 */
export function normalizeSkills(skills: string[]): string[] {
  const normalized = skills
    .map((skill) => skill.toLowerCase().trim())
    .filter((skill) => skill.length > 0);

  return Array.from(new Set(normalized));
}

/**
 * Filter common skills by search term
 */
export function filterSkillSuggestions(searchTerm: string, limit = 10): string[] {
  if (!searchTerm.trim()) return COMMON_SKILLS.slice(0, limit);

  const term = searchTerm.toLowerCase();
  return COMMON_SKILLS.filter((skill) => skill.includes(term)).slice(0, limit);
}
