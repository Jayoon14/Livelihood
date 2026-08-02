import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  ImageIcon,
  Loader2,
  RefreshCw,
  RotateCcw,
  UserRound,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { confirmAction } from "../../../components/ui/confirmAction";
import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import {
  confirmCompletedWork,
  requestCompletionRevision,
} from "../../../services/completionWorkflowService";

interface WorkerProfile {
  id?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
  email?: string | null;
  profile_picture?: string | null;
}

interface CompletionBooking {
  id: number;
  customer_id: string;
  worker_id: string;
  status: string;
  trip_status?: string | null;
  completion_status?: string | null;
  payment_status?: string | null;
  completed_at?: string | null;
  worker?: WorkerProfile | null;
}

interface CompletionProofRecord {
  id: number;
  booking_id: number;
  worker_id: string;
  summary?: string | null;
  notes?: string | null;
  hours_worked?: number | string | null;
  created_at?: string | null;
}

interface CompletionImage {
  id?: number;
  proof_id: number;
  image_url: string;
}

type PageMessage = {
  type: "error" | "success";
  text: string;
} | null;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (
      error as {
        message: string;
      }
    ).message.trim();

    if (message) {
      return message;
    }
  }

  return "An unexpected error occurred.";
}

function getWorkerName(worker?: WorkerProfile | null): string {
  if (!worker) {
    return "Worker";
  }

  const fullName = [
    worker.first_name,
    worker.middle_name,
    worker.last_name,
    worker.suffix,
  ]
    .filter(
      (part): part is string =>
        typeof part === "string" &&
        part.trim().length > 0,
    )
    .map((part) => part.trim())
    .join(" ");

  return fullName || worker.email || "Worker";
}

function getWorkerInitials(
  worker?: WorkerProfile | null,
): string {
  const first = worker?.first_name?.trim().charAt(0) ?? "";
  const last = worker?.last_name?.trim().charAt(0) ?? "";

  return `${first}${last}`.toUpperCase() || "W";
}

