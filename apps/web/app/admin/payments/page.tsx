"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { Id } from "@/web/convex/_generated/dataModel";
import type { PaymentWithMember, PaymentStats } from "@/types/admin";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Download,
  Calendar,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/web/components/ui/table";
import { Badge } from "@/web/components/ui/badge";
import { Button } from "@/web/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/web/components/ui/select";
import { PaymentDetailsModal } from "@/web/components/admin/payment-details-modal";

const paymentStatusConfig = {
  succeeded: {
    label: "Paid",
    color: "bg-green-50 text-green-700",
    icon: CheckCircle,
  },
  pending: {
    label: "Pending",
    color: "bg-yellow-50 text-yellow-700",
    icon: Clock,
  },
  failed: { label: "Failed", color: "bg-red-50 text-red-700", icon: XCircle },
  refunded: {
    label: "Refunded",
    color: "bg-gray-50 text-gray-700",
    icon: RefreshCw,
  },
  partially_refunded: {
    label: "Partial Refund",
    color: "bg-orange-50 text-orange-700",
    icon: RefreshCw,
  },
};

export default function AdminPaymentsPage() {
  const [selectedPaymentId, setSelectedPaymentId] =
    useState<Id<"payments"> | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    | "all"
    | "pending"
    | "succeeded"
    | "failed"
    | "refunded"
    | "partially_refunded"
  >("all");
  const [dateRange, setDateRange] = useState("30");

  // Calculate date range
  const endDate = Date.now();
  const startDate =
    dateRange === "all"
      ? undefined
      : startOfDay(subDays(endDate, parseInt(dateRange))).getTime();

  const payments = useQuery(api.admin.payments.getAllPayments, {
    status: statusFilter === "all" ? undefined : statusFilter,
    startDate,
    endDate: endOfDay(endDate).getTime(),
    limit: 100,
  }) as PaymentWithMember[] | undefined;

  const stats = useQuery(api.admin.payments.getPaymentStats, {
    startDate,
    endDate: endOfDay(endDate).getTime(),
  }) as PaymentStats | undefined;

  const exportPayments = () => {
    if (!payments) return;

    const data = payments.map((p) => ({
      date: format(new Date(p.createdAt), "yyyy-MM-dd HH:mm:ss"),
      customer: p.member?.email || "Unknown",
      amount: (p.amount / 100).toFixed(2),
      status: p.status,
      method: `${p.paymentMethod.brand} ${p.paymentMethod.last4}`,
      description: p.description,
      refunded: p.refundedAmount ? (p.refundedAmount / 100).toFixed(2) : "0",
    }));

    const headers = [
      "date",
      "customer",
      "amount",
      "status",
      "method",
      "description",
      "refunded",
    ];
    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((key) => `"${row[key as keyof typeof row]}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (!payments || !stats) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
            <p className="mt-1 text-gray-600">
              View payment history and process refunds
            </p>
          </div>
          <Button onClick={exportPayments} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-none border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Gross Revenue</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.revenue.formattedGross}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Before fees & refunds
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-none bg-green-100">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-none border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Revenue</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.revenue.formattedNet}
              </p>
              <p className="mt-1 text-xs text-gray-500">After fees & refunds</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-none bg-blue-100">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-none border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Refunds</p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {stats.revenue.formattedRefunds}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {stats.refundedPayments} payments
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-none bg-red-100">
              <RefreshCw className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="rounded-none border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stats.totalPayments > 0
                  ? (
                      (stats.successfulPayments / stats.totalPayments) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {stats.successfulPayments} of {stats.totalPayments}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-none bg-gray-100">
              <CheckCircle className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-none border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Date Range */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(
                value as
                  | "all"
                  | "pending"
                  | "succeeded"
                  | "failed"
                  | "refunded"
                  | "partially_refunded",
              )
            }
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="partially_refunded">Partial Refund</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="overflow-hidden rounded-none border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
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

              return (
                <TableRow key={payment._id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    {format(new Date(payment.createdAt), "MMM d, yyyy")}
                    <div className="text-xs text-gray-500">
                      {format(new Date(payment.createdAt), "h:mm a")}
                    </div>
                  </TableCell>
                  <TableCell>
                    {payment.member ? (
                      <div>
                        <div className="font-medium">
                          {payment.member.firstName} {payment.member.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.member.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      ${(payment.amount / 100).toFixed(2)}
                    </div>
                    {(payment.refundedAmount ?? 0) > 0 && (
                      <div className="text-xs text-red-600">
                        -${((payment.refundedAmount ?? 0) / 100).toFixed(2)}{" "}
                        refunded
                      </div>
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
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3 text-gray-400" />
                      {payment.paymentMethod.brand} ••••{" "}
                      {payment.paymentMethod.last4}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-gray-600">
                    {payment.description}
                  </TableCell>
                  <TableCell className="text-right">
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

      {/* Payment Details Modal */}
      {selectedPaymentId && (
        <PaymentDetailsModal
          paymentId={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
        />
      )}
    </div>
  );
}
