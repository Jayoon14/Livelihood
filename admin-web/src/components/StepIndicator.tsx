import {
  User,
  GraduationCap,
  Briefcase,
  Wrench,
  FileText,
  Check,
} from "lucide-react";

type Props = {
  currentStep: number;
  completedSteps?: number[];
};

const steps = [
  {
    label: "Personal",
    icon: User,
  },
  {
    label: "Education",
    icon: GraduationCap,
  },
  {
    label: "Work",
    icon: Briefcase,
  },
  {
    label: "Skills",
    icon: Wrench,
  },
  {
    label: "Documents",
    icon: FileText,
  },
  {
    label: "Review",
    icon: Check,
  },
];

export default function StepIndicator({
  currentStep,
  completedSteps = [],
}: Props) {
  return (
    <div className="w-full mb-10">
      <div className="flex justify-between items-center relative">

        {steps.map((step, index) => {
          const stepNumber = index + 1;

          const completed =
            completedSteps.includes(stepNumber);

          const current =
            currentStep === stepNumber;

          const Icon = step.icon;

          return (
            <div
              key={step.label}
              className="flex-1 flex flex-col items-center relative z-10"
            >
              {/* Line */}
              {index !== steps.length - 1 && (
                <div
                  className={`absolute top-6 left-1/2 w-full h-1
                  ${
                    completed
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                />
              )}

              {/* Circle */}
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center border-4 transition-all duration-300

                ${
                  completed
                    ? "bg-green-500 border-green-500 text-white"
                    : current
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg scale-110"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {completed ? (
                  <Check size={24} />
                ) : (
                  <Icon size={22} />
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-3 text-sm font-medium

                ${
                  completed
                    ? "text-green-600"
                    : current
                    ? "text-blue-600"
                    : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}