function formatHours(
  value?: number | string | null,
): string {
  const hours = Number(value);

  if (!Number.isFinite(hours) || hours <= 0) {
    return "Not specified";
  }

  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

function formatSubmittedDate(
  value?: string | null,
): string {
  if (!value) {
    return "Submission date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function CompletionProof() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const parsedBookingId = useMemo(() => {
    const value = Number(bookingId);

    return Number.isInteger(value) && value > 0
      ? value
      : null;
  }, [bookingId]);

  const [booking, setBooking] =
    useState<CompletionBooking | null>(null);

  const [proof, setProof] =
    useState<CompletionProofRecord | null>(null);

  const [images, setImages] = useState<
    CompletionImage[]
  >([]);

  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);

  const [revisionReason, setRevisionReason] =
    useState("");

  const [showRevisionForm, setShowRevisionForm] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [processingAction, setProcessingAction] =
    useState<"accept" | "revision" | null>(null);

  const [message, setMessage] =
    useState<PageMessage>(null);

  const loadProof = useCallback(
    async (refresh = false): Promise<void> => {
      if (!parsedBookingId) {
        setMessage({
          type: "error",
          text: "Invalid booking ID.",
        });

        setLoading(false);
        return;
      }

      try {
        refresh
          ? setRefreshing(true)
          : setLoading(true);

        setMessage(null);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw new Error(
            `Unable to verify your session: ${authError.message}`,
          );
        }

        if (!user) {
          throw new Error(
            "Your session has expired. Please sign in again.",
          );
        }

        const {
          data: bookingData,
          error: bookingError,
        } = await supabase
          .from("bookings")
          .select(
            `
              id,
              customer_id,
              worker_id,
              status,
              trip_status,
              completion_status,
              payment_status,
              completed_at,
              worker:profiles!worker_id(
                id,
                first_name,
                middle_name,
                last_name,
                suffix,
                email,
                profile_picture
              )
            `,
          )
          .eq("id", parsedBookingId)
          .eq("customer_id", user.id)
          .eq("is_deleted", false)
          .maybeSingle();

        if (bookingError) {
          throw new Error(
            `Unable to load booking: ${bookingError.message}`,
          );
        }

        if (!bookingData) {
          throw new Error(
            "The booking was not found or does not belong to your account.",
          );
        }

        const normalizedBooking =
          bookingData as unknown as CompletionBooking;

        const {
          data: proofData,
          error: proofError,
        } = await supabase
          .from("booking_completion_proofs")
          .select(
            `
              id,
              booking_id,
              worker_id,
              summary,
              notes,
              hours_worked,
              created_at
            `,
          )
          .eq("booking_id", parsedBookingId)
          .eq(
            "worker_id",
            normalizedBooking.worker_id,
          )
          .maybeSingle();

        if (proofError) {
          throw new Error(
            `Unable to load completion proof: ${proofError.message}`,
          );
        }

        if (!proofData) {
          throw new Error(
            "The worker has not submitted completion proof for this booking.",
          );
        }

        const normalizedProof =
          proofData as CompletionProofRecord;

        const {
          data: imageData,
          error: imagesError,
        } = await supabase
          .from("booking_completion_images")
          .select(
            `
              id,
              proof_id,
              image_url
            `,
          )
          .eq("proof_id", normalizedProof.id)
          .order("id", {
            ascending: true,
          });

        if (imagesError) {
          throw new Error(
            `Unable to load completion images: ${imagesError.message}`,
          );
        }

        setBooking(normalizedBooking);
        setProof(normalizedProof);
        setImages(
          (imageData ?? []) as CompletionImage[],
        );
      } catch (error) {
        console.error(
          "Load completion proof error:",
          error,
        );

        setBooking(null);
        setProof(null);
        setImages([]);

        setMessage({
          type: "error",
          text: getErrorMessage(error),
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [parsedBookingId],
  );

  useEffect(() => {
    if (!parsedBookingId) {
      void loadProof();
      return;
    }

    let mounted = true;

    void loadProof();

    const channel = supabase
      .channel(`customer-completion-proof-${parsedBookingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${parsedBookingId}`,
        },
        () => {
          if (mounted) {
            void loadProof(true);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_completion_proofs",
          filter: `booking_id=eq.${parsedBookingId}`,
        },
        () => {
          if (mounted) {
            void loadProof(true);
          }
        },
      )
      .subscribe((subscriptionStatus) => {
        if (!mounted) {
          return;
        }

        if (subscriptionStatus === "CHANNEL_ERROR") {
          console.error(
            "Customer completion proof realtime channel error.",
          );
        }

        if (subscriptionStatus === "TIMED_OUT") {
          console.error(
            "Customer completion proof realtime connection timed out.",
          );
        }
      });

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [loadProof, parsedBookingId]);

  useEffect(() => {
    if (!proof?.id) {
      return;
    }

    let mounted = true;

    const channel = supabase
      .channel(`customer-completion-images-${proof.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_completion_images",
          filter: `proof_id=eq.${proof.id}`,
        },
        () => {
          if (mounted) {
            void loadProof(true);
          }
        },
      )
      .subscribe((subscriptionStatus) => {
        if (!mounted) {
          return;
        }

        if (subscriptionStatus === "CHANNEL_ERROR") {
          console.error(
            "Customer completion images realtime channel error.",
          );
        }

        if (subscriptionStatus === "TIMED_OUT") {
          console.error(
            "Customer completion images realtime connection timed out.",
          );
        }
      });

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [loadProof, proof?.id]);

  useEffect(() => {
    if (!selectedImage) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleEscape(
      event: KeyboardEvent,
    ): void {
      if (event.key === "Escape") {
        setSelectedImage(null);
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [selectedImage]);

  async function acceptWork(): Promise<void> {
    if (
      !parsedBookingId ||
      !booking ||
      processingAction
    ) {
      return;
    }

    if (
      booking.completion_status ===
      "Customer Confirmed"
    ) {
      toast.info(
        "This completed work has already been confirmed.",
      );

      return;
    }

    const confirmed = await confirmAction(
      "Confirm that the worker completed the service satisfactorily?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingAction("accept");
      setMessage(null);

      const result = await confirmCompletedWork(
        parsedBookingId,
        booking.worker_id,
      );

      toast.success(
        "Completed work confirmed successfully.",
      );

      const isPaid =
        String(result.paymentStatus ?? "")
          .trim()
          .toLowerCase() === "paid";

      navigate(
        isPaid
          ? `/customer/review/${parsedBookingId}`
          : `/customer/payment/${parsedBookingId}`,
        {
          replace: true,
          state: {
            message: isPaid
              ? "You may now leave a review."
              : "Please complete payment before leaving a review.",
          },
        },
      );
    } catch (error) {
      console.error(
        "Confirm work error:",
        error,
      );

      const errorMessage =
        getErrorMessage(error);

      setMessage({
        type: "error",
        text: errorMessage,
      });

      toast.error(errorMessage);
    } finally {
      setProcessingAction(null);
    }
  }

  async function requestRevision(): Promise<void> {
    if (
      !parsedBookingId ||
      !booking ||
      !proof ||
      processingAction
    ) {
      return;
    }

    const normalizedReason =
      revisionReason.trim();

    if (normalizedReason.length < 10) {
      toast.warning(
        "Please explain the requested revision using at least 10 characters.",
      );

      return;
    }

    if (normalizedReason.length > 500) {
      toast.warning(
        "Revision reason must not exceed 500 characters.",
      );

      return;
    }

    const confirmed = await confirmAction(
      "Send this revision request to the worker?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingAction("revision");
      setMessage(null);

      await requestCompletionRevision(
        parsedBookingId,
        booking.worker_id,
        proof.id,
        normalizedReason,
        proof.notes,
      );

      toast.success(
        "Revision request sent to the worker.",
      );

      navigate("/customer/bookings", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Request revision error:",
        error,
      );

      const errorMessage =
        getErrorMessage(error);

      setMessage({
        type: "error",
        text: errorMessage,
      });

      toast.error(errorMessage);
    } finally {
      setProcessingAction(null);
    }
  }

  const workerName = getWorkerName(
    booking?.worker,
  );

  const alreadyConfirmed =
    booking?.completion_status ===
    "Customer Confirmed";

  const canReview =
    ["Waiting Customer Confirmation", "Completed"].includes(
      booking?.status ?? "",
    ) &&
    booking?.completion_status ===
      "Worker Completed";

  return (
    <CustomerLayout>
      <main className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-8 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() =>
                navigate("/customer/bookings")
              }
              disabled={
                processingAction !== null
              }
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Bookings
            </button>

            <button
              type="button"
              onClick={() =>
                void loadProof(true)
              }
              disabled={
                refreshing ||
                loading ||
                processingAction !== null
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          {message && (
            <div
              role={
                message.type === "error"
                  ? "alert"
                  : "status"
              }
              className={`flex items-start justify-between gap-4 rounded-2xl border p-4 ${
                message.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              <div className="flex items-start gap-3">
                {message.type === "error" ? (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                )}

                <p className="text-sm font-medium leading-6">
                  {message.text}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMessage(null)}
                aria-label="Dismiss message"
                className="rounded-lg p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {loading ? (
            <section className="flex min-h-105 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />

              <h1 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                Loading completion proof
              </h1>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Please wait while we retrieve the
                submitted work.
              </p>
            </section>
          ) : !booking || !proof ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500" />

              <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
                Completion proof unavailable
              </h1>

              <p className="mx-auto mt-2 max-w-lg text-slate-500 dark:text-slate-400">
                The proof may not have been submitted,
                or the booking is not available to your
                account.
              </p>
            </section>
          ) : (
            <>
              <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-blue-700 via-blue-600 to-cyan-500 p-5 text-white shadow-xl sm:p-8">
                <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10" />

                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
                      Booking #{booking.id}
                    </p>

                    <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
                      Job Completion Proof
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                      Review the worker&apos;s submitted
                      summary, hours, notes, and completion
                      images.
                    </p>
                  </div>

                  <span
                    className={`self-start rounded-full px-4 py-2 text-sm font-bold ${
                      alreadyConfirmed
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-white/20 text-white"
                    }`}
                  >
                    {alreadyConfirmed
                      ? "Customer Confirmed"
                      : booking.completion_status ||
                        "Pending Review"}
                  </span>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  {booking.worker
                    ?.profile_picture ? (
                    <img
                      src={
                        booking.worker
                          .profile_picture
                      }
                      alt={workerName}
                      className="h-24 w-24 rounded-3xl border-4 border-white object-cover shadow-lg"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-100 text-3xl font-bold text-blue-700 shadow-lg dark:bg-blue-500/15 dark:text-blue-300">
                      {getWorkerInitials(
                        booking.worker,
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-300">
                      Service Worker
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
                      {workerName}
                    </h2>

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Submitted{" "}
                      {formatSubmittedDate(
                        proof.created_at,
                      )}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-5 lg:grid-cols-3">
                <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 sm:p-7 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                      <FileText className="h-5 w-5" />
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Work Summary
                    </h2>
                  </div>

                  <p className="mt-5 whitespace-pre-wrap wrap-break-word rounded-2xl bg-slate-50 p-5 leading-7 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {proof.summary?.trim() ||
                      "No work summary submitted."}
                  </p>
                </article>

                <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      <Clock3 className="h-5 w-5" />
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Hours Worked
                    </h2>
                  </div>

                  <p className="mt-6 text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                    {formatHours(
                      proof.hours_worked,
                    )}
                  </p>
                </article>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Worker Notes
                  </h2>
                </div>

                <p className="mt-5 whitespace-pre-wrap wrap-break-word rounded-2xl bg-slate-50 p-5 leading-7 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {proof.notes?.trim() ||
                    "No additional notes submitted."}
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                    <ImageIcon className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      Completion Images
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Select an image to view it in full
                      size.
                    </p>
                  </div>
                </div>

                {images.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
                    <ImageIcon className="mx-auto h-10 w-10 text-slate-400" />

                    <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
                      No completion images available
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {images.map(
                      (image, index) => (
                        <button
                          key={
                            image.id ??
                            `${image.proof_id}-${index}`
                          }
                          type="button"
                          onClick={() =>
                            setSelectedImage(
                              image.image_url,
                            )
                          }
                          className="group relative aspect-4/3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                        >
                          <img
                            src={image.image_url}
                            alt={`Completion proof ${
                              index + 1
                            }`}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />

                          <span className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 text-left text-xs font-semibold text-white">
                            Image {index + 1}
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                )}
              </section>

              {alreadyConfirmed ? (
                <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-300" />

                  <h2 className="mt-4 text-xl font-bold text-emerald-900 dark:text-emerald-200">
                    Work already confirmed
                  </h2>

                  <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
                    You have already accepted this
                    completed service.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      const isPaid =
                        String(
                          booking.payment_status ?? "",
                        )
                          .trim()
                          .toLowerCase() === "paid";

                      navigate(
                        isPaid
                          ? `/customer/review/${booking.id}`
                          : `/customer/payment/${booking.id}`,
                      );
                    }}
                    className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
                  >
                    {String(
                      booking.payment_status ?? "",
                    )
                      .trim()
                      .toLowerCase() === "paid"
                      ? "Leave a Review"
                      : "Proceed to Payment"}
                  </button>
                </section>
              ) : canReview ? (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-700 dark:bg-slate-900">
                  {showRevisionForm && (
                    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                      <label
                        htmlFor="revision-reason"
                        className="font-bold text-amber-900 dark:text-amber-200"
                      >
                        Explain the requested revision
                      </label>

                      <textarea
                        id="revision-reason"
                        rows={4}
                        maxLength={500}
                        value={revisionReason}
                        disabled={
                          processingAction !== null
                        }
                        onChange={(event) =>
                          setRevisionReason(
                            event.target.value,
                          )
                        }
                        placeholder="Clearly describe what needs to be corrected or completed..."
                        className="mt-3 w-full resize-y rounded-2xl border border-amber-200 bg-white p-4 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60 dark:border-amber-800 dark:bg-slate-900 dark:text-white"
                      />

                      <p className="mt-2 text-right text-xs text-amber-700 dark:text-amber-300">
                        {revisionReason.length}/500
                      </p>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        void acceptWork()
                      }
                      disabled={
                        processingAction !== null
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {processingAction ===
                      "accept" ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}

                      Confirm Completed Work
                    </button>

                    {showRevisionForm ? (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowRevisionForm(
                              false,
                            );
                            setRevisionReason("");
                          }}
                          disabled={
                            processingAction !==
                            null
                          }
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-4 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void requestRevision()
                          }
                          disabled={
                            processingAction !==
                            null
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-4 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                        >
                          {processingAction ===
                          "revision" ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-5 w-5" />
                          )}

                          Send
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setShowRevisionForm(true)
                        }
                        disabled={
                          processingAction !== null
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-4 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RotateCcw className="h-5 w-5" />
                        Request Revision
                      </button>
                    )}
                  </div>
                </section>
              ) : (
                <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
                  <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />

                  <h2 className="mt-3 font-bold text-amber-900 dark:text-amber-200">
                    Proof cannot currently be reviewed
                  </h2>

                  <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
                    The booking must be marked as completed
                    by the worker before customer
                    confirmation is available.
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Completion image preview"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setSelectedImage(null);
            }
          }}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() =>
              setSelectedImage(null)
            }
            aria-label="Close image preview"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-red-600"
          >
            <X className="h-6 w-6" />
          </button>

          <img
            src={selectedImage}
            alt="Full-size completion proof"
            className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </CustomerLayout>
  );
}