import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";

import {
  acceptBooking,
  getWorkerBookings,
  rejectBooking,
} from "../../../services/workerBookingService";
import WorkerAnalytics from "../../../components/worker/dashboard/WorkerAnalytics";
import WorkerLocationStatus from "../../../components/worker/dashboard/WorkerLocationStatus";
import TodaySchedule from "../../../components/worker/dashboard/TodaySchedule";

export default function Dashboard() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<any[]>([]);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [processingBookingId, setProcessingBookingId] =
  useState<number | null>(null);

useEffect(() => {
  let channel: ReturnType<typeof supabase.channel> | null =
    null;

  async function initializeDashboard() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    setWorkerId(user.id);

    await loadDashboard(user.id);

    channel = supabase
      .channel(`worker-bookings-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `worker_id=eq.${user.id}`,
        },
        (payload) => {
          console.log(
            "Realtime worker booking update:",
            payload,
          );

          void loadDashboard(user.id);
        },
      )
      .subscribe((status) => {
        console.log(
          "Worker booking realtime status:",
          status,
        );
      });
  }

  void initializeDashboard();

  return () => {
    if (channel) {
      void supabase.removeChannel(channel);
    }
  };
}, []);
 async function loadDashboard(
  currentWorkerId?: string,
) {
  let resolvedWorkerId = currentWorkerId;

  if (!resolvedWorkerId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    resolvedWorkerId = user?.id;
  }

  if (!resolvedWorkerId) {
    return;
  }

  try {
    const data = await getWorkerBookings(
      resolvedWorkerId,
    );

    setBookings(data);
  } catch (error) {
    console.error(
      "Failed to load worker bookings:",
      error,
    );
  }
}

  async function handleAccept(id: number) {
  if (!workerId || processingBookingId !== null) {
    return;
  }

  try {
    setProcessingBookingId(id);

    await acceptBooking(id, workerId);

    alert("Booking accepted successfully.");

    await loadDashboard(workerId);
  } catch (error) {
    console.error("Accept booking error:", error);

    alert(
      error instanceof Error
        ? error.message
        : "Failed to accept booking.",
    );
  } finally {
    setProcessingBookingId(null);
  }
}
  async function handleReject(id: number) {
  if (!workerId || processingBookingId !== null) {
    return;
  }

  const confirmed = window.confirm(
    "Are you sure you want to reject this booking?",
  );

  if (!confirmed) {
    return;
  }

  try {
    setProcessingBookingId(id);

    await rejectBooking(id, workerId);

    alert("Booking rejected.");

    await loadDashboard(workerId);
  } catch (error) {
    console.error("Reject booking error:", error);

    alert(
      error instanceof Error
        ? error.message
        : "Failed to reject booking.",
    );
  } finally {
    setProcessingBookingId(null);
  }
}
  const pending = bookings.filter((b) => b.status === "Pending").length;

  const approved = bookings.filter((b) => b.status === "Approved").length;

  const completed = bookings.filter((b) => b.status === "Completed").length;

  const cancelled = bookings.filter((b) => b.status === "Cancelled").length;

  return (
    <WorkerLayout>
      <div className="p-8 space-y-8">
        {/* Hero Section */}

        <div
          className="
            relative
            overflow-hidden
            rounded-3xl
            bg-gradient-to-r
            from-blue-600
            via-blue-500
            to-cyan-500
            text-white
            p-8
            shadow-xl
          "
        >
          <div
            className="
              flex
              flex-col
              lg:flex-row
              justify-between
              items-center
              gap-6
            "
          >
            <div>
              <p className="text-blue-100">Worker Portal</p>

              <h1 className="text-4xl font-bold mt-2">
                Manage Your Work Easily
              </h1>

              <p className="text-blue-100 mt-3 max-w-xl">
                Track customer bookings, manage services, communicate with
                clients, and complete your jobs.
              </p>
            </div>

            <div
              className="
                bg-white/20
                backdrop-blur-xl
                rounded-3xl
                p-6
                text-center
                min-w-[180px]
              "
            >
              <p className="text-blue-100">Pending Requests</p>

              <h2 className="text-5xl font-bold mt-2">{pending}</h2>
            </div>
          </div>
        </div>

        <WorkerLocationStatus />
        
        {/* Quick Actions */}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <button
            onClick={() => navigate("/worker/services")}
            className="
              bg-white
              rounded-2xl
              shadow-md
              hover:shadow-xl
              transition-all
              p-6
              border
              hover:-translate-y-1
            "
          >
            <div
              className="
                w-14
                h-14
                rounded-2xl
                bg-blue-100
                flex
                items-center
                justify-center
                text-3xl
                mx-auto
              "
            >
              🛠️
            </div>

            <h2 className="font-bold text-lg mt-4">My Services</h2>

            <p className="text-gray-500 text-sm mt-1">
              Manage your offered services
            </p>
          </button>

          <button
            onClick={() => navigate("/worker/bookings")}
            className="
              bg-white
              rounded-2xl
              shadow-md
              hover:shadow-xl
              transition-all
              p-6
              border
              hover:-translate-y-1
            "
          >
            <div
              className="
                w-14
                h-14
                rounded-2xl
                bg-green-100
                flex
                items-center
                justify-center
                text-3xl
                mx-auto
              "
            >
              📅
            </div>

            <h2 className="font-bold text-lg mt-4">Bookings</h2>

            <p className="text-gray-500 text-sm mt-1">View customer requests</p>
          </button>

          <button
            onClick={() => navigate("/worker/chat")}
            className="
              bg-white
              rounded-2xl
              shadow-md
              hover:shadow-xl
              transition-all
              p-6
              border
              hover:-translate-y-1
            "
          >
            <div
              className="
                w-14
                h-14
                rounded-2xl
                bg-purple-100
                flex
                items-center
                justify-center
                text-3xl
                mx-auto
              "
            >
              💬
            </div>

            <h2 className="font-bold text-lg mt-4">Messages</h2>

            <p className="text-gray-500 text-sm mt-1">Chat with customers</p>
          </button>

          <button
            onClick={() => navigate("/worker/profile")}
            className="
              bg-white
              rounded-2xl
              shadow-md
              hover:shadow-xl
              transition-all
              p-6
              border
              hover:-translate-y-1
            "
          >
            <div
              className="
                w-14
                h-14
                rounded-2xl
                bg-orange-100
                flex
                items-center
                justify-center
                text-3xl
                mx-auto
              "
            >
              👤
            </div>

            <h2 className="font-bold text-lg mt-4">Profile</h2>

            <p className="text-gray-500 text-sm mt-1">Update your account</p>
          </button>
        </div>

        {/* Statistics Cards */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div
            className="
              bg-white
              rounded-2xl
              shadow-md
              border
              p-6
              hover:shadow-xl
              transition
            "
          >
            <p className="text-gray-500">Pending</p>

            <h2 className="text-4xl font-bold text-yellow-500 mt-3">
              {pending}
            </h2>

            <p className="text-gray-400 text-sm mt-2">Waiting for approval</p>
          </div>

          <div
            className="
              bg-white
              rounded-2xl
              shadow-md
              border
              p-6
              hover:shadow-xl
              transition
            "
          >
            <p className="text-gray-500">Approved</p>

            <h2 className="text-4xl font-bold text-green-600 mt-3">
              {approved}
            </h2>

            <p className="text-gray-400 text-sm mt-2">Active bookings</p>
          </div>

          <div
            className="
              bg-white
              rounded-2xl
              shadow-md
              border
              p-6
              hover:shadow-xl
              transition
            "
          >
            <p className="text-gray-500">Completed</p>

            <h2 className="text-4xl font-bold text-blue-600 mt-3">
              {completed}
            </h2>

            <p className="text-gray-400 text-sm mt-2">Finished jobs</p>
          </div>

          <div
            className="
              bg-white
              rounded-2xl
              shadow-md
              border
              p-6
              hover:shadow-xl
              transition
            "
          >
            <p className="text-gray-500">Cancelled</p>

            <h2 className="text-4xl font-bold text-red-600 mt-3">
              {cancelled}
            </h2>

            <p className="text-gray-400 text-sm mt-2">Cancelled requests</p>
          </div>
        </div>

        {/* Latest Bookings */}

        <div
          className="
            bg-white
            rounded-3xl
            shadow-md
            border
            p-6
          "
        >
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-2xl font-bold">Latest Bookings</h2>

            <button
              onClick={() => navigate("/worker/bookings")}
              className="
                text-blue-600
                font-semibold
                hover:text-blue-800
              "
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left p-3">Customer</th>

                  <th className="text-left p-3">Date</th>

                  <th className="text-left p-3">Time</th>

                  <th className="text-left p-3">Address</th>

                  <th className="text-left p-3">Status</th>

                  <th className="text-left p-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="
                        text-center
                        p-8
                        text-gray-500
                      "
                    >
                      No bookings available
                    </td>
                  </tr>
                ) : (
                  bookings.slice(0, 5).map((booking) => (
                    <tr
                      key={booking.id}
                      className="
                          border-b
                          hover:bg-gray-50
                          transition
                        "
                    >
                      <td className="p-3 font-semibold">
                        {[
                          booking.customer?.first_name,
                          booking.customer?.middle_name,
                          booking.customer?.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </td>

                      <td className="p-3">{booking.booking_date}</td>

                      <td className="p-3">{booking.booking_time}</td>

                      <td className="p-3">{booking.address}</td>

                      <td className="p-3">
                        <span
                          className={`
                              px-3
                              py-1
                              rounded-full
                              text-white
                              text-sm
                              font-semibold

                              ${
                                booking.status === "Pending"
                                  ? "bg-yellow-500"
                                  : booking.status === "Approved"
                                    ? "bg-green-600"
                                    : booking.status === "Completed"
                                      ? "bg-blue-600"
                                      : booking.status === "Cancelled"
                                        ? "bg-red-600"
                                        : "bg-gray-500"
                              }
                            `}
                        >
                          {booking.status}
                        </span>
                      </td>

                      <td className="p-3">
                        {booking.status === "Pending" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleAccept(booking.id)}
                            disabled={processingBookingId !== null}
                            className="
                              rounded-xl
                              bg-green-600
                              px-4
                              py-2
                              text-sm
                              font-semibold
                              text-white
                              hover:bg-green-700
                              disabled:cursor-not-allowed
                              disabled:opacity-50
                            "
                          >
                            {processingBookingId === booking.id
                              ? "Processing..."
                              : "Accept"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleReject(booking.id)}
                            disabled={processingBookingId !== null}
                            className="
                              rounded-xl
                              bg-red-600
                              px-4
                              py-2
                              text-sm
                              font-semibold
                              text-white
                              hover:bg-red-700
                              disabled:cursor-not-allowed
                              disabled:opacity-50
                            "
                          >
                            {processingBookingId === booking.id
                              ? "Processing..."
                              : "Reject"}
                          </button>
                        </div>
                      ) : booking.status === "Approved" &&
                        booking.customer_latitude !== null &&
                        booking.customer_longitude !== null ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/worker/navigation/${booking.id}`)
                          }
                          className="
                            rounded-xl
                            bg-blue-600
                            px-4
                            py-2
                            text-sm
                            font-semibold
                            text-white
                            hover:bg-blue-700
                          "
                        >
                          Navigate to Customer
                        </button>
                      ) : (
                        <span className="text-gray-400">No Action</span>
                      )}
                    </td>
                                        </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="mb-10">
        <WorkerAnalytics />
      </div>

      <TodaySchedule bookings={bookings} />
    </WorkerLayout>
  );
}
