import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ApiError, api } from "../lib/api";
import type { PaymentConfirm, PaymentResult } from "../lib/api";
import { CAPACITY } from "../lib/constants";
import { digits } from "../lib/format";
import type { Booking, Checkout, Participant, Plan, Registrant, UpgradeRecord } from "../lib/types";

const CHECKOUT_KEY = "kmn-checkout";

export type StoreError = { error: string };

type Match = { booking: Booking; participant: Participant };
type Seats = { core: number; comprehensive: number };

export function readCheckout(): Checkout | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Checkout;
    if (parsed.kind === "registration" && parsed.bookingId) return parsed;
    if (parsed.kind === "upgrade" && Array.isArray(parsed.participantIds)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function writeCheckout(checkout: Checkout | null) {
  if (!checkout) sessionStorage.removeItem(CHECKOUT_KEY);
  else sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(checkout));
}

export function occupiesSeat(booking: Booking, now = Date.now()) {
  if (booking.status === "paid") return true;
  if (!booking.holdUntil) return false;
  return new Date(booking.holdUntil).getTime() > now;
}

export function seatsUsed(plan: Plan, bookings: Booking[], now = Date.now()) {
  let count = 0;
  for (const booking of bookings) {
    if (!occupiesSeat(booking, now)) continue;
    for (const person of booking.participants) {
      if (plan === "core" && booking.plan === "core") count += 1;
      if (plan === "comprehensive" && person.programme === "comprehensive") count += 1;
    }
  }
  return count;
}

function mergeBooking(bookings: Booking[], booking: Booking) {
  const previous = bookings.find((row) => row.id === booking.id);
  const participants = booking.participants.map((person) => {
    const earlier = previous?.participants.find((row) => row.id === person.id);
    return { ...person, healthNote: person.healthNote || earlier?.healthNote || "" };
  });
  return [{ ...booking, participants }, ...bookings.filter((row) => row.id !== booking.id)];
}

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type StoreValue = {
  bookings: Booking[];
  upgrades: UpgradeRecord[];
  connectionError: string;
  adminLoaded: boolean;
  seatsReady: boolean;
  seatsLeft: (plan: Plan) => number;
  bookingById: (id: string) => Booking | undefined;
  upgradeById: (id: string) => UpgradeRecord | undefined;
  participantById: (id: string) => Match | undefined;
  findByCode: (code: string, phone?: string) => Match | undefined;
  refreshAdmin: () => Promise<void>;
  loadBooking: (id: string) => Promise<Booking | undefined>;
  loadParticipant: (id: string) => Promise<Booking | undefined>;
  loadUpgrade: (id: string) => Promise<UpgradeRecord | undefined>;
  lookupCode: (code: string, phone?: string) => Promise<Match | undefined>;
  createHold: (plan: Plan, people: Registrant[]) => Promise<Booking | StoreError>;
  completePayment: (payment: PaymentConfirm) => Promise<PaymentResult | StoreError>;
  setCheckIn: (id: string, checkedIn: boolean) => Promise<void>;
  toggleAttendance: (id: string, day: string) => Promise<void>;
};

