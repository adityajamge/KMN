function configured() {
  return Boolean(String(process.env.WHATSAPP_TOKEN || "").trim() && String(process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim());
}

function sanitize(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return (text || "-").slice(0, 900);
}

function toRecipient(phone) {
  const digits = String(phone || "").replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) throw new Error("This WhatsApp number is not a 10-digit Indian number.");
  return `91${digits}`;
}

async function sendTemplate(phone, name, parameters) {
  const token = String(process.env.WHATSAPP_TOKEN || "").trim();
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  if (!token || !phoneNumberId) throw new Error("WhatsApp Cloud API is not configured.");
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v21.0";
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toRecipient(phone),
      type: "template",
      template: {
        name,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en" },
        components: [{
          type: "body",
          parameters: parameters.map((value) => ({ type: "text", text: sanitize(value) })),
        }],
      },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error && data.error.message;
    throw new Error(message || "WhatsApp could not send this message.");
  }
  return data;
}

module.exports = { configured, sendTemplate };
