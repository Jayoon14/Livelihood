import { auditCaughtError } from "../../../lib/processAudit";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, CheckCircle2, CircleCheckBig, CircleX, Clock3, Hourglass, Loader2, MessageCircle, Navigation, RefreshCw, Search, WalletCards, X, Flag, FileText, ChevronDown, ChevronLeft, ChevronRight, } from "lucide-react";
import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import { acceptBooking, cancelWorkerBooking, getWorkerBookings, } from "../../../services/workerBookingService";
import BookingActivity from "../../../components/worker/Timeline/BookingActivity";
import ReportCaseModal from "../../../components/reports/ReportCaseModal";
import { getMyActiveReportCasesForBookings } from "../../../services/caseReportService";
import type { ReportCase } from "../../../types/report";
type BookingStatus = "Pending" | "Approved" | "On Going" | "Waiting Customer Confirmation" | "Completed" | "Cancelled";
type StatusFilter = "All" | BookingStatus;
type BookingAction = "accept" | "cancel";
interface CustomerProfile {
    id?: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    profile_picture?: string | null;
}
interface BookingService {
    id?: number;
    service_name?: string | null;
}
interface WorkerBooking {
    id: number;
    status: BookingStatus;
    trip_status?: string | null;
    booking_date?: string | null;
    booking_time?: string | null;
    address?: string | null;
    customer_address?: string | null;
    notes?: string | null;
    price?: number | string | null;
    category?: string | null;
    cancel_reason?: string | null;
    accepted_at?: string | null;
    arrived_at?: string | null;
    trip_started_at?: string | null;
    completed_at?: string | null;
    created_at?: string | null;
    customer_latitude?: number | null;
    customer_longitude?: number | null;
    customer?: CustomerProfile | null;
    service?: BookingService | null;
    [key: string]: unknown;
}
interface ActionState {
    bookingId: number;
    action: BookingAction;
}
const STATUS_ORDER: BookingStatus[] = [
    "Pending",
    "Approved",
    "On Going",
    "Waiting Customer Confirmation",
    "Completed",
    "Cancelled",
];
const currencyFormatter = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
});
function isBookingStatus(value: unknown): value is BookingStatus {
    return STATUS_ORDER.includes(value as BookingStatus);
}
function normalizeBooking(value: unknown): WorkerBooking | null {
    if (!value || typeof value !== "object")
        return null;
    const candidate = value as Record<string, unknown>;
    const id = Number(candidate.id);
    const status = candidate.status;
    if (!Number.isFinite(id) || !isBookingStatus(status))
        return null;
    return candidate as unknown as WorkerBooking;
}
function getCustomerName(customer?: CustomerProfile | null): string {
    const name = [customer?.first_name, customer?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
    return name || "Customer";
}
function getCustomerInitials(customer?: CustomerProfile | null): string {
    const first = customer?.first_name?.trim().charAt(0) ?? "";
    const last = customer?.last_name?.trim().charAt(0) ?? "";
    return `${first}${last}`.toUpperCase() || "C";
}
function getServiceName(booking: WorkerBooking): string {
    return booking.service?.service_name?.trim() || "General Service";
}
function getBookingPrice(booking: WorkerBooking): number {
    const value = Number(booking.price ?? 0);
    return Number.isFinite(value) ? value : 0;
}
function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}
function parseLocalDate(value?: string | null): Date | null {
    if (!value)
        return null;
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = dateOnly ? new Date(`${value}T00:00:00`) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
function formatBookingDate(value?: string | null): string {
    const date = parseLocalDate(value);
    return date ? dateFormatter.format(date) : "Not specified";
}
function formatBookingTime(value?: string | null): string {
    if (!value)
        return "Not specified";
    const [hoursText, minutesText] = value.split(":");
    const hours = Number(hoursText);
    const minutes = Number(minutesText ?? 0);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes))
        return value;
    return new Intl.DateTimeFormat("en-PH", {
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(2000, 0, 1, hours, minutes));
}
function formatDateTime(value?: string | null, fallback = "Not available"): string {
    if (!value)
        return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return fallback;
    return new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}
