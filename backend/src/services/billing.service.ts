import prisma from "../config/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/AppError.js";
import { isValidPaymentSignature, isValidWebhookSignature, paidPlanChanges, priceFor, type Period } from "../domain/billing.js";
import { capturePayment, createOrder, fetchPayment, paymentsEnabled } from "./razorpay.js";
import type { AuthContext } from "../types/auth.js";

const orgPlanSelect = { name: true, plan: true, planEndsAt: true, planSource: true, customPriceInr: true } as const;

const periodWords: Record<Period, string> = { MONTHLY: "1 month", YEARLY: "1 year" };

/** Opens a Razorpay order for this organization's price. The browser gets only the order, never a say in the amount. */
export const createCheckout = async (ctx: AuthContext, period: Period) => {
    if (!paymentsEnabled) {
        throw AppError.badRequest("Online payment is not set up yet. Contact FixFlow to buy Pro.");
    }
    const [org, user] = await Promise.all([
        prisma.organization.findUniqueOrThrow({ where: { id: ctx.orgId }, select: orgPlanSelect }),
        prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { name: true, email: true, phone: true } }),
    ]);
    if (paidPlanChanges(org, period) === null) {
        throw AppError.conflict("Your organization already has Pro with no end date");
    }

    const amountPaise = priceFor(period, org.customPriceInr) * 100;
    // Razorpay limits the receipt to 40 characters.
    const order = await createOrder(amountPaise, `org${ctx.orgId}-${Date.now()}`.slice(0, 40), {
        orgId: String(ctx.orgId),
        period,
    });
    await prisma.payment.create({
        data: { orgId: ctx.orgId, createdById: ctx.userId, razorpayOrderId: order.id, amountPaise, period },
    });

    return {
        keyId: env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amountPaise,
        currency: "INR",
        period,
        organizationName: org.name,
        prefill: { name: user.name, email: user.email, contact: user.phone },
    };
};

/**
 * Marks a payment as paid and extends Pro, once. Called from the browser after checkout and from the webhook;
 * whichever comes second finds the payment already PAID and does nothing. Razorpay is asked directly whether
 * the money was captured, for this order and this amount, so nothing the caller sends is trusted.
 */
const confirmPayment = async (orderId: string, paymentId: string) => {
    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!payment) {
        throw AppError.notFound("Payment");
    }
    if (payment.status === "PAID") {
        return payment;
    }

    let remote = await fetchPayment(paymentId);
    if (remote.order_id !== orderId || remote.amount !== payment.amountPaise || remote.currency !== "INR") {
        logger.warn({ orderId, paymentId }, "Razorpay payment does not match the order");
        throw AppError.badRequest("This payment does not match the order");
    }
    if (remote.status === "authorized") {
        remote = await capturePayment(paymentId, payment.amountPaise);
    }
    if (remote.status !== "captured") {
        throw AppError.conflict("The payment has not gone through yet");
    }

    return prisma.$transaction(async (tx) => {
        const claimed = await tx.payment.updateMany({
            where: { id: payment.id, status: "CREATED" },
            data: { status: "PAID", razorpayPaymentId: paymentId, paidAt: new Date() },
        });
        if (claimed.count === 0) {
            // The other confirmation got here first.
            return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
        }

        const org = await tx.organization.findUniqueOrThrow({ where: { id: payment.orgId }, select: orgPlanSelect });
        const changes = paidPlanChanges(org, payment.period);
        if (changes) {
            await tx.organization.update({ where: { id: payment.orgId }, data: changes });
        }
        const summary =
            `Paid ₹${(payment.amountPaise / 100).toLocaleString("en-IN")} for ${periodWords[payment.period]}` +
            (changes ? `: Pro until ${changes.planEndsAt.toISOString().slice(0, 10)}` : "");
        await tx.planEvent.create({ data: { orgId: payment.orgId, actorId: payment.createdById, action: "paid", summary } });
        await tx.auditLog.create({
            data: { orgId: payment.orgId, actorId: payment.createdById, action: "plan.paid", target: summary },
        });
        return tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
    });
};

/** The browser's report after Razorpay Checkout succeeds. */
export const verifyCheckout = async (ctx: AuthContext, input: { orderId: string; paymentId: string; signature: string }) => {
    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: input.orderId }, select: { orgId: true } });
    if (!payment || payment.orgId !== ctx.orgId) {
        throw AppError.notFound("Payment");
    }
    if (!isValidPaymentSignature(input.orderId, input.paymentId, input.signature, env.RAZORPAY_KEY_SECRET ?? "")) {
        throw AppError.badRequest("The payment could not be verified");
    }
    await confirmPayment(input.orderId, input.paymentId);
    return getBillingAfterPayment(ctx.orgId);
};

const getBillingAfterPayment = async (orgId: number) =>
    prisma.organization.findUniqueOrThrow({ where: { id: orgId }, select: { plan: true, planEndsAt: true, planSource: true } });

interface WebhookBody {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string | null } } };
}

/**
 * Razorpay's webhook, so a payment counts even if the owner closes the tab before the browser reports it.
 * Returns false only when the signature is wrong.
 */
export const handleWebhook = async (rawBody: Buffer, signature: string | undefined) => {
    if (!env.RAZORPAY_WEBHOOK_SECRET || !signature || !isValidWebhookSignature(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)) {
        return false;
    }
    let body: WebhookBody;
    try {
        body = JSON.parse(rawBody.toString("utf8")) as WebhookBody;
    } catch {
        return true;
    }
    const entity = body.payload?.payment?.entity;
    if ((body.event === "payment.captured" || body.event === "order.paid") && entity?.id && entity.order_id) {
        const ours = await prisma.payment.findUnique({ where: { razorpayOrderId: entity.order_id }, select: { id: true } });
        // Payments for anything else on the same Razorpay account are not FixFlow's business.
        if (ours) {
            await confirmPayment(entity.order_id, entity.id);
        }
    }
    return true;
};

/** Paid payments, newest first, for the owner's receipts. */
export const listPayments = (orgId: number) =>
    prisma.payment.findMany({
        where: { orgId, status: "PAID" },
        select: { id: true, amountPaise: true, period: true, paidAt: true, razorpayPaymentId: true },
        orderBy: { paidAt: "desc" },
        take: 50,
    });
