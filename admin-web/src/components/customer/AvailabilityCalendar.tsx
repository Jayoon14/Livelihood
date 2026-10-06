import { auditUiError, auditCaughtError } from "../../lib/processAudit";
import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import { toast } from "sonner";
import "react-calendar/dist/Calendar.css";
import "./AvailabilityCalendar.css";
import { getUnavailableDates } from "../../services/availabilityService";
import { getFullyBookedDates } from "../../services/scheduleService";
interface Props {
    workerId: string;
    value: string;
    onChange: (date: string) => void;
}
type CalendarValue = Date | null | [
    Date | null,
    Date | null
];
function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function parseLocalDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    if (date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day) {
        return null;
    }
    return date;
}
function getTodayStart(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}
export default function AvailabilityCalendar({ workerId, value, onChange, }: Props) {
    const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
    const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const selectedDate = useMemo(() => (value ? parseLocalDate(value) : null), [value]);
    const today = useMemo(() => getTodayStart(), []);
    useEffect(() => {
        if (!workerId) {
            const timer = window.setTimeout(() => {
                setUnavailableDates([]);
                setFullyBookedDates([]);
            }, 0);
            return () => window.clearTimeout(timer);
        }
        let active = true;
        async function loadUnavailableDates() {
            try {
                setLoading(true);
                const [unavailable, fullyBooked] = await Promise.all([
                    getUnavailableDates(workerId),
                    getFullyBookedDates(workerId),
                ]);
                if (active) {
                    setUnavailableDates(unavailable ?? []);
                    setFullyBookedDates(fullyBooked ?? []);
                }
            }
            catch (error) {
                auditCaughtError({ module: "Schedules", process: "loadUnavailableDates", action: "READ" }, error);
                console.error("Unable to load unavailable dates:", error);
                if (active) {
                    setUnavailableDates([]);
                    setFullyBookedDates([]);
                    auditUiError({ module: "Schedules", process: "loadUnavailableDates", action: "READ" }, toast.error, "Unable to load the worker's availability.");
                }
            }
            finally {
                if (active) {
                    setLoading(false);
                }
            }
        }
        void loadUnavailableDates();
        // Keep availability current while the customer leaves the booking page open.
        // This makes a date/time become available again shortly after a booking is
        // completed/cancelled or after its blocking interval has ended.
        const refreshTimer = window.setInterval(() => {
            void loadUnavailableDates();
        }, 60_000);
        return () => {
            active = false;
            window.clearInterval(refreshTimer);
        };
    }, [workerId]);
    function handleDateChange(selectedValue: CalendarValue) {
        if (!(selectedValue instanceof Date)) {
            return;
        }
        const selected = new Date(selectedValue);
        selected.setHours(0, 0, 0, 0);
        if (selected < today) {
            toast.warning("Please select a future date.");
            return;
        }
        const dateKey = formatLocalDate(selected);
        if (unavailableDates.includes(dateKey)) {
            toast.warning("Worker is unavailable on this date.");
            return;
        }
        if (fullyBookedDates.includes(dateKey)) {
            toast.warning("This date is fully booked. Please choose another date.");
            return;
        }
        onChange(dateKey);
    }
    return (<div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <label className="font-semibold text-slate-800">
          Preferred Date
        </label>

        {loading && (<span className="text-xs font-medium text-slate-500">
            Loading availability...
          </span>)}
      </div>

      <Calendar minDate={today} minDetail="month" value={selectedDate} onChange={handleDateChange} showNeighboringMonth={false} tileDisabled={({ date, view }) => {
            if (view !== "month") {
                return false;
            }
            const normalizedDate = new Date(date);
            normalizedDate.setHours(0, 0, 0, 0);
            const dateKey = formatLocalDate(normalizedDate);
            return (normalizedDate < today ||
                unavailableDates.includes(dateKey) ||
                fullyBookedDates.includes(dateKey));
        }} tileClassName={({ date, view }) => {
            if (view !== "month") {
                return undefined;
            }
            const normalizedDate = new Date(date);
            normalizedDate.setHours(0, 0, 0, 0);
            const dateKey = formatLocalDate(normalizedDate);
            if (normalizedDate < today) {
                return "past-day";
            }
            if (unavailableDates.includes(dateKey)) {
                return "unavailable-day";
            }
            if (fullyBookedDates.includes(dateKey)) {
                return "fully-booked-day";
            }
            return "available-day";
        }}/>

      <div className="flex flex-wrap gap-5 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-green-500"/>
          <span>Available</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-red-500"/>
          <span>Worker unavailable</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-slate-500"/>
          <span>Fully booked</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-slate-300"/>
          <span>Past date</span>
        </div>
      </div>
    </div>);
}
