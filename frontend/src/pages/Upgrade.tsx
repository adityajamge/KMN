import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BusyButton } from "../components/BusyButton";
import { Bone } from "../components/Skeleton";
import { TopBar } from "../components/SiteChrome";
import { writeCheckout, useEvent } from "../data/store";
import { ARRIVE, CALL_URL, CORE_FEE, FULL_FEE, FULL_POINTS, SESSION_TIME, SUPPORT_PHONE, UPGRADE_DATES, UPGRADE_HOLD, VENUE_FULL, WHATSAPP_URL } from "../lib/constants";
import { inr, maskPhone, upgradePrice, validPhone } from "../lib/format";

type Extra = { key: string; name: string; code: string; phone: string; participantId: string; status: "" | "ok" | "bad" };

export default function Upgrade() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const codeParam = params.get("c") ?? "";
  const { findByCode, bookingById, lookupCode, participantById } = useEvent();
  const [manual, setManual] = useState(!codeParam);
  const [looking, setLooking] = useState(Boolean(codeParam));
  const linked = findByCode(codeParam);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [checked, setChecked] = useState<"" | "ok" | "bad">("");
  const [manualId, setManualId] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [extras, setExtras] = useState<Extra[]>([]);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeConsent, setAgreeConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState<string | null>(null);
  const checkLock = useRef(false);

  useEffect(() => {
    if (!codeParam) return;
    let live = true;
    lookupCode(codeParam)
      .then((match) => {
        if (!live) return;
        if (!match) setManual(true);
      })
      .catch((error: unknown) => {
        if (!live) return;
        setManual(true);
        setMessage(error instanceof Error ? error.message : "The registration server is not running.");
      })
      .finally(() => { if (live) setLooking(false); });
    return () => { live = false; };
  }, [codeParam, lookupCode]);

  const owner = manual
    ? (manualId ? participantById(manualId) : undefined)
    : linked;
  const booking = owner ? bookingById(owner.booking.id) : undefined;
  const family = useMemo(() => {
    if (manual || !booking || !owner) return [];
    return booking.participants.filter((person) => person.id !== owner.participant.id && !person.upgraded && person.code);
  }, [manual, booking, owner]);

  const selectedFamily = family.filter((person) => picked[person.id]);
  const readyExtras = extras.filter((extra) => extra.status === "ok");
  const ids = [
    ...(owner && !owner.participant.upgraded && owner.booking.status === "paid" && owner.booking.plan === "core" ? [owner.participant.id] : []),
    ...selectedFamily.map((person) => person.id),
    ...readyExtras.map((extra) => extra.participantId),
  ];
  const uniqueIds = [...new Set(ids)];
  const price = upgradePrice(Math.max(uniqueIds.length, 1));
  const codesReady = manual ? checked === "ok" : Boolean(owner);
  const extrasReady = extras.every((extra) => extra.status === "ok");
  const blocked = !(codesReady && extrasReady && agreeTerms && agreeConsent && uniqueIds.length > 0);

  const checkManual = async () => {
    if (checkLock.current) return;
    checkLock.current = true;
    setChecking("manual");
    try {
      const match = await lookupCode(code, phone);
      if (!match || match.booking.status !== "paid" || match.booking.plan !== "core" || match.participant.upgraded) {
        setChecked("bad");
        setManualId("");
        setMessage(match?.participant.upgraded ? "This Core booking is already upgraded." : "");
        return;
      }
      setChecked("ok");
      setManualId(match.participant.id);
      setMessage("");
    } catch (error) {
      setChecked("bad");
      setManualId("");
      setMessage(error instanceof Error ? error.message : "The registration server is not running.");
    } finally {
      checkLock.current = false;
      setChecking(null);
    }
  };

  const checkExtra = async (key: string) => {
    const extra = extras.find((row) => row.key === key);
    if (!extra || checkLock.current) return;
    checkLock.current = true;
    setChecking(key);
    try {
      const match = await lookupCode(extra.code, extra.phone);
      const ok = Boolean(match && match.booking.status === "paid" && match.booking.plan === "core" && !match.participant.upgraded);
      setExtras((current) => current.map((row) => (
        row.key === key
          ? { ...row, status: ok ? "ok" : "bad", participantId: ok && match ? match.participant.id : "" }
          : row
      )));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The registration server is not running.");
    } finally {
      checkLock.current = false;
      setChecking(null);
    }
  };

  const continuePay = () => {
    if (blocked) {
      setMessage(!codesReady || !extrasReady ? "Check each invitation code to continue." : "Tick both boxes above to continue.");
      return;
    }
    writeCheckout({ kind: "upgrade", participantIds: uniqueIds });
    navigate("/pay");
  };

  return (
    <div className="page-light">
      <TopBar action={<span className="eyebrow">For Core participants</span>} />
      <section className="upgrade-hero">
        <div className="narrow stack">
          <p className="eyebrow">After your 4 mornings</p>
          <h1 className="display">You’ve felt the shift. Now make it yours.</h1>
          <p>Continue into the full 120-day Comprehensive program, in the same hall and the same morning slot. Your ₹{inr(CORE_FEE)} Core fee is already counted.</p>
          <div className="upgrade-price">
            <span className="eyebrow">Comprehensive · 120 days</span>
            <span className="strike num">₹{inr(FULL_FEE)}</span>
            <strong className="num">₹{inr(FULL_FEE - CORE_FEE)} <span>+ 18% GST per person</span></strong>
            <span>Your ₹{inr(CORE_FEE)} Core fee comes off</span>
            <span>Continues from Day 5, {UPGRADE_DATES}, then 90 days of practice</span>
            <span>{SESSION_TIME}, same batch · arrive {ARRIVE}</span>
            <span>{VENUE_FULL}</span>
            <strong>Your seat is kept until {UPGRADE_HOLD}.</strong>
          </div>
          <a className="btn btn-primary" href="#upgrade">Continue to the Comprehensive program</a>
        </div>
      </section>
      <section className="section-fresh">
        <div className="narrow stack">
          <p className="eyebrow" style={{ color: "var(--primary)" }}>What the next 116 days add</p>
          <h2 className="display" style={{ fontSize: 32 }}>From a good start to a trained mind</h2>
          <ul className="upgrade-points">
            {FULL_POINTS.map((point) => <li key={point}>{point === "30 mornings at the centre, then 90 days of guided self-practice with the Shadanga Kriya app" ? "26 more mornings at the centre, then 90 days of guided self-practice with the Shadanga Kriya app" : point}</li>)}
          </ul>
          <p className="hint">Training, not treatment. Results vary with daily practice.</p>
        </div>
      </section>
      <div className="narrow pad-lg stack" id="upgrade">
        <div className="form-card">
          <h2 style={{ fontWeight: 500 }}>Continue my practice</h2>
          <p className="hint">{looking ? "Checking your Core booking…" : manual ? "Enter the invitation code and WhatsApp number from your Core booking. We match them so your ₹499 is counted." : "Your details are filled in from your Core booking. Check them, tick the boxes and pay."}</p>
          {!manual && looking && !owner && (
            <div className="verified" aria-busy="true">
              <Bone block width="46%" />
              <Bone block width="72%" />
              <Bone block width="38%" />
              <Bone block width="64%" />
              <Bone block width="48%" />
            </div>
          )}
          {!manual && owner && (
            <div className="verified">
              <div className="split"><strong>Person 1</strong><span className="badge-paid">Verified</span></div>
              <strong>{owner.participant.name}</strong>
              <span className="hint">From your Core booking</span>
              <span>Invitation code</span>
              <span className="num">{owner.participant.code}</span>
              <span>WhatsApp</span>
              <span>{maskPhone(owner.participant.whatsapp)}</span>
              {owner.participant.upgraded && <p className="bad">This booking is already on Comprehensive.</p>}
              <button type="button" className="btn-text" onClick={() => setManual(true)}>Not you? Enter details by hand</button>
            </div>
          )}
          {!manual && family.length > 0 && (
            <div className="stack-sm">
              <strong>Also on your Core booking</strong>
              <p className="hint">Tick anyone who is continuing with you.</p>
              {family.map((person) => (
                <label className="check" key={person.id}>
                  <input type="checkbox" checked={Boolean(picked[person.id])} onChange={() => setPicked((current) => ({ ...current, [person.id]: !current[person.id] }))} />
                  <span>{person.name}<small style={{ display: "block" }} className="num">{person.code}</small></span>
                </label>
              ))}
            </div>
          )}
          {manual && (
            <div className="stack-sm">
              <strong>Person 1</strong>
              <label className="field">Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="As on your Core booking" /></label>
              <label className="field">Core invitation code<input value={code} onChange={(event) => { setCode(event.target.value.toUpperCase()); setChecked(""); }} placeholder="SK-NGP01-B01-XXXX" /></label>
              <label className="field">WhatsApp number used for Core<input value={phone} onChange={(event) => { setPhone(event.target.value); setChecked(""); setManualId(""); }} placeholder="+91" inputMode="tel" /></label>
              <BusyButton className="btn btn-primary" busy={checking === "manual"} disabled={checking !== null || !validPhone(phone) || code.trim().length < 4} onClick={() => { void checkManual(); }}>Check my code</BusyButton>
              {checked === "ok" && <p className="ok">Matched with Core booking · ₹499 will be counted</p>}
              {checked === "bad" && <p className="bad">This code and WhatsApp number don’t match our records. Check both, or <a href={WHATSAPP_URL}>message us</a>.</p>}
              <p className="hint">We match the code with the WhatsApp number on your Core booking, so no one else can use it.</p>
            </div>
          )}
          {extras.map((extra, index) => (
            <div className="person" key={extra.key}>
              <header><strong>Person {index + 2} · another booking</strong><button type="button" onClick={() => setExtras((current) => current.filter((item) => item.key !== extra.key))}>Remove</button></header>
              <label className="field">Full name<input value={extra.name} onChange={(event) => setExtras((current) => current.map((item) => item.key === extra.key ? { ...item, name: event.target.value, status: "" } : item))} placeholder="As on their Core booking" /></label>
              <label className="field">Core invitation code<input value={extra.code} onChange={(event) => setExtras((current) => current.map((item) => item.key === extra.key ? { ...item, code: event.target.value.toUpperCase(), status: "" } : item))} placeholder="SK-NGP01-B01-XXXX" /></label>
              <label className="field">WhatsApp number used for Core<input value={extra.phone} onChange={(event) => setExtras((current) => current.map((item) => item.key === extra.key ? { ...item, phone: event.target.value, status: "" } : item))} placeholder="+91" /></label>
              <BusyButton className="btn btn-ghost" busy={checking === extra.key} disabled={checking !== null || !validPhone(extra.phone) || extra.code.trim().length < 4} onClick={() => { void checkExtra(extra.key); }}>Check code</BusyButton>
              {extra.status === "ok" && <p className="ok">Matched with Core booking · ₹499 will be counted</p>}
              {extra.status === "bad" && <p className="bad">This code and WhatsApp number don’t match our records. Check both, or <a href={WHATSAPP_URL}>message us</a>.</p>}
            </div>
          ))}
          <button type="button" className="btn btn-ghost" onClick={() => setExtras((current) => [...current, { key: crypto.randomUUID(), name: "", code: "", phone: "", participantId: "", status: "" }])}>+ Add someone from another booking</button>
          <p className="hint">The fee is per person. Each person’s ₹499 is counted once their code is matched.</p>
          <div className="split"><span>Comprehensive × {uniqueIds.length || 0}</span><span className="num">₹{inr(uniqueIds.length ? price.gross : 0)}</span></div>
          <div className="split"><span>Core fee already paid</span><span className="num">– ₹{inr(uniqueIds.length ? price.credit : 0)}</span></div>
          <div className="split"><span>GST (18%)</span><span className="num">₹{inr(uniqueIds.length ? price.gst : 0)}</span></div>
          <div className="total-row"><span>Total to pay</span><strong className="num">₹{inr(uniqueIds.length ? price.total : 0)}</strong></div>
          <div className="agreements">
            <span className="hint">Once for this booking, on behalf of everyone listed above</span>
            <label className="agree"><input type="checkbox" checked={agreeTerms} onChange={(event) => setAgreeTerms(event.target.checked)} /><span>I agree to the <Link to="/terms">Terms & Conditions</Link>.</span></label>
            <label className="agree"><input type="checkbox" checked={agreeConsent} onChange={(event) => setAgreeConsent(event.target.checked)} /><span>I have read and agree to the <Link to="/consent">Consent Form</Link>.</span></label>
          </div>
          {message && <p className="form-error">{message}</p>}
          <button type="button" className="btn btn-primary" disabled={blocked} onClick={continuePay}>Continue to payment · ₹{inr(uniqueIds.length ? price.total : 0)}</button>
          <p className="hint">{!codesReady || !extrasReady ? "Check each invitation code to continue." : !agreeTerms || !agreeConsent ? "Tick both boxes above to continue." : `${UPGRADE_DATES} · UPI, cards, netbanking`}</p>
        </div>
        <div className="stack-sm">
          <h2 className="display" style={{ fontSize: 36 }}>Before you decide</h2>
          <p><strong>Do my 4 Core mornings count?</strong><br />Yes. You continue from Day 5 with the same batch, and your ₹499 comes off the fee.</p>
          <p><strong>What if I don’t continue?</strong><br />That’s completely fine. You keep the breathing and relaxation routine you learned, and you can practise on your own.</p>
          <p><strong>Can I talk to someone first?</strong><br />Of course. Call or WhatsApp the sales team at {SUPPORT_PHONE} and we’ll answer before you pay.</p>
          <a className="btn btn-primary" href={CALL_URL}>Call the team</a>
          <a className="btn btn-ghost" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp the team</a>
        </div>
      </div>
    </div>
  );
}
