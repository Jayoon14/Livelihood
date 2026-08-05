import { confirmAction } from "../../../components/ui/confirmAction";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import { cancelBooking } from "../../../services/bookingService";
import { createReview, hasReviewed } from "../../../services/reviewService";
import { addTrustedWorker } from "../../../services/trustedWorkerService";
import BookingTimeline from "../../../components/customer/BookingTimeline";
import {
  Calendar,
  Clock,
  MessageCircle,
  Eye,
  CreditCard,
  Receipt,
  RotateCcw,
  Trash2,
  Navigation,
  Star,
  X,
  Flag,
  FileText,
} from "lucide-react";
import {
  checkWorkerAvailability,
  getAvailableTimeSlots,
} from "../../../services/scheduleService";

import type { BookingAction, CompletionProofData, CompletionProofImage, CustomerBooking } from "./types";
import BookingFilters from "./components/BookingFilters";
import BookingsSkeleton from "./components/BookingsSkeleton";
import ProofImageGallery from "./components/ProofImageGallery";
import StatusBadge from "./components/StatusBadge";
import ReportCaseModal from "../../../components/reports/ReportCaseModal";
import { getMyActiveReportCasesForBookings } from "../../../services/caseReportService";
import type { ReportCase } from "../../../types/report";
import { formatBookingDate, formatBookingTime, formatDateTime } from "./utils/dateTime";

const ONLINE_TIMEOUT_MS = 2 * 60 * 1000;

function isRecentLastSeen(lastSeen?: string | null): boolean {
  if (!lastSeen) return false;
  const timestamp = new Date(lastSeen).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp >= 0 && Date.now() - timestamp <= ONLINE_TIMEOUT_MS;
}

