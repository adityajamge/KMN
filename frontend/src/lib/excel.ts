import { CORE_DAYS, FULL_DAYS } from "./constants";
import type { Booking } from "./types";

type SheetRow = {
  name: string;
  code: string;
  whatsapp: string;
  age: string;
  programme: string;
  attendance: string[];
};

const LATER_DAYS = FULL_DAYS.slice(CORE_DAYS.length);

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
  const paid = bookings
    .filter((booking) => booking.status === "paid")
    .flatMap((booking) => booking.participants.map((participant) => ({ booking, participant })));
  const rows = paid
    .map(({ participant }) => ({
      name: participant.name,
      code: participant.code,
      whatsapp: participant.whatsapp,
      age: String(participant.age || ""),
      programme: participant.upgraded ? "Core, then Comprehensive" : participant.programme === "comprehensive" ? "Comprehensive" : "Core",
      attendance: participant.attendance,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
  const continuing = rows.filter((row) => row.programme !== "Core");
  return workbook([
    sheet("24-27 Nov", CORE_DAYS, rows),
    sheet("28 Nov-23 Dec", LATER_DAYS, continuing),
  ]);
}

function workbook(sheets: string[]) {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel">
<Styles>
<Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#7B3FF6" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
<Style ss:ID="text"><NumberFormat ss:Format="@"/></Style>
</Styles>
${sheets.join("\n")}
</Workbook>`;
}

function sheet(name: string, days: string[], rows: SheetRow[]) {
  const headers = ["Name", "Code", "WhatsApp", "Age", "Programme", ...days, "Notes"];
  const widths = [180, 160, 130, 50, 180, ...days.map(() => 72), 160];
  const body = rows.map((row) => [
    row.name,
    row.code,
    row.whatsapp,
    row.age,
    row.programme,
    ...days.map((day) => (row.attendance.includes(`${day} late`) ? "L" : row.attendance.includes(day) ? "P" : "")),
    "",
  ]);
  return `<Worksheet ss:Name="${escapeXml(name)}">
<Table>
${widths.map((width) => `<Column ss:Width="${width}"/>`).join("")}
<Row ss:Height="22">${headers.map((header) => cell(header, "header")).join("")}</Row>
${body.map((line) => `<Row>${line.map((value) => cell(value, "text")).join("")}</Row>`).join("")}
</Table>
<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
<FreezePanes/>
<FrozenNoSplit/>
<SplitHorizontal>1</SplitHorizontal>
<TopRowBottomPane>1</TopRowBottomPane>
<ActivePane>2</ActivePane>
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
