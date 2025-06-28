import { redirect } from "next/navigation";

export default async function PostPage() {
  // For now, redirect all old post URLs to home
  // This provides backwards compatibility while we transition
  redirect('/');
}
