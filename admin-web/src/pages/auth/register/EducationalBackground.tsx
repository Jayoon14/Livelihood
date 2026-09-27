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
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { useEffect, useMemo, useRef, useState } from "react";

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

/*
|--------------------------------------------------------------------------
| CABUYAO SCHOOLS
|--------------------------------------------------------------------------
| These are suggested schools shown in the dropdown.
| The user can still type a school that is not included here.
|--------------------------------------------------------------------------
*/

const ELEMENTARY_SCHOOLS = [
  "Baclaran Elementary School",
  "Banay-Banay Elementary School",
  "Banlic Elementary School",
  "Bigaa Elementary School",
  "Butong Elementary School",
  "Cabuyao Central School",
  "Casile Elementary School",
  "Diezmo Elementary School",
  "Guinting Elementary School",
  "Gulod Elementary School",
  "Mamatid Elementary School",
  "Marinig South Elementary School",
  "Niugan Elementary School",
  "North Marinig Elementary School",
  "Pittland Elementary School",
  "Pulo Elementary School",
  "Sala Elementary School",
  "San Isidro Elementary School",
  "Southville I Elementary School",

  // Private / learning schools commonly listed in Cabuyao
  "Arise & Shine Academy",
  "Angelic Learning Center",
  "Augustinian School of Cabuyao",
  "Divine Mercy School of Cabuyao",
  "Institute for Foundational Learning, Inc.",
  "Jesus Covenanted Christian Academy",
  "St. John Bosco Academy of Cabuyao",
  "Holy Redeemer School of Cabuyao",
  "Infant Jesus Montessori Center",
  "Jeremiah Montessori School",
  "Lakeside Integrated School of Cabuyao",
  "Agape Young Achievers School",
  "Christ the King School of Cabuyao",
];

const JUNIOR_HIGH_SCHOOLS = [
  "Bigaa Integrated National High School",
  "Cabuyao Integrated National High School",
  "Casile Integrated National High School",
  "Gulod National High School",
  "Mamatid National High School",
  "Marinig National High School",
  "Pulo National High School",
  "Pulo National High School - Diezmo Extension",
  "Southville I Integrated National High School",
  "Pittland Integrated School",
  "Arise & Shine Academy",
  "Augustinian School of Cabuyao",
  "Christ the King School of Cabuyao",
  "Colegio de Santo Niño de Cabuyao",
  "Holy Redeemer School of Cabuyao",
  "Liceo de Cabuyao",
  "Liceo de Mamatid",
  "Maranatha Christian Academy",
  "Our Lady of Assumption College",
  "Regina Angelorum School",
  "Sacred Heart of Jesus and Mary School",
  "St. Isidore Academy of Cabuyao",
  "St. Matthew Montessori and Science High School",
  "St. Vincent College of Cabuyao",
];

const SENIOR_HIGH_SCHOOLS = [
  "Mamatid Senior High School",
  "Pulo Senior High School",
  "Bigaa Integrated National High School",
  "Cabuyao Integrated National High School",
  "Casile Integrated National High School",
  "Gulod National High School",
  "Marinig National High School",
  "Southville I Integrated National High School",
  "Pittland Integrated School",
  "Malayan Colleges Laguna",
  "Agustinian School of Cabuyao",
  "Angels in Heaven School, Inc.",
  "Christ the King School of Cabuyao",
  "Colegio de Santo Niño de Cabuyao",
  "Hosanna Technological School of Arts and Sciences",
  "Infant Jesus Montessori Center",
  "Lady of Rose Academy",
  "Liceo de Cabuyao",
  "Liceo de Mamatid",
  "Maranatha Christian Academy of Cabuyao",
];

const HIGHER_EDUCATION_SCHOOLS = [
  "Pamantasan ng Cabuyao",
  "University of Cabuyao",
  "Malayan Colleges Laguna",
  "Mapúa Malayan Colleges Laguna",
  "Colegio de Santo Niño de Cabuyao",
  "St. Vincent College of Cabuyao",
  "Our Lady of Assumption College - Cabuyao Campus",
  "Southeast Asia Institute of Science, Arts and Technology - Cabuyao",
  "Asian Institute of Technology, Sciences and the Arts",
  "St. Ignatius Technical Institute of Business and Arts - Cabuyao",
  "CITI Global College",
  "Cabuyao Institute of Technology",
  "Westbridge Institute of Technology",
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

        {valid && (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
        )}
      </div>

      <FieldMessage error={error} />
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SEARCHABLE SCHOOL DROPDOWN
|--------------------------------------------------------------------------
*/

type SchoolComboboxProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  schools: string[];
  placeholder?: string;
  icon?: typeof School;
};

