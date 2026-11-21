import type { ReactNode } from "react";

export function Mark({ children, size = 22, width = 1.5, stroke = "currentColor" }: { children: ReactNode; size?: number; width?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function Waterline({ to }: { to: "night" | "fresh" }) {
  if (to === "fresh") {
    return (
      <svg aria-hidden="true" className="waterline rise" viewBox="0 0 1440 140" preserveAspectRatio="none">
        <path d="M0 80 C 260 20, 520 130, 760 70 S 1240 20, 1440 70 L 1440 140 L 0 140 Z" fill="var(--fresh)" />
        <path d="M0 64 C 280 10, 520 110, 780 56 S 1240 6, 1440 52" fill="none" stroke="color-mix(in srgb, var(--lilac) 50%, transparent)" strokeWidth="1" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className="waterline" viewBox="0 0 1440 120" preserveAspectRatio="none">
      <path className="sk-drift" d="M0 70 C 240 30, 480 110, 720 70 S 1200 30, 1440 70 L 1440 120 L 0 120 Z" fill="var(--night)" />
      <path d="M0 90 C 300 60, 520 120, 760 92 S 1220 62, 1440 88" fill="none" stroke="color-mix(in srgb, var(--lilac) 35%, transparent)" strokeWidth="1" />
    </svg>
  );
}
