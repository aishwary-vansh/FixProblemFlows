/*
 * Razorpay Checkout in the browser. The script comes from Razorpay (as their docs require) and is loaded only
 * when the owner presses Pay. https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
 */

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

export interface CheckoutOrder {
    keyId: string;
    orderId: string;
    amountPaise: number;
    currency: string;
    period: "MONTHLY" | "YEARLY";
    organizationName: string;
    prefill: { name: string; email: string; contact: string };
}

export interface CheckoutResult {
    orderId: string;
    paymentId: string;
    signature: string;
}

interface RazorpayResponse {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => {
    open: () => void;
    on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
    interface Window {
        Razorpay?: RazorpayConstructor;
    }
}

let loading: Promise<void> | null = null;

const loadScript = () =>
    (loading ??= new Promise<void>((resolve, reject) => {
        if (window.Razorpay) return resolve();
        const script = document.createElement("script");
        script.src = SCRIPT_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            loading = null;
            reject(new Error("Could not load Razorpay. Check your connection and try again."));
        };
        document.body.appendChild(script);
    }));

/** Opens Checkout for the order. Resolves with Razorpay's proof of payment, or null if the owner closed it. */
export const openCheckout = async (order: CheckoutOrder): Promise<CheckoutResult | null> => {
    await loadScript();
    const Razorpay = window.Razorpay;
    if (!Razorpay) throw new Error("Could not load Razorpay. Check your connection and try again.");

    return new Promise((resolve, reject) => {
        const checkout = new Razorpay({
            key: order.keyId,
            order_id: order.orderId,
            amount: order.amountPaise,
            currency: order.currency,
            name: "FixFlow",
            description: `Pro for ${order.period === "MONTHLY" ? "1 month" : "1 year"} · ${order.organizationName}`,
            prefill: order.prefill,
            theme: { color: "#7c3aed" },
            handler: (response: RazorpayResponse) =>
                resolve({
                    orderId: response.razorpay_order_id,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                }),
            modal: { ondismiss: () => resolve(null) },
        });
        checkout.on("payment.failed", (response) => {
            reject(new Error(response.error?.description ?? "The payment failed. No money was taken; please try again."));
        });
        checkout.open();
    });
};
