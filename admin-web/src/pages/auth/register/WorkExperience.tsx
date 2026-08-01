import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";

import { useRegisterStore } from "../../../store/registerStore";

const inputBase =
  "h-12 w-full rounded-xl border bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";

const labelBase =
  "mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200";

type InputProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  icon?: typeof Building2;
};

type SelectProps = {
  id: string;
  label: string;
  value: string;
  options: string[];
  error?: string;
  onChange: (value: string) => void;
};

function FieldError({ error }: { error?: string }) {
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
  error,
  onChange,
  type = "text",
  placeholder,
  icon: Icon = Building2,
}: InputProps) {
  const valid = value.trim().length > 0 && !error;

  return (
    <div>
      <label htmlFor={id} className={labelBase}>
        {label}
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

      <FieldError error={error} />
    </div>
  );
}

function Select({
  id,
  label,
  value,
  options,
  error,
  onChange,
}: SelectProps) {
  const valid = value.trim().length > 0 && !error;

  return (
    <div>
      <label htmlFor={id} className={labelBase}>
        {label}
      </label>

      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputBase} appearance-none pr-11 ${
            error
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
              : valid
                ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/10 dark:border-emerald-500/40"
                : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 dark:border-slate-700"
          }`}
        >
          <option value="">Select employment status</option>

          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
      </div>

      <FieldError error={error} />
    </div>
  );
}

export default function WorkExperience() {
  const { data, updateData, errors, clearError } = useRegisterStore();

  const completedFields = [
    data.company,
    data.position,
    data.employmentStatus,
    data.startDate,
    data.endDate,
    data.description,
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
              Step 3 · Experience
            </div>

            <h2
              className="mt-3 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Work Experience
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Add your employment history so customers and administrators can
              understand your professional background.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            <BriefcaseBusiness className="h-4 w-4" />
            {data.noWorkExperience
              ? "No prior experience"
              : `${completedFields} details added`}
          </div>
        </div>
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        {/* NO EXPERIENCE OPTION */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                <UserRoundCheck className="h-5 w-5" />
              </div>

              <div>
                <h3
                  className="text-lg font-black text-slate-950 dark:text-white"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Employment status
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Select this option if you are applying without previous formal
                  work experience.
                </p>
              </div>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={data.noWorkExperience}
                onChange={(event) =>
                  updateData({
                    noWorkExperience: event.target.checked,
                  })
                }
                className="peer sr-only"
              />

              <span className="relative h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-gradient-to-r peer-checked:from-[#2937F0] peer-checked:via-[#5B3DF1] peer-checked:to-[#3292EC] dark:bg-slate-700">
                <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </span>

              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                I don't have work experience
              </span>
            </label>
          </div>
        </section>

        {data.noWorkExperience ? (
          <section className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-6 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />

            <h3
              className="mt-4 text-lg font-black text-emerald-800 dark:text-emerald-200"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              No work experience selected
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-emerald-700/80 dark:text-emerald-300/80">
              You can continue to the next step. Your skills, certifications,
              and uploaded documents can still help support your application.
            </p>
          </section>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* EMPLOYER DETAILS */}
            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                  <Building2 className="h-5 w-5" />
                </div>

                <div>
                  <h3
                    className="text-lg font-black text-slate-950 dark:text-white"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    Employer details
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Enter the company, role, and type of employment.
                  </p>
                </div>
              </div>

              <div className="grid gap-5">
                <Input
                  id="work-company"
                  label="Company"
                  value={data.company}
                  error={errors.company}
                  placeholder="Enter company or employer"
                  icon={Building2}
                  onChange={(value) => {
                    updateData({
                      company: value,
                    });

                    clearError("company");
                  }}
                />

                <Input
                  id="work-position"
                  label="Position"
                  value={data.position}
                  error={errors.position}
                  placeholder="Enter your job title"
                  icon={BriefcaseBusiness}
                  onChange={(value) => {
                    updateData({
                      position: value,
                    });

                    clearError("position");
                  }}
                />

                <Select
                  id="employment-status"
                  label="Employment status"
                  value={data.employmentStatus}
                  error={errors.employmentStatus}
                  options={[
                    "Full Time",
                    "Part Time",
                    "Contract",
                    "Self Employed",
                  ]}
                  onChange={(value) => {
                    updateData({
                      employmentStatus: value,
                    });

                    clearError("employmentStatus");
                  }}
                />
              </div>
            </section>

            {/* EMPLOYMENT PERIOD */}
            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                  <CalendarDays className="h-5 w-5" />
                </div>

                <div>
                  <h3
                    className="text-lg font-black text-slate-950 dark:text-white"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    Employment period
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Add the start and end dates of this work experience.
                  </p>
                </div>
              </div>

              <div className="grid gap-5">
                <Input
                  id="work-start-date"
                  type="date"
                  label="Start date"
                  value={data.startDate}
                  error={errors.startDate}
                  icon={CalendarDays}
                  onChange={(value) => {
                    updateData({
                      startDate: value,
                    });

                    clearError("startDate");
                  }}
                />

                <Input
                  id="work-end-date"
                  type="date"
                  label="End date"
                  value={data.endDate}
                  error={errors.endDate}
                  icon={Clock3}
                  onChange={(value) => {
                    updateData({
                      endDate: value,
                    });

                    clearError("endDate");
                  }}
                />

                <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-xs leading-5 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  Make sure the end date is not earlier than the start date.
                </div>
              </div>
            </section>

            {/* JOB DESCRIPTION */}
            <section className="rounded-[1.5rem] border border-indigo-100 bg-[linear-gradient(135deg,#eef2ff_0%,#f8faff_100%)] p-5 dark:border-indigo-500/20 dark:bg-[linear-gradient(135deg,rgba(49,46,129,.17),rgba(15,23,42,.9))] sm:p-6 lg:col-span-2">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <ClipboardList className="h-5 w-5" />
                </div>

                <div>
                  <h3
                    className="text-lg font-black text-slate-950 dark:text-white"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    Job description
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Describe your duties, responsibilities, tools used, and
                    accomplishments.
                  </p>
                </div>
              </div>

              <textarea
                id="job-description"
                rows={6}
                value={data.description}
                onChange={(event) => {
                  updateData({
                    description: event.target.value,
                  });

                  clearError("description");
                }}
                placeholder="Example: Installed and repaired electrical fixtures, performed maintenance, and coordinated with customers..."
                className={`min-h-40 w-full resize-none rounded-xl border bg-white p-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 ${
                  errors.description
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                    : data.description.trim()
                      ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/10 dark:border-emerald-500/40"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 dark:border-slate-700"
                }`}
              />

              <div className="mt-2 flex items-center justify-between gap-3">
                <FieldError error={errors.description} />

                <p className="ml-auto text-xs text-slate-400">
                  {data.description.length} characters
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}