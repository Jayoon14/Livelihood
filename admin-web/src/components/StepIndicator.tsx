import {
  BriefcaseBusiness,
  Check,
  FileText,
  GraduationCap,
  UserRound,
  Wrench,
} from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
}

const STEPS = [
  {
    number: 1,
    shortLabel: "Personal",
    title: "Personal Information",
    description: "Basic profile details",
    icon: UserRound,
  },
  {
    number: 2,
    shortLabel: "Education",
    title: "Educational Background",
    description: "Academic information",
    icon: GraduationCap,
  },
  {
    number: 3,
    shortLabel: "Work",
    title: "Work Experience",
    description: "Employment history",
    icon: BriefcaseBusiness,
  },
  {
    number: 4,
    shortLabel: "Skills",
    title: "Skills & Certifications",
    description: "Professional expertise",
    icon: Wrench,
  },
  {
    number: 5,
    shortLabel: "Documents",
    title: "Upload Documents",
    description: "Required credentials",
    icon: FileText,
  },
  {
    number: 6,
    shortLabel: "Review",
    title: "Confirmation",
    description: "Review and submit",
    icon: Check,
  },
];

export default function StepIndicator({
  currentStep,
  completedSteps,
}: StepIndicatorProps) {
  const completedCount = STEPS.filter((item) =>
    completedSteps.includes(item.number),
  ).length;

  const progressPercent =
    STEPS.length > 1
      ? Math.max(
          0,
          Math.min(100, ((currentStep - 1) / (STEPS.length - 1)) * 100),
        )
      : 0;

  return (
    <section
      aria-label="Worker registration progress"
      className="relative overflow-hidden rounded-[1.75rem] border border-indigo-100 bg-[linear-gradient(135deg,#ffffff_0%,#f7f8ff_52%,#eef6ff_100%)] shadow-[0_18px_55px_rgba(79,70,229,0.10)] dark:border-slate-700 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111827_55%,#172033_100%)]"
    >
      {/* Static background details */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.045] dark:opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#2937f0 1px,transparent 1px),linear-gradient(90deg,#2937f0 1px,transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-300/20 blur-3xl dark:bg-blue-700/10"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-700/10"
      />

      <div className="relative z-10 border-b border-indigo-100/80 px-5 py-5 dark:border-slate-700 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
              Registration progress
            </p>

            <h2
              className="mt-1 text-lg font-black text-slate-950 dark:text-white sm:text-xl"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Complete all six steps
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Your information is saved as you move through the form.
            </p>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              {currentStep}
            </span>
            Step {currentStep} of {STEPS.length}
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-indigo-100/80 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2937F0] via-[#5B3DF1] to-[#3292EC] transition-[width] duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">
          {completedCount} of {STEPS.length} steps completed
        </p>
      </div>

      {/* DESKTOP */}
      <div className="relative z-10 hidden px-7 py-8 lg:block">
        <div className="relative">
          <div className="absolute left-[8.333%] right-[8.333%] top-7 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />

          <div
            className="absolute left-[8.333%] top-7 h-1 rounded-full bg-gradient-to-r from-[#2937F0] via-[#5B3DF1] to-[#3292EC] transition-[width] duration-500 ease-out"
            style={{
              width: `calc(${progressPercent}% * 0.83334)`,
            }}
          />

          <div className="relative grid grid-cols-6">
            {STEPS.map((item) => {
              const Icon = item.icon;
              const isActive = currentStep === item.number;
              const isCompleted = completedSteps.includes(item.number);

              return (
                <div
                  key={item.number}
                  className="group flex min-w-0 flex-col items-center px-2 text-center"
                >
                  <div
                    className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-4 transition-all duration-300 ${
                      isActive
                        ? "border-white bg-gradient-to-br from-[#2937F0] via-[#5B3DF1] to-[#3292EC] text-white shadow-[0_10px_28px_rgba(79,70,229,0.35)] ring-4 ring-indigo-100 dark:border-slate-900 dark:ring-indigo-500/15"
                        : isCompleted
                          ? "border-white bg-emerald-500 text-white shadow-md shadow-emerald-500/20 dark:border-slate-900"
                          : "border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                    }`}
                  >
                    {isCompleted && !isActive ? (
                      <Check className="h-6 w-6" strokeWidth={3} />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}

                    {isActive && (
                      <span className="absolute -bottom-2 h-2.5 w-2.5 rotate-45 border-b border-r border-indigo-500 bg-indigo-500" />
                    )}
                  </div>

                  <p
                    className={`mt-5 text-sm font-black transition-colors ${
                      isActive
                        ? "text-indigo-600 dark:text-indigo-300"
                        : isCompleted
                          ? "text-emerald-600 dark:text-emerald-300"
                          : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {item.shortLabel}
                  </p>

                  <p className="mt-1 max-w-32 text-xs leading-5 text-slate-400 dark:text-slate-500">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MOBILE / TABLET */}
      <div className="relative z-10 lg:hidden">
        <div
          className="overflow-x-auto overflow-y-hidden px-4 py-6 scroll-smooth snap-x snap-mandatory touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:px-6"
          aria-label="Swipe through registration steps"
        >
          <div className="flex w-max items-center pr-6">
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              const isActive = currentStep === item.number;
              const isCompleted = completedSteps.includes(item.number);

              return (
                <div
                  key={item.number}
                  className="flex snap-center items-center"
                >
                  <div
                    className={`relative w-[220px] shrink-0 rounded-3xl border p-5 transition-all duration-300 sm:w-[250px] ${
                      isActive
                        ? "border-indigo-300 bg-white shadow-[0_14px_34px_rgba(79,70,229,0.16)] ring-2 ring-indigo-100 dark:border-indigo-500/40 dark:bg-slate-800 dark:ring-indigo-500/10"
                        : isCompleted
                          ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                          : "border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/75"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute right-4 top-4 flex h-7 min-w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#2937F0] via-[#5B3DF1] to-[#3292EC] px-2 text-[11px] font-black text-white shadow-sm">
                        {item.number}
                      </span>
                    )}

                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                        isActive
                          ? "bg-gradient-to-br from-[#2937F0] via-[#5B3DF1] to-[#3292EC] text-white shadow-md shadow-indigo-500/20"
                          : isCompleted
                            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                            : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400"
                      }`}
                    >
                      {isCompleted && !isActive ? (
                        <Check className="h-6 w-6" strokeWidth={3} />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>

                    <p
                      className={`mt-4 text-xs font-black uppercase tracking-[0.12em] ${
                        isActive
                          ? "text-indigo-600 dark:text-indigo-300"
                          : isCompleted
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      Step {item.number}
                    </p>

                    <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                      {item.shortLabel}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {item.description}
                    </p>
                  </div>

                  {index < STEPS.length - 1 && (
                    <div className="mx-4 flex items-center">
                      <div
                        className={`h-1 w-12 shrink-0 rounded-full ${
                          completedSteps.includes(item.number)
                            ? "bg-gradient-to-r from-[#2937F0] via-[#5B3DF1] to-[#3292EC]"
                            : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pb-5 text-xs font-medium text-slate-400 dark:text-slate-500">
          <span aria-hidden="true">←</span>
          Swipe left or right to view all steps
          <span aria-hidden="true">→</span>
        </div>
      </div>
    </section>
  );
}