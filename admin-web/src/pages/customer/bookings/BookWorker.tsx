import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import { getWorker } from "../../../services/workerService";
import { createBooking } from "../../../services/bookingService";

export default function BookWorker() {
  const { workerId } = useParams();
  const navigate = useNavigate();

  const [worker, setWorker] = useState<any>(null);

  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadWorker();
  }, []);

  async function loadWorker() {
    if (!workerId) return;

    const data = await getWorker(workerId);
    setWorker(data);
  }

  async function handleSubmit() {
    if (!scheduleDate || !scheduleTime || !address) {
      alert("Please complete all required fields.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login first.");
      return;
    }

    try {
      await createBooking(
        user.id,
        worker.id,
        scheduleDate,
        scheduleTime,
        address,
        notes
      );

      alert("Booking submitted successfully!");
      navigate("/customer/bookings");
    } catch (error) {
      console.error(error);
      alert("Unable to submit booking.");
    }
  }

  if (!worker) {
    return (
      <CustomerLayout>
        <div className="p-10 text-center">Loading...</div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-8">
        <h1 className="text-3xl font-bold mb-8">
          Book Worker
        </h1>

        <div className="mb-8 p-5 bg-slate-100 rounded-xl">
          <h2 className="text-xl font-bold">
            {worker.first_name} {worker.last_name}
          </h2>
          <p>{worker.email}</p>
          <p>{worker.phone}</p>
        </div>

        <div className="space-y-5">
          <input
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="border rounded-lg p-3 w-full"
          />

          <input
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="border rounded-lg p-3 w-full"
          />

          <input
            type="text"
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="border rounded-lg p-3 w-full"
          />

          <textarea
            rows={5}
            placeholder="Additional Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border rounded-lg p-3 w-full"
          />

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold"
          >
            Submit Booking
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
}