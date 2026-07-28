import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";

import {
  getEducation,
  getServices,
  getSkills,
  getWorkerDetails,
  getWorkExperience,
} from "../../../services/workerService";

import {
  createBooking,
  isWorkerAvailable,
} from "../../../services/bookingService";

import { supabase } from "../../../lib/supabase";

import {
  getWorkerAverageRating,
  getWorkerReviews,
} from "../../../services/reviewService";

interface WorkerServiceItem {
  id: number;
  category: string | null;
  service_name: string;
  description: string | null;
  price: number | null;
}

interface WorkerDetailsData {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string | null;
  services: WorkerServiceItem[];
}

interface EducationRecord {
  education_level: string | null;
  school_name: string | null;
  course: string | null;
  year_graduated: string | number | null;
}

interface WorkExperienceRecord {
  id: string | number;
  position: string | null;
  company_name: string | null;
  start_year: string | number | null;
  end_year: string | number | null;
}

interface SkillRecord {
  id: string | number;
  skill: string;
}

interface ReviewCustomer {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  profile_picture: string | null;
}

interface WorkerReview {
  id: string | number;
  rating: number;
  review: string | null;
  customer: ReviewCustomer | null;
}

function normalizeArray<T>(value: T[] | null | undefined): T[] {
  return value ?? [];
}

