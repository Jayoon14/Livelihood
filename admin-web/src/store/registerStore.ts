import { create } from "zustand";

interface RegisterData {
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
  elementary: string;
  secondary: string;
  seniorHigh: string;
  college: string;
  course: string;
  yearGraduated: string;
  tesda: string;
  prc: string;
  trainings: string;

  company: string;
  position: string;
  employmentStatus: string;
  startDate: string;
  endDate: string;
  description: string;

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

  nextStep: () => void;
  prevStep: () => void;

  completeStep: (step: number) => void;

  updateData: (values: Partial<RegisterData>) => void;

  reset: () => void;
}

export const useRegisterStore = create<RegisterStore>((set) => ({
  step: 1,

  data: {
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
    province: "",

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

    company: "",
    position: "",
    employmentStatus: "",
    startDate: "",
    endDate: "",
    description: "",

    skills: [],

    validId: null,
    resume: null,
    tesdaCertificate: null,
    barangayClearance: null,
    policeClearance: null,
    nbiClearance: null,
  },

  completedSteps: [],

  nextStep: () =>
    set((state) => ({
      step: state.step + 1,
    })),

  prevStep: () =>
    set((state) => ({
      step: state.step - 1,
    })),

  completeStep: (step) =>
    set((state) => ({
      completedSteps: state.completedSteps.includes(step)
        ? state.completedSteps
        : [...state.completedSteps, step],
    })),

  updateData: (values) =>
    set((state) => ({
      data: {
        ...state.data,
        ...values,
      },
    })),

  reset: () =>
    set(() => ({
      step: 1,
      completedSteps: [],
      data: {
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
        province: "",

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

        company: "",
        position: "",
        employmentStatus: "",
        startDate: "",
        endDate: "",
        description: "",

        skills: [],

        validId: null,
        resume: null,
        tesdaCertificate: null,
        barangayClearance: null,
        policeClearance: null,
        nbiClearance: null,
      },
    })),
}));