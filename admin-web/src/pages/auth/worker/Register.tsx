import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    number: 1,
    title: "Personal Information",
    description: "Tell us about yourself",
  },
  {
    number: 2,
    title: "Educational Background",
    description: "Add your education",
  },
  {
    number: 3,
    title: "Work Experience",
    description: "Share your experience",
  },
  {
    number: 4,
    title: "Skills & Certifications",
    description: "Show your expertise",
  },
  {
    number: 5,
    title: "Upload Documents",
    description: "Submit required documents",
  },
  {
    number: 6,
    title: "Confirmation",
    description: "Review and submit",
  },
];

const benefits = [
  {
    icon: ShieldCheck,
    title: "Secure",
    description: "Protected registration",
  },
  {
    icon: CheckCircle2,
    title: "Verified",
    description: "Trusted professionals",
  },
  {
    icon: MapPin,
    title: "Local",
    description: "Nearby services",
  },
];

function WorkerIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 560 360"
      className="h-full w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="workerBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1737d4" />
          <stop offset="100%" stopColor="#10268f" />
        </linearGradient>

        <linearGradient id="workerGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd84c" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffd84c" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* skyline */}
      <g opacity="0.22" fill="#0b2ca8">
        <rect x="40" y="238" width="42" height="92" rx="4" />
        <rect x="88" y="204" width="52" height="126" rx="4" />
        <rect x="148" y="225" width="46" height="105" rx="4" />
        <rect x="202" y="180" width="58" height="150" rx="4" />
        <rect x="268" y="215" width="46" height="115" rx="4" />
        <rect x="322" y="194" width="64" height="136" rx="4" />
        <rect x="396" y="220" width="44" height="110" rx="4" />
        <rect x="448" y="188" width="64" height="142" rx="4" />
      </g>

      {/* window dots */}
      <g fill="#7dd3fc" opacity="0.35">
        {[
          [53, 254],
          [53, 274],
          [53, 294],
          [102, 222],
          [102, 244],
          [102, 266],
          [102, 288],
          [163, 243],
          [163, 265],
          [218, 198],
          [218, 222],
          [218, 246],
          [218, 270],
          [282, 233],
          [282, 257],
          [338, 212],
          [338, 236],
          [338, 260],
          [338, 284],
          [407, 238],
          [407, 264],
          [464, 206],
          [464, 232],
          [464, 258],
          [464, 284],
        ].map(([cx, cy], index) => (
          <circle key={index} cx={cx} cy={cy} r="4" />
        ))}
      </g>

      {/* halo */}
      <circle cx="300" cy="190" r="145" fill="url(#workerGlow)" opacity="0.35" />

      {/* standing worker */}
      <g opacity="0.92">
        <ellipse cx="303" cy="95" rx="31" ry="35" fill="#1432b7" />
        <path
          d="M274 90c10-30 52-38 70-10-22 0-41 2-70 10Z"
          fill="#1737d4"
        />
        <path
          d="M271 127c36-18 78 2 83 44l12 100H252l3-105c1-18 7-30 16-39Z"
          fill="url(#workerBody)"
        />
        <path
          d="M252 168c-24 21-41 49-49 80l24 11c13-34 29-59 49-74l-24-17Z"
          fill="#1737d4"
        />
        <path
          d="M357 166c23 21 37 49 44 80l-23 9c-12-31-28-55-48-70l27-19Z"
          fill="#1737d4"
        />
        <path
          d="M274 271h35l-9 66h-37l11-66Zm45 0h36l13 66h-37l-12-66Z"
          fill="#10268f"
        />
        <path
          d="M258 336h46v12h-53l7-12Zm72 0h42l7 12h-48l-1-12Z"
          fill="#0b1d67"
        />
        <path
          d="M250 154c31 17 65 17 100 0"
          stroke="#61a8ff"
          strokeWidth="9"
          opacity="0.75"
        />
        <path
          d="M290 135v95M335 135v95"
          stroke="#8ac5ff"
          strokeWidth="8"
          opacity="0.45"
        />

        {/* wrench */}
        <path
          d="M211 80c10-10 24-12 36-6l-15 15 8 8 15-15c6 12 4 26-6 36-8 8-20 11-31 8l-43 43-17-17 43-43c-3-11 0-22 10-29Z"
          fill="#1636c6"
        />
      </g>

      {/* secondary worker */}
      <g opacity="0.78">
        <ellipse cx="430" cy="143" rx="22" ry="25" fill="#1432b7" />
        <path
          d="M409 140c8-22 37-28 50-8-17 0-29 2-50 8Z"
          fill="#1737d4"
        />
        <path
          d="M407 167c27-13 57 2 60 33l8 72h-82l3-76c1-13 4-23 11-29Z"
          fill="#1737d4"
        />
        <path
          d="M413 271h25l-7 48h-26l8-48Zm32 0h25l9 48h-26l-8-48Z"
          fill="#10268f"
        />
        <path
          d="M397 318h36v10h-40l4-10Zm56 0h30l5 10h-35v-10Z"
          fill="#0b1d67"
        />
        <rect x="464" y="234" width="64" height="46" rx="8" fill="#12309f" />
        <rect x="481" y="222" width="30" height="18" rx="6" stroke="#12309f" strokeWidth="7" />
      </g>

      {/* line details */}
      <path
        d="M125 112c46-45 98-68 157-67"
        stroke="white"
        strokeOpacity="0.12"
        strokeWidth="2"
      />
      <path
        d="M120 132c47-35 102-51 164-46"
        stroke="white"
        strokeOpacity="0.12"
        strokeWidth="2"
      />
      <circle cx="185" cy="110" r="66" stroke="white" strokeOpacity="0.09" />
      <circle cx="185" cy="110" r="48" stroke="white" strokeOpacity="0.09" />
      <circle cx="185" cy="110" r="30" stroke="white" strokeOpacity="0.09" />
    </svg>
  );
}

