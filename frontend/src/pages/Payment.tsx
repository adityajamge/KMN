import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BusyButton } from "../components/BusyButton";
import { PaySkeleton } from "../components/Skeleton";
import { TopBar } from "../components/SiteChrome";
import { occupiesSeat, readCheckout, useBooking, useEvent, writeCheckout } from "../data/store";
import { api } from "../lib/api";
import { SESSION_TIME, UPGRADE_HOLD } from "../lib/constants";
import { firstName, formatClock, inr, planDates, planLabel, upgradePrice } from "../lib/format";
import { openRazorpay } from "../lib/razorpay";

export default function Payment() {
  const navigate = useNavigate();
  const checkout = readCheckout();
  const registrationId = checkout?.kind === "registration" ? checkout.bookingId : undefined;
  const { booking, ready } = useBooking(registrationId);
  const { completePayment, participantById, loadParticipant, connectionError } = useEvent();
  const [busy, setBusy] = useState(false);
  const payLock = useRef(false);
  const [error, setError] = useState("");
  const upgradeIds = checkout?.kind === "upgrade" ? checkout.participantIds : [];
  const upgradeKey = upgradeIds.join("|");
  const upgradeCached = upgradeIds.length > 0 && upgradeIds.every((id) => participantById(id));
  const [upgradeReady, setUpgradeReady] = useState(checkout?.kind !== "upgrade" || upgradeCached);
  const participantByIdRef = useRef(participantById);
  participantByIdRef.current = participantById;

  useEffect(() => {
    if (!upgradeKey) return;
    const ids = upgradeKey.split("|");
    if (!ids.every((id) => participantByIdRef.current(id))) setUpgradeReady(false);
    let live = true;
    Promise.all(ids.map((id) => loadParticipant(id))).finally(() => {
      if (live) setUpgradeReady(true);
    });
    return () => { live = false; };
  }, [upgradeKey, loadParticipant]);

  if (!checkout) {
    return (
      <div className="page-light">
        <TopBar />
        <div className="narrow pad-lg stack">
          <h1 className="display" style={{ fontSize: 42 }}>No payment in progress</h1>
          <Link className="btn btn-primary" to="/">Back to registration</Link>
        </div>
      </div>
    );
  }

  if (checkout.kind === "registration") {
    if (!ready) return <PaySkeleton kicker="Step 2 of 2" title="Pay for your seats" />;
    if (!booking) {
      return (
        <div className="page-light">
          <TopBar />
          <div className="narrow pad-lg stack">
            <h1 className="display" style={{ fontSize: 42 }}>{connectionError || "This hold has gone"}</h1>
            <p>Register again to take a new seat.</p>
            <Link className="btn btn-primary" to="/">Back to registration</Link>
          </div>
        </div>
      );
    }
    const held = occupiesSeat(booking);
    const pay = async () => {
      if (payLock.current) return;
      payLock.current = true;
      setBusy(true);
      setError("");
      try {
        const order = await api.createPaymentOrder({ kind: "registration", bookingId: booking.id });
        const outcome = await openRazorpay(order);
        if (outcome === "closed") {
          navigate("/pay/failed");
          return;
        }
        const result = await completePayment({ kind: "registration", bookingId: booking.id, ...outcome });
        if ("error" in result || result.kind !== "registration") {
          setError("error" in result ? result.error : "The payment could not be recorded.");
          return;
        }
        writeCheckout(null);
        navigate(`/booking/${result.booking.id}`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The payment could not be started.");
      } finally {
        payLock.current = false;
        setBusy(false);
      }
    };
    return (
      <div className="page-light">
        <TopBar />
        <div className="narrow pad-lg stack">
          <p className="hint">Step 2 of 2</p>
          <h1 className="display" style={{ fontSize: 46 }}>Pay for {firstName(booking.participants[0]?.name ?? "your seats")}</h1>
          <p>{planLabel(booking.plan)} · {planDates(booking.plan)} · {SESSION_TIME}</p>
          <div className="form-card">
            {booking.participants.map((person, index) => (
              <div className="split" key={person.id}>
                <span>{person.name || `Person ${index + 1}`}{index === 0 ? " · paying" : person.relation ? ` · ${person.relation}` : ""}</span>
                <span className="num">₹{inr(booking.subtotal / booking.participants.length)}</span>
              </div>
            ))}
            {booking.gst > 0 && <div className="split"><span>GST (18%)</span><span className="num">₹{inr(booking.gst)}</span></div>}
            <div className="total-row"><span>To pay</span><strong className="num">₹{inr(booking.total)}</strong></div>
            {booking.holdUntil && held && <p className="hint">Seats held until {formatClock(booking.holdUntil)}. No money is taken until you pay.</p>}
            {!held && booking.status !== "paid" && <p className="form-error">The 10-minute hold has ended. These seats are no longer reserved.</p>}
            {error && <p className="form-error">{error}</p>}
            <BusyButton className="btn btn-primary" busy={busy} disabled={!held} onClick={() => { void pay(); }}>{`Pay ₹${inr(booking.total)}`}</BusyButton>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => navigate("/pay/failed")}>Cancel payment</button>
            <p className="hint">Test mode. Razorpay opens next. No real money is taken.</p>
          </div>
        </div>
      </div>
    );
  }

  const people = checkout.participantIds
    .map((id) => participantById(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const price = upgradePrice(people.length || checkout.participantIds.length);
  const pay = async () => {
    if (payLock.current) return;
    payLock.current = true;
    setBusy(true);
    setError("");
    try {
      const order = await api.createPaymentOrder({ kind: "upgrade", participantIds: checkout.participantIds });
      const outcome = await openRazorpay(order);
      if (outcome === "closed") {
        navigate("/upgrade/failed");
        return;
      }
      const result = await completePayment({ kind: "upgrade", participantIds: checkout.participantIds, ...outcome });
      if ("error" in result || result.kind !== "upgrade") {
        setError("error" in result ? result.error : "The payment could not be recorded.");
        return;
      }
      writeCheckout(null);
      navigate(`/upgrade/confirmed/${result.upgrade.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The payment could not be started.");
    } finally {
      payLock.current = false;
      setBusy(false);
    }
  };

  if (!upgradeReady) return <PaySkeleton kicker="Upgrade payment" title="Continue to Comprehensive" />;

  return (
    <div className="page-light">
      <TopBar />
      <div className="narrow pad-lg stack">
        <p className="hint">Upgrade payment</p>
        <h1 className="display" style={{ fontSize: 46 }}>Continue to Comprehensive</h1>
        <div className="form-card">
          {people.map(({ participant }) => (
            <div className="split" key={participant.id}><span>{participant.name}</span><span className="num">{participant.code}</span></div>
          ))}
          <div className="split"><span>Comprehensive × {people.length}</span><span className="num">₹{inr(price.gross)}</span></div>
          <div className="split"><span>Core fee already paid</span><span className="num">– ₹{inr(price.credit)}</span></div>
          <div className="split"><span>GST (18%)</span><span className="num">₹{inr(price.gst)}</span></div>
          <div className="total-row"><span>To pay</span><strong className="num">₹{inr(price.total)}</strong></div>
          <p className="hint">Your seat is kept until {UPGRADE_HOLD}. Your Core booking stays as it is until this payment succeeds.</p>
          {error && <p className="form-error">{error}</p>}
          {connectionError && <p className="form-error">{connectionError}</p>}
          <BusyButton className="btn btn-primary" busy={busy} disabled={people.length === 0} onClick={() => { void pay(); }}>{`Pay ₹${inr(price.total)}`}</BusyButton>
          <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => navigate("/upgrade/failed")}>Cancel payment</button>
          <p className="hint">Test mode. Razorpay opens next. No real money is taken.</p>
        </div>
      </div>
    </div>
  );
}
