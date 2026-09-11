import Image from "next/image";
import Link from "next/link";

export function NextHumanConcept() {
  return <main className="nhc-page">
    <header className="nhc-header">
      <Link href="/" className="nhc-brand" aria-label="Sri Aurobindo Society Lucknow home">
        <Image src="/next-human/sri-aurobindo-symbol.png" alt="Sri Aurobindo symbol" width={40} height={40} unoptimized />
        <span><strong>NEXT HUMAN</strong><small>SRI AUROBINDO SOCIETY · LUCKNOW</small></span>
      </Link>
      <nav aria-label="Website navigation">
        <Link href="/">Home</Link>
        <Link href="/next-human" aria-current="page">NEXT HUMAN</Link>
        <Link href="/next-human-quiz">The Next Human Quiz</Link>
        <Link href="/sri-aurobindo">Sri Aurobindo</Link>
        <Link href="/the-mother">The Mother</Link>
        <Link href="/#wisdom">e-Library</Link>
        <Link href="/joincommunity">Community</Link>
      </nav>
    </header>

    <section className="nhc-hero">
      <div className="nhc-hero-copy">
        <p className="nhc-kicker">AN INQUIRY INTO HUMAN POSSIBILITY</p>
        <h1>What comes <em>after</em> the human we know?</h1>
        <p>The human being is not a finished product. NEXT HUMAN is an invitation to examine what we are, what we may become, and whether consciousness itself can evolve.</p>
        <a href="#glimpse">Enter the inquiry <span>↓</span></a>
      </div>
      <div className="nhc-hero-art" aria-hidden="true"><Image src="/next-human/hero-inquiry.png" alt="" fill priority unoptimized /></div>
    </section>

    <section className="nhc-idea" id="idea">
      <p className="nhc-kicker">THE CENTRAL IDEA</p>
      <blockquote>Man is a transitional being. The question is not merely what humanity will make next—but what humanity will become next.</blockquote>
      <div>
        <p>Our technologies advance rapidly, yet the consciousness using them often remains divided, reactive and uncertain of its purpose. Greater power does not by itself produce greater wisdom.</p>
        <p>NEXT HUMAN turns attention toward the maker of the future: the human being. It brings evolution, consciousness, the body, knowledge and inner development into one sustained field of inquiry.</p>
      </div>
    </section>

    <section className="nhc-glimpse" id="glimpse">
      <header><p className="nhc-kicker">A GLIMPSE INSIDE</p><h2>Four doors into one<br/>unsettling question.</h2><p>This is not a prediction of a superior species. It is a guided inquiry into the unfinished human—and the capacities that may still be waiting to awaken.</p></header>
      <div className="nhc-glimpse-grid">
        <article><span>01</span><h3>The unfinished human</h3><p>What if our confusion and contradiction are not the end of the story, but signs of a transition still in progress?</p></article>
        <article><span>02</span><h3>Power without wisdom</h3><p>Technology expands what we can do. Can consciousness grow quickly enough to guide what we choose to do?</p></article>
        <article><span>03</span><h3>The intelligence of the body</h3><p>Is the body merely an instrument—or does matter itself carry a deeper evolutionary possibility?</p></article>
        <article><span>04</span><h3>Knowledge turned inward</h3><p>What changes when the observer becomes part of the inquiry, and inner experience is examined with care?</p></article>
      </div>
      <div className="nhc-walkthrough"><p>Across the two books</p><ol><li><strong>Notice</strong><span>the assumptions hidden inside the word “human”.</span></li><li><strong>Question</strong><span>the gap between outer mastery and inner development.</span></li><li><strong>Explore</strong><span>consciousness, evolution and the body as one inquiry.</span></li><li><strong>Carry</strong><span>the question into your own life—without accepting a ready-made answer.</span></li></ol></div>
    </section>

    <section className="nhc-books" id="books">
      <header><p className="nhc-kicker">THE NEXT HUMAN SERIES</p><h2>Two books.<br/>One unfolding question.</h2><p>Book Zero prepares the ground. Book One enters the inquiry. Together they offer a clear path into the concept of the Next Human.</p></header>
      <div className="nhc-book-list">
        <article>
          <div className="nhc-cover"><small>NEXT HUMAN</small><b>0</b><strong>BOOK ZERO</strong></div>
          <div><span>THE GROUND · FREE</span><h3>Book Zero</h3><p>Before asking what the human can become, we must look carefully at what we currently call human—our assumptions, inherited limits, unfinished evolution and the quality of the questions we are prepared to ask.</p><p className="nhc-book-note">A clearing of the ground for the inquiry that follows.</p><p className="nhc-languages">Available in English and Hindi</p><Link className="nhc-book-action" href="/member/next-human-books?book=zero">Read Book Zero free <b>→</b></Link></div>
        </article>
        <article>
          <div className="nhc-cover nhc-cover-one"><small>NEXT HUMAN</small><b>I</b><strong>BOOK ONE</strong></div>
          <div><span>THE INQUIRY · ₹299</span><h3>Book One</h3><p>The inquiry moves into consciousness itself: the relation between inner experience and outer knowledge, the possibilities carried by the body, and the evolutionary movement toward a more conscious human being.</p><p className="nhc-book-note">An opening movement—not a final conclusion.</p><p className="nhc-languages">One purchase unlocks English and Hindi</p><Link className="nhc-book-action nhc-book-action-paid" href="/member/next-human-books?book=one">Unlock Book One · ₹299 <b>→</b></Link></div>
        </article>
      </div>
    </section>

    <section className="nhc-close">
      <p className="nhc-kicker">A QUESTION TO CARRY</p>
      <h2>If the human is transitional,<br/>what is trying to emerge through us?</h2>
      <a href="/next-human-quiz">Explore The Next Human Quiz <span>→</span></a>
    </section>

    <footer className="nhc-footer"><div><Image src="/next-human/sri-aurobindo-symbol.png" alt="Sri Aurobindo symbol" width={44} height={44} unoptimized/><span><strong>NEXT HUMAN</strong><small>An initiative of Sri Aurobindo Society, Lucknow</small></span></div><p>Consciousness · Evolution · The Future Human</p></footer>
  </main>;
}
