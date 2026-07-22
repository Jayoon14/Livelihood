export interface PaymentForm {
  accept_cash: boolean;

  enable_gcash: boolean;
  gcash_name: string;
  gcash_number: string;
  gcash_qr: string;

  enable_maya: boolean;
  maya_name: string;
  maya_number: string;
  maya_qr: string;

  enable_bank: boolean;
  bank_name: string;
  account_name: string;
  account_number: string;
  card_expiration: string;
  bank_qr: string;
}

export const defaultPaymentForm: PaymentForm = {
  accept_cash: true,

  enable_gcash: false,
  gcash_name: "",
  gcash_number: "",
  gcash_qr: "",

  enable_maya: false,
  maya_name: "",
  maya_number: "",
  maya_qr: "",

  enable_bank: false,
  bank_name: "",
  account_name: "",
  account_number: "",
  card_expiration: "",
  bank_qr: "",
};