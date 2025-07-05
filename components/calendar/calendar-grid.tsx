"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EventCard } from "./event-card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CalendarGridProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onEventSelect: (eventId: string) => void;
}

export function CalendarGrid({ selectedDate, onDateSelect, onEventSelect }: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const events = useQuery(api.events.getEventsByMonth, {
    year: currentMonth.getFullYear(),
    month: currentMonth.getMonth(),
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const getEventsForDate = (date: Date) => {
    if (!events) return [];
    
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate >= dateStart && eventDate <= dateEnd;
    });
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('prev')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <motion.h2 
          key={`${currentMonth.getFullYear()}-${currentMonth.getMonth()}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold"
        >
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </motion.h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('next')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 bg-muted/30 p-4 rounded-lg">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        
        {Array.from({ length: 42 }, (_, i) => {
          const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
          const startDate = new Date(firstDay);
          startDate.setDate(startDate.getDate() - firstDay.getDay() + i);
          
          const isCurrentMonth = startDate.getMonth() === currentMonth.getMonth();
          const isToday = startDate.toDateString() === new Date().toDateString();
          const isSelected = startDate.toDateString() === selectedDate.toDateString();
          const dayEvents = getEventsForDate(startDate);
          
          return (
            <motion.div
              key={startDate.toISOString()}
              className={`
                min-h-[100px] p-2 border border-border/50 cursor-pointer
                transition-colors hover:bg-muted/50
                ${!isCurrentMonth ? 'text-muted-foreground bg-muted/20' : ''}
                ${isToday ? 'bg-primary/10 border-primary/30' : ''}
                ${isSelected ? 'ring-2 ring-primary' : ''}
              `}
              onClick={() => onDateSelect(startDate)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-sm font-medium mb-1">
                {startDate.getDate()}
              </div>
              
              <div className="space-y-1">
                <AnimatePresence>
                  {dayEvents.slice(0, 3).map((event, index) => (
                    <motion.div
                      key={event._id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <EventCard
                        event={event}
                        size="small"
                        onClick={() => onEventSelect(event._id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
