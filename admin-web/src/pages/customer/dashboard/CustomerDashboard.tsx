import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Heart,
  MapPin,
  Search,
  Loader2,
  Sparkles,
  Star,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import { getUpcomingBooking } from "../../../services/reminderService";
import {
  getCategories,
  getFeaturedWorkers,
  getRecommendedWorkers,
  isWorkerAvailable,
  searchDashboard,
} from "../../../services/workerService";
import { getWorkerAverageRating } from "../../../services/reviewService";
import {
  addFavorite,
  isFavorite,
  removeFavorite,
} from "../../../services/favoriteService";
import { getCustomerAnalytics } from "../../../services/customerAnalyticsService";
import { getRecentlyViewed } from "../../../services/recentlyViewedService";

type WorkerPresenceRecord = {
  id: string;
  role?: string | null;
  last_seen?: string | null;
};

type ActivityItem = {
  id: number;
  status?: string | null;
  schedule_status?: string | null;
  trip_status?: string | null;
  completion_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  worker?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  service?: {
    service_name?: string | null;
  } | null;
};

const ONLINE_TIMEOUT_MS = 2 * 60 * 1000;
const heading = { fontFamily: "'Sora', sans-serif" };

function isWorkerOnline(lastSeen?: string | null): boolean {
  if (!lastSeen) return false;
  const lastSeenTime = new Date(lastSeen).getTime();
  if (!Number.isFinite(lastSeenTime)) return false;
  const elapsed = Date.now() - lastSeenTime;
  return elapsed >= 0 && elapsed <= ONLINE_TIMEOUT_MS;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatSchedule(date?: string | null, time?: string | null): string {
  if (!date) return "Schedule unavailable";
  const parsed = new Date(`${date}T${time || "00:00"}`);
  if (Number.isNaN(parsed.getTime()))
    return `${date}${time ? ` • ${time}` : ""}`;
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: time ? "numeric" : undefined,
    minute: time ? "2-digit" : undefined,
  }).format(parsed);
}

