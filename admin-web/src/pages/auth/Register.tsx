import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRegisterStore } from "../../store/registerStore";
import { submitWorkerRegistration } from "../../services/registerWorkerService";
import { isDisposableEmail } from "../../utils/disposableEmail";
import {
  savePendingWorkerFiles,
  uploadPendingWorkerFiles,
} from "../../utils/pendingWorkerFiles";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import CaptchaVerificationModal from "../../components/auth/CaptchaVerificationModal";
import EmailOtpModal from "../../components/auth/EmailOtpModal";
import StepIndicator from "../../components/StepIndicator";

import PersonalInformation from "./register/PersonalInformation";
import EducationalBackground from "./register/EducationalBackground";
import WorkExperience from "./register/WorkExperience";
import SkillsCertification from "./register/SkillsCertification";
import Documents from "./register/Documents";
import Confirmation from "./register/Confirmation";

export default function Register() {
  const navigate = useNavigate();

  const [captchaWidgetKey, setCaptchaWidgetKey] = useState(0);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as
    | string
    | undefined;

  const {
    step,
    data,
    nextStep,
    prevStep,
    goToStep,
    completeStep,
    completedSteps,
    setErrors,
    reset,
    editingFromReview,
    setEditingFromReview,
  } = useRegisterStore();

  function validateStep1() {
    const errors: Record<string, string> = {};

    if (!data.firstName.trim()) errors.firstName = "First name is required";

    if (!data.lastName.trim()) errors.lastName = "Last name is required";

    if (!data.birthDate) errors.birthDate = "Birth date is required";

    if (!data.gender) errors.gender = "Gender is required";

    if (!data.civilStatus) errors.civilStatus = "Civil status is required";

    if (!data.religion) errors.religion = "Religion is required";

    if (!data.phone.trim()) errors.phone = "Phone number is required";

    if (!data.email.trim()) {
      errors.email = "Email is required";
    } else if (isDisposableEmail(data.email)) {
      errors.email = "Temporary or disposable email addresses are not allowed.";
    }

    if (!data.password) {
      errors.password = "Password is required";
    } else {
      const regex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/;

      if (!regex.test(data.password))
        errors.password =
          "Password must contain uppercase, lowercase, number and special character.";
    }

    if (!data.confirmPassword)
      errors.confirmPassword = "Please confirm your password.";
    else if (data.password !== data.confirmPassword)
      errors.confirmPassword = "Passwords do not match";

    if (!data.houseNo.trim()) errors.houseNo = "House No. is required";

    if (!data.street.trim()) errors.street = "Street is required";

    if (!data.barangay.trim()) errors.barangay = "Barangay is required";

    if (!data.municipality.trim())
      errors.municipality = "Municipality is required";

    if (!data.province.trim()) errors.province = "Province is required";

    setErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.warning(Object.values(errors)[0]);

      return false;
    }

    return true;
  }

  function validateStep2() {
    const errors: Record<string, string> = {};

    if (!data.highestEducation) {
      errors.highestEducation = "Highest Educational Attainment is required";
    }

    if (
      [
        "Elementary",
        "Junior High",
        "Senior High",
        "College",
        "Master",
        "Doctorate",
      ].includes(data.highestEducation) &&
      !data.elementary.trim()
    ) {
      errors.elementary = "Elementary School is required";
    }

    if (
      ["Junior High", "Senior High", "College", "Master", "Doctorate"].includes(
        data.highestEducation,
      ) &&
      !data.secondary.trim()
    ) {
      errors.secondary = "Junior High School is required";
    }

    if (
      ["Senior High", "College", "Master", "Doctorate"].includes(
        data.highestEducation,
      ) &&
      !data.seniorHigh.trim()
    ) {
      errors.seniorHigh = "Senior High School is required";
    }

    if (["College", "Master", "Doctorate"].includes(data.highestEducation)) {
      if (!data.college.trim()) {
        errors.college = "University is required";
      }

      if (!data.course.trim()) {
        errors.course = "Course / Degree is required";
      }

      if (!data.yearGraduated.trim()) {
        errors.yearGraduated = "Year Graduated is required";
      }
    }

    if (
      ["Master", "Doctorate"].includes(data.highestEducation) &&
      !data.prc.trim()
    ) {
      errors.prc = "PRC License No. is required";
    }

    if (data.highestEducation === "Other" && !data.otherEducation.trim()) {
      errors.otherEducation = "Please specify your education";
    }

    setErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.warning(Object.values(errors)[0]);

      return false;
    }

    return true;
  }

  function validateStep3() {
    if (data.noWorkExperience) {
      setErrors({});

      return true;
    }

    const errors: Record<string, string> = {};

    if (!data.company.trim()) errors.company = "Company is required";

    if (!data.position.trim()) errors.position = "Position is required";

    if (!data.employmentStatus.trim())
      errors.employmentStatus = "Employment status is required";

    if (!data.startDate) errors.startDate = "Start date is required";

    if (!data.endDate) errors.endDate = "End date is required";

    if (!data.description.trim())
      errors.description = "Description is required";

    setErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.warning(Object.values(errors)[0]);

      return false;
    }

    return true;
  }
  function validateStep4() {
    const errors: Record<string, string> = {};

    if (data.skills.length === 0)
      errors.skills = "Please select at least one skill.";

    setErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.warning(Object.values(errors)[0]);

      return false;
    }

    return true;
  }

  function validateStep5() {
    const errors: Record<string, string> = {};

    if (!data.validId) errors.validId = "Valid ID is required";

    if (!data.resume) errors.resume = "Resume is required";

    if (!data.barangayClearance)
      errors.barangayClearance = "Barangay Clearance is required";

    if (!data.policeClearance)
      errors.policeClearance = "Police Clearance is required";

    if (!data.nbiClearance) errors.nbiClearance = "NBI Clearance is required";

    setErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.warning(Object.values(errors)[0]);

      return false;
    }

    return true;
  }

  async function handleNext() {
    console.log("Current Step:", step);

    if (step === 1) {
      if (!validateStep1()) return;

      completeStep(1);

      if (editingFromReview) {
        setEditingFromReview(false);

        goToStep(6);

        return;
      }

      nextStep();

      return;
    }

    if (step === 2) {
      if (!validateStep2()) return;

      completeStep(2);

      if (editingFromReview) {
        setEditingFromReview(false);

        goToStep(6);

        return;
      }

      nextStep();

      return;
    }

    if (step === 3) {
      if (!validateStep3()) return;

      completeStep(3);

      if (editingFromReview) {
        setEditingFromReview(false);

        goToStep(6);

        return;
      }

      nextStep();

      return;
    }

    if (step === 4) {
      if (!validateStep4()) return;

      completeStep(4);

      if (editingFromReview) {
        setEditingFromReview(false);

        goToStep(6);

        return;
      }

      nextStep();

      return;
    }

    if (step === 5) {
      if (!validateStep5()) return;

      completeStep(5);

      if (editingFromReview) {
        setEditingFromReview(false);

        goToStep(6);

        return;
      }

      nextStep();

      return;
    }

    if (!turnstileSiteKey) {
      toast.error(
        "Turnstile is not configured. Add VITE_TURNSTILE_SITE_KEY to the environment variables.",
      );
      return;
    }

    if (submitting) {
      return;
    }
    setCaptchaWidgetKey((current) => current + 1);
    setCaptchaOpen(true);
  }

  async function completeWorkerRegistration(token: string) {
    try {
      setSubmitting(true);

      await submitWorkerRegistration(data, token);

      await savePendingWorkerFiles(data.email, {
        profilePicture: data.profilePicture,
        validId: data.validId,
        resume: data.resume,
        tesdaCertificate: data.tesdaCertificate,
        barangayClearance: data.barangayClearance,
        policeClearance: data.policeClearance,
        nbiClearance: data.nbiClearance,

        highestEducation: data.highestEducation,
        elementary: data.elementary,
        secondary: data.secondary,
        seniorHigh: data.seniorHigh,
        college: data.college,
        course: data.course,
        yearGraduated: data.yearGraduated,
        tesda: data.tesda,
        prc: data.prc,
        trainings: data.trainings,

        noWorkExperience: data.noWorkExperience,
        company: data.company,
        position: data.position,
        employmentStatus: data.employmentStatus,
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.description,

        skills: data.skills,
      });

      setCaptchaOpen(false);

      const normalizedEmail = data.email.trim().toLowerCase();

      setRegisteredEmail(normalizedEmail);

      toast.success(
        "Worker account created. Enter the OTP code sent to your email.",
      );

      setOtpModalOpen(true);
    } catch (error: unknown) {
      setCaptchaWidgetKey((current) => current + 1);
      setCaptchaOpen(false);

      toast.error(
        error instanceof Error ? error.message : "Registration failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="relative min-h-dvh overflow-hidden bg-[linear-gradient(135deg,#f8faff_0%,#eef3ff_46%,#f8fbff_100%)] text-slate-900 dark:bg-[linear-gradient(135deg,#020617_0%,#07111f_46%,#020617_100%)] dark:text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* PAGE BACKGROUND */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-[0.055] dark:opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(#2937f0 1px,transparent 1px),linear-gradient(90deg,#2937f0 1px,transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-300/25 blur-3xl dark:bg-indigo-700/10" />
        <div className="absolute -right-24 top-16 h-96 w-96 rounded-full bg-blue-300/25 blur-3xl dark:bg-blue-700/10" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-700/10" />

        <div className="absolute left-[4%] top-40 hidden h-28 w-28 rotate-12 rounded-[2rem] border border-indigo-200/50 bg-white/30 backdrop-blur lg:block dark:border-indigo-500/10 dark:bg-white/5" />

        <div className="absolute bottom-24 right-[4%] hidden h-24 w-24 -rotate-12 rounded-[1.75rem] border border-blue-200/50 bg-white/30 backdrop-blur lg:block dark:border-blue-500/10 dark:bg-white/5" />
      </div>

      {/* TOP NAVIGATION */}
      <header className="relative z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 shadow-sm">
              <Wrench className="h-5 w-5 text-slate-950" />
            </span>

            <span className="min-w-0">
              <span
                className="block truncate text-base font-black leading-none text-slate-950 dark:text-white sm:text-lg"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                LivelihoodGo
              </span>

              <span className="mt-1 block truncate text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
                Trusted local services
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/register-choice")}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 sm:px-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Account type</span>
            <span className="sm:hidden">Back</span>
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(135deg,#2937F0_0%,#5B3DF1_52%,#3292EC_100%)] px-5 py-6 text-white shadow-[0_24px_70px_rgba(41,55,240,0.24)] sm:px-8 sm:py-8 lg:px-10 lg:py-9">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.09]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-amber-300 backdrop-blur sm:text-xs">
                <Sparkles className="h-4 w-4" />
                Worker registration
              </div>

              <h1
                className="mt-3 max-w-3xl text-3xl font-black leading-[1.08] sm:text-4xl lg:text-5xl"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Build your professional worker profile.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                Complete each registration step to showcase your skills,
                experience, and credentials to nearby customers.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:w-[30rem]">
              {[
                {
                  icon: ShieldCheck,
                  title: "Secure",
                  text: "Protected application",
                },
                {
                  icon: BriefcaseBusiness,
                  title: "Professional",
                  text: "Complete work profile",
                },
                {
                  icon: Check,
                  title: "Verified",
                  text: "Credential review",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="flex min-w-0 flex-col items-center rounded-xl border border-white/15 bg-white/10 px-2 py-3 text-center backdrop-blur-sm sm:items-start sm:rounded-2xl sm:p-4 sm:text-left"
                >
                  <Icon className="h-4 w-4 shrink-0 text-amber-300 sm:h-5 sm:w-5" />

                  <p className="mt-2 truncate text-[11px] font-black sm:mt-3 sm:text-sm">
                    {title}
                  </p>

                  <p className="mt-1 hidden text-xs text-blue-100/80 sm:block">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* REGISTRATION SHELL */}
        <section className="relative -mt-4 overflow-hidden rounded-[2rem] border border-white/90 bg-white/96 shadow-[0_30px_90px_rgba(15,23,42,0.13)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/96 sm:-mt-6">
          <div className="border-b border-slate-200 px-4 py-5 dark:border-slate-800 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#2937F0] dark:text-indigo-400">
                  Worker application
                </p>

                <h2
                  className="mt-1 text-2xl font-black text-slate-950 dark:text-white"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Complete your registration
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Review each section carefully before submitting your profile.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-[#2937F0] dark:bg-indigo-500/10 dark:text-indigo-300">
                <ShieldCheck className="h-4 w-4" />
                Secure application
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-5 md:p-7 lg:p-8">
            <StepIndicator currentStep={step} completedSteps={completedSteps} />

            <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] sm:p-6 lg:p-8">
              <div className="min-h-[500px]">
                {step === 1 && <PersonalInformation />}
                {step === 2 && <EducationalBackground />}
                {step === 3 && <WorkExperience />}
                {step === 4 && <SkillsCertification />}
                {step === 5 && <Documents />}

                {step === 6 && <Confirmation />}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Step {step} of 6
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Use Previous or Next to review every section.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={step === 1 || submitting}
                  onClick={prevStep}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() => void handleNext()}
                  disabled={submitting}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2937F0] via-[#5B3DF1] to-[#3292EC] px-8 py-3.5 font-semibold text-white shadow-lg shadow-indigo-400/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-400/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 sm:w-auto"
                >
                  {submitting
                    ? "Submitting Application..."
                    : step === 6
                      ? "Submit Application"
                      : "Continue"}

                  {submitting ? (
                    <span className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : step === 6 ? (
                    <Check className="h-4.5 w-4.5" />
                  ) : (
                    <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <EmailOtpModal
        open={otpModalOpen}
        email={registeredEmail}
        accountType="worker"
        onClose={() => {
          if (!submitting) {
            setOtpModalOpen(false);
          }
        }}
        onVerified={async ({ userId, email }) => {
          try {
            await uploadPendingWorkerFiles(userId, email);

            toast.success("Worker files uploaded successfully.");
          } catch (error) {
            console.error("Worker file upload after OTP failed:", error);

            toast.warning(
              "Your email was verified, but some files are still pending upload. They will be retried after your account is approved.",
            );
          }

          setOtpModalOpen(false);
          reset();

          navigate("/", {
            replace: true,
            state: {
              verifiedEmail: registeredEmail,
            },
          });
        }}
      />

      <CaptchaVerificationModal
        open={captchaOpen}
        siteKey={turnstileSiteKey ?? ""}
        widgetKey={captchaWidgetKey}
        processing={submitting}
        title="Verify before submitting"
        description="Complete this quick security check to submit your worker application."
        onClose={() => {
          if (!submitting) {
            setCaptchaOpen(false);
          }
        }}
        onSuccess={(token) => {
          void completeWorkerRegistration(token);
        }}
        onExpire={() => undefined}
        onError={() => {
          setCaptchaWidgetKey((current) => current + 1);
          toast.error("Security verification failed. Please try again.");
        }}
      />
    </main>
  );
}
