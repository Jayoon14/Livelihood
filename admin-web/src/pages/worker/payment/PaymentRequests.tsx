import {
  AlertCircle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Eye,
  Landmark,
  LoaderCircle,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  UserRound,
  Wallet,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { confirmAction } from "../../../components/ui/confirmAction";
import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import {
  approvePaymentTransaction,
  getWorkerPaymentTransactions,
  rejectPaymentTransaction,
  type PaymentTransaction,
} from "../../../services/paymentService";

type PaymentFilter =
  | "All"
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Cash"
  | "GCash"
  | "Maya"
  | "Bank Transfer";

interface WorkerPaymentRelation {
  id: number;
  booking_id: number;
  worker_id?: string;
  customer?: {
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    suffix?: string | null;
    profile_picture?: string | null;
    profile_image?: string | null;
    avatar_url?: string | null;
  } | null;
  booking?: {
    id?: number;
    booking_date?: string | null;
    booking_time?: string | null;
    address?: string | null;
  } | null;
}

interface WorkerPaymentTransaction extends PaymentTransaction {
  payment?: WorkerPaymentRelation | null;
}

type PageMessage = {
  type: "error" | "success";
  text: string;
} | null;

const ITEMS_PER_PAGE = 8;

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const value = (error as { message: string }).message.trim();

    if (value) {
      return value;
    }
  }

  return fallback;
}

function toAmount(value: unknown): number {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value: unknown): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(toAmount(value));
}

function formatDate(
  dateValue?: string | null,
  timeValue?: string | null,
): string {
  if (!dateValue) {
    return "Schedule unavailable";
  }

  const combinedValue = timeValue ? `${dateValue}T${timeValue}` : dateValue;

  const date = new Date(combinedValue);

  if (Number.isNaN(date.getTime())) {
    return [dateValue, timeValue].filter(Boolean).join(" ");
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    ...(timeValue
      ? {
          timeStyle: "short" as const,
        }
      : {}),
  }).format(date);
}

function getCustomerName(transaction: WorkerPaymentTransaction): string {
  const customer = transaction.payment?.customer;

  return (
    [
      customer?.first_name,
      customer?.middle_name,
      customer?.last_name,
      customer?.suffix,
    ]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part))
      .join(" ") || "Customer"
  );
}

function getStatusClass(status: string): string {
  switch (status.trim().toLowerCase()) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300";

    case "rejected":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300";

    default:
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300";
  }
}

function getMethodIcon(method: string | null) {
  const value = method?.trim().toLowerCase();

  if (value === "cash") {
    return Banknote;
  }

  if (value === "bank transfer") {
    return Landmark;
  }

  return CreditCard;
}

function isImageProof(url: string): boolean {
  const cleanUrl = url.split("?")[0].toLowerCase();

  return /\.(jpg|jpeg|png|webp|gif)$/.test(cleanUrl);
}

