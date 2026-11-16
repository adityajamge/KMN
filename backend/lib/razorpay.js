const crypto = require("crypto");
const { HttpError } = require("./service");

function keys() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) {
    throw new HttpError(503, "Razorpay test keys are not set.");
  }
  if (!keyId.startsWith("rzp_test_")) {
    throw new HttpError(503, "Razorpay is in test mode. Use a test key.");
  }
  return { keyId, keySecret };
}

async function razorpay(path, options = {}) {
  const { keyId, keySecret } = keys();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: options.method || "GET",
    body: options.body,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new HttpError(503, "Razorpay test keys were rejected.");
    const description = data.error && data.error.description;
    throw new HttpError(response.status >= 500 ? 502 : 400, description || "Razorpay could not start this payment.");
  }
  return data;
}

function toPaise(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new HttpError(400, "This payment amount is not valid.");
  return Math.round(value * 100);
}

function verifySignature(orderId, paymentId, signature) {
  const { keySecret } = keys();
  const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const given = String(signature || "");
  const left = Buffer.from(expected);
  const right = Buffer.from(given);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    throw new HttpError(400, "The payment could not be verified.");
  }
}

module.exports = { keys, razorpay, toPaise, verifySignature };
