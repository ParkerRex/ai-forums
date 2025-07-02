"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ResourceSubmissionPageClientProps {
  params: Promise<{
    topic: string;
  }>;
}

export default function ResourceSubmissionPageClient({ params }: ResourceSubmissionPageClientProps) {
  const [topicName, setTopicName] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    url: "",
    type: "article",
    difficulty: "",
    isPaid: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlPreview, setUrlPreview] = useState<{
    title?: string;
    description?: string;
    image?: string;
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const router = useRouter();

  useEffect(() => {
    params.then(({ topic }) => {
      setTopicName(topic);
    });
  }, [params]);

  const topic = useQuery(api.topics.getTopicByName, topicName ? { name: topicName } : "skip");
  const createResource = useMutation(api.resources.createResource);

  const handleUrlChange = async (url: string) => {
    setFormData(prev => ({ ...prev, url }));
    
    if (url && isValidUrl(url)) {
      setIsLoadingPreview(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setUrlPreview({
          title: "Sample Title from URL",
          description: "Sample description extracted from the URL",
        });
        
        if (!formData.title) {
          setFormData(prev => ({ ...prev, title: "Sample Title from URL" }));
        }
      } catch (error) {
        console.error("Failed to fetch URL preview:", error);
      } finally {
        setIsLoadingPreview(false);
      }
    } else {
      setUrlPreview(null);
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topic) {
      toast.error("Topic not found");
      return;
    }

    if (!formData.title.trim() || !formData.description.trim() || !formData.url.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!isValidUrl(formData.url)) {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsSubmitting(true);
    
    try {
      await createResource({
        title: formData.title.trim(),
        description: formData.description.trim(),
        url: formData.url.trim(),
        topicId: topic._id,
        type: formData.type,
        difficulty: formData.difficulty || undefined,
        isPaid: formData.isPaid,
      });

      toast.success("Resource submitted successfully!");
      router.push(`/educate/${topicName}`);
    } catch (error) {
      console.error("Failed to create resource:", error);
      toast.error("Failed to submit resource. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!topicName) {
    return <div>Loading...</div>;
  }

  if (topic === undefined) {
    return <div>Loading topic...</div>;
  }

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

      <Card>
        <CardHeader>
          <CardTitle>Resource Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
              {isLoadingPreview && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading preview...
                </div>
              )}
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

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Resource title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what this resource covers and why it's valuable..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Resource Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
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

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPaid"
                checked={formData.isPaid}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, isPaid: checked === true }))
                }
              />
              <Label htmlFor="isPaid">This is a paid resource</Label>
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" asChild>
                <Link href={`/educate/${topicName}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
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
