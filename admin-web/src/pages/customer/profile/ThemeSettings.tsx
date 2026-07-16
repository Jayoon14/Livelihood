import { useEffect, useState } from "react";

export default function ThemeSettings() {

  const [theme, setTheme] = useState("light");


  useEffect(() => {

    const saved = localStorage.getItem("theme");


    if (saved) {

      setTheme(saved);

      document.documentElement.setAttribute(
        "data-theme",
        saved
      );

    }

  }, []);



  function changeTheme(value: string) {

    setTheme(value);

    localStorage.setItem(
      "theme",
      value
    );


    document.documentElement.setAttribute(
      "data-theme",
      value
    );

  }



  return (

    <div className="bg-white rounded-2xl shadow p-6">


      <h2 className="text-xl font-bold mb-5">
        Theme
      </h2>



      <select
        value={theme}
        onChange={(e) =>
          changeTheme(e.target.value)
        }
        className="border rounded-lg p-3 w-full"
      >

        <option value="light">
          ☀️ Light
        </option>


        <option value="dark">
          🌙 Dark
        </option>


      </select>


    </div>

  );

}