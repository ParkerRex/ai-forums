"use client";

import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

export const testimonialsData = [
  {
    quote:
      "I learn more here in a week than I did at multiple tech conferences. The signal-to-noise ratio is incredible.",
    author: "Sarah Chen",
    role: "ML Engineer at Scale AI",
    avatar: "SC",
    rating: 5,
  },
  {
    quote:
      "This community helped me transition from traditional software to AI engineering. The support is unmatched.",
    author: "Marcus Johnson",
    role: "Founder, AI Startup",
    avatar: "MJ",
    rating: 5,
  },
  {
    quote:
      "Finally, a place where people share real production challenges and solutions, not just toy examples.",
    author: "Elena Rodriguez",
    role: "Senior AI Engineer",
    avatar: "ER",
    rating: 5,
  },
  {
    quote:
      "The Discord discussions alone are worth it. It's like having a team of expert AI engineers on speed dial.",
    author: "David Kim",
    role: "Tech Lead at OpenAI",
    avatar: "DK",
    rating: 5,
  },
  {
    quote:
      "VAI cuts through the YouTube noise and Twitter hype. Just pure, actionable insights from practitioners.",
    author: "Alex Thompson",
    role: "Independent Researcher",
    avatar: "AT",
    rating: 5,
  },
  {
    quote:
      "The right combination of technical depth and practical application. This is what the AI community needed.",
    author: "Priya Patel",
    role: "AI Product Manager",
    avatar: "PP",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {testimonialsData.map((testimonial, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: idx * 0.1 }}
          viewport={{ once: true }}
        >
          <Card className="relative h-full p-6 hover:shadow-lg transition-shadow">
            <Quote className="absolute top-6 right-6 h-8 w-8 text-primary/10" />

            <div className="flex gap-1 mb-4">
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>

            <blockquote className="text-muted-foreground mb-6 relative z-10">
              "{testimonial.quote}"
            </blockquote>

            <div className="flex items-center gap-3 mt-auto">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={`https://avatar.vercel.sh/${testimonial.author}`}
                />
                <AvatarFallback>{testimonial.avatar}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-sm">
                  {testimonial.author}
                </div>
                <div className="text-xs text-muted-foreground">
                  {testimonial.role}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
