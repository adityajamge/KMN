export type Plan = "core" | "comprehensive";
export type PayStatus = "paid" | "unpaid";

export type Participant = {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  city: string;
  area: string;
  role: string;
  age: number;
  goals: string[];
  healthNote: string;
  relation: string;
  guardianName: string;
  guardianPhone: string;
  code: string;
  isPayer: boolean;
  programme: Plan;
  upgraded: boolean;
  checkedIn: boolean;
  attendance: string[];
};

export type Booking = {
  id: string;
  plan: Plan;
  status: PayStatus;
  createdAt: string;
  holdUntil: string | null;
  invoiceNo: string;
  paymentRef: string;
  subtotal: number;
  gst: number;
  total: number;
  participants: Participant[];
};

export type UpgradeRecord = {
  id: string;
  status: PayStatus;
  createdAt: string;
  participantIds: string[];
  gross: number;
  credit: number;
  gst: number;
  total: number;
  invoiceNo: string;
  paymentRef: string;
};

export type Registrant = {
  name: string;
  whatsapp: string;
  email: string;
  city: string;
  area: string;
  role: string;
  age: number;
  goals: string[];
  healthNote: string;
  relation: string;
  guardianName: string;
  guardianPhone: string;
};

export type Checkout =
  | { kind: "registration"; bookingId: string }
  | { kind: "upgrade"; participantIds: string[] };

export type EventState = {
  bookings: Booking[];
  upgrades: UpgradeRecord[];
  nextInvoice: number;
};
