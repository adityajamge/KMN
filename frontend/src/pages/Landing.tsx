import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BusyButton } from "../components/BusyButton";
import { LandingStory, LifeStages } from "./LandingStory";
import { Mark, Waterline } from "./marks";
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
  gender: string;
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
  gender: "",
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
  const [gender, setGender] = useState("");
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

  const feeNote = isCore ? "incl. GST" : "+ 18% GST";

  return (
    <div className="landing">
      <TopBar action={<a className="btn btn-primary" href="#choose">Book seat</a>} />
      <section className="hero">
        <div className="ripples" aria-hidden="true">
          <span /><span /><span /><span />
          <div className="ripple-glow" />
        </div>
        <div className="wrap hero-grid">
          <div className="stack">
            <p className="eyebrow">Shadanga Kriya · {PROGRAM_NAME}</p>
            <h1 className="display">Your mind isn't weak,<br /><span>just never trained.</span></h1>
            <p className="hindi" lang="hi">आपका मन कमज़ोर नहीं है। उसे कभी train ही नहीं किया गया।</p>
            <p className="lede">Guided meditation that trains concentration, awareness, calmness, confidence, emotional regulation and decisiveness, building the clarity to decide your way of life. Experience it in person, every morning, in Nagpur.</p>
            <div className="tabs" role="tablist" aria-label="Choose a plan">
              <button type="button" role="tab" aria-selected={isCore} className={isCore ? "on" : ""} onClick={() => setPlan("core")}>
                <strong>Core · 4 days</strong>
                <span className="num">₹{inr(CORE_FEE)}<span className="gst-bit">incl. GST</span></span>
              </button>
              <button type="button" role="tab" aria-selected={!isCore} className={!isCore ? "on" : ""} onClick={() => setPlan("comprehensive")}>
                <strong>Comprehensive · 30 days</strong>
                <span className="num">₹{inr(FULL_FEE)}<span className="gst-bit">+ 18% GST</span><span className="emi"><span className="pipe">|</span>EMI opt. Avl.</span></span>
              </button>
            </div>
            <p className="plan-blurb">{isCore ? `Start here. Four mornings for ₹${inr(CORE_FEE)}, and you’ll know from your own experience whether this is for you.` : "The complete training: 30 guided mornings at the centre, from 24 Nov to 23 Dec."}</p>
            <div className="info-grid">
              <Info label="Dates" value={dates} icon={<Mark stroke="var(--lilac)"><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Mark>} />
              <Info label="Every morning" value={SESSION_TIME} icon={<Mark stroke="var(--lilac)"><path d="M3 17h18M6 17a6 6 0 0 1 12 0M12 5v2M5.6 8.6l1.4 1.4M18.4 8.6L17 10M8 21h8" /></Mark>} />
              <Info label="Duration" value={isCore ? "4 mornings" : "30 mornings"} icon={<Mark stroke="var(--lilac)"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Mark>} />
              <Info label="Venue" value={VENUE_SHORT} icon={<Mark stroke="var(--lilac)"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></Mark>} />
              <Info label="Language" value={LANGUAGE} icon={<Mark stroke="var(--lilac)"><path d="M4 5h10M4 9h7M9 5c0 6-2.5 10-5 12M6.5 11c1.5 2 3.5 3.5 6 4.5M13 21l3.5-9 3.5 9M14.2 18h4.6" /></Mark>} />
              <Info label="Fee" value={<span className="num">₹{inr(price)}<span className="gst-bit">{feeNote}</span></span>} icon={<Mark stroke="var(--lilac)"><path d="M7 5h10M7 9h10M7 5c4 0 6 1.5 6 4s-2 4-6 4l7 6" /></Mark>} />
            </div>
            <div className="cta-row">
              <a className="btn btn-primary hero-cta" href="#choose">{isCore ? "Book my 4 mornings" : "Join the Comprehensive program"} · <GstNote amount={inr(price)} gst={!isCore} /></a>
              <p>{isCore ? "Book in about a minute and pay securely. Under 18? A parent books for you." : "30 guided mornings at the centre, 24 Nov to 23 Dec. EMI available on selected banks."}</p>
            </div>
          </div>
          <Video playing={playing} setPlaying={setPlaying} />
        </div>
        <Waterline to="night" />
      </section>

      <LifeStages />

      <section className="section-dark">
        <div className="wrap stack">
          <div className="dark-center">
            <p className="eyebrow">Heavy to light</p>
            <h2 className="display">What changes when you train the mind</h2>
            <p>Same you. Same busy day. Training turns the noise into a steady flow.</p>
          </div>
          <div className="wave-card">
            <div className="wave-labels">
              <div><span>Without training</span><small>Scattered · reactive</small></div>
              <div><span>With practice</span><small>Steady · clear</small></div>
            </div>
            <FrequencyWave />
            <div className="wave-scale"><span>noise</span><span>breath by breath</span><span>flow</span></div>
          </div>
          <div className="compare">
            <header>Without training</header>
            <header>With practice</header>
            {SHIFTS.map(([before, after]) => (
              <div className="row" key={before}>
                <div className="before"><Mark size={18} width={1.6} stroke="rgba(255,255,255,0.35)"><path d="M2 12l3-5 3 9 3-8 3 7 3-6 3 5 2-2" /></Mark><span>{before}</span></div>
                <div className="after"><span>{after}</span><Mark size={18} width={1.8} stroke="var(--lilac)"><path d="M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3.5-3 5-2" /></Mark></div>
              </div>
            ))}
          </div>
          <p className="wave-note">This is practice. Experience at your own pace.</p>
        </div>
      </section>

      <LandingStory plan={plan} setPlan={setPlan} />

      <section className="section-fresh choose" id="choose">
        <img className="choose-bg" src="/media/landing/choose-bg.jpg" alt="" />
        <div className="wrap stack choose-stack">
          <div className="center-copy">
            <p className="eyebrow" style={{ color: "var(--primary)" }}>{PROGRAM_NAME}</p>
            <h2 className="display">Your clearer mornings start here</h2>
            <p>Begin with four mornings for ₹{inr(CORE_FEE)}. If it speaks to you, continue into the full program. That’s how most people start, and how we’d like it.</p>
          </div>
          <div className="plan-grid">
            <PlanCard title="Core" selected={isCore} onSelect={() => setPlan("core")} badge="Recommended first step" detail={`4 mornings · ${SESSION_TIME}`} price={CORE_FEE} seats={seatLine(seatsReady, coreLeft)} points={CORE_POINTS} />
            <PlanCard title="Comprehensive" selected={!isCore} onSelect={() => setPlan("comprehensive")} badge="The complete training" dark detail="30 mornings · 24 Nov – 23 Dec" price={FULL_FEE} gst seats={seatLine(seatsReady, fullLeft)} points={FULL_POINTS} />
          </div>

          <form className="form-card" onSubmit={submit}>
            <div>
              <span className="hint">Step 1 of 2 · about a minute</span>
              <h3>Book: {isCore ? "Core · 4 days" : "Comprehensive · 30 days"} <span className="fee-line"><span className="num">· ₹{inr(price)}<span className="gst-bit">{feeNote}</span></span> per person</span></h3>
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
            <Gender name="gender" value={gender} onChange={setGender} />
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
                  <button type="button" className="btn remove" onClick={() => setPeople((current) => current.filter((item) => item.key !== person.key))}><Mark size={14} width={2} stroke="currentColor"><path d="M7 7l10 10M17 7L7 17" /></Mark>Remove</button>
                </header>
                <div className="grid-2 person-wide">
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
                <Gender name={`gender-${person.key}`} value={person.gender} onChange={(value) => patchExtra(person.key, { gender: value })} />
                <div className="grid-2 person-wide">
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
              <button type="button" className="btn btn-ghost" onClick={() => setPeople((current) => [...current, emptyExtra()])}><span className="plus" aria-hidden="true"><Mark size={16} width={2.4} stroke="#fff"><path d="M12 5v14M5 12h14" /></Mark></span>Add more people</button>
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
              <strong className="num">₹{inr(quote.total)}<span className="gst-bit">incl. GST</span></strong>
            </div>
            {connectionError && <p className="form-error">{connectionError}</p>}
            {formError && <p className="form-error">{formError}</p>}
            <BusyButton className="btn btn-primary pay-btn" type="submit" busy={holding} disabled={!agreeTerms || !agreeConsent}>Continue to payment · <span className="num">₹{inr(quote.total)}<span className="gst-bit">incl. GST</span></span><Mark size={18} width={2} stroke="#fff"><path d="M5 12h14M13 6l6 6-6 6" /></Mark></BusyButton>
            {(!agreeTerms || !agreeConsent) && <p className="hint" style={{ textAlign: "center", color: "var(--primary)" }}>Tick both boxes above to continue.</p>}
            <span className="hint lock-note"><Mark size={14} width={2} stroke="currentColor"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Mark>UPI, cards, netbanking · Confirmation on WhatsApp</span>
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
            <img className="aside-photo" src="/media/landing/question.jpg" alt="A person sitting quietly, looking up at a glowing question mark" />
            <div className="pad">
              <h3 className="display">Still have a question?</h3>
              <p>Talk to a real person from the team. We reply the same day.</p>
              <details className="contact">
                <summary><Mark size={20} width={1.7} stroke="var(--primary)"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></Mark>Call or WhatsApp us</summary>
                <div className="contact-actions">
                  <a href={CALL_URL}><Mark size={20} width={1.7} stroke="currentColor"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></Mark>Call</a>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><Mark size={20} width={1.7} stroke="currentColor"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12zM9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-1.8-.9-.8.8c-1-.4-2-1.4-2.4-2.4l.8-.8-.9-1.8z" /></Mark>WhatsApp</a>
                </div>
                <p>{SUPPORT_PHONE} · choose call or WhatsApp message</p>
              </details>
              <a className="btn btn-line" href={MAP_URL} target="_blank" rel="noopener noreferrer"><Mark size={20} width={1.6} stroke="var(--lilac)"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></Mark>Open venue in Maps</a>
              <p className="venue-note">{VENUE_FULL}</p>
            </div>
          </aside>
        </div>
      </section>
      <SiteFooter />
      <div className="sticky">
        <div className="wrap">
          <div>
            <div>{isCore ? "Core · 4 days" : "Comprehensive · 30 days"} · <span className="num">₹{inr(price)}<span className="gst-bit">{feeNote}</span></span></div>
            <small>{isCore ? "4 mornings" : "30 mornings"} · {SESSION_TIME} · {dates}</small>
          </div>
          <a className="btn btn-primary" href="#choose">Book seat</a>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return <div className="info-card">{icon}<div><small>{label}</small><b>{value}</b></div></div>;
}

