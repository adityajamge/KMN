import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "../components/SiteChrome";
import { DISCLAIMER, UPGRADE_HOLD } from "../lib/constants";

export function TermsPage() {
  return (
    <Legal title="Terms & refunds">
      <p>A seat is confirmed only after payment succeeds. If payment fails, no money is taken and the seats stay held for 10 minutes.</p>
      <p>If the batch fills while a payment is in progress, the payment is refunded in full and the next batch is offered.</p>
      <p>Core participants can upgrade until {UPGRADE_HOLD}. The ₹499 Core fee is counted against the Comprehensive fee. A failed upgrade leaves the Core booking unchanged.</p>
      <p>The programme is in person, in Nagpur, at 7:00–9:00 AM. Arrive between 6:30 and 7:00 AM. Each person needs their own seat and their own invitation code.</p>
      <p>{DISCLAIMER}</p>
    </Legal>
  );
}

export function ConsentPage() {
  return (
    <Legal title="Consent form">
      <p>By continuing, the person paying confirms that everyone listed wants to join, and that a parent or guardian has agreed for anyone under 18.</p>
      <p>Health notes are shared only with the event team so they can look after people in the hall. They are not a medical assessment.</p>
      <p>{DISCLAIMER}</p>
    </Legal>
  );
}

export function PrivacyPage() {
  return (
    <Legal title="Privacy">
      <p>The registration stores each person’s name, WhatsApp number, email, city, area, role, age, goals, and any health note they choose to share.</p>
      <p>Those details are used to hold the seat, send the invoice and invitation, run the check-in desk, and mark attendance.</p>
      <p>Those details are stored in the event database. Health notes are shown only on the event desk, so the team can look after people in the hall.</p>
    </Legal>
  );
}

function Legal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="doc">
      <TopBar />
      <article className="stack">
        <h1 className="display" style={{ fontSize: 48 }}>{title}</h1>
        {children}
        <Link to="/">Back to the programme</Link>
      </article>
    </div>
  );
}
