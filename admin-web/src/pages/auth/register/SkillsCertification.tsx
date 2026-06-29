    import { useState } from "react";

const skills = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Welder",
  "Painter",
  "Mason",
  "Mechanic",
  "Driver",
  "Tailoring",
  "Computer Literate",
];

export default function SkillsCertification() {

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const toggleSkill = (skill: string) => {

    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }

  };

  return (

    <div>

      <h2 className="text-2xl font-bold mb-8">
        Skills & Certifications
      </h2>

      <div className="grid grid-cols-2 gap-4">

        {skills.map((skill) => (

          <label
            key={skill}
            className="flex items-center gap-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
          >

            <input
              type="checkbox"
              checked={selectedSkills.includes(skill)}
              onChange={() => toggleSkill(skill)}
            />

            {skill}

          </label>

        ))}

      </div>

    </div>

  );

}