import { useEffect, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Bone } from "../components/Skeleton";
import { TopBar } from "../components/SiteChrome";
import { readCheckout, useBooking, useEvent, useUpgrade } from "../data/store";
import { ANDROID_APP_URL, ARRIVE, CALL_URL, CORE_GROUP_URL, EMAIL_URL, FULL_GROUP_URL, IOS_APP_URL, MAP_URL, PROGRAM_NAME, SESSION_TIME, STARTS_AT, SUPPORT_PHONE, UPGRADE_DATES, UPGRADE_HOLD, VENUE_SHORT, WHATSAPP_URL } from "../lib/constants";
import { firstName, formatClock, inr, planDates, planLabel, upgradePrice } from "../lib/format";

const VENUE_LINE = "Shadanga Kriya Centre, 5th Floor, NCM Society Building, Hanuman Nagar · near Krida Chowk";

export function BookingConfirmed() {
  const { id } = useParams();
  const { booking, ready } = useBooking(id);
  if (!ready) return <Waiting />;
  if (!booking) return <Missing title="Booking not found" />;
  const payer = booking.participants[0];
  const count = booking.participants.length;
  const community = booking.plan === "core" ? CORE_GROUP_URL : FULL_GROUP_URL;
  const arrive = ARRIVE.replace(" AM", "");
  return (
    <PayFrame tone="ok">
      <section className="pay-hero">
        <div className="pay-col pay-center">
          <CheckMark />
          <p className="pay-kicker">Payment confirmed · ₹{inr(booking.total)}</p>
          <h1>{count === 1 ? "Your seat is booked" : `Your ${count} seats are booked`}, {firstName(payer?.name ?? "")}</h1>
          <p>{count === 1 ? "Your invitation and GST invoice are on your WhatsApp and email." : "Each person’s invitation and details will be sent to the WhatsApp number they provided. The GST invoice is on your email."}</p>
        </div>
      </section>
      <section className="pay-body">
        <div className="pay-col pay-stack">
          <article className="pay-card" aria-label="Your invitation">
            <div className="pay-card-top">
              <div className="pay-split"><span className="pay-kicker">Your invitation</span><span className="pay-muted">{booking.invoiceNo}</span></div>
              <h2>{PROGRAM_NAME}</h2>
              <p className="pay-lilac">{planLabel(booking.plan)} · {count === 1 ? "1 person" : `${count} people`}</p>
              <div className="pay-row"><Icon d="M4 6h16v14H4zM4 10h16M9 3v4M15 3v4" /><span>{planDates(booking.plan)}</span></div>
              <div className="pay-row"><Icon d="M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18M12 7v5l3 2" /><span>{SESSION_TIME} · arrive {arrive}</span></div>
              <div className="pay-row"><Icon d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21zM12 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5" /><span>{VENUE_LINE}</span><a href={MAP_URL} target="_blank" rel="noopener noreferrer">Maps</a></div>
            </div>
            <div className="pay-codes">
              <span className="pay-kicker">{count === 1 ? "Your invitation code" : "Invitation codes"}</span>
              {count === 1 ? <p className="pay-code solo">{payer?.code}</p> : (
                <ul>
                  {booking.participants.map((person, index) => (
                    <li key={person.id}>
                      <span className="pay-split"><span>{person.name}</span><span className="pay-muted">{index === 0 ? "Booked by you" : `Person ${index + 1}`}</span></span>
                      <span className="pay-code">{person.code}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p>{count === 1 ? "Show this code at the entrance on Day 1." : "Each person shows their own code at the entrance on Day 1."} Please arrive between {arrive.replace(" – ", " and ")} AM for registration. The program starts at {STARTS_AT} sharp.</p>
            </div>
          </article>
          <Link className="pay-file" to={`/invoice/${booking.id}`}><Icon d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" /><span>Tax invoice<small>₹{inr(booking.total)} incl. GST · {booking.invoiceNo}</small></span><Icon d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Link>
          <Link className="pay-file" to={`/invitation/${booking.id}`}><Icon d="M3 8l9-5 9 5v11H3zM3 8l9 6 9-6" /><span>Invitation (PDF)<small>{count === 1 ? "Your invitation with its code" : `All ${count} invitations with their codes`}</small></span><Icon d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Link>
          <CommunityLink
            href={community}
            label={booking.plan === "core" ? "Join the Core Group" : "Join the Comprehensive group"}
            note={booking.plan === "core" ? "On WhatsApp · Day 1 reminders and updates" : "On WhatsApp · reminders for the 30 mornings and weekend sessions"}
          />
        </div>
      </section>
      <PayFooter long />
    </PayFrame>
  );
}

export function PaymentFailed() {
  const checkout = readCheckout();
  const { booking } = useBooking(checkout?.kind === "registration" ? checkout.bookingId : undefined);
  const count = booking?.participants.length ?? 0;
  return (
    <PayFrame tone="bad">
      <section className="pay-hero">
        <div className="pay-col pay-center">
          <RetryMark />
          <p className="pay-kicker">Payment not completed</p>
          <h1>Your payment didn’t go through</h1>
          <p>{booking ? `No money was taken. Your ${count === 1 ? "seat is" : `${count} seats are`} held for 10 more minutes.` : "No money was taken."}</p>
          {booking?.holdUntil && <span className="pay-hold"><Icon d="M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18M12 7v5l3 2" />Held until {formatClock(booking.holdUntil)}</span>}
        </div>
      </section>
      <section className="pay-body">
        <div className="pay-col pay-stack">
          {booking && (
            <div className="pay-summary">
              <span className="pay-kicker">Your booking</span>
              <div className="pay-split"><span>{booking.plan === "core" ? "Core · 4 days" : "Comprehensive · 30 days + 90 days with the app"}</span><span>{count === 1 ? "1 person" : `${count} people`}</span></div>
              <p>{planDates(booking.plan)} · {SESSION_TIME}</p>
              <div className="pay-due"><span>To pay</span><strong>₹{inr(booking.total)} <span>incl. GST</span></strong></div>
            </div>
          )}
          <Link className="btn btn-primary pay-join" to="/pay"><Icon d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4" />Try again</Link>
          <details className="pay-contact">
            <summary><Icon d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />Call or WhatsApp us</summary>
            <div>
              <a href={CALL_URL}><Icon d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />Call</a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><Icon d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z" />WhatsApp</a>
            </div>
            <p>{SUPPORT_PHONE} · choose call or WhatsApp message</p>
          </details>
          <p className="pay-hint">Try again opens the same secure payment page.</p>
        </div>
      </section>
      <PayFooter />
    </PayFrame>
  );
}

export function UpgradeConfirmed() {
  const { id } = useParams();
  const { participantById } = useEvent();
  const { upgrade, ready } = useUpgrade(id);
  if (!ready) return <Waiting />;
  if (!upgrade) return <Missing title="Upgrade not found" />;
  const people = upgrade.participantIds.map((personId) => participantById(personId)?.participant).filter((person) => person != null);
  const count = people.length;
  return (
    <div className="page-dark">
      <TopBar />
      <section className="pad-lg">
        <div className="narrow center">
          <div className="mark" aria-hidden="true">✓</div>
          <p className="eyebrow">Upgrade confirmed · ₹{inr(upgrade.total)}</p>
          <h1 className="display" style={{ fontSize: 40, color: "#fff" }}>{count === 1 ? "Your practice continues" : "You continue together"}{people[0] ? `, ${firstName(people[0].name)}` : ""}</h1>
          <p style={{ maxWidth: 380 }}>{count === 1 ? "Your updated invitation and GST invoice are on your WhatsApp and email. Your Core code stays the same." : "Everyone keeps their Core code. Updated invitations go to each person’s WhatsApp, and the GST invoice is on your email."}</p>
        </div>
      </section>
      <section style={{ padding: "0 0 72px" }}>
        <div className="narrow stack">
          <article className="card-dark">
            <div className="pad">
              <div className="split"><span className="eyebrow">Your invitation</span><span>{upgrade.invoiceNo}</span></div>
              <h2 className="display" style={{ fontSize: 32, color: "#fff", marginTop: 12 }}>Neuro Mastery Program</h2>
              <p style={{ color: "var(--lilac)" }}>Comprehensive · from Day 5 · {count === 1 ? "1 person" : `${count} people`}</p>
              <div className="meta"><span>{UPGRADE_DATES} (then 90 days of guided self-practice)</span></div>
              <div className="meta"><span>{SESSION_TIME}</span></div>
              <div className="meta"><span>{VENUE_SHORT}</span><a href={MAP_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--lilac)" }}>Maps</a></div>
              <ul className="people">
                {people.map((person) => (
                  <li key={person.id}><span>{person.name}</span><span className="code">{person.code}</span></li>
                ))}
              </ul>
              <p>{count === 1 ? "Show the same code at the entrance." : "Each person shows the same code they used for Core."} See you from {UPGRADE_DATES.split("–")[0].trim()} between {ARRIVE}, same hall, same batch. We begin at {STARTS_AT} sharp.</p>
            </div>
          </article>
          <div className="panel">
            <p className="eyebrow">What you paid</p>
            <div className="split"><span>Comprehensive × {count}</span><span className="num">₹{inr(upgrade.gross)}</span></div>
            <div className="split"><span>Core fee already paid</span><span className="num">– ₹{inr(upgrade.credit)}</span></div>
            <div className="split"><span>GST (18%)</span><span className="num">₹{inr(upgrade.gst)}</span></div>
            <div className="split"><strong>Paid</strong><strong className="num">₹{inr(upgrade.total)}</strong></div>
          </div>
          <Link className="download" to={`/upgrade-invoice/${upgrade.id}`}><span>Tax invoice<small>₹{inr(upgrade.total)} incl. GST · Core fee deducted · {upgrade.invoiceNo}</small></span></Link>
          <CommunityLink
            href={FULL_GROUP_URL}
            label="Join the Comprehensive group"
            note="On WhatsApp · reminders for the 30 mornings and weekend sessions"
          />
          <p style={{ textAlign: "center" }}>Questions? <a href={CALL_URL} style={{ color: "var(--lilac)" }}>Call</a> or <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--lilac)" }}>WhatsApp</a> us at {SUPPORT_PHONE} · <a href={EMAIL_URL} style={{ color: "var(--lilac)" }}>Email</a></p>
        </div>
      </section>
    </div>
  );
}

export function UpgradeFailed() {
  const checkout = readCheckout();
  const { participantById, loadParticipant } = useEvent();
  const ids = checkout?.kind === "upgrade" ? checkout.participantIds : [];
  useEffect(() => {
    ids.forEach((personId) => { void loadParticipant(personId); });
  }, [ids.join("|"), loadParticipant]);
  const count = ids.length || 1;
  const names = checkout?.kind === "upgrade"
    ? checkout.participantIds.map((id) => participantById(id)?.participant.name).filter(Boolean)
    : [];
  const price = upgradePrice(count);
  return (
    <div className="page-dark">
      <TopBar />
      <section className="pad-lg">
        <div className="narrow center">
          <p className="eyebrow">Payment not completed</p>
          <h1 className="display" style={{ fontSize: 40, color: "#fff" }}>Your payment didn’t go through</h1>
          <p style={{ maxWidth: 380 }}>No money was taken. Your Core booking is unchanged, and your seat from Day 5 is kept until {UPGRADE_HOLD}.</p>
        </div>
      </section>
      <section style={{ padding: "0 0 72px" }}>
        <div className="narrow stack">
          <div className="panel">
            <p className="eyebrow">Your booking</p>
            <div className="split" style={{ marginTop: 12 }}><span>Upgrade · Comprehensive</span><span>{count === 1 ? "1 person" : `${count} people`}</span></div>
            {names.length > 0 && <p>{names.join(", ")}</p>}
            <p>{UPGRADE_DATES} · {SESSION_TIME}</p>
            <div className="split"><span>To pay</span><strong className="num">₹{inr(price.total)} <span style={{ fontWeight: 300, fontSize: 12 }}>incl. GST</span></strong></div>
          </div>
          <Link className="btn btn-primary" to="/pay">Try again</Link>
          <a className="btn btn-line" href={CALL_URL}>Call us</a>
          <a className="btn btn-line" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
          <a className="btn btn-line" href={EMAIL_URL}>Email us</a>
        </div>
      </section>
    </div>
  );
}

function PayFrame({ tone, children }: { tone: "ok" | "bad"; children: ReactNode }) {
  return (
    <div className={`pay-result ${tone}`}>
      <PayHeader />
      {children}
    </div>
  );
}

function PayHeader() {
  return (
    <header className="pay-top">
      <div>
        <Link to="/" aria-label="Shadanga Kriya home"><img src="/media/wordmark.png" alt="Shadanga Kriya" /></Link>
      </div>
    </header>
  );
}

function PayFooter({ long = false }: { long?: boolean }) {
  return (
    <footer className="pay-foot">
      <div>
        {long && (
          <>
            <p>Questions? <a href={CALL_URL}>Call</a> or <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp</a> us at {SUPPORT_PHONE} · <a href={EMAIL_URL}>Email</a></p>
            <p>Get the Shadanga Kriya app: <a href={IOS_APP_URL} target="_blank" rel="noopener noreferrer">App Store</a> · <a href={ANDROID_APP_URL} target="_blank" rel="noopener noreferrer">Google Play</a></p>
          </>
        )}
        <p>Training for attention and awareness, not treatment. Going through a hard time? Call Tele-MANAS 14416 (free, 24×7).</p>
      </div>
    </footer>
  );
}

function CheckMark() {
  return (
    <div className="pay-check" aria-hidden="true">
      <span /><span />
      <i><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></i>
    </div>
  );
}

function RetryMark() {
  return (
    <div className="pay-retry" aria-hidden="true">
      <span><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4" /></svg></span>
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

function CommunityLink({ href, label, note }: { href: string; label: string; note: string }) {
  return (
    <>
      <a className="btn btn-primary pay-join" href={href}><Icon d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z" />{label}</a>
      <p className="pay-note">{note}</p>
    </>
  );
}

function Waiting() {
  return (
    <div className="page-dark" aria-busy="true">
      <TopBar />
      <section className="pad-lg">
        <div className="narrow center">
          <div className="mark" aria-hidden="true" />
          <p className="eyebrow"><Bone width="12em" /></p>
          <h1 className="display" style={{ fontSize: 40, color: "#fff" }}><Bone width="14em" /></h1>
          <p style={{ maxWidth: 360, marginInline: "auto" }}><Bone width="100%" /></p>
        </div>
      </section>
      <section style={{ padding: "0 0 72px" }}>
        <div className="narrow stack">
          <article className="card-dark" style={{ minHeight: 414 }}>
            <div className="pad">
              <div className="split"><Bone width="8em" /><Bone width="5em" /></div>
              <h2 className="display" style={{ fontSize: 32, margin: "12px 0" }}><Bone width="12em" /></h2>
              <p><Bone width="14em" /></p>
              <div className="meta"><Bone width="11em" /></div>
              <div className="meta"><Bone width="8em" /></div>
              <div className="meta"><Bone width="10em" /></div>
              <div style={{ borderTop: "1.5px dashed rgba(199,167,255,.35)", marginTop: 8, paddingTop: 16, textAlign: "center" }}>
                <p className="eyebrow"><Bone width="9em" /></p>
                <p className="code" style={{ fontSize: 24 }}><Bone width="12em" /></p>
                <p><Bone width="16em" /></p>
              </div>
            </div>
          </article>
          <div className="download"><Bone width="46%" /></div>
          <div className="download"><Bone width="52%" /></div>
          <span className="bone block button" />
        </div>
      </section>
    </div>
  );
}

function Missing({ title }: { title: string }) {
  return (
    <div className="page-dark">
      <TopBar />
      <div className="narrow pad-lg stack">
        <h1 className="display" style={{ color: "#fff", fontSize: 42 }}>{title}</h1>
        <Link className="btn btn-primary" to="/">Back to the programme</Link>
      </div>
    </div>
  );
}
