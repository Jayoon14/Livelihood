import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Award,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Sparkles,
  Star,
  WifiOff,
} from "lucide-react";

import { FaFacebook, FaInstagram } from "react-icons/fa";

import CustomerLayout from "../../../layouts/CustomerLayout";
import LocationPicker from "../../../components/maps/LocationPicker";

import { supabase } from "../../../lib/supabase";
import { saveRecentlyViewed } from "../../../services/recentlyViewedService";
import { getCustomerWorkerProfile } from "../../../services/workerService";
import { getWorkerAverageRating } from "../../../services/reviewService";
import { getApprovedServices } from "../../../services/serviceService";
import {
  checkWorkerAvailability,
  getAvailableTimeSlots,
  getUnavailableDates,
  getWorkerSchedule,
} from "../../../services/scheduleService";

type WorkerService = {
  id: number;
  service_name: string;
  category?: string | null;
  price: number | string;
};

type WorkerSchedule = {
  id: number | string;
  day_of_week: string;
  is_available: boolean;
  start_time?: string | null;
  end_time?: string | null;
};

type UnavailableDate = {
  id: number | string;
  unavailable_date: string;
  reason?: string | null;
};

type WorkerProfileData = {
  profile: {
    id: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    profile_picture?: string | null;
  };
  services: WorkerService[];
  education?: {
    school?: string | null;
    course?: string | null;
    year_graduated?: string | number | null;
  } | null;
  workExperience?: Array<{
    id: number | string;
    company?: string | null;
    position?: string | null;
    description?: string | null;
  }>;
skills?: Array<{
  id: number | string;
  skill: string;
}>;
};

const fieldClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100";

type WorkerBookingState =
  | "checking"
  | "offline"
  | "working"
  | "available";

const ONLINE_STATUS_STALE_MS = 2 * 60 * 1000;

function locationIsFresh(updatedAt?: string | null): boolean {
  if (!updatedAt) return false;

  const timestamp = new Date(updatedAt).getTime();

  return (
    Number.isFinite(timestamp) &&
    Date.now() - timestamp <= ONLINE_STATUS_STALE_MS
  );
}

const MAX_BOOKING_DISTANCE_KILOMETERS = 20;
const WORKER_LOCATION_STALE_MS = 2 * 60 * 1000;

type BookableWorkerLocation = {
  worker_id: string;
  latitude: number;
  longitude: number;
  is_online: boolean;
  is_available: boolean;
  updated_at: string;
};

