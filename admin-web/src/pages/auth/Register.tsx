import { useNavigate } from "react-router-dom";
import { useRegisterStore } from "../../store/registerStore";
import { submitWorkerRegistration } from "../../services/registerWorkerService";

import StepIndicator from "../../components/StepIndicator";

import PersonalInformation from "./register/PersonalInformation";
import EducationalBackground from "./register/EducationalBackground";
import WorkExperience from "./register/WorkExperience";
import SkillsCertification from "./register/SkillsCertification";
import Documents from "./register/Documents";
import Confirmation from "./register/Confirmation";

export default function Register() {
  const navigate = useNavigate();

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

    if (!data.email.trim()) errors.email = "Email is required";

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
      alert(Object.values(errors)[0]);

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
      alert(Object.values(errors)[0]);

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
      alert(Object.values(errors)[0]);

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
      alert(Object.values(errors)[0]);

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
      alert(Object.values(errors)[0]);

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

    try {
      console.log("Birth Date:", data.birthDate);
      console.log("Submitting Data:", data);

      await submitWorkerRegistration(data);

      alert(
        "Registration submitted successfully!\nPlease log in to your account.",
      );

      reset();

      navigate("/");
    } catch (error: any) {
      alert(error.message || "Registration failed.");
    }
  }

  return (
    <div
      className="
      min-h-screen
      bg-slate-100
      flex
      justify-center
      items-center
      p-8
    "
    >
      <div
        className="
        w-full
        max-w-7xl
        bg-white
        rounded-3xl
        shadow-xl
        overflow-hidden
      "
      >
        <div
          className="
          bg-blue-600
          p-8
        "
        >
          <h1
            className="
            text-4xl
            font-bold
            text-white
          "
          >
            Worker Registration
          </h1>

          <p
            className="
            text-blue-100
            mt-2
          "
          >
            Complete your profile to apply for livelihood services.
          </p>
        </div>

        <div className="p-10">
          <StepIndicator currentStep={step} completedSteps={completedSteps} />

          <div
            className="
            mt-8
            min-h-[500px]
          "
          >
            {step === 1 && <PersonalInformation />}

            {step === 2 && <EducationalBackground />}

            {step === 3 && <WorkExperience />}

            {step === 4 && <SkillsCertification />}

            {step === 5 && <Documents />}

            {step === 6 && <Confirmation />}
          </div>

          <div
            className="
            flex
            justify-between
            mt-8
          "
          >
            <button
              type="button"
              disabled={step === 1}
              onClick={prevStep}
              className="
                px-8
                py-3
                rounded-xl
                border
                hover:bg-gray-100
                disabled:opacity-40
              "
            >
              Previous
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="
                bg-blue-600
                hover:bg-blue-700
                text-white
                px-10
                py-3
                rounded-xl
              "
            >
              {step === 6 ? "Submit" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
