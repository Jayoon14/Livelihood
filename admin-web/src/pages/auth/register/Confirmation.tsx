import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileText,
  GraduationCap,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";

import DocumentModal from "../../../components/DocumentModal";
import { useRegisterStore } from "../../../store/registerStore";

interface ReviewCardProps {
  icon: typeof UserRound;
  title: string;
  description: string;
  tone: "blue" | "amber" | "emerald" | "violet" | "indigo";
  children: ReactNode;
  onEdit?: () => void;
}

interface InfoProps {
  label: string;
  children: ReactNode;
  fullWidth?: boolean;
}

interface DocumentPreviewProps {
  title: string;
  file?: File | null;
  onView: (file: File) => void;
}

const toneClasses = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const kb = bytes / 1024;

  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  return `${(kb / 1024).toFixed(1)} MB`;
}

function ReviewCard({
  icon: Icon,
  title,
  description,
  tone,
  children,
  onEdit,
}: ReviewCardProps) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/75 px-5 py-5 dark:border-slate-700 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone]}`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div>
            <h3
              className="text-lg font-black text-slate-950 dark:text-white"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {title}
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-slate-800"
          >
            <Pencil className="h-4 w-4" />
            Edit section
          </button>
        )}
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Info({ label, children, fullWidth = false }: InfoProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/45 ${
        fullWidth ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
        {label}
      </p>

      <div className="mt-2 break-words text-sm font-bold leading-6 text-slate-800 dark:text-slate-100">
        {children || "-"}
      </div>
    </div>
  );
}

function DocumentPreview({ title, file, onView }: DocumentPreviewProps) {
  if (!file) {
    return (
      <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {title}
            </p>

            <p className="mt-1 text-xs font-semibold text-rose-500">
              Not uploaded
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
            <FileCheck2 className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {title}
            </p>

            <p className="mt-1 truncate text-xs text-emerald-700 dark:text-emerald-300">
              {file.name}
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              {formatFileSize(file.size)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onView(file)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2937F0] via-[#5B3DF1] to-[#3292EC] px-4 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-500/20 transition hover:-translate-y-0.5 sm:w-auto"
        >
          <Eye className="h-4 w-4" />
          View
        </button>
      </div>
    </div>
  );
}

export default function Confirmation() {
  const { data, goToStep, setEditingFromReview } = useRegisterStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTitle, setSelectedTitle] = useState("");

  const profilePreview = useMemo(() => {
    if (!data.profilePicture) return "";

    return URL.createObjectURL(data.profilePicture);
  }, [data.profilePicture]);

  useEffect(() => {
    return () => {
      if (profilePreview) {
        URL.revokeObjectURL(profilePreview);
      }
    };
  }, [profilePreview]);

  const initials =
    `${data.firstName?.charAt(0) ?? ""}${data.lastName?.charAt(0) ?? ""}`
      .toUpperCase()
      .trim() || "?";

  const uploadedDocuments = [
    data.validId,
    data.resume,
    data.tesdaCertificate,
    data.barangayClearance,
    data.policeClearance,
    data.nbiClearance,
    data.juniorHighDiploma,
    data.seniorHighDiploma,
    data.collegeDiploma,
    data.mastersDiploma,
    data.doctorateDiploma,
  ].filter(Boolean).length;

  const editStep = (step: number): void => {
    setEditingFromReview(true);
    goToStep(step);
  };

  const openDocument = (title: string, file: File): void => {
    setSelectedTitle(title);
    setSelectedFile(file);
  };

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(#2937f0 1px,transparent 1px),linear-gradient(90deg,#2937f0 1px,transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-300/15 blur-3xl dark:bg-indigo-700/10" />

      {/* HEADER */}
      <div className="relative z-10 overflow-hidden border-b border-white/15 bg-[linear-gradient(135deg,#2937F0_0%,#5B3DF1_52%,#3292EC_100%)] px-5 py-7 text-white sm:px-7 lg:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "38px 38px",
          }}
        />

        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-amber-300 backdrop-blur">
            <Sparkles className="h-4 w-4" />
            Step 6 · Final review
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2
                className="text-3xl font-black leading-tight sm:text-4xl"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Worker Application Preview
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                Review every section carefully before submitting your worker
                application.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold backdrop-blur">
              <BadgeCheck className="h-4 w-4 text-amber-300" />
              Profile completion: 100%
            </div>
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-full rounded-full bg-emerald-400" />
          </div>
        </div>
      </div>

      <div className="relative z-10 grid gap-6 p-4 sm:p-6 lg:p-8">
        {/* PROFILE SUMMARY */}
        <section className="rounded-[1.5rem] border border-indigo-100 bg-[linear-gradient(135deg,#eef2ff_0%,#f8faff_100%)] p-5 dark:border-indigo-500/20 dark:bg-[linear-gradient(135deg,rgba(49,46,129,.17),rgba(15,23,42,.9))] sm:p-6">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            {profilePreview ? (
              <img
                src={profilePreview}
                alt="Worker profile"
                className="h-28 w-28 shrink-0 rounded-full border-4 border-white object-cover shadow-xl dark:border-slate-800"
              />
            ) : (
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2937F0] via-[#5B3DF1] to-[#3292EC] text-3xl font-black text-white shadow-xl">
                {initials}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-300">
                Worker applicant
              </p>

              <h3
                className="mt-2 text-2xl font-black text-slate-950 dark:text-white"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {data.firstName} {data.middleName} {data.lastName}
              </h3>

              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 dark:bg-slate-900">
                  <Phone className="h-3.5 w-3.5 text-indigo-500" />
                  {data.phone || "No phone"}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 dark:bg-slate-900">
                  <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                  {data.municipality || "No municipality"}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 dark:bg-slate-900">
                  <FileCheck2 className="h-3.5 w-3.5 text-indigo-500" />
                  {uploadedDocuments} documents
                </span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Ready for submission
            </div>
          </div>
        </section>

        <ReviewCard
          icon={UserRound}
          title="Personal Information"
          description="Identity, contact details, and residential address."
          tone="blue"
          onEdit={() => editStep(1)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Complete name">
              {data.firstName} {data.middleName} {data.lastName}
            </Info>
            <Info label="Birthday">{data.birthDate}</Info>
            <Info label="Gender">{data.gender}</Info>
            <Info label="Civil status">{data.civilStatus}</Info>
            <Info label="Religion">{data.religion}</Info>
            <Info label="Phone">{data.phone}</Info>
            <Info label="Email">{data.email}</Info>
            <Info label="Address" fullWidth>
              {data.houseNo} {data.street}, {data.barangay},{" "}
              {data.municipality}, {data.province}
            </Info>
          </div>
        </ReviewCard>

        <ReviewCard
          icon={GraduationCap}
          title="Educational Background"
          description="Academic history, licenses, training, and certificates."
          tone="amber"
          onEdit={() => editStep(2)}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Highest attainment">{data.highestEducation}</Info>

            {data.otherEducation && (
              <Info label="Other education">{data.otherEducation}</Info>
            )}

            <Info label="Elementary">{data.elementary}</Info>
            <Info label="Junior high">{data.secondary}</Info>
            <Info label="Senior high">{data.seniorHigh}</Info>
            <Info label="College / university">{data.college}</Info>
            <Info label="Course / degree">{data.course}</Info>
            <Info label="Year graduated">{data.yearGraduated}</Info>
            <Info label="TESDA">{data.tesda}</Info>
            <Info label="PRC license">{data.prc}</Info>
            <Info label="Trainings" fullWidth>
              {data.trainings}
            </Info>
          </div>
        </ReviewCard>

        <ReviewCard
          icon={BriefcaseBusiness}
          title="Work Experience"
          description="Employment history and professional responsibilities."
          tone="emerald"
          onEdit={() => editStep(3)}
        >
          {data.noWorkExperience ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-3 font-black text-emerald-800 dark:text-emerald-200">
                No work experience declared
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Company">{data.company}</Info>
              <Info label="Position">{data.position}</Info>
              <Info label="Employment status">{data.employmentStatus}</Info>
              <Info label="Start date">{data.startDate}</Info>
              <Info label="End date">{data.endDate}</Info>
              <Info label="Description" fullWidth>
                {data.description}
              </Info>
            </div>
          )}
        </ReviewCard>

        <ReviewCard
          icon={Wrench}
          title="Skills & Certifications"
          description="Selected professional services and technical skills."
          tone="violet"
          onEdit={() => editStep(4)}
        >
          {data.skills.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {data.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No skills selected.
            </p>
          )}
        </ReviewCard>

        <ReviewCard
          icon={FileText}
          title="Uploaded Documents"
          description="Verification files and educational supporting documents."
          tone="indigo"
          onEdit={() => editStep(5)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <DocumentPreview
              title="Valid ID"
              file={data.validId}
              onView={(file) => openDocument("Valid ID", file)}
            />

            <DocumentPreview
              title="Resume"
              file={data.resume}
              onView={(file) => openDocument("Resume", file)}
            />

            <DocumentPreview
              title="TESDA Certificate"
              file={data.tesdaCertificate}
              onView={(file) => openDocument("TESDA Certificate", file)}
            />

            <DocumentPreview
              title="Barangay Clearance"
              file={data.barangayClearance}
              onView={(file) => openDocument("Barangay Clearance", file)}
            />

            <DocumentPreview
              title="Police Clearance"
              file={data.policeClearance}
              onView={(file) => openDocument("Police Clearance", file)}
            />

            <DocumentPreview
              title="NBI Clearance"
              file={data.nbiClearance}
              onView={(file) => openDocument("NBI Clearance", file)}
            />

            {data.juniorHighDiploma && (
              <DocumentPreview
                title="Junior High Diploma"
                file={data.juniorHighDiploma}
                onView={(file) => openDocument("Junior High Diploma", file)}
              />
            )}

            {data.seniorHighDiploma && (
              <DocumentPreview
                title="Senior High Diploma"
                file={data.seniorHighDiploma}
                onView={(file) => openDocument("Senior High Diploma", file)}
              />
            )}

            {data.collegeDiploma && (
              <DocumentPreview
                title="College Diploma"
                file={data.collegeDiploma}
                onView={(file) => openDocument("College Diploma", file)}
              />
            )}

            {data.mastersDiploma && (
              <DocumentPreview
                title="Master's Diploma"
                file={data.mastersDiploma}
                onView={(file) => openDocument("Master's Diploma", file)}
              />
            )}

            {data.doctorateDiploma && (
              <DocumentPreview
                title="Doctorate Diploma"
                file={data.doctorateDiploma}
                onView={(file) => openDocument("Doctorate Diploma", file)}
              />
            )}
          </div>
        </ReviewCard>

        <section className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h3
                className="font-black text-emerald-800 dark:text-emerald-200"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Final submission reminder
              </h3>

              <p className="mt-2 text-sm leading-6 text-emerald-700/90 dark:text-emerald-300/90">
                Confirm that all information is accurate and all uploaded
                documents are clear and valid before submitting your worker
                application.
              </p>
            </div>
          </div>
        </section>
      </div>

      <DocumentModal
        open={selectedFile !== null}
        title={selectedTitle}
        file={selectedFile}
        onClose={() => {
          setSelectedFile(null);
          setSelectedTitle("");
        }}
      />
    </div>
  );
}