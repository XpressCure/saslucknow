"use client";

import { useState } from "react";
import Link from "next/link";

const paths = [
  { id: "future", label: "काम और भविष्य", prompt: "AI के बाद मेरी जगह क्या होगी?", get: ["अपने वास्तविक भय को नाम देने की स्पष्टता", "काम और पहचान को अलग देखने का नया सन्दर्भ", "अगले 7 दिनों का एक छोटा जीवन-प्रयोग"], next: "Future & Work", book: "Book Zero से शुरू करें" },
  { id: "family", label: "रिश्ते और परिवार", prompt: "सबको सँभालते हुए मैं कहाँ हूँ?", get: ["भूमिकाओं और अपने सत्य के बीच फर्क", "पीढ़ियों के तनाव को समझने की भाषा", "एक कठिन संवाद के लिए शान्त शुरुआत"], next: "Family & Relationship", book: "Book Zero से शुरू करें" },
  { id: "health", label: "शरीर और उम्र", prompt: "लम्बा ही नहीं, जीवित कैसे रहूँ?", get: ["स्वास्थ्य, भय और पहचान को अलग देखना", "उम्र को क्षय नहीं, नयी भूमिका की तरह पढ़ना", "शरीर के साथ एक सचेत दैनिक अभ्यास"], next: "Body & Longevity", book: "Book One की झलक देखें" },
  { id: "meaning", label: "अर्थ और मृत्यु", prompt: "मेरे जीवन की दिशा और सीमा क्या है?", get: ["मृत्यु के प्रश्न के साथ बिना सनसनी बैठना", "दर्शन, विज्ञान और आध्यात्मिक अनुभव का स्पष्ट फर्क", "Savitri और जीवन-यात्राओं से गहरी पड़ताल"], next: "Meaning & Mortality", book: "Book One की यात्रा खोलें" },
];

const people = [
  { id: "auro", name: "Sri Aurobindo", question: "क्या संकट चेतना की नई दिशा खोल सकता है?", source: "https://www.sriaurobindoashram.org/sriaurobindo/", events: [
    ["1872", "एक जीवन आरम्भ", "Calcutta में जन्म; शिक्षा और भारत-वापसी ने पूर्व और पश्चिम के बीच एक जीवित प्रश्न बनाया।"],
    ["1893", "भारत वापसी", "Baroda में सेवा, भारतीय भाषाओं-संस्कृति का अध्ययन और भीतर जागती राष्ट्रीय चेतना।"],
    ["1908–09", "Alipore", "कारावास और गहरे आध्यात्मिक अनुभवों ने राजनीतिक जीवन की दिशा बदल दी।"],
    ["1910", "Pondicherry", "बाहरी राजनीति से हटकर चेतना और Integral Yoga की दीर्घ खोज।"],
    ["1926", "एक नया चरण", "Ashram परम्परा में Siddhi Day; सामूहिक साधना की जिम्मेदारी The Mother ने सँभाली।"],
  ]},
  { id: "vivek", name: "Swami Vivekananda", question: "भीतर का संशय विश्व के लिए साहस कैसे बनता है?", source: "https://belurmath.org/swami-vivekananda/", events: [
    ["1881", "Ramakrishna से मिलन", "एक युवा संशयवादी का प्रश्न: क्या ईश्वर को वास्तव में जाना जा सकता है?"],
    ["1886", "संन्यास और भारत-यात्रा", "गुरु के देहान्त के बाद त्याग, भ्रमण और भारत की पीड़ा से सीधा साक्षात्कार।"],
    ["1893", "Chicago", "विश्व धर्म संसद में सह-अस्तित्व और मानव गरिमा की आत्मविश्वासपूर्ण भारतीय वाणी।"],
    ["1897", "सेवा का संगठन", "Ramakrishna Mission—अन्तर-साधना को मानव-सेवा से जोड़ने का प्रयास।"],
    ["1902", "अन्तिम दिन", "Belur Math के आधिकारिक जीवन-वृत्त के अनुसार 4 July की रात उनका अन्त शान्तिपूर्वक हुआ।"],
  ]},
  { id: "mother", name: "The Mother", question: "क्या भीतर का परिवर्तन शरीर और सामूहिक जीवन तक उतर सकता है?", source: "https://www.sriaurobindoashram.org/mother/on_herself.php", events: [
    ["1878", "Paris", "Mirra Alfassa का जन्म; कला, शिक्षा और अन्तर-अनुभवों की आरम्भिक खोज।"],
    ["1914", "पहली Pondicherry यात्रा", "Sri Aurobindo से मिलन और Arya के प्रकाशन में सहभागिता।"],
    ["1920", "स्थायी वापसी", "Pondicherry लौटकर सामूहिक साधना और जीवन के संगठन में सक्रिय भूमिका।"],
    ["1926", "Ashram की जिम्मेदारी", "समुदाय के दैनिक और आध्यात्मिक जीवन को आकार देने का नया चरण।"],
    ["1956", "Supramental manifestation", "29 February का उनका दर्ज आध्यात्मिक अनुभव—एक महत्त्वपूर्ण दावा, जिसे उसी श्रेणी में विवेक से पढ़ना चाहिए।"],
  ]},
];

