import { CORE_FEE, FULL_FEE, GST_RATE } from "./constants";
import type { Plan } from "./types";

export function inr(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: value % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function withGst(subtotal: number) {
  const gst = Math.round(subtotal * GST_RATE * 100) / 100;
  const total = Math.round((subtotal + gst) * 100) / 100;
  return { subtotal, gst, total };
}

export function registrationPrice(plan: Plan, count: number) {
  const unit = plan === "core" ? CORE_FEE : FULL_FEE;
  const subtotal = unit * count;
  if (plan === "core") return { unit, subtotal, gst: 0, total: subtotal };
  return { unit, ...withGst(subtotal) };
}

export function upgradePrice(count: number) {
  const gross = FULL_FEE * count;
  const credit = CORE_FEE * count;
  const net = withGst(gross - credit);
  return { gross, credit, subtotal: gross - credit, gst: net.gst, total: net.total };
}

export function digits(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

export function validPhone(phone: string) {
  return digits(phone).length === 10;
}

export function maskPhone(phone: string) {
  const last = digits(phone).slice(-4);
  return last ? `+91 •••••• ${last}` : phone;
}

export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export function planLabel(plan: Plan, upgraded = false) {
  if (upgraded) return "Comprehensive · from Day 5";
  return plan === "core" ? "Core · 4 mornings" : "Comprehensive · 30 mornings + 90 days";
}

export function planDates(plan: Plan, upgraded = false) {
  if (upgraded) return "28 Nov – 23 Dec (then 90 days of guided self-practice)";
  return plan === "core" ? "24 – 27 Nov" : "24 Nov – 23 Dec (then 90 days of self-practice)";
}
