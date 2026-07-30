import { Calendar, Clock, MapPin, User } from "lucide-react";

interface Customer {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

interface Service {
  service_name?: string | null;
  category?: string | null;
}

interface Booking {
  id: number | string;
  booking_date?: string | null;
  booking_time?: string | null;
  status?: string | null;
  customer_address?: string | null;
  address?: string | null;
  customer?: Customer | null;
  service?: Service | null;
}

interface Props {
  bookings: Booking[];
}

function getManilaDateString(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function getCustomerName(booking: Booking): string {
  const customer = booking.customer;

  if (!customer) {
    return "Customer";
  }

  const name = [
    customer.first_name,
    customer.middle_name,
    customer.last_name,
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    .map((value) => value.trim())
    .join(" ");

  return name || customer.email || "Customer";
}

function getServiceName(booking: Booking): string {
  return (
    booking.service?.service_name?.trim() ||
    booking.service?.category?.trim() ||
    "Service"
  );
}

function getAddress(booking: Booking): string {
  return (
    booking.customer_address?.trim() ||
    booking.address?.trim() ||
    "Address not provided"
  );
}

function formatBookingTime(value?: string | null): string {
  if (!value) {
    return "Time not set";
  }

  const normalized = value.length === 5 ? `${value}:00` : value;
  const date = new Date(`1970-01-01T${normalized}`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function TodaySchedule({ bookings }: Props) {
  const today = getManilaDateString();

  const todayBookings = bookings
    .filter((booking) => {
      const status = booking.status?.trim();

      return (
        booking.booking_date === today &&
        (status === "Approved" || status === "On Going")
      );
    })
    .sort((first, second) =>
      String(first.booking_time ?? "").localeCompare(
        String(second.booking_time ?? ""),
      ),
    );

  return (
    <section className="mt-10">
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Today&apos;s Schedule
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Approved and ongoing bookings for today
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Calendar className="h-6 w-6" />
          </div>
        </div>

        {todayBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Calendar className="h-11 w-11" />
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900">
              No Schedule Today
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              You do not have any approved or ongoing bookings scheduled for
              today.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayBookings.map((booking) => {
              const isOngoing = booking.status === "On Going";

              return (
                <article
                  key={booking.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white hover:shadow-md sm:p-6"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-4">
                      <div className="flex items-start gap-3">
                        <User className="mt-1 h-5 w-5 shrink-0 text-blue-600" />

                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-bold text-slate-900">
                            {getCustomerName(booking)}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {getServiceName(booking)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        <Clock className="h-4 w-4 shrink-0 text-blue-600" />
                        <span>{formatBookingTime(booking.booking_time)}</span>
                      </div>

                      <div className="flex items-start gap-3 text-sm text-slate-700">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        <span className="wrap-break-word">
                          {getAddress(booking)}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`self-start rounded-full px-3 py-1.5 text-xs font-semibold ${
                        isOngoing
                          ? "bg-cyan-100 text-cyan-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}