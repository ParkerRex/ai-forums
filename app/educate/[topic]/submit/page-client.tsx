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
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
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
    type: "article", // Default to article type
    difficulty: "", // Optional field
    isPaid: false, // Default to free resource
  });
  
  // UI state for form submission and loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // URL preview state (placeholder implementation)
  const [urlPreview, setUrlPreview] = useState<{
    title?: string;
    description?: string;
    image?: string;
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

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
   * Handles URL input changes and generates preview data
   * 
   * This function validates the URL format and attempts to fetch preview
   * information (currently a placeholder implementation). When a valid URL
   * is entered, it can auto-populate the title field if it's empty.
   * 
   * @param {string} url - The URL entered by the user
   */
  const handleUrlChange = async (url: string) => {
    setFormData((prev) => ({ ...prev, url }));

    if (url && isValidUrl(url)) {
      setIsLoadingPreview(true);
      try {
        // Placeholder for URL preview functionality
        // In production, this would fetch actual metadata from the URL
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setUrlPreview({
          title: "Sample Title from URL",
          description: "Sample description extracted from the URL",
        });

        // Auto-populate title if user hasn't entered one yet
        if (!formData.title) {
          setFormData((prev) => ({ ...prev, title: "Sample Title from URL" }));
        }
      } catch (error) {
        console.error("Failed to fetch URL preview:", error);
      } finally {
        setIsLoadingPreview(false);
      }
    } else {
      // Clear preview if URL is invalid or empty
      setUrlPreview(null);
    }
  };

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
        // Type assertions needed for Convex schema compatibility
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: formData.type as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        difficulty: (formData.difficulty || undefined) as any,
        isPaid: formData.isPaid,
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
    return <div>Loading topic...</div>;
  }

  // Error state when topic doesn't exist
  if (topic === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Topic Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The topic &quot;{topicName}&quot; could not be found.
              </p>
              <Button asChild>
                <Link href="/educate">
                  <ArrowLeft className="w-4 h-4 mr-2" />
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
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Page header with navigation and title */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/educate/${topicName}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {topic.displayName}
          </Link>
        </Button>

        <h1 className="text-2xl font-bold mb-2">
          Submit {topic.displayName} Resource
        </h1>
        <p className="text-muted-foreground">
          Share a valuable learning resource with the community
        </p>
      </div>

      {/* Main form card */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* URL field with preview functionality */}
            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/resource"
                value={formData.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                required
              />
              {/* Loading state for URL preview */}
              {isLoadingPreview && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading preview...
                </div>
              )}
              {/* URL preview card */}
              {urlPreview && (
                <div className="border rounded-lg p-3 bg-muted/50">
                  <div className="flex items-start space-x-3">
                    <ExternalLink className="w-4 h-4 mt-1 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{urlPreview.title}</p>
                      {urlPreview.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {urlPreview.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Title field */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
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
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what this resource covers and why it's valuable..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={4}
                required
              />
            </div>

            {/* Resource type and difficulty selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Resource Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="course">Course</SelectItem>
                    <SelectItem value="documentation">Documentation</SelectItem>
                    <SelectItem value="tool">Tool</SelectItem>
                    <SelectItem value="book">Book</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Optional difficulty level selector */}
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, difficulty: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payment status checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPaid"
                checked={formData.isPaid}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isPaid: checked === true }))
                }
              />
              <Label htmlFor="isPaid">This is a paid resource</Label>
            </div>

            {/* Form submission controls */}
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" asChild>
                <Link href={`/educate/${topicName}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  // Loading state with spinner during submission
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Resource"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
