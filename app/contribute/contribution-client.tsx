"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type PaymentConfig = { enabled: boolean; testMode: boolean; organisation: string; minimumRupees: number };
type PaymentResult = {
  contribution: { receiptNumber: string; amountRupees: number };
  member: { memberNumber: string; fullName: string } | null;
  memberCreated: boolean;
  activation: { mobile: string; reference: string } | null;
  message: string;
};

function loadRazorpay() {
  return new Promise<void>((resolve, reject) => {
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Secure payment could not load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject(new Error("Secure payment could not load. Please check your internet connection."));
    document.head.appendChild(script);
  });
}

async function paymentApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/participation/payments/razorpay${path}`, {
    credentials: "same-origin",
    ...options,
    headers: options.body ? { "Content-Type": "application/json", ...options.headers } : options.headers,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The secure payment request could not be completed.");
  return result;
}

export function ContributionClient() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [prefill, setPrefill] = useState({ amount: "2100", name: "", email: "", mobile: "" });
  const [autoCheckout, setAutoCheckout] = useState(false);
  const paymentFormRef = useRef<HTMLFormElement>(null);
  const autoCheckoutStarted = useRef(false);

  useEffect(() => {
    paymentApi<PaymentConfig>("/config").then(setConfig).catch(error => setError(error instanceof Error ? error.message : "Online contributions are temporarily unavailable."));
    const parameters = new URLSearchParams(window.location.search);
    setPrefill({ amount: parameters.get("amount") || "2100", name: parameters.get("name") || "", email: parameters.get("email") || "", mobile: parameters.get("mobile") || "" });
    setAutoCheckout(parameters.get("checkout") === "1");
  }, []);

  useEffect(() => {
    if (!autoCheckout || !config?.enabled || autoCheckoutStarted.current || !prefill.name || !prefill.email || !prefill.mobile) return;
    autoCheckoutStarted.current = true;
    paymentFormRef.current?.requestSubmit();
  }, [autoCheckout, config, prefill]);

  async function beginPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const orderResult = await paymentApi<{ order: { id: string; amountPaise: number; currency: string; razorpayKeyId: string; title: string } }>("/orders", {
        method: "POST",
        body: JSON.stringify({
          amountRupees: data.get("amountRupees"), donorName: data.get("donorName"), donorEmail: data.get("donorEmail"),
          donorMobile: data.get("donorMobile"), donorPan: data.get("donorPan"), donorAddress: data.get("donorAddress"), city: data.get("city"),
        }),
      });
      await loadRazorpay();
      const Razorpay = (window as unknown as { Razorpay: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void } }).Razorpay;
      const checkout = new Razorpay({
        key: orderResult.order.razorpayKeyId,
        amount: orderResult.order.amountPaise,
        currency: orderResult.order.currency,
        order_id: orderResult.order.id,
        name: "Sri Aurobindo Society, Lucknow",
        description: "Voluntary contribution — Support the Work",
        image: "/society-logo-transparent.png",
        prefill: { name: data.get("donorName"), email: data.get("donorEmail"), contact: data.get("donorMobile") },
        theme: { color: "#173846" },
        modal: { ondismiss: () => setError("The payment window was closed. No contribution was recorded.") },
        handler: async (payment: Record<string, string>) => {
          try {
            const verified = await paymentApi<PaymentResult>("/verify", {
              method: "POST",
              body: JSON.stringify({ razorpayOrderId: payment.razorpay_order_id, razorpayPaymentId: payment.razorpay_payment_id, razorpaySignature: payment.razorpay_signature }),
            });
            setResult(verified);
          } catch (error) {
            setError(error instanceof Error ? error.message : "The payment needs verification. Please contact the centre.");
          } finally {
            setBusy(false);
          }
        },
      });
      checkout.on("payment.failed", response => { setBusy(false); setError(response.error?.description || "The payment was not completed. No contribution was recorded."); });
      checkout.open();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Secure payment could not start.");
      setBusy(false);
    }
  }

  const activationUrl = result?.activation
    ? `/member?activate=1&tab=yogdaan&mobile=${encodeURIComponent(result.activation.mobile)}&reference=${encodeURIComponent(result.activation.reference)}`
    : "/member?tab=yogdaan";

  return <main className="contribute-page">
    <header className="contribute-header">
      <Link href="/" className="contribute-brand"><Image src="/society-logo-transparent.png" alt="Sri Aurobindo Society symbol" width={52} height={52} unoptimized /><span><strong>Sri Aurobindo Society</strong><small>LUCKNOW · GOMTI NAGAR CENTRE (UC-02)</small></span></Link>
      <div><Link href="/">Home</Link><Link href="/member">Member Login</Link></div>
    </header>

    <section className="contribute-hero">
      <div><p>AN OFFERING TOWARDS THE WORK</p><h1>Contribute<br />thoughtfully.</h1><span>Voluntary contributions help sustain programmes, publications, centre care and digital outreach.</span></div>
      <blockquote>“All can be done if the god-touch is there.”<cite>— Sri Aurobindo, Savitri</cite></blockquote>
    </section>

    <section className="contribute-body">
      <aside><span>01</span><h2>A secure and conscious offering</h2><p>Your payment is processed by Razorpay. We record a contribution only after server verification.</p><ul><li>Minimum contribution: ₹100</li><li>Your amount stays private</li><li>An acknowledgement number is generated</li><li>Your member account is connected automatically</li></ul></aside>
      {!result ? <form ref={paymentFormRef} onSubmit={beginPayment} className="contribute-form">
        <div className="contribute-form-heading"><div><p>SECURE CONTRIBUTION</p><h2>Offer your Yogdaan</h2></div>{config?.testMode && <span>TEST MODE · NO REAL MONEY</span>}</div>
        <label>Contribution amount (₹)<input key={`amount-${prefill.amount}`} required name="amountRupees" type="number" inputMode="numeric" min={config?.minimumRupees || 100} max="1000000" defaultValue={prefill.amount} /></label>
        <label>Full legal name<input key={`name-${prefill.name}`} required name="donorName" autoComplete="name" maxLength={120} defaultValue={prefill.name} /></label>
        <div className="contribute-form-row"><label>Mobile number<input key={`mobile-${prefill.mobile}`} required name="donorMobile" inputMode="tel" autoComplete="tel" maxLength={14} defaultValue={prefill.mobile} /></label><label>Email address<input key={`email-${prefill.email}`} required name="donorEmail" type="email" autoComplete="email" maxLength={180} defaultValue={prefill.email} /></label></div>
        <div className="contribute-form-row"><label>City<input required name="city" autoComplete="address-level2" maxLength={100} defaultValue="Lucknow" /></label><label>PAN <small>optional</small><input name="donorPan" maxLength={10} autoCapitalize="characters" /></label></div>
        <label>Postal address <small>optional</small><textarea name="donorAddress" rows={3} maxLength={500} /></label>
        {error && <p className="contribute-error" role="alert">{error}</p>}
        <button disabled={busy || !config?.enabled}>{busy ? "Opening secure payment…" : config?.enabled ? "Continue securely with Razorpay →" : "Online payment is unavailable"}</button>
        <small className="contribute-note">A payment acknowledgement is not an 80G certificate. Eligible tax documentation, where applicable, is processed separately after verification.</small>
      </form> : <div className="contribute-success" aria-live="polite">
        <span>✦</span><p>OFFERING RECEIVED</p><h2>Thank you, {result.member?.fullName?.split(" ")[0] || "friend"}.</h2><p>{result.message}</p>
        <dl><div><dt>Acknowledgement</dt><dd>{result.contribution.receiptNumber}</dd></div><div><dt>Amount</dt><dd>₹{result.contribution.amountRupees.toLocaleString("en-IN")}</dd></div>{result.member?.memberNumber && <div><dt>Member ID</dt><dd>{result.member.memberNumber}</dd></div>}</dl>
        <p className="contribute-next">This verified contribution is now recorded in <strong>My Yogdaan</strong>, your private contribution history.</p>
        {result.activation ? <><p className="contribute-next">One final private step: choose your member password to enter the community.</p><Link className="contribute-primary-link" href={activationUrl}>Set Password and View My Yogdaan →</Link></> : <Link className="contribute-primary-link" href={activationUrl}>View in My Yogdaan →</Link>}
        <Link className="contribute-secondary-link" href="/">Return to the website</Link>
      </div>}
    </section>
    <footer className="contribute-footer"><span>Sri Aurobindo Society · Lucknow</span><a href="mailto:info.saslucknow@gmail.com">info.saslucknow@gmail.com</a></footer>
  </main>;
}