const EventContext = createContext<StoreValue | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [upgrades, setUpgrades] = useState<UpgradeRecord[]>([]);
  const [seats, setSeats] = useState<Seats>({ core: CAPACITY, comprehensive: CAPACITY });
  const [connectionError, setConnectionError] = useState("");
  const [adminLoaded, setAdminLoaded] = useState(false);
  const [seatsReady, setSeatsReady] = useState(false);

  const rememberSeats = useCallback((next: Seats) => setSeats(next), []);

  useEffect(() => {
    let live = true;
    const pull = async () => {
      try {
        const next = await api.seats();
        if (!live) return;
        setSeats(next);
        setSeatsReady(true);
        setConnectionError("");
      } catch (error) {
        if (!live) return;
        setConnectionError(message(error, "The registration server is not running."));
      }
    };
    void pull();
    const timer = window.setInterval(() => { void pull(); }, 20000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, []);

  const loadBooking = useCallback(async (id: string) => {
    try {
      const booking = await api.getBooking(id);
      setBookings((current) => mergeBooking(current, booking));
      setConnectionError("");
      return booking;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return undefined;
      setConnectionError(message(error, "The registration server is not running."));
      return undefined;
    }
  }, []);

  const loadParticipant = useCallback(async (id: string) => {
    try {
      const data = await api.getParticipant(id);
      setBookings((current) => mergeBooking(current, data.booking));
      setConnectionError("");
      return data.booking;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return undefined;
      setConnectionError(message(error, "The registration server is not running."));
      return undefined;
    }
  }, []);

  const loadUpgrade = useCallback(async (id: string) => {
    try {
      const data = await api.getUpgrade(id);
      setUpgrades((current) => [data.upgrade, ...current.filter((row) => row.id !== data.upgrade.id)]);
      setBookings((current) => data.bookings.reduce(mergeBooking, current));
      setConnectionError("");
      return data.upgrade;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return undefined;
      setConnectionError(message(error, "The registration server is not running."));
      return undefined;
    }
  }, []);

  const lookupCode = useCallback(async (code: string, phone?: string) => {
    try {
      const data = await api.lookup(code, phone);
      setBookings((current) => mergeBooking(current, data.booking));
      const participant = data.booking.participants.find((person) => person.id === data.participantId);
      if (!participant) return undefined;
      setConnectionError("");
      return { booking: data.booking, participant };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return undefined;
      throw error;
    }
  }, []);

  const refreshAdmin = useCallback(async () => {
    try {
      const data = await api.adminState();
      setBookings(data.bookings);
      setUpgrades(data.upgrades);
      setAdminLoaded(true);
      setConnectionError("");
    } catch (error) {
      setConnectionError(message(error, "The event desk could not reach the server."));
    }
  }, []);

  const createHold = useCallback(async (plan: Plan, people: Registrant[]) => {
    try {
      const data = await api.createBooking(plan, people);
      setBookings((current) => mergeBooking(current, data.booking));
      rememberSeats(data.seatsLeft);
      setConnectionError("");
      return data.booking;
    } catch (error) {
      return { error: message(error, "The seats could not be held.") };
    }
  }, [rememberSeats]);

  const completePayment = useCallback(async (payment: PaymentConfirm) => {
    try {
      const data = await api.confirmPayment(payment);
      if (data.kind === "registration") setBookings((current) => mergeBooking(current, data.booking));
      if (data.kind === "upgrade") {
        setUpgrades((current) => [data.upgrade, ...current.filter((row) => row.id !== data.upgrade.id)]);
        setBookings((current) => data.bookings.reduce(mergeBooking, current));
      }
      rememberSeats(data.seatsLeft);
      setConnectionError("");
      return data;
    } catch (error) {
      return { error: message(error, "The payment could not be recorded.") };
    }
  }, [rememberSeats]);

  const setCheckIn = useCallback(async (id: string, checkedIn: boolean) => {
    try {
      const data = await api.checkIn(id, checkedIn);
      setBookings((current) => mergeBooking(current, data.booking));
      setConnectionError("");
    } catch (error) {
      setConnectionError(message(error, "Check-in could not be saved."));
    }
  }, []);

  const toggleAttendance = useCallback(async (id: string, day: string) => {
    try {
      const data = await api.attendance(id, day);
      setBookings((current) => mergeBooking(current, data.booking));
      setConnectionError("");
    } catch (error) {
      setConnectionError(message(error, "Attendance could not be saved."));
    }
  }, []);

  const value = useMemo<StoreValue>(() => ({
    bookings,
    upgrades,
    connectionError,
    adminLoaded,
    seatsReady,
    seatsLeft: (plan) => seats[plan],
    bookingById: (id) => bookings.find((booking) => booking.id === id),
    upgradeById: (id) => upgrades.find((upgrade) => upgrade.id === id),
    participantById: (id) => {
      for (const booking of bookings) {
        const participant = booking.participants.find((person) => person.id === id);
        if (participant) return { booking, participant };
      }
      return undefined;
    },
    findByCode: (code, phone) => {
      const wanted = code.trim().toUpperCase();
      if (!wanted) return undefined;
      for (const booking of bookings) {
        for (const participant of booking.participants) {
          if (participant.code.toUpperCase() !== wanted) continue;
          if (phone && digits(phone) !== digits(participant.whatsapp)) return undefined;
          return { booking, participant };
        }
      }
      return undefined;
    },
    refreshAdmin,
    loadBooking,
    loadParticipant,
    loadUpgrade,
    lookupCode,
    createHold,
    completePayment,
    setCheckIn,
    toggleAttendance,
  }), [
    bookings, upgrades, connectionError, adminLoaded, seatsReady, seats,
    refreshAdmin, loadBooking, loadParticipant, loadUpgrade, lookupCode,
    createHold, completePayment, setCheckIn, toggleAttendance,
  ]);

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvent() {
  const value = useContext(EventContext);
  if (!value) throw new Error("useEvent must be used inside EventProvider");
  return value;
}

export function useBooking(id: string | undefined) {
  const { loadBooking, bookingById } = useEvent();
  const booking = id ? bookingById(id) : undefined;
  const [settledId, setSettledId] = useState(booking ? id : undefined);
  useEffect(() => {
    if (!id) return;
    let live = true;
    loadBooking(id).finally(() => { if (live) setSettledId(id); });
    return () => { live = false; };
  }, [id, loadBooking]);
  return { booking, ready: !id || Boolean(booking) || settledId === id };
}

export function useUpgrade(id: string | undefined) {
  const { loadUpgrade, upgradeById } = useEvent();
  const upgrade = id ? upgradeById(id) : undefined;
  const [settledId, setSettledId] = useState(upgrade ? id : undefined);
  useEffect(() => {
    if (!id) return;
    let live = true;
    loadUpgrade(id).finally(() => { if (live) setSettledId(id); });
    return () => { live = false; };
  }, [id, loadUpgrade]);
  return { upgrade, ready: !id || Boolean(upgrade) || settledId === id };
}
