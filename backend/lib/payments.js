const { pool } = require("../db");
const service = require("./service");
const { keys, razorpay, toPaise, verifySignature } = require("./razorpay");
const notify = require("./notify");

const PROGRAM = "Neuro Mastery Program";

function checkoutPayload(order, amount, description, prefill) {
  const { keyId } = keys();
  return {
    keyId,
    orderId: order.id,
    amount,
    currency: "INR",
    name: "Shadanga Kriya",
    description,
    prefill: {
      name: prefill.name || "",
      email: prefill.email || "",
      contact: prefill.contact || "",
    },
  };
}

async function rememberOrder(orderId, purpose, bookingId, participantIds, amount) {
  await pool.query(
    `INSERT INTO payment_orders (order_id, purpose, booking_id, participant_ids, amount)
     VALUES ($1, $2, $3, $4::jsonb, $5)`,
    [orderId, purpose, bookingId, JSON.stringify(participantIds), amount],
  );
}

async function createOrder(body) {
  if (body?.kind === "registration") {
    const booking = await service.getBooking(body.bookingId);
    if (booking.status === "paid") throw new service.HttpError(409, "This booking is already paid.");
    if (!booking.holdUntil || new Date(booking.holdUntil).getTime() <= Date.now()) {
      throw new service.HttpError(409, "The seat hold has ended. Please register again.");
    }
    const amount = toPaise(booking.total);
    const payer = booking.participants[0] || {};
    const order = await razorpay("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: booking.id,
        notes: { purpose: "registration", bookingId: booking.id },
      }),
    });
    await rememberOrder(order.id, "registration", booking.id, [], amount);
    await service.extendHold(booking.id);
    const label = booking.plan === "core" ? "Core" : "Comprehensive";
    return checkoutPayload(order, amount, `${PROGRAM} · ${label}`, {
      name: payer.name,
      email: payer.email,
      contact: payer.whatsapp,
    });
  }

  if (body?.kind === "upgrade") {
    const quote = await service.upgradeQuote(body.participantIds);
    const amount = toPaise(quote.price.total);
    const order = await razorpay("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: quote.ids[0].slice(0, 36),
        notes: { purpose: "upgrade", people: String(quote.ids.length) },
      }),
    });
    await rememberOrder(order.id, "upgrade", null, quote.ids, amount);
    return checkoutPayload(order, amount, `${PROGRAM} · Upgrade to Comprehensive`, quote.prefill);
  }

  throw new service.HttpError(400, "Choose a registration or an upgrade to pay.");
}

async function settledPayment(orderId, paymentId, signature, amount) {
  verifySignature(orderId, paymentId, signature);
  let payment = await razorpay(`/payments/${encodeURIComponent(paymentId)}`);
  if (payment.order_id !== orderId) throw new service.HttpError(400, "The payment does not match this order.");
  if (Number(payment.amount) !== amount) throw new service.HttpError(400, "The amount paid does not match this booking.");
  if (payment.status === "authorized") {
    payment = await razorpay(`/payments/${encodeURIComponent(paymentId)}/capture`, {
      method: "POST",
      body: JSON.stringify({ amount, currency: "INR" }),
    });
  }
  if (payment.status !== "captured") throw new service.HttpError(409, "The payment is not complete.");
  return payment;
}

async function confirmOrder(body) {
  const orderId = String(body?.razorpayOrderId || "");
  const paymentId = String(body?.razorpayPaymentId || "");
  const found = await pool.query("SELECT * FROM payment_orders WHERE order_id = $1", [orderId]);
  const order = found.rows[0];
  if (!order) throw new service.HttpError(404, "This payment does not match an open booking.");
  if (body?.kind !== order.purpose) throw new service.HttpError(400, "This payment does not match an open booking.");

  if (order.purpose === "registration") {
    if (body.bookingId !== order.booking_id) throw new service.HttpError(400, "This payment does not match an open booking.");
    const booking = await service.getBooking(order.booking_id);
    if (toPaise(booking.total) !== order.amount) throw new service.HttpError(409, "The booking total has changed. Start the payment again.");
    await settledPayment(orderId, paymentId, body.razorpaySignature, order.amount);
    try {
      const saved = await service.markPaid(order.booking_id, paymentId);
      try {
        await notify.registration(saved.booking);
      } catch (error) {
        console.error(error.message);
      }
      return { kind: "registration", ...saved };
    } catch (error) {
      console.error(`Captured Razorpay payment ${paymentId} for booking ${order.booking_id} was not recorded.`);
      throw error;
    }
  }

  const expected = Array.isArray(order.participant_ids) ? [...order.participant_ids].map(String).sort() : [];
  const given = [...new Set((Array.isArray(body.participantIds) ? body.participantIds : []).map(String))].sort();
  if (expected.join() !== given.join()) throw new service.HttpError(400, "This payment does not match an open booking.");
  let quote = null;
  try {
    quote = await service.upgradeQuote(given);
  } catch (error) {
    if (!(error.status === 409 && /already upgraded/.test(error.message))) throw error;
  }
  if (!quote) {
    const prior = await pool.query(
      `SELECT u.payment_ref
       FROM upgrades u
       JOIN upgrade_participants up ON up.upgrade_id = u.id
       WHERE up.participant_id = ANY($1::uuid[])`,
      [given],
    );
    if (!prior.rows.some((row) => row.payment_ref === paymentId)) {
      throw new service.HttpError(409, "One of these people is already upgraded.");
    }
  } else if (toPaise(quote.price.total) !== order.amount) {
    throw new service.HttpError(409, "The upgrade total has changed. Start the payment again.");
  }
  await settledPayment(orderId, paymentId, body.razorpaySignature, order.amount);
  try {
    const saved = await service.payUpgrade(given, paymentId);
    try {
      await notify.upgrade(saved);
    } catch (error) {
      console.error(error.message);
    }
    return { kind: "upgrade", ...saved };
  } catch (error) {
    console.error(`Captured Razorpay payment ${paymentId} for an upgrade was not recorded.`);
    throw error;
  }
}

module.exports = { createOrder, confirmOrder };
