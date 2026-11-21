import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BusyButton } from "../components/BusyButton";
import { LandingStory, LifeStages } from "./LandingStory";
import { Bone } from "../components/Skeleton";
import { GstNote, SiteFooter, TopBar } from "../components/SiteChrome";
import { writeCheckout, useEvent } from "../data/store";
import {
  CORE_DATES,
  CORE_FEE,
  CORE_POINTS,
  FAQS,
  FULL_DATES,
  FULL_FEE,
  FULL_POINTS,
  GOALS,
  LANGUAGE,
  CALL_URL,
  EMAIL_URL,
  MAP_URL,
  PROGRAM_NAME,
  RELATIONS,
  ROLES,
  SESSION_TIME,
  SUPPORT_PHONE,
  SHIFTS,
  VENUE_FULL,
  VENUE_SHORT,
  WHATSAPP_URL,
} from "../lib/constants";
import { inr, registrationPrice, validEmail, validPhone } from "../lib/format";
import type { Plan, Registrant } from "../lib/types";

type Extra = {
  key: string;
  name: string;
  whatsapp: string;
  email: string;
  city: string;
  area: string;
  role: string;
  age: string;
  goals: string[];
  health: boolean;
  healthNote: string;
  relation: string;
};

const emptyExtra = (): Extra => ({
  key: crypto.randomUUID(),
  name: "",
  whatsapp: "",
  email: "",
  city: "",
  area: "",
  role: "Student",
  age: "",
  goals: [],
  health: false,
  healthNote: "",
  relation: "",
});

