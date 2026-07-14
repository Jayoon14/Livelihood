import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";

import {
  Star,
  Briefcase,
  GraduationCap,
  Award,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

import {
  getCustomerWorkerProfile,
} from "../../../services/workerService";

import {
  getWorkerAverageRating,
} from "../../../services/reviewService";

export default function CustomerWorkerProfile() {
  const { id } = useParams();

  const navigate = useNavigate();

  const [worker, setWorker] = useState<any>(null);

  const [rating, setRating] = useState(0);

  useEffect(() => {
    loadWorker();
  }, []);

  async function loadWorker() {
    if (!id) return;

    const data =
      await getCustomerWorkerProfile(id);

    setWorker(data);

    const avg =
      await getWorkerAverageRating(id);

    setRating(avg);
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
              worker.profile.profile_image ||
              "https://placehold.co/250x250"
            }
            className="w-52 h-52 rounded-2xl object-cover"
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

            <button
              onClick={() =>
                navigate(`/customer/book/${id}`)
              }
              className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl"
            >
              Book Now
            </button>

          </div>

        </div>

        {/* SERVICES */}

        <div className="bg-white rounded-3xl shadow p-8 mt-8">

          <h2 className="text-2xl font-bold mb-5 flex items-center gap-3">
            <Briefcase />
            Services
          </h2>

          <div className="grid md:grid-cols-2 gap-5">

            {worker.services.map((service: any) => (

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

            ))}

          </div>

        </div>

        {/* EDUCATION */}

        <div className="bg-white rounded-3xl shadow p-8 mt-8">

          <h2 className="text-2xl font-bold flex gap-3 mb-5">
            <GraduationCap />
            Education
          </h2>

          {worker.education && (

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

          )}

        </div>

        {/* EXPERIENCE */}

        <div className="bg-white rounded-3xl shadow p-8 mt-8">

          <h2 className="text-2xl font-bold mb-5">
            Work Experience
          </h2>

          {worker.workExperience.map((job: any) => (

            <div
              key={job.id}
              className="mb-5"
            >

              <h3 className="font-bold">
                {job.company}
              </h3>

              <p>{job.position}</p>

            </div>

          ))}

        </div>

        {/* SKILLS */}

        <div className="bg-white rounded-3xl shadow p-8 mt-8">

          <h2 className="text-2xl font-bold flex gap-3 mb-5">
            <Award />
            Skills
          </h2>

          <div className="flex flex-wrap gap-3">

            {worker.skills.map((skill: any) => (

              <span
                key={skill.id}
                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full"
              >
                {skill.skill_name}
              </span>

            ))}

          </div>

        </div>

      </div>
    </CustomerLayout>
  );
}