export default function Bookings() {
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<CustomerBooking | null>(null);
  const [completionProof, setCompletionProof] =
    useState<CompletionProofData | null>(null);
  const [loadingCompletionProof, setLoadingCompletionProof] = useState(false);
  const [completionProofError, setCompletionProofError] = useState("");
  const [receiptBooking, setReceiptBooking] = useState<CustomerBooking | null>(null);
  const [rebookBooking, setRebookBooking] = useState<CustomerBooking | null>(null);
  const [chatBooking, setChatBooking] = useState<CustomerBooking | null>(null);
  const [reviewBooking, setReviewBooking] = useState<CustomerBooking | null>(null);
  const [overallRating, setOverallRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [professionalismRating, setProfessionalismRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [rebookNotes, setRebookNotes] = useState("");
  const [rebookAddress, setRebookAddress] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [reportBooking, setReportBooking] = useState<{
    booking: CustomerBooking;
    type: "report" | "complaint";
  } | null>(null);
  const [activeCasesByBooking, setActiveCasesByBooking] = useState<
    Record<number, ReportCase[]>
  >({});

  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [activeAction, setActiveAction] = useState<{
    type: BookingAction;
    bookingId: number;
  } | null>(null);

  const isActionLoading = useCallback(
    (type: BookingAction, bookingId: number) =>
      activeAction?.type === type && activeAction.bookingId === bookingId,
    [activeAction],
  );

  const navigate = useNavigate();

  useEffect(() => {
    let isCancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialize() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (!user || isCancelled) {
          return;
        }

        await loadBookings();

        if (isCancelled) {
          return;
        }

        const newChannel = supabase
          .channel(`customer-bookings-${user.id}-${crypto.randomUUID()}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "bookings",
              filter: `customer_id=eq.${user.id}`,
            },
            () => {
              if (!isCancelled) {
                void loadBookings();
              }
            },
          );

        channel = newChannel;

        channel.subscribe((status) => {
          console.log("Customer bookings realtime status:", status);
        });
      } catch (error) {
        if (!isCancelled) {
          console.error("Initialize customer bookings realtime error:", error);
        }
      }
    }

    void initialize();

    return () => {
      isCancelled = true;

      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, []);

  const loadBookings = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        setBookings([]);
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          worker:profiles!bookings_worker_id_fkey(
            first_name,
            middle_name,
            last_name,
            profile_picture
          ),
          services(
            service_name
          )
      `,
        )
        .eq("customer_id", user.id)
        .eq("customer_deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const updated = await Promise.all(
        (data ?? []).map(async (booking) => ({
          ...booking,
          reviewed: await hasReviewed(booking.id, user.id),
        })),
      );

      const normalizedBookings = updated as CustomerBooking[];
      setBookings(normalizedBookings);

      try {
        const cases = await getMyActiveReportCasesForBookings(
          normalizedBookings.map((booking) => booking.id),
        );

        const grouped = cases.reduce<Record<number, ReportCase[]>>(
          (current, item) => {
            current[item.booking_id] = [
              ...(current[item.booking_id] ?? []),
              item,
            ];
            return current;
          },
          {},
        );

        setActiveCasesByBooking(grouped);
      } catch (caseError) {
        console.error("Load active report cases error:", caseError);
        setActiveCasesByBooking({});
      }
    } catch (error) {
      console.error("Load customer bookings error:", error);
      toast.error("Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredBookings = useMemo(() => [...bookings]
    .filter((booking) => {
      const workerName = [
        booking.worker?.first_name,
        booking.worker?.middle_name,
        booking.worker?.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        workerName.includes(search.toLowerCase()) ||
        booking.status.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || booking.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "Oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

        case "Upcoming":
          return (
            new Date(a.booking_date).getTime() -
            new Date(b.booking_date).getTime()
          );

        case "Completed":
          if (a.status === "Completed" && b.status !== "Completed") return -1;
          if (a.status !== "Completed" && b.status === "Completed") return 1;
          return 0;

        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    }), [bookings, search, sortBy, statusFilter]);
  function formatCompletionDate(value?: string | null): string {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  }

  async function openBookingDetails(booking: CustomerBooking) {
    setSelectedBooking(booking);
    setCompletionProof(null);
    setCompletionProofError("");

    const shouldLoadProof =
      booking.status === "Completed" ||
      booking.status === "Waiting Customer Confirmation" ||
      booking.completion_status === "Worker Completed" ||
      booking.completion_status === "Customer Confirmed";

    if (!shouldLoadProof) {
      setLoadingCompletionProof(false);
      return;
    }

    try {
      setLoadingCompletionProof(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("Please sign in again.");
      }

      const { data: proof, error: proofError } = await supabase
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
        .eq("booking_id", booking.id)
        .maybeSingle();

      if (proofError) {
        throw proofError;
      }

      if (!proof) {
        setCompletionProofError(
          "No completion proof has been submitted for this booking.",
        );
        return;
      }

      const { data: images, error: imagesError } = await supabase
        .from("booking_completion_images")
        .select("id, image_url")
        .eq("proof_id", proof.id)
        .order("id", { ascending: true });

      if (imagesError) {
        throw imagesError;
      }

      setCompletionProof({
        ...(proof as Omit<CompletionProofData, "images">),
        images: (images ?? []) as CompletionProofImage[],
      });
    } catch (error) {
      console.error("Load completion proof error:", error);

      setCompletionProofError(
        error instanceof Error
          ? error.message
          : "Unable to load the completion proof.",
      );
    } finally {
      setLoadingCompletionProof(false);
    }
  }

  function closeBookingDetails() {
    setSelectedBooking(null);
    setCompletionProof(null);
    setCompletionProofError("");
    setLoadingCompletionProof(false);
  }

  async function handleCancel(id: number) {
    if (activeAction) return;

    const confirmCancel = await confirmAction(
      "Are you sure you want to cancel this booking?",
    );
    if (!confirmCancel) return;

    setActiveAction({ type: "cancel", bookingId: id });
    try {
      await cancelBooking(id);
      toast.success("Booking cancelled successfully.");
      await loadBookings();
    } catch (error) {
      console.error(error);
      toast.error("Unable to cancel booking.");
    } finally {
      setActiveAction(null);
    }
  }

  async function handleDelete(id: number) {
    if (activeAction) return;

    const confirmDelete = await confirmAction(
      "Delete this booking from your history?",
    );

    if (!confirmDelete) return;

    setActiveAction({ type: "delete", bookingId: id });
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Auth error:", userError);
        toast.error(userError.message);
        return;
      }

      if (!user) {
        toast.warning("Please log in first.");
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .update({
          customer_deleted: true,
        })
        .eq("id", id)
        .eq("customer_id", user.id)
        .select("id, customer_id, customer_deleted");

      console.log("Delete result:", {
        data,
        error,
        bookingId: id,
        userId: user.id,
      });

      if (error) {
        console.error("Delete error:", error);
        toast.error(`Unable to delete: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        toast.error(
          "Booking was not updated. The database policy may be blocking the request.",
        );
        return;
      }

      setBookings((currentBookings) =>
        currentBookings.filter((booking) => booking.id !== id),
      );

      toast.success("Booking removed from your list.");
    } catch (error) {
      console.error("Unexpected delete error:", error);

      const message =
        error instanceof Error ? error.message : "Unknown error occurred.";

      toast.error(`Unable to delete booking: ${message}`);
    } finally {
      setActiveAction(null);
    }
  }

  function openReviewModal(booking: CustomerBooking) {
    if (booking.status !== "Completed") {
      toast.warning("Only completed bookings can be reviewed.");
      return;
    }

    if (booking.payment_status !== "Paid") {
      toast.warning("Please complete the payment before leaving a review.");
      navigate(`/customer/payment/${booking.id}`);
      return;
    }

    if (booking.reviewed) {
      toast.info("A review has already been submitted for this booking.");
      return;
    }

    setReviewBooking(booking);
    setOverallRating(0);
    setQualityRating(0);
    setProfessionalismRating(0);
    setCommunicationRating(0);
    setReviewComment("");
  }

  function closeReviewModal() {
    if (reviewBooking && isActionLoading("review", reviewBooking.id)) return;

    setReviewBooking(null);
    setOverallRating(0);
    setQualityRating(0);
    setProfessionalismRating(0);
    setCommunicationRating(0);
    setReviewComment("");
  }

  async function handleSubmitReview() {
    if (!reviewBooking || activeAction) return;

    if (
      overallRating < 1 ||
      qualityRating < 1 ||
      professionalismRating < 1 ||
      communicationRating < 1
    ) {
      toast.warning("Please select a rating for every category.");
      return;
    }

    setActiveAction({ type: "review", bookingId: reviewBooking.id });

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      await createReview(
        reviewBooking.id,
        reviewBooking.worker_id,
        user.id,
        overallRating,
        qualityRating,
        professionalismRating,
        communicationRating,
        reviewComment,
      );

      await addTrustedWorker(
        user.id,
        reviewBooking.worker_id,
        reviewBooking.id,
      );

      toast.success("Review submitted successfully!");
      setReviewBooking(null);
      setOverallRating(0);
      setQualityRating(0);
      setProfessionalismRating(0);
      setCommunicationRating(0);
      setReviewComment("");
      await loadBookings();
    } catch (error) {
      console.error("Submit review error:", error);
      toast.error(
        error instanceof Error ? error.message : "Unable to submit review.",
      );
    } finally {
      setActiveAction(null);
    }
  }

  async function handleConfirmRebook() {
    if (!rebookBooking || activeAction) return;
    if (!preferredDate || !preferredTime) {
      toast.warning("Choose an available date and time first.");
      return;
    }
    if (!rebookAddress.trim()) {
      toast.warning("Service address is required.");
      return;
    }

    setActiveAction({ type: "rebook", bookingId: rebookBooking.id });
    try {
      const { data: workerProfile, error } = await supabase
        .from("profiles")
        .select("last_seen")
        .eq("id", rebookBooking.worker_id)
        .eq("role", "worker")
        .maybeSingle();

      if (error) throw error;
      if (!isRecentLastSeen(workerProfile?.last_seen)) {
        toast.warning("This worker is currently offline. Please try again when the worker is online.");
        return;
      }

      navigate(`/customer/book/${rebookBooking.worker_id}`, {
        state: {
          serviceId: rebookBooking.service_id,
          preferredDate,
          preferredTime,
          notes: rebookNotes.trim(),
          address: rebookAddress.trim(),
          latitude: rebookBooking.customer_latitude ?? rebookBooking.latitude ?? null,
          longitude: rebookBooking.customer_longitude ?? rebookBooking.longitude ?? null,
          customerLatitude: rebookBooking.customer_latitude ?? rebookBooking.latitude ?? null,
          customerLongitude: rebookBooking.customer_longitude ?? rebookBooking.longitude ?? null,
          confirmedLocation: Boolean(
            (rebookBooking.customer_latitude ?? rebookBooking.latitude) != null &&
              (rebookBooking.customer_longitude ?? rebookBooking.longitude) != null,
          ),
          sourceBookingId: rebookBooking.id,
        },
      });
    } catch (error) {
      console.error("Rebook validation error:", error);
      toast.error("Unable to validate this worker right now.");
    } finally {
      setActiveAction(null);
    }
  }


  return (
    <CustomerLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Bookings ({bookings.length})</h1>

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Manage Bookings</h2>
            <p className="mt-1 text-sm text-slate-500">Track schedules, completion proof, payment, and reviews in one place.</p>
          </div>
          <BookingFilters
            search={search}
            statusFilter={statusFilter}
            sortBy={sortBy}
            onSearchChange={setSearch}
            onStatusChange={setStatusFilter}
            onSortChange={setSortBy}
          />
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {loading ? (
            <BookingsSkeleton />
          ) : filteredBookings.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-6xl">📅</div>

              <h2 className="text-2xl font-bold mt-4">
                You don't have any bookings yet.
              </h2>

              <p className="text-gray-500 mt-2">
                Start by finding a worker and booking a service.
              </p>

              <button
                onClick={() => navigate("/customer/workers")}
                className="mt-5 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
              >
                Find Workers
              </button>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl border shadow-sm hover:shadow-lg transition"
                >
                  {/* HEADER */}

                  <div className="flex justify-between items-start border-b p-6">
                    <div className="flex items-center gap-4">
                      <img
                        src={
                          booking.worker?.profile_picture ||
                          "https://placehold.co/70x70"
                        }
                        alt="Worker"
                        className="w-16 h-16 rounded-full object-cover border"
                      />

                      <div>
                        <button
                          onClick={() =>
                            navigate(`/customer/workers/${booking.worker_id}`)
                          }
                          className="text-xl font-bold hover:text-blue-600"
                        >
                          {[
                            booking.worker?.first_name,
                            booking.worker?.middle_name,
                            booking.worker?.last_name,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </button>

                        <p className="text-gray-500 mt-1">
                          {booking.services?.service_name || "Service"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <StatusBadge status={booking.status} />

                      <p className="text-gray-400 mt-3 text-sm">Total Amount</p>

                      <h2 className="text-3xl font-bold text-blue-700">
                        ₱{booking.price ?? 0}
                      </h2>
                    </div>
                  </div>

                  {/* DETAILS */}
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-5 mt-5">
                      <div className="bg-gray-50 rounded-xl p-4 border">
                        <p className="flex items-center gap-2 text-gray-500 text-sm">
                          <Calendar size={18} />
                          Booking Date
                        </p>

                        <p className="font-semibold text-lg">
                          {formatBookingDate(booking.booking_date)}
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4 border">
                        <p className="flex items-center gap-2 text-gray-500 text-sm">
                          <Clock size={18} />
                          Booking Time
                        </p>
                        <p className="font-semibold text-lg">
                          {formatBookingTime(booking.booking_time)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <BookingTimeline status={booking.status} />
                    </div>

                    {/* ACTIONS */}
                    <div className="flex flex-wrap gap-3 mt-8">
                      {booking.status === "Pending" && (
                        <>
                          <span className="text-yellow-600 font-medium self-center">
                            Waiting...
                          </span>

                          <button
                            onClick={() => handleCancel(booking.id)}
                            disabled={Boolean(activeAction)}
                            className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl"
                          >
                            Cancel Booking
                          </button>
                        </>
                      )}

                      {booking.status === "Approved" && (
                        <>
                          <button
                            onClick={() =>
                              navigate(`/customer/tracking/${booking.id}`)
                            }
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
                          >
                            <Navigation size={18} />
                            Track Worker
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`/chat/${booking.id}`)}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl"
                          >
                            <MessageCircle size={18} />
                            Open Chat
                          </button>
                        </>
                      )}
                      {booking.status === "On Going" &&
                        booking.trip_status === "On Trip" && (
                          <button
                            onClick={() =>
                              navigate(`/customer/tracking/${booking.id}`)
                            }
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
                          >
                            <Navigation size={18} />
                            View Live Location
                          </button>
                        )}

                      {booking.status === "Waiting Customer Confirmation" && (
                        <button
                          onClick={() =>
                            navigate(`/customer/completion-proof/${booking.id}`)
                          }
                          className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl"
                        >
                          View Completion Proof
                        </button>
                      )}
                      {booking.status === "Completed" && (
                        <>
                          {booking.payment_status === "Paid" ? (
                            <button
                              onClick={() => {
                                setReceiptBooking(booking);
                              }}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl"
                            >
                              <Receipt size={18} />
                              Receipt
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                navigate(`/customer/payment/${booking.id}`)
                              }
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
                            >
                              <CreditCard size={18} />
                              Continue Payment
                            </button>
                          )}

                          {booking.payment_status === "Paid" && (
                            <>
                              {!booking.reviewed ? (
                                <button
                                  onClick={() => openReviewModal(booking)}
                                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-xl"
                                >
                                  Leave Review
                                </button>
                              ) : (
                                <span className="text-green-600 font-semibold self-center">
                                  ⭐ Review Submitted
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setRebookBooking(booking);

                                  setPreferredDate("");

                                  setPreferredTime("");

                                  setAvailableSlots([]);

                                  setAvailabilityMessage("");

                                  setRebookNotes("");

                                  setRebookAddress(booking.address || "");
                                }}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl"
                              >
                                <RotateCcw size={18} />
                                Rebook
                              </button>

                              {(activeCasesByBooking[booking.id] ?? []).length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => navigate("/customer/reports")}
                                  className="flex items-center gap-2 rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                                >
                                  <FileText size={18} />
                                  View Report
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReportBooking({
                                        booking,
                                        type: "report",
                                      })
                                    }
                                    className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
                                  >
                                    <Flag size={18} />
                                    Report Worker
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReportBooking({
                                        booking,
                                        type: "complaint",
                                      })
                                    }
                                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-white hover:bg-amber-600"
                                  >
                                    <FileText size={18} />
                                    File Complaint
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => void openBookingDetails(booking)}
                        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-5 py-3 rounded-xl"
                      >
                        <Eye size={18} />
                        View Details
                      </button>
                    </div>

                    {booking.status === "Cancelled" && (
                      <div className="mt-5">
                        <span className="text-red-600 font-semibold">
                          Booking Cancelled
                        </span>
                      </div>
                    )}

                    <div className="border-t mt-6 pt-4 flex justify-end">
                      <button
                        onClick={() => handleDelete(booking.id)}
                        disabled={Boolean(activeAction)}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold"
                      >
                        <Trash2 size={18} />
                        Delete Booking
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {reportBooking && (
        <ReportCaseModal
          open
          bookingId={reportBooking.booking.id}
          reportedUserId={reportBooking.booking.worker_id}
          reporterRole="customer"
          reportedRole="worker"
          reportedUserName={[
            reportBooking.booking.worker?.first_name,
            reportBooking.booking.worker?.middle_name,
            reportBooking.booking.worker?.last_name,
          ]
            .filter(Boolean)
            .join(" ") || "Worker"}
          defaultCaseType={reportBooking.type}
          onClose={() => setReportBooking(null)}
          onSubmitted={() => void loadBookings()}
        />
      )}

      {selectedBooking &&
        !receiptBooking &&
        !rebookBooking &&
        !chatBooking && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative">
              {/* Close */}
              <button
                onClick={closeBookingDetails}
                className="absolute top-5 right-6 text-4xl text-white hover:text-red-300 z-10"
              >
                ×
              </button>

              {/* Header */}
              <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-t-3xl p-8">
                <div className="flex items-center gap-6">
                  <img
                    src={
                      selectedBooking.worker?.profile_picture ||
                      "https://placehold.co/120x120"
                    }
                    className="w-28 h-28 rounded-full border-4 border-white object-cover shadow-lg"
                  />

                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-white">
                      {[
                        selectedBooking.worker?.first_name,
                        selectedBooking.worker?.middle_name,
                        selectedBooking.worker?.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </h2>

                    <p className="text-blue-100 text-lg mt-1">
                      {selectedBooking.services?.service_name ??
                        "Service unavailable"}
                    </p>

                    <StatusBadge status={selectedBooking.status} className="mt-4 bg-white" />
                  </div>
                </div>
              </div>

              {/* Body */}

              <div className="p-8 space-y-8">
                {/* Summary */}

                <div className="grid md:grid-cols-3 gap-5">
                  <div className="bg-blue-50 rounded-2xl border p-6">
                    <p className="text-gray-500 text-sm">Total Amount</p>

                    <h2 className="text-3xl font-bold text-blue-700 mt-2">
                      ₱{selectedBooking.price}
                    </h2>
                  </div>

                  <div className="bg-gray-50 rounded-2xl border p-6">
                    <p className="text-gray-500 text-sm">Booking Date</p>

                    <h3 className="text-xl font-semibold mt-2">
                      {formatBookingDate(selectedBooking.booking_date)}
                    </h3>
                  </div>

                  <div className="bg-gray-50 rounded-2xl border p-6">
                    <p className="text-gray-500 text-sm">Booking Time</p>

                    <h3 className="text-xl font-semibold mt-2">
                      {formatBookingTime(selectedBooking.booking_time)}
                    </h3>
                  </div>
                </div>

                {/* Address */}

                <div className="bg-gray-50 rounded-2xl border p-6">
                  <h3 className="font-bold text-lg mb-3">📍 Service Address</h3>

                  <p className="text-gray-700">{selectedBooking.address}</p>
                </div>

                {/* Notes */}

                <div className="bg-gray-50 rounded-2xl border p-6">
                  <h3 className="font-bold text-lg mb-3">📝 Customer Notes</h3>

                  <p className="text-gray-700">
                    {selectedBooking.notes || "No additional notes."}
                  </p>
                </div>

                {/* Completion Proof */}

                {(selectedBooking.status === "Completed" ||
                  selectedBooking.status ===
                    "Waiting Customer Confirmation" ||
                  selectedBooking.completion_status ===
                    "Worker Completed" ||
                  selectedBooking.completion_status ===
                    "Customer Confirmed") && (
                  <section className="space-y-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                          Worker Completion Proof
                        </p>

                        <h3 className="mt-1 text-2xl font-bold text-slate-900">
                          Completed Work Details
                        </h3>
                      </div>

                      {completionProof?.created_at && (
                        <span className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700">
                          Submitted{" "}
                          {formatCompletionDate(
                            completionProof.created_at,
                          )}
                        </span>
                      )}
                    </div>

                    {loadingCompletionProof ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                        Loading completion proof...
                      </div>
                    ) : completionProofError ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
                        {completionProofError}
                      </div>
                    ) : completionProof ? (
                      <>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="rounded-xl border border-slate-200 bg-white p-5 md:col-span-2">
                            <p className="text-sm font-semibold text-slate-500">
                              Work Summary
                            </p>

                            <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-800">
                              {completionProof.summary ||
                                "No work summary provided."}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <p className="text-sm font-semibold text-slate-500">
                              Hours Worked
                            </p>

                            <p className="mt-2 text-2xl font-bold text-blue-700">
                              {completionProof.hours_worked ?? "Not set"}
                              {completionProof.hours_worked != null
                                ? " hour(s)"
                                : ""}
                            </p>
                          </div>
                        </div>

                        {completionProof.notes && (
                          <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <p className="text-sm font-semibold text-slate-500">
                              Worker Notes
                            </p>

                            <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-800">
                              {completionProof.notes}
                            </p>
                          </div>
                        )}

                        <div>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h4 className="text-lg font-bold text-slate-900">
                              Proof Images
                            </h4>

                            <span className="text-sm font-medium text-slate-500">
                              {completionProof.images.length} image
                              {completionProof.images.length === 1
                                ? ""
                                : "s"}
                            </span>
                          </div>

                          <ProofImageGallery images={completionProof.images} />
                        </div>
                      </>
                    ) : null}
                  </section>
                )}

                {/* Booking Progress */}

                <div>
                  <h3 className="text-2xl font-bold mb-5">Booking Progress</h3>

                  <BookingTimeline status={selectedBooking.status} />
                </div>
              </div>
            </div>
          </div>
        )}
      {receiptBooking !== null && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl relative overflow-hidden">
            {/* Header */}

            <div className="bg-linear-to-r from-green-600 to-emerald-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold">Payment Receipt</h2>

                  <p className="opacity-90">Booking Receipt Summary</p>
                </div>

                <button
                  onClick={() => setReceiptBooking(null)}
                  className="text-4xl hover:text-red-300"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Body */}

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-500">Worker</p>

                  <h3 className="font-bold text-xl">
                    {[
                      receiptBooking.worker?.first_name,
                      receiptBooking.worker?.middle_name,
                      receiptBooking.worker?.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </h3>
                </div>

                <div>
                  <p className="text-gray-500">Service</p>

                  <h3 className="font-bold text-xl">
                    {receiptBooking.services?.service_name ??
                      "Service unavailable"}
                  </h3>
                </div>

                <div>
                  <p className="text-gray-500">Booking Date</p>

                  <h3 className="font-semibold">
                    {formatBookingDate(receiptBooking.booking_date)}
                  </h3>
                </div>

                <div>
                  <p className="text-gray-500">Booking Time</p>

                  <h3 className="font-semibold">
                    {formatBookingTime(receiptBooking.booking_time)}
                  </h3>
                </div>
              </div>

              <div className="border rounded-2xl p-6 bg-gray-50">
                <div className="flex justify-between">
                  <span>Service Fee</span>

                  <span>₱{receiptBooking.price}</span>
                </div>

                <div className="flex justify-between mt-3">
                  <span>Payment Status</span>

                  <span className="font-semibold text-green-600">
                    {receiptBooking.payment_status}
                  </span>
                </div>

                {(receiptBooking.payment_reference ||
                  receiptBooking.transaction_id ||
                  receiptBooking.payment_date) && (
                  <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                    {receiptBooking.payment_reference && (
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Payment Reference</span>
                        <span className="break-all text-right font-semibold">
                          {receiptBooking.payment_reference}
                        </span>
                      </div>
                    )}
                    {receiptBooking.transaction_id && (
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Transaction ID</span>
                        <span className="break-all text-right font-semibold">
                          {receiptBooking.transaction_id}
                        </span>
                      </div>
                    )}
                    {receiptBooking.payment_date && (
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Payment Date</span>
                        <span className="text-right font-semibold">
                          {formatDateTime(receiptBooking.payment_date)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t mt-5 pt-5 flex justify-between">
                  <span className="font-bold text-xl">Total Paid</span>

                  <span className="text-3xl font-bold text-green-600">
                    ₱{receiptBooking.price}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setReceiptBooking(null)}
                  className="px-6 py-3 rounded-xl border"
                >
                  Close
                </button>

                <button
                  onClick={() =>
                    navigate(`/customer/receipt/${receiptBooking.id}`)
                  }
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl"
                >
                  Open Full Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {reviewBooking && (
        <div
          className="fixed inset-0 z-90 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReviewModal();
          }}
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-amber-400 px-6 py-6 text-white sm:px-8">
              <div>
                <h2 className="text-3xl font-bold">Leave Review</h2>
                <p className="mt-1 text-base font-medium text-white/95">
                  Share your experience with this worker.
                </p>
              </div>

              <button
                type="button"
                onClick={closeReviewModal}
                disabled={isActionLoading("review", reviewBooking.id)}
                aria-label="Close review modal"
                className="rounded-full p-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={28} />
              </button>
            </div>

            <div className="space-y-7 p-6 sm:p-8">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">Reviewing</p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {[
                    reviewBooking.worker?.first_name,
                    reviewBooking.worker?.middle_name,
                    reviewBooking.worker?.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ") || "Worker"}
                </p>
                <p className="text-sm text-slate-600">
                  {reviewBooking.services?.service_name || "Service"}
                </p>
              </div>

              {[
                { label: "Overall Rating", value: overallRating, setter: setOverallRating },
                { label: "Quality of Work", value: qualityRating, setter: setQualityRating },
                { label: "Professionalism", value: professionalismRating, setter: setProfessionalismRating },
                { label: "Communication", value: communicationRating, setter: setCommunicationRating },
              ].map((category) => (
                <div key={category.label}>
                  <p className="mb-3 font-semibold text-slate-900">
                    {category.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => category.setter(star)}
                        disabled={isActionLoading("review", reviewBooking.id)}
                        aria-label={`${category.label}: ${star} star${star === 1 ? "" : "s"}`}
                        className="rounded-lg p-1 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Star
                          size={34}
                          className={
                            star <= category.value
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-700"
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <label
                  htmlFor="review-comment"
                  className="mb-3 block font-semibold text-slate-900"
                >
                  Comment
                </label>
                <textarea
                  id="review-comment"
                  rows={6}
                  maxLength={2000}
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  disabled={isActionLoading("review", reviewBooking.id)}
                  placeholder="Tell us about your experience..."
                  className="w-full resize-y rounded-2xl border border-slate-300 px-4 py-4 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 disabled:bg-slate-100"
                />
                <p className="mt-2 text-right text-xs text-slate-500">
                  {reviewComment.length}/2000
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeReviewModal}
                  disabled={isActionLoading("review", reviewBooking.id)}
                  className="rounded-xl border border-slate-300 px-7 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void handleSubmitReview()}
                  disabled={isActionLoading("review", reviewBooking.id)}
                  className="rounded-xl bg-amber-400 px-8 py-3 font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isActionLoading("review", reviewBooking.id)
                    ? "Submitting..."
                    : "Submit Review"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {chatBooking && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setChatBooking(null);
            }
          }}
        >
          <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[94vh] sm:rounded-[28px] sm:border sm:border-white/20">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={
                    chatBooking.worker?.profile_picture ||
                    "https://placehold.co/80x80?text=Worker"
                  }
                  alt="Worker"
                  className="h-11 w-11 rounded-full border border-slate-200 object-cover"
                />

                <div className="min-w-0">
                  <h2 className="truncate font-bold text-slate-900">
                    {[
                      chatBooking.worker?.first_name,
                      chatBooking.worker?.middle_name,
                      chatBooking.worker?.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ") || "Worker"}
                  </h2>

                  <p className="truncate text-xs text-slate-500">
                    Booking #{chatBooking.id} ·{" "}
                    {chatBooking.services?.service_name || "Service"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setChatBooking(null)}
                aria-label="Close chat"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl leading-none text-slate-600 transition hover:bg-red-50 hover:text-red-600"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 bg-slate-100">
              <iframe
                src={`/chat/${chatBooking.id}`}
                title={`Chat for booking ${chatBooking.id}`}
                className="h-full w-full border-0"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </div>
        </div>
      )}
      {rebookBooking && (
        <div className="fixed inset-0 z-80 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">
            {/* HEADER */}

            <div className="bg-linear-to-r from-indigo-600 to-blue-600 p-7 text-white">
              <div className="flex items-center gap-5">
                <img
                  src={
                    rebookBooking.worker?.profile_picture ||
                    "https://placehold.co/100x100"
                  }
                  className="w-20 h-20 rounded-full border-4 border-white object-cover"
                />

                <div>
                  <h2 className="text-3xl font-bold">Rebook Service</h2>

                  <p className="opacity-90">
                    {[
                      rebookBooking.worker?.first_name,
                      rebookBooking.worker?.middle_name,
                      rebookBooking.worker?.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                </div>
              </div>
            </div>

            {/* BODY */}

            <div className="p-8 space-y-6">
              <div className="bg-gray-50 rounded-2xl border p-5">
                <h3 className="font-semibold mb-2">Previous Service</h3>

                <p>
                  {rebookBooking.services?.service_name ??
                    "Service unavailable"}
                </p>

                <p className="text-blue-600 font-bold mt-2">
                  ₱{rebookBooking.price}
                </p>
              </div>

              <div>
                <label className="font-medium">Preferred Date</label>

                <input
                  type="date"
                  value={preferredDate}
                  onChange={async (e) => {
                    const date = e.target.value;

                    setPreferredDate(date);

                    // reset muna kapag nagpalit ng date
                    setPreferredTime("");

                    setAvailableSlots([]);

                    setAvailabilityMessage("");

                    if (!date) return;

                    // check kung available si worker sa date na ito
                    const availability = await checkWorkerAvailability(
                      rebookBooking.worker_id,
                      date,
                    );

                    if (availability.available === false) {
                      setAvailabilityMessage(availability.reason);

                      return;
                    }

                    // kunin available time slots
                    const slots = await getAvailableTimeSlots(
                      rebookBooking.worker_id,
                      date,
                    );

                    setAvailableSlots(slots);
                  }}
                  className="
                    w-full
                    mt-2
                    border
                    border-gray-200
                    rounded-xl
                    px-4
                    py-3
                    focus:ring-2
                    focus:ring-blue-500
                    outline-none
                  "
                />
              </div>
              {availabilityMessage && (
                <div
                  className="
                    mt-3
                    rounded-xl
                    bg-red-50
                    border
                    border-red-200
                    text-red-600
                    p-4
                    "
                >
                  {availabilityMessage}
                </div>
              )}

              <div>
                <label className="font-medium">Preferred Time</label>

                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full mt-2 border rounded-xl px-4 py-3"
                >
                  <option value="">Select Available Time</option>

                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>

                {preferredDate &&
                  availableSlots.length === 0 &&
                  !availabilityMessage && (
                    <div className="mt-3 rounded-xl bg-yellow-50 border border-yellow-200 p-4">
                      <p className="text-yellow-700 font-medium">
                        No available time slots for this date. Please choose
                        another date.
                      </p>
                    </div>
                  )}
              </div>

              <div>
                <label className="font-medium">Additional Notes</label>

                <textarea
                  rows={4}
                  value={rebookNotes}
                  onChange={(e) => setRebookNotes(e.target.value)}
                  placeholder="Special requests..."
                  className="w-full mt-2 border rounded-xl px-4 py-3 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Service Address
                </label>

                <textarea
                  rows={3}
                  value={rebookAddress}
                  onChange={(e) => setRebookAddress(e.target.value)}
                  placeholder="Enter your service address..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                />

                <p className="text-xs text-gray-500 mt-2">
                  Update your address if the service will be performed at a
                  different location.
                </p>
              </div>

              <div className="bg-blue-50 rounded-2xl border p-5">
                <div className="flex justify-between">
                  <span>Total Amount</span>

                  <span className="font-bold text-2xl text-blue-700">
                    ₱{rebookBooking.price}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  disabled={!preferredDate || !preferredTime || Boolean(activeAction)}
                  onClick={handleConfirmRebook}
                  className={`rounded-xl px-8 py-3 font-semibold text-white
${
  !preferredDate || !preferredTime || Boolean(activeAction)
    ? "bg-gray-400 cursor-not-allowed"
    : "bg-blue-600 hover:bg-blue-700"
}`}
                >
                  {isActionLoading("rebook", rebookBooking.id) ? "Checking Worker..." : "Confirm Rebook"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </CustomerLayout>
  );
}