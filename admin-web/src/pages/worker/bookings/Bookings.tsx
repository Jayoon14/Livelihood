import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";

import {
  getWorkerBookings,
  acceptBooking,
  rejectBooking,
  completeBooking,
} from "../../../services/workerBookingService";
import BookingTimeline from "../../../components/worker/Timeline/BookingTimeline";
import BookingActivity from "../../../components/worker/Timeline/BookingActivity";
import {
  CalendarDays,
  Clock3,
  CircleCheckBig,
  CircleX,
  WalletCards,
  Search,
} from "lucide-react";

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  useEffect(() => {
    loadBookings();

    const channel = supabase
      .channel("worker-bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          loadBookings();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadBookings() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const data = await getWorkerBookings(user.id);

      setBookings(data);
    } catch (error) {
      console.error("Load bookings error:", error);
    }
  }

  async function handleApprove(id: number) {
    try {
      await acceptBooking(id);

      alert("Booking approved successfully.");

      loadBookings();
    } catch (error) {
      console.error(error);

      alert("Unable to approve booking.");
    }
  }

  async function handleReject(id: number) {
    try {
      await rejectBooking(id);

      alert("Booking rejected.");

      loadBookings();
    } catch (error) {
      console.error(error);

      alert("Unable to reject booking.");
    }
  }

  async function handleComplete(id: number) {
    try {
      await completeBooking(id);

      alert("Booking completed.");

      loadBookings();
    } catch (error) {
      console.error(error);

      alert("Unable to complete booking.");
    }
  }

  const totalBookings = bookings.length;

  const pendingBookings = bookings.filter(
    (booking) => booking.status === "Pending",
  ).length;

  const approvedBookings = bookings.filter(
    (booking) => booking.status === "Approved",
  ).length;

  const completedBookings = bookings.filter(
    (booking) => booking.status === "Completed",
  ).length;

  const cancelledBookings = bookings.filter(
    (booking) => booking.status === "Cancelled",
  ).length;

  const filteredBookings = bookings.filter((booking) => {
    const keyword = search.toLowerCase();

    const customerName =
      `${booking.customer?.first_name ?? ""} ${booking.customer?.last_name ?? ""}`.toLowerCase();

    const matchesSearch = customerName.includes(keyword);

    const matchesStatus =
      statusFilter === "All" || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const groupedBookings = filteredBookings.reduce(
    (groups: any, booking: any) => {
      if (!groups[booking.status]) {
        groups[booking.status] = [];
      }

      groups[booking.status].push(booking);

      return groups;
    },
    {},
  );
  async function handleDelete(id: number) {
    const confirmDelete = window.confirm("Delete this booking from your list?");

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          worker_deleted: true,
        })
        .eq("id", id);

      if (error) throw error;

      alert("Booking deleted successfully.");

      loadBookings();
    } catch (error) {
      console.error(error);
      alert("Unable to delete booking.");
    }
  }
  return (
    <WorkerLayout>
      <div className="p-8 space-y-6">
        {/* Header */}

        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 rounded-3xl p-8 shadow-xl text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="uppercase tracking-[5px] text-blue-100 text-sm">
                Worker Dashboard
              </p>

              <h1 className="text-4xl font-extrabold mt-2">My Bookings</h1>

              <p className="text-blue-100 mt-3 max-w-2xl">
                View customer requests, approve bookings, communicate with
                clients, and complete jobs from one professional dashboard.
              </p>
            </div>

            <div className="hidden lg:flex items-center justify-center w-28 h-28 rounded-full bg-white/10 backdrop-blur">
              <span className="text-6xl">📅</span>
            </div>
          </div>
        </div>

        {/* Search & Filter */}

        <div className="bg-white rounded-3xl shadow-lg border p-6">
          <div className="flex flex-col lg:flex-row gap-5 items-center justify-between">
            {/* Search */}

            <div className="relative flex-1 w-full">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Search customer, booking ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-12 pr-4 py-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            {/* Status Filter */}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 min-w-[220px] focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="All">📋 All Bookings</option>

              <option value="Pending">🟡 Pending</option>

              <option value="Approved">🟢 Approved</option>

              <option value="Completed">🔵 Completed</option>

              <option value="Cancelled">🔴 Cancelled</option>
            </select>
          </div>
        </div>

        {/* Premium Statistics */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
          {/* Total */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl text-white p-6 shadow-xl">
            <div className="absolute -right-5 -top-5 opacity-10">
              <CalendarDays size={120} />
            </div>

            <p className="text-blue-100">Total Bookings</p>

            <h2 className="text-5xl font-bold mt-3">{totalBookings}</h2>

            <p className="mt-5 text-sm text-blue-100">All customer bookings</p>
          </div>

          {/* Pending */}

          <div className="bg-white rounded-3xl border shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500">Pending</p>

                <h2 className="text-4xl font-bold text-yellow-500 mt-2">
                  {pendingBookings}
                </h2>
              </div>

              <div className="bg-yellow-100 p-4 rounded-2xl">
                <Clock3 className="text-yellow-500" size={30} />
              </div>
            </div>

            <div className="mt-5 h-2 rounded-full bg-yellow-100">
              <div
                className="h-2 rounded-full bg-yellow-500"
                style={{
                  width: totalBookings
                    ? `${(pendingBookings / totalBookings) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>

          {/* Approved */}

          <div className="bg-white rounded-3xl border shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500">Approved</p>

                <h2 className="text-4xl font-bold text-green-600 mt-2">
                  {approvedBookings}
                </h2>
              </div>

              <div className="bg-green-100 p-4 rounded-2xl">
                <CircleCheckBig className="text-green-600" size={30} />
              </div>
            </div>

            <div className="mt-5 h-2 rounded-full bg-green-100">
              <div
                className="h-2 rounded-full bg-green-600"
                style={{
                  width: totalBookings
                    ? `${(approvedBookings / totalBookings) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>

          {/* Completed */}

          <div className="bg-white rounded-3xl border shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500">Completed</p>

                <h2 className="text-4xl font-bold text-blue-600 mt-2">
                  {completedBookings}
                </h2>
              </div>

              <div className="bg-blue-100 p-4 rounded-2xl">
                <WalletCards className="text-blue-600" size={30} />
              </div>
            </div>

            <div className="mt-5 h-2 rounded-full bg-blue-100">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{
                  width: totalBookings
                    ? `${(completedBookings / totalBookings) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>

          {/* Cancelled */}

          <div className="bg-white rounded-3xl border shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500">Cancelled</p>

                <h2 className="text-4xl font-bold text-red-600 mt-2">
                  {cancelledBookings}
                </h2>
              </div>

              <div className="bg-red-100 p-4 rounded-2xl">
                <CircleX className="text-red-600" size={30} />
              </div>
            </div>

            <div className="mt-5 h-2 rounded-full bg-red-100">
              <div
                className="h-2 rounded-full bg-red-600"
                style={{
                  width: totalBookings
                    ? `${(cancelledBookings / totalBookings) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        </div>

        {/* Booking Groups */}

        <div className="space-y-8">
          {Object.entries(groupedBookings).length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-10 text-center">
              <div className="text-7xl">📅</div>

              <h2 className="text-2xl font-bold mt-4">No Bookings Found</h2>

              <p className="text-gray-500 mt-2">
                Customer bookings will appear here.
              </p>
            </div>
          ) : (
            Object.entries(groupedBookings).map(
              ([status, statusBookings]: any) => (
                <div key={status} className="space-y-5">
                  <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-blue-600 pl-4">
                    {status}

                    <span className="ml-3 text-base text-gray-500">
                      ({statusBookings.length})
                    </span>
                  </h2>

                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {statusBookings.map((booking: any) => (
                      <div
                        key={booking.id}
                        className="group bg-white rounded-3xl border border-gray-200 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                      >
                        {/* Hero Header */}
                        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                          <div className="absolute top-5 right-5">
                            <span
                              className={`px-4 py-2 rounded-full text-xs font-bold ${
                                booking.status === "Pending"
                                  ? "bg-yellow-400 text-yellow-900"
                                  : booking.status === "Approved"
                                    ? "bg-green-400 text-green-900"
                                    : booking.status === "Completed"
                                      ? "bg-blue-300 text-blue-900"
                                      : "bg-red-300 text-red-900"
                              }`}
                            >
                              {booking.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <img
                              src={
                                booking.customer?.profile_picture ||
                                `https://ui-avatars.com/api/?name=${booking.customer?.first_name}+${booking.customer?.last_name}`
                              }
                              alt="Customer"
                              className="w-16 h-16 rounded-2xl object-cover border-4 border-white"
                            />

                            <div>
                              <h2 className="text-xl font-bold">
                                {booking.customer?.first_name}{" "}
                                {booking.customer?.last_name}
                              </h2>

                              <p className="text-blue-100">Customer</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-6">
                          {/* Service */}
                          <div className="bg-blue-50 rounded-2xl p-5">
                            <p className="text-gray-500 text-sm">Service</p>

                            <h2 className="text-2xl font-bold text-blue-700 mt-1">
                              {booking.service?.service_name ??
                                "General Service"}
                            </h2>
                          </div>

                          {/* Booking Information */}
                          <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="bg-gray-50 rounded-xl p-4">
                              <p className="text-xs text-gray-400">
                                Booking Date
                              </p>

                              <h3 className="font-bold">
                                {booking.booking_date}
                              </h3>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4">
                              <p className="text-xs text-gray-400">Time</p>

                              <h3 className="font-bold">
                                {booking.booking_time}
                              </h3>
                            </div>

                            <div className="col-span-2 bg-gray-50 rounded-xl p-4">
                              <p className="text-xs text-gray-400">Address</p>

                              <h3 className="font-semibold">
                                {booking.address}
                              </h3>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="mt-6 flex items-center justify-between">
                            <div>
                              <p className="text-gray-400 text-sm">
                                Total Payment
                              </p>

                              <h2 className="text-3xl font-bold text-blue-700">
                                ₱{Number(booking.price ?? 0).toLocaleString()}
                              </h2>
                            </div>
                          </div>

                          {/* Buttons */}
                          <div className="grid grid-cols-2 gap-3 mt-8">
                            <button
                              onClick={() => setSelectedBooking(booking)}
                              className="rounded-xl bg-gray-800 hover:bg-gray-900 text-white py-3 font-semibold shadow hover:scale-105 transition"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => handleDelete(booking.id)}
                              className="rounded-xl bg-red-600 hover:bg-red-700 text-white py-3 font-semibold shadow hover:scale-105 transition"
                            >
                              Delete
                            </button>

                            {booking.status === "Pending" && (
                              <>
                                <button
                                  onClick={() => handleApprove(booking.id)}
                                  className="rounded-xl bg-green-600 hover:bg-green-700 text-white py-3 font-semibold shadow hover:scale-105 transition"
                                >
                                  Accept
                                </button>

                                <button
                                  onClick={() => handleReject(booking.id)}
                                  className="rounded-xl bg-red-600 hover:bg-red-700 text-white py-3 font-semibold shadow hover:scale-105 transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {booking.status === "Approved" && (
                              <>
                                <button
                                  onClick={() => handleComplete(booking.id)}
                                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-3 font-semibold shadow hover:scale-105 transition"
                                >
                                  Complete
                                </button>

                                <Link
                                  to={`/chat/${booking.id}`}
                                  className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white py-3 text-center font-semibold shadow hover:scale-105 transition"
                                >
                                  Chat
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </div>

      {/* Booking Details Modal */}

      {selectedBooking && (
        <div
          className="
      fixed
      inset-0
      z-50
      bg-black/50
      backdrop-blur-sm
      flex
      items-center
      justify-center
      p-6
      animate-fadeIn
    "
        >
          <div
            className="
        bg-white
        rounded-[30px]
        shadow-2xl
        w-full
        max-w-5xl
        max-h-[90vh]
        overflow-y-auto
        animate-scaleIn
      "
          >
            {/* Header */}

            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold">Booking Details</h1>

                  <p className="text-blue-100 mt-2">
                    Booking # {selectedBooking.id}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedBooking(null)}
                  className="
              text-white
              text-3xl
              hover:rotate-90
              transition
            "
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}

            <div className="p-8 space-y-8">
              {/* Customer Profile */}

              <div className="flex items-center gap-6">
                <img
                  src={
                    selectedBooking.customer?.profile_picture ||
                    `https://ui-avatars.com/api/?name=${selectedBooking.customer?.first_name}+${selectedBooking.customer?.last_name}`
                  }
                  alt="Customer"
                  className="
              w-28
              h-28
              rounded-3xl
              object-cover
              shadow-xl
              border-4
              border-white
            "
                />

                <div>
                  <h2 className="text-3xl font-bold">
                    {selectedBooking.customer?.first_name}{" "}
                    {selectedBooking.customer?.last_name}
                  </h2>

                  <p className="text-gray-500 mt-2">⭐ Verified Customer</p>

                  <p className="text-gray-500">
                    📞 {selectedBooking.customer?.phone ?? "No phone"}
                  </p>

                  <p className="text-gray-500">
                    ✉ {selectedBooking.customer?.email ?? "No email"}
                  </p>
                </div>
              </div>

              {/* Service Card */}

              <div
                className="
            rounded-3xl
            bg-gradient-to-r
            from-blue-50
            to-indigo-50
            p-6
          "
              >
                <p className="text-gray-500">Booked Service</p>

                <h1 className="text-4xl font-bold text-blue-700 mt-2">
                  {selectedBooking.service?.service_name ?? "General Service"}
                </h1>

                <h2 className="text-3xl font-bold mt-4">
                  ₱{Number(selectedBooking.price ?? 0).toLocaleString()}
                </h2>
              </div>

              {/* Booking Information */}

              <div>
                <h2 className="text-2xl font-bold mb-5">Booking Information</h2>

                <div className="grid md:grid-cols-2 gap-5">
                  <div
                    className="
                bg-gray-50
                rounded-2xl
                p-5
                hover:bg-blue-50
                transition
              "
                  >
                    <p className="text-sm text-gray-400">📅 Booking Date</p>

                    <h3 className="font-bold mt-2">
                      {selectedBooking.booking_date}
                    </h3>
                  </div>

                  <div
                    className="
                bg-gray-50
                rounded-2xl
                p-5
                hover:bg-blue-50
                transition
              "
                  >
                    <p className="text-sm text-gray-400">🕒 Time</p>

                    <h3 className="font-bold mt-2">
                      {selectedBooking.booking_time}
                    </h3>
                  </div>

                  <div
                    className="
                md:col-span-2
                bg-gray-50
                rounded-2xl
                p-5
                hover:bg-blue-50
                transition
              "
                  >
                    <p className="text-sm text-gray-400">📍 Address</p>

                    <h3 className="font-semibold mt-2">
                      {selectedBooking.address}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Notes */}

              {selectedBooking.notes && (
                <div
                  className="
              bg-gray-50
              rounded-2xl
              p-5
            "
                >
                  <p className="text-sm text-gray-400">📝 Customer Notes</p>

                  <p className="mt-2 font-medium">{selectedBooking.notes}</p>
                </div>
              )}
              {/* Booking Progress Card */}

              <div
                className="
              bg-white
              rounded-3xl
              shadow-lg
              border
              border-gray-100
              p-8
            "
              >
                <h2 className="text-2xl font-bold mb-8">Booking Progress</h2>

                <div className="relative">
                  {/* Connecting Line */}

                  <div
                    className="
                  absolute
                  top-6
                  left-12
                  right-12
                  h-1
                  bg-gray-200
                "
                  />

                  <div className="grid grid-cols-4 gap-4 relative z-10">
                    {/* Submitted */}

                    <div className="text-center">
                      <div
                        className="
                      w-14
                      h-14
                      mx-auto
                      rounded-full
                      bg-blue-600
                      text-white
                      flex
                      items-center
                      justify-center
                      text-xl
                      shadow-lg
                    "
                      >
                        ✓
                      </div>

                      <h3 className="mt-4 font-bold">Submitted</h3>

                      <p className="text-xs text-gray-500 mt-1">
                        Customer request sent
                      </p>
                    </div>

                    {/* Approved */}

                    <div className="text-center">
                      <div
                        className={`
                      w-14
                      h-14
                      mx-auto
                      rounded-full
                      flex
                      items-center
                      justify-center
                      text-xl
                      shadow-lg
                      ${
                        selectedBooking.status === "Pending"
                          ? "bg-gray-300 text-gray-600"
                          : "bg-green-500 text-white"
                      }
                    `}
                      >
                        ✓
                      </div>

                      <h3 className="mt-4 font-bold">Approved</h3>

                      <p className="text-xs text-gray-500 mt-1">
                        Worker accepted
                      </p>
                    </div>

                    {/* In Progress */}

                    <div className="text-center">
                      <div
                        className={`
                      w-14
                      h-14
                      mx-auto
                      rounded-full
                      flex
                      items-center
                      justify-center
                      text-xl
                      shadow-lg
                      ${
                        selectedBooking.status === "Completed"
                          ? "bg-purple-600 text-white"
                          : selectedBooking.status === "Approved"
                            ? "bg-purple-600 text-white"
                            : "bg-gray-300 text-gray-600"
                      }
                    `}
                      >
                        ⚙
                      </div>

                      <h3 className="mt-4 font-bold">In Progress</h3>

                      <p className="text-xs text-gray-500 mt-1">
                        Service ongoing
                      </p>
                    </div>

                    {/* Completed */}

                    <div className="text-center">
                      <div
                        className={`
                      w-14
                      h-14
                      mx-auto
                      rounded-full
                      flex
                      items-center
                      justify-center
                      text-xl
                      shadow-lg
                      ${
                        selectedBooking.status === "Completed"
                          ? "bg-green-600 text-white"
                          : "bg-gray-300 text-gray-600"
                      }
                    `}
                      >
                        🏁
                      </div>

                      <h3 className="mt-4 font-bold">Completed</h3>

                      <p className="text-xs text-gray-500 mt-1">Job finished</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Existing Timeline Components */}

              <BookingTimeline status={selectedBooking.status} />

              <BookingActivity booking={selectedBooking} />

              {/* Action Buttons */}

              <div
                className="
            border-t
            pt-6
            grid
            grid-cols-2
            md:grid-cols-5
            gap-4
          "
              >
                {selectedBooking.status === "Pending" && (
                  <>
                    <button
                      onClick={() => {
                        handleApprove(selectedBooking.id);

                        setSelectedBooking(null);
                      }}
                      className="
                  rounded-xl
                  bg-green-600
                  hover:bg-green-700
                  text-white
                  py-3
                  font-semibold
                  shadow-lg
                  hover:-translate-y-1
                  transition
                "
                    >
                      ✔ Accept
                    </button>

                    <button
                      onClick={() => {
                        handleReject(selectedBooking.id);

                        setSelectedBooking(null);
                      }}
                      className="
                  rounded-xl
                  bg-red-600
                  hover:bg-red-700
                  text-white
                  py-3
                  font-semibold
                  shadow-lg
                  hover:-translate-y-1
                  transition
                "
                    >
                      ✖ Reject
                    </button>
                  </>
                )}

                {selectedBooking.status === "Approved" && (
                  <>
                    <Link
                      to={`/chat/${selectedBooking.id}`}
                      className="
                  rounded-xl
                  bg-purple-600
                  hover:bg-purple-700
                  text-white
                  py-3
                  text-center
                  font-semibold
                  shadow-lg
                  hover:-translate-y-1
                  transition
                "
                    >
                      💬 Chat
                    </Link>

                    <button
                      onClick={() => {
                        handleComplete(selectedBooking.id);

                        setSelectedBooking(null);
                      }}
                      className="
                  rounded-xl
                  bg-blue-600
                  hover:bg-blue-700
                  text-white
                  py-3
                  font-semibold
                  shadow-lg
                  hover:-translate-y-1
                  transition
                "
                    >
                      🏁 Complete
                    </button>
                  </>
                )}

                {selectedBooking.status === "Completed" && (
                  <div
                    className="
                rounded-xl
                bg-green-100
                text-green-700
                py-3
                text-center
                font-semibold
                shadow
              "
                  >
                    ✔ Completed
                  </div>
                )}

                <button
                  onClick={() => setSelectedBooking(null)}
                  className="
              rounded-xl
              bg-gray-800
              hover:bg-gray-900
              text-white
              py-3
              font-semibold
              shadow-lg
              hover:-translate-y-1
              transition
            "
                >
                  ⬅ Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </WorkerLayout>
  );
}
