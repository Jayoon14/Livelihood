import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getBooking,
  updateBookingStatus,
} from "../../../services/bookingService";

export default function BookingDetails() {
  const { id } = useParams();

  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);

  async function loadBooking() {
    const data = await getBooking(id!);
    setBooking(data);
  }

  async function handleStatus(status: string) {
    await updateBookingStatus(id!, status);
    loadBooking();
  }

  if (!booking) {
    return (
      <div className="p-10">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">

      <h1 className="text-3xl font-bold">
        Booking Details
      </h1>

      {/* CUSTOMER */}

      <div className="bg-white rounded-xl shadow p-6">

        <h2 className="text-xl font-bold mb-5">
          Customer Information
        </h2>

        <div className="grid grid-cols-2 gap-5">

          <div>
            <strong>Name</strong>
            <p>{booking.customer?.full_name}</p>
          </div>

          <div>
            <strong>Email</strong>
            <p>{booking.customer?.email}</p>
          </div>

        </div>

      </div>

      {/* WORKER */}

      <div className="bg-white rounded-xl shadow p-6">

        <h2 className="text-xl font-bold mb-5">
          Assigned Worker
        </h2>

        <div className="grid grid-cols-2 gap-5">

          <div>
            <strong>Name</strong>

            <p>
              {booking.worker?.full_name || "No Worker Assigned"}
            </p>

          </div>

          <div>
            <strong>Email</strong>

            <p>
              {booking.worker?.email || "-"}
            </p>

          </div>

        </div>

      </div>

      {/* BOOKING */}

      <div className="bg-white rounded-xl shadow p-6">

        <h2 className="text-xl font-bold mb-5">
          Booking Information
        </h2>

        <div className="grid grid-cols-2 gap-5">

          <div>
            <strong>Service</strong>
            <p>{booking.service_name}</p>
          </div>

          <div>
            <strong>Category</strong>
            <p>{booking.category}</p>
          </div>

          <div>
            <strong>Schedule</strong>
            <p>{booking.schedule_date}</p>
          </div>

          <div>
            <strong>Price</strong>
            <p>₱{booking.price}</p>
          </div>

          <div className="col-span-2">
            <strong>Address</strong>
            <p>{booking.address}</p>
          </div>

          <div className="col-span-2">
            <strong>Notes</strong>
            <p>{booking.notes || "-"}</p>
          </div>

        </div>

      </div>

      {/* STATUS */}

      <div className="bg-white rounded-xl shadow p-6">

        <h2 className="text-xl font-bold mb-5">
          Booking Status
        </h2>

        <span
          className={`px-4 py-2 rounded-full text-white
          ${
            booking.status === "Pending"
              ? "bg-yellow-500"
              : booking.status === "Approved"
              ? "bg-blue-600"
              : booking.status === "Ongoing"
              ? "bg-purple-600"
              : booking.status === "Completed"
              ? "bg-green-600"
              : "bg-red-600"
          }`}
        >
          {booking.status}
        </span>

      </div>

      {/* ACTIONS */}

      <div className="flex gap-3 flex-wrap">

        <button
          onClick={() => handleStatus("Approved")}
          className="bg-blue-600 text-white px-5 py-3 rounded-lg"
        >
          Approve
        </button>

        <button
          onClick={() => handleStatus("Ongoing")}
          className="bg-purple-600 text-white px-5 py-3 rounded-lg"
        >
          Ongoing
        </button>

        <button
          onClick={() => handleStatus("Completed")}
          className="bg-green-600 text-white px-5 py-3 rounded-lg"
        >
          Complete
        </button>

        <button
          onClick={() => handleStatus("Cancelled")}
          className="bg-red-600 text-white px-5 py-3 rounded-lg"
        >
          Cancel
        </button>

      </div>

    </div>
  );
}