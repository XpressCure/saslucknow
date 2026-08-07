const darshanDays = [
  {
    date: "15 August",
    year: "1872",
    title: "Sri Aurobindo’s Birthday",
    significance: "Sri Aurobindo was born in Calcutta on this day. The date is remembered not only as a birthday, but as the advent of a consciousness and evolutionary vision whose influence continues to work for humanity’s future.",
  },
  {
    date: "21 February",
    year: "1878",
    title: "The Mother’s Birthday",
    significance: "The day commemorates the birth of Mirra Alfassa in Paris. For devotees, it is an occasion to renew openness to the Mother’s consciousness and her work of bringing spiritual awareness into every part of life.",
  },
  {
    date: "24 April",
    year: "1920",
    title: "The Mother’s Final Arrival",
    significance: "The Mother returned to Pondicherry on this day to remain permanently with Sri Aurobindo. It marks the beginning of their uninterrupted collaboration and a decisive step in the collective work of Integral Yoga.",
  },
  {
    date: "24 November",
    year: "1926",
    title: "Siddhi Day · Victory Day",
    significance: "This day recalls a major spiritual realisation associated with the descent of the Overmind consciousness. It opened a new phase in Sri Aurobindo’s Yoga and is also linked with the formation of the Sri Aurobindo Ashram.",
  },
  {
    date: "5 December",
    year: "1950",
    title: "Sri Aurobindo’s Mahasamadhi",
    significance: "The day marks Sri Aurobindo’s withdrawal from the physical body. It is observed in silence and gratitude, with the understanding that his consciousness and action remain present in the continuing work.",
  },
  {
    date: "29 February",
    year: "1956",
    title: "Supramental Manifestation Day",
    significance: "During the Ashram’s collective meditation, the Mother experienced the supramental Light, Force and Consciousness entering the earth-atmosphere. The leap-day observance recalls this decisive event in the work of transformation.",
  },
  {
    date: "17 November",
    year: "1973",
    title: "The Mother’s Mahasamadhi",
    significance: "This day commemorates the Mother’s withdrawal from the physical body. It invites remembrance of her life of consecration and a renewed resolve to make her vision living through sincere practice and service.",
  },
];

export default function DarshanDivasPage() {
  return <div className="detail-page darshan-page">
    <header className="detail-header">
      <a className="brand" href="/"><img className="society-logo" src="/society-logo-transparent.png" alt="Sri Aurobindo Society symbol"/><span>Sri Aurobindo Society<small>LUCKNOW · GOMTI NAGAR CENTRE</small></span></a>
      <nav aria-label="Page navigation"><a href="/">Home</a><a href="/sri-aurobindo">Sri Aurobindo</a><a href="/the-mother">The Mother</a><a href="/#wisdom">e-Library</a></nav>
    </header>
    <main>
      <section className="darshan-hero"><div><p className="kicker">REMEMBRANCE · RECEPTIVITY · RENEWAL</p><h1>Darshan Divas</h1><p className="lead">Sacred dates that recall decisive moments in the lives and work of Sri Aurobindo and the Mother.</p></div><div className="darshan-aura" aria-hidden="true"><span>दर्शन</span></div></section>
      <section className="darshan-intro"><div><p className="kicker">THE MEANING OF DARSHAN</p><h2>A meeting in consciousness</h2></div><div><p>Darshan means seeing or coming into the presence of the Divine. After 1926, Sri Aurobindo and the Mother received disciples and visitors together on selected days. These occasions became known as Darshan Days.</p><p>Each Darshan was approached as a time of concentrated spiritual giving and receptive silence. After Sri Aurobindo left his body in 1950, the Mother continued the observance. Today these dates remain opportunities for meditation, gratitude and renewed aspiration.</p></div></section>
      <section className="darshan-days" aria-labelledby="days-title"><header><p className="kicker">SIGNIFICANCE OF THE DAYS</p><h2 id="days-title">Seven dates of inner remembrance</h2><p>Each day carries a distinct historical meaning and an invitation to conscious participation.</p></header><div className="darshan-grid">{darshanDays.map((day, i)=><article key={day.title}><span className="darshan-number">{String(i+1).padStart(2,"0")}</span><div className="darshan-date"><strong>{day.date}</strong><small>{day.year}</small></div><h3>{day.title}</h3><p>{day.significance}</p></article>)}</div></section>
      <section className="darshan-history"><div><p className="kicker">A LIVING TRADITION</p><h2>How the Darshan observance developed</h2></div><ol><li><span>1927–1938</span><p>Three principal Darshan Days were observed: the Mother’s birthday, Sri Aurobindo’s birthday and Siddhi Day.</p></li><li><span>1939</span><p>24 April, the Mother’s final arrival in Pondicherry, was added as the fourth principal Darshan Day.</p></li><li><span>1951–1973</span><p>The Mother continued giving Darshan. From 1963, she received assembled devotees through terrace Darshan.</p></li><li><span>Today</span><p>The days are observed through silence, meditation, remembrance and visits to spaces associated with their physical presence.</p></li></ol></section>
      <aside className="biography-source"><p className="kicker">ABOUT THIS PAGE</p><p>This internally stored guide presents original summaries based on established accounts of Darshan at the Sri Aurobindo Ashram and the recorded significance of these dates.</p></aside>
    </main>
    <footer className="detail-footer"><a href="/">← Return to the Lucknow Centre</a><small>The Song of Life</small></footer>
  </div>;
}
