import { Check, Languages } from "lucide-react";
import { toast } from "sonner";

import {
  useLanguage,
  type AppLanguage,
} from "../../../context/LanguageContext";

const LANGUAGE_OPTIONS: Array<{
  value: AppLanguage;
  labelKey: string;
  nativeLabel: string;
}> = [
  {
    value: "en",
    labelKey: "settings.language.english",
    nativeLabel: "English",
  },
  {
    value: "fil",
    labelKey: "settings.language.filipino",
    nativeLabel: "Filipino",
  },
];

export default function LanguageSettings() {
  const { language, setLanguage, t } = useLanguage();

  function handleLanguageChange(nextLanguage: AppLanguage) {
    if (nextLanguage === language) {
      return;
    }

    setLanguage(nextLanguage);

    toast.success(
      nextLanguage === "fil"
        ? "Napaltan na ang wika sa Filipino."
        : "Language changed to English.",
    );
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor="app-language"
        className="text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        {t("settings.language.label")}
      </label>

      <div className="relative">
        <Languages
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <select
          id="app-language"
          value={language}
          onChange={(event) =>
            handleLanguageChange(
              event.target.value as AppLanguage,
            )
          }
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-11 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)} — {option.nativeLabel}
            </option>
          ))}
        </select>

        <Check
          size={18}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500"
        />
      </div>

      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        {language === "fil"
          ? "Agad na magbabago ang mga tekstong nakakonekta sa translation system."
          : "Text connected to the translation system changes immediately."}
      </p>
    </div>
  );
}