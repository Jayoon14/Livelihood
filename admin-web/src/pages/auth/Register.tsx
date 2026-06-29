import { useRegisterStore } from "../../store/registerStore";

import StepIndicator from "../../components/StepIndicator";

import PersonalInformation from "./register/PersonalInformation";
import EducationalBackground from "./register/EducationalBackground";
import WorkExperience from "./register/WorkExperience";
import SkillsCertification from "./register/SkillsCertification";
import Documents from "./register/Documents";
import Confirmation from "./register/Confirmation";

export default function Register() {
  const {
    step,
    data,
    nextStep,
    prevStep,
    completeStep,
  } = useRegisterStore();

  function validateStep1() {
    return (
      data.firstName !== "" &&
      data.lastName !== "" &&
      data.birthDate !== "" &&
      data.gender !== "" &&
      data.phone !== "" &&
      data.email !== "" &&
      data.password !== "" &&
      data.confirmPassword !== ""
    );
  }

  function handleNext() {
    if (step === 1) {
      if (!validateStep1()) {
        alert("Please complete all required fields.");
        return;
      }

      completeStep(1);
      nextStep();
      return;
    }

    if (step < 6) {
      nextStep();
    } else {
      alert("Submit Registration");
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center items-center p-8">
      <div className="w-full max-w-7xl bg-white rounded-3xl shadow-xl overflow-hidden">

        {/* HEADER */}
        <div className="bg-blue-600 p-8">
          <h1 className="text-4xl font-bold text-white">
            Worker Registration
          </h1>

          <p className="text-blue-100 mt-2">
            Complete your profile to apply for livelihood services.
          </p>
        </div>

        {/* BODY */}
        <div className="p-10">
          <StepIndicator currentStep={step} />

          <div className="mt-12 min-h-[500px]">
            {step === 1 && <PersonalInformation />}
            {step === 2 && <EducationalBackground />}
            {step === 3 && <WorkExperience />}
            {step === 4 && <SkillsCertification />}
            {step === 5 && <Documents />}
            {step === 6 && <Confirmation />}
          </div>

          <div className="flex justify-between mt-10">
            <button
              disabled={step === 1}
              onClick={prevStep}
              className="px-8 py-3 rounded-xl border hover:bg-gray-100 disabled:opacity-40"
            >
              Previous
            </button>

            <button
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl"
            >
              {step === 6 ? "Submit" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}