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

  import {
    getCustomerWorkerProfile,
  } from "../../../services/workerService";

  import {
    getWorkerAverageRating,
  } from "../../../services/reviewService";

  import {
    getApprovedServices,
  } from "../../../services/serviceService";

  import {
    getWorkerSchedule,
    getUnavailableDates,
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
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
      "_blank"
    );
  }

  function shareMessenger() {
    window.open(
      `https://www.facebook.com/dialog/send?link=${encodeURIComponent(window.location.href)}`,
      "_blank"
    );
  }


    async function loadWorker() {
    if (!id) return;

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
  }

    if (!worker) {
      return (
        <CustomerLayout>
          <div className="p-10">
            Loading...
          </div>
        </CustomerLayout>
      );
    }

    return (
      <CustomerLayout>
        <div className="max-w-7xl mx-auto p-8">

          {/* HEADER */}

          <div className="bg-white rounded-3xl shadow p-8 flex gap-8">

            <img
              src={
                worker.profile.profile_picture ||
                "https://placehold.co/250x250"
              }
              className="w-52 h-52 rounded-2xl object-cover"
              alt="Worker"
            />

            <div className="flex-1">

              <h1 className="text-4xl font-bold">
                {worker.profile.first_name}{" "}
                {worker.profile.middle_name}{" "}
                {worker.profile.last_name}
              </h1>

              <div className="flex items-center gap-2 mt-4">

                <Star
                  className="text-yellow-500 fill-yellow-500"
                />

                <span className="font-semibold">
                  {rating}
                </span>

              </div>

              <div className="space-y-3 mt-6">

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

              {worker.profile.latitude &&
              worker.profile.longitude && (

                <div className="mt-6">

                  <h3 className="font-bold mb-3">
                    📍 Worker Location
                  </h3>


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
                    className="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg"
                  >
                    Get Directions
                  </a>

                </div>

              )}
              <div className="mt-6">

                <label className="block font-semibold mb-2">
                  Select Service
                </label>

                <select
                  value={selectedService?.id || ""}
                  onChange={(e) => {

                    const service = worker.services.find(
                      (s: any) => s.id === Number(e.target.value)
                    );

                    setSelectedService(service);

                  }}
                  className="border rounded-lg px-3 py-2 w-full"
                >

                  <option value="">
                    -- Select Service --
                  </option>

                  {worker.services.map((service: any) => (

                    <option
                      key={service.id}
                      value={service.id}
                    >
                      {service.service_name} - ₱{service.price}
                    </option>

                  ))}

                </select>

              </div>
              <div className="mt-6">

              <label className="block font-semibold mb-2">
                Booking Date
              </label>

              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />

            </div>

            <div className="mt-4">

              <label className="block font-semibold mb-2">
                Booking Time
              </label>

              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="border rounded-lg px-3 py-2 w-full"
              />

            </div>

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
                    address: worker.profile.address ?? "",
                  },
                });

              }}
              className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl"
            >
              Book Now
            </button>
              <div className="mt-6 flex flex-wrap gap-3">

    <button
      onClick={shareProfile}
      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
    >
      <Share2 size={18} />
      Share
    </button>

    <button
      onClick={copyLink}
      className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-100"
    >
      <Copy size={18} />
      Copy Link
    </button>

  <button
    onClick={shareFacebook}
    className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-100"
  >
    <FaFacebook size={18} />
    Facebook
  </button>

    <button
      onClick={shareMessenger}
      className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-100"
    >
      <MessageCircle size={18} />
      Messenger
    </button>

  </div>

            </div>

          </div>

          {/* SERVICES */}

          <div className="bg-white rounded-3xl shadow p-8 mt-8">

            <h2 className="text-2xl font-bold mb-5 flex items-center gap-3">
              <Briefcase />
              Services
            </h2>

            <div className="grid md:grid-cols-2 gap-5">

              {worker.services.length === 0 ? (

                <p className="text-gray-500">
                  No approved services yet.
                </p>

              ) : (

                worker.services.map((service: any) => (

                  <div
                    key={service.id}
                    className="border rounded-xl p-5"
                  >

                    <h3 className="font-bold text-xl">
                      {service.service_name}
                    </h3>

                    <p className="text-gray-500 mt-2">
                      {service.category}
                    </p>

                    <p className="text-blue-700 font-bold mt-3">
                      ₱{service.price}
                    </p>

                  </div>

                ))

              )}

            </div>

          </div>

          {/* EDUCATION */}

          <div className="bg-white rounded-3xl shadow p-8 mt-8">

            <h2 className="text-2xl font-bold flex gap-3 mb-5">
              <GraduationCap />
              Education
            </h2>

            {worker.education ? (

              <div>

                <h3 className="font-bold">
                  {worker.education.school}
                </h3>

                <p>
                  {worker.education.course}
                </p>

                <p>
                  {worker.education.year_graduated}
                </p>

              </div>

            ) : (

              <p className="text-gray-500">
                No education information available.
              </p>

            )}

          </div>

          {/* EXPERIENCE */}

          <div className="bg-white rounded-3xl shadow p-8 mt-8">

            <h2 className="text-2xl font-bold mb-5">
              Work Experience
            </h2>

            {worker.workExperience?.length ? (

              worker.workExperience.map((job: any) => (

                <div
                  key={job.id}
                  className="mb-5"
                >

                  <h3 className="font-bold">
                    {job.company}
                  </h3>

                  <p>{job.position}</p>

                </div>

              ))

            ) : (

              <p className="text-gray-500">
                No work experience available.
              </p>

            )}

          </div>

        {/* SKILLS */}

          <div className="bg-white rounded-3xl shadow p-8 mt-8">

            <h2 className="text-2xl font-bold flex gap-3 mb-5">
              <Award />
              Skills
            </h2>

            <div className="flex flex-wrap gap-3">

              {worker.skills?.length ? (

                worker.skills.map((skill: any) => (

                  <span
                    key={skill.id}
                    className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full"
                  >
                    {skill.skill_name}
                  </span>

                ))

              ) : (

                <p className="text-gray-500">
                  No skills available.
                </p>

              )}

            </div>

          </div>
          {/* WEEKLY AVAILABILITY */}

          <div className="bg-white rounded-3xl shadow p-8 mt-8">

            <h2 className="text-2xl font-bold mb-5">
              Weekly Availability
            </h2>

            {schedule.length === 0 ? (

              <p className="text-gray-500">
                No schedule available.
              </p>

            ) : (

              <div className="space-y-3">

                {schedule.map((item: any) => (

                  <div
                    key={item.id}
                    className="flex justify-between border-b pb-3"
                  >

                    <span className="font-medium">
                      {item.day_of_week}
                    </span>

                    <span
                      className={
                        item.is_available
                          ? "text-green-600"
                          : "text-red-600"
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

        <div className="bg-white rounded-3xl shadow p-8 mt-8">

          <h2 className="text-2xl font-bold mb-5">
            Unavailable Dates
          </h2>

          {unavailableDates.length === 0 ? (

            <p className="text-gray-500">
              No unavailable dates.
            </p>

          ) : (

            <div className="space-y-3">

              {unavailableDates.map((date: any) => (

                <div
                  key={date.id}
                  className="flex justify-between border-b pb-3"
                >

                  <span>
                    {date.unavailable_date}
                  </span>

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