function Video({ playing, setPlaying }: { playing: boolean; setPlaying: (value: boolean) => void }) {
  return (
    <div className="video-card">
      <video
        poster="/media/hero.png"
        playsInline
        controls={playing}
        onPlay={() => setPlaying(true)}
        aria-label="What is Shadanga Kriya, in the founder's own words"
      >
        <source src="/media/hero.mp4" type="video/mp4" />
      </video>
      <button className={playing ? "play playing" : "play"} type="button" aria-label={playing ? "Pause video" : "Play video: what is Shadanga Kriya, in the founder's own words"} onClick={(event) => {
        const video = event.currentTarget.parentElement?.querySelector("video");
        if (!video) return;
        if (video.paused || video.ended) {
          void video.play();
          setPlaying(true);
        } else {
          video.pause();
          setPlaying(false);
        }
      }}>
        {!playing && (
          <span className="play-orb" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="#fff" /></svg>
          </span>
        )}
        <span className="video-caption">
          <span className="eyebrow">Watch · 2:51</span>
          <span>What is Shadanga Kriya, in the founder's own words</span>
        </span>
      </button>
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
      <span className="price num">₹{inr(price)}<span className="gst-bit">{gst ? "+ 18% GST" : "incl. GST"}</span></span>
      {gst && <span className="emi-pill"><Mark size={16} width={1.8} stroke="currentColor"><path d="M3 6h18v12H3zM3 10h18M7 15h4" /></Mark>EMI available on selected banks</span>}
      {seats ? <span className="seats">{seats}</span> : null}
      <ul>{points.map((point) => <li key={point}><Mark size={18} width={2} stroke="var(--primary)"><path d="M5 12.5l4.5 4.5L19 7.5" /></Mark>{point}</li>)}</ul>
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

function Gender({ name, value, onChange }: { name: string; value: string; onChange: (value: string) => void }) {
  return (
    <fieldset className="gender">
      <legend>Gender</legend>
      <div className="gender-row">
        {["Female", "Male", "Other"].map((option) => (
          <label className="check" key={option}>
            <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FrequencyWave() {
  const main = useRef<SVGPathElement>(null);
  const faint = useRef<SVGPathElement>(null);
  useEffect(() => {
    const width = 1200;
    const height = 220;
    const steps = 240;
    const duration = 7000;
    const ease = (start: number, end: number, value: number) => {
      const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
      return t * t * (3 - 2 * t);
    };
    const wave = (t: number, amp: number, phase: number) => {
      let path = "";
      for (let i = 0; i <= steps; i += 1) {
        const u = i / steps;
        const x = u * width;
        const settle = ease(0.16, 0.52, u);
        const turn = 2 * Math.PI;
        const chaos = 0.55 * Math.sin(turn * (9 * u - 2 * t) + phase) + 0.35 * Math.sin(turn * (17 * u - 3 * t) + 1.3 + phase) + 0.25 * Math.sin(turn * (31 * u - 5 * t) + 2.1) + 0.18 * Math.sin(turn * (47 * u - 7 * t) + 0.7);
        const calm = Math.sin(turn * (3.2 * u - t) + phase);
        const y = height / 2 + amp * ((1 - settle) * chaos * height * 0.36 + settle * calm * height * 0.22);
        path += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return path;
    };
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = ((now - started) % duration) / duration;
      main.current?.setAttribute("d", wave(t, 1, 0));
      faint.current?.setAttribute("d", wave(t, 0.6, 1.7));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <svg viewBox="0 0 1200 220" preserveAspectRatio="none" role="img" aria-label="A disturbed, jagged frequency wave on the left that flows into a smooth, steady wave on the right">
      <defs>
        <linearGradient id="skwd" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C7A7FF" stopOpacity="0.45" />
          <stop offset="0.45" stopColor="#8F5BFF" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <path ref={faint} fill="none" stroke="url(#skwd)" strokeWidth="1.2" strokeOpacity="0.45" strokeLinejoin="round" />
      <path ref={main} fill="none" stroke="url(#skwd)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
