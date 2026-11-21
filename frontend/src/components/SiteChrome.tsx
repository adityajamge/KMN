import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ANDROID_APP_URL, CALL_URL, DISCLAIMER, EMAIL_URL, INSTAGRAM_URL, IOS_APP_URL, RAZORPAY_URL, WHATSAPP_URL } from "../lib/constants";

export function Logo({ small = false }: { small?: boolean }) {
  return <img className={small ? "logo small" : "logo"} src="/media/logo.png" alt="Shadanga Kriya" />;
}

export function TopBar({ action }: { action?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="wrap">
        <Link to="/" aria-label="Shadanga Kriya home"><Logo /></Link>
        {action}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="row">
          <Logo small />
          <div className="links">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href={CALL_URL}>Call</a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <a href={EMAIL_URL}>Email</a>
            <a href={IOS_APP_URL} target="_blank" rel="noopener noreferrer">App Store</a>
            <a href={ANDROID_APP_URL} target="_blank" rel="noopener noreferrer">Google Play</a>
            <a href={RAZORPAY_URL} target="_blank" rel="noopener noreferrer">Razorpay</a>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms & refunds</Link>
            <Link to="/consent">Consent form</Link>
            <Link to="/admin">Event desk</Link>
          </div>
        </div>
        <address className="venue-lines">
          <strong>Shadanga Kriya Centre</strong>
          <span>5th Floor, NCM Society Building,</span>
          <span>Pl. No. 434, Hanuman Nagar,</span>
          <span>Near Krida Chowk,</span>
          <span>Medical Road Nagpur -24,</span>
          <span>Maharashtra, INDIA</span>
        </address>
        <p className="disclaimer">{DISCLAIMER}</p>
      </div>
    </footer>
  );
}

export function GstNote({ amount, gst = false }: { amount: string; gst?: boolean }) {
  return <span className="num">₹{amount}<span className="gst-bit">{gst ? "+ 18% GST" : "incl. GST"}</span></span>;
}
