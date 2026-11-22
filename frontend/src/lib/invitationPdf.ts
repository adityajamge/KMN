import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

type HotLink = { x: number; y: number; w: number; h: number; url: string };

function linksOn(card: HTMLElement): HotLink[] {
  const cardBox = card.getBoundingClientRect();
  return [...card.querySelectorAll<HTMLAnchorElement>("a[href]")].flatMap((anchor) => {
    const box = anchor.getBoundingClientRect();
    const url = anchor.href;
    if (!url || box.width < 1 || box.height < 1) return [];
    return [{
      x: box.left - cardBox.left,
      y: box.top - cardBox.top,
      w: box.width,
      h: box.height,
      url,
    }];
  });
}

export async function downloadInvitationPdf(cards: HTMLElement[], filename: string) {
  if (!cards.length) return;
  const pages = [];
  for (const card of cards) {
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const links = linksOn(card);
    const dataUrl = await toPng(card, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#140A2E",
      width,
      height,
      style: { margin: "0", transform: "none" },
    });
    pages.push({ dataUrl, width, height, links });
  }
  const first = pages[0];
  const pdf = new jsPDF({
    unit: "px",
    format: [first.width, first.height],
    orientation: first.height >= first.width ? "portrait" : "landscape",
    hotfixes: ["px_scaling"],
    compress: true,
  });
  pages.forEach((page, index) => {
    if (index > 0) pdf.addPage([page.width, page.height], page.height >= page.width ? "portrait" : "landscape");
    pdf.addImage(page.dataUrl, "PNG", 0, 0, page.width, page.height);
    page.links.forEach((link) => pdf.link(link.x, link.y, link.w, link.h, { url: link.url }));
  });
  pdf.save(filename);
}
