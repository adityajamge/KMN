const express = require("express");
const cors = require("cors");
const { ensureSchema } = require("./db");
const service = require("./lib/service");
const payments = require("./lib/payments");
const notify = require("./lib/notify");
const adminAuth = require("./lib/adminAuth");

const app = express();
const port = Number(process.env.PORT) || 4001;
const origins = (process.env.ALLOWED_ORIGINS || "http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!String(process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test_") || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn("Razorpay test mode is not configured. Pay stays closed until RAZORPAY_KEY_ID is a test key.");
}

if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
  console.warn("WhatsApp Cloud API is not configured. Automatic messages stay off until the Meta token and phone number ID are set.");
}

app.set("trust proxy", 1);
app.use(cors({ origin: origins, credentials: true, allowedHeaders: ["Content-Type"] }));
app.use(express.json({ limit: "100kb" }));

function requireAdmin(req, res, next) {
  adminAuth.requireSession(req).then((ok) => {
    if (!ok) return res.status(401).json({ error: "Sign in with the authenticator code." });
    return next();
  }).catch(next);
}

function asyncRoute(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/seats", asyncRoute(async (_req, res) => {
  res.json(await service.seatsLeft());
}));

app.post("/api/bookings", asyncRoute(async (req, res) => {
  res.status(201).json(await service.createHold(req.body?.plan, req.body?.people));
}));

app.get("/api/bookings/:id", asyncRoute(async (req, res) => {
  res.json(await service.getBooking(req.params.id));
}));

app.post("/api/payments/order", asyncRoute(async (req, res) => {
  res.status(201).json(await payments.createOrder(req.body));
}));

app.post("/api/payments/confirm", asyncRoute(async (req, res) => {
  res.json(await payments.confirmOrder(req.body));
}));

app.get("/api/lookup", asyncRoute(async (req, res) => {
  res.json(await service.lookup(req.query.code, req.query.phone));
}));

app.get("/api/participants/:id", asyncRoute(async (req, res) => {
  res.json({ booking: await service.getParticipantBooking(req.params.id) });
}));

app.get("/api/upgrades/:id", asyncRoute(async (req, res) => {
  res.json(await service.getUpgrade(req.params.id));
}));

app.get("/api/admin/session", asyncRoute(async (req, res) => {
  if (await adminAuth.requireSession(req)) return res.json({ status: "ok" });
  res.json({ status: await adminAuth.status() });
}));

app.get("/api/admin/setup", asyncRoute(async (_req, res) => {
  res.json(await adminAuth.setupQr());
}));

app.post("/api/admin/setup", asyncRoute(async (req, res) => {
  res.json(await adminAuth.acceptCode(req, res, { confirm: true }));
}));

app.post("/api/admin/login", asyncRoute(async (req, res) => {
  res.json(await adminAuth.acceptCode(req, res, { confirm: false }));
}));

app.post("/api/admin/logout", asyncRoute(async (_req, res) => {
  await adminAuth.clearSession(res);
  res.json({ ok: true });
}));

app.get("/api/admin/state", requireAdmin, asyncRoute(async (_req, res) => {
  res.json(await service.adminState());
}));

app.patch("/api/admin/participants/:id/check-in", requireAdmin, asyncRoute(async (req, res) => {
  res.json({ booking: await service.setCheckIn(req.params.id, req.body?.checkedIn) });
}));

app.patch("/api/admin/participants/:id/attendance", requireAdmin, asyncRoute(async (req, res) => {
  res.json({ booking: await service.toggleAttendance(req.params.id, req.body?.day, req.body?.mark) });
}));

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: status >= 500 ? "Something went wrong. Please try again." : error.message,
  });
});

ensureSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`KMN event API listening on http://localhost:${port}`);
      adminAuth.status().then((state) => {
        if (state !== "login") {
          console.warn("The Nagpur desk is locked. The first person to scan the QR on /admin owns the authenticator.");
        }
      }).catch((error) => console.error(error.message));
      const tick = () => { notify.runSchedule().catch((error) => console.error(error.message)); };
      tick();
      setInterval(tick, 15 * 60 * 1000);
    });
  })
  .catch((error) => {
    console.error("Could not prepare the database.");
    console.error(error.message);
    process.exit(1);
  });
