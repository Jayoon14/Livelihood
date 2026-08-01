const REMEMBER_KEY = "livelihoodgo.rememberMe";
const REMEMBERED_EMAIL_KEY = "livelihoodgo.rememberedEmail";

export function getRememberPreference(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === "true";
}

export function setRememberPreference(remember: boolean): void {
  localStorage.setItem(REMEMBER_KEY, String(remember));

  if (!remember) {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  }
}

export function getRememberedEmail(): string {
  return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
}

export function saveRememberedEmail(email: string): void {
  localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
}

export const hybridAuthStorage = {
  getItem(key: string): string | null {
    const preferredStorage = getRememberPreference()
      ? localStorage
      : sessionStorage;

    return (
      preferredStorage.getItem(key) ??
      localStorage.getItem(key) ??
      sessionStorage.getItem(key)
    );
  },

  setItem(key: string, value: string): void {
    const remember = getRememberPreference();
    const targetStorage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;

    targetStorage.setItem(key, value);
    otherStorage.removeItem(key);
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};
