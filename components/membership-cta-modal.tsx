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
import { Check, Sparkles, Users, Zap, MessageSquare } from "lucide-react";

interface MembershipCTAModalProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function MembershipCTAModal({
  children,
  title = "Join the VAI Community",
  description = "Unlock full access to connect with AI professionals and share your expertise"
}: MembershipCTAModalProps) {
  const [open, setOpen] = useState(false);

  const benefits = [
    {
      icon: <MessageSquare className="w-5 h-5 text-green-600" />,
      title: "Create & Comment on Posts",
      description: "Share your AI workflows, prompts, and insights with the community"
    },
    {
      icon: <Zap className="w-5 h-5 text-green-600" />,
      title: "Upvote Content",
      description: "Help surface the best content by voting on posts and comments"
    },
    {
      icon: <Users className="w-5 h-5 text-green-600" />,
      title: "Connect with Professionals",
      description: "Network with AI practitioners, researchers, and enthusiasts"
    },
    {
      icon: <Sparkles className="w-5 h-5 text-green-600" />,
      title: "Access Premium Content",
      description: "Get exclusive access to advanced workflows and expert insights"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-green-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {benefit.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {benefit.title}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                <Check className="w-3 h-3 mr-1" />
                Free to Join
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                <Check className="w-3 h-3 mr-1" />
                No Credit Card
              </Badge>
            </div>

            <SignUpButton mode="modal">
              <Button
                className="w-full bg-green-700 hover:bg-green-800 text-white"
                size="lg"
              >
                Join VAI Community
              </Button>
            </SignUpButton>

            <p className="text-xs text-gray-500 text-center mt-3">
              Already have an account?{" "}
              <button
                onClick={() => setOpen(false)}
                className="text-green-700 hover:text-green-800 font-medium"
              >
                Sign in instead
              </button>
            </p>
          </div>
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