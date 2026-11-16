import { Route, Routes } from "react-router-dom";
import { AdminLayout, AttendancePage, BookingsPage, CheckInPage, OverviewPage, ParticipantsPage, RevenuePage, UpgradesPage } from "./pages/Admin";
import { InvitationPage, InvoicePage, UpgradeInvoicePage } from "./pages/Documents";
import Landing from "./pages/Landing";
import { ConsentPage, PrivacyPage, TermsPage } from "./pages/Legal";
import Payment from "./pages/Payment";
import { BookingConfirmed, PaymentFailed, UpgradeConfirmed, UpgradeFailed } from "./pages/Results";
import Upgrade from "./pages/Upgrade";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pay" element={<Payment />} />
      <Route path="/pay/failed" element={<PaymentFailed />} />
      <Route path="/booking/:id" element={<BookingConfirmed />} />
      <Route path="/invoice/:id" element={<InvoicePage />} />
      <Route path="/invitation/:id" element={<InvitationPage />} />
      <Route path="/upgrade" element={<Upgrade />} />
      <Route path="/upgrade/failed" element={<UpgradeFailed />} />
      <Route path="/upgrade/confirmed/:id" element={<UpgradeConfirmed />} />
      <Route path="/upgrade-invoice/:id" element={<UpgradeInvoicePage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/consent" element={<ConsentPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="participants" element={<ParticipantsPage />} />
        <Route path="check-in" element={<CheckInPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="upgrades" element={<UpgradesPage />} />
        <Route path="revenue" element={<RevenuePage />} />
      </Route>
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
