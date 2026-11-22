import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bone } from "../components/Skeleton";
import { TopBar } from "../components/SiteChrome";
import { useBooking, useEvent, useUpgrade } from "../data/store";
import { ARRIVE, COMPANY, CORE_DATES, CORE_FEE, FULL_DATES, MAP_URL, PROGRAM_NAME, SESSION_TIME, SUPPORT_PHONE, UPGRADE_DATES, VENUE_FULL } from "../lib/constants";
import { formatWhen, inr, planDates, planLabel, upgradePrice } from "../lib/format";
import { downloadInvitationPdf } from "../lib/invitationPdf";

function download(filename: string, body: string) {
  const blob = new Blob([body], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function InvoicePage() {
  const { id } = useParams();
  const { booking, ready } = useBooking(id);
  if (!ready) return <Waiting />;
  if (!booking || booking.status !== "paid") return <Missing />;
  const payer = booking.participants[0];
  const html = `<h1>${booking.invoiceNo}</h1><p>${PROGRAM_NAME}</p><p>${payer?.name} · ₹${inr(booking.total)}</p>`;
  return (
    <div className="doc">
      <TopBar />
      <article>
        <p className="eyebrow" style={{ color: "var(--primary)" }}>Tax invoice</p>
        <h1 className="display" style={{ fontSize: 42 }}>{booking.invoiceNo}</h1>
        <p>{COMPANY}</p>
        <p>Issued {formatWhen(booking.createdAt)} · Ref {booking.paymentRef}</p>
        <table>
          <tbody>
            <tr><td>Billed to</td><td>{payer?.name}<br />{payer?.email}<br />{payer?.whatsapp}</td></tr>
            <tr><td>Programme</td><td>{planLabel(booking.plan)} · {planDates(booking.plan)}</td></tr>
            <tr><td>People</td><td>{booking.participants.map((person) => person.name).join(", ")}</td></tr>
            <tr><td>Subtotal</td><td className="num">₹{inr(booking.subtotal)}</td></tr>
            {booking.gst > 0 && <tr><td>GST 18%</td><td className="num">₹{inr(booking.gst)}</td></tr>}
            <tr><td>Total</td><td className="num">₹{inr(booking.total)}</td></tr>
          </tbody>
        </table>
        <p className="hint">{VENUE_FULL} · {SESSION_TIME}</p>
        <div className="no-print" style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="btn btn-primary" type="button" onClick={() => download(`${booking.invoiceNo}.html`, html)}>Download</button>
          <button className="btn btn-ghost" type="button" onClick={() => window.print()}>Print</button>
        </div>
      </article>
    </div>
  );
}

export function UpgradeInvoicePage() {
  const { id } = useParams();
  const { participantById } = useEvent();
  const { upgrade, ready } = useUpgrade(id);
  if (!ready) return <Waiting />;
  if (!upgrade) return <Missing />;
  const people = upgrade.participantIds.map((personId) => participantById(personId)?.participant).filter((person) => person != null);
  return (
    <div className="doc">
      <TopBar />
      <article>
        <p className="eyebrow" style={{ color: "var(--primary)" }}>Tax invoice · upgrade</p>
        <h1 className="display" style={{ fontSize: 42 }}>{upgrade.invoiceNo}</h1>
        <p>{COMPANY}</p>
        <p>Issued {formatWhen(upgrade.createdAt)} · Ref {upgrade.paymentRef}</p>
        <table>
          <tbody>
            <tr><td>Continuing</td><td>{people.map((person) => `${person.name} · ${person.code}`).join(", ")}</td></tr>
            <tr><td>Comprehensive</td><td className="num">₹{inr(upgrade.gross)}</td></tr>
            <tr><td>Core fee already paid</td><td className="num">– ₹{inr(upgrade.credit)}</td></tr>
            <tr><td>GST 18%</td><td className="num">₹{inr(upgrade.gst)}</td></tr>
            <tr><td>Total</td><td className="num">₹{inr(upgrade.total)}</td></tr>
          </tbody>
        </table>
        <div className="no-print" style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="btn btn-primary" type="button" onClick={() => download(`${upgrade.invoiceNo}.html`, upgrade.invoiceNo)}>Download</button>
          <button className="btn btn-ghost" type="button" onClick={() => window.print()}>Print</button>
        </div>
      </article>
    </div>
  );
}

export function InvitationPage() {
  const { id } = useParams();
  const { booking, ready } = useBooking(id);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  if (!ready) return <Waiting />;
  if (!booking) return <Missing />;
  const upgradeTotal = upgradePrice(1).total;
  const invoiceNo = booking.invoiceNo;
  async function downloadPdf() {
    const cards = [...document.querySelectorAll<HTMLElement>(".invite-ticket")];
    if (!cards.length || saving) return;
    setSaving(true);
    setSaveError("");
    const filename = `${invoiceNo || cards[0]?.querySelector("strong")?.textContent || "invitation"}.pdf`;
    try {
      await downloadInvitationPdf(cards, filename);
    } catch (error) {
      console.error(error);
      setSaveError("The PDF could not be created. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="invite-page">
      <div className="no-print invite-actions">
        <button className="btn btn-primary" type="button" disabled={saving} onClick={downloadPdf}>{saving ? "Preparing the PDF…" : booking.participants.length === 1 ? "Download invitation" : "Download invitations"}</button>
        {saveError && <p className="invite-save-error">{saveError}</p>}
      </div>
      {booking.participants.map((person) => {
        const upgraded = person.upgraded;
        const core = person.programme === "core" && !upgraded;
        const dates = upgraded ? UPGRADE_DATES : person.programme === "core" ? CORE_DATES : FULL_DATES;
        return (
          <article className="invite-ticket" key={person.id} aria-label="Invitation">
            <p className="invite-kicker"><span>Invitation</span><span className="dot" aria-hidden="true" /><span lang="hi">निमंत्रण</span></p>
            <div className="invite-head">
              <img className="invite-lockup" src="/media/invite-lockup.webp" alt="Shadanga Kriya · The Eternal State of Realization" />
              <span className="invite-rule" aria-hidden="true" />
              <p className="invite-eyebrow">You are invited to</p>
              <h1 className="display">{PROGRAM_NAME}</h1>
              <span className="plan-pill">{planLabel(person.programme, upgraded)}</span>
              <p className="for-label">This invitation is for</p>
              <p className="person-name display">{person.name}</p>
            </div>
            <div className="ticket">
              <div className="ticket-code">
                <span>{upgraded ? "Invitation code · same as Core" : "Invitation code"}</span>
                <strong>{person.code || "Issued after payment"}</strong>
                <p>{upgraded ? "Show this at the entrance · for this person only" : "Show this at the registration desk · for this person only"}</p>
              </div>
              <div className="ticket-tear" aria-hidden="true"><span /><span /></div>
              <div className="ticket-meta">
                <div><span>Dates</span><b>{dates}</b></div>
                <div><span>Time</span><b>{SESSION_TIME}</b></div>
                <div><span>Arrive by</span><b>{ARRIVE}</b></div>
              </div>
              <div className="ticket-venue">
                <div><span>Venue</span><b>Shadanga Kriya Centre, 5th Floor, NCM Society Building, Plot 434, Hanuman Nagar · near Krida Chowk</b></div>
                <a href={MAP_URL}>Maps</a>
              </div>
            </div>
            <p className="bring"><strong>Please bring</strong> · Loose clothes · Water bottle · A small notebook · Phone on silent</p>
            {core && (
              <p className="invite-upgrade"><strong>Want to continue after 4 mornings?</strong> Upgrade to the Comprehensive program for ₹{inr(upgradeTotal)} incl. GST, with your ₹{inr(CORE_FEE)} counted. <Link to={`/upgrade?c=${encodeURIComponent(person.code)}`}>Register and pay here</Link></p>
            )}
            <footer>
              <span lang="hi">अनुभूति पदं नित्यम्</span>
              <small>Training for attention and awareness, not treatment. Going through a hard time? Call Tele-MANAS 14416 (free, 24×7).<br />{COMPANY} · {booking.invoiceNo || "INV-XXXX"} · Questions: call or WhatsApp {SUPPORT_PHONE}</small>
            </footer>
          </article>
        );
      })}
    </div>
  );
}

function Waiting() {
  return (
    <div className="doc" aria-busy="true">
      <TopBar />
      <article style={{ minHeight: 572 }}>
        <p className="eyebrow"><Bone width="8em" /></p>
        <h1 className="display" style={{ fontSize: 42 }}><Bone width="8em" /></h1>
        <p><Bone width="16em" /></p>
        <p><Bone width="20em" /></p>
        <table>
          <tbody>
            {["Billed to", "Programme", "People", "Subtotal", "GST 18%", "Total"].map((label) => (
              <tr key={label}><td>{label}</td><td><Bone width="10em" /></td></tr>
            ))}
          </tbody>
        </table>
        <p className="hint"><Bone width="18em" /></p>
        <div className="no-print" style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <span className="bone block button" style={{ width: 140, margin: 0 }} />
          <span className="bone block button" style={{ width: 120, margin: 0 }} />
        </div>
      </article>
    </div>
  );
}

function Missing() {
  return (
    <div className="doc">
      <TopBar />
      <article>
        <h1 className="display">Nothing to show</h1>
        <Link to="/">Back to the programme</Link>
      </article>
    </div>
  );
}
