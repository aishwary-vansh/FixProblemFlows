import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import api, { getErrorMessage } from "../services/api";
import { openCheckout, type CheckoutOrder } from "../lib/razorpay";

interface Billing {
    plan: "FREE" | "PRO";
    planEndsAt: string | null;
    planSource: "TRIAL" | "MANUAL" | "PAID" | null;
    price: { monthly: number; yearly: number };
    standardPrice: { monthly: number; yearly: number };
    discountPercent: number;
    notice: { message: string; level: "INFO" | "WARNING" } | null;
    onlinePayment: boolean;
    canBuy: boolean;
}

interface PaymentRow {
    id: number;
    amountPaise: number;
    period: "MONTHLY" | "YEARLY";
    paidAt: string;
    razorpayPaymentId: string | null;
}

type Period = "MONTHLY" | "YEARLY";

// Set VITE_CONTACT_EMAIL to the address that handles sales. It is used when online payment is not set up.
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

const mailto = (subject: string) =>
    CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}` : undefined;

const daysLeft = (iso: string) => {
    const days = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
    return days === 1 ? "1 day" : `${days} days`;
};

const FREE_FEATURES = [
    "Up to 10 members",
    "Up to 3 QR codes for places",
    "Issue reporting with photos",
    "Status workflow, deadlines and alerts",
    "Reports dashboard",
];

const PRO_FEATURES = [
    "Unlimited members",
    "Unlimited QR codes for places",
    "Auto-assign technicians by skill and workload",
    "CSV export of issues",
    "Everything in Free",
];

const CUSTOM_FEATURES = [
    "Many buildings, hostels or campuses",
    "Price agreed for your size",
    "Help setting up locations and QR codes",
    "Everything in Pro",
];

const PlanCard = ({
    name,
    price,
    priceNote,
    features,
    action,
    current,
    featured,
}: {
    name: string;
    price: React.ReactNode;
    priceNote: string;
    features: string[];
    action: React.ReactNode;
    current: boolean;
    featured?: boolean;
}) => (
    <article className={"fx-plan-card" + (featured ? " featured" : "") + (current ? " current" : "")}>
        <header>
            <h3>{name}</h3>
            {current && <span className="fx-plan-current">Current plan</span>}
        </header>
        <p className="fx-plan-price-line">{price}</p>
        <p className="fx-plan-note">{priceNote}</p>
        <ul>
            {features.map((feature) => (
                <li key={feature}>
                    <Check size={16} aria-hidden="true" />
                    {feature}
                </li>
            ))}
        </ul>
        <div className="fx-plan-action">{action}</div>
    </article>
);

/** The owner's view: every plan as a card, the current one marked, and a way to buy Pro. */
const BillingPage = () => {
    const [billing, setBilling] = useState<Billing | null>(null);
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [error, setError] = useState("");
    const [paying, setPaying] = useState<Period | null>(null);
    const [payError, setPayError] = useState("");
    const [paidMessage, setPaidMessage] = useState("");
    // Bumped after a payment, so the plan and receipts reload.
    const [version, setVersion] = useState(0);

    useEffect(() => {
        api.get("/organization/billing")
            .then((response) => setBilling(response.data.data))
            .catch((err) => setError(getErrorMessage(err, "Failed to load plans")));
        api.get("/billing/payments")
            .then((response) => setPayments(response.data.data))
            .catch(() => setPayments([]));
    }, [version]);

    const pay = async (period: Period) => {
        setPaying(period);
        setPayError("");
        setPaidMessage("");
        try {
            const order: CheckoutOrder = (await api.post("/billing/checkout", { period })).data.data;
            const result = await openCheckout(order);
            if (!result) return; // Closed without paying.
            const plan = (await api.post("/billing/verify", result)).data.data as { planEndsAt: string | null };
            setPaidMessage(
                plan.planEndsAt
                    ? `Payment received. Pro is active until ${new Date(plan.planEndsAt).toLocaleDateString()}.`
                    : "Payment received."
            );
            setVersion((current) => current + 1);
        } catch (err) {
            setPayError(err instanceof Error && !("isAxiosError" in err) ? err.message : getErrorMessage(err, "The payment could not be completed"));
        } finally {
            setPaying(null);
        }
    };

    const onTrial = billing?.plan === "PRO" && billing.planSource === "TRIAL";
    const onPaidPro = billing?.plan === "PRO" && !onTrial;
    const renewing = billing?.plan === "PRO" && billing.planEndsAt !== null && !onTrial;
    const discounted = Boolean(billing && billing.discountPercent > 0);
    const buyHref = mailto("Buy FixFlow Pro");

    return (
        <main>
            <div className="fx-page-head">
                <h2>Plans</h2>
                <p>
                    {!billing
                        ? "Choose the plan that fits your organization."
                        : onTrial && billing.planEndsAt
                          ? `You are on a free Pro trial. It ends in ${daysLeft(billing.planEndsAt)}; after that you move to Free and nothing is deleted.`
                          : onPaidPro
                            ? billing.planEndsAt
                                ? `You are on Pro until ${new Date(billing.planEndsAt).toLocaleDateString()}. Paying again adds to that date.`
                                : "You are on Pro."
                            : "You are on Free. Buy Pro for unlimited members and QR codes, auto-assign and CSV export."}
                </p>
            </div>

            {error && <div className="fx-empty" role="alert">{error}</div>}
            {!billing && !error && <div className="fx-empty">Loading...</div>}
            {paidMessage && <div className="fx-notice info fx-plan-message" role="status"><div><strong>Thank you</strong><p>{paidMessage}</p></div></div>}
            {payError && <div className="fx-notice warning fx-plan-message" role="alert"><div><strong>Payment not completed</strong><p>{payError}</p></div></div>}

            {billing && (
                <div className="fx-plan-grid">
                    <PlanCard
                        name="Free"
                        price={<strong>₹0</strong>}
                        priceNote="For small teams trying FixFlow"
                        features={FREE_FEATURES}
                        current={billing.plan === "FREE"}
                        action={<span className="fx-plan-included">{billing.plan === "FREE" ? "Your current plan" : "Included"}</span>}
                    />
                    <PlanCard
                        name={discounted ? `Pro · ${billing.discountPercent}% off` : "Pro"}
                        featured
                        price={
                            <>
                                {discounted && <s>{rupees(billing.standardPrice.monthly)}</s>}{" "}
                                <strong>{rupees(billing.price.monthly)}</strong> / month
                            </>
                        }
                        priceNote={
                            discounted
                                ? `Special price for your organization: ${billing.discountPercent}% off. Or ${rupees(billing.price.yearly)} a year.`
                                : `or ${rupees(billing.price.yearly)} a year, two months free`
                        }
                        features={PRO_FEATURES}
                        current={billing.plan === "PRO"}
                        action={
                            !billing.canBuy ? (
                                <span className="fx-plan-included">Your current plan, no end date</span>
                            ) : billing.onlinePayment ? (
                                <div className="fx-plan-pay">
                                    <button
                                        type="button"
                                        className="fx-btn fx-btn-gradient"
                                        disabled={paying !== null}
                                        onClick={() => pay("MONTHLY")}
                                    >
                                        {paying === "MONTHLY" ? "Opening..." : `${renewing ? "Add 1 month" : "Pay"} · ${rupees(billing.price.monthly)}`}
                                    </button>
                                    <button type="button" className="fx-btn" disabled={paying !== null} onClick={() => pay("YEARLY")}>
                                        {paying === "YEARLY" ? "Opening..." : `${renewing ? "Add 1 year" : "Pay for a year"} · ${rupees(billing.price.yearly)}`}
                                    </button>
                                    <span className="fx-plan-secure">Secure payment by Razorpay: UPI, cards, net banking</span>
                                </div>
                            ) : onPaidPro ? (
                                <span className="fx-plan-included">Your current plan</span>
                            ) : buyHref ? (
                                <a className="fx-btn fx-btn-gradient" href={buyHref}>
                                    {onTrial ? "Buy Pro before the trial ends" : "Buy Pro"}
                                </a>
                            ) : (
                                <span className="fx-plan-included">Contact FixFlow to buy Pro</span>
                            )
                        }
                    />
                    <PlanCard
                        name="Custom"
                        price={<strong>Let's talk</strong>}
                        priceNote="For large campuses and groups"
                        features={CUSTOM_FEATURES}
                        current={false}
                        action={
                            mailto("FixFlow custom plan") ? (
                                <a className="fx-btn" href={mailto("FixFlow custom plan")}>Contact us</a>
                            ) : (
                                <span className="fx-plan-included">Contact FixFlow</span>
                            )
                        }
                    />
                </div>
            )}

            {payments.length > 0 && (
                <section className="fx-section">
                    <h2>Payments</h2>
                    <div className="fx-table-wrapper">
                        <table className="fx-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>For</th>
                                    <th>Amount</th>
                                    <th>Razorpay payment ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td>{new Date(payment.paidAt).toLocaleDateString()}</td>
                                        <td>Pro, {payment.period === "MONTHLY" ? "1 month" : "1 year"}</td>
                                        <td>{rupees(payment.amountPaise / 100)}</td>
                                        <td><code>{payment.razorpayPaymentId ?? "—"}</code></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </main>
    );
};

export default BillingPage;
