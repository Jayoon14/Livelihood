import type { ReactNode } from "react";
import {
  BriefcaseBusiness,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

interface AuthShellProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  compact?: boolean;
}

export default function AuthShell({
  children,
  title,
  subtitle,
  compact = false,
}: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="grid min-h-dvh lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#2638f2_0%,#5b3df0_45%,#168bdc_100%)] px-10 py-10 text-white lg:flex lg:flex-col xl:px-16 xl:py-14">
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="absolute -left-28 top-1/4 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute -right-20 bottom-16 h-72 w-72 rounded-full bg-violet-200/20 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 shadow-xl shadow-slate-950/20">
              <Wrench className="h-6 w-6 text-slate-950" strokeWidth={2.5} />
            </div>

            <div>
              <p className="text-xl font-extrabold tracking-tight">
                LivelihoodGo
              </p>
              <p className="text-xs font-medium text-white/70">
                Trusted local services
              </p>
            </div>
          </div>

          <div className="relative z-10 my-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold backdrop-blur">
              <Sparkles className="h-4 w-4 text-amber-300" />
              Fast, secure, and community powered
            </span>

            <h1 className="mt-7 max-w-xl text-4xl font-black leading-tight tracking-tight xl:text-6xl">
              Skilled hands.
              <br />
              Trusted work.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-blue-50/85 xl:text-lg">
              Connect with verified workers, manage bookings, track services,
              and complete payments from one reliable platform.
            </p>

            <div className="mt-9 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  label: "Verified workers",
                },
                {
                  icon: MapPin,
                  label: "Live tracking",
                },
                {
                  icon: BriefcaseBusiness,
                  label: "Easy booking",
                },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-sm"
                >
                  <Icon className="h-5 w-5 text-amber-300" />
                  <p className="mt-3 text-sm font-bold">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-xs text-white/55">
            © 2026 LivelihoodGo. All rights reserved.
          </p>
        </section>

        <section className="flex min-h-dvh items-center justify-center px-4 py-7 sm:px-6 sm:py-10 lg:px-10 xl:px-16">
          <div className={`w-full ${compact ? "max-w-md" : "max-w-lg"}`}>
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 shadow-lg">
                <Wrench className="h-5 w-5 text-slate-950" />
              </div>

              <div>
                <p className="font-extrabold text-[var(--app-text)]">
                  LivelihoodGo
                </p>
                <p className="text-xs text-[var(--app-text-muted)]">
                  Trusted local services
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow)] sm:p-8 xl:p-10">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-[var(--app-text)] sm:text-3xl">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
                  {subtitle}
                </p>
              </div>

              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
