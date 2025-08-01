"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/web/convex/_generated/api";
import { Id } from "@/web/convex/_generated/dataModel";
import type { PaymentDetailsResponse, RefundEligibility } from "@/types/admin";
import { format } from "date-fns";
import {
  CreditCard,
  Copy,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { toast } from "sonner";
import { paymentStatusConfig } from "@/lib/admin-config";
import { formatCentsAsCurrency } from "@/lib/format";

interface PaymentDetailsModalProps {
  paymentId: Id<"payments">;
  onClose: () => void;
}

export function PaymentDetailsModal({
  paymentId,
  onClose,
}: PaymentDetailsModalProps) {
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState<string>(
    "requested_by_customer",
  );
  const [refundNotes, setRefundNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const paymentDetails = useQuery(api.admin.payments.getPaymentDetails, {
    paymentId,
  }) as PaymentDetailsResponse | undefined;
  const refundEligibility = useQuery(api.stripe.refund.getRefundEligibility, {
    paymentId,
  }) as RefundEligibility | undefined;
  const refundPayment = useAction(api.stripe.refund.refundPayment);

  if (!paymentDetails) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { payment, member } = paymentDetails;
  const statusInfo =
    paymentStatusConfig[payment.status as keyof typeof paymentStatusConfig];
  const StatusIcon = statusInfo.icon;

  const fullName =
    member?.firstName && member?.lastName
      ? `${member.firstName} ${member.lastName}`
      : member?.email || "Unknown";

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("ID copied to clipboard");
  };

  const handleRefund = async () => {
    if (!refundEligibility?.eligible) return;

    setIsProcessing(true);
    try {
      const amountInCents = refundAmount
        ? Math.round(parseFloat(refundAmount) * 100)
        : payment.amount;

      await refundPayment({
        paymentId,
        amount: amountInCents,
        reason: refundReason as
          | "requested_by_customer"
          | "duplicate"
          | "fraudulent"
          | "other",
        notes: refundNotes,
      });

      toast.success("Refund Successful", {
        description: `Refunded $${(amountInCents / 100).toFixed(2)}`,
      });

      setShowRefundForm(false);
      onClose();
    } catch (error) {
      toast.error("Refund Failed", {
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while processing the refund",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const maxRefundAmount =
    refundEligibility && "maxRefundAmount" in refundEligibility
      ? refundEligibility.maxRefundAmount
      : 0;
  const canRefund = refundEligibility?.eligible && !showRefundForm;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogDescription>
            Transaction information and refund options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Status */}
          <div className="flex items-center justify-between rounded-none bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <StatusIcon
                className={cn(
                  "h-8 w-8",
                  statusInfo.color.includes("green")
                    ? "text-green-600"
                    : "text-gray-600",
                )}
              />
              <div>
                <p className="text-lg font-semibold">
                  ${(payment.amount / 100).toFixed(2)}
                </p>
                <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>{format(new Date(payment.createdAt), "MMM d, yyyy")}</p>
              <p>{format(new Date(payment.createdAt), "h:mm a")}</p>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Transaction Details</h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Customer</p>
                <p className="font-medium">{fullName}</p>
                <p className="text-gray-600">{member?.email}</p>
              </div>

              <div>
                <p className="text-gray-500">Payment Method</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">
                    {payment.paymentMethod.brand} ••••{" "}
                    {payment.paymentMethod.last4}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-gray-500">Description</p>
                <p className="font-medium">{payment.description}</p>
              </div>

              <div>
                <p className="text-gray-500">Invoice ID</p>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                    {payment.stripeInvoiceId || "N/A"}
                  </code>
                  {payment.stripeInvoiceId && (
                    <button
                      onClick={() => handleCopyId(payment.stripeInvoiceId!)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Financial Breakdown</h3>

            <div className="space-y-2 rounded-none bg-gray-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Gross Amount</span>
                <span className="font-medium">
                  {formatCentsAsCurrency(payment.amount)}
                </span>
              </div>

              {payment.transactionFee ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transaction Fee</span>
                  <span className="text-red-600">
                    -{formatCentsAsCurrency(payment.transactionFee)}
                  </span>
                </div>
              ) : null}

              {payment.refundedAmount ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Refunded</span>
                  <span className="text-red-600">
                    -{formatCentsAsCurrency(payment.refundedAmount)}
                  </span>
                </div>
              ) : null}

              <Separator />

              <div className="flex justify-between">
                <span className="font-medium">Net Amount</span>
                <span className="text-lg font-semibold">
                  {formatCentsAsCurrency(payment.netAmount || payment.amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Stripe IDs */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Stripe Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Payment Intent ID</span>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                    {payment.stripePaymentIntentId}
                  </code>
                  <button
                    onClick={() => handleCopyId(payment.stripePaymentIntentId)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Refund Section */}
          {canRefund && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Refund Available</AlertTitle>
              <AlertDescription>
                You can refund up to ${(maxRefundAmount / 100).toFixed(2)} for
                this payment.
                {"eligible" in refundEligibility &&
                  refundEligibility.alreadyRefunded > 0 &&
                  ` (Already refunded: $${(refundEligibility.alreadyRefunded / 100).toFixed(2)})`}
              </AlertDescription>
            </Alert>
          )}

          {!canRefund && refundEligibility && !refundEligibility.eligible && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Cannot Refund</AlertTitle>
              <AlertDescription>{refundEligibility.reason}</AlertDescription>
            </Alert>
          )}

          {/* Refund Form */}
          {showRefundForm && refundEligibility?.eligible && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium text-gray-900">Process Refund</h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="refund-amount">Refund Amount</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="refund-amount"
                      type="number"
                      step="0.01"
                      max={maxRefundAmount / 100}
                      placeholder={(payment.amount / 100).toFixed(2)}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to refund full amount (
                    {formatCentsAsCurrency(maxRefundAmount)})
                  </p>
                </div>

                <div>
                  <Label htmlFor="refund-reason">Reason</Label>
                  <Select value={refundReason} onValueChange={setRefundReason}>
                    <SelectTrigger id="refund-reason">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="requested_by_customer">
                        Requested by Customer
                      </SelectItem>
                      <SelectItem value="duplicate">
                        Duplicate Payment
                      </SelectItem>
                      <SelectItem value="fraudulent">Fraudulent</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="refund-notes">Notes (Optional)</Label>
                  <Textarea
                    id="refund-notes"
                    placeholder="Add any additional context..."
                    value={refundNotes}
                    onChange={(e) => setRefundNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleRefund}
                  disabled={isProcessing}
                >
                  {isProcessing && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Process Refund
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRefundForm(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {canRefund && (
            <Button variant="outline" onClick={() => setShowRefundForm(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refund Payment
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