export function PersonalPathFinder() {
  const [active, setActive] = useState(paths[0]);
  return <div className="nh3-pathfinder">
    <div className="nh3-path-tabs" role="tablist" aria-label="Choose the question closest to you">{paths.map(path => <button key={path.id} type="button" role="tab" aria-selected={active.id === path.id} onClick={() => setActive(path)}>{path.label}</button>)}</div>
    <div className="nh3-path-result" role="tabpanel"><div><span>आपका प्रवेश-द्वार · {active.next}</span><h3>{active.prompt}</h3><p>यहाँ आपको उपदेश या तुरन्त समाधान नहीं मिलेगा। आपको अपने प्रश्न को समझने की भाषा, भरोसेमन्द सन्दर्भ और जीवन में परखने योग्य अगला कदम मिलेगा।</p></div><div><strong>आप यहाँ से क्या लेकर जाएँगे?</strong><ul>{active.get.map(item => <li key={item}>{item}</li>)}</ul><Link href="/member/next-human-books">{active.book} <i>→</i></Link></div></div>
  </div>;
}

export function LifeTimelineExplorer() {
  const [active, setActive] = useState(people[0]);
  const [eventIndex, setEventIndex] = useState(0);
  const choose = (person: typeof people[number]) => { setActive(person); setEventIndex(0); };
  const event = active.events[eventIndex];
  return <div className="nh3-timeline-explorer">
    <div className="nh3-person-tabs" role="tablist" aria-label="Choose a life journey">{people.map(person => <button key={person.id} type="button" role="tab" aria-selected={active.id === person.id} onClick={() => choose(person)}>{person.name}</button>)}</div>
    <div className="nh3-timeline-question"><span>इस जीवन से आज का प्रश्न</span><h3>{active.question}</h3></div>
    <div className="nh3-timeline" role="tabpanel"><div className="nh3-timeline-track">{active.events.map((item, index) => <button key={item[0]} type="button" className={eventIndex === index ? "active" : ""} onClick={() => setEventIndex(index)} aria-label={`${item[0]} ${item[1]}`}><i/><b>{item[0]}</b><span>{item[1]}</span></button>)}</div><div className="nh3-event-card"><span>{event[0]}</span><h4>{event[1]}</h4><p>{event[2]}</p><a href={active.source} target="_blank" rel="noreferrer">प्रामाणिक स्रोत देखें ↗</a></div></div>
    <p className="nh3-timeline-note"><strong>कैसे पढ़ें:</strong> तारीख और घटना इतिहास हैं; उनके अन्तर-अनुभव उनके अपने आध्यात्मिक विवरण हैं। हम दोनों को मिलाते नहीं—दोनों से ईमानदार प्रश्न करते हैं।</p>
  </div>;
}

const rhythmLenses = [
  { id: "axis", label: "Axis · धुरी", title: "धुरी गति को दिशा देती है।", body: "पृथ्वी अपने rotation axis पर घूमती है और सूर्य की परिक्रमा करती है। 90° हमें दिशाओं और परस्पर लम्बवत आयामों को समझने की गणितीय भाषा देता है।", note: "यह भौतिक विज्ञान का क्षेत्र है: मापन, मॉडल और परीक्षण।" },
  { id: "symbol", label: "Symbol · प्रतीक", title: "क्या रूप किसी गहरे सम्बन्ध की याद दिला सकता है?", body: "Shivling में 90° या axis को ब्रह्माण्डीय शक्ति का संकेत मानना एक प्रतीकात्मक व्याख्या है। यह अर्थपूर्ण inquiry हो सकती है, पर अपने-आप में वैज्ञानिक प्रमाण नहीं।", note: "यह दर्शन और सांस्कृतिक व्याख्या का क्षेत्र है।" },
  { id: "rhythm", label: "Rhythm · लय", title: "वृत्त में हर गति का सम्बन्ध एक केन्द्र से है।", body: "Ras Leela की वृत्ताकार लय हमें केन्द्र, सम्बन्ध और अनेकता में एकता पर विचार करने देती है। विज्ञान में rhythm और periodicity मापे जाते हैं; यहाँ नृत्य एक जीवित रूपक भी है।", note: "यह कला, अनुभव और विज्ञान के बीच संवाद का क्षेत्र है।" },
];

export function CosmicRhythmExplorer() {
  const [active, setActive] = useState(rhythmLenses[0]);
  return <div className="nh3-rhythm-lab">
    <div className="nh3-orbit-visual" aria-hidden="true"><div className="nh3-axis-v"/><div className="nh3-axis-h"/><div className="nh3-orbit orbit-one"/><div className="nh3-orbit orbit-two"/><div className="nh3-core">90°</div></div>
    <div className="nh3-rhythm-content"><div className="nh3-rhythm-tabs" role="tablist" aria-label="Explore three lenses">{rhythmLenses.map(lens => <button key={lens.id} type="button" role="tab" aria-selected={lens.id === active.id} onClick={() => setActive(lens)}>{lens.label}</button>)}</div><div role="tabpanel"><h3>{active.title}</h3><p>{active.body}</p><small>{active.note}</small></div></div>
  </div>;
}
