/**
 * @fileoverview Event Creation and Editing Modal Component
 *
 * This component provides a comprehensive interface for creating new events
 * and editing existing ones. It handles all aspects of event management
 * including form validation, data persistence, and user feedback.
 *
 * Key Features:
 * - Dual-mode operation (create/edit) with shared form logic
 * - Comprehensive form validation with user feedback
 * - Real-time event data loading and updating via Convex
 * - Support for all event types and configurations
 * - Timezone handling for proper date/time management
 * - RSVP and attendance limit management
 * - Location handling for both virtual and physical events
 * - Delete functionality for existing events
 * - Responsive design with proper accessibility
 *
 * Form Fields:
 * - Basic Info: title, description, start/end times
 * - Event Type: community_call, watch_party, workshop, meetup, other
 * - Location: virtual/physical with platform details
 * - RSVP Settings: required/optional, max attendees
 * - Additional: stream URL, resources (future)
 *
 * Data Flow:
 * 1. Component receives either eventId (edit mode) or selectedDate (create mode)
 * 2. Form data is populated from existing event or defaults
 * 3. User interactions update local form state
 * 4. Form submission validates and calls appropriate Convex mutation
 * 5. Success/error feedback is provided via toast notifications
 *
 * @author VAI Team
 * @version 1.0.0
 * @since 2024
 */

"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Props interface for the EventModal component
 *
 * @interface EventModalProps
 * @property {boolean} isOpen - Controls modal visibility
 * @property {function} onClose - Callback fired when modal should close
 * @property {string} eventId - ID of event to edit (optional, for edit mode)
 * @property {Date} selectedDate - Pre-selected date for new events (optional)
 */
interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
  selectedDate?: Date;
}

/**
 * Event modal component for creating and editing calendar events
 *
 * This component provides a comprehensive form interface for event management.
 * It automatically detects whether it's being used for creating a new event
 * or editing an existing one based on the presence of an eventId prop.
 *
 * @param {EventModalProps} props - Component props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {function} props.onClose - Callback fired when modal should close
 * @param {string} props.eventId - Event ID for edit mode (optional)
 * @param {Date} props.selectedDate - Pre-selected date for new events (optional)
 * @returns {JSX.Element} The event creation/editing modal
 *
 * @example
 * ```tsx
 * // Create new event modal
 * <EventModal
 *   isOpen={isCreateModalOpen}
 *   onClose={() => setIsCreateModalOpen(false)}
 *   selectedDate={selectedDate}
 * />
 *
 * // Edit existing event modal
 * <EventModal
 *   isOpen={isEditModalOpen}
 *   onClose={() => setIsEditModalOpen(false)}
 *   eventId={selectedEventId}
 * />
 * ```
 */
