"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentDetailsModal } from "@/components/admin/payment-details-modal";

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
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
            <p className="text-gray-600 mt-1">
              View payment history and process refunds
            </p>
          </div>
          <Button onClick={exportPayments} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Gross Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.revenue.formattedGross}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Before fees & refunds
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.revenue.formattedNet}
              </p>
              <p className="text-xs text-gray-500 mt-1">After fees & refunds</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Refunds</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {stats.revenue.formattedRefunds}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.refundedPayments} payments
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalPayments > 0
                  ? (
                      (stats.successfulPayments / stats.totalPayments) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.successfulPayments} of {stats.totalPayments}
              </p>
            </div>
            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Date Range */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
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
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-gray-400" />
                      {payment.paymentMethod.brand} ••••{" "}
                      {payment.paymentMethod.last4}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                    {payment.description}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPaymentId(payment._id)}
                    >
                      <ExternalLink className="w-4 h-4" />
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