export default function PaymentRequests() {
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [workerId, setWorkerId] = useState<string | null>(null);
  const [payments, setPayments] = useState<WorkerPaymentTransaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PaymentFilter>("All");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<PageMessage>(null);

  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const [rejectionTransaction, setRejectionTransaction] =
    useState<WorkerPaymentTransaction | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadPayments = useCallback(
    async (
      id: string,
      options: {
        showRefresh?: boolean;
      } = {},
    ): Promise<void> => {
      if (options.showRefresh) {
        setRefreshing(true);
      }

      try {
        const data = await getWorkerPaymentTransactions(id);

        setPayments((data ?? []) as WorkerPaymentTransaction[]);
        setMessage(null);
      } catch (error) {
        setMessage({
          type: "error",
          text: getErrorMessage(error, "Unable to load payment requests."),
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialize(): Promise<void> {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (!user) {
          throw new Error("Your session has expired. Please sign in again.");
        }

        if (!mounted) {
          return;
        }

        setWorkerId(user.id);
        await loadPayments(user.id);

        channel = supabase
          .channel(`worker-payment-requests-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "payment_transactions",
            },
            () => {
              if (realtimeTimerRef.current) {
                clearTimeout(realtimeTimerRef.current);
              }

              realtimeTimerRef.current = setTimeout(() => {
                if (mounted) {
                  void loadPayments(user.id);
                }
              }, 300);
            },
          )
          .subscribe();
      } catch (error) {
        if (mounted) {
          setMessage({
            type: "error",
            text: getErrorMessage(
              error,
              "Unable to initialize payment requests.",
            ),
          });
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      mounted = false;

      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
      }

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadPayments]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  useEffect(() => {
    if (!selectedProof && !rejectionTransaction) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedProof(null);
        setRejectionTransaction(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [rejectionTransaction, selectedProof]);

  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const name = getCustomerName(payment).toLowerCase();
      const reference = payment.reference_number?.toLowerCase().trim() ?? "";
      const bookingId = String(payment.booking_id);

      const matchesSearch =
        !keyword ||
        name.includes(keyword) ||
        reference.includes(keyword) ||
        bookingId.includes(keyword);

      const matchesFilter =
        filter === "All" ||
        payment.payment_method === filter ||
        payment.transaction_status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [filter, payments, search]);

  const statistics = useMemo(() => {
    const pending = payments.filter(
      (payment) => payment.transaction_status === "Pending",
    );
    const approved = payments.filter(
      (payment) => payment.transaction_status === "Approved",
    );
    const rejected = payments.filter(
      (payment) => payment.transaction_status === "Rejected",
    );

    return {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      pendingAmount: pending.reduce(
        (sum, payment) => sum + toAmount(payment.amount),
        0,
      ),
    };
  }, [payments]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPayments.length / ITEMS_PER_PAGE),
  );

  const paginatedPayments = useMemo(() => {
    const from = (page - 1) * ITEMS_PER_PAGE;

    return filteredPayments.slice(from, from + ITEMS_PER_PAGE);
  }, [filteredPayments, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    if (!workerId || refreshing) {
      return;
    }

    await loadPayments(workerId, {
      showRefresh: true,
    });
  }, [loadPayments, refreshing, workerId]);

  const handleApprove = useCallback(
    async (payment: WorkerPaymentTransaction): Promise<void> => {
      if (processingId !== null) {
        return;
      }

      const confirmed = await confirmAction(
        `Approve ${formatCurrency(payment.amount)} from ${getCustomerName(
          payment,
        )}?`,
      );

      if (!confirmed) {
        return;
      }

      try {
        setProcessingId(payment.id);

        await approvePaymentTransaction(payment.id);

        setPayments((current) =>
          current.filter((item) => item.id !== payment.id),
        );

        setMessage({
          type: "success",
          text: "Payment transaction approved.",
        });
        toast.success("Payment approved successfully.");
      } catch (error) {
        const text = getErrorMessage(error, "Unable to approve payment.");

        setMessage({
          type: "error",
          text,
        });
        toast.error(text);
      } finally {
        setProcessingId(null);
      }
    },
    [processingId],
  );

  const openRejectModal = useCallback(
    (payment: WorkerPaymentTransaction): void => {
      if (processingId !== null) {
        return;
      }

      setRejectionTransaction(payment);
      setRejectionReason("");
    },
    [processingId],
  );

  const handleReject = useCallback(async (): Promise<void> => {
    if (!rejectionTransaction || processingId !== null) {
      return;
    }

    const reason = rejectionReason.trim();

    if (!reason) {
      toast.info("Please provide a rejection reason.");
      return;
    }

    if (reason.length > 300) {
      toast.info("Rejection reason must contain 300 characters or fewer.");
      return;
    }

    const transaction = rejectionTransaction;

    try {
      setProcessingId(transaction.id);

      await rejectPaymentTransaction(transaction.id, reason);

      setPayments((current) =>
        current.filter((item) => item.id !== transaction.id),
      );
      setRejectionTransaction(null);
      setRejectionReason("");

      setMessage({
        type: "success",
        text: "Payment transaction rejected.",
      });
      toast.success("Payment rejected successfully.");
    } catch (error) {
      const text = getErrorMessage(error, "Unable to reject payment.");

      setMessage({
        type: "error",
        text,
      });
      toast.error(text);
    } finally {
      setProcessingId(null);
    }
  }, [processingId, rejectionReason, rejectionTransaction]);

  const copyReference = useCallback(async (reference: string) => {
    try {
      await navigator.clipboard.writeText(reference);
      toast.success("Reference copied.");
    } catch {
      toast.error("Unable to copy the reference.");
    }
  }, []);

  const openProof = useCallback((url: string): void => {
    setSelectedProof(url);
    setZoom(1);
    setRotation(0);
  }, []);

  return (
    <WorkerLayout>
      <main className="min-h-screen bg-slate-50 p-3 sm:p-6 lg:p-8 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl space-y-6">
          {message && (
            <div
              role={message.type === "error" ? "alert" : "status"}
              className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                message.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
              }`}
            >
              <div className="flex items-start gap-2">
                {message.type === "error" && (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>

              <button
                type="button"
                onClick={() => setMessage(null)}
                className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <header className="relative overflow-hidden rounded-2xl bg-linear-to-r from-blue-600 via-indigo-600 to-violet-700 p-5 text-white shadow-xl sm:rounded-3xl sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
                  Payment Verification
                </p>

                <h1 className="mt-2 text-2xl font-bold sm:text-4xl">
                  Payment Requests
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
                  Review customer payment submissions and verify proof of
                  payment securely.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={refreshing || !workerId}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/25 disabled:opacity-50 sm:w-auto"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />

                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="Pending"
              value={statistics.pending}
              icon={Clock3}
              iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
            />

            <StatCard
              label="Approved"
              value={statistics.approved}
              icon={CheckCircle2}
              iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
            />

            <StatCard
              label="Rejected"
              value={statistics.rejected}
              icon={XCircle}
              iconClassName="bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300"
            />

            <StatCard
              label="Pending Amount"
              value={formatCurrency(statistics.pendingAmount)}
              icon={Wallet}
              iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
              compact
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search customer, booking, or reference..."
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as PaymentFilter)
                }
                className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950"
              >
                <option value="All">All Requests</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </section>

          {loading ? (
            <section className="space-y-4">
              {Array.from({
                length: 4,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-96 animate-pulse rounded-2xl bg-slate-200 sm:rounded-3xl dark:bg-slate-800"
                />
              ))}
            </section>
          ) : paginatedPayments.length === 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm sm:rounded-3xl dark:border-slate-700 dark:bg-slate-900">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                <Wallet className="h-10 w-10" />
              </div>

              <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
                No Payment Requests
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                {search || filter !== "All"
                  ? "No payment requests match the current search or filter."
                  : "New customer payment submissions will appear here."}
              </p>
            </section>
          ) : (
            <section className="space-y-4 sm:space-y-6">
              {paginatedPayments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  processing={processingId === payment.id}
                  onApprove={() => void handleApprove(payment)}
                  onReject={() => openRejectModal(payment)}
                  onOpenProof={openProof}
                  onCopyReference={copyReference}
                />
              ))}
            </section>
          )}

          {!loading && filteredPayments.length > 0 && (
            <footer className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {(page - 1) * ITEMS_PER_PAGE + 1}
                </strong>
                –
                <strong className="text-slate-700 dark:text-slate-200">
                  {Math.min(page * ITEMS_PER_PAGE, filteredPayments.length)}
                </strong>{" "}
                of{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {filteredPayments.length}
                </strong>
              </p>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page === totalPages}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </footer>
          )}
        </div>
      </main>

      {rejectionTransaction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-payment-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setRejectionTransaction(null);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="reject-payment-title"
                  className="text-xl font-bold text-slate-900 dark:text-white"
                >
                  Reject Payment
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Explain why {formatCurrency(rejectionTransaction.amount)}{" "}
                  cannot be approved.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setRejectionTransaction(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close rejection dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Rejection reason
              </span>

              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                maxLength={300}
                rows={5}
                placeholder="Example: The uploaded receipt is unclear or the reference number does not match."
                className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-red-950"
              />

              <span className="mt-1 block text-right text-xs text-slate-400">
                {rejectionReason.length}/300
              </span>
            </label>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRejectionTransaction(null)}
                disabled={processingId !== null}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleReject()}
                disabled={processingId !== null || !rejectionReason.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processingId !== null && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Reject Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProof && (
        <ProofViewer
          url={selectedProof}
          zoom={zoom}
          rotation={rotation}
          onClose={() => setSelectedProof(null)}
          onZoomIn={() => setZoom((current) => Math.min(3, current + 0.2))}
          onZoomOut={() => setZoom((current) => Math.max(0.5, current - 0.2))}
          onRotate={() => setRotation((current) => (current + 90) % 360)}
          onReset={() => {
            setZoom(1);
            setRotation(0);
          }}
        />
      )}
    </WorkerLayout>
  );
}

function PaymentCard({
  payment,
  processing,
  onApprove,
  onReject,
  onOpenProof,
  onCopyReference,
}: {
  payment: WorkerPaymentTransaction;
  processing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onOpenProof: (url: string) => void;
  onCopyReference: (reference: string) => Promise<void>;
}) {
  const MethodIcon = getMethodIcon(payment.payment_method);
  const customerName = getCustomerName(payment);
  const booking = payment.payment?.booking;
  const isPending = payment.transaction_status === "Pending";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-lg sm:rounded-3xl sm:p-7 dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <CustomerAvatar customer={payment.payment?.customer ?? null} />

          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
              {customerName}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Booking #{payment.booking_id}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${getStatusClass(
            payment.transaction_status,
          )}`}
        >
          {payment.transaction_status === "Approved" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : payment.transaction_status === "Rejected" ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <Clock3 className="h-4 w-4" />
          )}

          {payment.transaction_status}
        </span>
      </header>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1.15fr_1fr]">
        <div className="space-y-4 rounded-2xl bg-slate-50 p-4 sm:p-5 dark:bg-slate-800/50">
          <InfoRow
            icon={<Wallet className="h-4 w-4" />}
            label="Amount"
            value={formatCurrency(payment.amount)}
          />

          <InfoRow
            icon={<MethodIcon className="h-4 w-4" />}
            label="Payment Method"
            value={payment.payment_method || "Not provided"}
          />

          <InfoRow
            icon={<CalendarDays className="h-4 w-4" />}
            label="Booking Schedule"
            value={formatDate(booking?.booking_date, booking?.booking_time)}
          />

          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="Address"
            value={booking?.address || "Address unavailable"}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white">
            Proof of Payment
          </h3>

          <div className="mt-4">
            {payment.proof_of_payment ? (
              isImageProof(payment.proof_of_payment) ? (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenProof(payment.proof_of_payment!)}
                    className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <img
                      src={payment.proof_of_payment}
                      alt={`Payment proof from ${customerName}`}
                      className="h-56 w-full object-contain transition hover:scale-[1.02]"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenProof(payment.proof_of_payment!)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4" />
                    View Full Image
                  </button>
                </>
              ) : (
                <a
                  href={payment.proof_of_payment}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Eye className="h-4 w-4" />
                  Open Payment Document
                </a>
              )
            ) : payment.payment_method === "Cash" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                Cash payments do not require an uploaded proof.
              </div>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                No proof of payment was uploaded.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl bg-slate-50 p-4 sm:p-5 dark:bg-slate-800/50">
          <InfoRow
            icon={<CreditCard className="h-4 w-4" />}
            label="Method"
            value={payment.payment_method || "Not provided"}
          />

          <InfoRow
            icon={<Copy className="h-4 w-4" />}
            label="Reference Number"
            value={
              payment.reference_number ? (
                <button
                  type="button"
                  onClick={() =>
                    void onCopyReference(payment.reference_number!)
                  }
                  className="break-all text-left font-semibold text-blue-600 hover:underline dark:text-blue-300"
                >
                  {payment.reference_number}
                </button>
              ) : (
                "Not provided"
              )
            }
          />
        </div>
      </div>

      {isPending && (
        <footer className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
          <button
            type="button"
            onClick={onReject}
            disabled={processing}
            className="rounded-xl border border-red-300 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          >
            Reject
          </button>

          <button
            type="button"
            onClick={onApprove}
            disabled={processing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Approve
          </button>
        </footer>
      )}
    </article>
  );
}

function CustomerAvatar({
  customer,
}: {
  customer: WorkerPaymentRelation["customer"];
}) {
  const [imageError, setImageError] = useState(false);

  const profilePicture =
    customer?.profile_picture?.trim() ||
    customer?.profile_image?.trim() ||
    customer?.avatar_url?.trim() ||
    null;

  const fullName = [
    customer?.first_name,
    customer?.middle_name,
    customer?.last_name,
    customer?.suffix,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");

  const initials =
    `${customer?.first_name?.trim().charAt(0) ?? ""}${
      customer?.last_name?.trim().charAt(0) ?? ""
    }`.toUpperCase() || "C";

  useEffect(() => {
    setImageError(false);
  }, [profilePicture]);

  if (profilePicture && !imageError) {
    return (
      <img
        src={profilePicture}
        alt={`${fullName || "Customer"} profile`}
        loading="lazy"
        onError={() => setImageError(true)}
        className="h-14 w-14 shrink-0 rounded-full border border-slate-200 bg-slate-100 object-cover sm:h-16 sm:w-16 dark:border-slate-700 dark:bg-slate-800"
      />
    );
  }

  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-base font-bold text-blue-600 sm:h-16 sm:w-16 dark:bg-blue-500/15 dark:text-blue-300"
      aria-label={`${fullName || "Customer"} profile fallback`}
    >
      {initials || <UserRound className="h-6 w-6" />}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>

        <div className="mt-1 wrap-break-word text-sm font-semibold text-slate-800 dark:text-slate-200">
          {value}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  compact = false,
}: {
  label: string;
  value: string | number;
  icon: typeof Wallet;
  iconClassName: string;
  compact?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">
            {label}
          </p>

          <p
            className={`mt-2 truncate font-bold text-slate-900 dark:text-white ${
              compact ? "text-xl sm:text-3xl" : "text-2xl sm:text-4xl"
            }`}
          >
            {value}
          </p>
        </div>

        <div className={`hidden rounded-xl p-2.5 sm:block ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function ProofViewer({
  url,
  zoom,
  rotation,
  onClose,
  onZoomIn,
  onZoomOut,
  onRotate,
  onReset,
}: {
  url: string;
  zoom: number;
  rotation: number;
  onClose: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onReset: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-60 flex flex-col bg-slate-950/95"
      role="dialog"
      aria-modal="true"
      aria-label="Payment proof viewer"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          <ViewerButton label="Zoom in" onClick={onZoomIn}>
            <ZoomIn className="h-5 w-5" />
          </ViewerButton>

          <ViewerButton label="Zoom out" onClick={onZoomOut}>
            <ZoomOut className="h-5 w-5" />
          </ViewerButton>

          <ViewerButton label="Rotate" onClick={onRotate}>
            <RotateCcw className="h-5 w-5" />
          </ViewerButton>

          <ViewerButton label="Reset" onClick={onReset}>
            Reset
          </ViewerButton>
        </div>

        <ViewerButton label="Close viewer" onClick={onClose}>
          <X className="h-5 w-5" />
        </ViewerButton>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto p-4 sm:p-8">
        <img
          src={url}
          alt="Payment proof enlarged"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
          className="max-h-[75vh] max-w-full rounded-xl object-contain transition-transform duration-200"
        />
      </div>
    </div>
  );
}

function ViewerButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/20"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}