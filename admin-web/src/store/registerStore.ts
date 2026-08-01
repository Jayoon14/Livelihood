import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface RegisterData {
  profilePicture: File | null;

  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;

  birthDate: string;
  gender: string;
  civilStatus: string;
  religion: string;

  phone: string;
  email: string;

  password: string;
  confirmPassword: string;

  houseNo: string;
  street: string;
  barangay: string;
  municipality: string;
  province: string;

  highestEducation: string;
  otherEducation: string;

  elementary: string;
  secondary: string;
  seniorHigh: string;
  college: string;
  course: string;
  yearGraduated: string;

  juniorHighDiploma?: File | null;
  seniorHighDiploma?: File | null;
  collegeDiploma?: File | null;
  mastersDiploma?: File | null;
  doctorateDiploma?: File | null;

  tesda: string;
  prc: string;
  trainings: string;

  company: string;
  position: string;
  employmentStatus: string;
  startDate: string;
  endDate: string;
  description: string;

  noWorkExperience: boolean;

  skills: string[];

  validId?: File | null;
  resume?: File | null;
  tesdaCertificate?: File | null;
  barangayClearance?: File | null;
  policeClearance?: File | null;
  nbiClearance?: File | null;
}

interface RegisterStore {
  step: number;
  data: RegisterData;
  completedSteps: number[];
  errors: Record<string, string>;
  editingFromReview: boolean;

  setEditingFromReview: (value: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  completeStep: (step: number) => void;
  updateData: (values: Partial<RegisterData>) => void;
  setErrors: (errors: Record<string, string>) => void;
  clearError: (field: string) => void;
  reset: () => void;
}

type PersistedRegisterState = {
  step: number;
  data: Partial<RegisterData>;
  completedSteps: number[];
  editingFromReview: boolean;
};

const MAX_STEP = 6;

const initialData: RegisterData = {
  profilePicture: null,

  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",

  birthDate: "",
  gender: "",
  civilStatus: "",
  religion: "",

  phone: "",
  email: "",

  password: "",
  confirmPassword: "",

  houseNo: "",
  street: "",
  barangay: "",
  municipality: "",
  province: "Laguna",

  highestEducation: "",
  otherEducation: "",

  elementary: "",
  secondary: "",
  seniorHigh: "",
  college: "",
  course: "",
  yearGraduated: "",

  juniorHighDiploma: null,
  seniorHighDiploma: null,
  collegeDiploma: null,
  mastersDiploma: null,
  doctorateDiploma: null,

  tesda: "",
  prc: "",
  trainings: "",

  company: "",
  position: "",
  employmentStatus: "",
  startDate: "",
  endDate: "",
  description: "",

  noWorkExperience: false,

  skills: [],

  validId: null,
  resume: null,
  tesdaCertificate: null,
  barangayClearance: null,
  policeClearance: null,
  nbiClearance: null,
};

/**
 * Returns only values that are safe to serialize.
 *
 * Passwords are intentionally excluded for security.
 * File objects are intentionally excluded because JSON/sessionStorage
 * cannot restore real File objects after a page reload.
 */
function getPersistableData(data: RegisterData): Partial<RegisterData> {
  return {
    firstName: data.firstName,
    middleName: data.middleName,
    lastName: data.lastName,
    suffix: data.suffix,

    birthDate: data.birthDate,
    gender: data.gender,
    civilStatus: data.civilStatus,
    religion: data.religion,

    phone: data.phone,
    email: data.email,

    houseNo: data.houseNo,
    street: data.street,
    barangay: data.barangay,
    municipality: data.municipality,
    province: data.province,

    highestEducation: data.highestEducation,
    otherEducation: data.otherEducation,

    elementary: data.elementary,
    secondary: data.secondary,
    seniorHigh: data.seniorHigh,
    college: data.college,
    course: data.course,
    yearGraduated: data.yearGraduated,

    tesda: data.tesda,
    prc: data.prc,
    trainings: data.trainings,

    company: data.company,
    position: data.position,
    employmentStatus: data.employmentStatus,
    startDate: data.startDate,
    endDate: data.endDate,
    description: data.description,

    noWorkExperience: data.noWorkExperience,
    skills: data.skills,
  };
}

export const useRegisterStore = create<RegisterStore>()(
  persist(
    (set) => ({
      step: 1,
      data: { ...initialData },
      completedSteps: [],
      errors: {},
      editingFromReview: false,

      setEditingFromReview: (value) =>
        set({
          editingFromReview: value,
        }),

      nextStep: () =>
        set((state) => ({
          step: Math.min(MAX_STEP, state.step + 1),
        })),

      prevStep: () =>
        set((state) => ({
          step: Math.max(1, state.step - 1),
        })),

      goToStep: (step) =>
        set({
          step: Math.min(MAX_STEP, Math.max(1, step)),
        }),

      completeStep: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step].sort((a, b) => a - b),
        })),

      updateData: (values) =>
        set((state) => ({
          data: {
            ...state.data,
            ...values,
          },
        })),

      setErrors: (errors) =>
        set({
          errors,
        }),

      clearError: (field) =>
        set((state) => {
          const newErrors = { ...state.errors };
          delete newErrors[field];

          return {
            errors: newErrors,
          };
        }),

      reset: () =>
        set({
          step: 1,
          editingFromReview: false,
          completedSteps: [],
          errors: {},
          data: { ...initialData },
        }),
    }),
    {
      name: "livelihoodgo-worker-registration-draft",

      /**
       * sessionStorage keeps the draft after:
       * - Alt + Tab
       * - switching browser tabs
       * - accidental refresh
       * - temporary browser tab suspension
       *
       * It is cleared when the browser tab/session is fully closed.
       * Change sessionStorage to localStorage if you want the draft
       * to remain even after closing and reopening the browser.
       */
      storage: createJSONStorage(() => sessionStorage),

      version: 1,

      partialize: (state): PersistedRegisterState => ({
        step: state.step,
        data: getPersistableData(state.data),
        completedSteps: state.completedSteps,
        editingFromReview: state.editingFromReview,
      }),

      merge: (persistedState, currentState) => {
        const persisted = persistedState as
          | PersistedRegisterState
          | undefined;

        if (!persisted) {
          return currentState;
        }

        return {
          ...currentState,
          step: Math.min(
            MAX_STEP,
            Math.max(1, persisted.step ?? currentState.step),
          ),
          completedSteps: Array.isArray(persisted.completedSteps)
            ? persisted.completedSteps
            : currentState.completedSteps,
          editingFromReview:
            persisted.editingFromReview ??
            currentState.editingFromReview,
          data: {
            ...initialData,
            ...persisted.data,

            // Never restore passwords from browser storage.
            password: "",
            confirmPassword: "",

            // File inputs must be selected again after a real reload.
            profilePicture: null,
            juniorHighDiploma: null,
            seniorHighDiploma: null,
            collegeDiploma: null,
            mastersDiploma: null,
            doctorateDiploma: null,
            validId: null,
            resume: null,
            tesdaCertificate: null,
            barangayClearance: null,
            policeClearance: null,
            nbiClearance: null,
          },
          errors: {},
        };
      },
    },
  ),
);