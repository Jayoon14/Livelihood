import { auditCaughtError } from "../../../lib/processAudit";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import { Search, Users, Star, Filter, BadgeCheck, HardHat, MapPinned, } from "lucide-react";
import { searchDashboard, getCategories, getCustomerWorkerCardMetrics, isWorkerAvailable, type WorkerSearchResult, } from "../../../services/workerService";
import NearbyWorkersModal from "./components/NearbyWorkersModal";
import WorkerBadges from "../../../components/reputation/WorkerBadges";
const heading = { fontFamily: "'Sora', sans-serif" };
const inter = { fontFamily: "'Inter', sans-serif" };
const ONLINE_TIMEOUT_MS = 15 * 60 * 1000;
const NEARBY_MODAL_SESSION_KEY = "customer:nearby-workers-modal-open";
type WorkerCardResult = WorkerSearchResult & {
    category?: string | null;
    service_name?: string | null;
    description?: string | null;
    review_count?: number;
};
const selectClass = "rounded-2xl border border-slate-200 px-5 py-4 outline-none bg-white text-slate-700 transition-colors focus:border-[#0A1930] focus:ring-2 focus:ring-[#0A1930]/10";
export default function Workers() {
    const navigate = useNavigate();
    const [workers, setWorkers] = useState<WorkerCardResult[]>([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [priceRange, setPriceRange] = useState("");
    const [rating, setRating] = useState("");
    const [availability, setAvailability] = useState("");
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [workerBookingStates, setWorkerBookingStates] = useState<Record<string, "offline" | "working" | "available">>({});
    const [showNearbyWorkersModal, setShowNearbyWorkersModal] = useState(() => {
        try {
            return window.sessionStorage.getItem(NEARBY_MODAL_SESSION_KEY) === "1";
        }
        catch {
            return false;
        }
    });
    const openNearbyWorkersModal = useCallback(() => {
        try {
            window.sessionStorage.setItem(NEARBY_MODAL_SESSION_KEY, "1");
        }
        catch {
            // Session storage may be unavailable; keep the in-memory modal state.
        }
        setShowNearbyWorkersModal(true);
    }, []);
    const closeNearbyWorkersModal = useCallback(() => {
        try {
            window.sessionStorage.removeItem(NEARBY_MODAL_SESSION_KEY);
        }
        catch {
            // Session storage may be unavailable; still close the modal normally.
        }
        setShowNearbyWorkersModal(false);
    }, []);
    const loadCategories = useCallback(async () => {
        try {
            const data = await getCategories();
            setCategories(data);
        }
        catch (error) {
            auditCaughtError({ module: "Workers", process: "background operation", action: "EXECUTE" }, error);
            console.error(error);
        }
    }, []);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadCategories();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [loadCategories]);
    const refreshWorkerStatuses = useCallback(async (workerList: WorkerCardResult[]): Promise<void> => {
        const workerIds = workerList
            .map((worker) => String(worker.id))
            .filter(Boolean);
        if (!workerIds.length) {
            setWorkerBookingStates({});
            return;
        }
        try {
            const metricsByWorker = await getCustomerWorkerCardMetrics(workerIds);
            const nextStates = Object.fromEntries(workerIds.map((workerId) => {
                const metric = metricsByWorker.get(workerId);
                const updatedAt = new Date(String(metric?.location_updated_at ?? "")).getTime();
                const elapsed = Date.now() - updatedAt;
                const online = Boolean(metric?.is_online) &&
                    Number.isFinite(updatedAt) &&
                    elapsed >= 0 &&
                    elapsed <= ONLINE_TIMEOUT_MS;
                const available = online && Boolean(metric?.is_available);
                const state: "offline" | "working" | "available" = !online
                    ? "offline"
                    : available
                        ? "available"
                        : "working";
                return [workerId, state];
            }));
            setWorkerBookingStates(nextStates);
        }
        catch (error) {
            auditCaughtError({ module: "Workers", process: "background operation", action: "EXECUTE" }, error);
            console.error("Unable to load worker card metrics:", error);
        }
    }, []);
    const loadWorkers = useCallback(async () => {
        try {
            setLoading(true);
            let min: number | undefined;
            let max: number | undefined;
            switch (priceRange) {
                case "100-300":
                    min = 100;
                    max = 300;
                    break;
                case "300-500":
                    min = 300;
                    max = 500;
                    break;
                case "500-1000":
                    min = 500;
                    max = 1000;
                    break;
                case "1000+":
                    min = 1000;
                    break;
            }
            const data = await searchDashboard(search, category, min, max);
            let filtered = data;
            if (rating) {
                filtered = filtered.filter((worker) => {
                    const average = Number(worker.average_rating ?? 0);
                    return average >= Number(rating);
                });
            }
            if (availability === "today") {
                const availableWorkers = [];
                for (const worker of filtered) {
                    const available = await isWorkerAvailable(worker.id);
                    if (available) {
                        availableWorkers.push(worker);
                    }
                }
                filtered = availableWorkers;
            }
            setWorkers(filtered);
            await refreshWorkerStatuses(filtered);
        }
        catch (error) {
            auditCaughtError({ module: "Workers", process: "background operation", action: "EXECUTE" }, error);
            console.error(error);
        }
        finally {
            setLoading(false);
        }
    }, [
        availability,
        category,
        priceRange,
        rating,
        refreshWorkerStatuses,
        search,
    ]);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadWorkers();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [loadWorkers]);
    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === "visible") {
                void loadWorkers();
            }
        };
        const timer = window.setInterval(refresh, 15000);
        const locationChannel = supabase
            .channel("customer-worker-card-presence")
            .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "worker_locations",
        }, refresh)
            .subscribe();
        window.addEventListener("online", refresh);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener("online", refresh);
            void supabase.removeChannel(locationChannel);
        };
    }, [loadWorkers]);
    return (<CustomerLayout>
      <div className="p-4 sm:p-6 lg:p-8" style={inter}>
        {/* HERO */}

        <div className="relative rounded-3xl overflow-hidden shadow-xl mb-8" style={{
            background: "linear-gradient(120deg,#2B3BF5 0%,#5B3DF0 35%,#3B7EF0 70%,#17BFE0 100%)",
        }}>
          <div className="absolute inset-0 opacity-[0.05]" style={{
            backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "40px 40px",
        }}/>

          <div className="pointer-events-none absolute -right-10 top-1/4 h-64 w-64 rounded-full bg-white/10 blur-2xl"/>
          <div className="pointer-events-none absolute left-1/3 -bottom-16 h-52 w-52 rounded-full bg-white/10 blur-2xl"/>

          <div className="relative z-10 px-10 py-12 flex flex-col lg:flex-row justify-between items-center gap-10">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white" style={heading}>
                Find Trusted Workers
              </h1>

              <p className="text-slate-300 text-lg mt-4 max-w-2xl">
                Browse verified skilled workers, compare ratings, check prices,
                and hire professionals with confidence.
              </p>

              <div className="flex flex-wrap gap-6 mt-10">
                <div className="bg-white/10 border border-white/10 rounded-2xl px-6 py-5 backdrop-blur">
                  <div className="flex items-center gap-3 text-white">
                    <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                      <Users size={22} className="text-[#0A1930]"/>
                    </div>

                    <div>
                      <h2 className="text-3xl font-bold" style={heading}>
                        {workers.length}
                      </h2>

                      <p className="text-slate-300 text-sm">Workers Found</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 border border-white/10 rounded-2xl px-6 py-5 backdrop-blur">
                  <div className="flex items-center gap-3 text-white">
                    <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                      <Filter size={20} className="text-[#0A1930]"/>
                    </div>

                    <div>
                      <h2 className="text-3xl font-bold" style={heading}>
                        {categories.length}
                      </h2>

                      <p className="text-slate-300 text-sm">Categories</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center justify-center w-64 h-64 rounded-full bg-white/10 border border-white/10 backdrop-blur shrink-0">
              <HardHat size={110} className="text-amber-400" strokeWidth={1.5}/>
            </div>
          </div>
        </div>

        {/* FILTERS */}

        <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 lg:p-8 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-blue-50">
                <Search className="h-5 w-5 text-blue-600"/>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900" style={heading}>
                  Search &amp; Filters
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  Search the worker list or view available workers on the map.
                </p>
              </div>
            </div>

            <button type="button" onClick={openNearbyWorkersModal} className="
        inline-flex items-center justify-center gap-2
        rounded-2xl bg-blue-600 px-5 py-3
        text-sm font-semibold text-white
        shadow-lg shadow-blue-600/20
        transition
        hover:-translate-y-0.5 hover:bg-blue-700
        focus:outline-none focus:ring-2
        focus:ring-blue-500 focus:ring-offset-2
      ">
              <MapPinned size={18}/>
              View Nearby Workers
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            <input type="text" placeholder="Search worker..." value={search} onChange={(event) => setSearch(event.target.value)} className={selectClass}/>

            <select value={category} onChange={(event) => setCategory(event.target.value)} className={selectClass}>
              <option value="">All Categories</option>

              {categories.map((cat) => (<option key={cat} value={cat}>
                  {cat}
                </option>))}
            </select>

            <select value={priceRange} onChange={(event) => setPriceRange(event.target.value)} className={selectClass}>
              <option value="">All Prices</option>
              <option value="100-300">₱100 - ₱300</option>
              <option value="300-500">₱300 - ₱500</option>
              <option value="500-1000">₱500 - ₱1000</option>
              <option value="1000+">₱1000+</option>
            </select>

            <select value={rating} onChange={(event) => setRating(event.target.value)} className={selectClass}>
              <option value="">All Ratings</option>
              <option value="5">★★★★★</option>
              <option value="4">★★★★☆ &amp; up</option>
              <option value="3">★★★☆☆ &amp; up</option>
              <option value="2">★★☆☆☆ &amp; up</option>
              <option value="1">★☆☆☆☆ &amp; up</option>
            </select>

            <select value={availability} onChange={(event) => setAvailability(event.target.value)} className={selectClass}>
              <option value="">All Availability</option>
              <option value="today">Available Today</option>
            </select>
          </div>
        </div>

        {/* RESULT HEADER */}

        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
          <h2 className="text-lg font-bold text-slate-900 sm:text-2xl" style={heading}>
            Available Workers
          </h2>

          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm">
            <BadgeCheck size={17}/>
            {workers.length} Workers Found
          </div>
        </div>
        {/* WORKER CONTENT */}

        {loading ? (<div className="grid lg:grid-cols-3 md:grid-cols-2 gap-7">
            {[1, 2, 3, 4, 5, 6].map((item) => (<div key={item} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
                <div className="h-56 bg-slate-100"/>

                <div className="p-6 space-y-4">
                  <div className="h-6 bg-slate-100 rounded-lg w-2/3"/>
                  <div className="h-4 bg-slate-100 rounded-lg w-1/2"/>
                  <div className="h-4 bg-slate-100 rounded-lg w-full"/>
                  <div className="h-4 bg-slate-100 rounded-lg w-5/6"/>

                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <div className="h-20 bg-slate-100 rounded-2xl"/>
                    <div className="h-20 bg-slate-100 rounded-2xl"/>
                  </div>

                  <div className="h-12 bg-slate-100 rounded-2xl"/>
                  <div className="h-12 bg-slate-100 rounded-2xl"/>
                </div>
              </div>))}
          </div>) : workers.length === 0 ? (<div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-20 px-6 text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
              <Search size={38} className="text-blue-600"/>
            </div>

            <h2 className="text-2xl font-bold mt-6 text-slate-900" style={heading}>
              No workers found
            </h2>

            <p className="text-slate-500 mt-3 max-w-lg mx-auto">
              No workers matched your current search and filters. Try changing
              the category, rating, price range, or availability.
            </p>

            <button onClick={() => {
                setSearch("");
                setCategory("");
                setPriceRange("");
                setRating("");
                setAvailability("");
            }} className="mt-7 bg-[#0A1930] hover:bg-[#12294D] text-white px-7 py-3 rounded-2xl font-semibold transition-colors">
              Clear All Filters
            </button>
          </div>) : (<div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-7">
            {workers.map((worker) => {
                const averageRating = Number(worker.average_rating ?? 0).toFixed(1);
                const workerId = String(worker.id);
                const bookingState = workerBookingStates[workerId] ??
                    "offline";
                return (<div key={worker.id} className="
                    group
                    bg-white
                    rounded-2xl
                    sm:rounded-3xl
                    border
                    border-slate-100
                    shadow-lg
                    overflow-hidden
                    hover:-translate-y-2
                    hover:shadow-2xl
                    transition-all
                    duration-300
                  ">
                  {/* IMAGE */}

                  <div className="relative h-44 overflow-hidden bg-slate-100 sm:h-52 lg:h-60">
                    <img src={worker.profile_picture ||
                        "https://placehold.co/600x400?text=Worker"} alt={`${worker.first_name} ${worker.last_name}`} className="
                        w-full
                        h-full
                        object-cover
                        group-hover:scale-105
                        transition-transform
                        duration-500
                      "/>

                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent"/>

                    <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
                      <span className="inline-flex items-center gap-1 bg-white/95 text-amber-600 px-3 py-1.5 rounded-full font-bold shadow-lg text-xs sm:px-4 sm:py-2 sm:text-sm">
                        <Star size={16} fill="currentColor"/>
                        {averageRating}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5">
                      <h2 className="text-lg font-bold text-white sm:text-xl" style={heading}>
                        {worker.first_name} {worker.last_name}
                      </h2>

                      <p className="text-slate-200 mt-1 font-medium text-sm">
                        {worker.category || "Skilled Worker"}
                      </p>
                    </div>
                  </div>

                  {/* CARD BODY */}

                  <div className="p-4 sm:p-5 lg:p-6">
                    <div className="mb-3 flex flex-wrap items-center gap-1.5 sm:mb-4 sm:gap-2">
                      <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[11px] font-semibold sm:px-3 sm:py-1.5 sm:text-xs">
                        <BadgeCheck size={14}/>
                        Verified Worker
                      </span>

                      {bookingState === "available" ? (<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 sm:px-3 sm:py-1.5 sm:text-xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>
                          Available
                        </span>) : bookingState === "working" ? (<span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 sm:px-3 sm:py-1.5 sm:text-xs">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500"/>
                          Working
                        </span>) : (<span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 sm:px-3 sm:py-1.5 sm:text-xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500"/>
                          Offline
                        </span>)}

                      {worker.service_name && (<span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[11px] font-semibold sm:px-3 sm:py-1.5 sm:text-xs">
                          {worker.service_name}
                        </span>)}
                    </div>

                    <WorkerBadges compact showScore maxBadges={2} metrics={{
                        averageRating: Number(worker.average_rating ?? 0),
                        completedJobs: Number(worker.completed_jobs ?? 0),
                        reviewCount: Number(worker.review_count ?? 0),
                    }} className="mb-3 sm:mb-4"/>

                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500 sm:mt-5 sm:min-h-21 sm:line-clamp-3 sm:text-sm sm:leading-7">
                      {worker.description ||
                        "Professional and reliable worker ready to provide quality service."}
                    </p>

                    {/* DETAILS */}

                    <div className="mt-4 grid grid-cols-2 items-stretch gap-2.5 sm:mt-6 sm:gap-4">
                      <div className="flex h-20 flex-col justify-between rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-emerald-100 p-3 shadow-sm sm:h-28 sm:rounded-2xl sm:p-5">
                        <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">
                          Completed Jobs
                        </p>

                        <p className="mt-1 text-lg font-bold text-emerald-700 sm:text-2xl" style={heading}>
                          {worker.completed_jobs ?? 0}
                        </p>
                      </div>

                      <div className="flex h-20 flex-col justify-between rounded-xl border border-amber-200 bg-linear-to-br from-amber-50 to-orange-100 p-3 shadow-sm sm:h-28 sm:rounded-2xl sm:p-5">
                        <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">
                          Rating
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          <Star size={20} className="text-amber-500" fill="currentColor"/>

                          <p className="text-lg font-bold text-amber-700 sm:text-2xl" style={heading}>
                            {averageRating}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* BOOKING STATUS */}

                    {bookingState !== "available" && (<div className={`mt-4 rounded-xl border p-3 text-xs sm:mt-5 sm:rounded-2xl sm:p-4 sm:text-sm ${bookingState === "working"
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-rose-200 bg-rose-50 text-rose-800"}`}>
                        <p className="font-bold">
                          {bookingState === "working"
                            ? "Worker is currently working"
                            : "Worker is currently offline"}
                        </p>
                        <p className="mt-1 leading-5 opacity-80">
                          {bookingState === "working"
                            ? "This worker cannot accept another booking while an active job is in progress."
                            : "You may view the profile, but booking will be available only when the worker is online."}
                        </p>
                      </div>)}

                    {/* ACTIONS */}

                    <div className="my-4 border-t border-slate-100 sm:my-6"/>

                    <div className="grid grid-cols-2 gap-2.5 sm:block sm:space-y-3">
                      <Link to={`/customer/workers/${worker.id}`} className="
                          block
                          w-full
                          rounded-xl
                          sm:rounded-2xl
                          bg-linear-to-r
                          from-blue-700
                          via-blue-600
                          to-indigo-600
                          py-2.5
                          sm:py-3.5
                          text-center
                          text-xs
                          font-semibold
                          sm:text-base
                          text-white
                          shadow-lg
                          shadow-blue-500/20
                          transition-all
                          duration-300
                          hover:-translate-y-0.5
                          hover:shadow-xl
                          hover:shadow-blue-500/30
                        ">
                        View Profile
                      </Link>

                      <button onClick={() => navigate(`/customer/compare?worker=${worker.id}`)} className="
                          w-full
                          rounded-xl
                          sm:rounded-2xl
                          border-2
                          border-slate-200
                          bg-white
                          py-2.5
                          text-xs
                          font-semibold
                          sm:py-3.5
                          sm:text-base
                          text-slate-700
                          transition-all
                          duration-300
                          hover:-translate-y-0.5
                          hover:border-blue-500
                          hover:bg-blue-50
                          hover:text-blue-700
                        ">
                        Compare
                      </button>
                    </div>
                  </div>
                </div>);
            })}
          </div>)}
        <NearbyWorkersModal open={showNearbyWorkersModal} onClose={closeNearbyWorkersModal}/>
      </div>
    </CustomerLayout>);
}
