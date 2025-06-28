"use client";

import { useState } from "react";
import { SignUpButton } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Users, Zap, MessageSquare, BookOpen, CheckCircle } from "lucide-react";

interface MembershipCTAModalProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function MembershipCTAModal({
  children,
  title = "Join VAI Community",
  description = "Unlock exclusive content and connect with AI engineers"
}: MembershipCTAModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const features = [
    {
      icon: MessageSquare,
      title: "Full Discussion Access",
      description: "Read complete posts and join conversations"
    },
    {
      icon: Users,
      title: "Community Network",
      description: "Connect with engineers from top companies"
    },
    {
      icon: BookOpen,
      title: "Learning Resources",
      description: "Access workflows, prompts, and tutorials"
    },
    {
      icon: Zap,
      title: "Early Access",
      description: "Get first access to new features and content"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-6">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
              ✨ Free to Join
            </Badge>
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
              🚀 Instant Access
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-shrink-0">
                  <feature.icon className="w-4 h-4 text-primary mt-0.5" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <SignUpButton mode="modal">
            <Button 
              className="w-full"
              onClick={() => setIsOpen(false)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Join VAI Community
            </Button>
          </SignUpButton>
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground"
            onClick={() => setIsOpen(false)}
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy integration
export function useMembershipCTA() {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return {
    isOpen,
    openModal,
    closeModal,
    MembershipCTAModal: ({ children, ...props }: Omit<MembershipCTAModalProps, 'children'> & { children?: React.ReactNode }) => (
      <MembershipCTAModal {...props}>
        {children || <></>}
      </MembershipCTAModal>
    )
  };
}

export default MembershipCTAModal; 