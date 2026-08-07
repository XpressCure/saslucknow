export default function SultanpurShrinePage() {
  return (
    <div className="detail-page">
      <header className="detail-header">
        <a className="brand" href="/">
          <img className="society-logo" src="/society-logo-transparent.png" alt="Sri Aurobindo Society symbol"/>
          <span>Sri Aurobindo Society<small>LUCKNOW · GOMTI NAGAR CENTRE</small></span>
        </a>
        <nav aria-label="Shrine page navigation">
          <a href="/">Home</a>
          <a href="/#wisdom">e-Library</a>
          <a href="/#location">Lucknow Centre</a>
        </nav>
      </header>

      <main>
        <section className="detail-hero">
          <div className="detail-orb" aria-hidden="true">ॐ</div>
          <p className="kicker">A SACRED PLACE · SULTANPUR</p>
          <h1>The Sultanpur Shrine</h1>
          <p className="lead">A dedicated campus for remembrance, aspiration, education and collective spiritual life.</p>
        </section>

        <section className="detail-intro">
          <p className="detail-dropcap">The Sri Aurobindo Society has a local branch in Sultanpur, Uttar Pradesh, featuring a dedicated campus that houses the sacred relics of Sri Aurobindo and hosts regular spiritual and educational activities.</p>
        </section>

        <section className="detail-content" aria-labelledby="activities-title">
          <div>
            <p className="kicker">ACTIVITIES & CENTRE DETAILS</p>
            <h2 id="activities-title">A living centre of aspiration</h2>
          </div>
          <div className="detail-list">
            <article><span>01</span><div><h3>Divine Relics</h3><p>The centre at Barhaiyabeer, Sultanpur, was blessed with the enshrinement of Sri Aurobindo’s holy relics on April 6, 2008. It is managed by Dr. J. P. Singh.</p></div></article>
            <article><span>02</span><div><h3>Community Programs</h3><p>The centre regularly hosts collective meditations, spiritual discourses, and workshops on integral education for local youth and schools.</p></div></article>
            <article><span>03</span><div><h3>Affiliation</h3><p>It operates in coordination with regional committees and networks tied to the Sri Aurobindo Ashram – Delhi Branch and the wider Sri Aurobindo Society.</p></div></article>
          </div>
        </section>

        <section className="visit-placeholder">
          <div>
            <p className="kicker">PLAN A QUIET VISIT</p>
            <h2>Visit the Sultanpur campus</h2>
            <p>The full postal address, visiting guidance and Google Map location will be added here shortly.</p>
          </div>
          <div className="map-placeholder" aria-label="Map location to be added">
            <span>LOCATION DETAILS</span>
            <strong>Address and map coming soon</strong>
          </div>
        </section>
      </main>

      <footer className="detail-footer">
        <a href="/">← Return to the Lucknow Centre website</a>
        <small>Sri Aurobindo Society · Lucknow and Sultanpur</small>
      </footer>
    </div>
  );
}
