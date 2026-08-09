"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Flower = {
  id: "divine-love" | "integral-love" | "supramental-power";
  name: string;
  meaning: string;
  botanical: string;
  image: string;
  cutout: string;
};

type OfferingResult = {
  reference: string;
  offeringNumber: number;
  emailed: boolean;
  emailQueued: boolean;
  emailToken: string;
};

const flowers: Flower[] = [
  {
    id: "divine-love",
    name: "Divine Love",
    meaning: "A flower that is said to blossom even in the desert.",
    botanical: "Punica granatum - orange-red, double",
    image: "/pushpanjali-divine-love.jpg",
    cutout: "/pushpanjali-divine-love-cutout.png",
  },
  {
    id: "integral-love",
    name: "Integral Love for the Divine",
    meaning: "Pure, complete, irrevocable, a love that gives itself for ever.",
    botanical: "Rosa - white",
    image: "/pushpanjali-integral-love.jpg",
    cutout: "/pushpanjali-integral-love-cutout.png",
  },
  {
    id: "supramental-power",
    name: "Power of the Supramental Consciousness",
    meaning: "Organising and active, irresistible in its influence.",
    botanical: "Hibiscus rosa-sinensis 'Rukmini' - deep gold, double",
    image: "/pushpanjali-supramental-power.jpg",
    cutout: "/pushpanjali-supramental-power-cutout.png",
  },
];

const flowerPositions = [5, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 70, 76, 82, 88, 94, 8, 19, 31, 43, 55, 67, 79, 91, 13, 25, 37, 49, 61, 73, 85];
const pushpanjaliLandingUrl = "https://www.saslucknow.in/?pushpanjali=1";

function offeringEndpoint() {
  return window.location.hostname.endsWith("chatgpt.site")
    ? "https://www.saslucknow.in/api/pushpanjali-offerings"
    : "/api/pushpanjali-offerings";
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string) {
  if (imageCache.has(src)) return imageCache.get(src)!;
  const pendingImage = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
  imageCache.set(src, pendingImage);
  pendingImage.catch(() => imageCache.delete(src));
  return pendingImage;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.closePath();
}

function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/);
  let line = "";
  let currentY = y;
  for (const word of words) {
    const test = `${line}${word} `;
    if (context.measureText(test).width > maxWidth && line) {
      context.fillText(line.trim(), x, currentY);
      line = `${word} `;
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) context.fillText(line.trim(), x, currentY);
  return currentY;
}

