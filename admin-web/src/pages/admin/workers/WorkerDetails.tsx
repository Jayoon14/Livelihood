import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AdminLayout from "../../../layouts/AdminLayout";

import {
  getWorker,
  approveWorker,
  rejectWorker,
  getEducation,
  getWorkExperience,
  getSkills,
  getDocuments,
} from "../../../services/workerService";

export default function WorkerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [worker, setWorker] = useState<any>(null);

  // Document Viewer States
  const [preview, setPreview] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadWorker();
  }, []);

  async function loadWorker() {
    if (!id) return;

    try {
      const profile = await getWorker(id);
      const education = await getEducation(id);
      const work = await getWorkExperience(id);
      const skills = await getSkills(id);
      const documents = await getDocuments(id);

      setWorker({
        ...profile,
        education,
        work,
        skills,
        documents,
      });
    } catch (error) {
      console.error("Failed to load worker:", error);
    }
  }

  async function handleApprove() {
    if (!id) return;

    try {
      await approveWorker(id);

      alert("Worker Approved!");

      navigate("/workers");
    } catch (error) {
      console.error(error);
      alert("Failed to approve worker.");
    }
  }

  async function handleReject() {
    if (!id) return;

    try {
      await rejectWorker(id);

      alert("Worker Rejected!");

      navigate("/workers");
    } catch (error) {
      console.error(error);
      alert("Failed to reject worker.");
    }
  }

  if (!worker) {
    return (
      <AdminLayout>
        <div className="p-8">Loading...</div>
      </AdminLayout>
    );
  }

  const documentList = [
    {
      title: "Valid ID",
      url: worker.documents?.valid_id,
    },
    {
      title: "Resume",
      url: worker.documents?.resume,
    },
    {
      title: "TESDA Certificate",
      url: worker.documents?.tesda_certificate,
    },
    {
      title: "Barangay Clearance",
      url: worker.documents?.barangay_clearance,
    },
    {
      title: "Police Clearance",
      url: worker.documents?.police_clearance,
    },
    {
      title: "NBI Clearance",
      url: worker.documents?.nbi_clearance,
    },
  ].filter((doc) => doc.url);

  function openPreview(index: number) {
    setCurrentIndex(index);
    setPreview(documentList[index].url);
    setPreviewTitle(documentList[index].title);
    setZoom(1);
    setRotation(0);
  }

  function nextDocument() {
    if (currentIndex >= documentList.length - 1) return;

    const next = currentIndex + 1;

    setCurrentIndex(next);
    setPreview(documentList[next].url);
    setPreviewTitle(documentList[next].title);
    setZoom(1);
    setRotation(0);
  }

  function previousDocument() {
    if (currentIndex <= 0) return;

    const prev = currentIndex - 1;

    setCurrentIndex(prev);
    setPreview(documentList[prev].url);
    setPreviewTitle(documentList[prev].title);
    setZoom(1);
    setRotation(0);
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-8">
        {/* PROFILE HEADER */}

        <div className="flex items-center gap-6 mb-10">
          {worker.profile_picture ? (
            <img
              src={worker.profile_picture}
              alt="Profile"
              onError={() => console.log("Image failed to load")}
              onLoad={() => console.log("Image loaded")}
              className="w-24 h-24 rounded-full object-cover border"
            />
          ) : (
            <div
              className="
          w-24 h-24
          rounded-full
          bg-blue-100
          flex
          items-center
          justify-center
          text-blue-700
          text-4xl
          font-bold
          "
            >
              {worker.first_name?.charAt(0)}
            </div>
          )}

          <div>
            <h1 className="text-4xl font-bold">
              {worker.first_name} {worker.middle_name} {worker.last_name}
            </h1>

            <p className="text-gray-500 mt-2">{worker.email}</p>

            <span
              className={`
                inline-block mt-3
                px-4 py-1
                rounded-full
                text-sm font-semibold
                ${
                  worker.status === "Pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : worker.status === "Approved"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                }
              `}
            >
              {worker.status}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-8">
          {/* PERSONAL INFORMATION */}

          <Section title="👤 Personal Information">
            <div className="grid grid-cols-2 gap-6">
              <Info title="First Name" value={worker.first_name} />
              <Info title="Middle Name" value={worker.middle_name} />
              <Info title="Last Name" value={worker.last_name} />
              <Info
                title="Birthday"
                value={
                  worker.birth_date
                    ? new Date(worker.birth_date).toLocaleDateString("en-GB")
                    : "-"
                }
              />

              <Info title="Email" value={worker.email} />
              <Info title="Phone" value={worker.phone} />

              <Info title="Gender" value={worker.gender} />
              <Info title="Civil Status" value={worker.civil_status} />

              <Info title="Religion" value={worker.religion} />
              <Info title="Barangay" value={worker.barangay} />

              <Info title="Municipality" value={worker.municipality} />
              <Info title="Province" value={worker.province} />

              <Info title="Status" value={worker.status} />
            </div>
          </Section>

          {/* EDUCATIONAL BACKGROUND */}

          <Section title="🎓 Educational Background">
            <div className="grid grid-cols-2 gap-6">
              <Info
                title="Highest Attainment"
                value={worker.education?.highest_attainment}
              />

              <Info title="Elementary" value={worker.education?.elementary} />

              <Info title="Secondary" value={worker.education?.secondary} />

              <Info title="Senior High" value={worker.education?.senior_high} />

              <Info title="College" value={worker.education?.college} />

              <Info title="Course" value={worker.education?.course} />

              <Info
                title="Year Graduated"
                value={worker.education?.year_graduated}
              />

              <Info title="TESDA" value={worker.education?.tesda} />

              <Info title="PRC" value={worker.education?.prc} />

              <Info title="Trainings" value={worker.education?.trainings} />
            </div>
          </Section>

          {/* WORK EXPERIENCE */}

          <Section title="💼 Work Experience">
            {worker.work?.length > 0 ? (
              worker.work.map((job: any) => (
                <div
                  key={job.id}
                  className="
                    border
                    rounded-lg
                    p-4
                    mb-4
                    space-y-3
                  "
                >
                  <Info title="Company" value={job.company} />

                  <Info title="Position" value={job.position} />

                  <Info
                    title="Employment Status"
                    value={job.employment_status}
                  />

                  <Info title="Start Date" value={job.start_date} />

                  <Info title="End Date" value={job.end_date} />

                  <Info title="Description" value={job.description} />
                </div>
              ))
            ) : (
              <div className="border rounded-xl p-5 bg-gray-50">
                <h3 className="font-semibold text-lg">Work Experience</h3>

                <p className="text-gray-500 mt-2">
                  Applicant declared that he/she has no previous work
                  experience.
                </p>
              </div>
            )}
          </Section>

          {/* SKILLS */}

          <Section title="🛠 Skills">
            <div className="flex flex-wrap gap-3">
              {worker.skills?.length > 0 ? (
                worker.skills.map((skill: any) => (
                  <span
                    key={skill.id}
                    className="
                      bg-blue-100
                      text-blue-700
                      px-4
                      py-2
                      rounded-full
                    "
                  >
                    {skill.skill_name}
                  </span>
                ))
              ) : (
                <p className="text-gray-500">No skills added.</p>
              )}
            </div>
          </Section>

          {/* DOCUMENTS */}

          <Section title="📄 Documents">
            {documentList.length > 0 ? (
              documentList.map((doc, index) => (
                <div
                  key={doc.title}
                  className="
                    flex
                    items-center
                    justify-between
                    border
                    rounded-lg
                    p-4
                    mb-3
                  "
                >
                  <div>
                    <p className="text-gray-500 text-sm">Document</p>

                    <p className="font-semibold">{doc.title}</p>
                  </div>

                  <button
                    onClick={() => openPreview(index)}
                    className="
                      bg-blue-600
                      hover:bg-blue-700
                      text-white
                      px-5
                      py-2
                      rounded-lg
                    "
                  >
                    View
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No documents uploaded.</p>
            )}
          </Section>

          {/* APPROVE / REJECT */}

          {worker.status === "Pending" && (
            <div className="flex justify-end gap-4 mt-10">
              <button
                onClick={handleReject}
                className="
                  bg-red-600
                  hover:bg-red-700
                  text-white
                  px-6
                  py-3
                  rounded-lg
                "
              >
                Reject
              </button>

              <button
                onClick={handleApprove}
                className="
                  bg-green-600
                  hover:bg-green-700
                  text-white
                  px-6
                  py-3
                  rounded-lg
                "
              >
                Approve
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DOCUMENT VIEWER MODAL */}

      {preview && (
        <div
          className="
            fixed
            inset-0
            z-50
            bg-black/80
            backdrop-blur-sm
            flex
            items-center
            justify-center
            p-4
          "
        >
          <div
            className="
              bg-white
              rounded-2xl
              shadow-2xl
              w-full
              max-w-6xl
              overflow-hidden
            "
          >
            <div
              className="
                flex
                justify-between
                items-center
                px-6
                py-4
                border-b
              "
            >
              <h2 className="text-xl font-bold">{previewTitle}</h2>

              <button
                onClick={() => setPreview(null)}
                className="
                  text-red-600
                  text-3xl
                  font-bold
                "
              >
                ×
              </button>
            </div>

            <div
              className="
                bg-gray-100
                h-[70vh]
                flex
                items-center
                justify-center
                overflow-auto
              "
            >
              {preview.toLowerCase().endsWith(".pdf") ? (
                <iframe src={preview} className="w-full h-full" />
              ) : (
                <img
                  src={preview}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "0.3s",
                  }}
                  className="
                    max-h-full
                    max-w-full
                    object-contain
                  "
                />
              )}
            </div>

            {/* DOCUMENT CONTROLS */}

            <div
              className="
                border-t
                px-6
                py-4
                flex
                flex-wrap
                justify-center
                gap-3
              "
            >
              <button
                onClick={previousDocument}
                disabled={currentIndex === 0}
                className="
                  bg-gray-200
                  hover:bg-gray-300
                  disabled:opacity-40
                  px-4
                  py-2
                  rounded-lg
                "
              >
                ← Previous
              </button>

              <button
                onClick={nextDocument}
                disabled={currentIndex === documentList.length - 1}
                className="
                  bg-gray-200
                  hover:bg-gray-300
                  disabled:opacity-40
                  px-4
                  py-2
                  rounded-lg
                "
              >
                Next →
              </button>

              {!preview.toLowerCase().endsWith(".pdf") && (
                <>
                  <button
                    onClick={() => setZoom((prev) => Math.min(prev + 0.2, 3))}
                    className="
                      bg-blue-600
                      hover:bg-blue-700
                      text-white
                      px-4
                      py-2
                      rounded-lg
                    "
                  >
                    Zoom +
                  </button>

                  <button
                    onClick={() => setZoom((prev) => Math.max(prev - 0.2, 0.5))}
                    className="
                      bg-blue-600
                      hover:bg-blue-700
                      text-white
                      px-4
                      py-2
                      rounded-lg
                    "
                  >
                    Zoom -
                  </button>

                  <button
                    onClick={() => setRotation((prev) => prev + 90)}
                    className="
                      bg-purple-600
                      hover:bg-purple-700
                      text-white
                      px-4
                      py-2
                      rounded-lg
                    "
                  >
                    Rotate
                  </button>
                </>
              )}

              <a
                href={preview}
                download
                className="
                  bg-green-600
                  hover:bg-green-700
                  text-white
                  px-4
                  py-2
                  rounded-lg
                "
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Section({ title, children }: any) {
  return (
    <div
      className="
        bg-white
        rounded-2xl
        shadow-lg
        border
        border-slate-200
        mb-8
        overflow-hidden
      "
    >
      <div
        className="
          bg-slate-50
          px-6
          py-4
          border-b
        "
      >
        <h2 className="text-xl font-bold">{title}</h2>
      </div>

      <div className="p-6">{children}</div>
    </div>
  );
}

function Info({ title, value }: { title: string; value: any }) {
  return (
    <div>
      <p
        className="
          text-gray-500
          text-sm
        "
      >
        {title}
      </p>

      <p
        className="
          font-semibold
          mt-1
          break-words
        "
      >
        {value || "-"}
      </p>
    </div>
  );
}
