import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/AppError.js";

/*
 * A small client for the three Razorpay API calls FixFlow needs, over plain fetch with Basic auth.
 * https://razorpay.com/docs/api/orders/ and https://razorpay.com/docs/api/payments/
 */

export const paymentsEnabled = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

export interface RazorpayOrder {
    id: string;
    amount: number;
    currency: string;
    status: string;
}

export interface RazorpayPayment {
    id: string;
    order_id: string | null;
    amount: number;
    currency: string;
    // created, authorized, captured, refunded or failed
    status: string;
}

const call = async <T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> => {
    if (!paymentsEnabled) {
        throw AppError.badRequest("Online payment is not set up");
    }
    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
    let response: Response;
    try {
        response = await fetch(`${env.RAZORPAY_API_URL.replace(/\/$/, "")}${path}`, {
            method,
            headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            signal: AbortSignal.timeout(15_000),
        });
    } catch (err) {
        logger.error({ err, path }, "Razorpay unreachable");
        throw new AppError(502, "INTERNAL_ERROR", "The payment service is not responding. Please try again.");
    }
    const data = (await response.json().catch(() => null)) as (T & { error?: { description?: string } }) | null;
    if (!response.ok || !data) {
        logger.error({ status: response.status, path, error: data?.error }, "Razorpay request failed");
        throw new AppError(502, "INTERNAL_ERROR", "The payment service refused the request. Please try again.");
    }
    return data;
};

export const createOrder = (amountPaise: number, receipt: string, notes: Record<string, string>) =>
    call<RazorpayOrder>("POST", "/orders", { amount: amountPaise, currency: "INR", receipt, notes });

export const fetchPayment = (paymentId: string) => call<RazorpayPayment>("GET", `/payments/${encodeURIComponent(paymentId)}`);

/** Payments are captured automatically on most accounts; this covers accounts set to manual capture. */
export const capturePayment = (paymentId: string, amountPaise: number) =>
    call<RazorpayPayment>("POST", `/payments/${encodeURIComponent(paymentId)}/capture`, { amount: amountPaise, currency: "INR" });
