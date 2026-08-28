export type BharatUdayDiscovery = {
  prompt: string;
  answer: string;
  note: string;
};

export type BharatUdayLifeQuote = {
  text: string;
  author: "Sri Aurobindo" | "The Mother";
  source?: string;
};

const bharatUdayLifeQuotes: BharatUdayLifeQuote[] = [
  { text: "All life is Yoga.", author: "Sri Aurobindo", source: "The Synthesis of Yoga" },
  { text: "The future belongs to those who want to progress.", author: "The Mother" },
  { text: "Man is a transitional being; he is not final.", author: "Sri Aurobindo", source: "CWSA Vol. 12, p. 157" },
  { text: "To know is good, to live is better, to be, that is perfection.", author: "The Mother" },
  { text: "All can be done if the god-touch is there.", author: "Sri Aurobindo", source: "Savitri" },
];

export function lifeQuoteFor(levelNumber: number) {
  const index = Math.max(0, Math.abs(levelNumber) - 1) % bharatUdayLifeQuotes.length;
  return bharatUdayLifeQuotes[index];
}

export function questionOrderFor(attemptNumber: number) {
  const shift = Math.abs(attemptNumber) % 5;
  const order = Array.from({ length: 5 }, (_, index) => (index + shift) % 5);
  return Math.floor(Math.abs(attemptNumber) / 5) % 2 ? [order[0], ...order.slice(1).reverse()] : order;
}

export function questionPromptFor(discovery: BharatUdayDiscovery, attemptNumber: number, position: number) {
  const variant = Math.abs(attemptNumber + position) % 3;
  if (variant === 0) return discovery.prompt;
  if (variant === 1) return `Which answer is most closely connected with this discovery?\n${discovery.note}`;
  return `Identify the idea described here:\n${discovery.note}`;
}

export type BharatUdayLevel = {
  number: number;
  title: string;
  realm: string;
  symbol: string;
  accent: string;
  coachFact: string;
  innerPrompt: string;
  discoveries: BharatUdayDiscovery[];
};

const level = (
  number: number,
  title: string,
  realm: string,
  symbol: string,
  accent: string,
  coachFact: string,
  innerPrompt: string,
  discoveries: Array<[string, string, string]>,
): BharatUdayLevel => ({
  number,
  title,
  realm,
  symbol,
  accent,
  coachFact,
  innerPrompt,
  discoveries: discoveries.map(([prompt, answer, note]) => ({ prompt, answer, note })),
});

