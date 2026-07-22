import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  FileImage,
  Loader2,
  MapPin,
  PhilippinePeso,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  UploadCloud,
  WalletCards,
  X,
} from "lucide-react";

import CustomerLayout from "../../../layouts/CustomerLayout";

import { supabase } from "../../../lib/supabase";

import { getBookingById } from "../../../services/bookingService";

import {
  createPaymentSummary,
  createPaymentTransaction,
  getPaymentByBooking,
  getPaymentTransactionSummary,
  uploadPaymentProof,
} from "../../../services/paymentService";

import { getWorkerPaymentInformation } from "../../../services/paymentInformationService";

type PaymentMethod = "Cash" | "GCash" | "Maya" | "Bank Transfer";

type PaymentSummary = {
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
  remainingBalance: number;
  isFullyPaid: boolean;
};

type SuccessDetails = {
  amount: number;
  projectedRemaining: number;
  method: PaymentMethod;
};

const paymentMethods: Array<{
  value: PaymentMethod;
  title: string;
  description: string;
  icon: typeof Banknote;
}> = [
  {
    value: "Cash",
    title: "Cash",
    description: "Pay the worker directly",
    icon: Banknote,
  },
  {
    value: "GCash",
    title: "GCash",
    description: "Pay using your GCash wallet",
    icon: Smartphone,
  },
  {
    value: "Maya",
    title: "Maya",
    description: "Pay through Maya",
    icon: WalletCards,
  },
  {
    value: "Bank Transfer",
    title: "Bank Transfer",
    description: "Send payment through a bank",
    icon: Building2,
  },
];

