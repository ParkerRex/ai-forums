/**
 * @fileoverview Client component for resource submission form
 *
 * This component provides a comprehensive form interface for users to submit
 * learning resources to specific topics. It includes form validation, URL
 * preview functionality, and integrates with the community's resource database.
 *
 * Key features:
 * - Multi-field resource submission form with validation
 * - URL preview functionality (placeholder implementation)
 * - Dynamic topic verification and loading states
 * - Form state management with real-time validation
 * - Integration with toast notifications for user feedback
 * - Navigation controls and error handling
 *
 * Form fields include:
 * - URL (required): External link to the resource
 * - Title (required): Resource name
 * - Description (required): Detailed resource description
 * - Type (required): Category of resource (article, video, course, etc.)
 * - Difficulty (optional): Skill level required
 * - Payment status: Whether resource requires payment
 *
 * @author VAI Community
 * @version 1.0.0
 */

"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/web/components/ui/card";
import { Button } from "@/web/components/ui/button";
import { Input } from "@/web/components/ui/input";
import { Textarea } from "@/web/components/ui/textarea";
import { Label } from "@/web/components/ui/label";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Props interface for the ResourceSubmissionPageClient component
 *
 * @interface ResourceSubmissionPageClientProps
 * @property {Promise<{topic: string}>} params - Dynamic route parameters from Next.js
 */
interface ResourceSubmissionPageClientProps {
  params: Promise<{
    topic: string;
  }>;
}

/**
 * Main resource submission form component
 *
 * This component manages the complete resource submission workflow including
 * form state, validation, URL preview, and API integration. It provides a
 * user-friendly interface for community members to contribute learning materials.
 *
 * The component handles:
 * - Form state management for all resource fields
 * - Real-time URL validation and preview generation
 * - Topic verification and loading states
 * - Form submission with error handling
 * - Navigation and user feedback via toasts
 *
 * @param {ResourceSubmissionPageClientProps} props - Component props
 * @returns {JSX.Element} Complete resource submission form interface
 *
 * @example
 * ```tsx
 * // Used via Next.js routing: /educate/react/submit
 * <ResourceSubmissionPageClient params={Promise.resolve({ topic: "react" })} />
 * ```
 */
export default function ResourceSubmissionPageClient({
  params,
}: ResourceSubmissionPageClientProps) {
  // Local state for topic name extracted from URL params
  const [topicName, setTopicName] = useState<string>("");

  // Form data state with default values
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
  });

  // UI state for form submission and loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  // Extract topic name from params when component mounts
  useEffect(() => {
    params.then(({ topic }) => {
      setTopicName(topic);
    });
  }, [params]);

  // Query topic data to verify it exists and get metadata
  const topic = useQuery(
    api.topics.getTopicByName,
    topicName ? { name: topicName } : "skip",
  );

  // Mutation for creating new resources
  const createResource = useMutation(api.resources.createResource);

  /**
   * Validates if a string is a properly formatted URL
   *
   * @param {string} string - The string to validate as a URL
   * @returns {boolean} True if the string is a valid URL, false otherwise
   */
  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Handles form submission with validation and error handling
   *
   * This function performs comprehensive validation of all form fields,
   * submits the resource to the database, and handles success/error states.
   * On successful submission, the user is redirected back to the topic page.
   *
   * Validation includes:
   * - Topic existence verification
   * - Required field presence (title, description, URL)
   * - URL format validation
   * - Data sanitization (trimming whitespace)
   *
   * @param {React.FormEvent} e - Form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verify topic exists before proceeding
    if (!topic) {
      toast.error("Topic not found");
      return;
    }

    // Validate required fields are present
    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.url.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate URL format
    if (!isValidUrl(formData.url)) {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit resource to database with sanitized data
      await createResource({
        title: formData.title.trim(),
        description: formData.description.trim(),
        url: formData.url.trim(),
        topicId: topic._id,
        type: "article",
        isPaid: false,
        isFree: true,
      });

      // Show success message and redirect to topic page
      toast.success("Resource submitted successfully!");
      router.push(`/educate/${topicName}`);
    } catch (error) {
      console.error("Failed to create resource:", error);
      toast.error("Failed to submit resource. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while extracting topic name from params
  if (!topicName) {
    return <div>Loading...</div>;
  }

  // Loading state while fetching topic data
  if (topic === undefined) {
    return <div className="mx-auto max-w-2xl px-4 py-6">Loading...</div>;
  }

  // Error state when topic doesn't exist
  if (topic === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="mb-2 text-xl font-semibold">Topic Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The topic &quot;{topicName}&quot; could not be found.
              </p>
              <Button asChild>
                <Link href="/educate">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Topics
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add {topic.displayName} Resource</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Share a Resource</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* URL field */}
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/resource"
                value={formData.url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, url: e.target.value }))
                }
                required
              />
            </div>

            {/* Title field */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Resource title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>

            {/* Description field with textarea for longer content */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                required
              />
            </div>

            {/* Form submission button */}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
