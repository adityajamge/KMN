import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BusyButton, Spinner } from "../components/BusyButton";
import { Logo } from "../components/SiteChrome";
import { Bone, SkeletonRows } from "../components/Skeleton";
import { occupiesSeat, seatsUsed, useEvent } from "../data/store";
import { CAPACITY, CORE_DAYS, CORE_DATES, FULL_DAYS, FULL_DATES, SESSION_TIME } from "../lib/constants";
import { downloadAttendance } from "../lib/excel";
import { formatWhen, inr, maskPhone } from "../lib/format";
import type { Booking, Participant, Plan } from "../lib/types";

export function AdminLayout() {
  const { refreshAdmin, connectionError } = useEvent();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    void refreshAdmin();
    const timer = window.setInterval(() => { void refreshAdmin(); }, 20000);
    return () => window.clearInterval(timer);
  }, [refreshAdmin]);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  return (
    <div className={menuOpen ? "admin menu-open" : "admin"}>
      <header className="desk-bar">
        <button className="burger" type="button" aria-expanded={menuOpen} aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen((open) => !open)}>
          <span />
          <span />
          <span />
        </button>
        <Logo small />
      </header>
      {narrow && menuOpen && <button className="desk-shade" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <div className="desk-frame">
        <aside className="side" inert={narrow && !menuOpen ? true : undefined} onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setMenuOpen(false); }}>
          <Logo small />
          <nav>
            <NavLink to="/admin" end>Overview</NavLink>
            <NavLink to="/admin/bookings">Bookings</NavLink>
            <NavLink to="/admin/participants">Participants</NavLink>
            <NavLink to="/admin/check-in">Check-in</NavLink>
            <NavLink to="/admin/attendance">Attendance</NavLink>
            <NavLink to="/admin/upgrades">Upgrades</NavLink>
            <NavLink to="/admin/revenue">Revenue</NavLink>
          </nav>
          <Link className="desk-home" to="/">View the public site</Link>
        </aside>
        <main>
        {connectionError && <p className="form-error">{connectionError}</p>}
        <Outlet />
        </main>
      </div>
    </div>
  );
}

function peopleOf(bookings: Booking[]) {
  return bookings.flatMap((booking) => booking.participants.map((participant) => ({ booking, participant })));
}

export function OverviewPage() {
  const { bookings, upgrades, adminLoaded } = useEvent();
  const loading = !adminLoaded;
  const people = peopleOf(bookings);
  const paid = bookings.filter((booking) => booking.status === "paid");
  const unpaid = bookings.filter((booking) => booking.status === "unpaid");
  const revenue = paid.reduce((sum, booking) => sum + booking.total, 0) + upgrades.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.total, 0);
  const coreLeft = CAPACITY - seatsUsed("core", bookings);
  const fullLeft = CAPACITY - seatsUsed("comprehensive", bookings);
  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <p className="eyebrow" style={{ color: "var(--primary)" }}>Event desk</p>
          <h1>Nagpur batch</h1>
        </div>
        <button className="btn btn-primary" type="button" disabled={loading} onClick={() => downloadAttendance(bookings)}>Download attendance</button>
      </div>
      <div className="stats">
        <Stat label="Registrations" value={String(people.length)} loading={loading} />
        <Stat label="Paid bookings" value={String(paid.length)} loading={loading} />
        <Stat label="Unpaid bookings" value={String(unpaid.length)} loading={loading} />
        <Stat label="Revenue" value={`₹${inr(revenue)}`} loading={loading} />
      </div>
      <div className="stats">
        <BatchCard title="Core" dates={CORE_DATES} used={seatsUsed("core", bookings)} left={coreLeft} loading={loading} />
        <BatchCard title="Comprehensive" dates={FULL_DATES} used={seatsUsed("comprehensive", bookings)} left={fullLeft} loading={loading} />
        <Stat label="Checked in" value={String(people.filter((row) => row.participant.checkedIn).length)} loading={loading} />
        <Stat label="Upgrades" value={String(upgrades.filter((item) => item.status === "paid").length)} loading={loading} />
      </div>
      <section className="block">
        <h2>Latest bookings</h2>
        {loading ? <SkeletonRows columns={["When", "Payer", "Batch", "People", "Status", "Total"]} rows={3} /> : <BookingTable bookings={bookings.slice(0, 5)} />}
      </section>
    </div>
  );
}

