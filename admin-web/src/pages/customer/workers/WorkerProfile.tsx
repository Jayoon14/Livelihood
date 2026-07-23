import { supabase } from "../../../lib/supabase";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";

import { saveRecentlyViewed } from "../../../services/recentlyViewedService";

import {
  Star,
  Briefcase,
  GraduationCap,
  Award,
  Phone,
  Mail,
  MapPin,
  Share2,
  Copy,
  MessageCircle,
} from "lucide-react";

import { FaFacebook } from "react-icons/fa";

import { getCustomerWorkerProfile } from "../../../services/workerService";

import { getWorkerAverageRating } from "../../../services/reviewService";

import { getApprovedServices } from "../../../services/serviceService";

import LocationPicker from "../../../components/maps/LocationPicker";

import {
  getWorkerSchedule,
  getUnavailableDates,
  checkWorkerAvailability,
  getAvailableTimeSlots,
} from "../../../services/scheduleService";

export default function CustomerWorkerProfile() {
  const { id } = useParams();

  const navigate = useNavigate();

  const [worker, setWorker] = useState<any>(null);

  const [rating, setRating] = useState(0);

  const [schedule, setSchedule] = useState<any[]>([]);

  const [unavailableDates, setUnavailableDates] = useState<any[]>([]);

  const [selectedService, setSelectedService] = useState<any>(null);

  const [bookingDate, setBookingDate] = useState("");

  const [bookingTime, setBookingTime] = useState("");

  // NEW LOCATION STATES
  const [address, setAddress] = useState("");

  const [latitude, setLatitude] = useState<number | null>(null);

  const [longitude, setLongitude] = useState<number | null>(null);

  // JOB DESCRIPTION
  const [notes, setNotes] = useState("");

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  const [availabilityMessage, setAvailabilityMessage] = useState("");

  useEffect(() => {
    loadWorker();
  }, []);

  function shareProfile() {
    const url = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: `${worker.profile.first_name} ${worker.profile.last_name}`,
        text: "Check out this worker on LivelihoodGo!",
        url,
      });
    } else {
      navigator.clipboard.writeText(url);

      alert("Profile link copied!");
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);

    alert("Profile link copied!");
  }

  function shareFacebook() {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        window.location.href,
      )}`,
      "_blank",
    );
  }

  function shareMessenger() {
    window.open(
      `https://www.facebook.com/dialog/send?link=${encodeURIComponent(
        window.location.href,
      )}`,
      "_blank",
    );
  }

  async function loadWorker() {
    if (!id) return;

    try {
      const data = await getCustomerWorkerProfile(id);

      console.log("FULL DATA:", data);

      console.log("PROFILE:", data.profile);

      console.log("PROFILE IMAGE:", data.profile.profile_picture);

      const services = await getApprovedServices(id);

      data.services = services;

      setSelectedService(null);

      setWorker(data);

      await saveRecentlyViewed(id);

      const avg = await getWorkerAverageRating(id);

      setRating(avg);

      const weeklySchedule = await getWorkerSchedule(id);

      setSchedule(weeklySchedule);

      const dates = await getUnavailableDates(id);

      setUnavailableDates(dates);
    } catch (error) {
      console.error("Failed loading worker:", error);
    }
  }

  if (!worker) {
    return (
      <CustomerLayout>
        <div className="p-10">Loading...</div>
      </CustomerLayout>
    );
  }
  return (
    <CustomerLayout>
      <div className="mx-auto max-w-7xl p-8">
        {/* HEADER */}

        <div className="flex gap-8 rounded-3xl bg-white p-8 shadow">
          <img
            src={
              worker.profile.profile_picture || "https://placehold.co/250x250"
            }
            className="h-52 w-52 rounded-2xl object-cover"
            alt="Worker"
          />

          <div className="flex-1">
            <h1 className="text-4xl font-bold">
              {worker.profile.first_name} {worker.profile.middle_name}{" "}
              {worker.profile.last_name}
            </h1>

            <div className="mt-4 flex items-center gap-2">
              <Star className="fill-yellow-500 text-yellow-500" />

              <span className="font-semibold">{rating}</span>
            </div>

            <div className="mt-6 space-y-3">
              <p className="flex items-center gap-3">
                <Mail size={18} />
                {worker.profile.email}
              </p>

              <p className="flex items-center gap-3">
                <Phone size={18} />
                {worker.profile.phone}
              </p>

              <p className="flex items-center gap-3">
                <MapPin size={18} />
                {worker.profile.address}
              </p>
            </div>

            {/* WORKER LOCATION */}

            {worker.profile.latitude && worker.profile.longitude && (
              <div className="mt-6">
                <h3 className="mb-3 font-bold">📍 Worker Location</h3>

                <iframe
                  width="100%"
                  height="300"
                  loading="lazy"
                  allowFullScreen
                  className="rounded-xl border"
                  src={`https://maps.google.com/maps?q=${worker.profile.latitude},${worker.profile.longitude}&z=15&output=embed`}
                />

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${worker.profile.latitude},${worker.profile.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block rounded-lg bg-green-600 px-5 py-2 text-white hover:bg-green-700"
                >
                  Get Directions
                </a>
              </div>
            )}

            {/* SERVICE SELECT */}

            <div className="mt-6">
              <label className="mb-2 block font-semibold">Select Service</label>

              <select
                value={selectedService?.id || ""}
                onChange={(e) => {
                  const service = worker.services.find(
                    (s: any) => s.id === Number(e.target.value),
                  );

                  setSelectedService(service);
                }}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">-- Select Service --</option>

                {worker.services.map((service: any) => (
                  <option key={service.id} value={service.id}>
                    {service.service_name}
                    {" - ₱"}
                    {service.price}
                  </option>
                ))}
              </select>
            </div>

            {/* BOOKING DATE */}

            <div className="mt-6">
              <label className="mb-2 block font-semibold">Booking Date</label>

              <input
                type="date"
                value={bookingDate}
                onChange={async (e) => {
                  const date = e.target.value;

                  setBookingDate(date);

                  setBookingTime("");

                  setAvailableSlots([]);

                  setAvailabilityMessage("");

                  if (!date) return;

                  const availability = await checkWorkerAvailability(
                    worker.profile.id,
                    date,
                  );

                  if (!availability.available) {
                    setAvailabilityMessage(availability.reason);

                    return;
                  }

                  const slots = await getAvailableTimeSlots(
                    worker.profile.id,
                    date,
                  );

                  setAvailableSlots(slots);
                }}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            {/* BOOKING TIME */}

            <div className="mt-4">
              <label className="mb-2 block font-semibold">Booking Time</label>

              <select
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">Select Available Time</option>

                {availableSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>

              {/* SERVICE LOCATION */}

                <div className="mt-6">
                  <label className="mb-3 block text-sm font-semibold text-slate-800">
                    Service Location
                  </label>

                  <LocationPicker
                    onLocationSelect={(lat, lng, selectedAddress) => {
                      setLatitude(lat);
                      setLongitude(lng);
                      setAddress(selectedAddress);
                    }}
                  />
                </div>


              {/* JOB DESCRIPTION */}

              <div className="mt-6">
                <label className="mb-2 block font-semibold">
                  Job Description
                </label>

                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe the work needed..."
                  className="w-full rounded-lg border p-3"
                />
              </div>
              {availabilityMessage && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-600">
                  {availabilityMessage}
                </div>
              )}

              {bookingDate &&
                availableSlots.length === 0 &&
                !availabilityMessage && (
                  <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-yellow-700">
                    No available time slots for this date.
                  </div>
                )}
            </div>

            {/* BOOK BUTTON */}

            <button
              onClick={async () => {
                if (!selectedService) {
                  alert("Please select a service.");
                  return;
                }

                if (!bookingDate) {
                  alert("Please select booking date.");
                  return;
                }

                if (!bookingTime) {
                  alert("Please select booking time.");
                  return;
                }

                if (latitude === null || longitude === null) {
                  alert("Please select your service location.");
                  return;
                }

                if (!notes.trim()) {
                  alert("Please enter a job description.");
                  return;
                }

                const availability = await checkWorkerAvailability(
                  worker.profile.id,
                  bookingDate,
                );

                if (!availability.available) {
                  alert(availability.reason);

                  return;
                }

                const latestSlots = await getAvailableTimeSlots(
                  worker.profile.id,
                  bookingDate,
                );

                if (!latestSlots.includes(bookingTime)) {
                  alert(
                    "This time slot has already been booked. Please choose another time.",
                  );

                  return;
                }

                const {
                  data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                  alert("Please login first.");

                  return;
                }

                navigate("/customer/booking-confirmation", {
                  state: {
                    workerId: worker.profile.id,

                    workerName: `${worker.profile.first_name} ${worker.profile.last_name}`,

                    service: selectedService.service_name,

                    serviceId: selectedService.id,

                    date: bookingDate,

                    time: bookingTime,

                    price: selectedService.price,

                    address,

                    latitude,

                    longitude,

                    notes,
                  },
                });
              }}
              className="mt-8 rounded-xl bg-blue-600 px-8 py-4 text-white hover:bg-blue-700"
            >
              Book Now
            </button>

            {/* SHARE BUTTONS */}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={shareProfile}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                <Share2 size={18} />
                Share
              </button>

              <button
                onClick={copyLink}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-gray-100"
              >
                <Copy size={18} />
                Copy Link
              </button>

              <button
                onClick={shareFacebook}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-gray-100"
              >
                <FaFacebook size={18} />
                Facebook
              </button>

              <button
                onClick={shareMessenger}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-gray-100"
              >
                <MessageCircle size={18} />
                Messenger
              </button>
            </div>
          </div>
        </div>

        {/* SERVICES */}

        <div className="mt-8 rounded-3xl bg-white p-8 shadow">
          <h2 className="mb-5 flex items-center gap-3 text-2xl font-bold">
            <Briefcase />
            Services
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            {worker.services.length === 0 ? (
              <p className="text-gray-500">No approved services yet.</p>
            ) : (
              worker.services.map((service: any) => (
                <div key={service.id} className="rounded-xl border p-5">
                  <h3 className="text-xl font-bold">{service.service_name}</h3>

                  <p className="mt-2 text-gray-500">{service.category}</p>

                  <p className="mt-3 font-bold text-blue-700">
                    ₱{service.price}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* EDUCATION */}

        <div className="mt-8 rounded-3xl bg-white p-8 shadow">
          <h2 className="mb-5 flex gap-3 text-2xl font-bold">
            <GraduationCap />
            Education
          </h2>

          {worker.education ? (
            <div>
              <h3 className="font-bold">{worker.education.school}</h3>

              <p>{worker.education.course}</p>

              <p>{worker.education.year_graduated}</p>
            </div>
          ) : (
            <p className="text-gray-500">No education information available.</p>
          )}
        </div>
        {/* EXPERIENCE */}

        <div className="mt-8 rounded-3xl bg-white p-8 shadow">
          <h2 className="mb-5 text-2xl font-bold">Work Experience</h2>

          {worker.workExperience?.length ? (
            worker.workExperience.map((job: any) => (
              <div key={job.id} className="mb-5">
                <h3 className="font-bold">{job.company}</h3>

                <p>{job.position}</p>

                {job.description && (
                  <p className="mt-2 text-gray-500">{job.description}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500">No work experience available.</p>
          )}
        </div>

        {/* SKILLS */}

        <div className="mt-8 rounded-3xl bg-white p-8 shadow">
          <h2 className="mb-5 flex gap-3 text-2xl font-bold">
            <Award />
            Skills
          </h2>

          <div className="flex flex-wrap gap-3">
            {worker.skills?.length ? (
              worker.skills.map((skill: any) => (
                <span
                  key={skill.id}
                  className="rounded-full bg-blue-100 px-4 py-2 text-blue-700"
                >
                  {skill.skill_name}
                </span>
              ))
            ) : (
              <p className="text-gray-500">No skills available.</p>
            )}
          </div>
        </div>

        {/* WEEKLY AVAILABILITY */}

        <div className="mt-8 rounded-3xl bg-white p-8 shadow">
          <h2 className="mb-5 text-2xl font-bold">Weekly Availability</h2>

          {schedule.length === 0 ? (
            <p className="text-gray-500">No schedule available.</p>
          ) : (
            <div className="space-y-3">
              {schedule.map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between border-b pb-3"
                >
                  <span className="font-medium">{item.day_of_week}</span>

                  <span
                    className={
                      item.is_available ? "text-green-600" : "text-red-600"
                    }
                  >
                    {item.is_available
                      ? `${item.start_time} - ${item.end_time}`
                      : "Unavailable"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* UNAVAILABLE DATES */}

        <div className="mt-8 rounded-3xl bg-white p-8 shadow">
          <h2 className="mb-5 text-2xl font-bold">Unavailable Dates</h2>

          {unavailableDates.length === 0 ? (
            <p className="text-gray-500">No unavailable dates.</p>
          ) : (
            <div className="space-y-3">
              {unavailableDates.map((date: any) => (
                <div
                  key={date.id}
                  className="flex justify-between border-b pb-3"
                >
                  <span>{date.unavailable_date}</span>

                  <span className="text-red-600">
                    {date.reason || "Unavailable"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
