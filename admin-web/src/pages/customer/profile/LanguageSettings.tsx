import { useState } from "react";

export default function LanguageSettings() {
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "en",
  );

  function save(value: string) {
    setLanguage(value);

    localStorage.setItem("language", value);

    alert("Language saved.");
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold mb-5">Language</h2>

      <select
        value={language}
        onChange={(e) => save(e.target.value)}
        className="border rounded-lg p-3 w-full"
      >
        <option value="en">English</option>

        <option value="fil">Filipino</option>
      </select>
    </div>
  );
}