export default function WorkerRegister() {
  return (
    <main
      className="relative min-h-dvh overflow-hidden bg-[linear-gradient(135deg,#f8faff_0%,#eef3ff_46%,#f8fbff_100%)] text-slate-900"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* TOP NAVBAR */}
      <header className="relative z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 shadow-sm">
              <Wrench className="h-5 w-5 text-slate-950" />
            </div>

            <div className="min-w-0">
              <p
                className="truncate text-base font-black leading-none text-slate-950 sm:text-lg"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                LivelihoodGo
              </p>

              <p className="mt-1 truncate text-[11px] text-slate-500 sm:text-xs">
                Trusted local services
              </p>
            </div>
          </Link>

          <Link
            to="/register-choice"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 sm:px-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Account type</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>

      {/* Static background design */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "linear-gradient(#2937f0 1px,transparent 1px),linear-gradient(90deg,#2937f0 1px,transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-indigo-300/25 blur-3xl" />
        <div className="absolute -right-24 -top-16 h-96 w-96 rounded-full bg-blue-300/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-amber-300/25 blur-3xl" />

        <svg
          className="absolute left-4 top-24 hidden h-48 w-48 text-indigo-300/35 md:block"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M51 35c18 4 31 19 34 37l-20-8-13 13 8 20c-18-3-33-16-37-34-5-21 8-43 28-52Z"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m69 94 59 59c7 7 18 7 25 0s7-18 0-25L94 69"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </svg>

        <svg
          className="absolute bottom-24 right-5 hidden h-44 w-44 text-indigo-300/35 md:block"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M48 66c26-30 64-37 91-17l-19 19 38 38-22 22-38-38-19 19c-20-27-13-65 17-91"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="relative z-10 px-3 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto w-full max-w-6xl">
        <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-[0_30px_90px_rgba(52,65,180,0.18)]">
          {/* HERO */}
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#2937f0_0%,#5b3df1_56%,#3292ec_100%)] px-5 pb-7 pt-6 text-white sm:px-8 sm:pb-8 sm:pt-8 lg:px-10 lg:pb-5 lg:pt-9">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.09]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />

            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

            <div className="relative z-10">
              <Link to="/" className="inline-flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 shadow-lg shadow-slate-950/20">
                  <Wrench className="h-5 w-5 text-slate-950" />
                </div>

                <div>
                  <p
                    className="font-black leading-none"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    Livelihood
                  </p>
                  <p className="mt-1 text-xs text-blue-100/80">
                    Trusted local services
                  </p>
                </div>
              </Link>

              <div className="mt-7 grid items-center gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="pb-2">
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-amber-300">
                    Worker registration
                  </p>

                  <h1
                    className="mt-3 max-w-xl text-3xl font-black leading-[1.08] sm:text-4xl lg:text-5xl"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    Start your journey as a skilled worker.
                  </h1>

                  <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
                    Complete your profile step-by-step and get connected with
                    job opportunities that match your skills.
                  </p>
                </div>

                <div className="hidden h-64 min-w-0 lg:block">
                  <WorkerIllustration />
                </div>
              </div>

              {/* BENEFITS */}
              <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm">
                {benefits.map(({ icon: Icon, title, description }, index) => (
                  <div
                    key={title}
                    className={`flex min-w-0 items-center gap-3 px-3 py-3 sm:px-5 sm:py-4 ${
                      index !== 0 ? "border-l border-white/15" : ""
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-amber-300 sm:h-6 sm:w-6" />

                    <div className="min-w-0">
                      <p className="truncate text-xs font-black sm:text-sm">
                        {title}
                      </p>
                      <p className="mt-0.5 hidden truncate text-xs text-blue-100/80 sm:block">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PROCESS */}
          <div className="bg-white px-5 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-[#2937f0] shadow-sm ring-1 ring-indigo-100">
                <Briefcase className="h-7 w-7" />
              </div>

              <div>
                <h2
                  className="text-2xl font-black text-slate-950"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Registration Process
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Follow these simple steps to complete your registration.
                </p>
              </div>
            </div>

            {/* Desktop timeline */}
            <div className="mt-8 hidden lg:grid lg:grid-cols-6">
              {steps.map((step, index) => (
                <div key={step.number} className="relative px-3 text-center">
                  {index < steps.length - 1 && (
                    <div className="absolute left-[62%] top-5 h-px w-[76%] bg-indigo-100" />
                  )}

                  <div className="relative z-10 mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#2937f0] to-[#5b3df1] text-sm font-black text-white shadow-md shadow-indigo-500/20">
                    {step.number}
                  </div>

                  <h3 className="mt-4 text-sm font-black leading-5 text-slate-900">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Mobile/tablet steps */}
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:hidden">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2937f0] to-[#5b3df1] text-sm font-black text-white">
                    {step.number}
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/register"
              className="group mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2937f0] via-[#5b3df1] to-[#3292ec] px-5 py-4 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Start Registration
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
        </div>
      </div>
    </main>
  );
}