function SchoolCombobox({
  id,
  label,
  value,
  onChange,
  error,
  schools,
  placeholder = "Search or enter school name",
  icon: Icon = School,
}: SchoolComboboxProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const filteredSchools = useMemo(() => {
    const search = value.trim().toLowerCase();

    if (!search) {
      return schools;
    }

    return schools.filter((school) =>
      school.toLowerCase().includes(search),
    );
  }, [schools, value]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const valid = value.trim().length > 0 && !error;

  return (
    <div ref={wrapperRef} className="relative">
      <label htmlFor={id} className={labelBase}>
        {label}
      </label>

      <div
        className={`relative flex h-12 items-center rounded-xl border bg-white px-3 transition focus-within:ring-4 dark:bg-slate-900 ${
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
          type="text"
          value={value}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(true);
            }}
            className="mr-1 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label={`Clear ${label}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          aria-label={`Open ${label} options`}
        >
          <ChevronDown
            className={`h-4.5 w-4.5 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <Search className="h-4 w-4 text-slate-400" />

            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {value.trim()
                ? `${filteredSchools.length} matching school${
                    filteredSchools.length === 1 ? "" : "s"
                  }`
                : "Schools in Cabuyao"}
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredSchools.length > 0 ? (
              filteredSchools.map((school) => {
                const selected =
                  school.toLowerCase() === value.trim().toLowerCase();

                return (
                  <button
                    key={school}
                    type="button"
                    onClick={() => {
                      onChange(school);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition ${
                      selected
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <School className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                    <span className="flex-1">{school}</span>

                    {selected && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-5">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    No matching school found
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    You can still type and use your school name manually.
                  </p>
                </div>
              </div>
            )}
          </div>

          {value.trim() && !schools.some(
            (school) =>
              school.toLowerCase() === value.trim().toLowerCase(),
          ) && (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Custom school name:
              </p>

              <p className="mt-1 truncate text-sm font-bold text-indigo-600 dark:text-indigo-300">
                {value}
              </p>

              <p className="mt-1 text-[11px] text-slate-400">
                You may continue with this manually entered school.
              </p>
            </div>
          )}
        </div>
      )}

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

  /*
  |--------------------------------------------------------------------------
  | CLEAR SCHOOL FIELDS WHEN EDUCATION LEVEL CHANGES
  |--------------------------------------------------------------------------
  */

  const handleEducationChange = (value: string) => {
    updateData({
      highestEducation: value,
    });

    clearError("highestEducation");

    /*
     * We intentionally don't automatically delete previous school values.
     * This prevents accidental data loss when the user changes the level.
     */
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
                onChange={(event) =>
                  handleEducationChange(event.target.value)
                }
                className={`${inputBase} appearance-none pr-11 ${
                  errors.highestEducation
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                    : education
                      ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/10 dark:border-emerald-500/40"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10 dark:border-slate-700"
                }`}
              >
                <option value="">
                  Select highest educational attainment
                </option>

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
                Select a school from Cabuyao or type your school manually.
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            {/* OTHER */}
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

            {/* ELEMENTARY */}
            {[
              "Elementary",
              "Junior High",
              "Senior High",
              "College",
              "Master",
              "Doctorate",
            ].includes(education) && (
              <SchoolCombobox
                id="elementary-school"
                label="Elementary school"
                value={data.elementary}
                error={errors.elementary}
                schools={ELEMENTARY_SCHOOLS}
                placeholder="Search or enter elementary school"
                icon={School}
                onChange={(value) => {
                  updateData({
                    elementary: value,
                  });

                  clearError("elementary");
                }}
              />
            )}

            {/* JUNIOR HIGH */}
            {[
              "Junior High",
              "Senior High",
              "College",
              "Master",
              "Doctorate",
            ].includes(education) && (
              <SchoolCombobox
                id="junior-high-school"
                label="Junior high school"
                value={data.secondary}
                error={errors.secondary}
                schools={JUNIOR_HIGH_SCHOOLS}
                placeholder="Search or enter junior high school"
                icon={School}
                onChange={(value) => {
                  updateData({
                    secondary: value,
                  });

                  clearError("secondary");
                }}
              />
            )}

            {/* SENIOR HIGH */}
            {["Senior High", "College", "Master", "Doctorate"].includes(
              education,
            ) && (
              <SchoolCombobox
                id="senior-high-school"
                label="Senior high school"
                value={data.seniorHigh}
                error={errors.seniorHigh}
                schools={SENIOR_HIGH_SCHOOLS}
                placeholder="Search or enter senior high school"
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
                {/* COLLEGE / UNIVERSITY DROPDOWN */}
                <SchoolCombobox
                  id="college-university"
                  label={
                    education === "College"
                      ? "College / university"
                      : "University"
                  }
                  value={data.college}
                  error={errors.college}
                  schools={HIGHER_EDUCATION_SCHOOLS}
                  placeholder="Search or enter college / university"
                  icon={Building2}
                  onChange={(value) => {
                    updateData({
                      college: value,
                    });

                    clearError("college");
                  }}
                />

                {/* COURSE / DEGREE */}
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

                {/* YEAR GRADUATED */}
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

                {/* PRC */}
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