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
import LocationPicker from "../../../components/maps/LocationPicker";

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

  // NEW
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

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
    if (
      !serviceId ||
      !scheduleDate ||
      !scheduleTime ||
      latitude === null ||
      longitude === null
    ) {
      alert("Please select your location.");
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
        customer_address: address,
        customer_latitude: latitude,
        customer_longitude: longitude,

        notes,
      });

      console.log({
        customer_id: user.id,
        worker_id: worker.profile.id,
        service_id: serviceId,
        booking_date: scheduleDate,
        booking_time: scheduleTime,
        customer_address: address,
        customer_latitude: latitude,
        customer_longitude: longitude,
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
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
        <h1 className="mb-6 text-3xl font-bold">Book Worker</h1>

        <div className="mb-6 rounded-xl bg-slate-100 p-5">
          <h2 className="text-xl font-bold">
            {worker.profile.first_name} {worker.profile.middle_name}{" "}
            {worker.profile.last_name}
          </h2>

          <p className="text-gray-600">{worker.profile.email}</p>

          <p className="text-gray-600">{worker.profile.phone}</p>
        </div>

        <div className="space-y-4">
          {/* Service */}
          <div>
            <label className="mb-2 block font-semibold">
              Service
            </label>

            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full rounded-lg border p-3"
            >
              <option value="">Select Service</option>

              {worker.services.length === 0 ? (
                <option disabled>
                  No approved services available
                </option>
              ) : (
                worker.services.map((service: any) => (
                  <option key={service.id} value={service.id}>
                    {service.service_name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Availability */}
          <div>
            <AvailabilityCalendar
              workerId={worker.profile.id}
              value={scheduleDate}
              onChange={setScheduleDate}
            />
          </div>

          {/* Time */}
          <div>
            <label className="mb-2 block font-semibold">
              Preferred Time
            </label>

            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full rounded-lg border p-3"
            />
          </div>

          {/* Location Picker */}
          <div>
            <label className="mb-2 block font-semibold">
              Service Location
            </label>

            <LocationPicker
              onLocationSelect={(lat, lng, selectedAddress) => {
                setLatitude(lat);
                setLongitude(lng);
                setAddress(selectedAddress);
              }}
            />

            <textarea
              rows={3}
              value={address}
              readOnly
              placeholder="Selected address will appear here..."
              className="mt-4 w-full rounded-lg border bg-gray-100 p-3"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block font-semibold">
              Job Description
            </label>

            <textarea
              rows={4}
              placeholder="Describe the work needed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border p-3"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Submit Booking
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
}