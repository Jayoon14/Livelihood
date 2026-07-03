import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getWorker,
  getEducation,
  getWorkExperience,
  getSkills,
  getDocuments,
  getServices,
  approveWorker,
  rejectWorker,
} from "../../../services/workerService";

export default function WorkerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [worker, setWorker] = useState<any>(null);
  const [education, setEducation] = useState<any>(null);
  const [experience, setExperience] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadWorker();
    }
  }, [id]);

  async function loadWorker() {
    try {
      const profile = await getWorker(id!);
      setWorker(profile);

      const [
        educationData,
        workData,
        skillsData,
        documentsData,
        servicesData,
      ] = await Promise.all([
        getEducation(id!),
        getWorkExperience(id!),
        getSkills(id!),
        getDocuments(id!),
        getServices(id!),
      ]);

      setEducation(educationData);
      setExperience(workData);
      setSkills(skillsData);
      setDocuments(documentsData);
      setServices(servicesData);
    } catch (error) {
      console.error("Error loading worker:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!worker) return;

    if (!window.confirm("Approve this worker?")) return;

    try {
      await approveWorker(worker.id);

      alert("Worker Approved Successfully!");

      navigate("/workers");
    } catch (error) {
      console.error(error);
      alert("Failed to approve worker.");
    }
  }

  async function handleReject() {
    if (!worker) return;

    if (!window.confirm("Reject this worker?")) return;

    try {
      await rejectWorker(worker.id);

      alert("Worker Rejected.");

      navigate("/workers");
    } catch (error) {
      console.error(error);
      alert("Failed to reject worker.");
    }
  }

  if (loading) {
    return <div className="p-10 text-xl">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-8">

      <h1 className="text-3xl font-bold">
        Worker Details
      </h1>

      {/* PERSONAL INFORMATION */}
      <div className="bg-white rounded-xl shadow p-8">
        <h2 className="text-xl font-bold mb-6">
          Personal Information
        </h2>

        <div className="grid grid-cols-2 gap-6">

          <div><strong>First Name</strong><p>{worker.first_name}</p></div>
          <div><strong>Middle Name</strong><p>{worker.middle_name}</p></div>
          <div><strong>Last Name</strong><p>{worker.last_name}</p></div>
          <div><strong>Suffix</strong><p>{worker.suffix}</p></div>

          <div><strong>Email</strong><p>{worker.email}</p></div>
          <div><strong>Phone</strong><p>{worker.phone}</p></div>

          <div><strong>Birth Date</strong><p>{worker.birth_date}</p></div>
          <div><strong>Gender</strong><p>{worker.gender}</p></div>

          <div><strong>Civil Status</strong><p>{worker.civil_status}</p></div>
          <div><strong>Religion</strong><p>{worker.religion}</p></div>

          <div><strong>Address</strong><p>{worker.address}</p></div>

          <div>
            <strong>Status</strong>
            <span
              className={`ml-2 px-3 py-1 rounded-full text-white ${
                worker.status === "Approved"
                  ? "bg-green-600"
                  : worker.status === "Rejected"
                  ? "bg-red-600"
                  : "bg-yellow-500"
              }`}
            >
              {worker.status}
            </span>
          </div>

        </div>
      </div>

      {/* EDUCATION */}
      <div className="bg-white rounded-xl shadow p-8">
        <h2 className="text-xl font-bold mb-6">
          Educational Background
        </h2>

        {education ? (
          <div className="grid grid-cols-2 gap-6">
            <div><strong>Highest Attainment</strong><p>{education.highest_attainment}</p></div>
            <div><strong>Elementary</strong><p>{education.elementary}</p></div>
            <div><strong>Secondary</strong><p>{education.secondary}</p></div>
            <div><strong>Senior High</strong><p>{education.senior_high}</p></div>
            <div><strong>College</strong><p>{education.college}</p></div>
            <div><strong>Course</strong><p>{education.course}</p></div>
            <div><strong>Year Graduated</strong><p>{education.year_graduated}</p></div>
            <div><strong>TESDA</strong><p>{education.tesda}</p></div>
            <div><strong>PRC</strong><p>{education.prc}</p></div>
            <div><strong>Trainings</strong><p>{education.trainings}</p></div>
          </div>
        ) : (
          <p className="text-gray-500">No educational background found.</p>
        )}
      </div>

      {/* WORK EXPERIENCE */}
      <div className="bg-white rounded-xl shadow p-8">
        <h2 className="text-xl font-bold mb-6">Work Experience</h2>

        {experience.length > 0 ? (
          <div className="space-y-5">
            {experience.map((job) => (
              <div key={job.id} className="border rounded-lg p-5">
                <h3 className="font-semibold text-lg">{job.company}</h3>
                <p>Position: {job.position}</p>
                <p>Employment: {job.employment_status}</p>
                <p>Start: {job.start_date}</p>
                <p>End: {job.end_date}</p>
                <p className="mt-3">{job.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No work experience found.</p>
        )}
      </div>

      {/* SKILLS */}
      <div className="bg-white rounded-xl shadow p-8">
        <h2 className="text-xl font-bold mb-6">Skills</h2>

        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {skills.map((skill) => (
              <span
                key={skill.id}
                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full"
              >
                {skill.skill_name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No skills added.</p>
        )}
      </div>

      {/* SERVICES */}
      <div className="bg-white rounded-xl shadow p-8">
        <h2 className="text-xl font-bold mb-6">Services Offered</h2>

        {services.length > 0 ? (
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.id} className="border rounded-lg p-5">
                <h3 className="font-semibold">{service.service_name}</h3>
                <p>Category: {service.category}</p>
                <p>Price: ₱{service.price}</p>
                <p>Status: {service.status}</p>
                <p className="mt-2">{service.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No services added.</p>
        )}
      </div>

      {/* DOCUMENTS */}
      <div className="bg-white rounded-xl shadow p-8">
        <h2 className="text-xl font-bold mb-6">
          Uploaded Documents
        </h2>

        {documents ? (
          <div className="grid grid-cols-2 gap-6">

            {[
              ["Valid ID", "valid_id"],
              ["Resume", "resume"],
              ["TESDA Certificate", "tesda_certificate"],
              ["Barangay Clearance", "barangay_clearance"],
              ["Police Clearance", "police_clearance"],
              ["NBI Clearance", "nbi_clearance"],
            ].map(([label, key]) => (
              <div key={key} className="border rounded-lg p-4 flex justify-between items-center">
                <span>{label}</span>

                {documents[key as keyof typeof documents] ? (
                  <a
                    href={documents[key as keyof typeof documents]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    View
                  </a>
                ) : (
                  <span className="text-gray-400">Not Uploaded</span>
                )}

              </div>
            ))}

          </div>
        ) : (
          <p className="text-gray-500">No documents uploaded.</p>
        )}
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex justify-end gap-4">

        {worker.status === "Pending" && (
          <>
            <button
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold"
            >
              Reject
            </button>

            <button
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold"
            >
              Approve
            </button>
          </>
        )}

        {worker.status === "Approved" && (
          <span className="px-6 py-3 rounded-lg bg-green-100 text-green-700 font-semibold">
            Worker Approved
          </span>
        )}

        {worker.status === "Rejected" && (
          <span className="px-6 py-3 rounded-lg bg-red-100 text-red-700 font-semibold">
            Worker Rejected
          </span>
        )}

      </div>

    </div>
  );
}