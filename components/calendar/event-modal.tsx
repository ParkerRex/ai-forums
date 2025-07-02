"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
  selectedDate?: Date;
}

export function EventModal({ isOpen, onClose, eventId, selectedDate }: EventModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    type: "other" as "community_call" | "watch_party" | "workshop" | "meetup" | "other",
    locationType: "virtual" as "virtual" | "physical",
    locationDetails: "",
    platform: "",
    maxAttendees: "",
    requiresRSVP: false,
    streamUrl: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const event = useQuery(
    api.events.getEventById,
    eventId ? { eventId: eventId as Id<"events"> } : "skip"
  );
  
  const createEvent = useMutation(api.events.createEvent);
  const updateEvent = useMutation(api.events.updateEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);
  
  const isEditing = !!eventId;
  
  useEffect(() => {
    if (event) {
      const startDate = new Date(event.startTime);
      const endDate = new Date(event.endTime);
      
      setFormData({
        title: event.title,
        description: event.description,
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
      const defaultStart = new Date(selectedDate);
      defaultStart.setHours(12, 0, 0, 0);
      const defaultEnd = new Date(defaultStart);
      defaultEnd.setHours(13, 0, 0, 0);
      
      setFormData(prev => ({
        ...prev,
        startTime: format(defaultStart, "yyyy-MM-dd'T'HH:mm"),
        endTime: format(defaultEnd, "yyyy-MM-dd'T'HH:mm"),
      }));
    }
  }, [event, selectedDate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    const startTime = new Date(formData.startTime).getTime();
    const endTime = new Date(formData.endTime).getTime();
    
    if (endTime <= startTime) {
      toast.error("End time must be after start time");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startTime,
        endTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        type: formData.type,
        location: {
          type: formData.locationType,
          details: formData.locationDetails.trim(),
          platform: formData.platform ? (formData.platform as "zoom" | "discord" | "youtube" | "other") : undefined,
        },
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
        requiresRSVP: formData.requiresRSVP,
        streamUrl: formData.streamUrl || undefined,
        resources: [],
      };
      
      if (isEditing && eventId) {
        await updateEvent({
          eventId: eventId as Id<"events">,
          ...eventData,
        });
        toast.success("Event updated successfully!");
      } else {
        await createEvent(eventData);
        toast.success("Event created successfully!");
      }
      
      onClose();
    } catch (error) {
      console.error("Failed to save event:", error);
      toast.error("Failed to save event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async () => {
    if (!eventId) return;
    
    if (!confirm("Are you sure you want to delete this event?")) return;
    
    try {
      await deleteEvent({ eventId: eventId as Id<"events"> });
      toast.success("Event deleted successfully!");
      onClose();
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error("Failed to delete event. Please try again.");
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Event" : "Create New Event"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter event title"
                required
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your event"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="type">Event Type</Label>
              <Select value={formData.type} onValueChange={(value: "community_call" | "watch_party" | "workshop" | "meetup" | "other") => setFormData(prev => ({ ...prev, type: value }))}>
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
            
            <div>
              <Label htmlFor="locationType">Location Type</Label>
              <Select value={formData.locationType} onValueChange={(value: "virtual" | "physical") => setFormData(prev => ({ ...prev, locationType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="locationDetails">
                {formData.locationType === "virtual" ? "Meeting Link" : "Address"}
              </Label>
              <Input
                id="locationDetails"
                value={formData.locationDetails}
                onChange={(e) => setFormData(prev => ({ ...prev, locationDetails: e.target.value }))}
                placeholder={formData.locationType === "virtual" ? "https://zoom.us/..." : "123 Main St, City, State"}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="requiresRSVP"
                checked={formData.requiresRSVP}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requiresRSVP: checked }))}
              />
              <Label htmlFor="requiresRSVP">Require RSVP</Label>
            </div>
            
            {formData.requiresRSVP && (
              <div>
                <Label htmlFor="maxAttendees">Max Attendees</Label>
                <Input
                  id="maxAttendees"
                  type="number"
                  value={formData.maxAttendees}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxAttendees: e.target.value }))}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
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
            
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                isEditing ? "Update Event" : "Create Event"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
