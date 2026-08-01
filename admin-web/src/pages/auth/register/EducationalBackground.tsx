import {
  Award,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  FileBadge2,
  GraduationCap,
  Landmark,
  School,
  Sparkles,
} from "lucide-react";

import { useRegisterStore } from "../../../store/registerStore";

const EDUCATION_OPTIONS = [
  { value: "Elementary", label: "Elementary" },
  { value: "Junior High", label: "Junior High School" },
  { value: "Senior High", label: "Senior High School" },
  { value: "College", label: "College" },
  { value: "Master", label: "Master's Degree" },
  { value: "Doctorate", label: "Doctorate Degree" },
  { value: "Other", label: "Other" },
];

const inputBase =
  "h-12 w-full rounded-xl border bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";

const labelBase =
  "mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200";

type InputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  placeholder?: string;
  icon?: typeof School;
  optional?: boolean;
};

function FieldMessage({ error }: { error?: string }) {
  if (!error) return null;

  return (
    <p className="mt-1.5 text-xs font-medium text-rose-500">
      {error}
    </p>
  );
}

function Input({
  id,
  label,
  value,
  onChange,
  type = "text",
  error,
  placeholder,
  icon: Icon = School,
  optional = false,
}: InputProps) {
  const valid = value.trim().length > 0 && !error;

  return (
    <div>
      <label htmlFor={id} className={labelBase}>
        {label}
        {optional && (
          <span className="ml-1 font-medium text-slate-400">
            (optional)
          </span>
        )}
      </label>

      <div
        className={`flex h-12 items-center rounded-xl border bg-white px-3 transition focus-within:ring-4 dark:bg-slate-900 ${
          error
            ? "border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-500/10"
            : valid
              ? "border-emerald-300 focus-within:border-emerald-500 focus-within:ring-emerald-500/10 dark:border-emerald-500/40"
              : "border-slate-200 focus-within:border-indigo-500 focus-within:ring-indigo-500/10 dark:border-slate-700"
        }`}
      >
        <Icon
          className={`h-4.5 w-4.5 shrink-0 ${
            valid ? "text-emerald-500" : "text-slate-400"
          }`}
        />

        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
        />

        {valid && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
      </div>

      <FieldMessage error={error} />
    </div>
  );
}

export default function EducationalBackground() {
  const { data, updateData, errors, clearError } = useRegisterStore();

  const education = data.highestEducation;

  const requiredFields = [
    data.highestEducation,
    data.elementary,
    data.secondary,
    data.seniorHigh,
    data.college,
    data.course,
    data.yearGraduated,
    data.prc,
  ].filter(Boolean).length;

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
              Step 2 · Education
            </div>

            <h2
              className="mt-3 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Educational Background
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Add your highest educational attainment, schools attended,
              professional licenses, and relevant training certificates.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            <GraduationCap className="h-4 w-4" />
            {requiredFields} details added
          </div>
        </div>
      </div>

      <div className="relative z-10 grid gap-6 p-4 sm:p-6 lg:grid-cols-2 lg:p-8">
        {/* HIGHEST EDUCATION */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6 lg:col-span-2">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
              <GraduationCap className="h-5 w-5" />
            </div>

            <div>
              <h3
                className="text-lg font-black text-slate-950 dark:text-white"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Highest educational attainment
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Select the highest level you completed. Additional fields will
                appear based on your selection.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="highest-education" className={labelBase}>
              Education level
            </label>

            <div className="relative">
              <select
                id="highest-education"
                value={education}
                onChange={(event) => {
                  updateData({
                    highestEducation: event.target.value,
                  });

                  clearError("highestEducation");
                }}
                className={`${inputBase} appearance-none pr-11 ${
                  errors.highestEducation
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                    : education
                      ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/10 dark:border-emerald-500/40"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 dark:border-slate-700"
                }`}
              >
                <option value="">Select highest educational attainment</option>

                {EDUCATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
            </div>

            <FieldMessage error={errors.highestEducation} />
          </div>
        </section>

        {/* SCHOOL HISTORY */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
              <School className="h-5 w-5" />
            </div>

            <div>
              <h3
                className="text-lg font-black text-slate-950 dark:text-white"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                School history
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Enter the schools you attended based on your selected level.
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            {education === "Other" && (
              <Input
                id="other-education"
                label="Please specify"
                value={data.otherEducation}
                error={errors.otherEducation}
                placeholder="Enter your education level"
                icon={BookOpenCheck}
                onChange={(value) => {
                  updateData({
                    otherEducation: value,
                  });

                  clearError("otherEducation");
                }}
              />
            )}

            {[
              "Elementary",
              "Junior High",
              "Senior High",
              "College",
              "Master",
              "Doctorate",
            ].includes(education) && (
              <Input
                id="elementary-school"
                label="Elementary school"
                value={data.elementary}
                error={errors.elementary}
                placeholder="Enter elementary school"
                icon={School}
                onChange={(value) => {
                  updateData({
                    elementary: value,
                  });

                  clearError("elementary");
                }}
              />
            )}

            {[
              "Junior High",
              "Senior High",
              "College",
              "Master",
              "Doctorate",
            ].includes(education) && (
              <Input
                id="junior-high-school"
                label="Junior high school"
                value={data.secondary}
                error={errors.secondary}
                placeholder="Enter junior high school"
                icon={School}
                onChange={(value) => {
                  updateData({
                    secondary: value,
                  });

                  clearError("secondary");
                }}
              />
            )}

            {["Senior High", "College", "Master", "Doctorate"].includes(
              education,
            ) && (
              <Input
                id="senior-high-school"
                label="Senior high school"
                value={data.seniorHigh}
                error={errors.seniorHigh}
                placeholder="Enter senior high school"
                icon={School}
                onChange={(value) => {
                  updateData({
                    seniorHigh: value,
                  });

                  clearError("seniorHigh");
                }}
              />
            )}

            {!education && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center dark:border-slate-600 dark:bg-slate-900">
                <GraduationCap className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600" />

                <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                  Select your highest education first
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  School fields will appear automatically.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* HIGHER EDUCATION */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <Landmark className="h-5 w-5" />
            </div>

            <div>
              <h3
                className="text-lg font-black text-slate-950 dark:text-white"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Higher education
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                College, degree, graduation year, and license information.
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            {["College", "Master", "Doctorate"].includes(education) ? (
              <>
                <Input
                  id="college-university"
                  label={
                    education === "College"
                      ? "College / university"
                      : "University"
                  }
                  value={data.college}
                  error={errors.college}
                  placeholder="Enter institution name"
                  icon={Building2}
                  onChange={(value) => {
                    updateData({
                      college: value,
                    });

                    clearError("college");
                  }}
                />

                <Input
                  id="course-degree"
                  label={
                    education === "Master"
                      ? "Master's degree"
                      : education === "Doctorate"
                        ? "Doctorate degree"
                        : "Course / degree"
                  }
                  value={data.course}
                  error={errors.course}
                  placeholder="Enter course or degree"
                  icon={GraduationCap}
                  onChange={(value) => {
                    updateData({
                      course: value,
                    });

                    clearError("course");
                  }}
                />

                <Input
                  id="year-graduated"
                  label="Year graduated"
                  type="number"
                  value={data.yearGraduated}
                  error={errors.yearGraduated}
                  placeholder="Example: 2024"
                  icon={BookOpenCheck}
                  onChange={(value) => {
                    updateData({
                      yearGraduated: value,
                    });

                    clearError("yearGraduated");
                  }}
                />

                {["Master", "Doctorate"].includes(education) && (
                  <Input
                    id="prc-license"
                    label="PRC license number"
                    value={data.prc}
                    error={errors.prc}
                    placeholder="Enter PRC license number"
                    icon={FileBadge2}
                    onChange={(value) => {
                      updateData({
                        prc: value,
                      });

                      clearError("prc");
                    }}
                  />
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center dark:border-slate-600 dark:bg-slate-900">
                <Landmark className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600" />

                <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                  Higher education details
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  This section applies to college, master’s, and doctorate
                  levels.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CERTIFICATES */}
        <section className="rounded-[1.5rem] border border-indigo-100 bg-[linear-gradient(135deg,#eef2ff_0%,#f8faff_100%)] p-5 dark:border-indigo-500/20 dark:bg-[linear-gradient(135deg,rgba(49,46,129,.17),rgba(15,23,42,.9))] sm:p-6 lg:col-span-2">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <Award className="h-5 w-5" />
            </div>

            <div>
              <h3
                className="text-lg font-black text-slate-950 dark:text-white"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Certificates and training
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Add any TESDA certification, seminars, or training relevant to
                your skills.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Input
              id="tesda-certificate"
              label="TESDA certificate"
              value={data.tesda}
              placeholder="Certificate title or number"
              icon={FileBadge2}
              optional
              onChange={(value) =>
                updateData({
                  tesda: value,
                })
              }
            />

            <div className="md:row-span-2">
              <label htmlFor="training-seminars" className={labelBase}>
                Trainings / seminars
                <span className="ml-1 font-medium text-slate-400">
                  (optional)
                </span>
              </label>

              <textarea
                id="training-seminars"
                rows={6}
                value={data.trainings}
                onChange={(event) =>
                  updateData({
                    trainings: event.target.value,
                  })
                }
                placeholder="List relevant trainings, seminars, workshops, and completion dates."
                className="min-h-36 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
              />

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Separate multiple entries using a new line.
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-white/70 p-4 dark:border-indigo-500/15 dark:bg-slate-900/50">
              <p className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                <CheckCircle2 className="h-4 w-4" />
                Professional profile tip
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Add credentials related to your offered services. Verified
                training can help strengthen your worker profile.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}