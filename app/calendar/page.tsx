"use client";

import { useState } from "react";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { EventModal } from "@/components/calendar/event-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Authenticated, Unauthenticated } from "convex/react";
import { MembershipCTAModal } from "@/components/membership-cta-modal";

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Community Calendar</h1>
          <p className="text-muted-foreground mt-2">
            Stay up to date with VAI community events, watch parties, and workshops
          </p>
        </div>
        
        <Authenticated>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </Authenticated>
        
        <Unauthenticated>
          <MembershipCTAModal
            title="Create Community Events"
            description="Join VAI to create and manage community events"
          >
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </MembershipCTAModal>
        </Unauthenticated>
      </div>

      <CalendarGrid
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        onEventSelect={setSelectedEventId}
      />

      <EventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        selectedDate={selectedDate}
      />

      {selectedEventId && (
        <EventModal
          isOpen={!!selectedEventId}
          onClose={() => setSelectedEventId(null)}
          eventId={selectedEventId}
        />
      )}
    </div>
  );
}