function calculateDistanceMeters(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const latitudeDifference = toRadians(secondLatitude - firstLatitude);
  const longitudeDifference = toRadians(secondLongitude - firstLongitude);
  const firstLatitudeRadians = toRadians(firstLatitude);
  const secondLatitudeRadians = toRadians(secondLatitude);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitudeRadians) *
      Math.cos(secondLatitudeRadians) *
      Math.sin(longitudeDifference / 2) ** 2;

  return (
    earthRadiusMeters *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

function workerLocationIsFresh(location: BookableWorkerLocation): boolean {
  const updatedAt = new Date(location.updated_at).getTime();

  return (
    Number.isFinite(updatedAt) &&
    Date.now() - updatedAt <= WORKER_LOCATION_STALE_MS
  );
}

export default function CustomerWorkerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [worker, setWorker] = useState<WorkerProfileData | null>(null);
  const [rating, setRating] = useState(0);
  const [schedule, setSchedule] = useState<WorkerSchedule[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>(
    [],
  );

  const [selectedService, setSelectedService] =
    useState<WorkerService | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availabilityMessage, setAvailabilityMessage] = useState("");

  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedWorkerDistanceMeters, setSelectedWorkerDistanceMeters] =
    useState<number | null>(null);
  const [workerLocationMessage, setWorkerLocationMessage] = useState("");
  const [checkingWorkerDistance, setCheckingWorkerDistance] = useState(false);

  const [loading, setLoading] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [workerBookingState, setWorkerBookingState] =
    useState<WorkerBookingState>("checking");

  const fullName = useMemo(() => {
    if (!worker) return "";

    return [
      worker.profile.first_name,
      worker.profile.middle_name,
      worker.profile.last_name,
    ]
      .filter(Boolean)
      .join(" ");
  }, [worker]);

  const formattedPrice = useMemo(() => {
    if (!selectedService) return "₱0.00";

    const price = Number(selectedService.price);

    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(Number.isFinite(price) ? price : 0);
  }, [selectedService]);

  const minimumBookingDate = useMemo(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - offset * 60_000);

    return localToday.toISOString().split("T")[0];
  }, []);

  const selectedWorkerIsNearby =
    selectedWorkerDistanceMeters !== null &&
    selectedWorkerDistanceMeters <=
      MAX_BOOKING_DISTANCE_KILOMETERS * 1_000;

  const workerCanBeBooked =
    workerBookingState === "available";

  const bookingReady =
    workerCanBeBooked &&
    Boolean(selectedService) &&
    Boolean(bookingDate) &&
    Boolean(bookingTime) &&
    latitude !== null &&
    longitude !== null &&
    Boolean(address.trim()) &&
    Boolean(notes.trim()) &&
    selectedWorkerIsNearby &&
    !checkingWorkerDistance;

  useEffect(() => {
    void loadWorker();
  }, [id]);

  useEffect(() => {
    const workerId = worker?.profile.id;

    if (!workerId) {
      return;
    }

    void refreshWorkerBookingState(workerId);

    const channel = supabase
      .channel(`customer-worker-booking-status-${workerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "worker_locations",
          filter: `worker_id=eq.${workerId}`,
        },
        () => {
          void refreshWorkerBookingState(workerId);
        },
      )
      .subscribe();

    const timer = window.setInterval(() => {
      void refreshWorkerBookingState(workerId);
    }, 30_000);

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [worker?.profile.id]);

  useEffect(() => {
    if (!worker) return;

    const searchParams = new URLSearchParams(location.search);
    const shouldOpenBooking = searchParams.get("book") === "true";

    if (!shouldOpenBooking) return;

    const timer = window.setTimeout(() => {
      document.getElementById("booking-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [location.search, worker]);

  async function refreshWorkerBookingState(
    workerId: string,
  ): Promise<WorkerBookingState> {
    try {
      const { data, error } = await supabase
        .from("worker_locations")
        .select(
          "worker_id, is_online, is_available, updated_at",
        )
        .eq("worker_id", workerId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (
        !data ||
        !data.is_online ||
        !locationIsFresh(data.updated_at)
      ) {
        setWorkerBookingState("offline");
        return "offline";
      }

      if (!data.is_available) {
        setWorkerBookingState("working");
        return "working";
      }

      setWorkerBookingState("available");
      return "available";
    } catch (error) {
      console.error(
        "Unable to refresh worker booking status:",
        error,
      );
      setWorkerBookingState("offline");
      return "offline";
    }
  }

  async function loadWorker() {
    if (!id) {
      setLoadError("Worker profile was not found.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError("");
      setWorkerBookingState("checking");

      const data = (await getCustomerWorkerProfile(id)) as WorkerProfileData;
      const [services, averageRating, weeklySchedule, unavailable] =
        await Promise.all([
          getApprovedServices(id),
          getWorkerAverageRating(id),
          getWorkerSchedule(id),
          getUnavailableDates(id),
        ]);

      data.services = (services ?? []) as WorkerService[];

      setWorker(data);
      setSelectedService(null);
      setRating(Number(averageRating) || 0);
      setSchedule((weeklySchedule ?? []) as WorkerSchedule[]);
      setUnavailableDates((unavailable ?? []) as UnavailableDate[]);

      await refreshWorkerBookingState(id);
      await saveRecentlyViewed(id);
    } catch (error) {
      console.error("Failed loading worker:", error);
      setLoadError("Unable to load this worker profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function checkSelectedWorkerDistance(
    customerLatitude: number,
    customerLongitude: number,
    showToast = false,
  ): Promise<boolean> {
    if (!worker) {
      return false;
    }

    try {
      setCheckingWorkerDistance(true);
      setWorkerLocationMessage("");

      const { data, error } = await supabase
        .from("worker_locations")
        .select(
          "worker_id, latitude, longitude, is_online, is_available, updated_at",
        )
        .eq("worker_id", worker.profile.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        const message =
          "This worker has no current GPS location and cannot be booked for this service location.";
        setSelectedWorkerDistanceMeters(null);
        setWorkerLocationMessage(message);
        if (showToast) toast.warning(message);
        return false;
      }

      const workerLocation = data as BookableWorkerLocation;

      if (
        !workerLocation.is_online ||
        !workerLocation.is_available ||
        !workerLocationIsFresh(workerLocation)
      ) {
        const message =
          "This worker is currently offline, unavailable, or has an outdated GPS location.";
        setSelectedWorkerDistanceMeters(null);
        setWorkerLocationMessage(message);
        if (showToast) toast.warning(message);
        return false;
      }

      const distanceMeters = calculateDistanceMeters(
        customerLatitude,
        customerLongitude,
        workerLocation.latitude,
        workerLocation.longitude,
      );

      setSelectedWorkerDistanceMeters(distanceMeters);

      if (
        distanceMeters >
        MAX_BOOKING_DISTANCE_KILOMETERS * 1_000
      ) {
        const distanceKilometers = (distanceMeters / 1_000).toFixed(1);
        const message =
          `This worker is ${distanceKilometers} km from the selected service location. ` +
          `Choose a worker within ${MAX_BOOKING_DISTANCE_KILOMETERS} km.`;

        setWorkerLocationMessage(message);
        if (showToast) toast.warning(message);
        return false;
      }

      setWorkerLocationMessage(
        `Selected worker is ${(distanceMeters / 1_000).toFixed(
          1,
        )} km from the service location.`,
      );

      return true;
    } catch (error) {
      console.error("Unable to validate worker distance:", error);

      const message =
        "Unable to verify the worker's distance. Please try again.";
      setSelectedWorkerDistanceMeters(null);
      setWorkerLocationMessage(message);
      if (showToast) toast.error(message);
      return false;
    } finally {
      setCheckingWorkerDistance(false);
    }
  }

  useEffect(() => {
    if (
      !worker ||
      latitude === null ||
      longitude === null
    ) {
      setSelectedWorkerDistanceMeters(null);
      setWorkerLocationMessage("");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void checkSelectedWorkerDistance(latitude, longitude);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [worker?.profile.id, latitude, longitude]);

  useEffect(() => {
    if (workerCanBeBooked) {
      return;
    }

    setBookingDate("");
    setBookingTime("");
    setAvailableSlots([]);
    setAvailabilityMessage(
      workerBookingState === "working"
        ? "This worker is currently working and cannot accept another booking."
        : workerBookingState === "offline"
          ? "This worker is offline. Booking will be available when the worker comes online."
          : "",
    );
  }, [workerCanBeBooked, workerBookingState]);

  async function handleBookingDateChange(date: string) {
    if (!worker) return;

    const currentState =
      await refreshWorkerBookingState(worker.profile.id);

    if (currentState !== "available") {
      setBookingDate("");
      setBookingTime("");
      setAvailableSlots([]);
      setAvailabilityMessage(
        currentState === "working"
          ? "This worker is currently working and cannot accept another booking."
          : "This worker is offline. Booking will be available when the worker comes online.",
      );
      return;
    }

    setBookingDate(date);
    setBookingTime("");
    setAvailableSlots([]);
    setAvailabilityMessage("");

    if (!date) return;

    try {
      setCheckingAvailability(true);

      const availability = await checkWorkerAvailability(
        worker.profile.id,
        date,
      );

      if (availability.available === false) {
        setAvailabilityMessage(
          availability.reason || "The worker is unavailable on this date.",
        );
        return;
      }

      const slots = await getAvailableTimeSlots(worker.profile.id, date);
      setAvailableSlots(slots ?? []);
    } catch (error) {
      console.error("Failed checking availability:", error);
      setAvailabilityMessage(
        "Unable to check availability. Please select the date again.",
      );
    } finally {
      setCheckingAvailability(false);
    }
  }

  async function handleContinueBooking() {
    if (!worker) return;

    const currentState =
      await refreshWorkerBookingState(worker.profile.id);

    if (currentState !== "available") {
      toast.warning(
        currentState === "working"
          ? "This worker is currently working and cannot accept another booking."
          : "This worker is offline. Please wait until the worker is online before booking.",
      );
      return;
    }

    if (!selectedService) {
      toast.warning("Please select a service.");
      return;
    }

    if (!bookingDate) {
      toast.warning("Please select a booking date.");
      return;
    }

    if (!bookingTime) {
      toast.warning("Please select an available time.");
      return;
    }

    if (latitude === null || longitude === null || !address.trim()) {
      toast.warning("Please select and confirm the service location.");
      return;
    }

    if (!notes.trim()) {
      toast.warning("Please enter a job description.");
      return;
    }

    try {
      setContinuing(true);

      const workerCanServeLocation = await checkSelectedWorkerDistance(
        latitude,
        longitude,
        true,
      );

      if (!workerCanServeLocation) {
        return;
      }

      const availability = await checkWorkerAvailability(
        worker.profile.id,
        bookingDate,
      );

      if (availability.available === false) {
        toast.warning(availability.reason || "The worker is unavailable on this date.");
        return;
      }

      const latestSlots = await getAvailableTimeSlots(
        worker.profile.id,
        bookingDate,
      );

      if (!latestSlots.includes(bookingTime)) {
        toast.warning(
          "This time slot has already been booked. Please choose another time.",
        );
        setBookingTime("");
        setAvailableSlots(latestSlots);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.warning("Please log in first.");
        return;
      }

      navigate("/customer/booking-confirmation", {
        state: {
          workerId: worker.profile.id,
          workerName: fullName,
          service: selectedService.service_name,
          serviceId: selectedService.id,
          date: bookingDate,
          time: bookingTime,
          price: selectedService.price,
          address,
          latitude,
          longitude,
          notes: notes.trim(),
        },
      });
    } catch (error) {
      console.error("Failed continuing booking:", error);
      toast.warning("Unable to continue your booking. Please try again.");
    } finally {
      setContinuing(false);
    }
  }

  async function shareProfile() {
    if (!worker) return;

    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: fullName,
          text: `View ${fullName}'s services on LivelihoodGo.`,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied.");
    } catch (error) {
      console.error("Unable to share profile:", error);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied.");
    } catch (error) {
      console.error("Unable to copy profile link:", error);
      toast.error("Unable to copy the profile link.");
    }
  }

  function shareFacebook() {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        window.location.href,
      )}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function shareInstagram() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      window.open(
        "https://www.instagram.com/",
        "_blank",
        "noopener,noreferrer",
      );
      toast.success("Profile link copied. Paste it into your Instagram post or message.");
    } catch (error) {
      console.error("Unable to prepare Instagram sharing:", error);
    }
  }

  function shareMessenger() {
    window.open(
      `https://www.facebook.com/dialog/send?link=${encodeURIComponent(
        window.location.href,
      )}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function chooseService(service: WorkerService) {
    setSelectedService(service);

    document.getElementById("booking-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  if (loading) {
    return (
      <CustomerLayout>
        <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 xl:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-52 rounded-3xl bg-slate-200" />
            <div className="h-175 rounded-3xl bg-slate-200" />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-72 rounded-3xl bg-slate-200" />
              <div className="h-72 rounded-3xl bg-slate-200" />
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (!worker || loadError) {
    return (
      <CustomerLayout>
        <div className="mx-auto flex min-h-[60vh] w-full max-w-[1800px] items-center justify-center px-4 py-10">
          <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Briefcase size={26} />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Worker profile unavailable
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {loadError || "The worker profile could not be loaded."}
            </p>
            <button
              type="button"
              onClick={() => void loadWorker()}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <main className="min-h-screen bg-slate-50/70">
        <div className="mx-auto w-full max-w-[1800px] space-y-5 px-2 py-4 sm:px-5 sm:py-6 xl:px-8">
          {/* PROFILE HEADER */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-24 bg-linear-to-r from-blue-600 via-cyan-500 to-emerald-400 sm:h-28" />

            <div className="relative px-5 pb-5 sm:px-7 sm:pb-7">
              <div className="-mt-10 flex flex-col gap-5 sm:-mt-12">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                    <img
                      src={
                        worker.profile.profile_picture ||
                        "https://placehold.co/220x220?text=Worker"
                      }
                      alt={fullName}
                      className="h-24 w-24 shrink-0 rounded-2xl border-4 border-white bg-white object-cover shadow-md sm:h-28 sm:w-28"
                    />

                    <div className="min-w-0 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                          {fullName}
                        </h1>

                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 size={13} />
                          Verified
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                          <Star
                            size={16}
                            className="fill-amber-400 text-amber-400"
                          />
                          {rating.toFixed(1)}
                        </span>
                        <span>{worker.services.length} approved services</span>
                      </div>
                    </div>
                  </div>

                  {/* HEADER ACTIONS */}
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => void shareProfile()}
                      className={secondaryButtonClass}
                    >
                      <Share2 size={16} />
                      Share profile
                    </button>

                    <button
                      type="button"
                      onClick={() => void copyLink()}
                      className={secondaryButtonClass}
                    >
                      <Copy size={16} />
                      Copy link
                    </button>

                    <button
                      type="button"
                      onClick={shareFacebook}
                      className={secondaryButtonClass}
                    >
                    <FaFacebook size={16} />
                    Facebook
                    </button>

                    <button
                      type="button"
                      onClick={() => void shareInstagram()}
                      className={secondaryButtonClass}
                    >
                    <FaInstagram size={16} />
                    Instagram
                    </button>

                    <button
                      type="button"
                      onClick={shareMessenger}
                      className={secondaryButtonClass}
                    >
                      <MessageCircle size={16} />
                      Messenger
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Mail size={17} className="shrink-0 text-blue-600" />
                    <span className="truncate text-sm text-slate-700">
                      {worker.profile.email || "Email not provided"}
                    </span>
                  </div>

                  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Phone size={17} className="shrink-0 text-blue-600" />
                    <span className="truncate text-sm text-slate-700">
                      {worker.profile.phone || "Phone not provided"}
                    </span>
                  </div>

                  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <MapPin size={17} className="shrink-0 text-blue-600" />
                    <span className="truncate text-sm text-slate-700">
                      {worker.profile.address || "Address not provided"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* BOOKING SECTION */}
          <section
            id="booking-section"
            className="scroll-mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <header className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
                  Book this worker
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-950 sm:text-2xl">
                  Schedule a professional service
                </h2>
              </div>

              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                <Star
                  size={14}
                  className="fill-amber-400 text-amber-400"
                />
                {rating.toFixed(1)} verified worker
              </span>
            </header>

            <div className="px-3 pt-3 sm:px-5 sm:pt-5 lg:px-7 lg:pt-7">
              <div
                className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                  workerBookingState === "available"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : workerBookingState === "working"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : workerBookingState === "checking"
                        ? "border-blue-200 bg-blue-50 text-blue-800"
                        : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
                    {workerBookingState === "available" ? (
                      <CheckCircle2 size={20} />
                    ) : workerBookingState === "working" ? (
                      <Briefcase size={20} />
                    ) : workerBookingState === "checking" ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <WifiOff size={20} />
                    )}
                  </div>

                  <div>
                    <p className="font-bold">
                      {workerBookingState === "available"
                        ? "Worker is online and available"
                        : workerBookingState === "working"
                          ? "Worker is currently working"
                          : workerBookingState === "checking"
                            ? "Checking worker status"
                            : "Worker is currently offline"}
                    </p>
                    <p className="mt-1 text-sm leading-5 opacity-80">
                      {workerBookingState === "available"
                        ? "You may select a service, date, and available time."
                        : workerBookingState === "working"
                          ? "The booking form is locked while an active job is in progress."
                          : workerBookingState === "checking"
                            ? "Please wait while the latest availability is loaded."
                            : "You may view the profile, but booking is enabled only when the worker is online."}
                    </p>
                  </div>
                </div>

                <span className="w-fit rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-sm">
                  {workerBookingState}
                </span>
              </div>
            </div>

            <div className="space-y-5 p-3 sm:p-5 lg:p-7">
              {/* FORM */}
              <div className="grid gap-5 2xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="service"
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      Select service
                    </label>
                    <select
                      id="service"
                      value={selectedService?.id ?? ""}
                      disabled={!workerCanBeBooked}
                      onChange={(event) => {
                        const service = worker.services.find(
                          (item) => item.id === Number(event.target.value),
                        );

                        setSelectedService(service ?? null);
                      }}
                      className={fieldClass}
                    >
                      <option value="">Select a service</option>
                      {worker.services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.service_name} — ₱
                          {Number(service.price).toLocaleString("en-PH")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="booking-date"
                        className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"
                      >
                        <CalendarDays size={16} className="text-blue-600" />
                        Booking date
                      </label>
                      <input
                        id="booking-date"
                        type="date"
                        min={minimumBookingDate}
                        value={bookingDate}
                        disabled={!workerCanBeBooked}
                        onChange={(event) =>
                          void handleBookingDateChange(event.target.value)
                        }
                        className={fieldClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="booking-time"
                        className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"
                      >
                        <Clock3 size={16} className="text-blue-600" />
                        Available time
                      </label>
                      <select
                        id="booking-time"
                        value={bookingTime}
                        onChange={(event) =>
                          setBookingTime(event.target.value)
                        }
                        disabled={
                          !workerCanBeBooked ||
                          !bookingDate ||
                          checkingAvailability ||
                          availableSlots.length === 0
                        }
                        className={fieldClass}
                      >
                        <option value="">
                          {checkingAvailability
                            ? "Checking availability..."
                            : "Select available time"}
                        </option>
                        {availableSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {availabilityMessage && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {availabilityMessage}
                    </div>
                  )}

                  {bookingDate &&
                    !checkingAvailability &&
                    availableSlots.length === 0 &&
                    !availabilityMessage && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                        No available time slots for this date.
                      </div>
                    )}

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label
                        htmlFor="job-description"
                        className="text-sm font-semibold text-slate-800"
                      >
                        Job description
                      </label>
                      <span className="text-xs text-slate-400">
                        {notes.length} characters
                      </span>
                    </div>

                    <textarea
                      id="job-description"
                      rows={5}
                      maxLength={500}
                      value={notes}
                      disabled={!workerCanBeBooked}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Describe the work needed, preferred details, or special instructions."
                      className="min-h-32 w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50 to-cyan-50 p-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Estimated total
                        </p>
                        <p className="mt-1 text-2xl font-extrabold text-blue-700">
                          {formattedPrice}
                        </p>
                      </div>

                      <Sparkles size={24} className="text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* LOCATION */}
                <div className="min-w-0">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Service location
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Pin the exact place where the service will be performed.
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner">
                    <LocationPicker
                      onLocationSelect={(lat, lng, selectedAddress) => {
                        setLatitude(lat);
                        setLongitude(lng);
                        setAddress(selectedAddress);
                      }}
                      onLocationConfirmedChange={(confirmed) => {
                        if (!confirmed) {
                          setSelectedWorkerDistanceMeters(null);
                          setWorkerLocationMessage("");
                        }
                      }}
                      showNearbyWorkers
                      nearbyWorkerRadiusKilometers={
                        MAX_BOOKING_DISTANCE_KILOMETERS
                      }
                    />
                  </div>

                  <div
                    className={`mt-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
                      workerLocationMessage.includes("within") ||
                      workerLocationMessage.includes("from the service")
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : workerLocationMessage
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {checkingWorkerDistance
                      ? "Checking the selected worker's distance..."
                      : workerLocationMessage ||
                        `The selected worker must be online and within ${MAX_BOOKING_DISTANCE_KILOMETERS} km of the confirmed service location.`}
                  </div>
                </div>
              </div>

              {/* BOOKING SUMMARY */}
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Booking summary
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="font-bold text-slate-900">
                      {selectedService?.service_name || "No service selected"}
                    </span>
                    <span className="font-bold text-blue-700">
                      {formattedPrice}
                    </span>
                    <span className="max-w-3xl truncate text-slate-500">
                      {address || "Select and confirm the service location."}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleContinueBooking()}
                  disabled={
                    continuing ||
                    !workerCanBeBooked ||
                    !bookingReady
                  }
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {continuing ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Checking booking
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      Continue to confirmation
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* SERVICES */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-950">
                  <Briefcase size={21} className="text-blue-600" />
                  Professional Services
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Approved services offered by this worker.
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                {worker.services.length} services
              </span>
            </div>

            {worker.services.length === 0 ? (
              <EmptyState message="No approved services yet." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {worker.services.map((service) => (
                  <button
                    type="button"
                    key={service.id}
                    onClick={() => chooseService(service)}
                    className={`group flex min-h-48 flex-col rounded-2xl border p-5 text-left transition ${
                      selectedService?.id === service.id
                        ? "border-blue-500 bg-blue-50/60 ring-4 ring-blue-100"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Briefcase size={20} />
                      </span>

                      <span className="text-lg font-extrabold text-blue-700">
                        ₱{Number(service.price).toLocaleString("en-PH")}
                      </span>
                    </div>

                    <h3 className="mt-5 text-base font-extrabold text-slate-950">
                      {service.service_name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {service.category || "Professional service"}
                    </p>

                    <span className="mt-auto pt-5 text-sm font-semibold text-blue-600">
                      Select service →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* EDUCATION + SKILLS */}
          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <InfoCard
              icon={<GraduationCap size={21} />}
              title="Education"
            >
              {worker.education ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-bold text-slate-900">
                    {worker.education.school || "School not provided"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {worker.education.course || "Course not provided"}
                  </p>
                  {worker.education.year_graduated && (
                    <p className="mt-3 text-xs font-semibold text-blue-700">
                      Graduated {worker.education.year_graduated}
                    </p>
                  )}
                </div>
              ) : (
                <EmptyState message="No education information available." />
              )}
            </InfoCard>

            <InfoCard icon={<Award size={21} />} title="Skills">
              {worker.skills?.length ? (
                <div className="flex flex-wrap gap-2">
                  {worker.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
                    >
                      {skill.skill}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyState message="No skills available." />
              )}
            </InfoCard>
          </div>

          {/* EXPERIENCE */}
          <InfoCard icon={<Briefcase size={21} />} title="Work Experience">
            {worker.workExperience?.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {worker.workExperience.map((job) => (
                  <article
                    key={job.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <h3 className="font-bold text-slate-900">
                      {job.position || "Position not provided"}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-blue-700">
                      {job.company || "Company not provided"}
                    </p>
                    {job.description && (
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        {job.description}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState message="No work experience available." />
            )}
          </InfoCard>

          {/* AVAILABILITY */}
          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <InfoCard
              icon={<CalendarDays size={21} />}
              title="Weekly Availability"
            >
              {schedule.length === 0 ? (
                <EmptyState message="No schedule available." />
              ) : (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                  {schedule.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 bg-white px-4 py-3"
                    >
                      <span className="text-sm font-semibold text-slate-800">
                        {item.day_of_week}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          item.is_available
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {item.is_available
                          ? `${item.start_time || "--"} – ${
                              item.end_time || "--"
                            }`
                          : "Unavailable"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </InfoCard>

            <InfoCard
              icon={<CalendarDays size={21} />}
              title="Unavailable Dates"
            >
              {unavailableDates.length === 0 ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                  <p className="font-semibold text-emerald-700">
                    No blocked dates
                  </p>
                  <p className="mt-1 text-sm text-emerald-600">
                    This worker has not marked any upcoming date as unavailable.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                  {unavailableDates.map((date) => (
                    <div
                      key={date.id}
                      className="flex flex-col gap-1 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-sm font-semibold text-slate-800">
                        {date.unavailable_date}
                      </span>
                      <span className="text-sm text-red-600">
                        {date.reason || "Unavailable"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </InfoCard>
          </div>
        </div>
      </main>
    </CustomerLayout>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-extrabold text-slate-950">
        <span className="text-blue-600">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}