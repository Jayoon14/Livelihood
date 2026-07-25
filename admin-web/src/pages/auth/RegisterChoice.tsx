import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Briefcase,
  Wrench,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

type Role = "customer" | "worker";

export default function RegisterChoice() {
  const [role, setRole] = useState<Role>("customer");
  const [mounted, setMounted] = useState(false);
  const [roleVisible, setRoleVisible] = useState(true);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function switchRole(next: Role) {
    if (next === role) return;

    setRoleVisible(false);

    setTimeout(() => {
      setRole(next);
      setRoleVisible(true);
    }, 180);
  }

  const roleData = {
    customer: {
      icon: User,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",

      title: "Customer",

      description:
        "Hire skilled workers for your home or business needs. Post jobs, compare professionals, chat instantly, and pay securely.",

      button: "Continue as Customer",

      link: "/register/customer",

      features: [
        "Verified Professionals",
        "Secure Online Payments",
        "Real-time Chat",
      ],
    },

    worker: {
      icon: Briefcase,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",

      title: "Worker",

      description:
        "Offer your services, receive nearby job requests, manage bookings, and grow your reputation.",

      button: "Continue as Worker",

      link: "/register/worker",

      features: [
        "Receive Job Requests",
        "Flexible Schedule",
        "Verified Worker Badge",
      ],
    },
  };

  const current = roleData[role];
  const CurrentIcon = current.icon;
  const toggle = (
    <div className="flex justify-center mb-8">
      <div className="relative inline-flex bg-slate-100 rounded-full p-1.5 shadow-inner">
        <div
          className="absolute top-1.5 bottom-1.5 rounded-full bg-[#0A1930] transition-all duration-300"
          style={{
            left: role === "customer" ? "6px" : "50%",
            width: "calc(50% - 6px)",
          }}
        />

        <button
          type="button"
          onClick={() => switchRole("customer")}
          className={`relative z-10 px-8 py-3 rounded-full font-semibold transition-colors duration-300 ${
            role === "customer"
              ? "text-white"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Customer
        </button>

        <button
          type="button"
          onClick={() => switchRole("worker")}
          className={`relative z-10 px-8 py-3 rounded-full font-semibold transition-colors duration-300 ${
            role === "worker"
              ? "text-white"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Worker
        </button>
      </div>
    </div>
  );

  const roleDetails = (
    <div
      style={{
        opacity: roleVisible ? 1 : 0,
        transform: roleVisible ? "translateY(0)" : "translateY(10px)",
        transition: "opacity .25s ease, transform .25s ease",
      }}
    >
      {/* ICON ABOVE TITLE */}

      <div className="flex justify-center">
        <div
          className={`w-20 h-20 rounded-3xl ${current.iconBg} flex items-center justify-center border border-slate-100 shadow-sm`}
        >
          <CurrentIcon
            className={`w-10 h-10 ${current.iconColor}`}
            strokeWidth={2}
          />
        </div>
      </div>

      {/* TITLE */}

      <div className="text-center mt-6">
        <h2
          className="text-3xl font-bold text-slate-900"
          style={{
            fontFamily: "'Sora', sans-serif",
          }}
        >
          Create an account
        </h2>

        <p className="text-slate-500 mt-2">Choose how you'll use Livelihood.</p>
      </div>

      {/* ROLE NAME */}

      <div className="mt-10 text-center">
        <h3
          className="text-2xl font-bold text-slate-900"
          style={{
            fontFamily: "'Sora', sans-serif",
          }}
        >
          {current.title}
        </h3>

        <p className="text-slate-500 leading-7 mt-3 max-w-md mx-auto">
          {current.description}
        </p>
      </div>
      {/* BUTTON */}

      <Link
        to={current.link}
        className="group mt-8 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0A1930] hover:bg-[#12294D] text-white py-4 font-semibold transition-all duration-300 hover:shadow-xl"
      >
        {current.button}

        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
      </Link>

      {/* LOGIN */}

      <p className="text-center mt-7 text-slate-500">
        Already have an account?{" "}
        <Link to="/" className="text-blue-600 font-semibold hover:underline">
          Back to Login
        </Link>
      </p>
    </div>
  );
  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ================= MOBILE ================= */}

      <div className="lg:hidden min-h-screen flex flex-col overflow-hidden">
        <div
          className="relative flex flex-col px-6 pt-10 pb-24"
          style={{
            background:
              "linear-gradient(135deg,#0A1930 0%,#12294D 35%,#1D4ED8 100%)",
            opacity: mounted ? 1 : 0,
            transition: "opacity .6s ease",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-[#0A1930]" />
            </div>

            <span
              className="text-lg font-bold text-white"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Livelihood
            </span>
          </div>

          <div className="relative z-10 mt-10">
            <h1
              className="text-4xl font-bold text-white leading-tight"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Join the
              <br />
              Livelihood
              <br />
              Network
            </h1>

            <p className="text-slate-300 mt-4 leading-7">
              Whether you're hiring or offering services, your account is only a
              few steps away.
            </p>
          </div>
        </div>

        <div
          className="relative -mt-10 bg-white rounded-t-[32px] px-6 pt-8 pb-10 shadow-2xl"
          style={{
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            opacity: mounted ? 1 : 0,
            transition: "all .5s cubic-bezier(.22,1,.36,1)",
          }}
        >
          {toggle}

          <div className="border-t border-slate-100 pt-8">{roleDetails}</div>
        </div>
      </div>

      {/* ================= DESKTOP ================= */}

      <div className="hidden lg:flex min-h-screen">
        {/* LEFT */}

        <div
          className="w-[46%] relative flex flex-col justify-between p-14 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg,#0A1930 0%,#12294D 35%,#1D4ED8 100%)",
            clipPath: "polygon(0 0,100% 0,88% 100%,0 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-[#0A1930]" />
            </div>

            <span
              className="text-white text-xl font-bold"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Livelihood
            </span>
          </div>

          <div className="relative z-10 max-w-md">
            <h1
              className="text-6xl font-bold text-white leading-tight"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Join the
              <br />
              Livelihood
              <br />
              Network.
            </h1>

            <p className="text-slate-300 text-lg leading-8 mt-7">
              Whether you're hiring trusted professionals or offering your
              services, create your account and get started in minutes.
            </p>

            <div className="mt-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 p-6">
              <div className="flex gap-4">
                <ShieldCheck className="w-8 h-8 text-amber-400 shrink-0" />

                <div>
                  <h3 className="text-white font-semibold">
                    Safe & Trusted Community
                  </h3>

                  <p className="text-slate-300 text-sm mt-2">
                    Every worker profile is verified before accepting jobs.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-slate-400 text-sm">
            © {new Date().getFullYear()} Livelihood Services Platform
          </p>
        </div>

        {/* RIGHT */}

        <div className="flex-1 flex items-center justify-center bg-slate-50 p-10">
          <div
            className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-[0_20px_70px_rgba(15,23,42,.12)] p-10"
            style={{
              transform: mounted ? "translateY(0)" : "translateY(16px)",

              opacity: mounted ? 1 : 0,

              transition: "all .5s cubic-bezier(.22,1,.36,1)",
            }}
          >
            {toggle}

            <div className="border-t border-slate-100 pt-8">{roleDetails}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
