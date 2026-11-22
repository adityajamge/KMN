import { CORE_DAYS, FULL_DAYS } from "./constants";
import type { Booking, Participant } from "./types";

type SheetRow = {
  name: string;
  programme: string;
  mobile: string;
  whatsapp: string;
  continues: boolean;
  attendance: string[];
};

const LEADING = ["Name", "Programme", "Mobile", "WhatsApp"];

export function downloadAttendance(bookings: Booking[]) {
  const xml = buildAttendanceWorkbook(bookings);
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "KMN-Nagpur-attendance.xls";
  link.click();
  URL.revokeObjectURL(url);
}

export function buildAttendanceWorkbook(bookings: Booking[]) {
  const rows = bookings
    .filter((booking) => booking.status === "paid")
    .flatMap((booking) => booking.participants)
    .map((participant) => ({
      name: participant.name,
      programme: programmeOf(participant),
      mobile: participant.whatsapp,
      whatsapp: participant.whatsapp,
      continues: participant.upgraded || participant.programme === "comprehensive",
      attendance: participant.attendance,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
  return workbook(sheet(rows));
}

function programmeOf(participant: Participant) {
  return participant.upgraded || participant.programme === "comprehensive" ? "Comprehensive" : "Core";
}

function markOf(attendance: string[], day: string) {
  const items = attendance.map((item) => item.trim().toLowerCase());
  const key = day.trim().toLowerCase();
  if (items.includes(`${key} late`)) return "Late";
  if (items.includes(key)) return "Present";
  return "Not yet";
}

function workbook(body: string) {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel">
<Styles>
<Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#7B3FF6" ss:Pattern="Solid"/><Alignment ss:Vertical="Center" ss:Horizontal="Center"/></Style>
<Style ss:ID="lead"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#7B3FF6" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
<Style ss:ID="text"><NumberFormat ss:Format="@"/></Style>
</Styles>
${body}
</Workbook>`;
}

function sheet(rows: SheetRow[]) {
  const headers = [...LEADING, ...FULL_DAYS];
  const widths = [180, 140, 120, 120, ...FULL_DAYS.map(() => 72)];
  const body = rows.map((row) => [
    row.name,
    row.programme,
    row.mobile,
    row.whatsapp,
    ...FULL_DAYS.map((day, index) => (row.continues || index < CORE_DAYS.length ? markOf(row.attendance, day) : "")),
  ]);
  return `<Worksheet ss:Name="Attendance">
<Table>
${widths.map((width) => `<Column ss:Width="${width}"/>`).join("")}
<Row ss:Height="22">${headers.map((header, index) => cell(header, index < LEADING.length ? "lead" : "header")).join("")}</Row>
${body.map((line) => `<Row>${line.map((value) => cell(value, "text")).join("")}</Row>`).join("")}
</Table>
<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
<FreezePanes/>
<FrozenNoSplit/>
<SplitHorizontal>1</SplitHorizontal>
<TopRowBottomPane>1</TopRowBottomPane>
<SplitVertical>${LEADING.length}</SplitVertical>
<LeftColumnRightPane>${LEADING.length}</LeftColumnRightPane>
<ActivePane>0</ActivePane>
</WorksheetOptions>
</Worksheet>`;
}

function cell(value: string, style: string) {
  return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
