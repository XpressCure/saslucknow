import Image from "next/image";
import Link from "next/link";

const ageQuestions = [
  { age: "20–35", title: "मैं किस भविष्य की तैयारी कर रहा हूँ?", english: "Work, love, identity and the age of AI", questions: ["क्या AI मेरा काम बदल देगा—और मुझे क्या सीखना चाहिए?", "क्या विवाह मेरे लिए है?", "संतुलित रहते-रहते क्या मैं खुद को खो रहा हूँ?", "मेरे बच्चे किस तरह की शिक्षा और संस्कार चाहते हैं?"] },
  { age: "35–50", title: "इतना बना लिया—अब किस दिशा में जाऊँ?", english: "Responsibility, family and the unlived life", questions: ["काम, बच्चों और बुज़ुर्ग माता-पिता के बीच मैं कहाँ हूँ?", "बेटियों की स्वतंत्रता और सुरक्षा—दोनों कैसे सम्भव हों?", "क्या मेरा जीवन केवल बनाए रखने के लिए है?", "मेरी अपनी अधूरी यात्रा किस ओर बुलाती है?"] },
  { age: "50–65", title: "मेरे अनुभव का अगला उपयोग क्या है?", english: "Health, legacy and a second youth", questions: ["लम्बी आयु के साथ जीवंतता कैसे बचे?", "परम्परा को थोपे बिना आगे कैसे पहुँचाएँ?", "जो अवसर छूट गए, उनसे अब क्या सीखा जा सकता है?", "मेरा अनुभव नई पीढ़ी के काम कैसे आए?"] },
  { age: "65+", title: "बदलती दुनिया में गरिमा से कैसे जियूँ?", english: "Relevance, illness, change and mortality", questions: ["बीमारी को जीवन की पूरी पहचान बनने से कैसे रोकूँ?", "नई भाषा, भोजन, मीडिया और तकनीक से रिश्ता कैसे बनाऊँ?", "युवा पीढ़ी के निकट भी रहूँ और स्वयं भी बना रहूँ—कैसे?", "मृत्यु की तैयारी भय से नहीं, समझ से कैसे हो?"] },
];

const inquirySteps = [
  ["01", "पहचानें · Notice", "उस प्रश्न को साफ़ शब्द दें जो भीतर शोर कर रहा है।"],
  ["02", "समझें · Examine", "उसके मनोवैज्ञानिक, सामाजिक, ऐतिहासिक और शारीरिक स्रोत देखें।"],
  ["03", "परखें · Test", "विज्ञान, जीवन-अनुभव, दर्शन और आध्यात्मिक विवरण को उनकी सही श्रेणी में रखकर जाँचें।"],
  ["04", "जीएँ · Practice", "एक छोटा, ईमानदार प्रयोग अपने जीवन में उतारें—बिना तैयार उत्तर माने।"],
];