export function BookingsPage() {
  const { bookings, adminLoaded } = useEvent();
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [plan, setPlan] = useState<"all" | Plan>("all");
  const rows = bookings.filter((booking) => (filter === "all" || booking.status === filter) && (plan === "all" || booking.plan === plan));
  return (
    <div className="stack">
      <div className="admin-head"><h1>Bookings</h1></div>
      <div className="filters">
        {(["all", "paid", "unpaid"] as const).map((item) => <button key={item} className={filter === item ? "on" : ""} type="button" onClick={() => setFilter(item)}>{item}</button>)}
        {(["all", "core", "comprehensive"] as const).map((item) => <button key={item} className={plan === item ? "on" : ""} type="button" onClick={() => setPlan(item)}>{item}</button>)}
      </div>
      <section className="block">{adminLoaded ? <BookingTable bookings={rows} /> : <SkeletonRows columns={["When", "Payer", "Batch", "People", "Status", "Total"]} />}</section>
    </div>
  );
}

export function ParticipantsPage() {
  const { bookings, adminLoaded } = useEvent();
  const [query, setQuery] = useState("");
  const rows = peopleOf(bookings).filter(({ participant }) => {
    const haystack = `${participant.name} ${participant.code} ${participant.whatsapp} ${participant.email} ${participant.city}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  return (
    <div className="stack">
      <div className="admin-head"><h1>Participants</h1></div>
      <input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, code, WhatsApp, email" />
      <section className="block table-wrap">
        {!adminLoaded ? <SkeletonRows columns={["Name", "Code", "Programme", "Contact", "Details", "Check-in"]} /> : (
        <table className="data">
          <thead><tr><th>Name</th><th>Code</th><th>Programme</th><th>Contact</th><th>Details</th><th>Check-in</th></tr></thead>
          <tbody>
            {rows.map(({ booking, participant }) => (
              <tr key={participant.id}>
                <td data-label="Name">{participant.name}<br /><span className="hint">{participant.isPayer ? "Payer" : participant.relation || "Guest"} · {participant.age} · {participant.role}</span></td>
                <td data-label="Code" className="num">{participant.code || "After payment"}</td>
                <td data-label="Programme">{participant.upgraded ? "Comprehensive · upgraded" : participant.programme === "core" ? "Core" : "Comprehensive"}<br /><Status booking={booking} /></td>
                <td data-label="Contact">{participant.whatsapp}<br />{participant.email}<br />{participant.city}, {participant.area}</td>
                <td data-label="Details">{participant.goals.join(", ") || "—"}{participant.healthNote && <><br />Health: {participant.healthNote}</>}{participant.guardianName && <><br />Guardian: {participant.guardianName} · {participant.guardianPhone}</>}</td>
                <td data-label="Check-in">{participant.checkedIn ? "Checked in" : "Not yet"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </section>
    </div>
  );
}

export function CheckInPage() {
  const { bookings, setCheckIn, adminLoaded } = useEvent();
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const checkLock = useRef(false);
  const needle = query.trim().toLowerCase();
  const rows = peopleOf(bookings).filter(({ booking, participant }) => {
    if (booking.status !== "paid") return false;
    if (!needle) return true;
    return participant.code.toLowerCase().endsWith(needle) || participant.code.toLowerCase().includes(needle) || participant.whatsapp.includes(needle) || participant.name.toLowerCase().includes(needle);
  });
  const saveCheckIn = async (participant: Participant, checkedIn: boolean) => {
    if (checkLock.current) return;
    checkLock.current = true;
    setPendingId(participant.id);
    try {
      await setCheckIn(participant.id, checkedIn);
      setNotice(checkedIn ? `${participant.name} checked in. Hand over the invitation card.` : "");
    } finally {
      checkLock.current = false;
      setPendingId(null);
    }
  };
  return (
    <div className="stack">
      <div className="admin-head"><h1>Check-in</h1><p className="hint">Type the last 4 characters of the code, or a WhatsApp number.</p></div>
      <input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="MK5G or 98230…" />
      {notice && <p className="warn">{notice}</p>}
      <section className="block table-wrap">
        {!adminLoaded ? <SkeletonRows columns={["Person", "Code", "Status", "Action"]} /> : (
        <table className="data">
          <thead><tr><th>Person</th><th>Code</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map(({ participant }) => (
              <tr key={participant.id}>
                <td data-label="Person">{participant.name}<br /><span className="hint">{maskPhone(participant.whatsapp)}</span></td>
                <td data-label="Code" className="num">{participant.code}</td>
                <td data-label="Status">{participant.checkedIn ? <span className="badge-paid">Checked in</span> : <span className="badge-unpaid">Waiting</span>}</td>
                <td className="actions">
                  {participant.checkedIn
                    ? <BusyButton className="btn btn-ghost" style={{ minHeight: 40 }} busy={pendingId === participant.id} disabled={pendingId !== null} onClick={() => { void saveCheckIn(participant, false); }}>Undo</BusyButton>
                    : <BusyButton className="btn btn-primary" style={{ minHeight: 40 }} busy={pendingId === participant.id} disabled={pendingId !== null} onClick={() => { void saveCheckIn(participant, true); }}>Check in</BusyButton>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </section>
    </div>
  );
}

export function AttendancePage() {
  const { bookings, toggleAttendance, adminLoaded } = useEvent();
  const [batch, setBatch] = useState<Plan>("core");
  const days = batch === "core" ? CORE_DAYS : FULL_DAYS;
  const [day, setDay] = useState(days[0] ?? "20 Nov");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const attendLock = useRef(false);
  const selected = days.includes(day) ? day : days[0];
  const rows = peopleOf(bookings).filter(({ booking, participant }) => booking.status === "paid" && (batch === "core" ? booking.plan === "core" : participant.programme === "comprehensive"));
  const saveAttendance = async (id: string, dayName: string) => {
    if (attendLock.current) return;
    attendLock.current = true;
    const key = `${id}:${dayName}`;
    setPendingKey(key);
    try {
      await toggleAttendance(id, dayName);
    } finally {
      attendLock.current = false;
      setPendingKey(null);
    }
  };
  return (
    <div className="stack">
      <div className="admin-head">
        <div>
          <h1>Attendance</h1>
          <p className="hint">The Excel file lists everyone who has paid. Write P in a morning’s column when they are present, and leave it blank when they are absent.</p>
        </div>
        <button className="btn btn-primary" type="button" disabled={!adminLoaded} onClick={() => downloadAttendance(bookings)}>Download Excel</button>
      </div>
      <div className="filters">
        <button type="button" className={batch === "core" ? "on" : ""} onClick={() => { setBatch("core"); setDay(CORE_DAYS[0] ?? "20 Nov"); }}>Core mornings</button>
        <button type="button" className={batch === "comprehensive" ? "on" : ""} onClick={() => { setBatch("comprehensive"); setDay("24 Nov"); }}>Comprehensive mornings</button>
      </div>
      <div className="filters">
        {days.slice(0, batch === "core" ? 4 : 12).map((item) => <button className={item === selected ? "day on" : "day"} type="button" key={item} onClick={() => setDay(item)}>{item}</button>)}
        {batch === "comprehensive" && (
          <select className="search" value={selected} onChange={(event) => setDay(event.target.value)}>
            {days.map((item) => <option key={item}>{item}</option>)}
          </select>
        )}
      </div>
      <section className="block table-wrap">
        {!adminLoaded ? <SkeletonRows columns={["Person", "Code", selected]} /> : (
        <table className="data">
          <thead><tr><th>Person</th><th>Code</th><th>{selected}</th></tr></thead>
          <tbody>
            {rows.map(({ participant }) => (
              <tr key={participant.id}>
                <td data-label="Person">{participant.name}</td>
                <td data-label="Code" className="num">{participant.code}</td>
                <td data-label={selected}><label className="agree"><input type="checkbox" checked={participant.attendance.includes(selected)} disabled={pendingKey !== null} onChange={() => { void saveAttendance(participant.id, selected); }} />Present{pendingKey === `${participant.id}:${selected}` && <Spinner />}</label></td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </section>
    </div>
  );
}

export function UpgradesPage() {
  const navigate = useNavigate();
  const { bookings, upgrades, adminLoaded } = useEvent();
  const rows = peopleOf(bookings).filter(({ booking }) => booking.plan === "core" && booking.status === "paid");
  return (
    <div className="stack">
      <div className="admin-head"><h1>Upgrades</h1><p className="hint">Seat kept until 23 Nov, 9 PM for anyone still on Core.</p></div>
      <section className="block table-wrap">
        {!adminLoaded ? <SkeletonRows columns={["Person", "Code", "Status", "Action"]} /> : (
        <table className="data">
          <thead><tr><th>Person</th><th>Code</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map(({ participant }) => (
              <tr key={participant.id}>
                <td data-label="Person">{participant.name}</td>
                <td data-label="Code" className="num">{participant.code}</td>
                <td data-label="Status">{participant.upgraded ? <span className="badge-up">Upgraded</span> : <span className="badge-unpaid">Core only</span>}</td>
                <td className="actions">{participant.upgraded ? upgrades.find((item) => item.participantIds.includes(participant.id))?.invoiceNo : <button className="btn btn-primary" style={{ minHeight: 40 }} type="button" onClick={() => navigate(`/upgrade?c=${participant.code}`)}>Open their upgrade link</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </section>
    </div>
  );
}

export function RevenuePage() {
  const { bookings, upgrades, adminLoaded } = useEvent();
  const loading = !adminLoaded;
  const paidBookings = bookings.filter((booking) => booking.status === "paid");
  const core = paidBookings.filter((booking) => booking.plan === "core").reduce((sum, booking) => sum + booking.total, 0);
  const full = paidBookings.filter((booking) => booking.plan === "comprehensive").reduce((sum, booking) => sum + booking.total, 0);
  const upgradeTotal = upgrades.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.total, 0);
  const gst = paidBookings.reduce((sum, booking) => sum + booking.gst, 0) + upgrades.reduce((sum, item) => sum + item.gst, 0);
  const total = core + full + upgradeTotal;
  const unpaid = bookings.filter((booking) => booking.status === "unpaid").reduce((sum, booking) => sum + booking.total, 0);
  const max = Math.max(core, full, upgradeTotal, 1);
  return (
    <div className="stack">
      <div className="admin-head"><h1>Revenue</h1></div>
      <div className="stats">
        <Stat label="Collected" value={`₹${inr(total)}`} loading={loading} />
        <Stat label="GST included" value={`₹${inr(gst)}`} loading={loading} />
        <Stat label="Unpaid holds" value={`₹${inr(unpaid)}`} loading={loading} />
        <Stat label="Payments" value={String(paidBookings.length + upgrades.length)} loading={loading} />
      </div>
      <section className="block">
        {loading ? (
          ["Core registrations", "Comprehensive registrations", "Upgrades"].map((label) => (
            <div key={label}>
              <div className="split"><span>{label}</span><Bone width="5em" /></div>
              <div className="bar"><span style={{ width: "42%" }} /></div>
            </div>
          ))
        ) : (
          <>
            <Bar label="Core registrations" amount={core} max={max} />
            <Bar label="Comprehensive registrations" amount={full} max={max} />
            <Bar label="Upgrades" amount={upgradeTotal} max={max} />
          </>
        )}
      </section>
      <section className="block table-wrap">
        {loading ? <SkeletonRows columns={["When", "What", "Invoice", "Amount"]} /> : (
        <table className="data">
          <thead><tr><th>When</th><th>What</th><th>Invoice</th><th>Amount</th></tr></thead>
          <tbody>
            {paidBookings.map((booking) => (
              <tr key={booking.id}>
                <td data-label="When">{formatWhen(booking.createdAt)}</td>
                <td data-label="What">{booking.plan === "core" ? "Core" : "Comprehensive"} · {booking.participants[0]?.name}</td>
                <td data-label="Invoice">{booking.invoiceNo}</td>
                <td data-label="Amount" className="num">₹{inr(booking.total)}</td>
              </tr>
            ))}
            {upgrades.map((upgrade) => (
              <tr key={upgrade.id}>
                <td data-label="When">{formatWhen(upgrade.createdAt)}</td>
                <td data-label="What">Upgrade · {upgrade.participantIds.length} {upgrade.participantIds.length === 1 ? "person" : "people"}</td>
                <td data-label="Invoice">{upgrade.invoiceNo}</td>
                <td data-label="Amount" className="num">₹{inr(upgrade.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </section>
    </div>
  );
}

function Bar({ label, amount, max }: { label: string; amount: number; max: number }) {
  return (
    <div>
      <div className="split"><span>{label}</span><span className="num">₹{inr(amount)}</span></div>
      <div className="bar"><span style={{ width: `${Math.max(4, (amount / max) * 100)}%` }} /></div>
    </div>
  );
}

function Stat({ label, value, loading = false }: { label: string; value: string; loading?: boolean }) {
  return <div className="stat"><span>{label}</span><strong>{loading ? <Bone width="4.5em" /> : value}</strong></div>;
}

function BatchCard({ title, dates, used, left, loading = false }: { title: string; dates: string; used: number; left: number; loading?: boolean }) {
  return (
    <div className="stat">
      <span>{title}</span>
      <strong>{loading ? <Bone width="5em" /> : `${left} open`}</strong>
      <p className="hint">{loading ? <Bone width="14em" /> : `${used} of ${CAPACITY} seats · ${dates} · ${SESSION_TIME}`}</p>
    </div>
  );
}

function Status({ booking }: { booking: Booking }) {
  const live = occupiesSeat(booking);
  if (booking.status === "paid") return <span className="badge-paid">Paid</span>;
  return <span className="badge-unpaid">{live ? "Unpaid · held" : "Unpaid · hold ended"}</span>;
}

function BookingTable({ bookings }: { bookings: Booking[] }) {
  const sorted = useMemo(() => bookings, [bookings]);
  return (
    <div className="table-wrap">
      <table className="data">
        <thead><tr><th>When</th><th>Payer</th><th>Batch</th><th>People</th><th>Status</th><th>Total</th></tr></thead>
        <tbody>
          {sorted.map((booking) => (
            <tr key={booking.id}>
              <td data-label="When">{formatWhen(booking.createdAt)}</td>
              <td data-label="Payer">{booking.participants[0]?.name}<br /><span className="hint">{booking.participants[0]?.whatsapp}</span></td>
              <td data-label="Batch">{booking.plan === "core" ? "Core" : "Comprehensive"}</td>
              <td data-label="People">{booking.participants.length}</td>
              <td data-label="Status"><Status booking={booking} /></td>
              <td data-label="Total" className="num">₹{inr(booking.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
