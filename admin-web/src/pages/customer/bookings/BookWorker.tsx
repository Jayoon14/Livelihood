import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";

import { getCustomerWorkerProfile } from "../../../services/workerService";
import { getApprovedServices } from "../../../services/serviceService";
import {
  createBooking,
  isWorkerAvailable,
} from "../../../services/customerBookingService";
import AvailabilityCalendar from "../../../components/customer/AvailabilityCalendar";

export default function BookWorker() {
  const { workerId } = useParams();

  const navigate = useNavigate();

  const location = useLocation();

  const previousServiceId = location.state?.serviceId;

  const [worker, setWorker] = useState<any>(null);

  const [serviceId, setServiceId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadWorker();
  }, []);

  async function loadWorker() {
    if (!workerId) return;

    try {
      const data = await getCustomerWorkerProfile(workerId);

      const services = await getApprovedServices(workerId);

      data.services = services;

      setWorker(data);

      if (previousServiceId) {
        const selected = services.find(
          (service: any) => service.id === previousServiceId,
        );

        if (selected) {
          setServiceId(selected.id);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function handleSubmit() {
    if (!serviceId || !scheduleDate || !scheduleTime || !address.trim()) {
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

    if (worker.services.length === 0) {
      alert("This worker has no approved services.");
      return;
    }

    try {
      // Check worker availability
      const available = await isWorkerAvailable(
        worker.profile.id,
        scheduleDate,
        scheduleTime,
      );

      if (!available) {
        alert("Worker is unavailable on the selected date and time.");
        return;
      }

      await createBooking({
        customer_id: user.id,
        worker_id: worker.profile.id,
        service_id: serviceId,
        booking_date: scheduleDate,
        booking_time: scheduleTime,
        address,
        notes,
      });

      console.log("CUSTOMER:", user.id);
      console.log("WORKER:", worker.profile.id);
      console.log("SERVICE:", serviceId);

      console.log({
        customer_id: user.id,
        worker_id: worker.profile.id,
        service_id: serviceId,
        booking_date: scheduleDate,
        booking_time: scheduleTime,
        address,
        notes,
      });

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
        <h1 className="text-3xl font-bold mb-6">Book Worker</h1>

        <div className="mb-6 p-5 bg-slate-100 rounded-xl">
          <h2 className="text-xl font-bold">
            {worker.profile.first_name} {worker.profile.middle_name}{" "}
            {worker.profile.last_name}
          </h2>

          <p className="text-gray-600">{worker.profile.email}</p>

          <p className="text-gray-600">{worker.profile.phone}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="font-semibold block mb-2">Service</label>

            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="border rounded-lg p-3 w-full"
            >
              <option value="">Select Service</option>

              {worker.services.length === 0 ? (
                <option disabled>No approved services available</option>
              ) : (
                worker.services.map((service: any) => (
                  <option key={service.id} value={service.id}>
                    {service.service_name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <AvailabilityCalendar
              workerId={worker.profile.id}
              value={scheduleDate}
              onChange={setScheduleDate}
            />
          </div>

          <div>
            <label className="font-semibold block mb-2">Preferred Time</label>

            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="border rounded-lg p-3 w-full"
            />
          </div>

          <div>
            <label className="font-semibold block mb-2">Service Address</label>

            <input
              type="text"
              placeholder="Complete address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="border rounded-lg p-3 w-full"
            />
          </div>

          <div>
            <label className="font-semibold block mb-2">Job Description</label>

            <textarea
              rows={4}
              placeholder="Describe the work needed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border rounded-lg p-3 w-full"
            />
          </div>

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
