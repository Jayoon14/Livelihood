import { useState } from "react";

export default function EducationalBackground() {
  const [form, setForm] = useState({
    highestEducation: "",
    elementary: "",
    secondary: "",
    seniorHigh: "",
    college: "",
    course: "",
    yearGraduated: "",
    tesda: "",
    prc: "",
    trainings: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div>

      <h2 className="text-2xl font-bold mb-8">
        Educational Background
      </h2>

      <div className="grid grid-cols-2 gap-6">

        <Input
          label="Highest Educational Attainment"
          name="highestEducation"
          value={form.highestEducation}
          onChange={handleChange}
        />

        <Input
          label="Elementary School"
          name="elementary"
          value={form.elementary}
          onChange={handleChange}
        />

        <Input
          label="Secondary School"
          name="secondary"
          value={form.secondary}
          onChange={handleChange}
        />

        <Input
          label="Senior High School"
          name="seniorHigh"
          value={form.seniorHigh}
          onChange={handleChange}
        />

        <Input
          label="College"
          name="college"
          value={form.college}
          onChange={handleChange}
        />

        <Input
          label="Course"
          name="course"
          value={form.course}
          onChange={handleChange}
        />

        <Input
          label="Year Graduated"
          name="yearGraduated"
          value={form.yearGraduated}
          onChange={handleChange}
        />

        <Input
          label="TESDA"
          name="tesda"
          value={form.tesda}
          onChange={handleChange}
        />

        <Input
          label="PRC License"
          name="prc"
          value={form.prc}
          onChange={handleChange}
        />

        <div className="col-span-2">

          <label className="block mb-2 font-medium">
            Trainings / Seminars
          </label>

          <textarea
            name="trainings"
            value={form.trainings}
            onChange={(e) =>
              setForm({
                ...form,
                trainings: e.target.value,
              })
            }
            rows={5}
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-600"
          />

        </div>

      </div>

    </div>
  );
}

type InputProps = {
  label: string;
  name: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
};

function Input({
  label,
  name,
  value,
  onChange,
}: InputProps) {
  return (
    <div>

      <label className="block mb-2 font-medium">
        {label}
      </label>

      <input
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-600"
      />

    </div>
  );
}