import Image from "next/image";
import Link from "next/link";
import { CosmicRhythmExplorer, LifeTimelineExplorer, PersonalPathFinder } from "./next-human-explorer";

const waysOfKnowing = [
  ["इतिहास", "जो हुआ, उसे उसके समय और प्रमाण के साथ समझना।"],
  ["विज्ञान", "जिसे जाँचा जा सकता है, उसे जाँच और संशोधन के लिए खुला रखना।"],
  ["अन्तर-अनुभव", "ध्यान, स्व-अवलोकन और जीवन-प्रयोग से अपने भीतर देखना।"],
  ["कथा और काव्य", "Savitri जैसे ग्रन्थों में मनुष्य के भय, प्रेम और सम्भावना को पहचानना।"],
];

const lifeStages = [
  ["20–35", "भविष्य", "AI के समय में मेरी जगह और मेरे रिश्तों की दिशा क्या है?"],
  ["35–50", "सन्तुलन", "काम, बच्चे, माता-पिता—और इन सबके बीच मैं कहाँ हूँ?"],
  ["50–65", "अगला अध्याय", "स्वास्थ्य, अनुभव और विरासत को अर्थपूर्ण कैसे बनाऊँ?"],
  ["65+", "पूर्णता", "बदलती दुनिया में सहज, प्रासंगिक और मृत्यु के प्रति निर्भय कैसे रहूँ?"],
];

export function NextHumanConcept() {
  return <main className="nh3-page">
    <header className="nh3-header">
      <Link href="/" className="nh3-brand" aria-label="Sri Aurobindo Society Lucknow home"><Image src="/next-human/sri-aurobindo-symbol.png" alt="" width={36} height={36} unoptimized /><span><strong>NEXT HUMAN</strong><small>मनुष्य की अगली सम्भावना</small></span></Link>
      <nav aria-label="Universal website navigation"><Link href="/">Home</Link><Link href="/bharat-uday">Bharat Uday</Link><a href="#questions">आपके प्रश्न</a><a href="#journeys">जीवन-यात्राएँ</a><Link href="/next-human-quiz">Quiz</Link><Link href="/member/next-human-books">My Books</Link></nav>
    </header>

    <section className="nh3-hero">
      <Image className="nh3-hero-image" src="/next-human/human-possibility-generations-v5.png" alt="Four generations looking toward a shared horizon of human possibility" fill priority unoptimized />
      <div className="nh3-hero-shade" />
      <div className="nh3-hero-copy"><p className="nh3-eyebrow">चार पीढ़ियाँ · एक बदलती दुनिया · एक साझा खोज</p><h1>आपके प्रश्न बदल रहे हैं।<br/><span>क्या मनुष्य भी बदल सकता है?</span></h1><p className="nh3-lead">AI, परिवार, स्वास्थ्य, पहचान, अध्यात्म और मृत्यु—NEXT HUMAN इन प्रश्नों का तैयार उत्तर नहीं बेचता। यह आपको उन्हें स्पष्टता, प्रमाण और अपने अनुभव की रोशनी में समझने का रास्ता देता है।</p><p className="nh3-english">The Human Possibility · मनुष्य की अगली सम्भावना</p><div className="nh3-actions"><a href="#questions">अपना प्रश्न चुनें</a><a href="#journeys">जीवन की यात्राएँ देखें</a></div></div>
      <aside className="nh3-now"><span>आज आपके भीतर क्या जीवित है?</span><p>AI का भय</p><p>रिश्तों की उलझन</p><p>शरीर और उम्र</p><p>जीवन का अर्थ</p></aside>
    </section>

    <section className="nh3-generations" aria-label="Questions across four life stages"><header><p className="nh3-eyebrow">यह यात्रा किसके लिए है?</p><h2>उम्र बदलती है। प्रश्न बदलते हैं।<br/>खोज वही रहती है—मैं कैसे जिऊँ?</h2></header><div>{lifeStages.map(([age, title, question]) => <a href="#questions" key={age}><span>{age}</span><strong>{title}</strong><p>{question}</p><i>अपनी दिशा खोजें →</i></a>)}</div></section>

    <section className="nh3-definition"><div><p className="nh3-eyebrow">सीधी-सी बात</p><h2>जानकारी बहुत है। पर अपने जीवन के लिए सही बात पहचानें कैसे?</h2></div><div className="nh3-definition-copy"><p>यहाँ विज्ञान को विज्ञान की तरह, इतिहास को प्रमाण के साथ, और आध्यात्मिक अनुभव को उसके सही सन्दर्भ में रखा जाता है—ताकि श्रद्धा अन्धी न हो और तर्क हृदयहीन न बने।</p><p><strong>अगला मनुष्य कोई चमत्कारी प्रजाति नहीं। वह हममें जागती हुई अधिक स्पष्ट, करुणामय और सचेत सम्भावना है।</strong></p></div></section>

    <section className="nh3-questions" id="questions"><header><p className="nh3-eyebrow">START WHERE YOU ARE</p><h2>आज आप किस बात को<br/>समझना चाहते हैं?</h2><p>एक विषय चुनिए। पेज उसी क्षण बताएगा कि यह खोज आपके लिए क्या खोल सकती है और आप यहाँ से क्या लेकर जाएँगे।</p></header><PersonalPathFinder /></section>

    <section className="nh3-method" id="method"><div className="nh3-method-title"><p className="nh3-eyebrow">FROM QUESTION TO POSSIBILITY</p><h2>उत्तर बाहर से थोपना नहीं।<br/>भीतर से उभरने देना।</h2></div><ol><li><b>01</b><div><strong>रुकें · Pause</strong><p>प्रतिक्रिया से पहले प्रश्न को साफ़ सुनें।</p></div></li><li><b>02</b><div><strong>देखें · Observe</strong><p>मन, शरीर, समाज और इतिहास—सभी स्रोत पहचानें।</p></div></li><li><b>03</b><div><strong>परखें · Discern</strong><p>तथ्य, विश्वास, अनुभव और कल्पना में फर्क रखें।</p></div></li><li><b>04</b><div><strong>जीएँ · Embody</strong><p>एक छोटा सच अपने व्यवहार में उतारें।</p></div></li></ol></section>

    <section className="nh3-rhythm"><header><p className="nh3-eyebrow">THE COSMIC RHYTHM LAB</p><h2>धुरी। गति। लय।<br/>और उनके बीच मनुष्य।</h2><p>एक ही दृश्य को तीन अलग दृष्टियों से देखिए—विज्ञान, प्रतीक और जीवित अनुभव।</p></header><CosmicRhythmExplorer /></section>

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