export const bharatUdayLevels: BharatUdayLevel[] = [
  level(1, "The Sky Above Us", "Astronomy", "✦", "#ffb11b", "Indian sky-watchers combined careful observation with mathematics. Aryabhata even explained eclipses through shadows rather than myth.", "For one quiet minute, look upward—at the sky or simply into space—and let curiosity become larger than certainty.", [
    ["Who described Earth as rotating on its axis in the Aryabhatiya?", "Aryabhata", "Aryabhata described the apparent movement of the stars as an effect of Earth's rotation."],
    ["Which historic observatory in Jaipur uses giant stone instruments?", "Jantar Mantar", "Jantar Mantar's instruments measure time and celestial positions without electronics."],
    ["What causes a lunar eclipse?", "Earth's shadow on the Moon", "A lunar eclipse occurs when Earth comes between the Sun and Moon."],
    ["Which Indian mission made a soft landing near the Moon's south polar region?", "Chandrayaan-3", "Chandrayaan-3's Vikram lander touched down in August 2023."],
    ["Which star helps locate north in the Northern Hemisphere?", "Polaris", "Polaris appears close to the north celestial pole."],
  ]),
  level(2, "The Power of Zero", "Mathematics", "०", "#ff6b35", "Zero is more than an empty place. Indian mathematicians helped turn it into a number that could be calculated with—transforming science everywhere.", "Notice one empty space around you. Is it truly empty, or does it make everything else possible?", [
    ["Which Indian mathematician gave rules for calculating with zero?", "Brahmagupta", "Brahmagupta wrote arithmetic rules involving zero in the seventh century."],
    ["In the decimal place-value system, what does a zero in 205 show?", "No tens", "Zero preserves the position between hundreds and ones."],
    ["What is 10 raised to the power 3?", "1000", "Three powers of ten make one thousand."],
    ["Which shape has no beginning or end and often represents zero?", "Circle", "The written zero developed through several forms before the familiar circle."],
    ["What is the value of 7 × 0?", "0", "Any finite number multiplied by zero is zero."],
  ]),
  level(3, "A Science of Balance", "Ayurveda", "◉", "#11b8a5", "Ayurveda looks at daily rhythms, food, sleep and environment together. Its enduring idea is simple: health is a living balance, not merely the absence of illness.", "Pause and ask: what one small rhythm—sleep, water, movement or food—would bring greater balance to today?", [
    ["The word Ayurveda most closely means what?", "Knowledge of life", "Ayus means life and veda means knowledge."],
    ["Which daily habit supports the body's natural sleep rhythm?", "A regular sleep time", "Consistent timing helps the body's circadian rhythm."],
    ["Which sense is most directly involved when we notice aroma?", "Smell", "Odour molecules are detected by receptors in the nose."],
    ["Why is hydration important?", "It supports normal body functions", "Water supports circulation, temperature control and cellular processes."],
    ["Which is a balanced approach to wellbeing?", "Food, movement, rest and attention", "Wellbeing is supported by several connected habits rather than one quick fix."],
  ]),
  level(4, "The Intelligence of Water", "Ecology", "≈", "#22a7f0", "Stepwells, tanks, johads and bamboo drip systems show that water wisdom was always local: shaped by rainfall, soil, community and patience.", "Take one sip of water with full attention. For a moment, receive it as a shared gift of cloud, earth and human care.", [
    ["What is a baoli or vav?", "A stepwell", "Stepwells store water and allow people to reach it as levels change."],
    ["What does rainwater harvesting do?", "Collects rain for later use", "Stored rain can reduce pressure on groundwater."],
    ["Which traditional structure is associated with Rajasthan water conservation?", "Johad", "Johads are small earthen check dams that hold rainwater."],
    ["Why should leaking taps be repaired?", "To prevent avoidable water loss", "Small continuous leaks can waste substantial water."],
    ["Groundwater is mainly replenished when water does what?", "Soaks into the ground", "Infiltration allows water to recharge aquifers."],
  ]),
  level(5, "Geometry in Stone", "Architecture", "◇", "#8f63ff", "From temple plans to stepwells and jaalis, geometry in Indian architecture guides structure, climate, movement, light and meaning at once.", "Look for one pattern near you. Follow it slowly with your eyes and notice how order can create calm.", [
    ["What is a jaali in architecture?", "A perforated screen", "Jaali screens filter light and air while creating privacy."],
    ["Which geometric property helps an arch carry weight?", "Compression", "Arches transfer compressive forces toward their supports."],
    ["Why are courtyards useful in warm climates?", "They aid light and ventilation", "Courtyards can create shade and natural airflow."],
    ["A repeated balanced design around a centre shows what?", "Radial symmetry", "Radial symmetry repeats elements around a central point."],
    ["Which material forms the main structure of many ancient Indian rock-cut caves?", "Living rock", "Rock-cut spaces were carved directly into cliffs or outcrops."],
  ]),
  level(6, "Many Languages, One Conversation", "Language", "अ", "#ff4f91", "India's languages carry different sounds and scripts, yet translation has kept ideas travelling across regions for centuries.", "Listen to one word you love—in any language. Let its sound arrive before its meaning.", [
    ["Devanagari is used to write which language among these?", "Hindi", "Devanagari is used for Hindi, Marathi, Nepali, Sanskrit and others."],
    ["What is translation?", "Carrying meaning between languages", "Good translation communicates meaning, tone and context."],
    ["Which is a classical language of Tamil Nadu?", "Tamil", "Tamil has a continuous literary tradition extending over two millennia."],
    ["What does a script provide?", "A system for writing language", "A language can be written in one or more scripts."],
    ["Why are mother tongues important?", "They carry memory and belonging", "Home languages often connect people to family, place and culture."],
  ]),
  level(7, "The Science on Your Plate", "Food & Nutrition", "✺", "#ff8a00", "Fermentation, sprouting, seasonal eating and spice combinations are everyday laboratories—culture and chemistry meeting in the kitchen.", "Before your next meal, pause for one breath and recognise the chain of life and work that brought it to you.", [
    ["What process makes curd from milk?", "Fermentation", "Beneficial bacteria convert lactose and change texture and taste."],
    ["Sprouting usually increases a seed's access to what?", "Active enzymes", "Germination activates enzymes and changes nutrient availability."],
    ["Which nutrient is the body's main immediate energy source?", "Carbohydrate", "Carbohydrates are commonly broken down into glucose for energy."],
    ["Why is dietary variety useful?", "Different foods provide different nutrients", "A varied plate supports a broader nutrient intake."],
    ["Which practice reduces food waste?", "Planning portions", "Thoughtful portions and storage help prevent edible food from being discarded."],
  ]),
  level(8, "Forests of Memory", "Biodiversity", "♧", "#28b463", "Sacred groves survive because communities protected whole habitats, not just individual species. Reverence became conservation.", "Imagine one tree you know. Hold it in attention as a living community—not an object.", [
    ["What is a sacred grove?", "A community-protected patch of nature", "Sacred groves often shelter locally important biodiversity."],
    ["Biodiversity means what?", "Variety of living organisms", "It includes diversity within species, between species and across ecosystems."],
    ["Why are pollinators important?", "They help many plants reproduce", "Pollination supports wild ecosystems and food crops."],
    ["Which action best protects habitat?", "Keeping connected natural areas", "Connected habitats help species move, feed and reproduce."],
    ["An endemic species is found where?", "In a limited natural region", "Endemic species occur naturally in a particular place and nowhere else."],
  ]),
  level(9, "The Physics of Sound", "Music", "♪", "#7758d8", "A tanpura's continuous drone creates a field of reference. Music becomes both physics—vibration and resonance—and a discipline of attention.", "Close your eyes for thirty seconds. Hear the nearest sound, then the farthest, without naming either.", [
    ["Sound is produced by what?", "Vibration", "Vibrating objects disturb a medium and create sound waves."],
    ["What determines the perceived pitch of a sound?", "Frequency", "Higher frequency is generally heard as higher pitch."],
    ["What is resonance?", "A strong response at a matching frequency", "Resonance increases vibration when frequencies align."],
    ["Which instrument provides a sustained drone in Indian classical music?", "Tanpura", "The tanpura establishes a rich tonal reference."],
    ["Can ordinary sound travel through a perfect vacuum?", "No", "Mechanical sound needs a medium such as air, water or a solid."],
  ]),
  level(10, "Breath and Attention", "Yoga", "∞", "#00a5a8", "Breath is both automatic and influenceable. That makes it a quiet bridge between body, emotion and conscious attention.", "Take three natural breaths. Do not control them; simply know each breath while it is happening.", [
    ["Which muscle plays the largest role in quiet breathing?", "Diaphragm", "The diaphragm contracts and moves downward during inhalation."],
    ["Pranayama is chiefly associated with what?", "Regulation of breath and vital energy", "Pranayama uses conscious breathing disciplines."],
    ["What usually happens to breathing during calm rest?", "It becomes slower and easier", "Reduced arousal commonly slows respiration."],
    ["Mindful breathing primarily trains what?", "Attention", "Returning awareness to breath exercises steady observation."],
    ["Which is safest during a simple breathing pause?", "Comfort without strain", "Gentle awareness is preferable to forcing or prolonged retention."],
  ]),
  level(11, "Threads of Ingenuity", "Textiles", "⌁", "#e84a8a", "A handloom is a system of rhythm, mathematics, material knowledge and imagination. Every cloth records thousands of small decisions.", "Feel the fabric you are wearing. Notice texture, temperature and the unseen hands and machines behind it.", [
    ["Warp threads run in which direction on a loom?", "Lengthwise", "Warp threads are held under tension; weft crosses them."],
    ["What is khadi?", "Hand-spun, handwoven cloth", "Khadi became associated with self-reliance during India's freedom movement."],
    ["Which natural fibre comes from the cotton plant?", "Cotton", "Cotton fibres grow around the plant's seeds."],
    ["What creates an ikat pattern?", "Dyeing threads before weaving", "Resist-dyed yarns are aligned during weaving to form patterns."],
    ["Why does weaving require counting?", "Patterns depend on thread sequences", "Repeated counts control structure, colour and motif."],
  ]),
  level(12, "Metal That Remembered", "Materials Science", "⚙", "#ce6d36", "The Delhi iron pillar's corrosion resistance emerged from materials, forging and environment—not magic, but sophisticated craft knowledge.", "Think of one tool you use daily. What knowledge is silently stored in its material and shape?", [
    ["Bronze is primarily an alloy of copper and what?", "Tin", "Copper and tin together commonly form bronze."],
    ["Why is stainless steel corrosion-resistant?", "A protective chromium-rich layer", "Chromium helps create a thin passive surface film."],
    ["Wootz was a historic Indian form of what?", "High-carbon steel", "Wootz steel was traded widely and admired for its properties."],
    ["What does an alloy contain?", "Two or more elements, at least one metallic", "Alloying changes properties such as strength or corrosion resistance."],
    ["Which process shapes hot metal by hammering?", "Forging", "Forging deforms metal under compressive force."],
  ]),
  level(13, "Across the Monsoon Seas", "Navigation", "⌖", "#0077b6", "Indian Ocean sailors read seasonal winds, stars, currents and coastlines. Commerce travelled with mathematics, language, food and ideas.", "Imagine a journey guided without a screen. What signs in nature would you learn to read?", [
    ["What reverses direction seasonally over the Indian Ocean?", "Monsoon winds", "Seasonal wind patterns helped organise historic sea routes."],
    ["Latitude measures position in which direction?", "North or south of the Equator", "Lines of latitude run east-west but measure north-south position."],
    ["Which instrument shows magnetic direction?", "Compass", "A magnetic compass aligns approximately with Earth's magnetic field."],
    ["What is a coastline landmark used for navigation called?", "Terrestrial reference", "Visible landforms help sailors identify location and approach."],
    ["Why were ports centres of cultural exchange?", "People, goods and ideas met there", "Ports connected distant communities through repeated contact."],
  ]),
  level(14, "Reading the Seasons", "Agriculture", "❋", "#79a63a", "Traditional farming calendars observe rain, soil, temperature, moonlight, insects and plant behaviour. Agriculture begins with attention.", "Notice today's weather without calling it good or bad. What is the day actually telling you?", [
    ["Kharif crops are generally sown with which season?", "Monsoon", "Kharif cultivation is linked to the rainy season."],
    ["Crop rotation helps soil by doing what?", "Changing nutrient demands and pest cycles", "Alternating crops can support soil health and reduce some pests."],
    ["What is compost?", "Decomposed organic matter", "Compost returns organic material and nutrients to soil."],
    ["Why are millets valued in dry regions?", "Many need relatively less water", "Several millet crops tolerate heat and limited rainfall."],
    ["What do legumes often add to farming systems?", "Biologically fixed nitrogen", "Bacteria associated with many legumes convert atmospheric nitrogen."],
  ]),
  level(15, "Light, Colour, Vision", "Optics", "☼", "#ffbd00", "A rainbow is sunlight separated into colours; perception then turns wavelengths into experience. Seeing is an encounter between world, body and mind.", "Rest your gaze on one colour. Let it be vivid without needing to describe it.", [
    ["What separates white light into colours in a prism?", "Refraction and dispersion", "Different wavelengths bend by different amounts."],
    ["Which part of the eye controls how much light enters?", "Iris", "The iris adjusts pupil size."],
    ["Why does a mirror form an image?", "Light reflects from its surface", "Reflection redirects light according to a predictable angle."],
    ["Which colours of light combine to make white on a screen?", "Red, green and blue", "Additive colour mixing uses RGB light."],
    ["What causes a shadow?", "Light being blocked", "An opaque object prevents light reaching a region."],
  ]),
  level(16, "The Laboratory of Attention", "Consciousness", "◎", "#6f42c1", "Attention changes what becomes vivid, memorable and actionable. It is one of the most powerful technologies already within us.", "Choose one ordinary object. Give it undivided attention for sixty seconds and discover one detail you had never noticed.", [
    ["Selective attention helps us do what?", "Focus on some information over other information", "The brain prioritises signals relevant to present goals."],
    ["What commonly weakens sustained attention?", "Frequent interruption", "Repeated switching carries cognitive costs."],
    ["A short mindful pause trains which ability?", "Returning to the present", "Mindfulness notices wandering and gently returns attention."],
    ["Why is sleep important for memory?", "It supports consolidation", "Sleep helps stabilise and integrate learning."],
    ["What is metacognition?", "Awareness of one's own thinking", "Metacognition includes monitoring how we learn and decide."],
  ]),
  level(17, "A Republic of Values", "Civics", "⚖", "#2563eb", "The Constitution is not only institutional machinery. Its Preamble asks citizens to hold liberty, equality, justice and fraternity together.", "Choose one word—justice, liberty, equality or fraternity. Where could you make it more real today?", [
    ["Which words begin the Preamble of India's Constitution?", "We, the People of India", "The opening locates constitutional authority in the people."],
    ["Fundamental Rights are contained in which document?", "The Constitution of India", "Part III sets out Fundamental Rights."],
    ["Fraternity most closely means what?", "A spirit of common belonging", "Fraternity links dignity with unity."],
    ["Who chaired the Constitution's Drafting Committee?", "B. R. Ambedkar", "Dr Ambedkar chaired the committee responsible for the draft."],
    ["When did the Constitution of India come into effect?", "26 January 1950", "The date is observed as Republic Day."],
  ]),
  level(18, "Women Who Changed the Horizon", "Pioneers", "↑", "#e83e8c", "India's story of knowledge includes women who crossed barriers in education, science, public life, art and exploration—often without the recognition they deserved.", "Remember one woman whose courage widened your idea of what is possible. Hold her example with gratitude.", [
    ["Who became the first Indian woman to travel to space?", "Kalpana Chawla", "Kalpana Chawla flew on two Space Shuttle missions."],
    ["Who was one of India's earliest women physicians trained in Western medicine?", "Anandibai Joshi", "Anandibai Joshi earned a medical degree in 1886."],
    ["Who founded a pioneering girls' school in Pune with Jyotirao Phule?", "Savitribai Phule", "Savitribai was a major educator and social reformer."],
    ["Who was the first woman president of the Indian National Congress?", "Annie Besant", "Annie Besant became Congress president in 1917."],
    ["Who led the Missile Project as a prominent Indian aerospace scientist nicknamed the Missile Woman of India?", "Tessy Thomas", "Tessy Thomas held key roles in the Agni missile programme."],
  ]),
  level(19, "India Beyond Earth", "Space Science", "↗", "#00b4d8", "Space missions succeed through thousands of disciplined collaborations. The spectacular moment rests on years of patient, often invisible work.", "Think of a distant goal. What is the smallest precise action that could move you one step closer?", [
    ["What was India's first satellite?", "Aryabhata", "Aryabhata was launched in 1975."],
    ["Mangalyaan orbited which planet?", "Mars", "The Mars Orbiter Mission entered Martian orbit in 2014."],
    ["What does ISRO stand for?", "Indian Space Research Organisation", "ISRO is India's national space agency."],
    ["Why do rockets need multiple stages?", "To discard mass as fuel is used", "Staging improves the ability to reach high speed."],
    ["Aditya-L1 studies which star?", "The Sun", "Aditya-L1 observes the Sun from the Sun-Earth L1 region."],
  ]),
  level(20, "A Nation of Living Worlds", "Natural India", "⌘", "#2a9d8f", "From alpine meadows to coral reefs, India contains many living worlds. Protecting them means understanding relationships, not collecting isolated facts.", "Picture a place in nature you love. Ask what that place needs from humans in order to remain alive.", [
    ["The Western Ghats are especially known for what?", "High biodiversity and endemism", "Many Western Ghats species occur nowhere else."],
    ["Mangroves protect coasts partly by doing what?", "Reducing wave energy", "Their roots also provide habitat and trap sediment."],
    ["Coral reefs are built mainly by which organisms?", "Coral polyps", "Tiny animals create calcium carbonate structures over time."],
    ["What is a keystone species?", "A species with unusually large ecosystem influence", "Its loss can reshape the whole ecological community."],
    ["Which is India's national aquatic animal?", "Ganges river dolphin", "The freshwater dolphin is an indicator of river health."],
  ]),
  level(21, "Living with the Sun", "Energy", "☀", "#f59e0b", "Every food chain and most energy systems begin with the Sun. The future asks us to receive that abundance with greater intelligence and less waste.", "Feel warmth or light on your skin, even if only from a lamp. Remember: energy is always arriving, moving and changing form.", [
    ["Solar photovoltaic cells convert sunlight into what?", "Electricity", "Photovoltaic materials produce electric current when illuminated."],
    ["Plants store solar energy through which process?", "Photosynthesis", "Plants convert light energy into chemical energy."],
    ["Which is a renewable energy source?", "Wind", "Wind is naturally replenished by atmospheric processes."],
    ["What does energy efficiency mean?", "Using less energy for the same useful result", "Efficient systems reduce avoidable loss."],
    ["Most energy on Earth's surface ultimately comes from where?", "The Sun", "Sunlight drives climate, photosynthesis and the water cycle."],
  ]),
  level(22, "Stories That Think", "Literature", "❝", "#9c6644", "A great story is a simulation for the heart: we enter another viewpoint, face a choice and return with a larger vocabulary for life.", "Recall a story that changed one decision in your life. What truth did it make unforgettable?", [
    ["What is an epic?", "A long narrative about significant actions", "Epics often explore civilisation-scale questions through human choices."],
    ["The Mahabharata contains which philosophical dialogue?", "Bhagavad Gita", "The Gita appears within the Bhishma Parva."],
    ["What does an oral tradition depend upon?", "Performance and memory", "Oral works are transmitted through speaking, listening and repetition."],
    ["Why are metaphors powerful?", "They connect one idea through another", "Metaphor can make abstract experience vivid."],
    ["Savitri by Sri Aurobindo is based on a story from which epic?", "Mahabharata", "Sri Aurobindo transformed the Savitri-Satyavan episode into an epic of spiritual evolution."],
  ]),
  level(23, "Cities That Can Breathe", "Urban Future", "▦", "#06b6d4", "A future city is not merely smarter electronics. It is cleaner air, shorter journeys, shared spaces, living shade, dignity and time returned to people.", "Imagine your street ten years from now. What single change would make daily life more humane?", [
    ["What is urban heat island effect?", "Cities becoming warmer than nearby rural areas", "Dark surfaces and reduced vegetation contribute to extra heat."],
    ["Trees cool streets through shade and what process?", "Transpiration", "Water evaporating from leaves helps cool surrounding air."],
    ["Mixed-use neighbourhoods can reduce what?", "Long daily travel", "Homes, work and services closer together can shorten trips."],
    ["What is public transport designed to do?", "Move many people efficiently", "Shared mobility can reduce road space and emissions per passenger."],
    ["Permeable paving helps rainwater do what?", "Soak into the ground", "Permeable surfaces reduce runoff and support recharge."],
  ]),
  level(24, "Health Is Shared", "Public Health", "＋", "#ef476f", "Public health is often invisible when it succeeds: clean water, vaccination, ventilation, nutrition, prevention and trustworthy information.", "Ask gently: which healthy choice becomes easier when a whole community supports it?", [
    ["What is prevention?", "Action taken before illness or harm develops", "Prevention reduces risk rather than waiting for damage."],
    ["Why does ventilation matter indoors?", "It replaces stale air with fresh air", "Air exchange can reduce indoor pollutants and infection risk."],
    ["Vaccination trains which system?", "Immune system", "Vaccines prepare immune memory for specific threats."],
    ["Why is handwashing with soap effective?", "It removes microbes and breaks down many membranes", "Friction, water and soap work together."],
    ["Reliable health information should come from where?", "Qualified, evidence-based sources", "Health claims should be checked against credible medical guidance."],
  ]),
  level(25, "The Courage to Question", "Logic", "?", "#7c3aed", "Indian traditions of dialogue included structured debate, commentary and disagreement. A sincere question was not an enemy of wisdom—it was a doorway.", "Take one belief you hold. Ask: what evidence would deepen, refine or change my understanding?", [
    ["What is evidence?", "Information that supports or challenges a claim", "Evidence should be relevant and open to examination."],
    ["What is a logical fallacy?", "A recurring error in reasoning", "Fallacies can make weak arguments sound persuasive."],
    ["Why ask for the source of a claim?", "To judge its reliability", "Origin, method and context affect credibility."],
    ["What does correlation alone fail to prove?", "Causation", "Two things moving together does not establish that one caused the other."],
    ["A fair debate should first understand what?", "The other position accurately", "Responding to the strongest fair version avoids distortion."],
  ]),
  level(26, "Measuring the Great Rhythm", "Time", "◷", "#0ea5e9", "Calendars connect astronomy to agriculture, ritual and public life. Timekeeping is humanity learning to coordinate with cycles larger than itself.", "For one minute, stop measuring time. Simply experience change: breath, sound, light and sensation.", [
    ["A day is based primarily on what?", "Earth's rotation", "One rotation relative to the Sun defines a solar day."],
    ["A year is based primarily on what?", "Earth's orbit around the Sun", "One revolution defines the seasonal year."],
    ["A lunar month follows what?", "Moon phases", "The synodic month runs from one matching phase to the next."],
    ["Why do calendars add leap adjustments?", "Astronomical cycles do not divide evenly", "Extra days or months keep calendars aligned with seasons."],
    ["An equinox occurs when day and night are approximately what?", "Equal in length", "The Sun crosses the celestial equator near the equinoxes."],
  ]),
  level(27, "Symmetry and the Imagination", "Art", "✣", "#d946ef", "Rangoli, kolam and mandala traditions turn simple rules into endless variation. Constraint does not kill creativity; it gives creativity a field.", "Make one small mark or arrangement with complete care. Let beauty begin with attention, not scale.", [
    ["Bilateral symmetry means what?", "Two mirrored halves", "A single line can divide the form into matching sides."],
    ["What is tessellation?", "Shapes covering a surface without gaps", "Repeated tiles can fill a plane through geometric fit."],
    ["Kolam designs traditionally use what as a structural guide?", "Dot grids", "Lines loop around or connect patterned dots."],
    ["Complementary colours lie where on a colour wheel?", "Opposite each other", "Opposites create strong colour contrast."],
    ["Negative space is what?", "The space around and between forms", "Empty areas are active parts of visual composition."],
  ]),
  level(28, "One Earth, Many Selves", "Human Unity", "◌", "#14b8a6", "Human unity need not erase difference. It asks whether diversity can become a richer expression of one shared existence.", "Meet the next person you see without completing their story in advance. Allow one moment of genuine newness.", [
    ["Empathy is the ability to do what?", "Understand another's perspective or feeling", "Empathy does not require identical experience or agreement."],
    ["Cooperation works best with what?", "Shared purpose and trust", "Clear goals and reliable behaviour support collaboration."],
    ["What is prejudice?", "A judgement formed before adequate knowledge", "Prejudice applies assumptions to people or groups."],
    ["Active listening includes what?", "Attention and accurate understanding", "It listens to comprehend rather than merely to reply."],
    ["Human unity can include what?", "Real cultural diversity", "Unity can provide common ground without uniformity."],
  ]),
  level(29, "Technology with a Conscience", "Future Ethics", "⌁", "#6366f1", "The question is no longer only what technology can do. The mature question is what it should do, for whom, under whose control and at what cost.", "Before your next tap, ask: am I choosing this action, or only reacting to an invitation designed for me?", [
    ["What is an algorithm?", "A defined sequence of steps", "Algorithms solve problems or transform inputs into outputs."],
    ["Why does data privacy matter?", "Personal information can affect freedom and safety", "Collection and use of data should be transparent and controlled."],
    ["What is bias in an AI system?", "Systematic unfair distortion in outputs", "Bias may enter through data, design or use."],
    ["What does digital wellbeing include?", "Technology serving human purpose and health", "Boundaries and intentional use can protect attention."],
    ["A responsible technology decision considers whom?", "People affected, including vulnerable groups", "Impact matters beyond the immediate user or buyer."],
  ]),
  level(30, "The NEXT HUMAN", "Integration", "✺", "#ff5f6d", "The future human is not produced by information alone. Knowledge must become character, attention, courage, relationship and conscious action.", "Carry one sentence with you: The future begins wherever I become more conscious now.", [
    ["Which quality connects all 30 Next Human Challenge levels?", "Conscious curiosity", "Learning becomes transformative when curiosity and attention work together."],
    ["What turns knowledge into lived wisdom?", "Practice and reflection", "Understanding deepens when tested in life."],
    ["Which response best serves a complex future?", "Learning, cooperating and adapting consciously", "Complex problems need flexible intelligence and shared effort."],
    ["In Sri Aurobindo's vision, humanity is what kind of being?", "A transitional being", "Humanity can participate consciously in further evolution."],
    ["Where does the NEXT HUMAN challenge finally point?", "Toward a more conscious way of living", "The journey is completed not by a score, but by what awakens in action."],
  ]),
];

