"use client";

import { useState } from "react";
import { Id } from "@/web/convex/_generated/dataModel";
import { format } from "date-fns";
import {
  ExternalLink,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/web/components/ui/badge";
import { Button } from "@/web/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/web/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/web/components/ui/card";
import { PaymentDetailsModal } from "./payment-details-modal";
import { paymentStatusConfig } from "@/lib/admin-config";
import { formatCentsAsCurrency } from "@/lib/format";

export interface PaymentRecord {
  _id: Id<"payments">;
  memberId: Id<"members">;
  subscriptionId?: Id<"subscriptions">;
  stripePaymentIntentId: string;
  stripeInvoiceId?: string;
  amount: number; // in cents
  currency: string;
  status:
    | "succeeded"
    | "pending"
    | "failed"
    | "refunded"
    | "partially_refunded";
  description: string;
  paymentMethod: {
    type: string;
    brand?: string;
    last4: string;
  };
  transactionFee?: number;
  netAmount?: number;
  failureReason?: string;
  refundedAmount?: number;
  createdAt: number;
}

interface PaymentHistoryProps {
  payments: PaymentRecord[];
  showMemberColumn?: boolean;
  showStats?: boolean;
  onPaymentClick?: (paymentId: Id<"payments">) => void;
  className?: string;
}

export function PaymentHistory({
  payments,
  showMemberColumn = false,
  showStats = false,
  onPaymentClick,
  className = "",
}: PaymentHistoryProps) {
  const [selectedPaymentId, setSelectedPaymentId] =
    useState<Id<"payments"> | null>(null);

  const handlePaymentClick = (paymentId: Id<"payments">) => {
    if (onPaymentClick) {
      onPaymentClick(paymentId);
    } else {
      setSelectedPaymentId(paymentId);
    }
  };

  // Calculate stats
  const stats = showStats
    ? {
        totalRevenue: payments
          .filter((p) => p.status === "succeeded")
          .reduce((sum, p) => sum + p.amount, 0),
        totalRefunded: payments
          .filter(
            (p) => p.status === "refunded" || p.status === "partially_refunded",
          )
          .reduce((sum, p) => sum + (p.refundedAmount || 0), 0),
        successfulPayments: payments.filter((p) => p.status === "succeeded")
          .length,
        failedPayments: payments.filter((p) => p.status === "failed").length,
      }
    : null;

  if (payments.length === 0) {
    return (
      <div className="rounded-none bg-gray-50 p-8 text-center">
        <DollarSign className="mx-auto mb-3 h-12 w-12 text-gray-400" />
        <p className="text-gray-600">No payment history</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Stats Cards */}
      {showStats && stats && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCentsAsCurrency(stats.totalRevenue)}
              </div>
              <p className="text-muted-foreground text-xs">
                {stats.successfulPayments} successful payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Refunded
              </CardTitle>
              <RefreshCw className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -{formatCentsAsCurrency(stats.totalRefunded)}
              </div>
              <p className="text-muted-foreground text-xs">
                Across all refunds
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Success Rate
              </CardTitle>
              <TrendingUp className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((stats.successfulPayments / payments.length) * 100).toFixed(
                  1,
                )}
                %
              </div>
              <p className="text-muted-foreground text-xs">
                {stats.successfulPayments} of {payments.length} payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Failed Payments
              </CardTitle>
              <TrendingDown className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.failedPayments}
              </div>
              <p className="text-muted-foreground text-xs">Need attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payments Table */}
      <div className="overflow-hidden rounded-none border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Date</TableHead>
              {showMemberColumn && <TableHead>Member</TableHead>}
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const statusInfo =
                paymentStatusConfig[
                  payment.status as keyof typeof paymentStatusConfig
                ];
              const StatusIcon = statusInfo.icon;
              const isRefund =
                payment.status === "refunded" ||
                payment.status === "partially_refunded";

              return (
                <TableRow
                  key={payment._id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handlePaymentClick(payment._id)}
                >
                  <TableCell className="font-medium">
                    {format(new Date(payment.createdAt), "MMM d, yyyy")}
                    <span className="block text-xs text-gray-500">
                      {format(new Date(payment.createdAt), "h:mm a")}
                    </span>
                  </TableCell>
                  {showMemberColumn && (
                    <TableCell>
                      {/* Member info would go here if we had it */}
                      <span className="text-sm text-gray-500">-</span>
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <span className={isRefund ? "text-red-600" : ""}>
                      {isRefund ? "-" : ""}
                      {formatCentsAsCurrency(payment.amount)}
                    </span>
                    {payment.refundedAmount &&
                      payment.status === "partially_refunded" && (
                        <span className="block text-xs text-gray-500">
                          Refunded:{" "}
                          {formatCentsAsCurrency(payment.refundedAmount)}
                        </span>
                      )}
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
                  <TableCell>
                    <div className="text-sm">
                      {payment.paymentMethod.brand && (
                        <span className="capitalize">
                          {payment.paymentMethod.brand}
                        </span>
                      )}
                      {payment.paymentMethod.type !== "card" && (
                        <span className="capitalize">
                          {payment.paymentMethod.type}
                        </span>
                      )}
                      <span className="ml-1 text-gray-500">
                        •••• {payment.paymentMethod.last4}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-gray-600">
                    {payment.description}
                    {payment.failureReason && (
                      <span className="mt-1 block text-xs text-red-600">
                        {payment.failureReason}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePaymentClick(payment._id);
                      }}
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

      {/* Payment Details Modal (only if not using custom handler) */}
      {!onPaymentClick && selectedPaymentId && (
        <PaymentDetailsModal
          paymentId={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
        />
      )}
    </div>
  );
}

// Compact version for use in cards or sidebars
interface PaymentHistoryCompactProps {
  payments: PaymentRecord[];
  limit?: number;
  onViewAll?: () => void;
}

export function PaymentHistoryCompact({
  payments,
  limit = 5,
  onViewAll,
}: PaymentHistoryCompactProps) {
  const recentPayments = payments.slice(0, limit);

  if (payments.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-gray-500">No payments yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recentPayments.map((payment) => {
        const statusInfo =
          paymentStatusConfig[
            payment.status as keyof typeof paymentStatusConfig
          ];
        const StatusIcon = statusInfo.icon;

        return (
          <div
            key={payment._id}
            className="flex items-center justify-between rounded p-2 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className={cn("rounded p-1.5", statusInfo.color)}>
                <StatusIcon className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {formatCentsAsCurrency(payment.amount)}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(payment.createdAt), "MMM d")}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {payment.paymentMethod.brand || payment.paymentMethod.type} ••••
              {payment.paymentMethod.last4}
            </Badge>
          </div>
        );
      })}

      {payments.length > limit && onViewAll && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={onViewAll}
        >
          View all {payments.length} payments
        </Button>
      )}
    </div>
  );
}
