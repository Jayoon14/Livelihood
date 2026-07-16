import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";

import {
  getWorkerDetails,
  getEducation,
  getWorkExperience,
  getSkills,
  getServices,
} from "../../../services/workerService";

import {
  createBooking,
  isWorkerAvailable,
} from "../../../services/bookingService";

import { supabase } from "../../../lib/supabase";

import {
  getWorkerReviews,
  getWorkerAverageRating,
} from "../../../services/reviewService";

export default function WorkerDetails() {
  const { id } = useParams();

  const [worker, setWorker] = useState<any>(null);

  const [education, setEducation] = useState<any>(null);
  const [workExperience, setWorkExperience] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // New Booking States
  const [service, setService] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState(0);

  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    if (id) {
      loadWorker();
    }
  }, [id]);

  async function loadWorker() {
    try {
      const data = await getWorkerDetails(id!);

      setWorker(data);

      // Default selected service
      if (data.services?.length > 0) {
        setService(data.services[0].service_name ?? "");
        setEstimatedPrice(data.services[0].price ?? 0);
      }

      const edu = await getEducation(id!);
      const work = await getWorkExperience(id!);
      const skill = await getSkills(id!);
      const serviceList = await getServices(id!);

      setEducation(edu);
      setWorkExperience(work);
      setSkills(skill);
      setServices(serviceList);

      const workerReviews = await getWorkerReviews(id!);
      const average = await getWorkerAverageRating(id!);

      setReviews(workerReviews);
      setAverageRating(average);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleBooking() {
    if (
      !bookingDate ||
      !bookingTime ||
      !address.trim() ||
      !service ||
      !contactNumber.trim()
    ) {
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
      const available = await isWorkerAvailable(
        worker.id,
        bookingDate,
        bookingTime
      );

      if (!available) {
        alert("Worker is unavailable on this schedule.");
        return;
      }

      // Existing booking function
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
      setContactNumber("");

      if (worker.services?.length > 0) {
        setService(worker.services[0].service_name);
        setEstimatedPrice(worker.services[0].price ?? 0);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to submit booking.");
    }
  }

  if (!worker) {
    return (
      <CustomerLayout>
        <div className="text-center py-20">
          Loading...
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex gap-6">
          <div className="w-40 h-40 rounded-full bg-blue-100" />

          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {[worker.first_name, worker.middle_name, worker.last_name]
                .filter(Boolean)
                .join(" ")}
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

            {/* BOOKING FORM STARTS HERE */}
            <div className="mt-5 space-y-4">
                            {/* Service */}
              <div>
                <label className="font-semibold block mb-2">
                  Service
                </label>

                <select
                  value={service}
                  onChange={(e) => {
                    const selected = e.target.value;

                    setService(selected);

                    const selectedService =
                      worker.services?.find(
                        (item: any) =>
                          item.service_name === selected
                      );

                    setEstimatedPrice(
                      selectedService?.price ?? 0
                    );
                  }}
                  className="w-full border rounded-lg p-3"
                >
                  {worker.services?.map((item: any) => (
                    <option
                      key={item.id}
                      value={item.service_name}
                    >
                      {item.service_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Number */}
              <div>
                <label className="font-semibold block mb-2">
                  Contact Number
                </label>

                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) =>
                    setContactNumber(e.target.value)
                  }
                  placeholder="09XXXXXXXXX"
                  className="w-full border rounded-lg p-3"
                />
              </div>

              {/* Preferred Date */}
              <div>
                <label className="font-semibold block mb-2">
                  Preferred Date
                </label>

                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) =>
                    setBookingDate(e.target.value)
                  }
                  className="w-full border rounded-lg p-3"
                />
              </div>

              {/* Preferred Time */}
              <div>
                <label className="font-semibold block mb-2">
                  Preferred Time
                </label>

                <input
                  type="time"
                  value={bookingTime}
                  onChange={(e) =>
                    setBookingTime(e.target.value)
                  }
                  className="w-full border rounded-lg p-3"
                />
              </div>

              {/* Service Address */}
              <div>
                <label className="font-semibold block mb-2">
                  Service Address
                </label>

                <input
                  value={address}
                  onChange={(e) =>
                    setAddress(e.target.value)
                  }
                  placeholder="Enter complete address"
                  className="w-full border rounded-lg p-3"
                />
              </div>

              {/* Job Description */}
              <div>
                <label className="font-semibold block mb-2">
                  Job Description
                </label>

                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e) =>
                    setNotes(e.target.value)
                  }
                  placeholder="Describe the work..."
                  className="w-full border rounded-lg p-3"
                />
              </div>

              {/* Estimated Price */}
              <div>
                <label className="font-semibold block mb-2">
                  Estimated Price
                </label>

                <input
                  readOnly
                  value={`₱${estimatedPrice}`}
                  className="w-full bg-gray-100 border rounded-lg p-3"
                />
              </div>

              {/* Book Button */}
              <button
                onClick={handleBooking}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 text-lg font-semibold"
              >
                Book Worker
              </button>
            </div>
          </div>
        </div>

        {/* REVIEWS SECTION */}
                {/* REVIEWS SECTION */}

        <div className="bg-white rounded-xl shadow p-5 mt-6">
          <h2 className="text-2xl font-bold mb-4">
            Customer Reviews
          </h2>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-4xl font-bold">
              {averageRating}
            </span>

            <span className="text-yellow-500 text-2xl">
              ⭐
            </span>
          </div>

          {reviews.length === 0 ? (
            <p className="text-gray-500">
              No reviews yet.
            </p>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className="border-b py-3 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      review.customer?.profile_picture ||
                      "https://placehold.co/50x50"
                    }
                    alt="Customer"
                    className="w-12 h-12 rounded-full object-cover"
                  />

                  <div>
                    <p className="font-semibold">
                      {[
                        review.customer?.first_name,
                        review.customer?.middle_name,
                        review.customer?.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>

                    <p className="text-yellow-500">
                      {"⭐".repeat(review.rating)}
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-gray-600">
                  {review.review}
                </p>
              </div>
            ))
          )}
        </div>

        {/* SERVICES */}

        <div className="bg-white rounded-xl shadow p-5 mt-6">
          <h2 className="text-2xl font-bold mb-4">
            Services Offered
          </h2>

          {services.length === 0 ? (
            <p className="text-gray-500">
              No services available.
            </p>
          ) : (
            services.map((service) => (
              <div
                key={service.id}
                className="border rounded-lg p-4 mb-3"
              >
                <h3 className="font-bold text-lg">
                  {service.service_name}
                </h3>

                <p>{service.category}</p>

                <p className="text-gray-500 mt-2">
                  {service.description}
                </p>

                <p className="font-bold text-blue-600 mt-3">
                  ₱{service.price}
                </p>
              </div>
            ))
          )}
        </div>

        {/* SKILLS */}

        <div className="bg-white rounded-xl shadow p-5 mt-6">
          <h2 className="text-2xl font-bold mb-4">
            Skills
          </h2>

          {skills.length === 0 ? (
            <p className="text-gray-500">
              No skills added.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {skills.map((skill) => (
                <span
                  key={skill.id}
                  className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full"
                >
                  {skill.skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* WORK EXPERIENCE */}

        <div className="bg-white rounded-xl shadow p-5 mt-6">
          <h2 className="text-2xl font-bold mb-4">
            Work Experience
          </h2>

          {workExperience.length === 0 ? (
            <p className="text-gray-500">
              No work experience.
            </p>
          ) : (
            workExperience.map((work) => (
              <div
                key={work.id}
                className="border-b py-3 last:border-b-0"
              >
                <h3 className="font-bold">
                  {work.position}
                </h3>

                <p>{work.company_name}</p>

                <p className="text-gray-500">
                  {work.start_year} - {work.end_year}
                </p>
              </div>
            ))
          )}
        </div>

        {/* EDUCATION */}

        <div className="bg-white rounded-xl shadow p-5 mt-6">
          <h2 className="text-2xl font-bold mb-4">
            Education
          </h2>

          {education ? (
            <>
              <p>
                <strong>Highest Level:</strong>{" "}
                {education.education_level}
              </p>

              <p>
                <strong>School:</strong>{" "}
                {education.school_name}
              </p>

              <p>
                <strong>Course:</strong>{" "}
                {education.course}
              </p>

              <p>
                <strong>Year Graduated:</strong>{" "}
                {education.year_graduated}
              </p>
            </>
          ) : (
            <p className="text-gray-500">
              No education information.
            </p>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}