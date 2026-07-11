import { useRegisterStore } from "../../../store/registerStore";

const skills = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "Mason",
  "Welder",
  "Mechanic",
  "Driver",
  "Cook",
  "Gardener",
  "Tailor",
  "Housekeeper",
  "Aircon Technician",
  "Computer Technician",
  "Caregiver",
];

export default function SkillsCertification() {
  const {
    data,
    updateData,
    errors,
    clearError,
  } = useRegisterStore();

  function toggleSkill(skill: string) {
    if (data.skills.includes(skill)) {
      updateData({
        skills: data.skills.filter((item) => item !== skill),
      });
    } else {
      updateData({
        skills: [...data.skills, skill],
      });
    }

    clearError("skills");
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">
        Skills & Certifications
      </h2>

      <p className="text-gray-500 mb-6">
        Select all skills that apply.
      </p>

      <div className="grid grid-cols-3 gap-4">
        {skills.map((skill) => (
          <button
            key={skill}
            type="button"
            onClick={() => toggleSkill(skill)}
            className={`
              rounded-xl
              border
              p-4
              font-medium
              transition
              ${
                data.skills.includes(skill)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-gray-300 hover:bg-blue-50"
              }
            `}
          >
            {skill}
          </button>
        ))}
      </div>

      {errors.skills && (
        <p className="text-red-500 text-sm mt-4">
          {errors.skills}
        </p>
      )}

      <div className="mt-8">
        <h3 className="font-semibold mb-3">
          Selected Skills
        </h3>

        <div className="flex flex-wrap gap-3">
          {data.skills.map((skill) => (
            <div
              key={skill}
              className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full"
            >
              {skill}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}