function timeAgo(value?: string | null): string {
  if (!value) return "Recently";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function activityLabel(item: ActivityItem): string {
  const status = item.status?.toLowerCase() ?? "";
  const completion = item.completion_status?.toLowerCase() ?? "";
  const trip = item.trip_status?.toLowerCase() ?? "";

  if (status === "completed") return "Service completed";
  if (status === "cancelled") return "Booking cancelled";
  if (completion.includes("worker completed"))
    return "Completion proof submitted";
  if (trip === "arrived") return "Worker arrived";
  if (trip === "on the way" || trip === "on-the-way")
    return "Worker is on the way";
  if (status === "approved") return "Booking approved";
  return "Booking request submitted";
}

function AvailabilityBadge({
  online,
  available,
}: {
  online: boolean;
  available: boolean;
}) {
  if (!online) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Offline
      </span>
    );
  }

  if (!available) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Busy today
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Available today
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse sm:space-y-6">
      <div className="h-48 rounded-[1.75rem] bg-slate-200 dark:bg-slate-800 sm:h-56" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 rounded-[1.5rem] bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <div className="h-80 rounded-[1.75rem] bg-slate-200 dark:bg-slate-800" />
        <div className="h-80 rounded-[1.75rem] bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const [workers, setWorkers] = useState<any[]>([]);
  const [recommendedWorkers, setRecommendedWorkers] = useState<any[]>([]);
  const [, setCategories] = useState<string[]>([]);
  const [recentWorkers, setRecentWorkers] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const [upcomingBooking, setUpcomingBooking] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [customerName, setCustomerName] = useState("Customer");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState({
    totalBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    favoriteWorkers: 0,
    totalPayments: 0,
  });

  const getVisibleWorkerIds = useCallback((): string[] => {
    const ids = [
      ...workers.map((worker) => String(worker.id)),
      ...recommendedWorkers.map((worker) => String(worker.id)),
      ...recentWorkers
        .map((item) => item?.worker?.id)
        .filter(Boolean)
        .map(String),
    ];
    return [...new Set(ids)];
  }, [workers, recommendedWorkers, recentWorkers]);

  const refreshWorkerStates = useCallback(async (workerIds: string[]) => {
    const ids = [...new Set(workerIds.filter(Boolean))];
    if (!ids.length) return;

    try {
      const [presenceResult, availabilityEntries] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, last_seen")
          .in("id", ids)
          .eq("role", "worker"),
        Promise.all(
          ids.map(
            async (workerId) =>
              [workerId, Boolean(await isWorkerAvailable(workerId))] as const,
          ),
        ),
      ]);

      if (presenceResult.error) throw presenceResult.error;

      setOnlineStatus((current) => ({
        ...current,
        ...Object.fromEntries(
          ids.map((workerId) => [
            workerId,
            isWorkerOnline(
              presenceResult.data?.find(
                (profile) => String(profile.id) === workerId,
              )?.last_seen,
            ),
          ]),
        ),
      }));

      setAvailability((current) => ({
        ...current,
        ...Object.fromEntries(availabilityEntries),
      }));
    } catch (caughtError) {
      console.error("Unable to refresh worker availability:", caughtError);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user)
        throw new Error("Please sign in again to load your dashboard.");

      const [
        workerData,
        categoryData,
        booking,
        recommended,
        recent,
        analyticsData,
      ] = await Promise.all([
        getFeaturedWorkers(6),
        getCategories(),
        getUpcomingBooking(),
        getRecommendedWorkers(user.id),
        getRecentlyViewed(5),
        getCustomerAnalytics(user.id),
      ]);

      setWorkers(workerData);
      setCategories(categoryData);
      setUpcomingBooking(booking);
      setRecommendedWorkers(recommended);
      setRecentWorkers(recent);
      setAnalytics(analyticsData);

      const [profileResult, activityResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("bookings")
          .select(
            `
              id,
              status,
              schedule_status,
              trip_status,
              completion_status,
              created_at,
              worker:profiles!bookings_worker_id_fkey(
                first_name,
                last_name
              ),
              service:services!bookings_service_id_fkey(
                service_name
              )
            `,
          )
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (!profileResult.error && profileResult.data) {
        setCustomerName(
          profileResult.data.first_name?.trim() ||
            profileResult.data.last_name?.trim() ||
            "Customer",
        );
      }

      if (activityResult.error) {
        console.error("==================================");
        console.error("ACTIVITY QUERY ERROR");
        console.error({
          code: activityResult.error.code,
          message: activityResult.error.message,
          details: activityResult.error.details,
          hint: activityResult.error.hint,
        });
        console.error("==================================");
      } else {
        setActivities((activityResult.data ?? []) as unknown as ActivityItem[]);
      }

      const combinedWorkers = [
        ...workerData,
        ...recommended,
        ...recent.map((item: any) => item?.worker).filter(Boolean),
      ];
      const uniqueWorkers = Array.from(
        new Map(
          combinedWorkers.map((worker: any) => [String(worker.id), worker]),
        ).values(),
      );

      const [ratingEntries, favoriteEntries] = await Promise.all([
        Promise.all(
          uniqueWorkers.map(
            async (worker: any) =>
              [
                String(worker.id),
                await getWorkerAverageRating(worker.id),
              ] as const,
          ),
        ),
        Promise.all(
          workerData.map(
            async (worker: any) =>
              [
                String(worker.id),
                (await isFavorite(user.id, worker.id)) === true,
              ] as const,
          ),
        ),
      ]);

      setRatings(Object.fromEntries(ratingEntries));
      setFavorites(Object.fromEntries(favoriteEntries));
      await refreshWorkerStates(
        uniqueWorkers.map((worker: any) => String(worker.id)),
      );
    } catch (caughtError) {
      console.error(caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load the customer dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [refreshWorkerStates]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const channel = supabase
      .channel("customer-dashboard-worker-presence")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const profile = payload.new as WorkerPresenceRecord;
          if (profile.role?.toLowerCase() !== "worker") return;
          setOnlineStatus((current) => ({
            ...current,
            [profile.id]: isWorkerOnline(profile.last_seen),
          }));
        },
      )
      .subscribe();

    const expiryTimer = window.setInterval(() => {
      void refreshWorkerStates(getVisibleWorkerIds());
    }, 30_000);

    return () => {
      window.clearInterval(expiryTimer);
      void supabase.removeChannel(channel);
    };
  }, [getVisibleWorkerIds, refreshWorkerStates]);

  const filteredWorkers = useMemo(() => workers, [workers]);

  function getWorkerDisplayName(worker: any): string {
    return (
      [worker.first_name, worker.middle_name, worker.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      worker.email ||
      "LivelihoodGo Worker"
    );
  }

  function getWorkerImage(worker: any): string | null {
    return (
      worker.profile_picture?.trim?.() ||
      worker.profile_image?.trim?.() ||
      worker.avatar_url?.trim?.() ||
      null
    );
  }

  function getMatchingServices(worker: any): any[] {
    const keyword = search.trim().toLowerCase();
    const services = Array.isArray(worker.services) ? worker.services : [];

    if (!keyword) {
      return services.slice(0, 3);
    }

    const matching = services.filter((service: any) =>
      [
        service.service_name,
        service.category,
        service.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );

    return (matching.length > 0 ? matching : services).slice(0, 3);
  }

  function openWorkerProfile(workerId: string, serviceId?: string | number) {
    setShowSearchResults(false);

    navigate(`/customer/workers/${workerId}`, {
      state: serviceId
        ? {
            selectedServiceId: serviceId,
          }
        : undefined,
    });
  }

  async function submitSearch() {
    const keyword = search.trim();

    if (!keyword) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setSearching(true);
      setError(null);

      const result = await searchDashboard(keyword);

      setSearchResults(result);
      setShowSearchResults(true);

      await refreshWorkerStates(
        result.map((worker) => String(worker.id)),
      );
    } catch (caughtError) {
      console.error(caughtError);
      setSearchResults([]);
      setShowSearchResults(true);
      setError("Unable to search workers right now.");
    } finally {
      setSearching(false);
    }
  }

  async function toggleFavorite(workerId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const isCurrentlyFavorite = Boolean(favorites[workerId]);
    setFavorites((current) => ({
      ...current,
      [workerId]: !isCurrentlyFavorite,
    }));

    try {
      if (isCurrentlyFavorite) {
        await removeFavorite(user.id, workerId);
      } else {
        await addFavorite(user.id, workerId);
      }
    } catch (caughtError) {
      console.error(caughtError);
      setFavorites((current) => ({
        ...current,
        [workerId]: isCurrentlyFavorite,
      }));
    }
  }

  const analyticsCards = [
    {
      label: "Total bookings",
      value: analytics.totalBookings,
      note: `${analytics.pendingBookings} currently pending`,
      icon: CalendarCheck,
      iconClass: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Completed",
      value: analytics.completedBookings,
      note: "Successfully finished services",
      icon: CheckCircle2,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Favorite workers",
      value: analytics.favoriteWorkers,
      note: "Saved for faster booking",
      icon: Heart,
      iconClass: "bg-rose-50 text-rose-600",
    },
    {
      label: "Total spent",
      value: formatMoney(analytics.totalPayments),
      note: "Verified customer payments",
      icon: Wallet,
      iconClass: "bg-amber-50 text-amber-600",
    },
  ];

  if (loading) {
    return (
      <CustomerLayout>
        <DashboardSkeleton />
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div
        className="relative space-y-5 pb-8 sm:space-y-6"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {error && (
          <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/95 p-4 text-sm font-semibold text-rose-700 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              onClick={() => void loadDashboard()}
              className="font-bold underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        )}

        <section className="relative z-0 overflow-visible rounded-[1.75rem] bg-linear-to-br from-[#1f2bd7] via-[#4f37e8] to-[#1687db] px-5 py-7 text-white shadow-[0_24px_70px_rgba(79,55,232,0.24)] sm:px-8 sm:py-9 lg:px-10">
          {/* Decorative background stays clipped while search results can extend below the hero. */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.75rem]">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, white 0 1px, transparent 1.5px)",
                backgroundSize: "22px 22px",
              }}
            />
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          </div>

          <div className="relative z-10 grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-100 backdrop-blur">
                Customer dashboard
              </p>
              <h1
                className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl"
                style={heading}
              >
                Welcome back, {customerName} 👋
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
                Find trusted workers, manage active bookings, and keep track of
                every service from one place.
              </p>

              <div className="relative z-20 mt-6 max-w-2xl">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitSearch();
                  }}
                  className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-xl sm:flex-row"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-white px-4 shadow-sm dark:bg-slate-900">
                    <Search className="h-5 w-5 shrink-0 text-slate-400" />

                    <input
                      id="customer-dashboard-search"
                      name="customer-dashboard-search"
                      type="search"
                      autoComplete="off"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);

                        if (!event.target.value.trim()) {
                          setSearchResults([]);
                          setShowSearchResults(false);
                        }
                      }}
                      placeholder="Search workers or services"
                      className="h-12 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setSearchResults([]);
                          setShowSearchResults(false);
                        }}
                        aria-label="Clear search"
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={searching || !search.trim()}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 text-sm font-black text-slate-900 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                  >
                    {searching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      "Find service"
                    )}
                  </button>
                </form>

                {showSearchResults && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.65rem)] z-[70] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5">
                      <div>
                        <p className="text-sm font-black">
                          Search results
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {searchResults.length}{" "}
                          {searchResults.length === 1 ? "worker" : "workers"} found
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowSearchResults(false)}
                        aria-label="Close search results"
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>

                    {searchResults.length === 0 ? (
                      <div className="px-5 py-9 text-center">
                        <Search className="mx-auto h-8 w-8 text-slate-300" />

                        <h3 className="mt-3 font-black text-slate-800 dark:text-white">
                          No matching workers
                        </h3>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          Try another worker name, service, or category.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-[420px] overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]">
                        {searchResults.map((worker) => {
                          const workerId = String(worker.id);
                          const workerName = getWorkerDisplayName(worker);
                          const workerImage = getWorkerImage(worker);
                          const matchingServices = getMatchingServices(worker);

                          return (
                            <article
                              key={workerId}
                              className="rounded-2xl border border-transparent p-3 transition hover:border-indigo-100 hover:bg-indigo-50/60 dark:hover:border-indigo-500/20 dark:hover:bg-indigo-500/10 sm:p-4"
                            >
                              <button
                                type="button"
                                onClick={() => openWorkerProfile(workerId)}
                                className="flex w-full items-center gap-3 text-left"
                              >
                                {workerImage ? (
                                  <img
                                    src={workerImage}
                                    alt={workerName}
                                    className="h-13 w-13 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                                  />
                                ) : (
                                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-black text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                                    {workerName.charAt(0).toUpperCase()}
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate font-black text-slate-900 dark:text-white">
                                      {workerName}
                                    </h3>

                                    <AvailabilityBadge
                                      online={Boolean(onlineStatus[workerId])}
                                      available={Boolean(availability[workerId])}
                                    />
                                  </div>

                                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                      {Number(
                                        worker.average_rating ??
                                          ratings[workerId] ??
                                          0,
                                      ).toFixed(1)}
                                    </span>
                                    <span>rating</span>
                                  </div>
                                </div>

                                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                              </button>

                              <div className="mt-3 flex flex-wrap gap-2 pl-0 sm:pl-16">
                                {matchingServices.length > 0 ? (
                                  matchingServices.map((service: any) => (
                                    <button
                                      key={String(service.id)}
                                      type="button"
                                      onClick={() =>
                                        openWorkerProfile(
                                          workerId,
                                          service.id,
                                        )
                                      }
                                      className="inline-flex max-w-full items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3 py-2 text-left text-xs font-bold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-500/20 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                                    >
                                      <span className="truncate">
                                        {service.service_name ||
                                          service.category ||
                                          "View service"}
                                      </span>

                                      {Number.isFinite(
                                        Number(service.price),
                                      ) && (
                                        <span className="shrink-0 text-slate-500 dark:text-slate-400">
                                          {formatMoney(Number(service.price))}
                                        </span>
                                      )}
                                    </button>
                                  ))
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openWorkerProfile(workerId)}
                                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                  >
                                    View worker profile
                                  </button>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}

                    {searchResults.length > 0 && (
                      <div className="border-t border-slate-200 p-3 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSearchResults(false);
                            navigate(
                              `/customer/workers?search=${encodeURIComponent(
                                search.trim(),
                              )}`,
                            );
                          }}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700"
                        >
                          View all matching workers
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate("/customer/workers")}
                className="rounded-2xl border border-white/15 bg-white/10 p-4 text-left backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/15"
              >
                <Zap className="h-6 w-6 text-amber-300" />
                <p className="mt-5 font-bold">Book a worker</p>
                <p className="mt-1 text-xs text-blue-100">
                  Browse available services
                </p>
              </button>
              <button
                onClick={() => navigate("/customer/bookings")}
                className="rounded-2xl border border-white/15 bg-white/10 p-4 text-left backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/15"
              >
                <CalendarCheck className="h-6 w-6 text-emerald-300" />
                <p className="mt-5 font-bold">My bookings</p>
                <p className="mt-1 text-xs text-blue-100">
                  Track every appointment
                </p>
              </button>
            </div>
          </div>
        </section>

        <section className="relative z-0 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {analyticsCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className="min-h-37.5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)] dark:border-slate-700 dark:bg-slate-900 sm:p-5"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconClass}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-400">
                  {card.label}
                </p>
                <p
                  className="mt-1 text-xl font-black text-slate-900 dark:text-white sm:text-2xl"
                  style={heading}
                >
                  {card.value}
                </p>
                <p className="mt-2 hidden text-xs leading-5 text-slate-500 dark:text-slate-400 sm:block">
                  {card.note}
                </p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.4fr_0.85fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-400">
                  Next appointment
                </p>
                <h2
                  className="mt-2 text-xl font-black text-slate-900 dark:text-white sm:text-2xl"
                  style={heading}
                >
                  Upcoming booking
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <Bell className="h-5 w-5" />
              </div>
            </div>

            {upcomingBooking ? (
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      {upcomingBooking.status || "Scheduled"}
                    </span>
                    <h3
                      className="mt-4 text-lg font-black text-slate-900 dark:text-white"
                      style={heading}
                    >
                      {upcomingBooking.service?.service_name ||
                        "Booked service"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      With {upcomingBooking.worker?.first_name || "your worker"}{" "}
                      {upcomingBooking.worker?.last_name || ""}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        {formatSchedule(
                          upcomingBooking.booking_date,
                          upcomingBooking.booking_time,
                        )}
                      </span>
                      {upcomingBooking.address && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-rose-500" />
                          {upcomingBooking.address}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      navigate(`/customer/bookings/${upcomingBooking.id}`)
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-indigo-700"
                  >
                    View booking
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
                <CalendarCheck className="mx-auto h-8 w-8 text-slate-300" />
                <h3 className="mt-3 font-black text-slate-800 dark:text-white">
                  No upcoming booking
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Book a trusted worker when you need a service.
                </p>
                <button
                  onClick={() => navigate("/customer/workers")}
                  className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-indigo-700"
                >
                  Browse workers
                </button>
              </div>
            )}
          </div>

          <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
            <div className="flex items-center justify-between">
              <h2
                className="text-xl font-black text-slate-900 dark:text-white"
                style={heading}
              >
                Recent activity
              </h2>
              <button
                onClick={() => navigate("/customer/bookings")}
                className="text-xs font-black text-indigo-600 hover:underline dark:text-indigo-400"
              >
                View all
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {activities.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                  Your latest booking updates will appear here.
                </p>
              ) : (
                activities.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/customer/bookings/${item.id}`)}
                    className="group flex w-full gap-3 text-left"
                  >
                    <div className="relative flex flex-col items-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-4 ring-white dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-slate-900">
                        {item.status?.toLowerCase() === "cancelled" ? (
                          <XCircle className="h-4 w-4 text-rose-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </span>
                      {index < activities.length - 1 && (
                        <span className="mt-1 h-8 w-px bg-slate-200 dark:bg-slate-700" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <p className="text-sm font-black text-slate-800 transition group-hover:text-indigo-600 dark:text-slate-200 dark:group-hover:text-indigo-400">
                        {activityLabel(item)}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {item.service?.service_name || "Service booking"}
                        {item.worker?.first_name
                          ? ` • ${item.worker.first_name} ${item.worker.last_name || ""}`
                          : ""}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                        {timeAgo(item.created_at)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
        </section>

        {recommendedWorkers.length > 0 && (
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-black uppercase tracking-[0.14em]">
                    Personalized
                  </span>
                </div>
                <h2
                  className="mt-2 text-xl font-black text-slate-900 dark:text-white sm:text-2xl"
                  style={heading}
                >
                  Recommended for you
                </h2>
              </div>
              <button
                onClick={() => navigate("/customer/workers")}
                className="text-sm font-black text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Explore all workers
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recommendedWorkers.slice(0, 3).map((worker) => (
                <article
                  key={worker.id}
                  className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)] dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={
                        worker.profile?.profile_picture ||
                        worker.profile_picture ||
                        "https://placehold.co/600x400"
                      }
                      alt={`${worker.first_name || "Worker"} profile`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3">
                      <AvailabilityBadge
                        online={Boolean(onlineStatus[worker.id])}
                        available={Boolean(availability[worker.id])}
                      />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3
                      className="font-black text-slate-900 dark:text-white"
                      style={heading}
                    >
                      {[worker.first_name, worker.last_name]
                        .filter(Boolean)
                        .join(" ") || "Worker"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {worker.services?.[0]?.category ||
                        worker.services?.[0]?.service_name ||
                        "Professional service"}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-sm font-black text-slate-700 dark:text-slate-300">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {ratings[worker.id] ?? 0}
                    </div>
                    <button
                      onClick={() => navigate(`/customer/workers/${worker.id}`)}
                      className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-indigo-600 dark:bg-slate-700 dark:hover:bg-indigo-600"
                    >
                      View profile
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2
                className="text-xl font-extrabold text-slate-900 sm:text-2xl"
                style={heading}
              >
                Featured workers
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Trusted professionals ready to help.
              </p>
            </div>
            <button
              onClick={() => navigate("/customer/workers")}
              className="shrink-0 text-sm font-black text-indigo-600 hover:underline dark:text-indigo-400"
            >
              View all
            </button>
          </div>

          <p className="mt-3 text-xs font-semibold text-slate-400 sm:hidden">
            Swipe sideways to browse workers
          </p>

          <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3 pr-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
            {filteredWorkers.map((worker) => (
              <article
                key={worker.id}
                className="group w-[82vw] max-w-sm shrink-0 snap-start overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)] dark:border-slate-700 dark:bg-slate-900 sm:w-[360px] lg:w-[380px]"
              >
                <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={
                      worker.profile_picture || "https://placehold.co/600x400"
                    }
                    alt={`${worker.first_name || "Worker"} profile`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <button
                    onClick={() => void toggleFavorite(String(worker.id))}
                    aria-label="Toggle favorite worker"
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-md transition hover:-translate-y-0.5 dark:bg-slate-900"
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        favorites[String(worker.id)]
                          ? "fill-rose-500 text-rose-500"
                          : "text-slate-400"
                      }`}
                    />
                  </button>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3
                        className="truncate font-black text-slate-900 dark:text-white"
                        style={heading}
                      >
                        {[
                          worker.first_name,
                          worker.middle_name,
                          worker.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ") || "Worker"}
                      </h3>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {worker.services?.[0]?.category ||
                          "Professional service"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-black text-slate-700 dark:text-slate-300">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {ratings[worker.id] ?? 0}
                    </span>
                  </div>
                  <div className="mt-4">
                    <AvailabilityBadge
                      online={Boolean(onlineStatus[worker.id])}
                      available={Boolean(availability[worker.id])}
                    />
                  </div>
                  <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                    <button
                      onClick={() => navigate(`/customer/workers/${worker.id}`)}
                      className="rounded-xl bg-indigo-600 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-indigo-700"
                    >
                      View profile
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/customer/compare?worker=${worker.id}`)
                      }
                      className="rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Compare
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {recentWorkers.length > 0 && (
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
            <h2
              className="text-xl font-black text-slate-900 dark:text-white"
              style={heading}
            >
              Recently viewed
            </h2>
            <div className="mt-5 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
              {recentWorkers.map((item: any) => {
                const worker = item.worker;
                if (!worker) return null;
                return (
                  <button
                    key={worker.id}
                    onClick={() => navigate(`/customer/workers/${worker.id}`)}
                    className="flex min-w-55 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-indigo-500/10"
                  >
                    <img
                      src={
                        worker.profile_picture || "https://placehold.co/100x100"
                      }
                      alt="Worker"
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-800 dark:text-slate-200">
                        {[worker.first_name, worker.last_name]
                          .filter(Boolean)
                          .join(" ") || "Worker"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {onlineStatus[worker.id]
                          ? "Online now"
                          : "View profile"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </CustomerLayout>
  );
}