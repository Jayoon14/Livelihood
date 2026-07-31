import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { getUpcomingBooking } from "../../../services/reminderService";

import {
  Star,
  Heart,
  CalendarCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
  Bell,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import {
  getFeaturedWorkers,
  getCategories,
  searchDashboard,
  getRecommendedWorkers,
  isWorkerAvailable,
} from "../../../services/workerService";

import { getWorkerAverageRating } from "../../../services/reviewService";

import {
  addFavorite,
  removeFavorite,
  isFavorite,
} from "../../../services/favoriteService";

import { getCustomerAnalytics } from "../../../services/customerAnalyticsService";

import { getRecentlyViewed } from "../../../services/recentlyViewedService";

import { supabase } from "../../../lib/supabase";

type WorkerPresenceRecord = {
  id: string;
  role?: string | null;
  last_seen?: string | null;
};

const ONLINE_TIMEOUT_MS = 2 * 60 * 1000;

function isWorkerOnline(lastSeen?: string | null): boolean {
  if (!lastSeen) return false;

  const lastSeenTime = new Date(lastSeen).getTime();

  if (!Number.isFinite(lastSeenTime)) return false;

  const elapsed = Date.now() - lastSeenTime;

  return elapsed >= 0 && elapsed <= ONLINE_TIMEOUT_MS;
}

const heading = { fontFamily: "'Sora', sans-serif" };

function AvailabilityBadge({
  online,
  available,
}: {
  online: boolean;
  available: boolean;
}) {
  if (!online) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 sm:px-3 sm:text-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Offline
      </span>
    );
  }

  if (!available) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 sm:px-3 sm:text-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Online • Not Available Today
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 sm:px-3 sm:text-xs">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Online • Available Today
    </span>
  );
}

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const [workers, setWorkers] = useState<any[]>([]);
  const [recommendedWorkers, setRecommendedWorkers] = useState<any[]>([]);
  const [, setCategories] = useState<string[]>([]);
  const [search] = useState("");

  const [recentWorkers, setRecentWorkers] = useState<any[]>([]);

  const [ratings, setRatings] = useState<Record<string, number>>({});

  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const [upcomingBooking, setUpcomingBooking] = useState<any>(null);

  const [analytics, setAnalytics] = useState({
    totalBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    favoriteWorkers: 0,
    totalPayments: 0,
  });

  useEffect(() => {
    loadDashboard();
    loadRecentWorkers();
  }, []);

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
          ids.map(async (workerId) => [
            workerId,
            Boolean(await isWorkerAvailable(workerId)),
          ] as const),
        ),
      ]);

      if (presenceResult.error) {
        throw presenceResult.error;
      }

      const onlineEntries = ids.map(
        (workerId) =>
          [
            workerId,
            isWorkerOnline(
              presenceResult.data?.find(
                (profile) => String(profile.id) === workerId,
              )?.last_seen,
            ),
          ] as const,
      );

      setOnlineStatus((current) => ({
        ...current,
        ...Object.fromEntries(onlineEntries),
      }));

      setAvailability((current) => ({
        ...current,
        ...Object.fromEntries(availabilityEntries),
      }));
    } catch (error) {
      console.error("Unable to refresh worker availability:", error);

      setOnlineStatus((current) => ({
        ...current,
        ...Object.fromEntries(ids.map((workerId) => [workerId, false])),
      }));
    }
  }, []);

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

  useEffect(() => {
    searchWorkers();
  }, [search]);

  async function loadDashboard() {
    try {
      const workerData = await getFeaturedWorkers(6);

      const categoryData = await getCategories();

      setWorkers(workerData);
      setCategories(categoryData);

      const temp: Record<string, number> = {};
      const available: Record<string, boolean> = {};

      for (const worker of workerData) {
        temp[worker.id] = await getWorkerAverageRating(worker.id);

        available[worker.id] = Boolean(await isWorkerAvailable(worker.id));
      }

      setRatings(temp);
      setAvailability(available);
      await refreshWorkerStates(workerData.map((worker) => String(worker.id)));

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const favs: Record<string, boolean> = {};

        for (const worker of workerData) {
          const favoriteStatus = await isFavorite(user.id, worker.id);

          favs[String(worker.id)] = favoriteStatus === true;
        }

        setFavorites(favs);

        const analyticsData = await getCustomerAnalytics(user.id);

        setAnalytics(analyticsData);
        const booking = await getUpcomingBooking();

        setUpcomingBooking(booking);

        const recommended = await getRecommendedWorkers(user.id);

        setRecommendedWorkers(recommended);
        await refreshWorkerStates(recommended.map((worker) => String(worker.id)));
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function loadRecentWorkers() {
    try {
      const data = await getRecentlyViewed(5);

      setRecentWorkers(data);
      await refreshWorkerStates(
        data.map((item: any) => String(item?.worker?.id ?? "")).filter(Boolean),
      );
    } catch (error) {
      console.error(error);
    }
  }

  async function searchWorkers() {
    if (!search.trim()) {
      loadDashboard();

      return;
    }

    const result = await searchDashboard(search);

    setWorkers(result);
    await refreshWorkerStates(result.map((worker) => String(worker.id)));

    const temp: Record<string, number> = {};

    for (const worker of result) {
      temp[worker.id] = await getWorkerAverageRating(worker.id);
    }

    setRatings(temp);
  }

  async function toggleFavorite(workerId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (favorites[workerId]) {
      await removeFavorite(user.id, workerId);

      setFavorites({
        ...favorites,
        [workerId]: false,
      });
    } else {
      await addFavorite(user.id, workerId);

      setFavorites({
        ...favorites,
        [workerId]: true,
      });
    }
  }

  function getReminderLabel(date: string, time: string) {
    const booking = new Date(`${date}T${time}`);
    const now = new Date();

    const diff = booking.getTime() - now.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes <= 30 && minutes >= 0) {
      return {
        text: "Starts in less than 30 minutes",
        color: "bg-red-100 text-red-700",
      };
    }

    if (hours < 3 && hours >= 0) {
      return {
        text: `Starts in ${hours} hour(s)`,
        color: "bg-orange-100 text-orange-700",
      };
    }

    if (days === 0) {
      return {
        text: "Today",
        color: "bg-emerald-100 text-emerald-700",
      };
    }

    if (days === 1) {
      return {
        text: "Tomorrow",
        color: "bg-blue-100 text-blue-700",
      };
    }

    return {
      text: `In ${days} day(s)`,
      color: "bg-slate-100 text-slate-700",
    };
  }

  const analyticsCards = [
    {
      label: "Total Bookings",
      value: analytics.totalBookings,
      icon: CalendarCheck,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Completed",
      value: analytics.completedBookings,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Pending",
      value: analytics.pendingBookings,
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Cancelled",
      value: analytics.cancelledBookings,
      icon: XCircle,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
    },
    {
      label: "Favorite Workers",
      value: analytics.favoriteWorkers,
      icon: Heart,
      iconBg: "bg-pink-50",
      iconColor: "text-pink-600",
    },
    {
      label: "Total Payments",
      value: `₱${analytics.totalPayments.toLocaleString()}`,
      icon: Wallet,
      iconBg: "bg-slate-100",
      iconColor: "text-indigo-600",
    },
  ];

  return (
    <CustomerLayout>
      <div
        className="space-y-4 sm:space-y-5 lg:space-y-6"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* ANALYTICS */}

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
          {analyticsCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm p-3.5 sm:p-5 hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${card.iconBg} flex items-center justify-center mb-2.5 sm:mb-4`}
                >
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.iconColor}`} strokeWidth={2} />
                </div>

                <p className="text-slate-500 text-xs sm:text-sm">{card.label}</p>

                <h2
                  className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1"
                  style={heading}
                >
                  {card.value}
                </h2>
              </div>
            );
          })}
        </div>

        {/* UPCOMING BOOKING */}

        {upcomingBooking && (
          <div
            className="relative rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-7 overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg,#2937f0 0%,#5b3df1 55%,#3292ec 100%)",
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                backgroundSize: "36px 36px",
              }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                  <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-slate-900" strokeWidth={2} />
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-white" style={heading}>
                  Upcoming Booking
                </h2>
              </div>

              <div className="mt-4 sm:mt-5">
                <p className="text-white font-semibold text-base sm:text-lg">
                  {upcomingBooking.worker?.first_name}{" "}
                  {upcomingBooking.worker?.last_name}
                </p>

                <p className="text-blue-100 mt-1 text-sm sm:text-base">
                  {upcomingBooking.service?.service_name}
                </p>

                <p className="text-blue-100 text-sm sm:text-base">
                  {upcomingBooking.booking_date} &middot;{" "}
                  {upcomingBooking.booking_time}
                </p>
              </div>

              {(() => {
                const reminder = getReminderLabel(
                  upcomingBooking.booking_date,
                  upcomingBooking.booking_time,
                );

                return (
                  <div
                    className={`mt-3 sm:mt-4 inline-block px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold ${reminder.color}`}
                  >
                    {reminder.text}
                  </div>
                );
              })()}

              <div>
                <button
                  onClick={() =>
                    navigate(`/customer/bookings/${upcomingBooking.id}`)
                  }
                  className="group mt-4 sm:mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm sm:text-base"
                >
                  View Booking
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RECOMMENDED WORKERS */}

        {recommendedWorkers.length > 0 && (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-6 lg:p-7">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-slate-100 shrink-0">
                <Sparkles className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-600" strokeWidth={2} />
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900" style={heading}>
                Recommended For You
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              {recommendedWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <img
                    src={
                      worker.profile?.profile_picture ||
                      worker.profile_picture ||
                      "https://placehold.co/300"
                    }
                    alt="Worker"
                    className="w-full h-48 sm:h-56 lg:h-64 object-cover"
                  />

                  <div className="p-4 sm:p-6">
                    <h3
                      className="text-lg sm:text-xl font-bold text-slate-900"
                      style={heading}
                    >
                      {worker.first_name} {worker.last_name}
                    </h3>

                    <div className="mt-2.5 sm:mt-3">
                      <AvailabilityBadge
                        online={Boolean(onlineStatus[worker.id])}
                        available={Boolean(availability[worker.id])}
                      />
                    </div>

                    <button
                      onClick={() => navigate(`/customer/workers/${worker.id}`)}
                      className="w-full mt-4 sm:mt-5 bg-linear-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] hover:-translate-y-0.5 text-white rounded-xl py-2.5 sm:py-3 font-semibold text-sm sm:text-base transition-all shadow-md shadow-indigo-400/20 hover:shadow-lg hover:shadow-indigo-400/30"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FEATURED WORKERS */}

        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-6 lg:p-7">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900" style={heading}>
              Featured Workers
            </h2>

            <button
              onClick={() => navigate("/customer/workers")}
              className="text-indigo-600 font-semibold hover:underline text-xs sm:text-sm"
            >
              View All
            </button>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative">
                  <img
                    src={
                      worker.profile?.profile_picture ||
                      worker.profile_picture ||
                      "https://placehold.co/400x250"
                    }
                    alt="Worker"
                    className="w-full h-36 sm:h-40 lg:h-44 object-cover"
                  />

                  <button
                    onClick={() => toggleFavorite(worker.id)}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white rounded-full p-1.5 sm:p-2 shadow-md hover:scale-105 transition-transform"
                  >
                    <Heart
                      size={18}
                      className={
                        favorites[worker.id]
                          ? "fill-rose-500 text-rose-500 sm:w-5 sm:h-5"
                          : "text-slate-400 sm:w-5 sm:h-5"
                      }
                    />
                  </button>
                </div>

                <div className="p-4 sm:p-5">
                  <h3
                    className="text-base sm:text-lg font-bold text-slate-900"
                    style={heading}
                  >
                    {[worker.first_name, worker.middle_name, worker.last_name]
                      .filter(Boolean)
                      .join(" ")}
                  </h3>

                  <p className="text-slate-500 mt-1 text-xs sm:text-sm">
                    {worker.services?.[0]?.category ?? "No Category"}
                  </p>

                  <div className="flex items-center gap-1.5 mt-2.5 sm:mt-3">
                    <Star
                      size={15}
                      className="text-amber-500 fill-amber-500 sm:w-4 sm:h-4"
                    />

                    <span className="font-semibold text-slate-700 text-xs sm:text-sm">
                      {ratings[worker.id] ?? 0}
                    </span>
                  </div>

                  <div className="mt-2.5 sm:mt-3">
                    <AvailabilityBadge
                        online={Boolean(onlineStatus[worker.id])}
                        available={Boolean(availability[worker.id])}
                      />
                  </div>

                  <div className="flex gap-2 mt-3.5 sm:mt-4">
                    <button
                      onClick={() => navigate(`/customer/workers/${worker.id}`)}
                      className="flex-1 bg-linear-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] hover:-translate-y-0.5 text-white rounded-xl py-2 sm:py-2.5 font-semibold text-xs sm:text-sm transition-all shadow-sm shadow-indigo-400/20 hover:shadow-md hover:shadow-indigo-400/30"
                    >
                      View Profile
                    </button>

                    <button
                      onClick={() =>
                        navigate(`/customer/compare?worker=${worker.id}`)
                      }
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
                    >
                      Compare
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RECENTLY VIEWED WORKERS */}

        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-6 lg:p-7">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 sm:mb-6" style={heading}>
            Recently Viewed Workers
          </h2>

          {recentWorkers.length === 0 ? (
            <p className="text-slate-400 text-sm">No recently viewed workers.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
              {recentWorkers.map((item: any) => {
                const worker = item.worker;

                if (!worker) return null;

                return (
                  <div
                    key={worker.id}
                    className="border border-slate-100 rounded-xl p-2.5 sm:p-3 hover:shadow-md transition-shadow"
                  >
                    <img
                      src={
                        worker.profile_picture || "https://placehold.co/200x200"
                      }
                      alt="Worker"
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover mx-auto border border-slate-100"
                    />

                    <div className="text-center mt-2 scale-90 origin-center">
                      <AvailabilityBadge
                        online={Boolean(onlineStatus[worker.id])}
                        available={Boolean(availability[worker.id])}
                      />
                    </div>

                    <div className="mt-2.5 sm:mt-3 flex flex-col gap-1.5">
                      <button
                        onClick={() =>
                          navigate(`/customer/workers/${worker.id}`)
                        }
                        className="bg-linear-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] hover:-translate-y-0.5 text-white py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all"
                      >
                        View Profile
                      </button>

                      <button
                        onClick={() =>
                          navigate(`/customer/compare?worker=${worker.id}`)
                        }
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors"
                      >
                        Compare
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}