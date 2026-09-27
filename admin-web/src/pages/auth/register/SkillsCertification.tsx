import { useMemo, useState } from "react";
import {
  Award,
  BadgeCheck,
  Check,
  CheckCircle2,
  Hammer,
  Plus,
  Sparkles,
} from "lucide-react";
import { useRegisterStore } from "../../../store/registerStore";

const skills = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "Mason",
  "Welder",
  "Mechanic",
  "Driver",
  "Cook",
  "Gardener",
  "Tailor",
  "Housekeeper",
  "Aircon Technician",
  "Computer Technician",
  "Caregiver",
];

const OTHER_SKILL = "Others";

export default function SkillsCertification() {
  const { data, updateData, errors, clearError } = useRegisterStore();

  const [otherSkillInput, setOtherSkillInput] = useState("");

  /*
   * Detect a custom skill that was previously saved.
   * This allows the custom skill to remain visible
   * when the user goes back to this step.
   */
  const customSkill = useMemo(() => {
    return data.skills.find(
      (skill) =>
        !skills.includes(skill) &&
        skill !== OTHER_SKILL,
    );
  }, [data.skills]);

  const othersSelected =
    data.skills.includes(OTHER_SKILL) ||
    Boolean(customSkill);

  function toggleSkill(skill: string) {
    if (data.skills.includes(skill)) {
      updateData({
        skills: data.skills.filter((item) => item !== skill),
      });
    } else {
      updateData({
        skills: [...data.skills, skill],
      });
    }

    clearError("skills");
  }

  function toggleOthers() {
    if (othersSelected) {
      updateData({
        skills: data.skills.filter(
          (skill) =>
            skill !== OTHER_SKILL &&
            skill !== customSkill,
        ),
      });

      setOtherSkillInput("");
    } else {
      updateData({
        skills: [...data.skills, OTHER_SKILL],
      });
    }

    clearError("skills");
  }

  function handleOtherSkillChange(value: string) {
    setOtherSkillInput(value);

    const cleanedValue = value.trim();

    /*
     * Remove the temporary "Others" marker
     * and replace any previous custom skill.
     */
    const filteredSkills = data.skills.filter(
      (skill) =>
        skill !== OTHER_SKILL &&
        skill !== customSkill,
    );

    if (cleanedValue) {
      updateData({
        skills: [...filteredSkills, cleanedValue],
      });
    } else {
      updateData({
        skills: [...filteredSkills, OTHER_SKILL],
      });
    }

    clearError("skills");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">

      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-6 dark:border-slate-700">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Hammer className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />

              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Step 4
              </span>
            </div>

            <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Skills & Certifications
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Select the skills and services that you can
              professionally perform.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">

        {/* Selected count */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Professional Skills
            </h3>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              You may select one or more skills.
            </p>
          </div>

          <div className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Award className="h-4 w-4 text-indigo-500" />
            {data.skills.length} selected
          </div>
        </div>

        {/* Skills list */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => {
            const selected = data.skills.includes(skill);

            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`flex min-h-[62px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  selected
                    ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10"
                    : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800"
                }`}
              >
                {/* Checkbox */}
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    selected
                      ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500"
                      : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                  }`}
                >
                  {selected && (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  )}
                </span>

                <span
                  className={`text-sm font-semibold ${
                    selected
                      ? "text-indigo-700 dark:text-indigo-300"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {skill}
                </span>
              </button>
            );
          })}

          {/* Others */}
          <button
            type="button"
            onClick={toggleOthers}
            className={`flex min-h-[62px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
              othersSelected
                ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10"
                : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                othersSelected
                  ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500"
                  : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
              }`}
            >
              {othersSelected && (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              )}
            </span>

            <span
              className={`text-sm font-semibold ${
                othersSelected
                  ? "text-indigo-700 dark:text-indigo-300"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              Others
            </span>
          </button>
        </div>

        {/* Other skill input */}
        {othersSelected && (
          <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400">
                <Plus className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <label
                  htmlFor="other-skill"
                  className="text-sm font-bold text-slate-800 dark:text-white"
                >
                  Specify Other Skill
                </label>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Enter the professional skill if it is not
                  included in the choices above.
                </p>

                <input
                  id="other-skill"
                  type="text"
                  value={otherSkillInput || customSkill || ""}
                  onChange={(event) =>
                    handleOtherSkillChange(event.target.value)
                  }
                  placeholder="e.g. Tile Installer"
                  className="mt-3 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {errors.skills && (
          <p className="mt-4 text-sm font-semibold text-rose-500">
            {errors.skills}
          </p>
        )}

        {/* Selected skills */}
        <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Selected Skills
            </h3>
          </div>

          {data.skills.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <Hammer className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />

              <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                No skills selected
              </p>

              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Select the professional skills that you can perform.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}