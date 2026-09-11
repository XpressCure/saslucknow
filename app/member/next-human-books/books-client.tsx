"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Book = { id: string; title: string; priceRupees: number; languages: string[]; unlocked: boolean };
type Library = { books: Book[]; payments: { enabled: boolean; testMode: boolean } };
type Member = { fullName: string; email: string; mobile: string };
type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayWindow = Window & { Razorpay?: new (options: Record<string, unknown>) => { open(): void } };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/participation/member${path}`, { credentials: "same-origin", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || "The request could not be completed."), { status: response.status });
  return body as T;
}

function loadRazorpay() {
  if ((window as RazorpayWindow).Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("The secure payment window could not be loaded."));
    document.head.appendChild(script);
  });
}

export function NextHumanBooksClient() {
  const [member, setMember] = useState<Member | null>(null);
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = async () => {
    const [auth, books] = await Promise.all([api<{ member: Member }>("/auth/me"), api<Library>("/next-human-books")]);
    setMember(auth.member); setLibrary(books); setSignedOut(false);
  };

  useEffect(() => { refresh().catch((error: Error & { status?: number }) => { if (error.status === 401) setSignedOut(true); else setMessage(error.message); }).finally(() => setLoading(false)); }, []);

  const unlockBookOne = async () => {
    if (!library?.payments.enabled || !member) return;
    setBusy(true); setMessage("");
    try {
      await loadRazorpay();
      const result = await api<{ order: { id: string; amountPaise: number; currency: string; razorpayKeyId: string; title: string } }>("/next-human-books/orders", { method: "POST", body: JSON.stringify({ bookId: "next-human-book-one" }) });
      const Razorpay = (window as RazorpayWindow).Razorpay;
      if (!Razorpay) throw new Error("The secure payment window is unavailable.");
      await new Promise<void>((resolve, reject) => {
        new Razorpay({ key: result.order.razorpayKeyId, amount: result.order.amountPaise, currency: result.order.currency, order_id: result.order.id, name: "Sri Aurobindo Society, Lucknow", description: result.order.title, prefill: member, theme: { color: "#d7a43a" }, modal: { ondismiss: () => reject(new Error("Payment was not completed.")) }, handler: async (payment: RazorpayResponse) => {
          try { await api("/next-human-books/verify", { method: "POST", body: JSON.stringify({ razorpayOrderId: payment.razorpay_order_id, razorpayPaymentId: payment.razorpay_payment_id, razorpaySignature: payment.razorpay_signature }) }); resolve(); }
          catch (error) { reject(error); }
        } }).open();
      });
      await refresh(); setMessage("Book One is now unlocked in English and Hindi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Payment could not be completed."); }
    finally { setBusy(false); }
  };

  return <main className="nhb-page">
    <header className="nhb-nav"><Link href="/next-human">← NEXT HUMAN</Link><Link href="/">SAS Lucknow</Link><Link href="/member">Member portal</Link></header>
    <section className="nhb-intro"><p>YOUR PRIVATE BOOKSHELF</p><h1>The NEXT HUMAN<br/><em>reading room</em></h1><span>{member ? `Welcome, ${member.fullName}` : "English · हिन्दी"}</span></section>
    {loading ? <section className="nhb-state">Opening your bookshelf…</section> : signedOut ? <section className="nhb-state"><p>MEMBER ACCESS</p><h2>Your books belong to your private account.</h2><span>Sign in to read Book Zero free, or create an account before purchasing Book One. Your purchase will remain available whenever you return.</span><div><Link className="nhb-primary" href="/member?returnTo=%2Fmember%2Fnext-human-books">Sign in</Link><Link href="/joincommunity?returnTo=%2Fmember%2Fnext-human-books#parichay">Create an account</Link></div></section> :
    <section className="nhb-shelf">
      <article><div className="nhb-cover"><small>NEXT HUMAN</small><b>0</b><strong>BOOK ZERO</strong></div><div><p>THE GROUND · FREE</p><h2>Book Zero</h2><span>A short preparation for the inquiry: what do we mean when we say “human”, and what might still be unfinished?</span><div className="nhb-actions"><a href="/api/participation/member/next-human-books/next-human-book-zero/en">Read in English</a><a href="/api/participation/member/next-human-books/next-human-book-zero/hi">हिन्दी में पढ़ें</a></div></div></article>
      <article><div className="nhb-cover nhb-cover-light"><small>NEXT HUMAN</small><b>I</b><strong>BOOK ONE</strong></div><div><p>THE INQUIRY · ₹299</p><h2>Book One</h2><span>One purchase adds both complete editions—English and natural Hindi—to this private bookshelf.</span>{library?.books.find(book => book.id === "next-human-book-one")?.unlocked ? <div className="nhb-actions"><a href="/api/participation/member/next-human-books/next-human-book-one/en">Read in English</a><a href="/api/participation/member/next-human-books/next-human-book-one/hi">हिन्दी में पढ़ें</a></div> : <button className="nhb-buy" disabled={busy || !library?.payments.enabled} onClick={unlockBookOne}>{busy ? "Opening secure payment…" : library?.payments.enabled ? "Unlock both editions · ₹299" : "Payments opening soon"}</button>}</div></article>
      {message && <p className="nhb-message" role="status">{message}</p>}
      {library?.payments.testMode && <p className="nhb-test">Test payment mode is active. No live charge will be made.</p>}
    </section>}
  </main>;
}
