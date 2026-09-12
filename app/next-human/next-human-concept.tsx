import Image from "next/image";
import Link from "next/link";
import { LifeTimelineExplorer, PersonalPathFinder } from "./next-human-explorer";

const waysOfKnowing = [
  ["इतिहास", "जो हुआ, उसे उसके समय और प्रमाण के साथ समझना।"],
  ["विज्ञान", "जिसे जाँचा जा सकता है, उसे जाँच और संशोधन के लिए खुला रखना।"],
  ["अन्तर-अनुभव", "ध्यान, स्व-अवलोकन और जीवन-प्रयोग से अपने भीतर देखना।"],
  ["कथा और काव्य", "Savitri जैसे ग्रन्थों में मनुष्य के भय, प्रेम और सम्भावना को पहचानना।"],
];

export function NextHumanConcept() {
  return <main className="nh3-page">
    <header className="nh3-header">
      <Link href="/" className="nh3-brand" aria-label="Sri Aurobindo Society Lucknow home"><Image src="/next-human/sri-aurobindo-symbol.png" alt="" width={36} height={36} unoptimized /><span><strong>NEXT HUMAN</strong><small>मनुष्य की अगली सम्भावना</small></span></Link>
      <nav aria-label="Universal website navigation"><Link href="/">Home</Link><Link href="/bharat-uday">Bharat Uday</Link><a href="#questions">आपके प्रश्न</a><a href="#journeys">जीवन-यात्राएँ</a><Link href="/next-human-quiz">Quiz</Link><Link href="/member/next-human-books">My Books</Link></nav>
    </header>

    <section className="nh3-hero">
      <Image className="nh3-hero-image" src="/next-human/future-horizon-hero-v3.png" alt="Indian generations looking towards a luminous future horizon" fill priority unoptimized />
      <div className="nh3-hero-shade" />
      <div className="nh3-hero-copy"><p className="nh3-eyebrow">A LIVING INQUIRY INTO HUMAN POSSIBILITY</p><h1>भविष्य केवल आता नहीं।<br/><span>मनुष्य उसे जन्म देता है।</span></h1><p className="nh3-lead">NEXT HUMAN यह खोज है कि तेज़ होती बुद्धि के साथ हमारी चेतना, करुणा और भीतर की स्वतंत्रता भी कैसे विकसित हो।</p><p className="nh3-english">Not an escape from today—a way to meet today so deeply that a different tomorrow becomes possible.</p><div className="nh3-actions"><a href="#questions">अपने प्रश्न से शुरू करें</a><Link href="/member/next-human-books">Books देखें</Link></div></div>
      <aside className="nh3-now"><span>आज आपके भीतर क्या जीवित है?</span><p>AI का भय</p><p>रिश्तों की उलझन</p><p>शरीर और उम्र</p><p>जीवन का अर्थ</p></aside>
    </section>

    <section className="nh3-definition"><div><p className="nh3-eyebrow">THE IDEA, SIMPLY</p><h2>Next Human कोई नया धर्म या तैयार आदर्श नहीं है।</h2></div><div className="nh3-definition-copy"><p>यह अपने आज के प्रश्न को ईमानदारी से देखने, उसके स्रोत को समझने और अपने जीवन में एक अधिक जागरूक उत्तर खोजने की प्रक्रिया है।</p><p><strong>अगला मनुष्य वह है जो केवल अधिक जानता नहीं—अधिक सचेत होकर जीता है।</strong></p></div></section>

    <section className="nh3-questions" id="questions"><header><p className="nh3-eyebrow">START WHERE YOU ARE</p><h2>आज आप किस बात को<br/>समझना चाहते हैं?</h2><p>एक विषय चुनिए। पेज उसी क्षण बताएगा कि यह खोज आपके लिए क्या खोल सकती है और आप यहाँ से क्या लेकर जाएँगे।</p></header><PersonalPathFinder /></section>

    <section className="nh3-method" id="method"><div className="nh3-method-title"><p className="nh3-eyebrow">FROM QUESTION TO POSSIBILITY</p><h2>उत्तर बाहर से थोपना नहीं।<br/>भीतर से उभरने देना।</h2></div><ol><li><b>01</b><div><strong>रुकें · Pause</strong><p>प्रतिक्रिया से पहले प्रश्न को साफ़ सुनें।</p></div></li><li><b>02</b><div><strong>देखें · Observe</strong><p>मन, शरीर, समाज और इतिहास—सभी स्रोत पहचानें।</p></div></li><li><b>03</b><div><strong>परखें · Discern</strong><p>तथ्य, विश्वास, अनुभव और कल्पना में फर्क रखें।</p></div></li><li><b>04</b><div><strong>जीएँ · Embody</strong><p>एक छोटा सच अपने व्यवहार में उतारें।</p></div></li></ol></section>

    <section className="nh3-journeys" id="journeys"><header><p className="nh3-eyebrow">INTERACTIVE LIFE JOURNEYS</p><h2>किसी महान जीवन को<br/>तारीखों में नहीं—मोड़ों में पढ़िए।</h2></header><LifeTimelineExplorer /><article className="nh3-savitri"><div><span>SAVITRI · A POETIC DOOR</span><h3>जब प्रेम मृत्यु से पूछता है—क्या यही अन्तिम सीमा है?</h3><p>सावित्री और अश्वपति की यात्रा चमत्कार सिद्ध करने के लिए नहीं, मनुष्य के भय, नियति और चेतना की सम्भावना को विशाल दृष्टि से देखने के लिए यहाँ है।</p><Link href="/member/next-human-books?book=one">Book One में प्रवेश करें <i>→</i></Link></div></article></section>

    <section className="nh3-discernment"><header><p className="nh3-eyebrow">श्रद्धा भी · विवेक भी</p><h2>हर बात को उसकी सही रोशनी में पढ़ें।</h2></header><div>{waysOfKnowing.map(([title, body], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>

    <section className="nh3-books" id="books"><header><p className="nh3-eyebrow">THE BOOKS</p><h2>जिज्ञासा से यात्रा तक</h2><p>वेबपेज प्रश्न खोलता है। पुस्तकें कथा, सन्दर्भ और जीवन-अभ्यास के साथ उस प्रश्न में गहराई तक ले जाती हैं।</p></header><div className="nh3-book-grid">
      <article><div className="nh3-cover"><small>NEXT HUMAN</small><b>0</b><strong>BOOK ZERO</strong></div><div><span>FREE · हिन्दी + ENGLISH</span><h3>मनुष्य को फिर से देखना</h3><p>हम आज जिसे “सामान्य मनुष्य” कहते हैं, क्या वही हमारी अन्तिम सम्भावना है?</p><Link href="/member/next-human-books?book=zero">निःशुल्क पढ़ें <i>→</i></Link></div></article>
      <article><div className="nh3-cover nh3-cover-one"><small>NEXT HUMAN</small><b>I</b><strong>BOOK ONE</strong></div><div><span>₹299 · हिन्दी + ENGLISH</span><h3>शरीर की सरहद पर</h3><p>चेतना, शरीर, मृत्यु और रूपान्तरण की कथा—तथ्य और आध्यात्मिक दावे का फर्क स्पष्ट रखते हुए।</p><Link href="/member/next-human-books?book=one">दोनों भाषाएँ पाएँ · ₹299 <i>→</i></Link></div></article>
    </div></section>

    <section className="nh3-close"><p>THE FUTURE BEGINS AS AN INNER MOVEMENT</p><h2>एक बेहतर दुनिया की शुरुआत<br/>एक अधिक सचेत मनुष्य से होती है।</h2><div><Link href="/next-human-quiz">The Next Human Quiz</Link><Link href="/member/next-human-books">My Books</Link></div></section>
    <footer className="nh3-footer"><span><strong>NEXT HUMAN</strong><small>Sri Aurobindo Society · Lucknow</small></span><p>प्रश्न · विवेक · अभ्यास · रूपान्तरण</p></footer>
  </main>;
}