export default function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [method, setMethod] = useState<PaymentMethod>("Cash");

  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [booking, setBooking] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [existingPayment, setExistingPayment] = useState<any>(null);

  const [summary, setSummary] = useState<PaymentSummary | null>(null);

  const [proof, setProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState("");

  const [referenceNumber, setReferenceNumber] = useState("");
  const [paidAmount, setPaidAmount] = useState<number>(0);

  const [errorMessage, setErrorMessage] = useState("");
  const [successDetails, setSuccessDetails] = useState<SuccessDetails | null>(
    null,
  );

  useEffect(() => {
    void loadData();
  }, [id]);

  useEffect(() => {
    if (!proof) {
      setProofPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(proof);
    setProofPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [proof]);

  async function loadData() {
    if (!id) {
      setErrorMessage("Booking ID is missing.");
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      setErrorMessage("");

      const bookingData = await getBookingById(Number(id));
      setBooking(bookingData);

      const [paymentData, currentPayment] = await Promise.all([
        getWorkerPaymentInformation(bookingData.worker_id).catch(() => null),
        getPaymentByBooking(Number(id)),
      ]);

      setPaymentInfo(paymentData);
      setExistingPayment(currentPayment);

      if (currentPayment) {
        const currentSummary = await getPaymentTransactionSummary(
          Number(currentPayment.id),
        );

        setSummary(currentSummary);

        const available =
          currentSummary.remainingBalance - currentSummary.pendingAmount;

        setPaidAmount(Math.max(available, 0));
      } else {
        const totalAmount = Number(bookingData.price ?? 0);

        setSummary({
          totalAmount,
          approvedAmount: 0,
          pendingAmount: 0,
          remainingBalance: totalAmount,
          isFullyPaid: false,
        });

        setPaidAmount(totalAmount);
      }
    } catch (error: any) {
      console.error("Payment load error:", error);

      setErrorMessage(
        error?.message || "Unable to load the payment information.",
      );
    } finally {
      setPageLoading(false);
    }
  }

  const totalAmount = Number(summary?.totalAmount ?? booking?.price ?? 0);

  const approvedAmount = Number(summary?.approvedAmount ?? 0);
  const pendingAmount = Number(summary?.pendingAmount ?? 0);
  const remainingBalance = Number(summary?.remainingBalance ?? totalAmount);

  const availableToPay = useMemo(() => {
    return Math.max(remainingBalance - pendingAmount, 0);
  }, [remainingBalance, pendingAmount]);

  const projectedRemaining = useMemo(() => {
    return Math.max(availableToPay - Number(paidAmount || 0), 0);
  }, [availableToPay, paidAmount]);

  const amountExceedsBalance = Number(paidAmount || 0) > availableToPay;

  const isMethodAvailable = (paymentMethod: PaymentMethod) => {
    if (paymentMethod === "Cash") return true;
    if (paymentMethod === "GCash") return Boolean(paymentInfo?.enable_gcash);
    if (paymentMethod === "Maya") return Boolean(paymentInfo?.enable_maya);
    if (paymentMethod === "Bank Transfer") {
      return Boolean(paymentInfo?.enable_bank);
    }

    return false;
  };

  const selectedMethodAvailable = isMethodAvailable(method);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  function formatDate(value?: string) {
    if (!value) return "Not specified";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }

  function getWorkerName() {
    const worker =
      booking?.worker ?? booking?.worker_profile ?? booking?.profiles ?? null;

    const fullName = [
      worker?.first_name,
      worker?.middle_name,
      worker?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    return (
      fullName ||
      booking?.worker_name ||
      paymentInfo?.account_name ||
      "Assigned worker"
    );
  }

  function getServiceName() {
    return (
      booking?.services?.service_name ||
      booking?.service?.service_name ||
      booking?.service_name ||
      "Booked service"
    );
  }

  function resetOnlineFields() {
    setReferenceNumber("");
    setProof(null);
    setProofPreview("");
  }

  function selectPaymentMethod(paymentMethod: PaymentMethod) {
    if (!isMethodAvailable(paymentMethod)) return;

    setMethod(paymentMethod);
    setErrorMessage("");

    if (paymentMethod === "Cash") {
      resetOnlineFields();
    }
  }

  async function copyText(value?: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }

  function validatePayment() {
    const amount = Number(paidAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Please enter a valid payment amount.");
    }

    if (availableToPay <= 0) {
      throw new Error("There is no available balance to pay at this time.");
    }

    if (amount > availableToPay) {
      throw new Error(
        `Your payment cannot exceed the available balance of ${formatCurrency(
          availableToPay,
        )}.`,
      );
    }

    if (!selectedMethodAvailable) {
      throw new Error(`${method} is not available for this worker.`);
    }

    if (method !== "Cash") {
      if (!referenceNumber.trim()) {
        throw new Error("Please enter the transaction reference number.");
      }

      if (!proof) {
        throw new Error("Please upload your proof of payment.");
      }
    }
  }

  async function handlePay() {
    if (!id || !booking) return;

    try {
      setSubmitting(true);
      setErrorMessage("");

      validatePayment();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("You must be signed in to submit a payment.");
      }

      let proofUrl = "";

      if (method !== "Cash" && proof) {
        proofUrl = await uploadPaymentProof(proof, user.id);
      }

      let paymentRecord = existingPayment;

      /*
       * Kapag wala pang payment summary para sa booking,
       * gagawa muna tayo ng isang summary record.
       *
       * Zero muna ang amount_paid dahil ang actual payment
       * ay ise-save sa payment_transactions at kailangan pang
       * ma-approve ng worker.
       */
      if (!paymentRecord) {
        paymentRecord = await createPaymentSummary(
          Number(booking.id),
          user.id,
          booking.worker_id,
          Number(booking.price),
        );

        setExistingPayment(paymentRecord);
      }

      await createPaymentTransaction(
        Number(paymentRecord.id),
        Number(booking.id),
        Number(paidAmount),
        method,
        method === "Cash" ? "" : referenceNumber.trim(),
        proofUrl,
      );

      const newProjectedRemaining = Math.max(
        availableToPay - Number(paidAmount),
        0,
      );

      setSuccessDetails({
        amount: Number(paidAmount),
        projectedRemaining: newProjectedRemaining,
        method,
      });

      await loadData();
    } catch (error: any) {
      console.error("Payment submission error:", error);

      setErrorMessage(error?.message || "Payment submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePayRemaining() {
    if (!successDetails) return;

    setSuccessDetails(null);
    setReferenceNumber("");
    setProof(null);

    const amount = Math.max(successDetails.projectedRemaining, 0);
    setPaidAmount(amount);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handlePayLater() {
    setSuccessDetails(null);
    navigate("/customer/payments");
  }

  if (pageLoading) {
    return (
      <CustomerLayout>
        <div className="flex min-h-[65vh] items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              Loading payment details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Please wait while we prepare your booking payment.
            </p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (!booking) {
    return (
      <CustomerLayout>
        <div className="mx-auto max-w-xl px-4 py-12">
          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <X className="h-7 w-7 text-red-600" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-900">
              Payment page unavailable
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              {errorMessage || "The booking could not be found."}
            </p>

            <button
              type="button"
              onClick={() => navigate("/customer/bookings")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Bookings
            </button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Page heading */}
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                Payment Center
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Complete your payment
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Choose a payment method, enter the amount you want to pay, and
                submit it for worker verification.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Secure payment submission
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              <X className="mt-0.5 h-5 w-5 shrink-0" />

              <div className="flex-1">
                <p className="font-bold">Unable to continue</p>
                <p className="mt-1">{errorMessage}</p>
              </div>

              <button
                type="button"
                onClick={() => setErrorMessage("")}
                className="rounded-lg p-1 transition hover:bg-red-100"
                aria-label="Close error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {summary?.isFullyPaid ? (
            <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>

              <h2 className="mt-5 text-2xl font-black text-slate-950">
                This booking is fully paid
              </h2>

              <p className="mt-2 text-slate-500">
                No remaining payment is required for this booking.
              </p>

              <button
                type="button"
                onClick={() => navigate("/customer/payments")}
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <ReceiptText className="h-4 w-4" />
                View Payment History
              </button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
              {/* Left column */}
              <div className="space-y-6">
                {/* Booking summary */}
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
                        <ReceiptText className="h-5 w-5 text-blue-600" />
                      </div>

                      <div>
                        <h2 className="font-black text-slate-950">
                          Booking Summary
                        </h2>
                        <p className="text-sm text-slate-500">
                          Booking #{booking.id}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 p-6">
                    <BookingDetail
                      icon={CreditCard}
                      label="Service"
                      value={getServiceName()}
                    />

                    <BookingDetail
                      icon={ShieldCheck}
                      label="Worker"
                      value={getWorkerName()}
                    />

                    <BookingDetail
                      icon={CalendarDays}
                      label="Booking Date"
                      value={formatDate(booking.booking_date)}
                    />

                    <BookingDetail
                      icon={Clock3}
                      label="Booking Time"
                      value={booking.booking_time || "Not specified"}
                    />

                    <BookingDetail
                      icon={MapPin}
                      label="Service Address"
                      value={booking.address || "Not specified"}
                    />
                  </div>

                  <div className="border-t border-slate-100 bg-slate-50 p-6">
                    <div className="space-y-3">
                      <AmountRow
                        label="Total service amount"
                        value={formatCurrency(totalAmount)}
                      />

                      <AmountRow
                        label="Approved payments"
                        value={formatCurrency(approvedAmount)}
                        valueClassName="text-emerald-600"
                      />

                      <AmountRow
                        label="Pending verification"
                        value={formatCurrency(pendingAmount)}
                        valueClassName="text-amber-600"
                      />

                      <div className="my-4 border-t border-dashed border-slate-300" />

                      <AmountRow
                        label="Available balance"
                        value={formatCurrency(availableToPay)}
                        large
                      />
                    </div>
                  </div>
                </section>

                {/* Payment preview */}
                <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                      <PhilippinePeso className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="font-black">Payment Preview</h2>
                      <p className="text-sm text-slate-400">
                        Estimated balance after this transaction
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <DarkSummaryCard
                      label="Current Payment"
                      value={formatCurrency(paidAmount)}
                    />

                    <DarkSummaryCard
                      label="Projected Balance"
                      value={formatCurrency(projectedRemaining)}
                    />
                  </div>

                  {pendingAmount > 0 && (
                    <p className="mt-4 rounded-2xl bg-amber-400/10 px-4 py-3 text-xs leading-5 text-amber-200">
                      Pending payments are already deducted from the available
                      amount to prevent duplicate or excess submissions.
                    </p>
                  )}
                </section>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                {/* Payment methods */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Choose a payment method
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Only methods enabled by the worker can be selected.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {paymentMethods.map((item) => {
                      const Icon = item.icon;
                      const available = isMethodAvailable(item.value);
                      const active = method === item.value;

                      return (
                        <button
                          key={item.value}
                          type="button"
                          disabled={!available}
                          onClick={() => selectPaymentMethod(item.value)}
                          className={[
                            "relative flex min-h-28 items-start gap-4 rounded-2xl border p-4 text-left transition",
                            active
                              ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                            !available ? "cursor-not-allowed opacity-45" : "",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                              active
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600",
                            ].join(" ")}
                          >
                            <Icon className="h-5 w-5" />
                          </span>

                          <span>
                            <span className="block font-black text-slate-950">
                              {item.title}
                            </span>

                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                              {available
                                ? item.description
                                : "Not enabled by worker"}
                            </span>
                          </span>

                          {active && (
                            <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Payment account information */}
                <PaymentAccountCard
                  method={method}
                  paymentInfo={paymentInfo}
                  copyText={copyText}
                />

                {/* Payment form */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50">
                      <CreditCard className="h-5 w-5 text-violet-600" />
                    </div>

                    <div>
                      <h2 className="font-black text-slate-950">
                        Payment Details
                      </h2>

                      <p className="text-sm text-slate-500">
                        Enter the amount for this transaction.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label
                          htmlFor="paidAmount"
                          className="text-sm font-bold text-slate-700"
                        >
                          Amount to Pay
                        </label>

                        <button
                          type="button"
                          onClick={() => setPaidAmount(availableToPay)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                          Pay full balance
                        </button>
                      </div>

                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                          ₱
                        </span>

                        <input
                          id="paidAmount"
                          type="number"
                          min="1"
                          max={availableToPay}
                          step="0.01"
                          value={paidAmount || ""}
                          onChange={(event) =>
                            setPaidAmount(Number(event.target.value))
                          }
                          placeholder="0.00"
                          className={[
                            "w-full rounded-2xl border bg-white py-4 pl-9 pr-4 text-lg font-black text-slate-950 outline-none transition",
                            amountExceedsBalance
                              ? "border-red-400 ring-4 ring-red-50"
                              : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50",
                          ].join(" ")}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span
                          className={
                            amountExceedsBalance
                              ? "font-semibold text-red-600"
                              : "text-slate-500"
                          }
                        >
                          {amountExceedsBalance
                            ? "Amount exceeds your available balance."
                            : `Maximum payment: ${formatCurrency(
                                availableToPay,
                              )}`}
                        </span>

                        <span className="font-bold text-slate-700">
                          Remaining: {formatCurrency(projectedRemaining)}
                        </span>
                      </div>
                    </div>

                    {method !== "Cash" && (
                      <>
                        <div>
                          <label
                            htmlFor="referenceNumber"
                            className="mb-2 block text-sm font-bold text-slate-700"
                          >
                            Reference Number
                          </label>

                          <input
                            id="referenceNumber"
                            value={referenceNumber}
                            onChange={(event) =>
                              setReferenceNumber(event.target.value)
                            }
                            placeholder="Enter transaction reference number"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-bold text-slate-700">
                            Proof of Payment
                          </label>

                          <label className="group block cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-blue-400 hover:bg-blue-50/40">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) =>
                                setProof(event.target.files?.[0] || null)
                              }
                            />

                            {proofPreview ? (
                              <div className="relative">
                                <img
                                  src={proofPreview}
                                  alt="Payment proof preview"
                                  className="h-56 w-full object-contain p-3"
                                />

                                <div className="border-t border-slate-200 bg-white px-4 py-3">
                                  <p className="truncate text-sm font-bold text-slate-800">
                                    {proof?.name}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    Click to replace the selected file
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex min-h-48 flex-col items-center justify-center px-6 py-8 text-center">
                                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                                  <UploadCloud className="h-6 w-6 text-blue-600" />
                                </span>

                                <p className="mt-4 font-black text-slate-900">
                                  Upload payment screenshot
                                </p>

                                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                                  Select a clear image showing the payment
                                  amount and reference number.
                                </p>

                                <span className="mt-4 rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-600 shadow-sm">
                                  Choose image
                                </span>
                              </div>
                            )}
                          </label>
                        </div>
                      </>
                    )}

                    {method === "Cash" && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                          <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                          <div>
                            <p className="font-black text-amber-900">
                              Cash payment confirmation
                            </p>

                            <p className="mt-1 text-sm leading-6 text-amber-800">
                              Give the entered amount directly to the worker.
                              The payment will remain pending until the worker
                              confirms that it was received.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handlePay}
                      disabled={
                        submitting ||
                        amountExceedsBalance ||
                        paidAmount <= 0 ||
                        availableToPay <= 0 ||
                        !selectedMethodAvailable
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing payment...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-5 w-5" />
                          Submit {formatCurrency(paidAmount)} Payment
                        </>
                      )}
                    </button>

                    <p className="text-center text-xs leading-5 text-slate-400">
                      By submitting, you confirm that the information entered
                      above is correct.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success modal */}
      {successDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>

            <div className="mt-5 text-center">
              <h2 className="text-2xl font-black text-slate-950">
                Payment submitted
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your {successDetails.method} transaction was submitted and is
                waiting for worker verification.
              </p>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <AmountRow
                label="Submitted amount"
                value={formatCurrency(successDetails.amount)}
              />

              <div className="my-3 border-t border-dashed border-slate-300" />

              <AmountRow
                label="Available after submission"
                value={formatCurrency(successDetails.projectedRemaining)}
                large
              />
            </div>

            {successDetails.projectedRemaining > 0 ? (
              <div className="mt-6 space-y-3">
                <p className="text-center text-sm text-slate-500">
                  You may submit another payment for the remaining balance or
                  finish it later.
                </p>

                <button
                  type="button"
                  onClick={handlePayRemaining}
                  className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-700"
                >
                  Pay Remaining Balance
                </button>

                <button
                  type="button"
                  onClick={handlePayLater}
                  className="w-full rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Pay Later
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePayLater}
                className="mt-6 w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-black text-white transition hover:bg-slate-800"
              >
                View Payment History
              </button>
            )}
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}

function BookingDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
        <Icon className="h-4 w-4 text-slate-600" />
      </span>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-bold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function AmountRow({
  label,
  value,
  large = false,
  valueClassName = "text-slate-950",
}: {
  label: string;
  value: string;
  large?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          large
            ? "font-black text-slate-950"
            : "text-sm font-medium text-slate-500"
        }
      >
        {label}
      </span>

      <span
        className={[
          large ? "text-xl font-black" : "text-sm font-black",
          valueClassName,
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function DarkSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function PaymentAccountCard({
  method,
  paymentInfo,
  copyText,
}: {
  method: PaymentMethod;
  paymentInfo: any;
  copyText: (value?: string) => Promise<void>;
}) {
  if (method === "Cash") {
    return null;
  }

  let title = "";
  let accountName = "";
  let accountNumber = "";
  let secondaryLabel = "";
  let secondaryValue = "";
  let qrCode = "";

  if (method === "GCash") {
    title = "GCash Account";
    accountName = paymentInfo?.gcash_name || "";
    accountNumber = paymentInfo?.gcash_number || "";
    qrCode = paymentInfo?.gcash_qr || "";
  }

  if (method === "Maya") {
    title = "Maya Account";
    accountName = paymentInfo?.maya_name || "";
    accountNumber = paymentInfo?.maya_number || "";
    qrCode = paymentInfo?.maya_qr || "";
  }

  if (method === "Bank Transfer") {
    title = paymentInfo?.bank_name || "Bank Transfer";
    accountName = paymentInfo?.account_name || "";
    accountNumber = paymentInfo?.account_number || "";
    secondaryLabel = "Bank";
    secondaryValue = paymentInfo?.bank_name || "";
    qrCode = paymentInfo?.bank_qr || "";
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="font-black text-slate-950">{title}</h2>

        <p className="mt-1 text-sm text-slate-500">
          Send your payment using the account details below.
        </p>
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          {secondaryValue && (
            <AccountDetail label={secondaryLabel} value={secondaryValue} />
          )}

          <AccountDetail label="Account Name" value={accountName} />

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Account Number
            </p>

            <div className="mt-2 flex items-center gap-2">
              <p className="min-w-0 flex-1 break-all rounded-xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-900">
                {accountNumber || "Not provided"}
              </p>

              {accountNumber && (
                <button
                  type="button"
                  onClick={() => void copyText(accountNumber)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                  aria-label="Copy account number"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {qrCode && (
          <div className="flex justify-center sm:justify-end">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <img
                src={qrCode}
                alt={`${method} QR code`}
                className="h-48 w-48 rounded-xl object-contain"
              />

              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500">
                <FileImage className="h-3.5 w-3.5" />
                Scan to pay
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function AccountDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-slate-900">
        {value || "Not provided"}
      </p>
    </div>
  );
}