export function NextHumanConcept() {
  return <main className="nh2-page">
    <header className="nh2-header">
      <Link href="/" className="nh2-brand" aria-label="Sri Aurobindo Society Lucknow home"><Image src="/next-human/sri-aurobindo-symbol.png" alt="Sri Aurobindo symbol" width={40} height={40} unoptimized /><span><strong>NEXT HUMAN</strong><small>एक जीवित जिज्ञासा · A living inquiry</small></span></Link>
      <nav aria-label="NEXT HUMAN navigation"><a href="#questions">आपके प्रश्न</a><a href="#journeys">जीवन-यात्राएँ</a><a href="#books">Books</a><Link href="/next-human-quiz">The Next Human Quiz</Link><Link href="/member/next-human-books">My Books</Link></nav>
    </header>

    <section className="nh2-hero">
      <Image className="nh2-hero-image" src="/next-human/life-questions-hero-v2.png" alt="Different generations of an Indian family thinking, learning and living together" fill priority unoptimized />
      <div className="nh2-hero-wash" />
      <div className="nh2-hero-copy"><p className="nh2-kicker">NEXT HUMAN · आज के जीवन से शुरू होने वाली खोज</p><h1>आपके जीवन का<br/><em>अगला प्रश्न</em> क्या है?</h1><p>AI के बाद काम कैसा होगा? विवाह करना चाहिए? बच्चों को क्या सिखाएँ? स्वास्थ्य, अकेलापन और मृत्यु से कैसे मिलें? NEXT HUMAN बड़े शब्दों से नहीं—आपके असली प्रश्न से शुरू होता है।</p><span>Not a sermon. Not a ready-made answer. A place to understand what is asking to change.</span><div className="nh2-actions"><a href="#questions">अपना प्रश्न पहचानें</a><Link href="/member/next-human-books">पुस्तकें खोलें · Open the books</Link></div></div>
    </section>

    <section className="nh2-intro"><p className="nh2-kicker">सीधी-सी बात · THE SIMPLE IDEA</p><h2>मनुष्य बदलती दुनिया में केवल टिके नहीं—वह अधिक सजग, स्वतंत्र और करुणामय होकर जीना सीखे।</h2><div><p>हर उम्र अपने प्रश्न लेकर आती है। अक्सर हम उत्तर खोजने से पहले ही डर, सलाह, सोशल मीडिया या परम्परा के शोर में फँस जाते हैं।</p><p>NEXT HUMAN पहले प्रश्न को शान्त करता है। फिर देखता है—यह प्रश्न आया कहाँ से, दुनिया ने इससे कैसे जूझा, और मेरे जीवन में अगला ईमानदार कदम क्या हो सकता है?</p></div></section>

    <section className="nh2-questions" id="questions"><header><p className="nh2-kicker">हर उम्र की अपनी दहलीज़</p><h2>शायद आपका प्रश्न<br/>यहाँ पहले से मौजूद है।</h2><p>इनमें से किसी एक प्रश्न से प्रवेश कीजिए। आपको किसी विचारधारा, धर्म या निष्कर्ष को पहले से स्वीकार करने की आवश्यकता नहीं है।</p></header><div className="nh2-age-grid">{ageQuestions.map(group => <article key={group.age}><div><b>{group.age}</b><span>वर्ष · YEARS</span></div><h3>{group.title}</h3><small>{group.english}</small><ul>{group.questions.map(question => <li key={question}>{question}</li>)}</ul></article>)}</div></section>

    <section className="nh2-method"><header><p className="nh2-kicker">जिज्ञासा से जीवन तक</p><h2>हम उत्तर बाँटते नहीं।<br/>हम देखने की क्षमता बनाते हैं।</h2></header><div className="nh2-method-grid">{inquirySteps.map(([number, title, body]) => <article key={number}><b>{number}</b><h3>{title}</h3><p>{body}</p></article>)}</div><p className="nh2-evidence-note"><strong>हम फर्क साफ़ रखते हैं:</strong> ऐतिहासिक तथ्य, वैज्ञानिक प्रमाण, निजी अनुभव, दार्शनिक व्याख्या और आध्यात्मिक दावा—सभी उपयोगी हो सकते हैं, पर सभी एक ही प्रकार के प्रमाण नहीं हैं।</p></section>

    <section className="nh2-journeys" id="journeys"><header><p className="nh2-kicker">आज के प्रश्न · पुरानी यात्राएँ</p><h2>ये महापुरुष उत्तर नहीं—<br/>जाँचने योग्य जीवन-प्रयोग हैं।</h2><p>हम श्रद्धा और प्रश्न—दोनों साथ रखते हैं: उनके जीवन में ऐसा क्या हुआ जो आज के मनुष्य की उलझन को नया प्रकाश दे सकता है?</p></header><div className="nh2-bridge" aria-label="A bridge from historical moments to present questions"><div><b>1893</b><span>Chicago</span><p>मेरी आवाज़ दुनिया के सामने किस सत्य के लिए खड़ी है?</p></div><div><b>1908–10</b><span>Alipore → Pondicherry</span><p>क्या संकट मेरे जीवन की दिशा भी बदल सकता है?</p></div><div><b>1926</b><span>एक सामूहिक प्रयोग</span><p>क्या भीतर का परिवर्तन मिलकर जिया जा सकता है?</p></div><div><b>1956–73</b><span>चेतना और शरीर</span><p>आध्यात्मिक अनुभव के दावों को हम कैसे समझें और परखें?</p></div></div><div className="nh2-story-grid">
      <article className="nh2-story nh2-vivekananda"><div className="nh2-story-number">1893</div><div><p>युवा बेचैनी से सार्वजनिक साहस तक</p><h3>विवेकानन्द ने Chicago में वास्तव में क्या कहा?</h3><span>एक संशयग्रस्त युवा नरेंद्रनाथ कैसे ऐसे वक्ता बने जिसने धार्मिक सह-अस्तित्व, मनुष्य की गरिमा और भारत की आत्मविश्वासपूर्ण आवाज़ को विश्व-मंच पर रखा?</span><a href="https://belurmath.org/swami-vivekananda/" target="_blank" rel="noreferrer">प्रामाणिक जीवन-वृत्त पढ़ें ↗</a></div></article>
      <article className="nh2-story"><Image src="/sri-aurobindo-portrait.jpg" alt="Sri Aurobindo" width={360} height={470} unoptimized/><div><p>क्रान्तिकारी से चेतना के अन्वेषक तक</p><h3>Alipore की एकान्त कोठरी ने दिशा कैसे बदली?</h3><span>1908–09 की कैद, 1910 में Pondicherry और आगे का Integral Yoga—क्या बाहरी संकट कभी भीतर की नई दिशा का द्वार बन सकता है?</span><a href="https://www.sriaurobindoashram.org/sriaurobindo/" target="_blank" rel="noreferrer">आश्रम का जीवन-वृत्त पढ़ें ↗</a></div></article>
      <article className="nh2-story"><Image src="/the-mother-portrait.jpg" alt="The Mother" width={360} height={470} unoptimized/><div><p>विचार से शरीर की प्रयोगशाला तक</p><h3>क्या चेतना का अभ्यास शरीर को भी बदल सकता है?</h3><span>श्री अरविन्द और The Mother ने परिवर्तन को केवल विश्वास नहीं, दीर्घ साधना और अवलोकन का विषय माना। उनके दावों को श्रद्धा और आलोचनात्मक विवेक—दोनों के साथ कैसे पढ़ें?</span><a href="https://www.sriaurobindoashram.org/mother/on_herself.php" target="_blank" rel="noreferrer">The Mother के अपने शब्द ↗</a></div></article>
      <article className="nh2-story nh2-savitri"><div className="nh2-story-mark">S</div><div><p>मृत्यु के सामने प्रेम और चेतना</p><h3>Savitri की कथा आज हमसे क्या पूछती है?</h3><span>सावित्री का मृत्यु से संवाद और अश्वपति की योग-यात्रा—इन्हें चमत्कार की सूचना नहीं, भय, प्रेम, नियति और मानवीय सम्भावना की विशाल काव्यात्मक पड़ताल की तरह पढ़ें।</span><Link href="/member/next-human-books">Book One में यात्रा शुरू करें →</Link></div></article>
    </div></section>

    <section className="nh2-books" id="books"><header><p className="nh2-kicker">NEXT HUMAN BOOKS</p><h2>पहले एक झलक।<br/>फिर गहरी यात्रा।</h2><p>वेबसाइट प्रश्न जगाती है। पुस्तकें कहानी, प्रमाण, अनुभव और प्रतिप्रश्न के साथ उस खोज को धीरे-धीरे खोलती हैं।</p></header><div className="nh2-book-grid">
      <article><div className="nhc-cover"><small>NEXT HUMAN</small><b>0</b><strong>BOOK ZERO</strong></div><div><span>FREE · ENGLISH + हिन्दी</span><h3>आरम्भ कहाँ से करें?</h3><p>“मनुष्य” कहते समय हम क्या मान लेते हैं—और हमारे भीतर अभी क्या अधूरा है?</p><Link href="/member/next-human-books?book=zero">Book Zero निःशुल्क पढ़ें →</Link></div></article>
      <article><div className="nhc-cover nhc-cover-one"><small>NEXT HUMAN</small><b>I</b><strong>BOOK ONE</strong></div><div><span>₹299 · BOTH LANGUAGES</span><h3>शरीर की सरहद पर</h3><p>चेतना, मृत्यु, शरीर और रूपान्तरण पर एक कथा-यात्रा—सावधानी से रखे गए प्रमाण और जीवित प्रश्नों के साथ।</p><Link className="nh2-buy" href="/member/next-human-books?book=one">दोनों संस्करण खोलें · ₹299 →</Link></div></article>
    </div></section>

    <section className="nh2-close"><p>आज आपको किस प्रश्न के साथ थोड़ा शान्त बैठना चाहिए?</p><h2>वहीं से आपका NEXT HUMAN शुरू होता है।</h2><div><Link href="/next-human-quiz">The Next Human Quiz</Link><Link href="/member/next-human-books">My Books</Link></div></section>
    <footer className="nh2-footer"><span><strong>NEXT HUMAN</strong><small>Sri Aurobindo Society · Lucknow</small></span><p>प्रश्न · प्रमाण · अनुभव · परिवर्तन</p></footer>
  </main>;
}
