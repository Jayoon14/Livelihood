import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CustomerLayout from "../../../layouts/CustomerLayout";
import { getWorkerDetails } from "../../../services/workerService";
import { createBooking } from "../../../services/bookingService";
import { supabase } from "../../../lib/supabase";

export default function WorkerDetails() {
  const { id } = useParams();

  const [worker, setWorker] = useState<any>(null);

  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (id) {
      loadWorker();
    }
  }, [id]);

  async function loadWorker() {
    const data = await getWorkerDetails(id!);
    setWorker(data);
  }

  async function handleBooking() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login.");
      return;
    }

    await createBooking(
      user.id,
      worker.id,
      bookingDate,
      bookingTime,
      address,
      notes
    );

    alert("Booking submitted successfully!");

    setBookingDate("");
    setBookingTime("");
    setAddress("");
    setNotes("");
  }

  if (!worker) {
    return (
      <CustomerLayout>
        <div className="text-center py-20">Loading...</div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="bg-white rounded-2xl shadow p-8">
        <div className="flex gap-8">
          <div className="w-40 h-40 rounded-full bg-blue-100" />

          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {worker.full_name}
            </h1>

            <p className="text-gray-500 mt-2">
              {worker.email}
            </p>

            <p className="mt-2">
              Status:
              <span className="ml-2 font-semibold text-green-600">
                {worker.status}
              </span>
            </p>

            {/* BOOKING FORM */}
            <div className="mt-8 space-y-4">
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full border rounded-lg p-3"
              />

              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="w-full border rounded-lg p-3"
              />

              <input
                placeholder="Service Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border rounded-lg p-3"
              />

              <textarea
                placeholder="Additional Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded-lg p-3"
              />

              <button
                onClick={handleBooking}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}