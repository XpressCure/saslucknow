"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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
};

const flowers: Flower[] = [
  {
    id: "divine-love",
    name: "Divine Love",
    meaning: "A flower that is said to blossom even in the desert.",
    botanical: "Punica granatum · orange-red, double",
    image: "/pushpanjali-divine-love.jpg",
    cutout: "/pushpanjali-divine-love-cutout.png",
  },
  {
    id: "integral-love",
    name: "Integral Love for the Divine",
    meaning: "Pure, complete, irrevocable, a love that gives itself for ever.",
    botanical: "Rosa · white",
    image: "/pushpanjali-integral-love.jpg",
    cutout: "/pushpanjali-integral-love-cutout.png",
  },
  {
    id: "supramental-power",
    name: "Power of the Supramental Consciousness",
    meaning: "Organising and active, irresistible in its influence.",
    botanical: "Hibiscus rosa-sinensis ‘Rukmini’ · deep gold, double",
    image: "/pushpanjali-supramental-power.jpg",
    cutout: "/pushpanjali-supramental-power-cutout.png",
  },
];

const flowerPositions = [8, 16, 25, 34, 43, 52, 61, 70, 79, 88, 13, 29, 47, 65, 83];

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
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

export function PushpanjaliCampaign() {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<Flower["id"]>("divine-love");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"ready" | "submitting" | "offered">("ready");
  const [error, setError] = useState("");
  const [result, setResult] = useState<OfferingResult | null>(null);
  const selectedFlower = flowers.find(flower => flower.id === selectedId) || flowers[0];
  const fallingFlowers = useMemo(() => flowerPositions.map((left, index) => ({
    left,
    delay: `${index * 0.11}s`,
    rotation: `${-34 + ((index * 19) % 72)}deg`,
    size: `${42 + ((index * 7) % 22)}px`,
  })), []);

  useEffect(() => {
    if (window.sessionStorage.getItem("sas-pushpanjali-2026-seen")) return;
    const timer = window.setTimeout(() => setOpen(true), 550);
    return () => window.clearTimeout(timer);
  }, []);

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
    window.sessionStorage.setItem("sas-pushpanjali-2026-seen", "yes");
    setOpen(false);
  };

  const submitOffering = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setError("");
    try {
      const endpoint = window.location.hostname.endsWith("chatgpt.site")
        ? "https://www.saslucknow.in/api/pushpanjali-offerings"
        : "/api/pushpanjali-offerings";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, flowerId: selectedFlower.id, website: "" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Your Pushpanjali could not be recorded. Please try again.");
      setResult({
        reference: String(payload.reference || "SAS-PUSHPA-2026"),
        offeringNumber: Number(payload.offeringNumber || 1),
        emailed: Boolean(payload.emailed),
      });
      setStatus("offered");
      window.sessionStorage.setItem("sas-pushpanjali-2026-seen", "yes");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Your Pushpanjali could not be recorded. Please try again.");
      setStatus("ready");
    }
  };

  const downloadCertificate = async () => {
    if (!result) return;
    try {
      const [portrait, flower] = await Promise.all([
        loadImage("/pushpanjali-sri-aurobindo.jpg"),
        loadImage(selectedFlower.cutout),
      ]);
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 1100;
      const context = canvas.getContext("2d");
      if (!context) return;

      const background = context.createLinearGradient(0, 0, 1600, 1100);
      background.addColorStop(0, "#fffaf0");
      background.addColorStop(.48, "#f7e6bb");
      background.addColorStop(1, "#fffdf7");
      context.fillStyle = background;
      context.fillRect(0, 0, 1600, 1100);
      context.strokeStyle = "#b98335";
      context.lineWidth = 5;
      context.strokeRect(35, 35, 1530, 1030);
      context.strokeStyle = "rgba(185,131,53,.55)";
      context.lineWidth = 1.5;
      context.strokeRect(55, 55, 1490, 990);

      context.fillStyle = "#173846";
      context.textAlign = "center";
      context.font = "700 28px Arial";
      context.fillText("SRI AUROBINDO SOCIETY · LUCKNOW", 800, 112);
      context.fillStyle = "#a86d27";
      context.font = "20px Arial";
      context.fillText("GOMTI NAGAR CENTRE (UC-02)", 800, 148);
      context.font = "italic 32px Georgia";
      context.fillText("Presents this", 800, 215);
      context.fillStyle = "#173846";
      context.font = "64px Georgia";
      context.fillText("Certificate of Pushpanjali", 800, 285);

      roundedRect(context, 105, 340, 390, 545, 22);
      context.save();
      context.clip();
      const portraitRatio = portrait.width / portrait.height;
      const frameRatio = 390 / 545;
      const drawWidth = portraitRatio > frameRatio ? 545 * portraitRatio : 390;
      const drawHeight = portraitRatio > frameRatio ? 545 : 390 / portraitRatio;
      context.drawImage(portrait, 105 + (390 - drawWidth) / 2, 340 + (545 - drawHeight) / 2, drawWidth, drawHeight);
      context.restore();
      context.strokeStyle = "#c99a51";
      context.lineWidth = 3;
      roundedRect(context, 105, 340, 390, 545, 22);
      context.stroke();

      context.fillStyle = "rgba(16,43,56,.78)";
      roundedRect(context, 126, 362, 218, 78, 10);
      context.fill();
      context.textAlign = "left";
      context.fillStyle = "#fffdf7";
      context.font = "26px Georgia";
      context.fillText("Sri Aurobindo", 144, 395);
      context.fillStyle = "#e8c884";
      context.font = "bold 16px Arial";
      context.fillText("1872–1950", 144, 423);

      context.textAlign = "left";
      context.fillStyle = "#4b5c62";
      context.font = "24px Arial";
      context.fillText("This certifies that", 575, 390);
      context.fillStyle = "#173846";
      context.font = "58px Georgia";
      wrapText(context, name.trim(), 575, 465, 890, 64);
      context.fillStyle = "#4b5c62";
      context.font = "25px Arial";
      context.fillText("has lovingly offered", 575, 545);
      context.fillStyle = "#a86d27";
      context.font = "bold 38px Georgia";
      context.fillText(selectedFlower.name, 575, 602);
      context.fillStyle = "#4b5c62";
      context.font = "italic 27px Georgia";
      const meaningEnd = wrapText(context, `“${selectedFlower.meaning}”`, 575, 660, 780, 38);
      context.fillStyle = "#78643f";
      context.font = "19px Arial";
      context.fillText("— Spiritual significance given by the Mother", 575, meaningEnd + 38);

      context.save();
      context.shadowColor = "rgba(63,43,18,.25)";
      context.shadowBlur = 18;
      context.shadowOffsetY = 8;
      context.drawImage(flower, 1275, 635, 230, 230);
      context.restore();

      context.textAlign = "center";
      context.fillStyle = "#173846";
      context.font = "bold 28px Arial";
      context.fillText("15 AUGUST 2026 · DARSHAN DAY", 980, 870);
      context.fillStyle = "#8b6a35";
      context.font = "20px Arial";
      context.fillText(`Offering ${String(result.offeringNumber).padStart(4, "0")} · ${result.reference}`, 980, 915);
      context.fillStyle = "#173846";
      context.font = "italic 24px Georgia";
      context.fillText("With gratitude and aspiration", 800, 992);

      canvas.toBlob(blob => {
        if (!blob) return;
        const anchor = document.createElement("a");
        anchor.href = URL.createObjectURL(blob);
        anchor.download = `SAS-Lucknow-Pushpanjali-${name.trim().replace(/[^a-z0-9]+/gi, "-") || "Certificate"}.png`;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
      }, "image/png");
    } catch {
      setError("The certificate could not be downloaded on this device. Please try once more.");
    }
  };

  return <>
    {!open && <button className="pushpanjali-reopen" type="button" onClick={() => setOpen(true)}>
      <span aria-hidden="true">✦</span><b>Pushpanjali</b><small>15 August 2026</small>
    </button>}

    {open && <div className="pushpanjali-backdrop" role="presentation">
      <section className="pushpanjali-modal" role="dialog" aria-modal="true" aria-labelledby="pushpanjali-title">
        <button className="pushpanjali-close" type="button" onClick={closeCampaign} aria-label="Close Pushpanjali">×</button>
        <header className="pushpanjali-heading">
          <p>15 AUGUST 2026 · SRI AUROBINDO’S BIRTHDAY DARSHAN</p>
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
            <div className="pushpanjali-photo-caption"><b>Sri Aurobindo</b><span>1872–1950</span></div>
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
              {status === "submitting" ? "Preparing your offering…" : "Offer Pushpanjali & receive certificate"}<span aria-hidden="true">→</span>
            </button>
          </form> : <div className="pushpanjali-success" aria-live="polite">
            <span className="pushpanjali-success-symbol" aria-hidden="true">✦</span>
            <p>YOUR PUSHPA HAS BEEN OFFERED</p>
            <h3>With gratitude, {name.trim()}.</h3>
            <blockquote>“{selectedFlower.meaning}”</blockquote>
            <small>{selectedFlower.name} · The Mother</small>
            <div className="pushpanjali-reference">Offering {String(result?.offeringNumber || 1).padStart(4, "0")}<b>{result?.reference}</b></div>
            <p className="pushpanjali-email-status">{result?.emailed
              ? `Your e-Certificate has been sent to ${email}.`
              : "Your certificate is ready below. Email delivery is being completed."}</p>
            {error && <p className="pushpanjali-error" role="alert">{error}</p>}
            <div className="pushpanjali-success-actions">
              <button type="button" onClick={downloadCertificate}>Download e-Certificate</button>
              <a href="https://www.facebook.com/saslucknow" target="_blank" rel="noreferrer">Follow SAS Lucknow on Facebook <span aria-hidden="true">↗</span></a>
            </div>
            <button className="pushpanjali-finish" type="button" onClick={closeCampaign}>Return to the website</button>
          </div>}
        </div>
        <footer className="pushpanjali-footer">Presented by Sri Aurobindo Society, Lucknow · Gomti Nagar Centre (UC-02)</footer>
      </section>
    </div>}
  </>;
}
