import { useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import AuthSplitLayout from "../../components/auth/AuthSplitLayout";

type Role = "customer" | "worker";

const DATA = {
  customer: {
    icon: User,
    title: "Customer",
    description:
      "Hire skilled workers for your home or business, manage bookings, chat, track services, and pay securely.",
    link: "/register/customer",
    button: "Continue as Customer",
    features: [
      "Verified professionals",
      "Secure service booking",
      "Real-time updates",
    ],
  },
  worker: {
    icon: Briefcase,
    title: "Worker",
    description:
      "Offer your skills, receive nearby requests, manage your schedule, and build a trusted work profile.",
    link: "/register/worker",
    button: "Continue as Worker",
    features: [
      "Nearby job requests",
      "Flexible schedule",
      "Verified worker profile",
    ],
  },
} as const;

export default function RegisterChoice() {
  const [role, setRole] = useState<Role>("customer");

  const current = useMemo(() => DATA[role], [role]);
  const Icon = current.icon;

  return (
    <AuthSplitLayout
      heroIcon={Users}
      heroTitle={
        <>
          Join the
          <br />
          Livelihood network.
        </>
      }
      heroDescription="Whether you are hiring or offering services, your account is only a few steps away."
      features={[
        {
          icon: ShieldCheck,
          text: "Secure registration for customers and workers.",
        },
        {
          icon: Users,
          text: "Connect with your local service community.",
        },
      ]}
      desktopBackgroundImage="/auth/workshop-login-background.png"
      floatingCard={false}
    >
      <div>
        <h1
          className="text-3xl font-black text-slate-900 dark:text-white"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Create an account
        </h1>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Choose how you will use LivelihoodGo.
        </p>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800">
        {(["customer", "worker"] as Role[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setRole(option)}
            aria-pressed={role === option}
            className={`rounded-xl px-4 py-3 text-sm font-bold capitalize transition-all duration-200 ${
              role === option
                ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300"
                : "text-slate-500 hover:bg-white/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-white"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div
        key={role}
        className="animate-fadeIn mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60 sm:p-6"
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
              role === "customer"
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-300"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-300"
            }`}
          >
            <Icon className="h-7 w-7" />
          </div>

          <div className="min-w-0">
            <h2
              className="text-2xl font-black text-slate-900 dark:text-white"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {current.title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {current.description}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {current.features.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <Link
        to={current.link}
        className="group mt-6 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30 active:translate-y-0"
      >
        {current.button}

        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </Link>

      <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}

        <Link
          to="/"
          className="font-bold text-indigo-600 transition hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Back to login
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
