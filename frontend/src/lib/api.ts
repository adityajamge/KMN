import type { Booking, Plan, Registrant, UpgradeRecord } from "./types";

const base = (import.meta.env.VITE_API_URL || "http://localhost:4001").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Seats = { core: number; comprehensive: number };

export type PaymentOrder = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
};

export type PaymentOrderRequest =
  | { kind: "registration"; bookingId: string }
  | { kind: "upgrade"; participantIds: string[] };

export type PaymentConfirm = PaymentOrderRequest & {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type PaymentResult =
  | { kind: "registration"; booking: Booking; seatsLeft: Seats }
  | { kind: "upgrade"; upgrade: UpgradeRecord; bookings: Booking[]; seatsLeft: Seats };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers,
      credentials: path.startsWith("/api/admin") ? "include" : "same-origin",
    });
  } catch {
    throw new ApiError(0, "The registration server is not running.");
  }
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new ApiError(response.status, data.error || "Request failed.");
  return data as T;
}

export const api = {
  seats: () => request<Seats>("/api/seats"),
  createBooking: (plan: Plan, people: Registrant[]) =>
    request<{ booking: Booking; seatsLeft: Seats }>("/api/bookings", {
      method: "POST",
      body: JSON.stringify({ plan, people }),
    }),
  getBooking: (id: string) => request<Booking>(`/api/bookings/${id}`),
  lookup: (code: string, phone?: string) => {
    const query = new URLSearchParams({ code });
    if (phone) query.set("phone", phone);
    return request<{ booking: Booking; participantId: string }>(`/api/lookup?${query.toString()}`);
  },
  getParticipant: (id: string) => request<{ booking: Booking }>(`/api/participants/${id}`),
  getUpgrade: (id: string) => request<{ upgrade: UpgradeRecord; bookings: Booking[] }>(`/api/upgrades/${id}`),
  createPaymentOrder: (body: PaymentOrderRequest) =>
    request<PaymentOrder>("/api/payments/order", { method: "POST", body: JSON.stringify(body) }),
  confirmPayment: (body: PaymentConfirm) =>
    request<PaymentResult>("/api/payments/confirm", { method: "POST", body: JSON.stringify(body) }),
  adminSession: () => request<{ status: "setup" | "login" | "ok" }>("/api/admin/session"),
  adminSetupQr: () => request<{ qr: string }>("/api/admin/setup"),
  adminSetup: (code: string) => request<{ ok: true }>("/api/admin/setup", { method: "POST", body: JSON.stringify({ code }) }),
  adminLogin: (code: string) => request<{ ok: true }>("/api/admin/login", { method: "POST", body: JSON.stringify({ code }) }),
  adminLogout: () => request<{ ok: true }>("/api/admin/logout", { method: "POST" }),
  adminState: () => request<{ bookings: Booking[]; upgrades: UpgradeRecord[] }>("/api/admin/state"),
  checkIn: (id: string, checkedIn: boolean) =>
    request<{ booking: Booking }>(`/api/admin/participants/${id}/check-in`, {
      method: "PATCH",
      body: JSON.stringify({ checkedIn }),
    }),
  attendance: (id: string, day: string, mark?: "P" | "L" | "") =>
    request<{ booking: Booking }>(`/api/admin/participants/${id}/attendance`, {
      method: "PATCH",
      body: JSON.stringify({ day, mark }),
    }),
};
