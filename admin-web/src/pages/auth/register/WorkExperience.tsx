import { useState } from "react";

export default function WorkExperience() {
  const [form, setForm] = useState({
    company: "",
    position: "",
    employmentStatus: "",
    startDate: "",
    endDate: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-8">
        Work Experience
      </h2>

      <div className="grid grid-cols-2 gap-6">

        <Input
          label="Company"
          name="company"
          value={form.company}
          onChange={handleChange}
        />

        <Input
          label="Position"
          name="position"
          value={form.position}
          onChange={handleChange}
        />

        <Select
          label="Employment Status"
          name="employmentStatus"
          value={form.employmentStatus}
          onChange={handleChange}
          options={[
            "Full Time",
            "Part Time",
            "Contract",
            "Self Employed",
          ]}
        />

        <Input
          type="date"
          label="Start Date"
          name="startDate"
          value={form.startDate}
          onChange={handleChange}
        />

        <Input
          type="date"
          label="End Date"
          name="endDate"
          value={form.endDate}
          onChange={handleChange}
        />

        <div className="col-span-2">
          <label className="block mb-2 font-medium">
            Job Description
          </label>

          <textarea
            rows={5}
            name="description"
            value={form.description}
            onChange={handleChange}
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
  type?: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
};

function Input({
  label,
  name,
  value,
  type = "text",
  onChange,
}: InputProps) {
  return (
    <div>
      <label className="block mb-2 font-medium">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-600"
      />
    </div>
  );
}

type SelectProps = {
  label: string;
  name: string;
  value: string;
  options: string[];
  onChange: (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => void;
};

function Select({
  label,
  name,
  value,
  options,
  onChange,
}: SelectProps) {
  return (
    <div>
      <label className="block mb-2 font-medium">
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border rounded-lg p-3"
      >
        <option value="">Select</option>

        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}