function getStatusBadgeClass(status: BookingStatus): string {
    switch (status) {
        case "Pending":
            return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";
        case "Approved":
            return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300";
        case "On Going":
            return "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300";
        case "Waiting Customer Confirmation":
            return "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300";
        case "Completed":
            return "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300";
        case "Cancelled":
            return "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300";
    }
}
function getStatusBorderClass(status: BookingStatus): string {
    switch (status) {
        case "Pending":
            return "border-amber-500";
        case "Approved":
            return "border-emerald-500";
        case "On Going":
            return "border-violet-500";
        case "Waiting Customer Confirmation":
            return "border-cyan-500";
        case "Completed":
            return "border-blue-500";
        case "Cancelled":
            return "border-red-500";
    }
}
function hasCustomerCoordinates(booking: WorkerBooking): boolean {
    return (typeof booking.customer_latitude === "number" &&
        typeof booking.customer_longitude === "number");
}
export default function Bookings() {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<WorkerBooking[]>([]);
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
    const [reportBooking, setReportBooking] = useState<{
        booking: WorkerBooking;
        type: "report" | "complaint";
    } | null>(null);
    const [, setActiveCasesByBooking] = useState<Record<number, ReportCase[]>>({});
    const [expandedBookingIds, setExpandedBookingIds] = useState<Set<number>>(() => new Set());
    const [selectedBooking, setSelectedBooking] = useState<WorkerBooking | null>(null);
    const [cancelTarget, setCancelTarget] = useState<WorkerBooking | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState("1");
    const bookingsSectionRef = useRef<HTMLElement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [actionState, setActionState] = useState<ActionState | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const toggleBookingExpanded = useCallback((bookingId: number) => {
        setExpandedBookingIds((current) => {
            const next = new Set(current);
            if (next.has(bookingId)) {
                next.delete(bookingId);
            }
            else {
                next.add(bookingId);
            }
            return next;
        });
    }, []);
    const loadBookings = useCallback(async (refresh = false) => {
        if (refresh) {
            setIsRefreshing(true);
        }
        else {
            setIsLoading(true);
        }
        setPageError(null);
        try {
            const { data: { user }, error: authError, } = await supabase.auth.getUser();
            if (authError)
                throw authError;
            if (!user) {
                throw new Error("Worker not authenticated.");
            }
            setWorkerId(user.id);
            const result = await getWorkerBookings(user.id);
            const normalized = Array.isArray(result)
                ? result
                    .map(normalizeBooking)
                    .filter((booking): booking is WorkerBooking => booking !== null)
                : [];
            setBookings(normalized);
            try {
                const cases = await getMyActiveReportCasesForBookings(normalized.map((booking) => booking.id));
                const grouped = cases.reduce<Record<number, ReportCase[]>>((current, item) => {
                    current[item.booking_id] = [
                        ...(current[item.booking_id] ?? []),
                        item,
                    ];
                    return current;
                }, {});
                setActiveCasesByBooking(grouped);
            }
            catch (caseError) {
                auditCaughtError({ module: "Bookings", process: "background operation", action: "EXECUTE" }, caseError);
                console.error("Load worker active report cases error:", caseError);
                setActiveCasesByBooking({});
            }
            setSelectedBooking((current) => current
                ? (normalized.find((booking) => booking.id === current.id) ?? null)
                : null);
        }
        catch (error) {
            auditCaughtError({ module: "Bookings", process: "background operation", action: "EXECUTE" }, error);
            console.error("Load bookings error:", error);
            setPageError(error instanceof Error
                ? error.message
                : "Unable to load your bookings.");
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);
    useEffect(() => {
        let isMounted = true;
        let channel: ReturnType<typeof supabase.channel> | null = null;
        const setupRealtime = async () => {
            await loadBookings();
            const { data: { user }, error, } = await supabase.auth.getUser();
            if (error) {
                console.error("Worker realtime auth error:", error);
                return;
            }
            if (!user || !isMounted) {
                return;
            }
            channel = supabase
                .channel(`worker-bookings-page-${user.id}`)
                .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "bookings",
                filter: `worker_id=eq.${user.id}`,
            }, () => {
                if (isMounted) {
                    void loadBookings(true);
                }
            })
                .subscribe((status) => {
                if (status === "CHANNEL_ERROR") {
                    console.error("Worker bookings realtime channel error.");
                }
                if (status === "TIMED_OUT") {
                    console.error("Worker bookings realtime connection timed out.");
                }
            });
        };
        void setupRealtime();
        return () => {
            isMounted = false;
            if (channel) {
                void supabase.removeChannel(channel);
            }
        };
    }, [loadBookings]);
    useEffect(() => {
        if (!selectedBooking)
            return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setSelectedBooking(null);
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [selectedBooking]);
    useEffect(() => {
        if (!successMessage && !pageError)
            return;
        const timer = window.setTimeout(() => {
            setSuccessMessage(null);
            setPageError(null);
        }, 5000);
        return () => window.clearTimeout(timer);
    }, [successMessage, pageError]);
    const counts = useMemo(() => {
        const result: Record<BookingStatus, number> = {
            Pending: 0,
            Approved: 0,
            "On Going": 0,
            "Waiting Customer Confirmation": 0,
            Completed: 0,
            Cancelled: 0,
        };
        for (const booking of bookings) {
            result[booking.status] += 1;
        }
        return result;
    }, [bookings]);
    const filteredBookings = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return bookings.filter((booking) => {
            const searchableText = [
                booking.id,
                getCustomerName(booking.customer),
                getServiceName(booking),
                booking.address,
                booking.customer_address,
                booking.category,
            ]
                .filter((value) => value !== null && value !== undefined)
                .join(" ")
                .toLowerCase();
            const matchesSearch = !keyword || searchableText.includes(keyword);
            const matchesStatus = statusFilter === "All" || booking.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [bookings, search, statusFilter]);
    const BOOKINGS_PER_PAGE = 6;
    const totalPages = Math.max(1, Math.ceil(filteredBookings.length / BOOKINGS_PER_PAGE));
    /*
     * We intentionally do not use useEffect to clamp currentPage.
     * This avoids React's set-state-in-effect lint error.
     */
    const effectiveCurrentPage = Math.min(currentPage, totalPages);
    const paginatedBookings = useMemo(() => {
        const start = (effectiveCurrentPage - 1) * BOOKINGS_PER_PAGE;
        return filteredBookings.slice(start, start + BOOKINGS_PER_PAGE);
    }, [effectiveCurrentPage, filteredBookings]);
    const visibleBookingGroups = useMemo(() => STATUS_ORDER.map((status) => ({
        status,
        bookings: paginatedBookings.filter((booking) => booking.status === status),
    })).filter((group) => group.bookings.length > 0), [paginatedBookings]);
    const runAction = useCallback(async (bookingId: number, action: BookingAction, operation: () => Promise<unknown>, success: string, optimisticStatus?: BookingStatus): Promise<boolean> => {
        if (!workerId) {
            setPageError("Worker not authenticated.");
            return false;
        }
        setActionState({
            bookingId,
            action,
        });
        setPageError(null);
        const previousBookings = bookings;
        if (optimisticStatus) {
            setBookings((current) => current.map((booking) => booking.id === bookingId
                ? {
                    ...booking,
                    status: optimisticStatus,
                }
                : booking));
        }
        try {
            await operation();
            setSuccessMessage(success);
            await loadBookings(true);
            return true;
        }
        catch (error) {
            auditCaughtError({ module: "Bookings", process: "background operation", action: "EXECUTE" }, error);
            setBookings(previousBookings);
            console.error(`${action} booking error:`, error);
            setPageError(error instanceof Error
                ? error.message
                : `Unable to ${action} booking.`);
            return false;
        }
        finally {
            setActionState(null);
        }
    }, [bookings, loadBookings, workerId]);
    const handleApprove = useCallback(async (id: number) => {
        if (!workerId) {
            setPageError("Worker not authenticated.");
            return;
        }
        await runAction(id, "accept", () => acceptBooking(id, workerId), "Booking approved successfully.", "Approved");
    }, [runAction, workerId]);
    const handleCancel = useCallback(async (booking: WorkerBooking) => {
        if (!workerId) {
            setPageError("Worker not authenticated.");
            return;
        }
        setCancelTarget(booking);
        setCancelReason("");
    }, [workerId]);
    const submitCancellation = useCallback(async () => {
        if (!cancelTarget || !workerId)
            return;
        const bookingId = cancelTarget.id;
        const reason = cancelReason.trim();
        const success = await runAction(bookingId, "cancel", () => cancelWorkerBooking(bookingId, workerId, reason || undefined), "Booking cancelled successfully.", "Cancelled");
        if (success) {
            setCancelTarget(null);
            setCancelReason("");
            setSelectedBooking((current) => current?.id === bookingId ? null : current);
        }
    }, [cancelReason, cancelTarget, runAction, workerId]);
    const isActionRunning = (bookingId: number, action?: BookingAction): boolean => actionState?.bookingId === bookingId &&
        (!action || actionState.action === action);
    const openChat = (bookingId: number) => {
        setSelectedBooking(null);
        navigate(`/chat/${bookingId}`);
    };
    const totalBookings = bookings.length;
    const scrollToBookings = useCallback(() => {
        bookingsSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }, []);
    const resetToFirstPage = useCallback(() => {
        setCurrentPage(1);
        setPageInput("1");
    }, []);
    const goToPage = useCallback(() => {
        const parsedPage = Number.parseInt(pageInput, 10);
        const nextPage = Number.isFinite(parsedPage)
            ? Math.min(Math.max(1, parsedPage), totalPages)
            : effectiveCurrentPage;
        setCurrentPage(nextPage);
        setPageInput(String(nextPage));
    }, [effectiveCurrentPage, pageInput, totalPages]);
    return (<WorkerLayout>
      <div className="relative mx-auto w-full max-w-[1600px] space-y-5 bg-slate-50 p-3 sm:space-y-6 sm:p-5 lg:p-8 dark:bg-slate-950">
        {successMessage && (<div className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/95 p-4 text-emerald-800 shadow-sm backdrop-blur dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0"/>
              <p className="font-medium">{successMessage}</p>
            </div>

            <button type="button" onClick={() => setSuccessMessage(null)} aria-label="Dismiss success message" className="rounded-lg p-1 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/40">
              <X className="h-4 w-4"/>
            </button>
          </div>)}

        {pageError && (<div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50/95 p-4 text-red-800 shadow-sm backdrop-blur dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            <div className="flex gap-3">
              <CircleX className="mt-0.5 h-5 w-5 shrink-0"/>

              <div>
                <p className="font-semibold">Booking error</p>

                <p className="mt-1 text-sm">{pageError}</p>
              </div>
            </div>

            <button type="button" onClick={() => setPageError(null)} aria-label="Dismiss error message" className="rounded-lg p-1 transition hover:bg-red-100 dark:hover:bg-red-900/40">
              <X className="h-4 w-4"/>
            </button>
          </div>)}

        <section className="relative overflow-hidden rounded-[1.75rem] bg-linear-to-br from-blue-800 via-blue-700 to-cyan-500 p-5 text-white shadow-[0_24px_70px_rgba(37,99,235,0.24)] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"/>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-100 backdrop-blur">
                Worker Dashboard
              </p>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                My Bookings
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
                View customer requests, manage approved bookings, communicate
                with clients, and complete active services.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={() => void loadBookings(true)} disabled={isRefreshing || isLoading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-bold transition hover:-translate-y-0.5 hover:bg-white/20 disabled:translate-y-0 disabled:opacity-60 sm:w-auto">
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}/>

                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>

              <div className="hidden h-24 w-24 items-center justify-center rounded-3xl border border-white/15 bg-white/10 backdrop-blur lg:flex">
                <CalendarDays className="h-12 w-12"/>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"/>

              <input type="search" value={search} onChange={(event) => {
            setSearch(event.target.value);
            resetToFirstPage();
        }} placeholder="Search customer, booking ID, service, or address..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-12 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"/>

              {search && (<button type="button" onClick={() => {
                setSearch("");
                resetToFirstPage();
            }} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 dark:hover:bg-slate-700">
                  <X className="h-4 w-4"/>
                </button>)}
            </div>

            <select value={statusFilter} onChange={(event) => {
            setStatusFilter(event.target.value as StatusFilter);
            resetToFirstPage();
        }} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white lg:w-auto lg:min-w-55">
              <option value="All">All Bookings</option>

              {STATUS_ORDER.map((status) => (<option key={status} value={status}>
                  {status}
                </option>))}
            </select>
          </div>
        </section>

        {!isLoading && filteredBookings.length > 0 && (<section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Showing{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {(effectiveCurrentPage - 1) * BOOKINGS_PER_PAGE + 1}–
                  {Math.min(effectiveCurrentPage * BOOKINGS_PER_PAGE, filteredBookings.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {filteredBookings.length}
                </span>{" "}
                bookings
              </p>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" onClick={() => {
                const nextPage = Math.max(1, effectiveCurrentPage - 1);
                setCurrentPage(nextPage);
                setPageInput(String(nextPage));
            }} disabled={effectiveCurrentPage === 1} aria-label="Previous page" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                  <ChevronLeft className="h-4 w-4"/>
                </button>

                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Page
                </span>

                <input type="number" min={1} max={totalPages} value={pageInput} onChange={(event) => setPageInput(event.target.value)} onBlur={goToPage} onKeyDown={(event) => {
                if (event.key === "Enter") {
                    goToPage();
                }
            }} aria-label="Page number" className="h-10 w-14 rounded-xl border border-slate-200 bg-white px-2 text-center text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/>

                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  of {totalPages}
                </span>

                <button type="button" onClick={() => {
                const nextPage = Math.min(totalPages, effectiveCurrentPage + 1);
                setCurrentPage(nextPage);
                setPageInput(String(nextPage));
            }} disabled={effectiveCurrentPage >= totalPages} aria-label="Next page" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                  <ChevronRight className="h-4 w-4"/>
                </button>
              </div>
            </div>
          </section>)}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-7">
          <StatCard label="Total Bookings" value={totalBookings} icon={<CalendarDays className="h-8 w-8"/>} accent="blue" total={totalBookings}/>

          <StatCard label="Pending" value={counts.Pending} icon={<Clock3 className="h-8 w-8"/>} accent="amber" total={totalBookings}/>

          <StatCard label="Approved" value={counts.Approved} icon={<CircleCheckBig className="h-8 w-8"/>} accent="emerald" total={totalBookings}/>

          <StatCard label="On Going" value={counts["On Going"]} icon={<Navigation className="h-8 w-8"/>} accent="violet" total={totalBookings}/>

          <StatCard label="Awaiting Confirmation" value={counts["Waiting Customer Confirmation"]} icon={<Hourglass className="h-8 w-8"/>} accent="cyan" total={totalBookings}/>

          <StatCard label="Completed" value={counts.Completed} icon={<WalletCards className="h-8 w-8"/>} accent="sky" total={totalBookings}/>

          <StatCard label="Cancelled" value={counts.Cancelled} icon={<CircleX className="h-8 w-8"/>} accent="red" total={totalBookings}/>
        </section>

        {!isLoading && filteredBookings.length > 0 && (<div className="flex justify-center">
            <button type="button" onClick={scrollToBookings} className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-black text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-blue-500/30 dark:bg-slate-900 dark:text-blue-300">
              View bookings
              <ChevronDown className="h-4 w-4"/>
            </button>
          </div>)}

        {isLoading ? (<section className="flex min-h-80 flex-col items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white p-4 text-center shadow-sm sm:p-6 lg:p-8 dark:border-slate-700 dark:bg-slate-900">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600"/>

            <h2 className="mt-5 text-xl font-bold">Loading bookings</h2>

            <p className="mt-2 text-slate-500">
              Please wait while we retrieve your records.
            </p>
          </section>) : visibleBookingGroups.length === 0 ? (<section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 text-center shadow-sm sm:p-6 lg:p-8 dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
              <CalendarDays className="h-10 w-10 text-blue-600"/>
            </div>

            <h2 className="mt-5 text-2xl font-bold">No bookings found</h2>

            <p className="mx-auto mt-2 max-w-md text-slate-500">
              {bookings.length === 0
                ? "Customer booking requests will appear here."
                : "No booking matches your current search and filter."}
            </p>
          </section>) : (<section ref={bookingsSectionRef} className="scroll-mt-6 space-y-7">
            {visibleBookingGroups.map(({ status, bookings: group }) => (<div key={status} className="space-y-4">
                <div className={`flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${getStatusBorderClass(status)} border-l-4`}>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                      {status}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {group.length}{" "}
                      {group.length === 1 ? "booking" : "bookings"}
                    </p>
                  </div>

                  <span className={`rounded-full px-4 py-2 text-xs font-bold ${getStatusBadgeClass(status)}`}>
                    {group.length}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {group.map((booking) => {
                    const busy = isActionRunning(booking.id);
                    const customerName = getCustomerName(booking.customer);
                    const address = booking.address?.trim() ||
                        booking.customer_address?.trim() ||
                        "No address provided";
                    return (<article key={booking.id} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-900">
                        <div className="relative bg-linear-to-br from-blue-700 via-blue-600 to-indigo-600 p-4 text-white sm:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              {booking.customer?.profile_picture ? (<img src={booking.customer.profile_picture} alt={customerName} className="h-12 w-12 shrink-0 rounded-xl border-2 border-white object-cover shadow-md sm:h-14 sm:w-14"/>) : (<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-white bg-white font-black text-blue-700 shadow-md sm:h-14 sm:w-14">
                                  {getCustomerInitials(booking.customer)}
                                </div>)}

                              <div className="min-w-0">
                                <h3 className="truncate text-base font-black sm:text-lg">
                                  {customerName}
                                </h3>

                                <p className="text-xs text-blue-100 sm:text-sm">
                                  Customer
                                </p>

                                <p className="mt-0.5 text-[11px] text-blue-100 sm:text-xs">
                                  Booking #{booking.id}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-start gap-2">
                              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${getStatusBadgeClass(booking.status)}`}>
                                {booking.status}
                              </span>

                              <button type="button" onClick={() => toggleBookingExpanded(booking.id)} aria-expanded={expandedBookingIds.has(booking.id)} aria-label={expandedBookingIds.has(booking.id)
                            ? "Collapse booking details"
                            : "Expand booking details"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 md:hidden">
                                <ChevronDown size={19} className={`transition-transform duration-200 ${expandedBookingIds.has(booking.id)
                            ? "rotate-180"
                            : ""}`}/>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className={`border-t p-4 sm:p-5 ${expandedBookingIds.has(booking.id)
                            ? "block"
                            : "hidden"} md:block`}>
                          <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Service
                            </p>

                            <h3 className="mt-1 text-xl font-black text-blue-700 dark:text-blue-300 sm:text-2xl">
                              {getServiceName(booking)}
                            </h3>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <InfoBox label="Booking Date" value={formatBookingDate(booking.booking_date)}/>

                            <InfoBox label="Arrival Time" value={formatBookingTime(booking.booking_time)}/>

                            <InfoBox label="Booking Start" value={formatDateTime(booking.trip_started_at, "Not started")}/>

                            <InfoBox label="Booking End" value={formatDateTime(booking.completed_at, "Not completed")}/>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2 dark:border-slate-700 dark:bg-slate-800/60">
                              <p className="text-xs uppercase tracking-wide text-slate-400">
                                Address
                              </p>

                              <p className="mt-2 line-clamp-2 font-semibold text-slate-800 dark:text-slate-200">
                                {address}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-700">
                            <p className="text-sm text-slate-400">
                              Total Payment
                            </p>

                            <p className="mt-1 text-2xl font-black text-blue-700 dark:text-blue-300 sm:text-3xl">
                              {formatCurrency(getBookingPrice(booking))}
                            </p>
                          </div>

                          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {booking.status === "Pending" && (
                              <ActionButton
                                label="Accept"
                                loading={isActionRunning(booking.id, "accept")}
                                onClick={() => void handleApprove(booking.id)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              />
                            )}

                            {booking.status === "Approved" && hasCustomerCoordinates(booking) && (
                              <Link
                                to={`/worker/navigation/${booking.id}`}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-cyan-700"
                              >
                                <Navigation className="h-4 w-4"/>
                                Navigate / Update Trip
                              </Link>
                            )}

                            {["Approved", "On Going", "Waiting Customer Confirmation", "Completed"].includes(booking.status) && (
                              <button
                                type="button"
                                onClick={() => openChat(booking.id)}
                                disabled={busy}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-purple-700 disabled:opacity-60"
                              >
                                <MessageCircle className="h-4 w-4"/>
                                Open Chat
                              </button>
                            )}

                            {booking.status === "On Going" && booking.trip_status === "On Trip" && (
                              <Link
                                to={`/worker/bookings/${booking.id}/complete`}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
                              >
                                <CheckCircle2 className="h-4 w-4"/>
                                Submit Proof
                              </Link>
                            )}

                            <button type="button" onClick={() => setSelectedBooking(booking)} disabled={busy} className="min-h-11 rounded-xl bg-slate-800 px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-900 disabled:translate-y-0 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600">
                              View Details
                            </button>

                            {booking.status !== "Completed" && booking.status !== "Cancelled" && (
                              <button type="button" onClick={() => void handleCancel(booking)} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-red-700 disabled:opacity-60">
                                <CircleX className="h-4 w-4"/>
                                Cancel Booking
                              </button>
                            )}
                          </div>
                        </div>
                      </article>);
                })}
                </div>
              </div>))}
          </section>)}
      </div>

      {reportBooking?.booking.customer?.id && (<ReportCaseModal open bookingId={reportBooking.booking.id} reportedUserId={reportBooking.booking.customer.id} reporterRole="worker" reportedRole="customer" reportedUserName={getCustomerName(reportBooking.booking.customer)} defaultCaseType={reportBooking.type} onClose={() => setReportBooking(null)} onSubmitted={() => void loadBookings(true)}/>)}

      {cancelTarget && (<div role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => {
                if (event.target === event.currentTarget && !actionState) {
                    setCancelTarget(null);
                }
            }}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-7 dark:bg-slate-900">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300">
                <CircleX className="h-6 w-6"/>
              </div>

              <div className="min-w-0">
                <h2 id="cancel-booking-title" className="text-xl font-black text-slate-900 dark:text-white">
                  Cancel Booking
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  You are cancelling Booking #{cancelTarget.id} for{" "}
                  {getCustomerName(cancelTarget.customer)}.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              The customer will be notified that the worker cancelled the
              booking. A reason is optional.
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                Reason{" "}
                <span className="font-medium text-slate-400">(optional)</span>
              </span>

              <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={4} placeholder="You may provide a reason for cancelling..." className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"/>
            </label>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => {
                setCancelTarget(null);
                setCancelReason("");
            }} disabled={Boolean(actionState)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
                Keep Booking
              </button>

              <button type="button" onClick={() => void submitCancellation()} disabled={Boolean(actionState)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-bold text-white transition hover:bg-red-700 disabled:opacity-50">
                {actionState?.action === "cancel" ? (<Loader2 className="h-4 w-4 animate-spin"/>) : (<CircleX className="h-4 w-4"/>)}

                {actionState?.action === "cancel"
                ? "Cancelling..."
                : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>)}

      {selectedBooking && (<div role="dialog" aria-modal="true" aria-labelledby="booking-details-title" onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    setSelectedBooking(null);
                }
            }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm sm:p-5">
          <div className="flex h-[calc(100dvh-1rem)] w-full max-w-5xl min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 sm:h-[92vh] sm:rounded-[2rem]">
            <div className="shrink-0 border-b border-white/10 bg-linear-to-r from-blue-700 to-indigo-700 p-4 text-white sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 id="booking-details-title" className="text-2xl font-black sm:text-3xl">
                    Booking Details
                  </h2>

                  <p className="mt-1 text-sm text-blue-100 sm:text-base">
                    Booking #{selectedBooking.id}
                  </p>
                </div>

                <button type="button" onClick={() => setSelectedBooking(null)} aria-label="Close booking details" className="shrink-0 rounded-xl p-2 transition hover:bg-white/10">
                  <X className="h-7 w-7"/>
                </button>
              </div>

              {selectedBooking.customer?.id &&
                selectedBooking.status !== "Pending" &&
                selectedBooking.status !== "Cancelled" && (<div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => setReportBooking({
                    booking: selectedBooking,
                    type: "complaint",
                })} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600">
                      <FileText className="h-4 w-4"/>
                      File Complaint
                    </button>

                    <button type="button" onClick={() => setReportBooking({
                    booking: selectedBooking,
                    type: "report",
                })} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">
                      <Flag className="h-4 w-4"/>
                      Report Customer
                    </button>
                  </div>)}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {selectedBooking.customer?.profile_picture ? (<img src={selectedBooking.customer.profile_picture} alt={getCustomerName(selectedBooking.customer)} className="h-20 w-20 rounded-3xl border-4 border-white object-cover shadow-xl sm:h-24 sm:w-24"/>) : (<div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-100 text-2xl font-black text-blue-700 shadow-xl sm:h-24 sm:w-24">
                    {getCustomerInitials(selectedBooking.customer)}
                  </div>)}

                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                    {getCustomerName(selectedBooking.customer)}
                  </h3>

                  <p className="mt-2 text-slate-500">Verified Customer</p>

                  <p className="text-slate-500">
                    {selectedBooking.customer?.phone || "No phone provided"}
                  </p>

                  <p className="text-slate-500">
                    {selectedBooking.customer?.email || "No email provided"}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-linear-to-r from-blue-50 to-indigo-50 p-5 dark:border-blue-500/20 dark:from-blue-500/10 dark:to-indigo-500/10">
                <p className="text-slate-500">Booked Service</p>

                <h3 className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-300 sm:text-3xl">
                  {getServiceName(selectedBooking)}
                </h3>

                <p className="mt-4 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                  {formatCurrency(getBookingPrice(selectedBooking))}
                </p>
              </div>

              <section>
                <h3 className="mb-4 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                  Booking Information
                </h3>

                <div className="grid gap-5 md:grid-cols-2">
                  <InfoBox label="Booking Date" value={formatBookingDate(selectedBooking.booking_date)}/>

                  <InfoBox label="Arrival Time" value={formatBookingTime(selectedBooking.booking_time)}/>

                  <InfoBox label="Booking Start" value={formatDateTime(selectedBooking.trip_started_at, "Not started")}/>

                  <InfoBox label="Booking End" value={formatDateTime(selectedBooking.completed_at, "Not completed")}/>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:col-span-2 dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="text-sm text-slate-400">Address</p>

                    <p className="mt-2 font-semibold">
                      {selectedBooking.address ||
                selectedBooking.customer_address ||
                "No address provided"}
                    </p>
                  </div>
                </div>
              </section>

              {selectedBooking.notes && (<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
                  <p className="text-sm text-slate-400">Customer Notes</p>

                  <p className="mt-2 font-medium">{selectedBooking.notes}</p>
                </div>)}

              {selectedBooking.status === "Cancelled" && (<div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-500/20 dark:bg-red-500/10">
                  <p className="text-sm font-black text-red-700 dark:text-red-300">
                    Cancellation Reason
                  </p>

                  <p className="mt-2 text-sm text-red-800 dark:text-red-200">
                    {selectedBooking.cancel_reason || "No reason provided."}
                  </p>
                </div>)}

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-7">
                <h3 className="mb-5 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                  Booking Progress
                </h3>

                <BookingProgress status={selectedBooking.status}/>
              </div>

              <BookingActivity booking={selectedBooking}/>

              <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-700">
                {selectedBooking.status === "Pending" && (<>
                    <ActionButton label="Accept" loading={isActionRunning(selectedBooking.id, "accept")} onClick={async () => {
                    await handleApprove(selectedBooking.id);
                    setSelectedBooking(null);
                }} className="bg-emerald-600 hover:bg-emerald-700"/>

                    <button type="button" onClick={() => void handleCancel(selectedBooking)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700">
                      <CircleX className="h-4 w-4"/>
                      Cancel Booking
                    </button>
                  </>)}

                {selectedBooking.status === "Approved" &&
                hasCustomerCoordinates(selectedBooking) && (<Link to={`/worker/navigation/${selectedBooking.id}`} onClick={() => setSelectedBooking(null)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700">
                      <Navigation className="h-4 w-4"/>
                      Update Trip
                    </Link>)}

                {[
                "Approved",
                "On Going",
                "Waiting Customer Confirmation",
                "Completed",
            ].includes(selectedBooking.status) && (<button type="button" onClick={() => openChat(selectedBooking.id)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 font-semibold text-white hover:bg-purple-700">
                    <MessageCircle className="h-4 w-4"/>
                    Open Chat
                  </button>)}

                {selectedBooking.status === "On Going" &&
                selectedBooking.trip_status === "On Trip" && (<Link to={`/worker/bookings/${selectedBooking.id}/complete`} onClick={() => setSelectedBooking(null)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700">
                      <CheckCircle2 className="h-4 w-4"/>
                      Submit Proof
                    </Link>)}

                {selectedBooking.status !== "Completed" &&
                selectedBooking.status !== "Cancelled" &&
                selectedBooking.status !== "Pending" && (<button type="button" onClick={() => void handleCancel(selectedBooking)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700">
                      <CircleX className="h-4 w-4"/>
                      Cancel Booking
                    </button>)}

                <button type="button" onClick={() => setSelectedBooking(null)} className="min-h-11 rounded-xl bg-slate-800 px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>)}
    </WorkerLayout>);
}
interface StatCardProps {
    label: string;
    value: number;
    icon: ReactNode;
    accent: "blue" | "amber" | "emerald" | "violet" | "cyan" | "sky" | "red";
    total: number;
}
function StatCard({ label, value, icon, accent, total }: StatCardProps) {
    const styles = {
        blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
        amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
        emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
        violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
        cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
        sky: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
        red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    }[accent];
    const progress = total ? Math.min((value / total) * 100, 100) : 0;
    return (<div className="flex h-full min-h-36 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:min-h-40 sm:p-5">
      <div className="flex min-h-20 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="min-h-10 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-sm">
            {label}
          </p>

          <h2 className="mt-1 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
            {value}
          </h2>
        </div>

        <div className={`rounded-xl p-3 sm:rounded-2xl sm:p-4 ${styles}`}>
          {icon}
        </div>
      </div>

      <div className="mt-auto h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-current text-blue-600 transition-all" style={{
            width: `${progress}%`,
        }}/>
      </div>
    </div>);
}
interface InfoBoxProps {
    label: string;
    value: string;
}
function InfoBox({ label, value }: InfoBoxProps) {
    return (<div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>

      <p className="mt-2 break-words font-bold text-slate-800 dark:text-slate-200">
        {value}
      </p>
    </div>);
}
interface ActionButtonProps {
    label: string;
    loading: boolean;
    onClick: () => void | Promise<void>;
    className: string;
}
function ActionButton({ label, loading, onClick, className, }: ActionButtonProps) {
    return (<button type="button" onClick={() => void onClick()} disabled={loading} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 ${className}`}>
      {loading && <Loader2 className="h-4 w-4 animate-spin"/>}

      {label}
    </button>);
}
function BookingProgress({ status }: {
    status: BookingStatus;
}) {
    const step = status === "Completed"
        ? 5
        : status === "Waiting Customer Confirmation"
            ? 4
            : status === "On Going"
                ? 3
                : status === "Approved"
                    ? 2
                    : 1;
    const steps = [
        "Submitted",
        "Approved",
        "In Progress",
        "Awaiting Confirmation",
        "Completed",
    ];
    return (<div className="max-w-full overflow-x-auto overscroll-x-contain pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
      <div className="relative min-w-[680px] sm:min-w-[760px]">
        <div className="absolute left-12 right-12 top-7 h-1 rounded-full bg-slate-200 dark:bg-slate-700"/>

        <div className="relative z-10 grid grid-cols-5 gap-4">
          {steps.map((label, index) => {
            const active = index + 1 <= step && status !== "Cancelled";
            const current = index + 1 === step && status !== "Cancelled";
            return (<div key={label} className="text-center">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold shadow-lg ${active
                    ? current && status === "Waiting Customer Confirmation"
                        ? "bg-cyan-600 text-white"
                        : "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-500"}`}>
                  {active ? "✓" : index + 1}
                </div>

                <h4 className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                  {label}
                </h4>
              </div>);
        })}
        </div>
      </div>
    </div>);
}
