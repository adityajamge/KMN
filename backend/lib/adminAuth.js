const crypto = require("crypto");
const QRCode = require("qrcode");
const { pool } = require("../db");
const { verifyTotp, randomSecret, randomKey } = require("./totp");

const COOKIE = "kmn_admin";
const failures = new Map();

function expiresAt(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const pick = (type) => Number(parts.find((part) => part.type === type).value);
  const midnight = Date.UTC(pick("year"), pick("month") - 1, pick("day") + 1, -5, -30);
  return midnight > now ? midnight : now + 60 * 1000;
}

async function loadAuth() {
  const result = await pool.query("SELECT totp_secret, session_key, confirmed FROM admin_auth WHERE id = 1");
  return result.rows[0] || null;
}

async function ensurePending() {
  const existing = await loadAuth();
  if (existing) return existing;
  await pool.query(
    `INSERT INTO admin_auth (id, totp_secret, session_key, confirmed)
     VALUES (1, $1, $2, FALSE)
     ON CONFLICT (id) DO NOTHING`,
    [randomSecret(), randomKey()],
  );
  return loadAuth();
}

function sign(sessionKey, exp) {
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  const signature = crypto.createHmac("sha256", sessionKey).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function sessionValid(token, sessionKey) {
  if (!token || !sessionKey) return false;
  const [payload, signature] = String(token).split(".");
  if (!payload || !signature) return false;
  const expected = crypto.createHmac("sha256", sessionKey).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

function readCookie(req) {
  const header = req.headers.cookie || "";
  const found = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  if (!found) return "";
  return decodeURIComponent(found.slice(COOKIE.length + 1));
}

function cookieHeader(token, maxAge) {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${maxAge}`,
    secure ? "SameSite=None" : "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function writeSession(res, sessionKey) {
  const exp = expiresAt();
  const maxAge = Math.max(1, Math.floor((exp - Date.now()) / 1000));
  res.setHeader("Set-Cookie", cookieHeader(sign(sessionKey, exp), maxAge));
}

async function clearSession(res) {
  await pool.query("UPDATE admin_auth SET session_key = $1 WHERE id = 1", [randomKey()]);
  res.setHeader("Set-Cookie", cookieHeader("", 0));
}

function clientKey(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function limited(req) {
  const row = failures.get(clientKey(req));
  return Boolean(row && row.count >= 8 && Date.now() < row.until);
}

function noteFailure(req) {
  const key = clientKey(req);
  const row = failures.get(key);
  if (!row || Date.now() >= row.until) {
    failures.set(key, { count: 1, until: Date.now() + 5 * 60 * 1000 });
    return;
  }
  row.count += 1;
}

function clearFailures(req) {
  failures.delete(clientKey(req));
}

async function status() {
  const row = await loadAuth();
  if (!row || !row.confirmed) return "setup";
  return "login";
}

async function requireSession(req) {
  const row = await loadAuth();
  if (!row || !row.confirmed) return false;
  return sessionValid(readCookie(req), row.session_key);
}

async function setupQr() {
  const row = await ensurePending();
  if (row.confirmed) {
    const error = new Error("The authenticator is already set up.");
    error.status = 404;
    throw error;
  }
  const issuer = encodeURIComponent("Shadanga Kriya");
  const account = encodeURIComponent("Nagpur desk");
  const url = `otpauth://totp/${issuer}:${account}?secret=${row.totp_secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#140A2E", light: "#FFFFFF" } });
  return { qr };
}

async function acceptCode(req, res, { confirm }) {
  if (limited(req)) {
    const error = new Error("Too many tries. Wait a few minutes.");
    error.status = 429;
    throw error;
  }
  const row = confirm ? await ensurePending() : await loadAuth();
  if (!row) {
    const error = new Error("Scan the QR code before signing in.");
    error.status = 400;
    throw error;
  }
  if (confirm && row.confirmed) {
    const error = new Error("The authenticator is already set up. Enter the current code to sign in.");
    error.status = 409;
    throw error;
  }
  if (!confirm && !row.confirmed) {
    const error = new Error("Scan the QR code before signing in.");
    error.status = 400;
    throw error;
  }
  if (!verifyTotp(row.totp_secret, req.body?.code)) {
    noteFailure(req);
    const error = new Error("That code does not match. Check the time on your phone and try the current code.");
    error.status = 401;
    throw error;
  }
  if (confirm && !row.confirmed) {
    await pool.query("UPDATE admin_auth SET confirmed = TRUE WHERE id = 1");
  }
  clearFailures(req);
  writeSession(res, row.session_key);
  return { ok: true };
}

module.exports = {
  status,
  requireSession,
  setupQr,
  acceptCode,
  clearSession,
};
