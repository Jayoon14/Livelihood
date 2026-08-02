import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppLanguage = "en" | "fil";

interface TranslationTree {
  [key: string]: string | TranslationTree;
}

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string, fallback?: string) => string;
}

const STORAGE_KEY = "livelihood-language";

const translations: Record<AppLanguage, TranslationTree> = {
  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      loading: "Loading...",
      logout: "Log out",
      settings: "Settings",
      success: "Success",
      error: "Error",
    },
    settings: {
      title: "Settings",
      subtitle:
        "Manage your account security, notification preferences, language, and appearance.",
      language: {
        title: "Language",
        description: "Select your preferred display language.",
        label: "Display language",
        english: "English",
        filipino: "Filipino",
        saved: "Language changed to English.",
      },
      appearance: {
        title: "Appearance",
        description: "Customize the visual theme of your account.",
      },
      accountSecurity: {
        title: "Account security",
        description: "Update your password and keep your account protected.",
      },
      notifications: {
        title: "Notification preferences",
        description: "Choose which alerts and updates you want to receive.",
      },
      dangerZone: {
        title: "Danger zone",
        description: "Permanently remove your account and associated data.",
        deleteAccount: "Delete account",
      },
      protected: "Account protected",
      logoutDescription:
        "You will need to sign in again to access your account.",
    },
    navigation: {
      dashboard: "Dashboard",
      findWorkers: "Find Workers",
      bookings: "My Bookings",
      favorites: "Favorites",
      trustedWorkers: "Trusted Workers",
      payments: "Payments",
      messages: "Messages",
      notifications: "Notifications",
      profile: "Profile",
    },
  },
  fil: {
    common: {
      save: "I-save",
      cancel: "Kanselahin",
      loading: "Naglo-load...",
      logout: "Mag-logout",
      settings: "Mga Setting",
      success: "Tagumpay",
      error: "May Error",
    },
    settings: {
      title: "Mga Setting",
      subtitle:
        "Pamahalaan ang seguridad ng account, mga notification, wika, at itsura ng system.",
      language: {
        title: "Wika",
        description: "Piliin ang wikang gagamitin sa system.",
        label: "Wika ng system",
        english: "Ingles",
        filipino: "Filipino",
        saved: "Napaltan na ang wika sa Filipino.",
      },
      appearance: {
        title: "Itsura",
        description: "Baguhin ang tema at itsura ng iyong account.",
      },
      accountSecurity: {
        title: "Seguridad ng account",
        description:
          "Palitan ang password at panatilihing ligtas ang iyong account.",
      },
      notifications: {
        title: "Mga notification",
        description:
          "Piliin kung aling mga alert at update ang gusto mong matanggap.",
      },
      dangerZone: {
        title: "Mapanganib na bahagi",
        description:
          "Permanenteng burahin ang iyong account at kaugnay na datos.",
        deleteAccount: "Burahin ang account",
      },
      protected: "Protektado ang account",
      logoutDescription:
        "Kailangan mong mag-login muli upang ma-access ang iyong account.",
    },
    navigation: {
      dashboard: "Dashboard",
      findWorkers: "Maghanap ng Worker",
      bookings: "Aking mga Booking",
      favorites: "Mga Paborito",
      trustedWorkers: "Mga Pinagkakatiwalaang Worker",
      payments: "Mga Bayad",
      messages: "Mga Mensahe",
      notifications: "Mga Notification",
      profile: "Profile",
    },
  },
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isAppLanguage(value: string | null): value is AppLanguage {
  return value === "en" || value === "fil";
}

function getInitialLanguage(): AppLanguage {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (isAppLanguage(saved)) {
    return saved;
  }

  return "en";
}

function getNestedTranslation(
  language: AppLanguage,
  key: string,
): string | null {
  const parts = key.split(".");
  let current: string | TranslationTree = translations[language];

  for (const part of parts) {
    if (
      typeof current !== "object" ||
      current === null ||
      !(part in current)
    ) {
      return null;
    }

    current = current[part];
  }

  return typeof current === "string" ? current : null;
}

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguageState] =
    useState<AppLanguage>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang =
      language === "fil" ? "fil" : "en";
  }, [language]);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    localStorage.setItem(STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      return (
        getNestedTranslation(language, key) ??
        getNestedTranslation("en", key) ??
        fallback ??
        key
      );
    },
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider.",
    );
  }

  return context;
}