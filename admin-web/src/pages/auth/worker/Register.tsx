import { Link } from "react-router-dom";
import { Briefcase, ArrowRight, Wrench, CheckCircle2 } from "lucide-react";

const steps = [
  "Personal Information",
  "Educational Background",
  "Work Experience",
  "Skills & Certifications",
  "Upload Documents",
  "Confirmation",
];

export default function WorkerRegister() {
  return (
    <div
      className="min-h-screen bg-slate-50 flex items-center justify-center p-6"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-[0_20px_70px_rgba(79,70,229,.14)] overflow-hidden">
        {/* HEADER */}

        <div
          className="relative px-10 pt-10 pb-16 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg,#2937F0 0%,#5B3DF1 52%,#3292EC 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
              backgroundSize: "38px 38px",
            }}
          />

          <div className="absolute -top-20 -left-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-400/30">
              <Wrench className="w-5 h-5 text-slate-900" />
            </div>

            <span
              className="text-lg font-bold text-white"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Livelihood
            </span>
          </div>
        </div>

        {/* CARD BODY */}

        <div className="relative -mt-10 px-10 pb-10">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-100 shadow-sm flex items-center justify-center">
              <Briefcase
                className="w-10 h-10 text-amber-600"
                strokeWidth={2}
              />
            </div>
          </div>

          <div className="text-center mt-6">
            <h1
              className="text-3xl font-bold text-slate-900"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Worker Registration
            </h1>

            <p className="text-slate-500 mt-2 leading-7 max-w-md mx-auto">
              Register as a skilled worker and complete the steps below to
              start receiving job requests.
            </p>
          </div>

          {/* PROCESS */}

          <div className="mt-9 rounded-2xl bg-indigo-50/60 border border-indigo-100 p-6">
            <h2
              className="font-bold text-slate-900 mb-4"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Registration Process
            </h2>

            <ul className="space-y-3">
              {steps.map((step) => (
                <li key={step} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4.5 h-4.5 text-indigo-600 shrink-0" />

                  <span className="text-slate-700">{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* BUTTON */}

          <Link
            to="/register"
            className="group mt-8 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2937F0] via-[#5B3DF1] to-[#3292EC] hover:from-[#2430D9] hover:via-[#4F35D8] hover:to-[#287FD2] text-white py-4 font-semibold transition-all duration-300 shadow-lg shadow-indigo-400/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-400/40"
          >
            Start Registration
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}