export function EventModal({ isOpen, onClose, eventId, selectedDate }: EventModalProps) {
  // Form state management
  // All form fields are stored in a single state object for easier management
  const [formData, setFormData] = useState({
    title: "", // Event title (required)
    description: "", // Event description (optional)
    startTime: "", // Start time in datetime-local format
    endTime: "", // End time in datetime-local format
    type: "other" as "community_call" | "watch_party" | "workshop" | "meetup" | "other",
    locationType: "virtual" as "virtual" | "physical", // Location type
    locationDetails: "", // Meeting link or physical address
    platform: "", // Platform for virtual events (optional)
    maxAttendees: "", // Maximum attendees (optional)
    requiresRSVP: false, // Whether RSVP is required
    streamUrl: "", // Live stream URL (optional)
  });

  // Loading state for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convex queries and mutations
  // Query to fetch existing event data (only runs in edit mode)
  const event = useQuery(
    api.events.getEventById,
    eventId ? { eventId: eventId as Id<"events"> } : "skip",
  );

  // Mutation hooks for event operations
  const createEvent = useMutation(api.events.createEvent);
  const updateEvent = useMutation(api.events.updateEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);

  // Determine if we're in edit mode based on eventId presence
  const isEditing = !!eventId;

  /**
   * Effect to populate form data when event data is loaded or selectedDate changes
   *
   * This effect handles two scenarios:
   * 1. Edit mode: Populate form with existing event data
   * 2. Create mode: Set default start/end times based on selected date
   */
  useEffect(() => {
    if (event) {
      // Edit mode: populate form with existing event data
      const startDate = new Date(event.startTime);
      const endDate = new Date(event.endTime);

      setFormData({
        title: event.title,
        description: event.description,
        // Convert timestamps to datetime-local format for HTML inputs
        startTime: format(startDate, "yyyy-MM-dd'T'HH:mm"),
        endTime: format(endDate, "yyyy-MM-dd'T'HH:mm"),
        type: event.type,
        locationType: event.location.type,
        locationDetails: event.location.details,
        platform: event.location.platform || "",
        maxAttendees: event.maxAttendees?.toString() || "",
        requiresRSVP: event.requiresRSVP,
        streamUrl: event.streamUrl || "",
      });
    } else if (selectedDate) {
      // Create mode: set default times based on selected date
      const defaultStart = new Date(selectedDate);
      defaultStart.setHours(12, 0, 0, 0); // Default to 12:00 PM
      const defaultEnd = new Date(defaultStart);
      defaultEnd.setHours(13, 0, 0, 0); // Default to 1-hour duration

      setFormData((prev) => ({
        ...prev,
        startTime: format(defaultStart, "yyyy-MM-dd'T'HH:mm"),
        endTime: format(defaultEnd, "yyyy-MM-dd'T'HH:mm"),
      }));
    }
  }, [event, selectedDate]);

  /**
   * Handles form submission for both create and edit operations
   *
   * This function performs comprehensive validation, data transformation,
   * and error handling for event creation and updates. It ensures data
   * integrity and provides appropriate user feedback.
   *
   * @param {React.FormEvent} e - Form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Form validation
    // Check for required fields
    if (!formData.title.trim() || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Convert datetime-local strings to timestamps
    const startTime = new Date(formData.startTime).getTime();
    const endTime = new Date(formData.endTime).getTime();

    // Validate time logic
    if (endTime <= startTime) {
      toast.error("End time must be after start time");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare event data object with proper type conversions
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startTime,
        endTime,
        // Include user's timezone for proper display across different locations
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        type: formData.type,
        location: {
          type: formData.locationType,
          details: formData.locationDetails.trim(),
          // Only include platform if specified
          platform: formData.platform
            ? (formData.platform as "zoom" | "discord" | "youtube" | "other")
            : undefined,
        },
        // Convert string to number, or leave undefined
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees, 10) : undefined,
        requiresRSVP: formData.requiresRSVP,
        // Only include streamUrl if provided
        streamUrl: formData.streamUrl || undefined,
        // Future feature: event resources/attachments
        resources: [],
      };

      // Execute appropriate mutation based on mode
      if (isEditing && eventId) {
        // Update existing event
        await updateEvent({
          eventId: eventId as Id<"events">,
          ...eventData,
        });
        toast.success("Event updated successfully!");
      } else {
        // Create new event
        await createEvent(eventData);
        toast.success("Event created successfully!");
      }

      // Close modal on success
      onClose();
    } catch (error) {
      // Log error for debugging and show user-friendly message
      console.error("Failed to save event:", error);
      toast.error("Failed to save event. Please try again.");
    } finally {
      // Always reset loading state
      setIsSubmitting(false);
    }
  };

  /**
   * Handles event deletion with confirmation
   *
   * This function provides a safe way to delete events with user confirmation
   * and proper error handling. Only available in edit mode.
   */
  const handleDelete = async () => {
    // Guard clause: only allow deletion in edit mode
    if (!eventId) return;

    // Require user confirmation before deletion
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      // Execute delete mutation
      await deleteEvent({ eventId: eventId as Id<"events"> });
      toast.success("Event deleted successfully!");
      onClose();
    } catch (error) {
      // Log error and show user-friendly message
      console.error("Failed to delete event:", error);
      toast.error("Failed to delete event. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Modal content with responsive design and scrolling */}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Event" : "Create New Event"}</DialogTitle>
        </DialogHeader>

        {/* Event form with comprehensive field collection */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Event Title - Required field */}
            <div className="col-span-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Enter event title"
                required
              />
            </div>

            {/* Event Description - Optional field with textarea for longer content */}
            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your event"
                rows={3}
              />
            </div>

            {/* Start Time - Required datetime input */}
            <div>
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </div>

            {/* End Time - Required datetime input */}
            <div>
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                required
              />
            </div>

            {/* Event Type Selection - Affects visual theming */}
            <div>
              <Label htmlFor="type">Event Type</Label>
              <Select
                value={formData.type}
                onValueChange={(
                  value: "community_call" | "watch_party" | "workshop" | "meetup" | "other",
                ) => setFormData((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="community_call">Community Call</SelectItem>
                  <SelectItem value="watch_party">Watch Party</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="meetup">Meetup</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location Type - Determines location field behavior */}
            <div>
              <Label htmlFor="locationType">Location Type</Label>
              <Select
                value={formData.locationType}
                onValueChange={(value: "virtual" | "physical") =>
                  setFormData((prev) => ({ ...prev, locationType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location Details - Dynamic label based on location type */}
            <div className="col-span-2">
              <Label htmlFor="locationDetails">
                {formData.locationType === "virtual" ? "Meeting Link" : "Address"}
              </Label>
              <Input
                id="locationDetails"
                value={formData.locationDetails}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, locationDetails: e.target.value }))
                }
                placeholder={
                  formData.locationType === "virtual"
                    ? "https://zoom.us/..."
                    : "123 Main St, City, State"
                }
              />
            </div>

            {/* RSVP Toggle - Controls attendance tracking */}
            <div className="flex items-center space-x-2">
              <Switch
                id="requiresRSVP"
                checked={formData.requiresRSVP}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, requiresRSVP: checked }))
                }
              />
              <Label htmlFor="requiresRSVP">Require RSVP</Label>
            </div>

            {/* Max Attendees - Only shown when RSVP is enabled */}
            {formData.requiresRSVP && (
              <div>
                <Label htmlFor="maxAttendees">Max Attendees</Label>
                <Input
                  id="maxAttendees"
                  type="number"
                  value={formData.maxAttendees}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, maxAttendees: e.target.value }))
                  }
                  placeholder="Leave empty for unlimited"
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <DialogFooter className="gap-2">
            {/* Delete button - Only visible in edit mode */}
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                Delete Event
              </Button>
            )}

            {/* Cancel button */}
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>

            {/* Submit button with loading state */}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : isEditing ? (
                "Update Event"
              ) : (
                "Create Event"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
