import type { PaymentOrder } from "./api";

type Success = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

type Checkout = {
  open: () => void;
  on: (event: string, handler: () => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => Checkout;
  }
}

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay could not be opened. Check your connection and try again."));
    document.body.appendChild(script);
  });
}

export function openRazorpay(order: PaymentOrder) {
  return loadCheckout().then(() => new Promise<Success | "closed">((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Razorpay could not be opened. Check your connection and try again."));
      return;
    }
    let done = false;
    const finish = (value: Success | "closed") => {
      if (done) return;
      done = true;
      resolve(value);
    };
    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      order_id: order.orderId,
      prefill: order.prefill,
      theme: { color: "#7B3FF6" },
      handler(response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
        finish({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: { ondismiss: () => finish("closed"), confirm_close: true },
    });
    checkout.on("payment.failed", () => finish("closed"));
    checkout.open();
  }));
}
