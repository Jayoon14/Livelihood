import { useEffect, useMemo, useState } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  Wallet,
  CreditCard,
  Banknote,
  Landmark,
  Copy,
  Eye,
  Calendar,
  MapPin,
  User,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";

import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";

import {
  approvePaymentTransaction,
  getWorkerPaymentTransactions,
  rejectPaymentTransaction,
} from "../../../services/paymentService";

type PaymentTransaction = {
  id: number;
  payment_id: number;
  booking_id: number;

  amount: number | string;

  payment_method: string | null;

  reference_number: string | null;

  proof_of_payment: string | null;

  transaction_status: string;

  payment?: {
    id: number;

    booking_id: number;

    customer?: {
      first_name?: string | null;
      last_name?: string | null;
    };

    booking?: {
      booking_date?: string | null;
      booking_time?: string | null;
      address?: string | null;
    };
  };
};

export default function PaymentRequests() {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);

  const [loading, setLoading] = useState(true);

  const [processingId, setProcessingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("All");

  /* IMAGE VIEWER */

  const [selectedImage, setSelectedImage] = useState("");

  const [zoom, setZoom] = useState(1);

  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const data = await getWorkerPaymentTransactions(user.id);

      setPayments((data ?? []) as PaymentTransaction[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  /* =====================
      APPROVE
  ====================== */

  async function handleApprove(payment: PaymentTransaction) {
    if (!confirm(`Approve ₱${formatCurrency(payment.amount)}?`)) {
      return;
    }

    try {
      setProcessingId(payment.id);

      await approvePaymentTransaction(payment.id);

      await loadPayments();

      alert("Payment approved successfully.");
    } catch (error) {
      console.error(error);

      alert("Unable to approve payment.");
    } finally {
      setProcessingId(null);
    }
  }

  /* =====================
      REJECT
  ====================== */

  async function handleReject(payment: PaymentTransaction) {
    if (!confirm(`Reject ₱${formatCurrency(payment.amount)}?`)) {
      return;
    }

    const reason = prompt("Reason for rejection?") ?? "";

    try {
      setProcessingId(payment.id);

      await rejectPaymentTransaction(payment.id, reason);

      await loadPayments();

      alert("Payment rejected successfully.");
    } catch (error) {
      console.error(error);

      alert("Unable to reject payment.");
    } finally {
      setProcessingId(null);
    }
  }

  /* =====================
      HELPERS
  ====================== */

  function formatCurrency(value: number | string) {
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
    }).format(Number(value) || 0);
  }

  function customerName(payment: PaymentTransaction) {
    return `${payment.payment?.customer?.first_name ?? ""} ${
      payment.payment?.customer?.last_name ?? ""
    }`.trim();
  }

  function copyReference(reference: string) {
    navigator.clipboard.writeText(reference);

    alert("Reference copied.");
  }

  /* =====================
      FILTERS
  ====================== */

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const customer = customerName(payment).toLowerCase();

      const searchMatch = customer.includes(search.toLowerCase());

      const filterMatch =
        filter === "All" ||
        payment.payment_method === filter ||
        payment.transaction_status === filter;

      return searchMatch && filterMatch;
    });
  }, [payments, search, filter]);

  /* =====================
      DASHBOARD
  ====================== */

  const totalPending = payments.filter(
    (p) => p.transaction_status === "Pending",
  ).length;

  const totalApproved = payments.filter(
    (p) => p.transaction_status === "Approved",
  ).length;

  const totalRejected = payments.filter(
    (p) => p.transaction_status === "Rejected",
  ).length;

  const totalAmount = payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0,
  );
  return (
    <WorkerLayout>
      <div className="space-y-8 p-8">
        {/* HERO */}

        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold">Payment Requests</h1>

          <p className="mt-3 max-w-3xl text-blue-100">
            Review customer payment submissions, verify proof of payment, and
            approve or reject transactions securely.
          </p>
        </div>

        {/* DASHBOARD */}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>

                <h2 className="mt-2 text-4xl font-bold text-amber-500">
                  {totalPending}
                </h2>
              </div>

              <div className="rounded-2xl bg-amber-100 p-4">
                <Clock3 size={30} className="text-amber-600" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>

                <h2 className="mt-2 text-4xl font-bold text-green-600">
                  {totalApproved}
                </h2>
              </div>

              <div className="rounded-2xl bg-green-100 p-4">
                <CheckCircle2 size={30} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejected</p>

                <h2 className="mt-2 text-4xl font-bold text-red-600">
                  {totalRejected}
                </h2>
              </div>

              <div className="rounded-2xl bg-red-100 p-4">
                <XCircle size={30} className="text-red-600" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>

                <h2 className="mt-2 text-3xl font-bold text-blue-600">
                  ₱{formatCurrency(totalAmount)}
                </h2>
              </div>

              <div className="rounded-2xl bg-blue-100 p-4">
                <Wallet size={30} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH */}

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={18}
                className="absolute left-4 top-4 text-gray-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer..."
                className="h-12 w-full rounded-xl border pl-11 pr-4 outline-none focus:border-blue-600"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-12 rounded-xl border px-4 outline-none"
            >
              <option>All</option>

              <option>Pending</option>

              <option>Approved</option>

              <option>Rejected</option>

              <option>Cash</option>

              <option>GCash</option>

              <option>Maya</option>

              <option>Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* LOADING */}

        {loading && (
          <div className="rounded-3xl bg-white p-20 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

            <p className="mt-6 text-gray-500">Loading payment requests...</p>
          </div>
        )}

        {/* EMPTY */}

        {!loading && filteredPayments.length === 0 && (
          <div className="rounded-3xl bg-white py-24 text-center shadow-sm">
            <Wallet size={60} className="mx-auto text-gray-300" />

            <h2 className="mt-6 text-2xl font-bold">No Payment Requests</h2>

            <p className="mt-3 text-gray-500">
              Customer payment submissions will appear here.
            </p>
          </div>
        )}

        {/* PAYMENT CARDS */}

        {!loading && filteredPayments.length > 0 && (
          <div className="space-y-6">
            {filteredPayments.map((payment) => {
              const processing = processingId === payment.id;

              return (
                <div
                  key={payment.id}
                  className="rounded-3xl border bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  {/* HEADER */}

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                        <User size={30} className="text-blue-600" />
                      </div>

                      <div>
                        <h2 className="text-xl font-bold">
                          {customerName(payment)}
                        </h2>

                        <p className="text-gray-500">
                          Booking #{payment.booking_id}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={payment.transaction_status} />
                  </div>

                  {/* CONTENT */}

                  <div className="mt-8 grid gap-8 lg:grid-cols-3">
                    {/* CUSTOMER */}

                    <div className="space-y-4 rounded-2xl bg-gray-50 p-5">
                      <InfoRow
                        icon={<Wallet size={18} />}
                        label="Amount"
                        value={`₱${formatCurrency(payment.amount)}`}
                      />

                      <InfoRow
                        icon={<CreditCard size={18} />}
                        label="Payment"
                        value={payment.payment_method ?? "-"}
                      />

                      <InfoRow
                        icon={<Calendar size={18} />}
                        label="Booking"
                        value={payment.payment?.booking?.booking_date ?? "-"}
                      />

                      <InfoRow
                        icon={<MapPin size={18} />}
                        label="Address"
                        value={payment.payment?.booking?.address ?? "-"}
                      />
                    </div>
                    {/* PROOF OF PAYMENT */}

                    <div className="rounded-2xl border bg-gray-50 p-5">
                      <h3 className="mb-4 text-lg font-bold">
                        Proof of Payment
                      </h3>

                      {payment.proof_of_payment ? (
                        <>
                          <img
                            src={payment.proof_of_payment}
                            alt="Proof"
                            onClick={() => {
                              setSelectedImage(payment.proof_of_payment!);

                              setZoom(1);

                              setRotation(0);
                            }}
                            className="h-64 w-full cursor-pointer rounded-xl border object-contain transition hover:scale-[1.02]"
                          />

                          <button
                            onClick={() => {
                              setSelectedImage(payment.proof_of_payment!);

                              setZoom(1);

                              setRotation(0);
                            }}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
                          >
                            <Eye size={18} />
                            View Full Image
                          </button>
                        </>
                      ) : payment.payment_method === "Cash" ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-700">
                          Cash payments do not require proof of payment.
                        </div>
                      ) : (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-600">
                          No proof of payment uploaded.
                        </div>
                      )}
                    </div>

                    {/* DETAILS */}

                    <div className="space-y-4 rounded-2xl bg-gray-50 p-5">
                      <InfoRow
                        icon={<CreditCard size={18} />}
                        label="Method"
                        value={
                          <PaymentMethodBadge
                            method={payment.payment_method ?? "-"}
                          />
                        }
                      />

                      <InfoRow
                        icon={<Copy size={18} />}
                        label="Reference"
                        value={
                          payment.reference_number ? (
                            <button
                              onClick={() =>
                                copyReference(payment.reference_number!)
                              }
                              className="font-semibold text-blue-600 hover:underline"
                            >
                              {payment.reference_number}
                            </button>
                          ) : (
                            "-"
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* ACTIONS */}

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      disabled={processing}
                      onClick={() => {
                        void handleReject(payment);
                      }}
                      className="rounded-xl border border-red-300 bg-red-50 px-6 py-3 font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      {processing ? "Processing..." : "Reject"}
                    </button>

                    <button
                      disabled={processing}
                      onClick={() => {
                        void handleApprove(payment);
                      }}
                      className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 font-semibold text-white shadow transition hover:shadow-lg disabled:opacity-50"
                    >
                      {processing ? "Processing..." : "Approve"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* IMAGE VIEWER */}

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <button
            onClick={() => setSelectedImage("")}
            className="absolute right-6 top-6 rounded-full bg-white p-2"
          >
            <X />
          </button>

          <div className="absolute left-6 top-6 flex gap-3">
            <button
              onClick={() => setZoom((z) => z + 0.2)}
              className="rounded-xl bg-white p-3"
            >
              <ZoomIn />
            </button>

            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
              className="rounded-xl bg-white p-3"
            >
              <ZoomOut />
            </button>

            <button
              onClick={() => setRotation((r) => r + 90)}
              className="rounded-xl bg-white p-3"
            >
              <RotateCw />
            </button>
          </div>

          <img
            src={selectedImage}
            alt="Proof"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl transition-all duration-300"
          />
        </div>
      )}
    </WorkerLayout>
  );
}

/* ==========================
   STATUS BADGE
========================== */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-700",

    Approved: "bg-green-100 text-green-700",

    Rejected: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-4 py-2 text-sm font-bold ${
        styles[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

/* ==========================
   INFO ROW
========================== */

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
      <div className="mt-1 text-blue-600">{icon}</div>

      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>

        <div className="font-semibold text-gray-800">{value}</div>
      </div>
    </div>
  );
}

/* ==========================
   PAYMENT METHOD
========================== */

function PaymentMethodBadge({ method }: { method: string }) {
  const styles: Record<
    string,
    {
      className: string;
      icon: React.ReactNode;
    }
  > = {
    Cash: {
      className: "bg-green-100 text-green-700",
      icon: <Banknote size={16} />,
    },

    GCash: {
      className: "bg-blue-100 text-blue-700",
      icon: <Wallet size={16} />,
    },

    Maya: {
      className: "bg-emerald-100 text-emerald-700",
      icon: <CreditCard size={16} />,
    },

    "Bank Transfer": {
      className: "bg-purple-100 text-purple-700",
      icon: <Landmark size={16} />,
    },
  };

  const current = styles[method] ?? {
    className: "bg-gray-100 text-gray-700",
    icon: <CreditCard size={16} />,
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${current.className}`}
    >
      {current.icon}
      {method}
    </span>
  );
}