function normalizeWorkerDetails(value: unknown): WorkerDetailsData {
  if (!value || typeof value !== "object") {
    throw new Error("Worker details were not found.");
  }

  const record = value as Record<string, unknown>;
  const rawServices = Array.isArray(record.services) ? record.services : [];

  const services: WorkerServiceItem[] = rawServices
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      id: typeof item.id === "number" ? item.id : Number(item.id),
      category:
        typeof item.category === "string" ? item.category : null,
      service_name:
        typeof item.service_name === "string" ? item.service_name : "",
      description:
        typeof item.description === "string" ? item.description : null,
      price:
        typeof item.price === "number"
          ? item.price
          : item.price == null
            ? null
            : Number(item.price),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.id) &&
        item.id > 0 &&
        item.service_name.trim().length > 0,
    );

  return {
    id: typeof record.id === "string" ? record.id : String(record.id ?? ""),
    first_name:
      typeof record.first_name === "string" ? record.first_name : null,
    middle_name:
      typeof record.middle_name === "string" ? record.middle_name : null,
    last_name:
      typeof record.last_name === "string" ? record.last_name : null,
    email: typeof record.email === "string" ? record.email : null,
    status: typeof record.status === "string" ? record.status : null,
    services,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export default function WorkerDetails() {
  const { id } = useParams<{ id: string }>();

  const [worker, setWorker] = useState<WorkerDetailsData | null>(null);
  const [education, setEducation] = useState<EducationRecord | null>(null);
  const [workExperience, setWorkExperience] = useState<
    WorkExperienceRecord[]
  >([]);
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [services, setServices] = useState<WorkerServiceItem[]>([]);

  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [service, setService] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState(0);

  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadWorker = useCallback(async () => {
    if (!id) {
      setLoadError("Worker ID is missing.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadError(null);

      const [
        workerResult,
        educationResult,
        workResult,
        skillsResult,
        servicesResult,
        reviewsResult,
        ratingResult,
      ] = await Promise.all([
        getWorkerDetails(id),
        getEducation(id),
        getWorkExperience(id),
        getSkills(id),
        getServices(id),
        getWorkerReviews(id),
        getWorkerAverageRating(id),
      ]);

      const workerData = normalizeWorkerDetails(workerResult);

      setWorker(workerData);
      setEducation(educationResult as EducationRecord | null);
      setWorkExperience(
        normalizeArray(workResult as WorkExperienceRecord[] | null),
      );
      setSkills(normalizeArray(skillsResult as SkillRecord[] | null));
      setServices(
        normalizeArray(servicesResult as WorkerServiceItem[] | null),
      );
      setReviews(normalizeArray(reviewsResult as WorkerReview[] | null));
      setAverageRating(
        typeof ratingResult === "number" && Number.isFinite(ratingResult)
          ? ratingResult
          : 0,
      );

      const firstService = workerData.services[0];

      if (firstService) {
        setService(firstService.service_name);
        setEstimatedPrice(firstService.price ?? 0);
      } else {
        setService("");
        setEstimatedPrice(0);
      }
    } catch (error) {
      console.error("Failed to load worker details:", error);
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadWorker();
  }, [loadWorker]);

  async function handleBooking(): Promise<void> {
    if (!worker) {
      alert("Worker details are unavailable.");
      return;
    }

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
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      alert(authError.message);
      return;
    }

    if (!user) {
      alert("Please login first.");
      return;
    }

    const selectedService = worker.services.find(
      (item) => item.service_name === service,
    );

    if (!selectedService) {
      alert("Please select a service.");
      return;
    }

    try {
      setIsBooking(true);

      const available = await isWorkerAvailable(
        worker.id,
        bookingDate,
        bookingTime,
      );

      if (!available) {
        alert("Worker is unavailable on the selected date and time.");
        return;
      }

    await createBooking({
      customer_id: user.id,
      worker_id: worker.id,
      service_id: String(selectedService.id),
      booking_date: bookingDate,
      booking_time: bookingTime,
      address: address.trim(),
      notes: notes.trim(),
    });

      alert("Booking submitted successfully!");

      setBookingDate("");
      setBookingTime("");
      setAddress("");
      setNotes("");
      setContactNumber("");

      const firstService = worker.services[0];

      if (firstService) {
        setService(firstService.service_name);
        setEstimatedPrice(firstService.price ?? 0);
      }
    } catch (error) {
      console.error("Failed to submit booking:", error);
      alert(getErrorMessage(error));
    } finally {
      setIsBooking(false);
    }
  }

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="py-20 text-center">Loading...</div>
      </CustomerLayout>
    );
  }

  if (loadError || !worker) {
    return (
      <CustomerLayout>
        <div className="py-20 text-center">
          <p className="text-red-600">
            {loadError ?? "Worker details were not found."}
          </p>

          <button
            type="button"
            onClick={() => void loadWorker()}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="flex gap-6">
          <div className="h-40 w-40 rounded-full bg-blue-100" />

          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {[worker.first_name, worker.middle_name, worker.last_name]
                .filter(Boolean)
                .join(" ")}
            </h1>

            <p className="mt-2 text-gray-500">{worker.email}</p>

            <p className="mt-2">
              Status:
              <span className="ml-2 font-semibold text-green-600">
                {worker.status}
              </span>
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block font-semibold">Service</label>

                <select
                  value={service}
                  onChange={(event) => {
                    const selected = event.target.value;
                    const selectedService = worker.services.find(
                      (item) => item.service_name === selected,
                    );

                    setService(selected);
                    setEstimatedPrice(selectedService?.price ?? 0);
                  }}
                  className="w-full rounded-lg border p-3"
                  disabled={worker.services.length === 0}
                >
                  {worker.services.length === 0 ? (
                    <option value="">No services available</option>
                  ) : (
                    worker.services.map((item) => (
                      <option key={item.id} value={item.service_name}>
                        {item.service_name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Contact Number
                </label>

                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(event) => setContactNumber(event.target.value)}
                  placeholder="09XXXXXXXXX"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Preferred Date
                </label>

                <input
                  type="date"
                  value={bookingDate}
                  onChange={(event) => setBookingDate(event.target.value)}
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Preferred Time
                </label>

                <input
                  type="time"
                  value={bookingTime}
                  onChange={(event) => setBookingTime(event.target.value)}
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Service Address
                </label>

                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Enter complete address"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Job Description
                </label>

                <textarea
                  rows={5}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Describe the work..."
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block font-semibold">
                  Estimated Price
                </label>

                <input
                  readOnly
                  value={`₱${estimatedPrice}`}
                  className="w-full rounded-lg border bg-gray-100 p-3"
                />
              </div>

              <button
                type="button"
                onClick={() => void handleBooking()}
                disabled={isBooking || worker.services.length === 0}
                className="w-full rounded-xl bg-blue-600 py-4 text-lg font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBooking ? "Submitting..." : "Book Worker"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow">
          <h2 className="mb-4 text-2xl font-bold">Customer Reviews</h2>

          <div className="mb-4 flex items-center gap-2">
            <span className="text-4xl font-bold">{averageRating}</span>
            <span className="text-2xl text-yellow-500">⭐</span>
          </div>

          {reviews.length === 0 ? (
            <p className="text-gray-500">No reviews yet.</p>
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
                    className="h-12 w-12 rounded-full object-cover"
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
                      {"⭐".repeat(Math.max(0, Math.min(5, review.rating)))}
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-gray-600">{review.review}</p>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow">
          <h2 className="mb-4 text-2xl font-bold">Services Offered</h2>

          {services.length === 0 ? (
            <p className="text-gray-500">No services available.</p>
          ) : (
            services.map((item) => (
              <div key={item.id} className="mb-3 rounded-lg border p-4">
                <h3 className="text-lg font-bold">{item.service_name}</h3>
                <p>{item.category}</p>
                <p className="mt-2 text-gray-500">{item.description}</p>
                <p className="mt-3 font-bold text-blue-600">
                  ₱{item.price ?? 0}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow">
          <h2 className="mb-4 text-2xl font-bold">Skills</h2>

          {skills.length === 0 ? (
            <p className="text-gray-500">No skills added.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {skills.map((skill) => (
                <span
                  key={skill.id}
                  className="rounded-full bg-blue-100 px-4 py-2 text-blue-700"
                >
                  {skill.skill}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow">
          <h2 className="mb-4 text-2xl font-bold">Work Experience</h2>

          {workExperience.length === 0 ? (
            <p className="text-gray-500">No work experience.</p>
          ) : (
            workExperience.map((work) => (
              <div
                key={work.id}
                className="border-b py-3 last:border-b-0"
              >
                <h3 className="font-bold">{work.position}</h3>
                <p>{work.company_name}</p>
                <p className="text-gray-500">
                  {work.start_year} - {work.end_year}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow">
          <h2 className="mb-4 text-2xl font-bold">Education</h2>

          {education ? (
            <>
              <p>
                <strong>Highest Level:</strong>{" "}
                {education.education_level}
              </p>

              <p>
                <strong>School:</strong> {education.school_name}
              </p>

              <p>
                <strong>Course:</strong> {education.course}
              </p>

              <p>
                <strong>Year Graduated:</strong>{" "}
                {education.year_graduated}
              </p>
            </>
          ) : (
            <p className="text-gray-500">No education information.</p>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}