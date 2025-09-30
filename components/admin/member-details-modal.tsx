"use client";

import { useQuery } from "convex/react";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  Mail,
  MessageSquare,
  MoreVertical,
  Shield,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { memberStatusConfig, paymentStatusConfig, tierConfig } from "@/lib/admin-config";
import { getMemberDisplayName, getMemberInitials } from "@/lib/admin-utils";
import { formatCentsAsCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MemberDetailsResponse } from "@/types/admin";
import { PaymentDetailsModal } from "./payment-details-modal";

interface MemberDetailsModalProps {
  memberId: Id<"members">;
  onClose: () => void;
}

export function MemberDetailsModal({ memberId, onClose }: MemberDetailsModalProps) {
  const [selectedPaymentId, setSelectedPaymentId] = useState<Id<"payments"> | null>(null);
  const memberDetails = useQuery(api.admin.members.getMemberDetailsForAdmin, {
    memberId,
  }) as MemberDetailsResponse | undefined;

  if (!memberDetails) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
          <div className="flex h-96 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { member, subscription, payments, activity, status } = memberDetails;
  const fullName = getMemberDisplayName(member);
  const initials = getMemberInitials(member);

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-xl font-semibold">Member Details</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Member Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-xl font-medium text-gray-700">
                    {member.avatarUrl ? (
                      <Image
                        src={member.avatarUrl}
                        alt={fullName}
                        width={64}
                        height={64}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{fullName}</h2>
                    <p className="text-gray-600">{member.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {member.role === "admin" && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="mr-1 h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {member.tier && tierConfig[member.tier as keyof typeof tierConfig] && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            tierConfig[member.tier as keyof typeof tierConfig].color,
                          )}
                        >
                          {tierConfig[member.tier as keyof typeof tierConfig].label}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn("text-xs", memberStatusConfig[status]?.color || "")}
                      >
                        {memberStatusConfig[status]?.label ||
                          status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Actions
                      <MoreVertical className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Email
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Manage Subscription
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Shield className="mr-2 h-4 w-4" />
                      Change Role
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="payments">
                  Payments {payments.length > 0 && `(${payments.length})`}
                </TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Profile Info */}
                <div className="rounded-none bg-gray-50 p-4">
                  <h3 className="mb-3 font-medium text-gray-900">Profile Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Member ID</p>
                      <p className="font-mono text-sm">{member._id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Joined</p>
                      <p className="text-sm">
                        {member.joinedDate
                          ? format(new Date(member.joinedDate), "MMM d, yyyy")
                          : "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Active</p>
                      <p className="text-sm">
                        {member.lastOnline
                          ? formatDistanceToNow(new Date(member.lastOnline), {
                              addSuffix: true,
                            })
                          : "Never"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="text-sm">{member.location || "Not specified"}</p>
                    </div>
                  </div>
                  {member.bio && (
                    <div className="mt-4">
                      <p className="mb-1 text-sm text-gray-500">Bio</p>
                      <p className="text-sm">{member.bio}</p>
                    </div>
                  )}
                </div>

                {/* Activity Stats */}
                <div className="rounded-none bg-gray-50 p-4">
                  <h3 className="mb-3 font-medium text-gray-900">Activity Statistics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-gray-900">{activity.postCount}</p>
                      <p className="text-sm text-gray-500">Posts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-gray-900">
                        {activity.commentCount}
                      </p>
                      <p className="text-sm text-gray-500">Comments</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-gray-900">
                        {member.netVoteCount || 0}
                      </p>
                      <p className="text-sm text-gray-500">Net Votes</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="subscription" className="space-y-4">
                {subscription ? (
                  <>
                    <div className="rounded-none bg-gray-50 p-4">
                      <h3 className="mb-3 font-medium text-gray-900">Current Subscription</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Tier</p>
                          <p className="text-sm font-medium">
                            {tierConfig[subscription.tier as keyof typeof tierConfig]?.label ||
                              subscription.tier}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Billing</p>
                          <p className="text-sm font-medium capitalize">
                            {subscription.billingInterval}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              memberStatusConfig[
                                subscription.status as keyof typeof memberStatusConfig
                              ]?.color || "",
                            )}
                          >
                            {memberStatusConfig[
                              subscription.status as keyof typeof memberStatusConfig
                            ]?.label || subscription.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Next Billing</p>
                          <p className="text-sm">
                            {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-none bg-gray-50 p-4">
                      <h3 className="mb-3 font-medium text-gray-900">Stripe Information</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-gray-500">Customer ID</p>
                          <p className="font-mono text-sm">{subscription.stripeCustomerId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Subscription ID</p>
                          <p className="font-mono text-sm">{subscription.stripeSubscriptionId}</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-none bg-gray-50 p-8 text-center">
                    <AlertCircle className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                    <p className="text-gray-600">No active subscription</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments" className="space-y-4">
                {payments.length > 0 ? (
                  <div className="rounded-none border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => {
                          const statusInfo =
                            paymentStatusConfig[payment.status as keyof typeof paymentStatusConfig];
                          const StatusIcon = statusInfo.icon;

                          return (
                            <TableRow key={payment._id}>
                              <TableCell>
                                {format(new Date(payment.createdAt), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCentsAsCurrency(payment.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn("text-xs", statusInfo.color)}
                                >
                                  <StatusIcon className="mr-1 h-3 w-3" />
                                  {statusInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {payment.paymentMethod.brand} •••• {payment.paymentMethod.last4}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {payment.description}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedPaymentId(payment._id)}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-none bg-gray-50 p-8 text-center">
                    <DollarSign className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                    <p className="text-gray-600">No payment history</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                {/* Recent Posts */}
                {activity.posts.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-medium text-gray-900">Recent Posts</h3>
                    <div className="space-y-2">
                      {activity.posts.map((post) => (
                        <div key={post._id} className="rounded-none bg-gray-50 p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{post.title}</p>
                              <p className="mt-1 text-sm text-gray-500">
                                <FileText className="mr-1 inline h-3 w-3" />
                                Post •{" "}
                                {formatDistanceToNow(new Date(post.createdAt), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                              <a
                                href={`/posts/${post.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Comments */}
                {activity.comments.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-medium text-gray-900">Recent Comments</h3>
                    <div className="space-y-2">
                      {activity.comments.map((comment) => (
                        <div key={comment._id} className="rounded-none bg-gray-50 p-3">
                          <p className="line-clamp-2 text-sm text-gray-700">{comment.content}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            <MessageSquare className="mr-1 inline h-3 w-3" />
                            {formatDistanceToNow(new Date(comment.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activity.posts.length === 0 && activity.comments.length === 0 && (
                  <div className="rounded-none bg-gray-50 p-8 text-center">
                    <MessageSquare className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                    <p className="text-gray-600">No recent activity</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Details Modal */}
      {selectedPaymentId && (
        <PaymentDetailsModal
          paymentId={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
        />
      )}
    </>
  );
}
