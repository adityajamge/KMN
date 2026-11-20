import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Bone } from "../components/Skeleton";
import { TopBar } from "../components/SiteChrome";
import { readCheckout, useBooking, useEvent, useUpgrade } from "../data/store";
import { ARRIVE, CALL_URL, CORE_GROUP_URL, DISCLAIMER, EMAIL_URL, FULL_GROUP_URL, MAP_URL, SESSION_TIME, STARTS_AT, SUPPORT_PHONE, UPGRADE_DATES, UPGRADE_HOLD, VENUE_SHORT, WHATSAPP_URL } from "../lib/constants";
import { firstName, formatClock, inr, planDates, planLabel, upgradePrice } from "../lib/format";

export function BookingConfirmed() {
  const { id } = useParams();
  const { booking, ready } = useBooking(id);
  if (!ready) return <Waiting />;
  if (!booking) return <Missing title="Booking not found" />;
  const payer = booking.participants[0];
  const count = booking.participants.length;
  const community = booking.plan === "core" ? CORE_GROUP_URL : FULL_GROUP_URL;
  return (
    <div className="page-dark">
      <TopBar />
      <section className="pad-lg">
        <div className="narrow center">
          <div className="mark" aria-hidden="true">✓</div>
          <p className="eyebrow">Payment confirmed · ₹{inr(booking.total)}</p>
          <h1 className="display" style={{ fontSize: 40, color: "#fff" }}>{count === 1 ? "Your seat is booked" : `Your ${count} seats are booked`}, {firstName(payer?.name ?? "")}</h1>
          <p style={{ maxWidth: 360 }}>{count === 1 ? "Your invitation and GST invoice are on your WhatsApp and email." : "Each person’s invitation and details will be sent to the WhatsApp number they provided. The GST invoice is on your email."}</p>
        </div>
      </section>
      <section style={{ padding: "0 0 72px" }}>
        <div className="narrow stack">
          <article className="card-dark">
            <div className="pad">
              <div className="split"><span className="eyebrow">Your invitation</span><span>{booking.invoiceNo}</span></div>
              <h2 className="display" style={{ fontSize: 32, color: "#fff", margin: "12px 0" }}>Neuro Mastery Program</h2>
              <p style={{ color: "var(--lilac)" }}>{planLabel(booking.plan)} · {count === 1 ? "1 person" : `${count} people`}</p>
              <div className="meta"><span>{planDates(booking.plan)}</span></div>
              <div className="meta"><span>{SESSION_TIME}</span></div>
              <div className="meta"><span>{VENUE_SHORT}</span><a href={MAP_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--lilac)" }}>Maps</a></div>
              <div style={{ borderTop: "1.5px dashed rgba(199,167,255,.35)", marginTop: 8, paddingTop: 16, textAlign: "center" }}>
                <p className="eyebrow">{count === 1 ? "Your invitation code" : "Invitation codes"}</p>
                {count === 1 ? <p className="code" style={{ fontSize: 24 }}>{payer?.code}</p> : (
                  <ul className="people">
                    {booking.participants.map((person, index) => (
                      <li key={person.id}>
                        <span className="split"><span>{person.name}</span><span>{index === 0 ? "Booked by you" : `Person ${index + 1}`}</span></span>
                        <span className="code">{person.code}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p>{count === 1 ? "Show this code at the entrance on Day 1." : "Each person shows their own code at the entrance on Day 1."} Please arrive between {ARRIVE.replace(" AM", "")} AM for registration. The program starts at {STARTS_AT} sharp.</p>
              </div>
            </div>
          </article>
          <Link className="download" to={`/invoice/${booking.id}`}><span>Tax invoice<small>₹{inr(booking.total)}{booking.gst ? " incl. 18% GST" : ""} · {booking.invoiceNo}</small></span></Link>
          <Link className="download" to={`/invitation/${booking.id}`}><span>Invitation (PDF)<small>{count === 1 ? "Your invitation with its code" : `All ${count} invitations with their codes`}</small></span></Link>
          <CommunityLink
            href={community}
            label={booking.plan === "core" ? "Join the Core Group" : "Join the Comprehensive group"}
            note={booking.plan === "core" ? "On WhatsApp · Day 1 reminders and updates" : "On WhatsApp · reminders for the 30 mornings and weekend sessions"}
          />
          <p style={{ textAlign: "center" }}>Questions? <a href={CALL_URL} style={{ color: "var(--lilac)" }}>Call</a> or <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--lilac)" }}>WhatsApp</a> us at {SUPPORT_PHONE} · <a href={EMAIL_URL} style={{ color: "var(--lilac)" }}>Email</a></p>
          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.55)" }}>{DISCLAIMER}</p>
        </div>
      </section>
    </div>
  );
}

export function PaymentFailed() {
  const checkout = readCheckout();
  const { booking } = useBooking(checkout?.kind === "registration" ? checkout.bookingId : undefined);
  return (
    <div className="page-dark">
      <TopBar />
      <section className="pad-lg">
        <div className="narrow center">
          <p className="eyebrow">Payment not completed</p>
          <h1 className="display" style={{ fontSize: 40, color: "#fff" }}>Your payment didn’t go through</h1>
          <p style={{ maxWidth: 340 }}>{booking ? `No money was taken. Your ${booking.participants.length === 1 ? "seat is" : `${booking.participants.length} seats are`} held for 10 more minutes.` : "No money was taken."}</p>
          {booking?.holdUntil && <span className="hold-pill">Held until {formatClock(booking.holdUntil)}</span>}
        </div>
      </section>
      <section style={{ padding: "0 0 72px" }}>
        <div className="narrow stack">
          {booking && (
            <div className="panel">
              <p className="eyebrow">Your booking</p>
              <div className="split" style={{ marginTop: 12 }}><span>{planLabel(booking.plan)}</span><span>{booking.participants.length === 1 ? "1 person" : `${booking.participants.length} people`}</span></div>
              <p>{planDates(booking.plan)} · {SESSION_TIME}</p>
              <div className="split" style={{ marginTop: 12 }}><span>To pay</span><strong className="num">₹{inr(booking.total)}{booking.gst > 0 && <span style={{ fontSize: 12, fontWeight: 300 }}> incl. 18% GST</span>}</strong></div>
            </div>
          )}
          <Link className="btn btn-primary" to="/pay">Try again</Link>
          <a className="btn btn-line" href={CALL_URL}>Call us</a>
          <a className="btn btn-line" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
          <a className="btn btn-line" href={EMAIL_URL}>Email us</a>
          <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,.6)" }}>Try again opens the same payment page.</p>
        </div>
      </section>
    </div>
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

function CommunityLink({ href, label, note }: { href: string; label: string; note: string }) {
  return (
    <>
      <a className="btn btn-primary" href={href}>{label}</a>
      <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.55)" }}>{note}</p>
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