function toggleItem(list: string[], item: string) {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

export default function Landing() {
  const navigate = useNavigate();
  const { createHold, seatsLeft, seatsReady, connectionError } = useEvent();
  const [plan, setPlan] = useState<Plan>("core");
  const [playing, setPlaying] = useState(false);
  const [faq, setFaq] = useState(-1);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [role, setRole] = useState<string>(ROLES[0]);
  const [age, setAge] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [health, setHealth] = useState(false);
  const [healthNote, setHealthNote] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [people, setPeople] = useState<Extra[]>([]);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeConsent, setAgreeConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [holding, setHolding] = useState(false);
  const holdLock = useRef(false);

  const coreLeft = seatsLeft("core");
  const fullLeft = seatsLeft("comprehensive");
  const isCore = plan === "core";
  const price = isCore ? CORE_FEE : FULL_FEE;
  const dates = isCore ? CORE_DATES : FULL_DATES;
  const ageNumber = Number(age);
  const guardianAdded = people.some((person) => person.relation === "Parent" || person.relation === "Guardian");
  const showGuardian = age !== "" && ageNumber > 0 && ageNumber < 18 && !guardianAdded;
  const headCount = 1 + people.length;
  const quote = registrationPrice(plan, headCount);

  const patchExtra = (key: string, patch: Partial<Extra>) => {
    setPeople((current) => current.map((person) => (person.key === key ? { ...person, ...patch } : person)));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter the full name.";
    if (!validPhone(whatsapp)) next.whatsapp = "Enter a 10-digit WhatsApp number.";
    if (!validEmail(email)) next.email = "Enter a valid email.";
    if (!city.trim()) next.city = "Enter the city.";
    if (!area.trim()) next.area = "Enter the area.";
    if (!ageNumber || ageNumber < 12 || ageNumber > 110) next.age = "Enter an age from 12 to 110.";
    if (showGuardian) {
      if (!guardianName.trim()) next.guardianName = "Enter the parent or guardian’s name.";
      if (!validPhone(guardianPhone)) next.guardianPhone = "Enter the guardian’s phone number.";
      if (!guardianConsent) next.guardianConsent = "Guardian consent is required.";
    }
    people.forEach((person) => {
      if (!person.name.trim()) next[`${person.key}-name`] = "Enter their name.";
      if (!person.relation) next[`${person.key}-relation`] = "Choose how they are related.";
      if (!validPhone(person.whatsapp)) next[`${person.key}-whatsapp`] = "Enter a 10-digit WhatsApp number.";
      if (!validEmail(person.email)) next[`${person.key}-email`] = "Enter a valid email.";
      if (!person.city.trim() || !person.area.trim()) next[`${person.key}-place`] = "Enter city and area.";
      const theirAge = Number(person.age);
      if (!theirAge || theirAge < 12 || theirAge > 110) next[`${person.key}-age`] = "Enter an age from 12 to 110.";
    });
    if (!agreeTerms || !agreeConsent) next.agree = "Tick both boxes to continue.";
    setErrors(next);
    if (Object.keys(next).length) {
      setFormError("Please complete the fields marked above.");
      return;
    }

    const registrants: Registrant[] = [
      {
        name, whatsapp, email, city, area, role, age: ageNumber, goals,
        healthNote: health ? healthNote : "",
        relation: "",
        guardianName: showGuardian ? guardianName : "",
        guardianPhone: showGuardian ? guardianPhone : "",
      },
      ...people.map((person) => ({
        name: person.name,
        whatsapp: person.whatsapp,
        email: person.email,
        city: person.city,
        area: person.area,
        role: person.role,
        age: Number(person.age),
        goals: person.goals,
        healthNote: person.health ? person.healthNote : "",
        relation: person.relation,
        guardianName: "",
        guardianPhone: "",
      })),
    ];
    if (holdLock.current) return;
    holdLock.current = true;
    setHolding(true);
    try {
      const result = await createHold(plan, registrants);
      if ("error" in result) {
        setFormError(result.error);
        return;
      }
      writeCheckout({ kind: "registration", bookingId: result.id });
      navigate("/pay");
    } finally {
      holdLock.current = false;
      setHolding(false);
    }
  };

  return (
    <div>
      <TopBar action={<a className="btn btn-primary" href="#choose">Book seat</a>} />
      <section className="hero">
        <div className="ripples" aria-hidden="true"><span /><span /><span /><span /></div>
        <div className="wrap hero-grid">
          <div className="stack">
            <p className="eyebrow">Shadanga Kriya · {PROGRAM_NAME}</p>
            <h1 className="display">Your mind isn't weak,<br /><span>just never trained.</span></h1>
            <p className="hindi" lang="hi">आपका मन कमज़ोर नहीं है। उसे कभी train ही नहीं किया गया।</p>
            <p className="lede">Guided meditation that trains concentration, awareness, calmness, confidence, emotional regulation and decisiveness, building the clarity to decide your way of life. Experience it in person, every morning, in Nagpur.</p>
            <div className="tabs" role="tablist" aria-label="Choose a plan">
              <button type="button" className={isCore ? "on" : ""} onClick={() => setPlan("core")}>
                <strong>Core · 4 days</strong>
                <span className="num">₹{inr(CORE_FEE)}</span>
              </button>
              <button type="button" className={!isCore ? "on" : ""} onClick={() => setPlan("comprehensive")}>
                <strong>Comprehensive · 120 days</strong>
                <span className="num">₹{inr(FULL_FEE)} + 18% GST <span className="emi">| EMI opt. Avl.</span></span>
              </button>
            </div>
            <p>{isCore ? `Start here. Four mornings for ₹${inr(CORE_FEE)}, and you’ll know from your own experience whether this is for you.` : "The complete transformation: 30 guided mornings, then 90 days of guided practice with the Shadanga Kriya app until it becomes yours."}</p>
            <div className="info-grid">
              <Info label="Dates" value={dates} />
              <Info label="Every morning" value={SESSION_TIME} />
              <Info label="Duration" value={isCore ? "4 mornings" : "30 days + 90 days"} />
              <Info label="Venue" value={VENUE_SHORT} />
              <Info label="Language" value={LANGUAGE} />
              <Info label="Fee" value={isCore ? `₹${inr(price)}` : `₹${inr(price)} + 18% GST`} />
            </div>
            <div className="cta-row">
              <a className="btn btn-primary" href="#choose">{isCore ? "Book my 4 mornings" : "Join the Comprehensive program"} · <GstNote amount={inr(price)} gst={!isCore} /></a>
              <p>{isCore ? "Book in about a minute and pay securely. Under 18? A parent books for you." : "30 guided mornings, then 90 days of guided practice with the Shadanga Kriya app until it becomes yours. EMI available on selected banks."}</p>
            </div>
          </div>
          <Video playing={playing} setPlaying={setPlaying} />
        </div>
      </section>

      <LifeStages />

      <section className="section-dark">
        <div className="wrap stack">
          <p className="eyebrow">Heavy to light</p>
          <h2 className="display" style={{ fontSize: "clamp(34px, 4vw, 52px)", color: "#fff" }}>What changes when you train the mind</h2>
          <p style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>Same you. Same busy day. Training turns the noise into a steady flow.</p>
          <div className="wave-card">
            <div className="wave-labels">
              <div><span>Without training</span><small>Scattered · reactive</small></div>
              <div><span>With practice</span><small>Steady · clear</small></div>
            </div>
            <svg viewBox="0 0 1200 220" preserveAspectRatio="none" role="img" aria-label="A disturbed, jagged frequency wave on the left that flows into a smooth, steady wave on the right">
              <defs>
                <linearGradient id="skwd" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#C7A7FF" stopOpacity="0.45" />
                  <stop offset="0.45" stopColor="#8F5BFF" stopOpacity="0.85" />
                  <stop offset="1" stopColor="#FFFFFF" />
                </linearGradient>
              </defs>
              <path fill="none" stroke="url(#skwd)" strokeWidth="1.2" strokeOpacity="0.45" d="M0 110 C 40 40, 70 180, 110 90 S 180 30, 220 150 S 280 200, 330 80 S 400 20, 460 160 S 540 40, 600 120 C 700 150, 820 90, 980 100 S 1120 130, 1200 110" />
              <path fill="none" stroke="url(#skwd)" strokeWidth="2.4" strokeLinecap="round" d="M0 130 C 30 20, 55 190, 90 40 S 140 210, 180 50 S 230 180, 280 70 S 340 200, 400 60 S 470 30, 530 150 S 590 40, 650 120 C 740 160, 860 80, 1000 95 S 1140 140, 1200 115" />
            </svg>
            <div className="wave-scale"><span>noise</span><span>breath by breath</span><span>flow</span></div>
          </div>
          <div className="compare">
            <header>Without training</header>
            <header>With practice</header>
            {SHIFTS.map(([before, after]) => (
              <div className="row" key={before}>
                <div className="before">{before}</div>
                <div className="after">{after}</div>
              </div>
            ))}
          </div>
          <p className="wave-note">This is practice. Experience at your own pace.</p>
        </div>
      </section>

      <LandingStory plan={plan} setPlan={setPlan} />

      <section className="section-fresh" id="choose">
        <div className="wrap stack" style={{ gap: 40 }}>
          <div className="center-copy">
            <p className="eyebrow" style={{ color: "var(--primary)" }}>{PROGRAM_NAME}</p>
            <h2 className="display">Your clearer mornings start here</h2>
            <p>Begin with four mornings for ₹{inr(CORE_FEE)}. If it speaks to you, continue into the full program. That’s how most people start, and how we’d like it.</p>
          </div>
          <div className="plan-grid">
            <PlanCard title="Core" selected={isCore} onSelect={() => setPlan("core")} badge="Recommended first step" detail={`4 mornings · ${SESSION_TIME}`} price={CORE_FEE} seats={seatLine(seatsReady, coreLeft)} points={CORE_POINTS} />
            <PlanCard title="Comprehensive" selected={!isCore} onSelect={() => setPlan("comprehensive")} badge="The complete training" dark detail="30 mornings + 90 days of guided practice · 120 days" price={FULL_FEE} gst seats={seatLine(seatsReady, fullLeft)} points={FULL_POINTS} />
          </div>

          <form className="form-card" onSubmit={submit}>
            <div>
              <span className="hint">Step 1 of 2 · about a minute</span>
              <h3 style={{ fontWeight: 500, fontSize: 22 }}>Book: {isCore ? "Core · 4 days" : "Comprehensive · 120 days"} <span className="num" style={{ color: "var(--primary)" }}>· ₹{inr(price)}{isCore ? "" : " + 18% GST"} per person</span></h3>
            </div>
            <span className="tag">{headCount === 1 ? "Booking for 1 person" : `Booking for ${headCount} people`}</span>
            <strong>Person 1 · You</strong>
            <div className="grid-3">
              <Field label="Full name" error={errors.name}><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" /></Field>
              <Field label="WhatsApp number" error={errors.whatsapp}><input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="+91" inputMode="tel" autoComplete="tel" /></Field>
              <Field label="Email" hint="(for your receipt and updates)" error={errors.email}><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" inputMode="email" autoComplete="email" /></Field>
            </div>
            <div className="grid-2">
              <Field label="City / location" error={errors.city}><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="e.g. Nagpur" /></Field>
              <Field label="Area / locality" error={errors.area}><input value={area} onChange={(event) => setArea(event.target.value)} placeholder="e.g. Manish Nagar" /></Field>
            </div>
            <div className="grid-2">
              <Field label="I am a"><select value={role} onChange={(event) => setRole(event.target.value)}>{ROLES.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Age" error={errors.age}><input value={age} onChange={(event) => setAge(event.target.value)} placeholder="e.g. 16" inputMode="numeric" /></Field>
            </div>
            {showGuardian && (
              <div className="guardian">
                <strong>You're under 18: add a parent or guardian</strong>
                <p className="hint">Is your parent joining too? Add them below with “Add more people” and you can skip this.</p>
                <div className="grid-2">
                  <Field label="Parent / guardian name" error={errors.guardianName}><input value={guardianName} onChange={(event) => setGuardianName(event.target.value)} placeholder="Full name" /></Field>
                  <Field label="Their phone number" error={errors.guardianPhone}><input value={guardianPhone} onChange={(event) => setGuardianPhone(event.target.value)} placeholder="+91" inputMode="tel" /></Field>
                </div>
                <label className="agree"><input type="checkbox" checked={guardianConsent} onChange={(event) => setGuardianConsent(event.target.checked)} />My parent or guardian agrees to my joining.</label>
                {errors.guardianConsent && <span className="form-error">{errors.guardianConsent}</span>}
              </div>
            )}
            <GoalPicker label="What are you looking for?" goals={goals} onToggle={(goal) => setGoals((current) => toggleItem(current, goal))} />
            <label className="agree"><input type="checkbox" checked={health} onChange={(event) => setHealth(event.target.checked)} />I have a health condition to tell the team about.</label>
            {health && <Field label="What health condition do you have?" hint="(private, only for the team)"><textarea value={healthNote} onChange={(event) => setHealthNote(event.target.value)} placeholder="e.g. asthma, high blood pressure, back pain, anxiety, pregnancy" /></Field>}

            {people.map((person, index) => (
              <div className="person" key={person.key}>
                <header>
                  <strong>Person {index + 2}</strong>
                  <button type="button" className="btn" style={{ minHeight: 40, background: "#fff", border: "1px solid rgba(10,10,10,.16)" }} onClick={() => setPeople((current) => current.filter((item) => item.key !== person.key))}>Remove</button>
                </header>
                <div className="grid-2">
                  <Field label="Full name" error={errors[`${person.key}-name`]}><input value={person.name} onChange={(event) => patchExtra(person.key, { name: event.target.value })} placeholder="Their name" /></Field>
                  <Field label="Relation to Person 1" error={errors[`${person.key}-relation`]}>
                    <select value={person.relation} onChange={(event) => patchExtra(person.key, { relation: event.target.value })}>
                      <option value="">Choose</option>
                      {RELATIONS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid-2">
                  <Field label="They are a"><select value={person.role} onChange={(event) => patchExtra(person.key, { role: event.target.value })}>{ROLES.map((item) => <option key={item}>{item}</option>)}</select></Field>
                  <Field label="Age" error={errors[`${person.key}-age`]}><input value={person.age} onChange={(event) => patchExtra(person.key, { age: event.target.value })} placeholder="Age" inputMode="numeric" /></Field>
                </div>
                <div className="grid-2">
                  <Field label="WhatsApp number" error={errors[`${person.key}-whatsapp`]}><input value={person.whatsapp} onChange={(event) => patchExtra(person.key, { whatsapp: event.target.value })} placeholder="+91" inputMode="tel" /></Field>
                  <Field label="Email" hint="(for their invitation and updates)" error={errors[`${person.key}-email`]}><input value={person.email} onChange={(event) => patchExtra(person.key, { email: event.target.value })} placeholder="name@example.com" /></Field>
                </div>
                <div className="grid-2">
                  <Field label="City / location" error={errors[`${person.key}-place`]}><input value={person.city} onChange={(event) => patchExtra(person.key, { city: event.target.value })} placeholder="e.g. Nagpur" /></Field>
                  <Field label="Area / locality"><input value={person.area} onChange={(event) => patchExtra(person.key, { area: event.target.value })} placeholder="e.g. Manish Nagar" /></Field>
                </div>
                <GoalPicker label="What are they looking for?" goals={person.goals} onToggle={(goal) => patchExtra(person.key, { goals: toggleItem(person.goals, goal) })} />
                <label className="agree"><input type="checkbox" checked={person.health} onChange={(event) => patchExtra(person.key, { health: event.target.checked })} />They have a health condition to tell the team about.</label>
                {person.health && <Field label="What health condition do they have?" hint="(private, only for the team)"><textarea value={person.healthNote} onChange={(event) => patchExtra(person.key, { healthNote: event.target.value })} placeholder="e.g. asthma, high blood pressure, back pain, anxiety, pregnancy" /></Field>}
              </div>
            ))}

            {people.length < 5 && (
              <button type="button" className="btn btn-ghost" onClick={() => setPeople((current) => [...current, emptyExtra()])}>+ Add more people</button>
            )}
            <p className="hint">Coming as a family? Add each person here. Everyone sits in the same batch, and each person gets their own invitation. The fee is per person.</p>
            <div className="agreements">
              <span className="hint">Once for this booking, on behalf of everyone listed above</span>
              <label className="agree"><input type="checkbox" checked={agreeTerms} onChange={(event) => setAgreeTerms(event.target.checked)} /><span>I agree to the <Link to="/terms">Terms & Conditions</Link>.</span></label>
              <label className="agree"><input type="checkbox" checked={agreeConsent} onChange={(event) => setAgreeConsent(event.target.checked)} /><span>I have read and agree to the <Link to="/consent">Consent Form</Link>.</span></label>
              {errors.agree && <span className="form-error">{errors.agree}</span>}
            </div>
            <div className="total-row">
              <span>{headCount === 1 ? "Total for 1 person" : `Total · ${headCount} people × ₹${inr(price)}`}</span>
              <strong className="num">₹{inr(quote.total)}{!isCore && <span style={{ fontSize: 12, fontWeight: 300 }}> incl. 18% GST</span>}</strong>
            </div>
            {connectionError && <p className="form-error">{connectionError}</p>}
            {formError && <p className="form-error">{formError}</p>}
            <BusyButton className="btn btn-primary" type="submit" busy={holding} disabled={!agreeTerms || !agreeConsent}>Continue to payment · ₹{inr(quote.total)}</BusyButton>
            {(!agreeTerms || !agreeConsent) && <p className="hint" style={{ textAlign: "center", color: "var(--primary)" }}>Tick both boxes above to continue.</p>}
            <span className="hint">UPI, cards, netbanking · Confirmation on WhatsApp</span>
            {!isCore && <p className="hint" style={{ textAlign: "center", color: "var(--primary)" }}>EMI available on selected banks · choose EMI on the payment page</p>}
            {!isCore && <p className="hint" style={{ textAlign: "center", color: "var(--primary)" }}>Already did Core? Use the personal upgrade link we send you on WhatsApp after Day 3, so your ₹{inr(CORE_FEE)} comes off.</p>}
          </form>
        </div>
      </section>

      <section className="section-white">
        <div className="wrap faq-layout">
          <div className="faq">
            <h2 className="display">Questions, answered</h2>
            {FAQS.map(([question, answer], index) => (
              <div className="faq-item" key={question}>
                <button type="button" aria-expanded={faq === index} onClick={() => setFaq(faq === index ? -1 : index)}>
                  {question}
                  <span className="sign">{faq === index ? "−" : "+"}</span>
                </button>
                {faq === index && <p>{answer}</p>}
              </div>
            ))}
          </div>
          <aside className="aside">
            <div className="pad">
              <h3 className="display">Still have a question?</h3>
              <p>Talk to a real person from the team. We reply the same day.</p>
              <a className="btn btn-light" href={CALL_URL}>Call us</a>
              <a className="btn btn-light" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
              <p style={{ color: "var(--lilac)", fontSize: 13 }}>{SUPPORT_PHONE} · call or WhatsApp the sales team</p>
              <a className="btn btn-line" href={EMAIL_URL}>Email us</a>
              <a className="btn btn-line" href={MAP_URL} target="_blank" rel="noopener noreferrer">Open venue in Maps</a>
              <p style={{ color: "var(--lilac)", fontSize: 13, lineHeight: 1.6 }}>{VENUE_FULL}</p>
            </div>
          </aside>
        </div>
      </section>
      <SiteFooter />
      <div className="sticky">
        <div className="wrap">
          <div>
            <div>{isCore ? "Core · 4 days" : "Comprehensive · 120 days"} · <span className="num">₹{inr(price)}{isCore ? "" : " + 18% GST"}</span></div>
            <small>{isCore ? "4 mornings" : "30 days + 90 days"} · {SESSION_TIME} · {dates}</small>
          </div>
          <a className="btn btn-primary" href="#choose">Book seat</a>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="info-card"><div><small>{label}</small><b>{value}</b></div></div>;
}

function Video({ playing, setPlaying }: { playing: boolean; setPlaying: (value: boolean) => void }) {
  return (
    <div className="video-card">
      <video
        poster="/media/founder.jpg"
        playsInline
        controls={playing}
        onPlay={() => setPlaying(true)}
        aria-label="What is Shadanga Kriya, in the founder's own words"
      >
        <source src="/media/founder.mp4" type="video/mp4" />
      </video>
      {!playing && (
        <button className="play" type="button" aria-label="Play video" onClick={(event) => {
          const video = event.currentTarget.parentElement?.querySelector("video");
          void video?.play();
          setPlaying(true);
        }}>
          <span className="play-orb" aria-hidden="true">▶</span>
          <span className="video-caption">
            <span className="eyebrow">Watch · 2:51</span>
            <span>What is Shadanga Kriya, in the founder's own words</span>
          </span>
        </button>
      )}
    </div>
  );
}

function seatLine(ready: boolean, left: number) {
  if (!ready) return <Bone width="16em" />;
  if (left > 0 && left <= 30) return `${left} ${left === 1 ? "seat" : "seats"} left in this batch`;
  return null;
}

function PlanCard({ title, selected, onSelect, badge, dark, detail, price, gst = false, seats, points }: { title: string; selected: boolean; onSelect: () => void; badge: string; dark?: boolean; detail: string; price: number; gst?: boolean; seats: ReactNode; points: string[] }) {
  return (
    <button type="button" className={selected ? "plan-card on" : "plan-card"} onClick={onSelect} aria-pressed={selected}>
      <span className="badge"><span className={dark ? "pill dark" : "pill"}>{badge}</span><span className="radio" /></span>
      <h3 className="display">{title}</h3>
      <span>{detail}</span>
      <span className="price num">₹{inr(price)}{gst && <span style={{ fontSize: 14, fontWeight: 300 }}> + 18% GST</span>}</span>
      {gst && <span className="hint">EMI available on selected banks</span>}
      {seats ? <span className="seats">{seats}</span> : null}
      <ul>{points.map((point) => <li key={point}><span aria-hidden="true">✓</span>{point}</li>)}</ul>
    </button>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label} {hint && <em>{hint}</em>}</span>
      {children}
      {error && <span className="err">{error}</span>}
    </label>
  );
}

function GoalPicker({ label, goals, onToggle }: { label: string; goals: string[]; onToggle: (goal: string) => void }) {
  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
      <legend style={{ fontWeight: 500, marginBottom: 8 }}>{label} <span className="hint">(choose any)</span></legend>
      <div className="checks">
        {GOALS.map((goal) => (
          <label className="check" key={goal}>
            <input type="checkbox" checked={goals.includes(goal)} onChange={() => onToggle(goal)} />
            {goal}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
