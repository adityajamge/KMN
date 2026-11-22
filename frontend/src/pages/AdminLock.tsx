import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react";
import { ApiError, api } from "../lib/api";
import { Logo } from "../components/SiteChrome";

type Gate = "loading" | "setup" | "login";

export function AdminLock({ gate, notice, onReady, onNeedLogin }: {
  gate: Gate;
  notice?: string;
  onReady: () => void;
  onNeedLogin: () => void;
}) {
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(notice || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setError(notice || ""); }, [notice]);

  useEffect(() => {
    if (gate !== "setup") return;
    let live = true;
    api.adminSetupQr()
      .then((data) => { if (live) setQr(data.qr); })
      .catch((err) => {
        if (!live) return;
        if (err instanceof ApiError && (err.status === 404 || err.status === 409)) onNeedLogin();
        else setError(err instanceof Error ? err.message : "The QR code could not be loaded.");
      });
    return () => { live = false; };
  }, [gate, onNeedLogin]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter all 6 digits from Google Authenticator.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (gate === "setup") await api.adminSetup(code);
      else await api.adminLogin(code);
      onReady();
    } catch (err) {
      setCode("");
      if (err instanceof ApiError && err.status === 409) onNeedLogin();
      else setError(err instanceof Error ? err.message : "That code was not accepted.");
    } finally {
      setBusy(false);
    }
  }

  const title = gate === "setup" ? "Set up the desk" : "Sign in to the desk";
  const action = gate === "setup" ? "Confirm and sign in" : "Sign in";

  return (
    <div className="admin-lock">
      <form className="admin-lock-card" onSubmit={submit}>
        <div className="admin-lock-mark"><Logo /></div>
        <p className="admin-lock-name">Shadanga Kriya</p>
        <h1>{gate === "loading" ? "Checking the desk" : title}</h1>
        {gate === "loading" && <p className="admin-lock-sub">Looking for today’s sign-in on this browser.</p>}
        {gate === "setup" && (
          <>
            <p className="admin-lock-sub">Scan with Google Authenticator, then enter the 6-digit code. This QR is shown only until the first code is accepted.</p>
            {qr ? <img className="admin-lock-qr" src={qr} alt="QR code for Google Authenticator" width={200} height={200} /> : <p className="admin-lock-sub">Preparing the QR code…</p>}
          </>
        )}
        {gate === "login" && <p className="admin-lock-sub">Nagpur centre. Enter the code from Google Authenticator. This sign-in ends at midnight.</p>}
        {gate !== "loading" && (
          <>
            <CodeBoxes value={code} onChange={setCode} disabled={busy} />
            {error && <p className="admin-lock-error" role="alert">{error}</p>}
            <button type="submit" disabled={busy}>{busy ? "Checking…" : action}</button>
          </>
        )}
        {gate === "loading" && error && <p className="admin-lock-error" role="alert">{error}</p>}
      </form>
    </div>
  );
}

function CodeBoxes({ value, onChange, disabled }: { value: string; onChange: (next: string) => void; disabled?: boolean }) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  function write(next: string, focus: number) {
    const clean = next.replace(/\D/g, "").slice(0, 6);
    onChange(clean);
    boxes.current[Math.min(focus, 5)]?.focus();
  }

  function onDigit(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      write(value.slice(0, index) + value.slice(index + 1), index);
      return;
    }
    if (clean.length > 1) {
      write(value.slice(0, index) + clean, index + clean.length);
      return;
    }
    write(value.slice(0, index) + clean + value.slice(index + 1), index + 1);
  }

  function onKey(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      write(value.slice(0, index - 1) + value.slice(index), index - 1);
    } else if (event.key === "ArrowLeft" && index > 0) {
      boxes.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < 5) {
      boxes.current[index + 1]?.focus();
    }
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData("text");
    if (!/\d/.test(text)) return;
    event.preventDefault();
    write(text, text.replace(/\D/g, "").length);
  }

  return (
    <div className="otp" onPaste={onPaste}>
      <span className="otp-label" id="admin-code-label">Authenticator code</span>
      <div className="otp-row" role="group" aria-labelledby="admin-code-label">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => { boxes.current[index] = node; }}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${index + 1}`}
            maxLength={index === 0 ? 6 : 1}
            value={digit}
            disabled={disabled}
            autoFocus={index === 0}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => onDigit(index, event.target.value)}
            onKeyDown={(event) => onKey(index, event)}
          />
        ))}
      </div>
    </div>
  );
}