function isMobileBrowser() {
  if (typeof navigator === "undefined" || typeof navigator.userAgent !== "string") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function PushpanjaliCampaign() {
  const modalRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<Flower["id"]>("divine-love");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"ready" | "submitting" | "offered">("ready");
  const [error, setError] = useState("");
  const [result, setResult] = useState<OfferingResult | null>(null);
  const [offeringCount, setOfferingCount] = useState(0);
  const [certificateBlob, setCertificateBlob] = useState<Blob | null>(null);
  const [certificatePreviewUrl, setCertificatePreviewUrl] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const selectedFlower = flowers.find(flower => flower.id === selectedId) || flowers[0];
  const fallingFlowers = useMemo(() => flowerPositions.map((left, index) => ({
    left,
    delay: `${index * 0.11}s`,
    rotation: `${-34 + ((index * 19) % 72)}deg`,
    size: `${42 + ((index * 7) % 22)}px`,
  })), []);
  const shareMessage = `🙏 With gratitude, I have offered Pushpanjali to Sri Aurobindo on his 154th Birthday.\n\nYou too can offer your Pushpanjali and receive a personalised e-Certificate:\n${pushpanjaliLandingUrl}\n\nPowered by: Sri Aurobindo Society, Lucknow, Gomti Nagar Centre (UC-02)`;

  useEffect(() => {
    let active = true;
    fetch(offeringEndpoint())
      .then(response => response.ok ? response.json() : null)
      .then((payload: unknown) => {
        const count = Number((payload as { count?: unknown } | null)?.count);
        if (active && Number.isFinite(count)) setOfferingCount(count);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    [
      "/pushpanjali-certificate-ornamental-bg.png",
      "/pushpanjali-sri-aurobindo.jpg",
      "/society-logo-transparent.png",
      ...flowers.map(flower => flower.cutout),
    ].forEach(source => { void loadImage(source).catch(() => {}); });
  }, []);

  useEffect(() => {
    if (status !== "offered") return;
    window.requestAnimationFrame(() => modalRef.current?.scrollTo({ top: 0, behavior: "auto" }));
  }, [status]);

  useEffect(() => {
    if (!certificateBlob) {
      setCertificatePreviewUrl("");
      return;
    }
    const previewUrl = URL.createObjectURL(certificateBlob);
    setCertificatePreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [certificateBlob]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCampaign();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const closeCampaign = () => {
    setOpen(false);
  };

  const submitOffering = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting") return;
    setStatus("offered");
    setError("");
    setResult(null);
    setCertificateBlob(null);
    setShareNotice("");
    try {
      const response = await fetch(offeringEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, flowerId: selectedFlower.id, website: "" }),
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
        reference?: string;
        offeringNumber?: number;
        emailed?: boolean;
        emailQueued?: boolean;
        emailToken?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Your Pushpanjali could not be recorded. Please try again.");
      const offeringResult = {
        reference: String(payload.reference || "SAS-PUSHPA-2026"),
        offeringNumber: Number(payload.offeringNumber || 0),
        emailed: Boolean(payload.emailed),
        emailQueued: Boolean(payload.emailQueued),
        emailToken: String(payload.emailToken || ""),
      };
      setResult(offeringResult);
      setOfferingCount(current => current + 1);
      try {
        const blob = await buildCertificate(offeringResult);
        setCertificateBlob(blob);
        triggerCertificateDownload(blob);
        if (offeringResult.emailQueued && offeringResult.emailToken) {
          void deliverCertificateEmail(blob, offeringResult);
        }
      } catch {
        setError("Your offering is recorded, but automatic certificate download was blocked. Use the download button below.");
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Your Pushpanjali could not be recorded. Please try again.");
      setStatus("ready");
    }
  };

  const buildCertificate = async (certificateResult: OfferingResult) => {
      const [ornamentalBackground, portrait, flower, logo] = await Promise.all([
        loadImage("/pushpanjali-certificate-ornamental-bg.png"),
        loadImage("/pushpanjali-sri-aurobindo.jpg"),
        loadImage(selectedFlower.cutout),
        loadImage("/society-logo-transparent.png"),
      ]);
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1130;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable");

      context.drawImage(ornamentalBackground, 0, 0, canvas.width, canvas.height);

      context.fillStyle = "#173846";
      context.textAlign = "center";
      context.font = "700 39px Arial";
      const societyName = "SRI AUROBINDO SOCIETY, LUCKNOW";
      const logoWidth = 96;
      const logoHeight = 82;
      const headerGap = 22;
      const societyWidth = context.measureText(societyName).width;
      const headerWidth = logoWidth + headerGap + societyWidth;
      const headerLeft = (canvas.width - headerWidth) / 2;
      const societyCenter = headerLeft + logoWidth + headerGap + societyWidth / 2;
      context.drawImage(logo, headerLeft, 73, logoWidth, logoHeight);
      context.fillText(societyName, societyCenter, 112);
      context.fillStyle = "#9a621b";
      context.font = "700 16px Arial";
      context.fillText("GOMTI NAGAR CENTRE (UC-02)", societyCenter, 148);

      const portraitX = 105;
      const portraitY = 225;
      const portraitWidth = 430;
      const portraitHeight = 763;
      context.save();
      context.fillStyle = "rgba(255,253,246,.62)";
      context.shadowColor = "rgba(86,59,21,.18)";
      context.shadowBlur = 24;
      context.shadowOffsetY = 9;
      roundedRect(context, portraitX - 12, portraitY - 12, portraitWidth + 24, portraitHeight + 24, 26);
      context.fill();
      context.restore();
      roundedRect(context, portraitX, portraitY, portraitWidth, portraitHeight, 22);
      context.save();
      context.clip();
      const portraitRatio = portrait.width / portrait.height;
      const frameRatio = portraitWidth / portraitHeight;
      const drawWidth = portraitRatio > frameRatio ? portraitHeight * portraitRatio : portraitWidth;
      const drawHeight = portraitRatio > frameRatio ? portraitHeight : portraitWidth / portraitRatio;
      const scale = drawWidth / portrait.width;
      const focalX = portrait.width * .432;
      const desiredDrawX = portraitX + portraitWidth / 2 - focalX * scale;
      const drawX = Math.min(portraitX, Math.max(portraitX + portraitWidth - drawWidth, desiredDrawX));
      context.drawImage(portrait, drawX, portraitY + (portraitHeight - drawHeight) / 2, drawWidth, drawHeight);
      context.restore();
      context.strokeStyle = "#c99a51";
      context.lineWidth = 3;
      roundedRect(context, portraitX, portraitY, portraitWidth, portraitHeight, 22);
      context.stroke();

      context.fillStyle = "rgba(16,43,56,.82)";
      roundedRect(context, 127, 247, 230, 80, 10);
      context.fill();
      context.textAlign = "left";
      context.fillStyle = "#fffdf7";
      context.font = "26px Georgia";
      context.fillText("Sri Aurobindo", 145, 281);
      context.fillStyle = "#e8c884";
      context.font = "bold 16px Arial";
      context.fillText("1872-1950", 145, 309);

      const contentLeft = 600;
      const contentRight = 1475;
      const contentCenter = (contentLeft + contentRight) / 2;
      context.save();
      context.fillStyle = "rgba(255,253,246,.48)";
      roundedRect(context, 570, 210, 930, 790, 28);
      context.fill();
      context.restore();
      context.textAlign = "center";
      context.fillStyle = "#173846";
      context.font = "bold 34px Georgia";
      context.fillText("Certificate of Pushpanjali", contentCenter, 275);
      context.strokeStyle = "rgba(173,112,28,.65)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(contentCenter - 240, 300);
      context.lineTo(contentCenter + 240, 300);
      context.stroke();
      context.fillStyle = "#4b5c62";
      context.font = "19px Arial";
      context.fillText("This certifies that", contentCenter, 345);

      let nameFontSize = 66;
      do {
        context.font = `italic ${nameFontSize}px Georgia`;
        if (context.measureText(name.trim()).width <= 790) break;
        nameFontSize -= 2;
      } while (nameFontSize > 34);
      context.fillStyle = "#a66a16";
      context.fillText(name.trim(), contentCenter, 420);
      const underlineWidth = Math.min(810, Math.max(420, context.measureText(name.trim()).width + 70));
      context.strokeStyle = "#a86d27";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(contentCenter - underlineWidth / 2, 441);
      context.lineTo(contentCenter + underlineWidth / 2, 441);
      context.stroke();

      context.fillStyle = "#455b63";
      context.font = "23px Georgia";
      context.fillText("has lovingly offered Pushpanjali to Sri Aurobindo", contentCenter, 497);
      context.fillStyle = "#a86d27";
      context.font = "bold 26px Georgia";
      context.fillText("on his 154th Birthday.", contentCenter, 542);

      context.textAlign = "left";
      context.fillStyle = "#173846";
      context.font = "bold 28px Georgia";
      context.fillText("Flower Offered", contentLeft, 610);
      context.fillStyle = "#78643f";
      context.font = "bold 12px Arial";
      context.fillText("BOTANICAL NAME / VARIETY", contentLeft, 650);
      context.fillStyle = "#4b5c62";
      context.font = "15px Arial";
      context.fillText(selectedFlower.botanical, contentLeft, 675);
      context.fillStyle = "#78643f";
      context.font = "bold 13px Arial";
      context.fillText("SPIRITUAL SIGNIFICANCE GIVEN BY THE MOTHER", contentLeft, 710);
      context.fillStyle = "#4b5c62";
      context.font = "italic 21px Georgia";
      wrapText(context, `\u201c${selectedFlower.meaning}\u201d`, contentLeft, 738, 575, 31);
      context.fillStyle = "#a86d27";
      context.font = "bold 25px Georgia";
      context.fillText(selectedFlower.name, contentLeft, 795);

      context.save();
      context.shadowColor = "rgba(63,43,18,.25)";
      context.shadowBlur = 18;
      context.shadowOffsetY = 8;
      context.drawImage(flower, 1235, 610, 220, 220);
      context.restore();

      context.textAlign = "center";
      context.strokeStyle = "rgba(185,131,53,.55)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(contentLeft, 855);
      context.lineTo(contentRight, 855);
      context.stroke();
      context.fillStyle = "#173846";
      context.font = "bold 28px Arial";
      context.fillText("15 AUGUST 2026  |  DARSHAN DIVAS", contentCenter, 920);
      context.fillStyle = "#8b6a35";
      context.font = "bold 21px Arial";
      context.fillText(`CERTIFICATE NUMBER: ${certificateResult.reference}`, contentCenter, 974);

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Certificate image could not be created")), "image/png");
      });
  };

  const certificateFilename = () => `SAS-Lucknow-Pushpanjali-${name.trim().replace(/[^a-z0-9]+/gi, "-") || "Certificate"}.png`;

  const triggerCertificateDownload = (blob: Blob) => {
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = certificateFilename();
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  };

  const downloadCertificate = async () => {
    if (!result) return;
    try {
      const blob = certificateBlob || await buildCertificate(result);
      setCertificateBlob(blob);
      triggerCertificateDownload(blob);
    } catch {
      setError("The certificate could not be downloaded on this device. Please try once more.");
    }
  };

  const shareCertificateOnWhatsApp = async () => {
    if (!result) return;
    setError("");
    setShareNotice("");
    try {
      const blob = certificateBlob || await buildCertificate(result);
      setCertificateBlob(blob);
      const file = new File([blob], certificateFilename(), { type: "image/png" });
      const shareData = { title: "My Pushpanjali Certificate", text: shareMessage, files: [file] };
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        setShareNotice("Your phone's share menu is open. Choose WhatsApp or WhatsApp Business, then select the intended contact.");
        return;
      }
      const encodedMessage = encodeURIComponent(shareMessage);
      const whatsappUrl = isMobileBrowser() ? `https://wa.me/?text=${encodedMessage}` : `https://web.whatsapp.com/send?text=${encodedMessage}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      setShareNotice(isMobileBrowser()
        ? "Choose WhatsApp or WhatsApp Business if your phone asks, then select the intended contact and attach the downloaded certificate image."
        : "WhatsApp Web has opened. Attach the downloaded certificate image in WhatsApp Web and send the prepared message.");
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setError("WhatsApp sharing could not open on this device. Download the certificate and share it from WhatsApp.");
    }
  };

  const shareCertificateOnFacebook = () => {
    if (!result) return;
    const encodedMessage = encodeURIComponent(shareMessage);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pushpanjaliLandingUrl)}&quote=${encodedMessage}`;
    window.open(facebookUrl, "_blank", "noopener,noreferrer");
    void navigator.clipboard?.writeText(shareMessage).catch(() => {});
    setShareNotice("Facebook is open and the message is copied. Add the certificate image shown above, then paste the message if Facebook does not include it automatically.");
  };

  const deliverCertificateEmail = async (blob: Blob, offeringResult: OfferingResult) => {
    try {
      const response = await fetch(`${offeringEndpoint()}/certificate-email?token=${encodeURIComponent(offeringResult.emailToken)}`, {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: blob,
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; emailed?: boolean };
      if (!response.ok || !payload.emailed) throw new Error(payload.error || "The certificate email could not be sent.");
      setResult(current => current ? { ...current, emailed: true, emailQueued: false } : current);
    } catch {
      setResult(current => current ? { ...current, emailed: false, emailQueued: false } : current);
      setError("Your certificate is ready, but the email could not be sent. Please download it below.");
    }
  };

  const shareCertificateOnInstagram = async () => {
    if (!result) return;
    setError("");
    setShareNotice("");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareMessage);
      }
      const encodedMessage = encodeURIComponent(shareMessage);
      const instagramUrl = isMobileBrowser()
        ? `instagram://story-camera?text=${encodedMessage}`
        : `https://www.instagram.com/direct/new?text=${encodedMessage}`;
      const opened = window.open(instagramUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        setError("Instagram could not open in a new tab. Open Instagram and paste the prepared message.");
        return;
      }
      setShareNotice("Instagram is open. If needed, paste the copied message and attach your certificate.");
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setError("Instagram share could not open. Your message is copied. Please paste it manually in Instagram.");
    }
  };

  return <>
    {!open && <button className="pushpanjali-reopen" type="button" onClick={() => setOpen(true)}>
      <span aria-hidden="true">&#10022;</span><b>Pushpanjali</b><small>15 August 2026</small>
    </button>}

    {open && <div className="pushpanjali-backdrop" role="presentation">
      <section ref={modalRef} className="pushpanjali-modal" role="dialog" aria-modal="true" aria-labelledby="pushpanjali-title">
        <button className="pushpanjali-close" type="button" onClick={closeCampaign} aria-label="Close Pushpanjali">&times;</button>
        <header className="pushpanjali-heading">
          <div className="pushpanjali-counter" aria-live="polite"><strong>{offeringCount.toLocaleString("en-IN")}</strong><span>certificates generated</span></div>
          <p>15 AUGUST 2026 - SRI AUROBINDO'S BIRTHDAY DARSHAN</p>
          <h2 id="pushpanjali-title">Pushpanjali to Sri Aurobindo</h2>
          <span>Offer a flower in gratitude, aspiration and remembrance.</span>
        </header>

        <div className="pushpanjali-body">
          <div className={`pushpanjali-portrait ${status === "offered" ? "is-offered" : ""}`} aria-label="Virtual flower offering to Sri Aurobindo">
            <img className="pushpanjali-aurobindo" src="/pushpanjali-sri-aurobindo.jpg" alt="Sri Aurobindo seated in Pondicherry in April 1950"/>
            <div className="pushpanjali-aura" aria-hidden="true"/>
            {status === "offered" && fallingFlowers.map((flower, index) => <img
              className="pushpanjali-falling-flower"
              src={selectedFlower.cutout}
              alt=""
              aria-hidden="true"
              key={`${selectedFlower.id}-${index}`}
              style={{
                "--flower-left": `${flower.left}%`,
                "--flower-delay": flower.delay,
                "--flower-rotation": flower.rotation,
                "--flower-size": flower.size,
              } as React.CSSProperties}
            />)}
            <div className="pushpanjali-photo-caption"><b>Sri Aurobindo</b><span>1872-1950</span></div>
          </div>

          {status !== "offered" ? <form className="pushpanjali-form" onSubmit={submitOffering}>
            <div className="pushpanjali-fields">
              <label>Your name<input required value={name} onChange={event => setName(event.target.value)} maxLength={100} autoComplete="name" placeholder="Enter your full name"/></label>
              <label>Email for your certificate<input required value={email} onChange={event => setEmail(event.target.value)} type="email" maxLength={180} autoComplete="email" placeholder="you@example.com"/></label>
            </div>
            <fieldset>
              <legend>Select your pushpa for Pushpanjali</legend>
              <div className="pushpanjali-flowers">
                {flowers.map(flower => <label className={selectedId === flower.id ? "selected" : ""} key={flower.id}>
                  <input type="radio" name="flower" value={flower.id} checked={selectedId === flower.id} onChange={() => setSelectedId(flower.id)}/>
                  <img src={flower.image} alt={flower.name}/>
                  <span><b>{flower.name}</b><q>{flower.meaning}</q><small>{flower.botanical}</small></span>
                </label>)}
              </div>
            </fieldset>
            <label className="pushpanjali-honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off"/></label>
            <p className="pushpanjali-privacy">Your email is used only to deliver this certificate. It is not added to a mailing list.</p>
            {error && <p className="pushpanjali-error" role="alert">{error}</p>}
            <button className="pushpanjali-submit" type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? "Preparing your offering..." : "Offer Pushpanjali & receive certificate"}<span aria-hidden="true">&rarr;</span>
            </button>
          </form> : <div className="pushpanjali-success" aria-live="polite">
            <span className="pushpanjali-success-symbol" aria-hidden="true">&#10022;</span>
            <p>YOUR PUSHPA HAS BEEN OFFERED</p>
            <h3><span>With gratitude,</span><em>{name.trim()}.</em></h3>
            <p className="pushpanjali-thanks">Thank you for offering your Pushpanjali to Sri Aurobindo. May this gesture of aspiration remain with you.</p>
            <div className="pushpanjali-thank-flower">
              <div><span className="pushpanjali-flower-label">Flower offered</span><strong>{selectedFlower.name}</strong><span className="pushpanjali-botanical-label">Botanical name / variety</span><small className="pushpanjali-botanical">{selectedFlower.botanical}</small><span>Spiritual significance given by the Mother</span><q>{selectedFlower.meaning}</q></div>
              <img src={selectedFlower.cutout} alt={selectedFlower.name}/>
            </div>
            <div className="pushpanjali-reference"><span>Certificate Number</span><b>{result?.reference || "Being prepared..."}</b></div>
            <p className="pushpanjali-email-status">{!result
              ? "Your offering is being recorded and your certificate is being prepared..."
              : result.emailed
                ? `Your e-Certificate has been sent to ${email}.`
                : result.emailQueued
                  ? `Your certificate is ready. A copy is being sent to ${email} in the background.`
                  : "Your certificate is ready below."}</p>
            <div className="pushpanjali-certificate-preview" aria-live="polite">
              {certificatePreviewUrl
                ? <img src={certificatePreviewUrl} alt={`Pushpanjali e-Certificate for ${name.trim()}`}/>
                : <div className="pushpanjali-preview-loading"><span aria-hidden="true">&#10022;</span>Preparing your full certificate preview...</div>}
            </div>
            {error && <p className="pushpanjali-error" role="alert">{error}</p>}
            <div className="pushpanjali-success-actions">
              <button className="pushpanjali-whatsapp" type="button" onClick={shareCertificateOnWhatsApp} disabled={!result}>Share Certificate on WhatsApp</button>
              <button className="pushpanjali-facebook" type="button" onClick={shareCertificateOnFacebook} disabled={!result}>Share on Facebook</button>
              <button className="pushpanjali-instagram" type="button" onClick={shareCertificateOnInstagram} disabled={!result}>Share on Instagram</button>
              <button type="button" onClick={downloadCertificate} disabled={!result}>Download e-Certificate</button>
            </div>
            {shareNotice && <p className="pushpanjali-share-notice" role="status">{shareNotice}</p>}
            <button className="pushpanjali-finish" type="button" onClick={closeCampaign}>Return to the website</button>
          </div>}
        </div>
        <footer className="pushpanjali-footer">Presented by Sri Aurobindo Society, Lucknow - Gomti Nagar Centre (UC-02)</footer>
      </section>
    </div>}
  </>;
}
