import {
  CheckCircle2,
  FileBadge2,
  FileCheck2,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  type ChangeEvent,
} from "react";

import { useRegisterStore } from "../../../store/registerStore";

type UploadField =
  | "validId"
  | "resume"
  | "tesdaCertificate"
  | "barangayClearance"
  | "policeClearance"
  | "nbiClearance"
  | "juniorHighDiploma"
  | "seniorHighDiploma"
  | "collegeDiploma"
  | "mastersDiploma"
  | "doctorateDiploma";

interface UploadCardProps {
  title: string;
  description: string;
  field: UploadField;
  optional?: boolean;
}

const REQUIRED_DOCUMENTS: UploadCardProps[] = [
  {
    title: "Valid ID",
    description: "Upload one clear government-issued identification document.",
    field: "validId",
  },
  {
    title: "Resume",
    description: "Provide your latest resume in PDF or image format.",
    field: "resume",
  },
  {
    title: "TESDA Certificate",
    description: "Upload your TESDA certificate when available.",
    field: "tesdaCertificate",
    optional: true,
  },
  {
    title: "Barangay Clearance",
    description: "Submit a recent and readable barangay clearance.",
    field: "barangayClearance",
  },
  {
    title: "Police Clearance",
    description: "Upload a valid and current police clearance.",
    field: "policeClearance",
  },
  {
    title: "NBI Clearance",
    description: "Submit your latest NBI clearance document.",
    field: "nbiClearance",
  },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function UploadCard({
  title,
  description,
  field,
  optional = false,
}: UploadCardProps) {
  const { data, updateData, errors, clearError } = useRegisterStore();

  const file = data[field];
  const error = errors[field];

  const previewUrl = useMemo(() => {
    if (!file || !file.type.startsWith("image/")) return "";

    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const selectedFile = event.target.files?.[0] ?? null;

    updateData({
      [field]: selectedFile,
    });

    clearError(field);
  }

  function removeFile(): void {
    updateData({
      [field]: null,
    });

    clearError(field);
  }

  const uploaded = Boolean(file) && !error;

  return (
    <article
      className={`group rounded-[1.5rem] border p-5 transition-all duration-200 sm:p-6 ${
        error
          ? "border-rose-300 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/10"
          : uploaded
            ? "border-emerald-200 bg-emerald-50/55 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10"
            : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-[0_14px_35px_rgba(79,70,229,0.10)] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500/40"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              uploaded
                ? "bg-emerald-500 text-white"
                : error
                  ? "bg-rose-500/10 text-rose-500"
                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
            }`}
          >
            {uploaded ? (
              <FileCheck2 className="h-5 w-5" />
            ) : (
              <UploadCloud className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className="font-black text-slate-950 dark:text-white"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {title}
              </h3>

              {optional && (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Optional
                </span>
              )}
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>

        {uploaded && (
          <CheckCircle2
            className="h-5 w-5 shrink-0 text-emerald-500"
            aria-label="Document uploaded"
          />
        )}
      </div>

      {!file ? (
        <div
          className={`mt-5 rounded-2xl border border-dashed p-5 text-center transition ${
            error
              ? "border-rose-300 bg-white/70 dark:border-rose-500/30 dark:bg-slate-900/40"
              : "border-slate-300 bg-slate-50/75 group-hover:border-indigo-300 group-hover:bg-indigo-50/40 dark:border-slate-600 dark:bg-slate-800/50"
          }`}
        >
          <label
            htmlFor={`upload-${field}`}
            className="inline-flex cursor-pointer flex-col items-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-indigo-300 dark:ring-slate-700">
              <UploadCloud className="h-6 w-6" />
            </span>

            <span className="mt-3 text-sm font-black text-slate-800 dark:text-slate-100">
              Choose file
            </span>

            <span className="mt-1 text-xs leading-5 text-slate-400">
              JPG, PNG, or PDF
            </span>
          </label>

          <input
            id={`upload-${field}`}
            type="file"
            accept="image/*,.pdf,application/pdf"
            onChange={handleChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {file.type.startsWith("image/") && previewUrl ? (
            <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={previewUrl}
                alt={`${title} preview`}
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent px-4 pb-4 pt-10">
                <p className="truncate text-sm font-bold text-white">
                  {file.name}
                </p>

                <p className="mt-1 text-xs text-white/70">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                <FileText className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                  {file.name}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  PDF document · {formatFileSize(file.size)}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-slate-200 p-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <label
              htmlFor={`replace-${field}`}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700"
            >
              <UploadCloud className="h-4 w-4" />
              Replace file
            </label>

            <input
              id={`replace-${field}`}
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={handleChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={removeFile}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-rose-500 transition hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs font-semibold text-rose-500">
          {error}
        </p>
      )}
    </article>
  );
}

export default function Documents() {
  const { data } = useRegisterStore();

  const educationDocuments: UploadCardProps[] = [];

  if (
    ["Junior High", "Senior High", "College", "Master", "Doctorate"].includes(
      data.highestEducation,
    )
  ) {
    educationDocuments.push({
      title: "Junior High Diploma",
      description: "Optional supporting document for your educational record.",
      field: "juniorHighDiploma",
      optional: true,
    });
  }

  if (
    ["Senior High", "College", "Master", "Doctorate"].includes(
      data.highestEducation,
    )
  ) {
    educationDocuments.push({
      title: "Senior High Diploma",
      description: "Optional supporting document for your educational record.",
      field: "seniorHighDiploma",
      optional: true,
    });
  }

  if (["College", "Master", "Doctorate"].includes(data.highestEducation)) {
    educationDocuments.push({
      title: "College Diploma",
      description: "Optional college or university diploma.",
      field: "collegeDiploma",
      optional: true,
    });
  }

  if (data.highestEducation === "Master") {
    educationDocuments.push({
      title: "Master's Diploma",
      description: "Optional proof of completed master's degree.",
      field: "mastersDiploma",
      optional: true,
    });
  }

  if (data.highestEducation === "Doctorate") {
    educationDocuments.push({
      title: "Doctorate Diploma",
      description: "Optional proof of completed doctorate degree.",
      field: "doctorateDiploma",
      optional: true,
    });
  }

  const requiredUploadedCount = REQUIRED_DOCUMENTS.filter(
    ({ field, optional }) => !optional && Boolean(data[field]),
  ).length;

  const requiredCount = REQUIRED_DOCUMENTS.filter(
    ({ optional }) => !optional,
  ).length;

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
      <div className="relative z-10 border-b border-slate-200 bg-[linear-gradient(135deg,#f8faff_0%,#eef3ff_100%)] px-5 py-6 dark:border-slate-700 dark:bg-[linear-gradient(135deg,#111827_0%,#172033_100%)] sm:px-7 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-indigo-600 shadow-sm dark:border-indigo-500/20 dark:bg-slate-800/80 dark:text-indigo-300">
              <Sparkles className="h-4 w-4" />
              Step 5 · Documents
            </div>

            <h2
              className="mt-3 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Upload Documents
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Submit clear and readable files for account verification. Accepted
              file types are JPG, PNG, and PDF.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            <ShieldCheck className="h-4 w-4" />
            {requiredUploadedCount}/{requiredCount} required uploaded
          </div>
        </div>
      </div>

      <div className="relative z-10 grid gap-6 p-4 sm:p-6 lg:p-8">
        {/* REQUIRED DOCUMENTS */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
              <FileBadge2 className="h-5 w-5" />
            </div>

            <div>
              <h3
                className="text-lg font-black text-slate-950 dark:text-white"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Verification documents
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                These files support your identity and worker-account review.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {REQUIRED_DOCUMENTS.map((document) => (
              <UploadCard key={document.field} {...document} />
            ))}
          </div>
        </section>

        {/* EDUCATIONAL DOCUMENTS */}
        <section className="rounded-[1.5rem] border border-indigo-100 bg-[linear-gradient(135deg,#eef2ff_0%,#f8faff_100%)] p-5 dark:border-indigo-500/20 dark:bg-[linear-gradient(135deg,rgba(49,46,129,.17),rgba(15,23,42,.9))] sm:p-6">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <GraduationCap className="h-5 w-5" />
            </div>

            <div>
              <h3
                className="text-lg font-black text-slate-950 dark:text-white"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Educational documents
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Optional supporting files based on your selected educational
                attainment.
              </p>
            </div>
          </div>

          {educationDocuments.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {educationDocuments.map((document) => (
                <UploadCard key={document.field} {...document} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/75 p-8 text-center dark:border-slate-600 dark:bg-slate-900/50">
              <GraduationCap className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />

              <p className="mt-3 font-black text-slate-600 dark:text-slate-300">
                No educational document required
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                Additional diploma fields will appear when they apply to your
                selected education level.
              </p>
            </div>
          )}
        </section>

        {/* GUIDELINES */}
        <section className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-300">
              <ImageIcon className="h-5 w-5" />
            </div>

            <div>
              <h3
                className="font-black text-emerald-800 dark:text-emerald-200"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Upload guidelines
              </h3>

              <div className="mt-3 grid gap-2 text-xs leading-5 text-emerald-700/90 dark:text-emerald-300/90 sm:grid-cols-2">
                {[
                  "Use clear, readable, and complete document images.",
                  "Avoid cropped corners, glare, blur, or heavy shadows.",
                  "Upload the latest valid clearance documents.",
                  "Check the filename and preview before continuing.",
                ].map((guide) => (
                  <p key={guide} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {guide}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}