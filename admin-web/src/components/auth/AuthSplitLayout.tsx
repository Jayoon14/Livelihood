import { useEffect, useState, type ReactNode } from "react";
import {
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Feature {
  icon: LucideIcon;
  text: string;
}

interface AuthSplitLayoutProps {
  children: ReactNode;
  heroIcon: LucideIcon;
  heroTitle: ReactNode;
  heroDescription: string;
  features?: Feature[];
  mobileTitle?: string;
  desktopBackgroundImage?: string;
  floatingCard?: boolean;
}

export default function AuthSplitLayout({
  children,
  heroIcon: HeroIcon,
  heroTitle,
  heroDescription,
  features = [],
  mobileTitle = "LivelihoodGo",
  desktopBackgroundImage,
  floatingCard = true,
}: AuthSplitLayoutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <main
      className="min-h-dvh overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="grid min-h-dvh lg:grid-cols-[45%_55%]">
        {/* DESKTOP LEFT PANEL — 45% */}
        <section className="relative z-20 hidden min-h-dvh min-w-0 flex-col justify-between px-12 py-10 text-white lg:flex xl:px-16 xl:py-14">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 -right-[5vw]"
            style={{
              background:
                "linear-gradient(160deg,#2937f0 0%,#5b3df1 55%,#3292ec 100%)",
              clipPath:
                "polygon(0 0,100% 0,calc(100% - 5vw) 100%,0 100%)",
            }}
          />

          <div
            className="pointer-events-none absolute inset-y-0 left-0 -right-[5vw] opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
              backgroundSize: "40px 40px",
              clipPath:
                "polygon(0 0,100% 0,calc(100% - 5vw) 100%,0 100%)",
            }}
          />

          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

          <Link
            to="/"
            className="relative z-10 flex w-fit items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 shadow-lg shadow-slate-950/20">
              <Wrench
                className="h-6 w-6 text-slate-900"
                strokeWidth={2.5}
              />
            </div>

            <div>
              <p
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                LivelihoodGo
              </p>

              <p className="text-xs text-blue-100/75">
                Trusted local services
              </p>
            </div>
          </Link>

          <div className="relative z-10 max-w-xl">
            <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm">
              <HeroIcon className="h-8 w-8 text-amber-300" />
            </div>

            <h1
              className="text-4xl font-black leading-tight tracking-tight xl:text-5xl"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              {heroTitle}
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-blue-50/90 xl:text-lg">
              {heroDescription}
            </p>

            {features.length > 0 && (
              <div className="mt-9 space-y-3">
                {features.map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-3 text-sm text-white/90"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <Icon className="h-5 w-5 text-amber-300" />
                    </div>

                    <span>{text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="relative z-10 text-xs text-blue-100/70">
            © {new Date().getFullYear()} LivelihoodGo. All rights reserved.
          </p>
        </section>

        {/* RIGHT PANEL — 55% */}
        <section className="relative z-10 flex min-h-dvh min-w-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
          {desktopBackgroundImage && (
            <>
              <img
                src={desktopBackgroundImage}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 hidden h-full w-full select-none object-cover object-center lg:block dark:opacity-45"
                style={{
                  transform: mounted ? "scale(1)" : "scale(1.025)",
                  opacity: mounted ? 1 : 0,
                  transition:
                    "transform 1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.7s ease-out",
                }}
              />

              <div className="pointer-events-none absolute inset-0 hidden bg-white/20 lg:block dark:bg-slate-950/30" />
            </>
          )}

          {/* MOBILE / TABLET HEADER */}
          <div
            className="relative shrink-0 overflow-hidden bg-[linear-gradient(160deg,#2937f0_0%,#5b3df1_55%,#3292ec_100%)] px-5 pb-24 pt-7 text-white sm:px-8 sm:pb-28 sm:pt-9 lg:hidden"
            style={{
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.55s ease-out",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                backgroundSize: "34px 34px",
              }}
            />

            <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />

            <div className="relative z-10 mx-auto w-full max-w-xl">
              <Link to="/" className="flex w-fit items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 shadow-lg shadow-slate-950/20">
                  <Wrench
                    className="h-5 w-5 text-slate-900"
                    strokeWidth={2.5}
                  />
                </div>

                <div>
                  <p
                    className="font-bold"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    {mobileTitle}
                  </p>

                  <p className="text-xs text-blue-100/75">
                    Trusted local services
                  </p>
                </div>
              </Link>

              <div className="mt-7 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <HeroIcon className="h-6 w-6 text-amber-300" />
                </div>

                <div className="min-w-0">
                  <h2
                    className="text-2xl font-black leading-tight sm:text-3xl"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    {heroTitle}
                  </h2>

                  <p className="mt-2 max-w-lg text-sm leading-6 text-blue-100">
                    {heroDescription}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CONTENT AREA
              Mobile/tablet: full-width slide-up sheet, not a floating card.
              Desktop: centered card over the background. */}
          <div className="relative z-20 -mt-10 flex flex-1 items-stretch justify-center p-0 lg:mt-0 lg:items-center lg:px-10 lg:py-12 xl:px-16">
            <div
              className={`w-full max-w-none rounded-t-[2rem] border-t border-white/80 bg-white px-5 pb-8 pt-5 shadow-[0_-12px_35px_rgba(59,63,246,0.14)] dark:border-slate-700 dark:bg-slate-900 sm:px-8 sm:pb-10 sm:pt-6 lg:max-w-xl lg:rounded-[2rem] lg:border lg:border-white/90 lg:bg-white/95 lg:p-10 lg:shadow-[0_24px_70px_rgba(59,63,246,0.16)] lg:backdrop-blur-md dark:lg:border-slate-700 dark:lg:bg-slate-900/95 ${
                floatingCard ? "" : ""
              }`}
              style={{
                transform: mounted
                  ? "translateY(0) scale(1)"
                  : "translateY(42px) scale(0.985)",
                opacity: mounted ? 1 : 0,
                transition:
                  "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease-out",
              }}
            >
              <div className="mx-auto mb-6 h-1.5 w-11 rounded-full bg-slate-200 dark:bg-slate-700 lg:hidden" />

              {children}

              <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400 lg:hidden">
                <ShieldCheck className="h-4 w-4 text-amber-500" />
                Secure LivelihoodGo authentication
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}