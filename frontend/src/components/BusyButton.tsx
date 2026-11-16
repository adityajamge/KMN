import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  children: ReactNode;
};

export function BusyButton({ busy = false, children, disabled, type = "button", ...props }: Props) {
  return (
    <button {...props} type={type} disabled={disabled || busy} aria-busy={busy || undefined}>
      {busy && <Spinner />}
      {children}
    </button>
  );
}