export const milestoneLevels = new Set([7, 15, 21, 30]);

const contextualDistractorsByLevel: Record<number, [string, string, string][]> = {
  1: [
    ["Varahamihira", "Bhaskara II", "Brahmagupta"],
    ["Ujjain Observatory", "Madras Observatory", "Vedh Shala"],
    ["The Moon's shadow on Earth", "Clouds covering the Moon", "The Moon entering the Sun's shadow"],
    ["Chandrayaan-1", "Mangalyaan", "Aditya-L1"],
    ["Sirius", "Vega", "Betelgeuse"],
  ],
  2: [
    ["Aryabhata", "Bhaskara II", "Ramanujan"],
    ["No hundreds", "No ones", "No thousands"],
    ["100", "300", "10,000"],
    ["Triangle", "Square", "Spiral"],
    ["7", "1", "Undefined"],
  ],
  3: [
    ["Science of breath", "Study of herbs", "Art of surgery"],
    ["Changing bedtime daily", "Skipping sleep on weekdays", "Using bright screens in bed"],
    ["Taste", "Hearing", "Touch"],
    ["It colours the blood", "It replaces all nutrients", "It prevents every infection"],
    ["Only supplements", "Only intense exercise", "One quick remedy"],
  ],
  4: [
    ["A hill fort", "A stone bridge", "A grain store"],
    ["Diverts all rain to roads", "Evaporates rain immediately", "Turns rain into seawater"],
    ["Zabo", "Ahar-pyne", "Bamboo drip channel"],
    ["To increase water pressure", "To warm the water", "To change water colour"],
    ["Flows straight to the sea", "Evaporates from roads", "Freezes on the surface"],
  ],
  5: [
    ["A solid stone pillar", "A roof beam", "A water channel"],
    ["Tension", "Magnetism", "Buoyancy"],
    ["They block all daylight", "They store groundwater", "They eliminate outdoor air"],
    ["Bilateral symmetry", "Translational symmetry", "Asymmetry"],
    ["Fired brick", "Cast iron", "Timber frame"],
  ],
  6: [
    ["Tamil", "Malayalam", "Gurmukhi"],
    ["Replacing meaning with sound", "Shortening every sentence", "Writing without context"],
    ["Punjabi", "Gujarati", "Marathi"],
    ["A system for measuring sound", "A list of word meanings", "A method of translating speech"],
    ["They make every language identical", "They remove regional memory", "They prevent multilingual learning"],
  ],
  7: [
    ["Distillation", "Freezing", "Filtration"],
    ["Artificial colouring", "Added salt", "Stored starch only"],
    ["Protein", "Vitamins", "Minerals"],
    ["Every food has identical nutrients", "It removes the need for water", "It guarantees unlimited energy"],
    ["Cooking excessive quantities", "Ignoring expiry dates", "Discarding leftovers immediately"],
  ],
  8: [
    ["A commercial timber plantation", "A city recreation park", "A single protected tree"],
    ["Only the number of large animals", "The age of a forest", "The amount of rainfall in a region"],
    ["They stop all seed formation", "They remove nutrients from soil", "They prevent flowers from opening"],
    ["Replacing habitat with isolated lawns", "Removing native vegetation", "Building barriers through migration routes"],
    ["On every continent naturally", "Only in captivity", "Wherever humans introduce it"],
  ],
  9: [
    ["Colour", "Temperature alone", "Stillness"],
    ["Amplitude", "Duration", "Direction"],
    ["Sound disappearing in air", "Two unrelated notes cancelling forever", "Light bending through glass"],
    ["Tabla", "Flute", "Sitar"],
    ["Yes, without any medium", "Only if it is very loud", "Only at low frequency"],
  ],
  10: [
    ["Biceps", "Hamstring", "Trapezius"],
    ["Rapid muscle growth", "Visual memory training", "Digestive chemistry"],
    ["It always stops", "It becomes sharply irregular", "It must become faster"],
    ["Physical strength only", "Perfect memory", "Speed reading"],
    ["Forcing the breath", "Holding as long as possible", "Ignoring dizziness"],
  ],
  11: [
    ["Crosswise", "Diagonally only", "In circles"],
    ["Machine-knitted synthetic fabric", "Printed silk only", "Unwoven felt"],
    ["Wool", "Silk", "Jute"],
    ["Printing after weaving", "Painting the finished cloth", "Cutting motifs into fabric"],
    ["Threads arrange themselves randomly", "Counting changes fibre chemistry", "Only the loom's weight matters"],
  ],
  12: [
    ["Zinc", "Aluminium", "Nickel"],
    ["A thick layer of paint", "A coating of wax", "A copper-rich core"],
    ["Cast bronze", "Pure aluminium", "Low-carbon iron"],
    ["Only pure metal", "Two non-metallic gases only", "A single chemical element"],
    ["Casting", "Annealing", "Electroplating"],
  ],
  13: [
    ["Ocean tides", "River currents", "Polar ice"],
    ["East or west of Greenwich", "Height above sea level", "Distance from the coast"],
    ["Sextant", "Barometer", "Hourglass"],
    ["Celestial bearing", "Magnetic declination", "Depth sounding"],
    ["They isolated travellers", "They stopped language exchange", "Only one community could enter"],
  ],
  14: [
    ["Winter", "Spring", "Autumn"],
    ["Growing the same crop continuously", "Removing all soil organisms", "Keeping nutrient demand unchanged"],
    ["Fresh mineral rock", "Synthetic pesticide", "Undecomposed plastic"],
    ["They require flooded fields", "They need constant snowfall", "They grow only under glass"],
    ["Extra sodium chloride", "Artificial pesticides", "Carbon dioxide bubbles"],
  ],
  15: [
    ["Reflection and absorption", "Magnetism and conduction", "Evaporation and condensation"],
    ["Retina", "Cornea", "Optic nerve"],
    ["Sound echoes from its surface", "The surface creates new light", "Heat passes through the glass"],
    ["Red, yellow and blue", "Cyan, magenta and yellow", "Orange, violet and green"],
    ["Light bending around a corner", "Light speeding up", "Two colours mixing"],
  ],
  16: [
    ["Notice every signal equally", "Eliminate all sensory input", "Remember information without awareness"],
    ["A quiet environment", "One clear task", "Adequate rest"],
    ["Predicting the future", "Suppressing every thought", "Increasing muscular strength"],
    ["It erases all learning", "It prevents attention", "It replaces practice entirely"],
    ["Speed of physical movement", "Knowledge of other people's thoughts", "The absence of all emotion"],
  ],
  17: [
    ["Truth Alone Triumphs", "Liberty for Every State", "Justice by the Government"],
    ["The Indian Penal Code", "The Union Budget", "The Census of India"],
    ["Competition between citizens", "Uniformity of language", "Rule by one community"],
    ["Jawaharlal Nehru", "Rajendra Prasad", "Sardar Vallabhbhai Patel"],
    ["15 August 1947", "26 November 1949", "2 October 1950"],
  ],
  18: [
    ["Sunita Williams", "Bachendri Pal", "Tessy Thomas"],
    ["Kadambini Ganguly", "Janaki Ammal", "Asima Chatterjee"],
    ["Pandita Ramabai", "Tarabai Shinde", "Ramabai Ranade"],
    ["Sarojini Naidu", "Nellie Sengupta", "Vijaya Lakshmi Pandit"],
    ["Kalpana Chawla", "Ritu Karidhal", "Muthayya Vanitha"],
  ],
  19: [
    ["Rohini", "Bhaskara-I", "INSAT-1A"],
    ["Venus", "Jupiter", "Mercury"],
    ["International Satellite Research Office", "Indian Science and Rocket Organisation", "Integrated Space Research Observatory"],
    ["To make the rocket heavier", "To avoid using fuel", "To keep every engine on forever"],
    ["Sirius", "Proxima Centauri", "Polaris"],
  ],
  20: [
    ["A single uniform habitat", "Permanent ice cover", "Very low species diversity"],
    ["Increasing wave height", "Removing coastal sediment", "Blocking all tidal water"],
    ["Seaweeds", "Molluscs", "Sponges"],
    ["The most numerous species", "A species found only in zoos", "Any newly discovered species"],
    ["Blue whale", "Olive ridley turtle", "Gharial"],
  ],
  21: [
    ["Sound", "Gravity", "Chemical waste"],
    ["Respiration", "Fermentation", "Transpiration"],
    ["Coal", "Petroleum", "Natural gas"],
    ["Using more energy for less work", "Avoiding every energy source", "Storing energy without using it"],
    ["Earth's core", "The Moon", "Ocean tides alone"],
  ],
  22: [
    ["A short weather report", "A list of unrelated facts", "A single-line instruction"],
    ["Arthashastra", "Yoga Sutras", "Natya Shastra"],
    ["Printed copies only", "Digital storage only", "Silent individual reading only"],
    ["They remove imagination", "They make every statement literal", "They disconnect related experiences"],
    ["Ramayana", "Rig Veda", "Panchatantra"],
  ],
  23: [
    ["Villages becoming colder than mountains", "Cities receiving more rainfall everywhere", "Buildings producing natural snow"],
    ["Condensation", "Combustion", "Freezing"],
    ["Access to nearby services", "Neighbourhood walkability", "Shorter distances between daily needs"],
    ["Move one person per vehicle", "Replace all walking", "Increase empty road space"],
    ["Run off immediately", "Remain permanently on the surface", "Evaporate before touching soil"],
  ],
  24: [
    ["Treatment only after illness", "Ignoring early risks", "Waiting for harm to spread"],
    ["It seals all windows", "It increases indoor smoke", "It removes all humidity instantly"],
    ["Digestive system", "Skeletal system", "Muscular system"],
    ["It permanently sterilises skin", "It changes skin colour", "It replaces vaccination"],
    ["Anonymous forwarded messages", "Unverified advertisements", "Rumours on social media"],
  ],
  25: [
    ["A personal preference without support", "A repeated rumour", "An unrelated opinion"],
    ["A proven scientific law", "A type of measurement", "A complete set of evidence"],
    ["To make it more popular", "To avoid reading it", "To agree without checking"],
    ["Similarity", "Probability", "Measurement"],
    ["How quickly one can reply", "How loudly it is stated", "Only one's own assumptions"],
  ],
  26: [
    ["The Moon's orbit around Earth", "Earth's orbit around the Sun", "The changing seasons"],
    ["Earth's daily rotation", "Moon phases", "Ocean tides"],
    ["Earth's magnetic field", "Sunspot cycles", "Monsoon winds"],
    ["Every month has equal weather", "Clocks lose one hour daily", "The Moon stops moving"],
    ["Longest in the year", "Shortest in the year", "Completely dark"],
  ],
  27: [
    ["Four rotating sections", "No matching parts", "A random arrangement"],
    ["Shapes overlapping with large gaps", "One shape placed at the centre", "Colours blending into a gradient"],
    ["Straight rulers only", "Photographic templates", "Solid colour blocks"],
    ["Next to each other", "At the centre together", "On the same side"],
    ["Only the painted subject", "The artist's signature", "The material's weight"],
  ],
  28: [
    ["Predict another person's future", "Make everyone agree", "Ignore another person's feelings"],
    ["Constant competition", "Hidden goals", "Unreliable behaviour"],
    ["A judgement based on complete evidence", "A carefully tested conclusion", "A neutral measurement"],
    ["Interrupting quickly", "Planning one's reply only", "Ignoring non-verbal cues"],
    ["Complete cultural uniformity", "One language replacing all others", "The removal of local traditions"],
  ],
  29: [
    ["A random collection of data", "A physical computer component", "A secret password"],
    ["Data can never affect people", "All information is automatically public", "Consent is unnecessary online"],
    ["Perfect neutrality in every output", "A harmless spelling variation", "Random screen brightness"],
    ["Maximum screen time", "Constant notifications", "Technology directing every choice"],
    ["Only the manufacturer", "Only the fastest users", "Nobody beyond the buyer"],
  ],
  30: [
    ["Passive memorisation", "Competition alone", "Unquestioning certainty"],
    ["Collecting facts without use", "Avoiding experience", "Repeating words mechanically"],
    ["Rigidly defending one answer", "Working alone without feedback", "Ignoring changing conditions"],
    ["A final and unchanging being", "A purely mechanical being", "A being without further possibilities"],
    ["Toward a higher score only", "Toward collecting certificates", "Toward finishing without change"],
  ],
};

export function choicesFor(levelData: BharatUdayLevel, questionIndex: number, attemptNumber = 0) {
  const answer = levelData.discoveries[questionIndex].answer;
  const alternatives = contextualDistractorsByLevel[levelData.number]?.[questionIndex];
  if (!alternatives) throw new Error(`Missing contextual choices for level ${levelData.number}, question ${questionIndex + 1}`);
  const choices = [answer, ...alternatives];
  const shift = (levelData.number + questionIndex * 2 + Math.abs(attemptNumber)) % choices.length;
  return choices.map((_, index) => choices[(index + shift) % choices.length]);
}
