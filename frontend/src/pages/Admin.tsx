import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BusyButton } from "../components/BusyButton";
import { Logo } from "../components/SiteChrome";
import { Bone, SkeletonRows } from "../components/Skeleton";
import { occupiesSeat, seatsUsed, useEvent } from "../data/store";
import { CAPACITY, CORE_DAYS, CORE_DATES, FULL_DAYS, FULL_DATES, SESSION_TIME, UPGRADE_HOLD, VENUE_SHORT } from "../lib/constants";
import { downloadAttendance } from "../lib/excel";
import { formatWhen, inr } from "../lib/format";
import type { Booking, Participant, Plan } from "../lib/types";

const NAV = [
  { to: "/admin", end: true, label: "Overview", icon: "M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" },
  { to: "/admin/participants", label: "Registrations", icon: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8" },
  { to: "/admin/check-in", label: "Check-in", icon: "M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M8 12l3 3 5-6" },
  { to: "/admin/attendance", label: "Attendance", icon: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" },
  { to: "/admin/bookings", label: "Bookings", icon: "M3 6h18v12H3zM3 10h18M7 15h4" },
  { to: "/admin/upgrades", label: "Upgrades", icon: "M12 19V5M5 12l7-7 7 7" },
  { to: "/admin/revenue", label: "Revenue", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
];

const PAGE: Record<string, { title: string; sub: string }> = {
  "/admin": { title: "Overview", sub: `Nagpur · ${CORE_DATES} · ${SESSION_TIME}` },
  "/admin/check-in": { title: "Check-in", sub: "Slide to the morning. Everyone paid for that day is listed. Check in marks their attendance for that day." },
  "/admin/attendance": { title: "Attendance", sub: "A view of all 30 mornings. Green is present, yellow is late, silver is not yet. Marks are saved from Check-in." },
  "/admin/participants": { title: "Registrations", sub: "Every person registered for this Nagpur batch, searchable in seconds." },
  "/admin/bookings": { title: "Bookings", sub: "Paid and unpaid bookings for this centre." },
  "/admin/upgrades": { title: "Upgrades", sub: `Core to Comprehensive. A seat stays held until ${UPGRADE_HOLD}.` },
  "/admin/revenue": { title: "Revenue", sub: "Collected for this Nagpur batch. GST is included in the totals." },
};

export function AdminLayout() {
  const { refreshAdmin, connectionError } = useEvent();
  const location = useLocation();
  const page = PAGE[location.pathname] ?? PAGE["/admin"];
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    void refreshAdmin();
    const timer = window.setInterval(() => { void refreshAdmin(); }, 20000);
    return () => window.clearInterval(timer);
  }, [refreshAdmin]);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  return (
    <div className={menuOpen ? "admin menu-open" : "admin"}>
      <aside className="side">
        <button className="burger side-close" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
          <span /><span /><span />
        </button>
        <Logo small />
        <p className="side-role">Nagpur desk</p>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <NavIcon d={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-user">
          <span>Nagpur desk</span>
          <strong>One centre</strong>
          <Link to="/">Public site</Link>
        </div>
      </aside>
      <div className="desk-main">
        <header className="adm-top">
          <button className="burger" type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <span /><span /><span />
          </button>
          <div>
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link className="crumb" to="/admin/check-in">Nagpur</Link>
              <span className="crumb-sep" aria-hidden="true">›</span>
              <span className="crumb-here">{page.title}</span>
            </nav>
            <p className="batch-line">Core {CORE_DATES} · Comprehensive {FULL_DATES} · {SESSION_TIME}</p>
            <p className="site-line"><span className="live-dot" aria-hidden="true" />One centre · {VENUE_SHORT}</p>
          </div>
        </header>
        {menuOpen && <button className="desk-shade" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
        <main>
          <div className="adm-content">
            <h1>{page.title}</h1>
            <p className="adm-sub">{page.sub}</p>
            {connectionError && <p className="form-error">{connectionError}</p>}
            <Outlet key={location.pathname} />
          </div>
        </main>
      </div>
    </div>
  );
}

function NavIcon({ d }: { d: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

const DAYS = FULL_DAYS;

function todayIndex() {
  const label = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return DAYS.indexOf(label);
}

function markOf(attendance: string[], day: string): "P" | "L" | "" {
  const items = attendance.map((item) => item.trim().toLowerCase());
  const key = day.trim().toLowerCase();
  if (items.includes(`${key} late`)) return "L";
  if (items.includes(key)) return "P";
  return "";
}

function continues(participant: Participant) {
  return participant.upgraded || participant.programme === "comprehensive";
}

function onProgramme(participant: Participant, index: number) {
  return continues(participant) || index < CORE_DAYS.length;
}

function dayLine(index: number) {
  const start = new Date(2026, 10, 24);
  const date = new Date(start);
  date.setDate(start.getDate() + index);
  const when = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  return `${when} · ${index < CORE_DAYS.length ? "Core morning" : "Comprehensive morning"}`;
}

function DayBar({ index, onChange }: { index: number; onChange: (next: number) => void }) {
  const today = todayIndex();
  return (
    <div className="day-slider">
      <div className="daybar">
        <button type="button" className="btn btn-ghost sm" aria-label="Previous day" disabled={index <= 0} onClick={() => onChange(index - 1)}>‹</button>
        <div>
          <strong>Day {index + 1} of {DAYS.length}</strong>
          <span>{dayLine(index)}</span>
        </div>
        <button type="button" className="btn btn-ghost sm" aria-label="Next day" disabled={index >= DAYS.length - 1} onClick={() => onChange(index + 1)}>›</button>
        <button type="button" className="btn btn-soft sm" onClick={() => onChange(today >= 0 ? today : 0)}>{today >= 0 ? "Today" : "Day 1"}</button>
      </div>
      <label className="day-range">
        <span className="sr">Choose a programme day</span>
        <input type="range" min={0} max={DAYS.length - 1} step={1} value={index} aria-valuemin={1} aria-valuemax={DAYS.length} aria-valuenow={index + 1} aria-valuetext={`Day ${index + 1}, ${DAYS[index]}`} onChange={(event) => onChange(Number(event.target.value))} />
      </label>
      <div className="day-scale"><span>Day 1</span><span>Day {DAYS.length}</span></div>
    </div>
  );
}

function attendanceStats(participant: Participant) {
  const today = todayIndex();
  let possible = 0;
  let present = 0;
  let streak = 0;
  let counting = true;
  for (let index = today - 1; index >= 0; index -= 1) {
    if (!onProgramme(participant, index)) continue;
    possible += 1;
    const mark = markOf(participant.attendance, DAYS[index]);
    if (mark) present += 1;
    if (counting) {
      if (mark) streak += 1;
      else counting = false;
    }
  }
  return { pct: possible ? Math.round((present / possible) * 100) : 0, streak };
}

function cellKind(_index: number, mark: "P" | "L" | "", applies: boolean) {
  if (!applies) return "na";
  if (mark === "L" || mark === "P") return mark;
  return "F";
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
      <div className="toolbar">
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
      <div className="desk-split">
        <section className="block flush">
          <div className="card-h"><h2>Latest bookings</h2></div>
          {loading ? <SkeletonRows columns={["When", "Payer", "Batch", "People", "Status", "Total"]} rows={3} /> : <BookingTable bookings={bookings.slice(0, 5)} />}
        </section>
        <section className="block shortcuts">
          <h2>Shortcuts</h2>
          <Link className="btn btn-primary lg" to="/admin/check-in"><NavIcon d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M8 12l3 3 5-6" />Start check-in</Link>
          <Link className="btn btn-soft lg" to="/admin/attendance"><NavIcon d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />Take attendance</Link>
          <Link className="btn btn-soft lg" to="/admin/participants"><NavIcon d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7M21 19v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8" />Registrations</Link>
        </section>
      </div>
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
      <div className="filter-row">
        <div className="filters">
          {(["all", "paid", "unpaid"] as const).map((item) => <button key={item} className={filter === item ? "on" : ""} type="button" onClick={() => setFilter(item)}>{item}</button>)}
        </div>
        <div className="filters">
          {(["all", "core", "comprehensive"] as const).map((item) => <button key={item} className={plan === item ? "on" : ""} type="button" onClick={() => setPlan(item)}>{item === "comprehensive" ? "comprehensive" : item}</button>)}
        </div>
      </div>
      <section className="block flush">{adminLoaded ? <BookingTable bookings={rows} /> : <SkeletonRows columns={["When", "Payer", "Batch", "People", "Status", "Total"]} />}</section>
    </div>
  );
}

export function ParticipantsPage() {
  const { bookings, adminLoaded } = useEvent();
  const [query, setQuery] = useState("");
  const [programme, setProgramme] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const rows = peopleOf(bookings).filter(({ participant }) => {
    if (programme === "core" && (participant.programme !== "core" || participant.upgraded)) return false;
    if (programme === "comprehensive" && (participant.programme !== "comprehensive" || participant.upgraded)) return false;
    if (programme === "upgraded" && !participant.upgraded) return false;
    if (!needle) return true;
    const haystack = `${participant.name} ${participant.code} ${participant.whatsapp}`.toLowerCase();
    return haystack.includes(needle) || participant.code.toLowerCase().endsWith(needle);
  });
  const selected = rows.find(({ participant }) => participant.id === selectedId) ?? null;
  return (
    <div className="stack">
      <div className="toolbar">
        <p className="hint">One row per person, with their own code and attendance.</p>
        <label className="finder">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5C5670" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
          <span className="sr">Search</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code, last 4, name or WhatsApp" />
        </label>
      </div>
      <label className="sel">Programme
        <select value={programme} onChange={(event) => setProgramme(event.target.value)}>
          <option value="all">All programmes</option>
          <option value="core">Core</option>
          <option value="comprehensive">Comprehensive</option>
          <option value="upgraded">Upgraded</option>
        </select>
      </label>
      <div className="desk-split">
        <section className="block flush">
          <div className="card-h"><h2>{adminLoaded ? `${rows.length} ${rows.length === 1 ? "person" : "people"}` : "Registrations"}</h2></div>
          {!adminLoaded ? <SkeletonRows columns={["Name", "Code", "Programme", "WhatsApp", "Attendance", "Flags"]} /> : (
            <div className="table-wrap">
              <div className="reg-table" role="table">
                <div className="reg-row head" role="row"><span>Name</span><span>Code</span><span>Programme</span><span>WhatsApp</span><span>Attendance</span><span>Flags</span></div>
                {rows.map(({ booking, participant }) => {
                  const stats = attendanceStats(participant);
                  const label = participant.upgraded ? "Upgraded" : participant.programme === "core" ? "Core" : "Comprehensive";
                  return (
                    <div className={participant.id === selectedId ? "reg-row on" : "reg-row"} role="row" key={participant.id}>
                      <span><button type="button" className="link" onClick={() => setSelectedId(participant.id)}>{participant.name}</button>{participant.age > 0 && participant.age < 18 && <> <span className="chip info">Under 18</span></>}</span>
                      <span className="mono">{participant.code || "After payment"}</span>
                      <span>{label}<br /><Status booking={booking} /></span>
                      <span className="mono">{participant.whatsapp}</span>
                      <span>{stats.pct}%</span>
                      <span className="flags">{participant.healthNote && <span className="chip warn">Health</span>}{participant.checkedIn && <span className="chip ok">Checked in</span>}</span>
                    </div>
                  );
                })}
                {rows.length === 0 && <p className="empty">No one matches. Clear a filter, or search by the last 4 characters of the code.</p>}
              </div>
            </div>
          )}
        </section>
        {selected && (
          <aside className="block panel" aria-label="Participant details">
            <div className="card-h">
              <div>
                <h2>{selected.participant.name}</h2>
                <span className="mono hint">{selected.participant.code}</span>
              </div>
              <button type="button" className="btn btn-ghost sm" onClick={() => setSelectedId(null)}>Close</button>
            </div>
            <div className="kv">
              <span>Programme</span><span>{selected.participant.upgraded ? "Upgraded to Comprehensive" : selected.participant.programme === "core" ? "Core" : "Comprehensive"}</span>
              <span>Age</span><span>{selected.participant.age || "—"} · {selected.participant.role || "—"}</span>
              <span>WhatsApp</span><span className="mono">{selected.participant.whatsapp}</span>
              <span>City</span><span>{selected.participant.city}{selected.participant.area ? ` · ${selected.participant.area}` : ""}</span>
              <span>Checked in</span><span>{selected.participant.checkedIn ? "Yes" : "Not yet"}</span>
              {selected.participant.guardianName && <><span>Guardian</span><span>{selected.participant.guardianName} · {selected.participant.guardianPhone}</span></>}
            </div>
            <div className="sub-card">
              <span className="lbl">Attendance · {attendanceStats(selected.participant).pct}% · streak {attendanceStats(selected.participant).streak}</span>
              <div className="strip" aria-label="Attendance by day">
                {DAYS.map((day, index) => {
                  const mark = markOf(selected.participant.attendance, day);
                  const kind = cellKind(index, mark, onProgramme(selected.participant, index));
                  return <span key={day} className={`cell ${kind}`} title={`${day}${kind === "P" ? " · present" : kind === "L" ? " · late" : kind === "F" ? " · not yet" : ""}`} />;
                })}
              </div>
              <span className="legend"><span className="cell P" />Present <span className="cell L" />Late <span className="cell F" />Not yet</span>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export function CheckInPage() {
  const { bookings, setCheckIn, setAttendance, adminLoaded } = useEvent();
  const [find, setFind] = useState("");
  const [show, setShow] = useState<"all" | "waiting" | "in">("all");
  const [dayIndex, setDayIndex] = useState(() => {
    const today = todayIndex();
    return today >= 0 ? today : 0;
  });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const checkLock = useRef(false);
  const day = DAYS[dayIndex] ?? DAYS[0];
  const needle = find.trim().toLowerCase();
  const dayPeople = peopleOf(bookings).filter(({ booking, participant }) => booking.status === "paid" && onProgramme(participant, dayIndex));
  const onTime = dayPeople.filter(({ participant }) => markOf(participant.attendance, day) === "P").length;
  const late = dayPeople.filter(({ participant }) => markOf(participant.attendance, day) === "L").length;
  const checkedCount = onTime + late;
  const waiting = dayPeople.length - checkedCount;
  const rows = dayPeople.filter(({ participant }) => {
    const mark = markOf(participant.attendance, day);
    if (show === "waiting" && mark) return false;
    if (show === "in" && !mark) return false;
    if (!needle) return true;
    return participant.name.toLowerCase().includes(needle) || participant.code.toLowerCase().includes(needle) || participant.whatsapp.includes(needle);
  }).sort((a, b) => {
    const aDone = markOf(a.participant.attendance, day) ? 1 : 0;
    const bDone = markOf(b.participant.attendance, day) ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return a.participant.name.localeCompare(b.participant.name);
  });
  const save = async (participant: Participant, mark: "P" | "L" | "") => {
    if (checkLock.current) return;
    checkLock.current = true;
    setPendingId(`${participant.id}:${mark}`);
    try {
      await setAttendance(participant.id, day, mark);
      const other = DAYS.some((item, index) => index !== dayIndex && markOf(participant.attendance, item));
      await setCheckIn(participant.id, mark !== "" || other);
    } finally {
      checkLock.current = false;
      setPendingId(null);
    }
  };
  return (
    <div className="stack">
      <section className="block">
        <DayBar index={dayIndex} onChange={setDayIndex} />
        <div className="counter">
          <span className="big">{adminLoaded ? checkedCount : "–"}</span>
          <span>of {adminLoaded ? dayPeople.length : "–"} checked in · Day {dayIndex + 1}</span>
          <span className="ci-split">
            <span className="chip ontime">On time {adminLoaded ? onTime : "–"}</span>
            <span className="chip late">Late {adminLoaded ? late : "–"}</span>
          </span>
          <div className="bar" aria-hidden="true"><span style={{ width: `${dayPeople.length ? (checkedCount / dayPeople.length) * 100 : 0}%` }} /></div>
        </div>
      </section>
      <div className="toolbar">
        <div className="filters" role="group" aria-label="Who to show">
          <button type="button" className={show === "all" ? "on" : ""} onClick={() => setShow("all")}>All {adminLoaded ? dayPeople.length : ""}</button>
          <button type="button" className={show === "waiting" ? "on" : ""} onClick={() => setShow("waiting")}>Waiting {adminLoaded ? waiting : ""}</button>
          <button type="button" className={show === "in" ? "on" : ""} onClick={() => setShow("in")}>Checked in {adminLoaded ? checkedCount : ""}</button>
        </div>
        <label className="finder">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5C5670" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
          <span className="sr">Find a person</span>
          <input type="search" value={find} onChange={(event) => setFind(event.target.value)} placeholder="Name, code or WhatsApp" />
        </label>
      </div>
      {dayIndex >= CORE_DAYS.length && <p className="hint">From Day 5 this list is Comprehensive only. Core finished on Day 4.</p>}
      <section className="block flush">
        <div className="card-h"><h2>{adminLoaded ? `${rows.length} ${rows.length === 1 ? "person" : "people"}` : "Eligible this morning"}</h2></div>
        {!adminLoaded ? <SkeletonRows columns={["Person", "Programme", "WhatsApp", "This morning", "Check in"]} /> : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Programme</th>
                  <th>WhatsApp</th>
                  <th>This morning</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ participant }) => {
                  const mark = markOf(participant.attendance, day);
                  const programme = participant.upgraded || participant.programme === "comprehensive" ? "Comprehensive" : "Core";
                  return (
                    <tr key={participant.id}>
                      <td data-label="Person"><strong>{participant.name}</strong><br /><span className="hint mono">{participant.code}</span></td>
                      <td data-label="Programme">{programme}</td>
                      <td data-label="WhatsApp" className="mono">{participant.whatsapp}</td>
                      <td data-label="This morning">{mark === "L" ? <span className="chip late">Late</span> : mark === "P" ? <span className="chip ontime">On time</span> : <span className="chip info">Waiting</span>}</td>
                      <td className="actions">
                        <div className="ci-actions">
                          {mark ? (
                            <BusyButton className="btn btn-ghost sm" busy={pendingId === `${participant.id}:`} disabled={pendingId !== null} onClick={() => { void save(participant, ""); }}>Undo</BusyButton>
                          ) : (
                            <>
                              <BusyButton className="btn sm ci-on" busy={pendingId === `${participant.id}:P`} disabled={pendingId !== null} onClick={() => { void save(participant, "P"); }}>Check in</BusyButton>
                              <BusyButton className="btn sm ci-late" busy={pendingId === `${participant.id}:L`} disabled={pendingId !== null} onClick={() => { void save(participant, "L"); }}>Late</BusyButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td className="empty" colSpan={5}>No one eligible for this morning matches.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function AttendancePage() {
  const { bookings, adminLoaded } = useEvent();
  const [dayIndex, setDayIndex] = useState(0);
  const rows = peopleOf(bookings).filter(({ booking }) => booking.status === "paid");
  return (
    <div className="stack">
      <div className="toolbar">
        <p className="hint">Days 1–4 are Core. Days 5–30 are Comprehensive. This grid shows the marks saved from Check-in.</p>
        <button className="btn btn-primary sm" type="button" disabled={!adminLoaded} onClick={() => downloadAttendance(bookings)}>Download Excel</button>
      </div>
      <DayBar index={dayIndex} onChange={setDayIndex} />
      <p className="hint">Green is a present mark saved for that morning. Yellow is a late mark. Silver means that morning has no mark yet.</p>
      <section className="block flush">
        {!adminLoaded ? <SkeletonRows columns={["Person"]} /> : (
          <div className="table-wrap">
            <div className="att-table">
              <div className="att-row head">
                <span className="stick">Person</span>
                {DAYS.map((day, index) => <span key={day} className={index === dayIndex ? "day-h on" : "day-h"} title={day}>{index + 1}</span>)}
              </div>
              {rows.map(({ participant }) => {
                const label = participant.upgraded ? "Upgraded" : participant.programme === "core" ? "Core" : "Comprehensive";
                return (
                  <div className="att-row" key={participant.id}>
                    <span className="stick"><strong>{participant.name}</strong><br /><span className="hint">{label}</span></span>
                    {DAYS.map((day, index) => {
                      const mark = markOf(participant.attendance, day);
                      const kind = cellKind(index, mark, onProgramme(participant, index));
                      return (
                        <span key={day}>
                          <span className={`cell ${kind}${index === dayIndex ? " focus" : ""}`} title={`${participant.name} · ${day}${kind === "P" ? " · present" : kind === "L" ? " · late" : kind === "F" ? " · not yet" : ""}`} />
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="legend-row">
          <span><span className="cell P" />Present</span>
          <span><span className="cell L" />Late</span>
          <span><span className="cell F" />Not yet</span>
          <span className="hint">Days 1–4 Core · 5–30 Comprehensive</span>
        </div>
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
      <section className="block flush">
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
      <section className="block flush">
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
      <div className="bar" aria-hidden="true"><span style={{ width: `${CAPACITY ? (used / CAPACITY) * 100 : 0}%` }} /></div>
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
