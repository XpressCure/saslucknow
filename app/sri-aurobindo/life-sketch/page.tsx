const chapters = [
  {
    label: "1872–1893",
    title: "Origins and education",
    intro: "A childhood divided between India and England formed a remarkable command of languages, literature and European thought—while a quiet resolve to serve India was taking shape.",
    moments: [
      ["Calcutta and Darjeeling", "Born in Calcutta on 15 August 1872, Aurobindo spent his earliest school years in Darjeeling before travelling to England with his brothers in 1879."],
      ["St. Paul’s School, London", "At St. Paul’s he excelled in the classics, read widely in European literature and history, wrote poetry, and taught himself several languages."],
      ["King’s College, Cambridge", "He won a classical scholarship to King’s College, distinguished himself in Greek and Latin, and became active in the Indian Majlis. An appointment in the Baroda Service brought him home in 1893."],
    ],
  },
  {
    label: "1893–1910",
    title: "India’s awakening",
    intro: "The Baroda and Calcutta years united scholarship, revolutionary action and the first decisive movements of Yoga.",
    moments: [
      ["Baroda: years of self-culture", "During thirteen years in Baroda he served the State, taught at Baroda College and immersed himself in Sanskrit, Bengali and India’s spiritual and literary inheritance."],
      ["Pranayama and the turn to Yoga", "Beginning around 1904, his early Yogic practice brought new concentration and creative force. His search was joined to the aspiration for India’s freedom."],
      ["Calcutta and Bande Mataram", "From 1906 he became a leading voice of the nationalist movement, openly advocating complete independence through journalism, education and political organisation."],
      ["The Nirvana experience", "In January 1908, guided briefly by Vishnu Bhaskar Lele, he entered an enduring silence of mind that transformed the basis of his inner life."],
      ["Alipore Jail", "Arrested in May 1908, he spent a year as an undertrial prisoner. Meditation on the Gita and Upanishads opened profound experiences of the Divine present in all beings and circumstances."],
      ["Chandernagore to Pondicherry", "An inner command led him first to Chandernagore and then to Pondicherry, where he arrived on 4 April 1910 and withdrew from active politics to pursue his spiritual work."],
    ],
  },
  {
    label: "1910–1950",
    title: "Pondicherry and Integral Yoga",
    intro: "Four decades of concentrated spiritual research unfolded into a far-reaching philosophy, a community of seekers and a vision of humanity’s evolutionary future.",
    moments: [
      ["Silent spiritual action", "Retirement from politics was not a retreat from the world. Sri Aurobindo described a spiritual action operating behind outward events and kept close watch on India and the world."],
      ["The Mother", "Mirra Alfassa first met Sri Aurobindo in 1914 and returned permanently in 1920. Their collaboration became the living centre of the work of Integral Yoga."],
      ["The Arya and his writings", "Through the journal Arya and later works, he developed a many-sided vision expressed in The Life Divine, The Synthesis of Yoga, Essays on the Gita, Savitri and many other writings."],
      ["Siddhi Day and the Ashram", "On 24 November 1926, a decisive spiritual realisation marked a new phase. Sri Aurobindo withdrew from daily contact and the Mother assumed full charge of the community that became the Ashram."],
      ["A teaching for earthly life", "Integral Yoga seeks discovery of the Divine within and a transformation of mind, life and body through a higher consciousness—not an escape from earthly existence."],
      ["The legacy", "Sri Aurobindo left his body on 5 December 1950. His work continues as an invitation to participate consciously in the next movement of human evolution."],
    ],
  },
];

export default function LifeSketchPage() {
  return <div className="detail-page life-sketch-page">
    <header className="detail-header"><a className="brand" href="/"><img className="society-logo" src="https://cms.aurosociety.org/kcfinder/images/images/sas-symbol%281%29.jpg" alt="Sri Aurobindo Society symbol"/><span>Sri Aurobindo Society<small>LUCKNOW · GOMTI NAGAR CENTRE</small></span></a><nav aria-label="Page navigation"><a href="/">Home</a><a href="/sri-aurobindo">Sri Aurobindo</a><a href="/the-mother">The Mother</a></nav></header>
    <main>
      <section className="life-sketch-hero"><div><p className="kicker">1872–1950 · A CHRONOLOGICAL PORTRAIT</p><h1>A life devoted to the future</h1><p className="lead">The story of a poet, revolutionary and yogi—moving from India to England and back, from political action to a spiritual work for the transformation of life.</p></div><aside><blockquote>“Man is a transitional being, he is not final.”</blockquote><small>— Sri Aurobindo · CWSA Vol. 12, p. 157</small></aside></section>
      <div className="life-sketch-nav" aria-label="Life sketch chapters">{chapters.map((chapter,i)=><a href={`#chapter-${i+1}`} key={chapter.title}><span>{chapter.label}</span>{chapter.title}</a>)}</div>
      {chapters.map((chapter, chapterIndex)=><section className="life-chapter" id={`chapter-${chapterIndex+1}`} key={chapter.title}><header><p className="kicker">CHAPTER {String(chapterIndex+1).padStart(2,"0")} · {chapter.label}</p><h2>{chapter.title}</h2><p>{chapter.intro}</p></header><div className="life-moments">{chapter.moments.map((moment,i)=><article key={moment[0]}><span>{String(i+1).padStart(2,"0")}</span><div><h3>{moment[0]}</h3><p>{moment[1]}</p></div></article>)}</div></section>)}
      <aside className="biography-source"><p className="kicker">EXPLORE THE PHOTOGRAPHIC EXHIBITION</p><p>This chronological adaptation is based on the official Sri Aurobindo Ashram photographic life sketch. The original exhibition contains historical photographs, primary-source passages and detailed references.</p><a className="button primary" href="https://www.sriaurobindoashram.org/exhibitions/a-life-sketch/page01.html" target="_blank" rel="noreferrer">View the official exhibition ↗</a></aside>
    </main>
    <footer className="detail-footer"><a href="/sri-aurobindo">← Return to Sri Aurobindo</a><small>Towards a Life Divine</small></footer>
  </div>;
}
