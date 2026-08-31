(function () {
  window.installSasMobileChallenge = function (doc) {
    if (!doc || doc.getElementById('sas-mobile-challenge-style')) return;
    var win = doc.defaultView;
    var template = doc.getElementById('sas-screen-bharat-uday');
    var app = doc.getElementById('sas-app-redesign');
    var mount = doc.getElementById('sas-screen-mount');
    if (!win || !template || !app || !mount) return;

    var style = doc.createElement('style');
    style.id = 'sas-mobile-challenge-style';
    style.textContent = [
      '#sas-app-redesign .sas-bum{--bu-ink:#082532;--bu-night:#061a25;--bu-teal:#177c78;--bu-cyan:#2b9189;--bu-saffron:#f4a42c;--bu-coral:#e65d3d;--bu-cream:#fff8e8;--bu-gold:#f4c86b;min-height:100%;background:var(--bu-night);color:var(--bu-cream);font-family:Inter,Arial,sans-serif}',
      '#sas-app-redesign .sas-bum-video{padding:8px;background:var(--bu-night)}',
      '#sas-app-redesign .sas-bum-video video{display:block;width:100%;max-height:205px;aspect-ratio:16/9;border:1px solid rgba(244,200,107,.48);border-radius:16px;background:#020b11;object-fit:cover;box-shadow:0 18px 42px rgba(0,0,0,.28)}',
      '#sas-app-redesign .sas-bum-hero{position:relative;box-sizing:border-box;min-height:225px;padding:20px 22px;display:flex;align-items:flex-end;overflow:hidden;background:radial-gradient(circle at 86% 10%,rgba(244,164,44,.18),transparent 40%),linear-gradient(150deg,#061a25,#0b3540 62%,#143f48)}',
      '#sas-app-redesign .sas-bum-hero:after{content:"";position:absolute;width:180px;height:180px;right:-68px;top:-42px;border:1px solid rgba(255,210,97,.36);border-radius:50%;box-shadow:0 0 0 28px rgba(255,210,97,.07),0 0 0 60px rgba(255,210,97,.035)}',
      '#sas-app-redesign .sas-bum-hero-copy{position:relative;z-index:1;max-width:320px}',
      '#sas-app-redesign .sas-bum-pill{display:inline-flex;margin-bottom:8px;padding:5px 8px;border:1px solid rgba(244,200,107,.52);border-radius:99px;color:var(--bu-gold);background:rgba(6,26,37,.76);font-size:8px;font-weight:900;letter-spacing:.08em}',
      '#sas-app-redesign .sas-bum-hero h1{margin:0;color:var(--bu-cream);font:700 36px/.93 Georgia,serif;letter-spacing:-.035em}',
      '#sas-app-redesign .sas-bum-hero h1 span{display:block;color:var(--bu-saffron);font-size:22px;font-style:italic}',
      '#sas-app-redesign .sas-bum-hero p{margin:8px 0 0;color:#e6f1f0;font-size:12px;line-height:1.35}',
      '#sas-app-redesign .sas-bum-proof{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}',
      '#sas-app-redesign .sas-bum-proof span{padding:5px 7px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:rgba(4,27,43,.68);font-size:8px}',
      '#sas-app-redesign .sas-bum-section{padding:26px 19px}',
      '#sas-app-redesign .sas-bum-light{background:radial-gradient(circle at 76% 8%,rgba(244,200,107,.24),transparent 31%),var(--bu-cream);color:var(--bu-ink)}',
      '#sas-app-redesign .sas-bum-kicker{margin:0 0 8px;color:var(--bu-coral);font-size:9px;font-weight:900;letter-spacing:.14em}',
      '#sas-app-redesign .sas-bum-section h2{margin:0 0 12px;font:700 31px/1.02 Georgia,serif;letter-spacing:-.02em}',
      '#sas-app-redesign .sas-bum-section h2 em{color:var(--bu-coral);font-weight:700}',
      '#sas-app-redesign .sas-bum-discovery .sas-bum-kicker{color:#f06a28;font-size:10px}',
      '#sas-app-redesign .sas-bum-discovery h2 em{color:#177c78}',
      '#sas-app-redesign .sas-bum-copy{margin:0;color:#526a70;font-size:12px;line-height:1.58}',
      '#sas-app-redesign .sas-bum-flow{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px}',
      '#sas-app-redesign .sas-bum-step{min-height:112px;padding:13px;border:1px solid rgba(244,164,44,.45);border-radius:15px;background:linear-gradient(150deg,#fffdf7,#f7e8c5)}',
      '#sas-app-redesign .sas-bum-step span{color:var(--bu-coral);font-size:10px;font-weight:900}',
      '#sas-app-redesign .sas-bum-step strong{display:block;margin:14px 0 5px;color:#153c47;font:700 17px Georgia,serif}',
      '#sas-app-redesign .sas-bum-step p{margin:0;color:#607177;font-size:10px;line-height:1.35}',
      '#sas-app-redesign .sas-bum-ascent{background:radial-gradient(circle at 86% 10%,rgba(244,164,44,.15),transparent 448px),linear-gradient(150deg,#061a25,#0b3540 62%,#143f48);color:var(--bu-cream)}',
      '#sas-app-redesign .sas-bum-ascent .sas-bum-kicker{color:var(--bu-gold)}',
      '#sas-app-redesign .sas-bum-ascent h2 em{color:var(--bu-saffron)}',
      '#sas-app-redesign .sas-bum-ascent .sas-bum-copy{color:#c8e3e8}',
      '#sas-app-redesign .sas-bum-progress-head{display:flex;align-items:center;justify-content:space-between;gap:14px}',
      '#sas-app-redesign .sas-bum-ring{flex:0 0 70px;height:70px;display:grid;place-items:center;border:7px solid rgba(255,255,255,.14);border-top-color:#ffbd36;border-radius:50%;color:#ffcf5b;font-weight:900;text-align:center}',
      '#sas-app-redesign .sas-bum-ring small{display:block;color:#c8e3e8;font-size:8px}',
      '#sas-app-redesign .sas-bum-milestones{position:relative;display:grid;grid-template-columns:repeat(5,1fr);gap:3px;margin:23px 0 20px;text-align:center}',
      '#sas-app-redesign .sas-bum-milestones:before{content:"";position:absolute;left:8%;right:8%;top:14px;height:2px;background:rgba(255,255,255,.18)}',
      '#sas-app-redesign .sas-bum-milestones span{position:relative;z-index:1;color:#fff;font-size:10px;font-weight:900}',
      '#sas-app-redesign .sas-bum-milestones span:before{content:"";display:block;width:10px;height:10px;margin:9px auto 6px;border:3px solid #627695;border-radius:50%;background:#0b2451}',
      '#sas-app-redesign .sas-bum-milestones span:first-child:before{border-color:#ffbd36;background:#ffbd36}',
      '#sas-app-redesign .sas-bum-milestones small{display:block;color:#9ebbc8;font-size:7px;line-height:1.2}',
      '#sas-app-redesign .sas-bum-current{padding:18px;border:1px solid rgba(255,211,103,.38);border-radius:18px;background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,180,47,.08));box-shadow:0 15px 32px rgba(0,0,0,.2)}',
      '#sas-app-redesign .sas-bum-current small{color:#64e5ff;font-size:9px;font-weight:900;letter-spacing:.11em}',
      '#sas-app-redesign .sas-bum-current h3{margin:7px 0;color:#fff;font:700 28px Georgia,serif}',
      '#sas-app-redesign .sas-bum-current p{margin:0 0 13px;color:#cfe2e7;font-size:11px;line-height:1.45}',
      '#sas-app-redesign .sas-bum-primary{width:100%;min-height:48px;padding:12px 15px;border:0;border-radius:13px;background:linear-gradient(135deg,var(--bu-gold),var(--bu-coral));color:var(--bu-night);font-weight:900;box-shadow:0 6px 0 #9c3f28}',
      '#sas-app-redesign .sas-bum-primary:disabled{opacity:.42;box-shadow:none}',
      '#sas-app-redesign .sas-bum-secondary{width:100%;min-height:44px;margin-top:13px;padding:10px 14px;border:1px solid rgba(255,211,103,.55);border-radius:12px;background:transparent;color:#ffe4a0;font-weight:800}',
      '#sas-app-redesign .sas-bum-levels{display:grid;gap:8px;margin-top:13px}',
      '#sas-app-redesign .sas-bum-level{display:grid;grid-template-columns:34px 28px minmax(0,1fr);gap:9px;align-items:center;width:100%;padding:11px;border:1px solid rgba(255,255,255,.13);border-radius:13px;text-align:left;background:rgba(255,255,255,.07);color:#d9e7eb}',
      '#sas-app-redesign .sas-bum-level.complete{border-color:#4bc790;background:rgba(47,181,121,.16)}',
      '#sas-app-redesign .sas-bum-level.current{border-color:#ffc64c;background:rgba(255,190,50,.16);box-shadow:0 0 0 2px rgba(255,190,50,.12)}',
      '#sas-app-redesign .sas-bum-level.locked{opacity:.48}',
      '#sas-app-redesign .sas-bum-level-number{font-weight:900;color:#ffcc5f}',
      '#sas-app-redesign .sas-bum-level-symbol{font-size:20px;text-align:center}',
      '#sas-app-redesign .sas-bum-level-copy small,#sas-app-redesign .sas-bum-level-copy strong,#sas-app-redesign .sas-bum-level-copy b{display:block}',
      '#sas-app-redesign .sas-bum-level-copy small{color:#8fd9e8;font-size:8px;text-transform:uppercase}',
      '#sas-app-redesign .sas-bum-level-copy strong{margin:2px 0;color:#fff;font-size:12px}',
      '#sas-app-redesign .sas-bum-level-copy b{color:#ffcf69;font-size:8px}',
      '#sas-app-redesign .sas-bum-notice{margin:12px 0 0;padding:10px;border-left:3px solid #ffc34b;background:rgba(255,255,255,.08);color:#e5f0f1;font-size:10px;line-height:1.4}',
      '#sas-app-redesign .sas-bum-stage{min-height:calc(100dvh - 40px);padding:28px 20px 110px;background:radial-gradient(circle at 85% 0%,rgba(244,164,44,.2),transparent 30%),linear-gradient(150deg,#061a25,#0b3540 62%,#143f48);color:var(--bu-cream)}',
      '#sas-app-redesign .sas-bum-stage .sas-bum-kicker{color:#ffcc59}',
      '#sas-app-redesign .sas-bum-back{margin:0 0 24px;padding:8px 0;border:0;background:transparent;color:#c8e7ed;font-weight:800}',
      '#sas-app-redesign .sas-bum-emblem{width:70px;height:70px;display:grid;place-items:center;margin:6px 0 20px;border:1px solid rgba(255,214,105,.55);border-radius:50%;background:radial-gradient(circle,#ffd968,#db7e1f 55%,rgba(219,126,31,.1) 58%);color:#102c40;font-size:30px;box-shadow:0 0 38px rgba(255,190,47,.32)}',
      '#sas-app-redesign .sas-bum-stage h2{margin:0 0 12px;color:#fff;font:700 34px/1 Georgia,serif}',
      '#sas-app-redesign .sas-bum-stage>p{color:#cfe1e5;font-size:12px;line-height:1.55}',
      '#sas-app-redesign .sas-bum-meta{display:flex;gap:7px;flex-wrap:wrap;margin:18px 0}',
      '#sas-app-redesign .sas-bum-meta span{padding:7px 9px;border:1px solid rgba(255,255,255,.15);border-radius:99px;color:#d9edf0;font-size:9px}',
      '#sas-app-redesign .sas-bum-qhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;color:#b7d9e0;font-size:10px}',
      '#sas-app-redesign .sas-bum-track{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:27px}',
      '#sas-app-redesign .sas-bum-track span{height:4px;border-radius:9px;background:rgba(255,255,255,.15)}',
      '#sas-app-redesign .sas-bum-track span.done,#sas-app-redesign .sas-bum-track span.current{background:#ffbd36}',
      '#sas-app-redesign .sas-bum-options{display:grid;gap:9px;margin:20px 0}',
      '#sas-app-redesign .sas-bum-option{display:grid;grid-template-columns:30px 1fr 18px;gap:9px;align-items:center;width:100%;padding:13px;border:1px solid rgba(255,255,255,.17);border-radius:13px;background:rgba(255,255,255,.07);color:#eef7f8;text-align:left}',
      '#sas-app-redesign .sas-bum-option.selected{border-color:#ffc34b;background:rgba(255,190,50,.16)}',
      '#sas-app-redesign .sas-bum-option.correct{border-color:#54dfa0;background:rgba(45,190,126,.2);box-shadow:0 0 20px rgba(64,220,150,.24)}',
      '#sas-app-redesign .sas-bum-option.wrong{border-color:#ff6b6b;background:rgba(210,47,62,.22)}',
      '#sas-app-redesign .sas-bum-option:disabled{opacity:1}',
      '#sas-app-redesign .sas-bum-option span{width:27px;height:27px;display:grid;place-items:center;border-radius:50%;background:#173e58;color:#ffd167;font-weight:900}',
      '#sas-app-redesign .sas-bum-option i{color:#ffd167;font-style:normal}',
      '#sas-app-redesign .sas-bum-feedback{margin:11px 0;padding:11px;border-radius:11px;font-size:11px;font-weight:800;line-height:1.4}',
      '#sas-app-redesign .sas-bum-feedback.correct{color:#caffdf;background:rgba(35,161,105,.22);border:1px solid #4fd69a}',
      '#sas-app-redesign .sas-bum-feedback.wrong{color:#ffd5d5;background:rgba(189,43,58,.23);border:1px solid #ff7373}',
      '#sas-app-redesign .sas-bum-score{width:110px;height:110px;display:grid;place-items:center;margin:0 auto 24px;border:8px solid rgba(255,255,255,.14);border-top-color:#ffbd36;border-radius:50%;color:#ffcf5e;font-size:42px;font-weight:900;text-align:center}',
      '#sas-app-redesign .sas-bum-score small{display:block;color:#c8e1e6;font-size:10px}',
      '#sas-app-redesign .sas-bum-answer{margin:8px 0;padding:11px;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:rgba(255,255,255,.06)}',
      '#sas-app-redesign .sas-bum-answer strong{display:block;color:#ffcf5e;font-size:11px}',
      '#sas-app-redesign .sas-bum-answer p{margin:4px 0 0;color:#c9e0e4;font-size:10px;line-height:1.4}',
      '#sas-app-redesign .sas-bum-quote{margin:25px 0;padding:19px;border-left:3px solid #ffbd36;background:rgba(255,255,255,.07);color:#fff;font:italic 25px/1.3 Georgia,serif}',
      '#sas-app-redesign .sas-bum-quote small{display:block;margin-top:9px;color:#ffcf69;font:700 10px Arial}',
      '#sas-app-redesign .sas-bum-reflection{width:100%;min-height:105px;margin:7px 0 15px;padding:12px;border:1px solid rgba(255,255,255,.23);border-radius:12px;background:rgba(255,255,255,.08);color:#fff;resize:vertical}',
      '#sas-app-redesign .sas-bum-certificate{position:relative;margin:18px 0;padding:20px;border:2px solid var(--level-accent,#ffcf68);border-radius:18px;background:radial-gradient(circle at 88% 8%,color-mix(in srgb,var(--level-accent,#ffcf68) 42%,transparent),transparent 31%),linear-gradient(145deg,#061a25,#0b3540 58%,color-mix(in srgb,var(--level-accent,#e65d3d) 58%,#061a25));text-align:center;box-shadow:0 18px 42px rgba(0,0,0,.3);overflow:hidden}',
      '#sas-app-redesign .sas-bum-certificate:before{content:attr(data-level-symbol);position:absolute;right:-12px;bottom:-38px;color:var(--level-accent,#ffcf68);font:700 170px/1 Georgia,serif;opacity:.13}',
      '#sas-app-redesign .sas-bum-certificate>*{position:relative;z-index:1}',
      '#sas-app-redesign .sas-bum-certificate-logo{display:block;width:92px;height:74px;margin:0 auto 11px;object-fit:contain;padding:7px;border:2px solid rgba(19,92,210,.2);border-radius:14px;background:#fff;box-shadow:0 5px 16px rgba(0,0,0,.24)}',
      '#sas-app-redesign .sas-bum-certificate small,#sas-app-redesign .sas-bum-certificate strong{display:block}',
      '#sas-app-redesign .sas-bum-certificate small{color:#ffd66f;font-size:8px;letter-spacing:.1em}',
      '#sas-app-redesign .sas-bum-certificate h3{margin:14px 0 7px;color:#fff;font:700 25px Georgia,serif}',
      '#sas-app-redesign .sas-bum-certificate-name{width:min(92%,290px);margin:17px auto 20px;padding:0 8px 7px;border-bottom:2px solid var(--level-accent,#ffcf68);color:#fff;font:italic 25px Georgia,serif}',
      '#sas-app-redesign .sas-bum-certificate blockquote{margin:18px 0;color:#ffedbd;font:italic 18px/1.35 Georgia,serif}',
      '#sas-app-redesign .sas-bum-name{display:block;margin:14px 0;color:#cce6ea;font-size:10px}',
      '#sas-app-redesign .sas-bum-name input{width:100%;margin-top:6px;padding:12px;border:1px solid rgba(255,255,255,.22);border-radius:10px;background:rgba(255,255,255,.09);color:#fff}',
      '#sas-app-redesign [data-bu-hidden]{display:none!important}'
    ].join('\n');
    doc.head.appendChild(style);

    template.innerHTML = [
      '<main class="sas-bum">',
      '<section class="sas-bum-video"><video data-bu-video-source="/public/bharat-uday/next-human-challenge-intro.mp4" controls autoplay muted playsinline preload="auto" poster="/public/bharat-uday/next-human-challenge-poster.jpg" aria-label="Introduction to The Next Human Challenge">Your device could not play the introduction video.</video></section>',
      '<section class="sas-bum-hero"><div class="sas-bum-hero-copy"><span class="sas-bum-pill">A 30-LEVEL DISCOVERY EXPERIENCE</span><h1>The Next Human <span>Challenge</span></h1><p>Five fast questions. One discovery. One life quote.</p><div class="sas-bum-proof"><span><b>30</b> vivid levels</span><span><b>5</b> questions each</span><span><b>∞</b> your pace</span></div></div></section>',
      '<div data-bu-stage="overview">',
      '<section class="sas-bum-section sas-bum-light sas-bum-discovery"><p class="sas-bum-kicker">NOT A TEST. A DISCOVERY.</p><h2>Culture meets science.<br><em>Knowledge meets you.</em></h2><p class="sas-bum-copy">The Next Human Challenge is a fast, free journey through 30 surprising worlds—from zero and space science to biodiversity, music, attention and the future human. Every finish reveals a Discovery Card carrying a word for life.</p><div class="sas-bum-flow"><article class="sas-bum-step"><span>01</span><strong>JÑĀNA</strong><p>Answer five inviting questions</p></article><article class="sas-bum-step"><span>02</span><strong>KHOJ</strong><p>Unlock a surprising discovery</p></article><article class="sas-bum-step"><span>03</span><strong>SĀDHANA</strong><p>Receive a word for life</p></article><article class="sas-bum-step"><span>04</span><strong>DISCOVERY CARD</strong><p>Make the discovery your own</p></article></div></section>',
      '<section class="sas-bum-section sas-bum-ascent"><div class="sas-bum-progress-head"><div><p class="sas-bum-kicker">YOUR ASCENT</p><h2>30 levels.<br><em>One awakening journey.</em></h2><p class="sas-bum-copy">Difficulty rises gently. Curiosity leads the way.</p></div><div class="sas-bum-ring"><div><span data-bu-completed>0</span><small>OF 30</small></div></div></div><div class="sas-bum-milestones"><span>START<small>Begin</small></span><span>7<small>First Light</small></span><span>15<small>Widening Mind</small></span><span>21<small>Living Energy</small></span><span>30<small>NEXT HUMAN</small></span></div><article class="sas-bum-current"><small data-bu-current-label>YOUR NEXT DISCOVERY · LEVEL 01</small><h3 data-bu-current-title>The Sky Above Us</h3><p data-bu-current-copy>Begin with a simple question about the universe—and finish with one thought to carry inward.</p><button class="sas-bum-primary" type="button" data-bu-action="start-level" data-bu-current-action>Begin Level 01 →</button></article><button class="sas-bum-secondary" type="button" data-bu-action="toggle-levels" aria-expanded="false">See all 30 levels</button><p class="sas-bum-notice" data-bu-notice data-bu-hidden></p><div class="sas-bum-levels" data-bu-levels data-bu-hidden></div></section>',
      '</div>',
      '<section class="sas-bum-stage" data-bu-stage="welcome" data-bu-hidden><button class="sas-bum-back" type="button" data-bu-action="overview">Return to the journey</button><div class="sas-bum-emblem" data-bu-welcome-symbol>✦</div><p class="sas-bum-kicker" data-bu-welcome-kicker>LEVEL 01 · ASTRONOMY</p><h2 data-bu-welcome-title>The Sky Above Us</h2><p data-bu-welcome-copy>Five quick questions. One unexpected connection. A thought that becomes yours.</p><div class="sas-bum-meta"><span>5 questions</span><span>About 3 minutes</span><span>No negative marking</span></div><button class="sas-bum-primary" type="button" data-bu-action="enter-level">Enter this discovery →</button></section>',
      '<section class="sas-bum-stage" data-bu-stage="question" data-bu-hidden><div class="sas-bum-qhead"><button class="sas-bum-back" type="button" data-bu-action="welcome">Exit level</button><strong data-bu-question-count>1 / 5</strong></div><div class="sas-bum-track" data-bu-track></div><p class="sas-bum-kicker" data-bu-question-kicker>DISCOVERY QUESTION 1</p><h2 data-bu-question-prompt></h2><div class="sas-bum-options" data-bu-options></div><p class="sas-bum-feedback" data-bu-feedback data-bu-hidden></p><button class="sas-bum-primary" type="button" data-bu-action="next-question" data-bu-next disabled>Next question →</button></section>',
      '<section class="sas-bum-stage" data-bu-stage="coach" data-bu-hidden><div class="sas-bum-score"><div><span data-bu-score>0</span><small>OUT OF 5</small></div></div><p class="sas-bum-kicker">KHOJ · YOUR DISCOVERY</p><h2 data-bu-score-message>A new doorway has opened.</h2><p data-bu-score-detail>Indian sky-watchers combined careful observation with mathematics.</p><div data-bu-answers></div><button class="sas-bum-primary" type="button" data-bu-action="quote" data-bu-coach-action>Proceed to finish this level →</button></section>',
      '<section class="sas-bum-stage" data-bu-stage="quote" data-bu-hidden><button class="sas-bum-back" type="button" data-bu-action="coach">Return to discovery</button><p class="sas-bum-kicker">SĀDHANA · A WORD FOR LIFE</p><h2>Carry this into your day.</h2><blockquote class="sas-bum-quote"><span data-bu-quote-text>“All life is Yoga.”</span><small data-bu-quote-author>— Sri Aurobindo · The Synthesis of Yoga</small></blockquote><p data-bu-inner-prompt>For one quiet minute, look upward—at the sky or simply into space—and let curiosity become larger than certainty.</p><label class="sas-bum-name">Your private reflection<textarea class="sas-bum-reflection" data-bu-reflection placeholder="What thought will you carry inward?"></textarea></label><button class="sas-bum-primary" type="button" data-bu-action="complete-level">Carry this with me and create my card →</button></section>',
      '<section class="sas-bum-stage" data-bu-stage="certificate" data-bu-hidden><button class="sas-bum-back" type="button" data-bu-action="overview">Return to the journey</button><p class="sas-bum-kicker">LEVEL COMPLETE</p><h2 data-bu-certificate-ready>Your Certificate of Discovery is ready.</h2><div class="sas-bum-certificate" data-bu-certificate data-level-symbol="✦"><img class="sas-bum-certificate-logo" src="/public/society-logo-transparent.png" alt="Sri Aurobindo Society Lucknow logo" data-bu-certificate-logo><small>SRI AUROBINDO SOCIETY, LUCKNOW · THE NEXT HUMAN CHALLENGE</small><h3 data-bu-certificate-title>Certificate of Discovery</h3><p>This is to certify that</p><strong class="sas-bum-certificate-name" data-bu-certificate-name>Type your name</strong><p data-bu-certificate-level>has successfully completed Level 01 — The Sky Above Us and explored Astronomy through culture, science and consciousness.</p><blockquote><span data-bu-certificate-quote>“All life is Yoga.”</span><small data-bu-certificate-author>— Sri Aurobindo</small></blockquote></div><label class="sas-bum-name">Name on your certificate<input type="text" maxlength="60" placeholder="Type your name" data-bu-name></label><button class="sas-bum-primary" type="button" data-bu-action="download-certificate" disabled>Download Certificate</button><button class="sas-bum-secondary" type="button" data-bu-action="next-level" data-bu-next-level>Go to next level</button><p class="sas-bum-notice" data-bu-download-status data-bu-hidden></p></section>',
      '</main>'
    ].join('');

    var levels = [
      [1,'✦','Astronomy','The Sky Above Us'],[2,'०','Mathematics','The Power of Zero'],[3,'◉','Ayurveda','A Science of Balance'],[4,'≈','Ecology','The Intelligence of Water'],[5,'◇','Architecture','Geometry in Stone'],[6,'अ','Language','Many Languages, One Conversation'],[7,'✺','Food & Nutrition','The Science on Your Plate'],[8,'♧','Biodiversity','Forests of Memory'],[9,'♪','Music','The Physics of Sound'],[10,'∞','Yoga','Breath and Attention'],[11,'⌁','Textiles','Threads of Ingenuity'],[12,'⚙','Materials Science','Metal That Remembered'],[13,'⌖','Navigation','Across the Monsoon Seas'],[14,'❋','Agriculture','Reading the Seasons'],[15,'☼','Optics','Light, Colour, Vision'],[16,'◎','Consciousness','The Laboratory of Attention'],[17,'⚖','Civics','A Republic of Values'],[18,'↑','Pioneers','Women Who Changed the Horizon'],[19,'↗','Space Science','India Beyond Earth'],[20,'⌘','Natural India','A Nation of Living Worlds'],[21,'☀','Energy','Living with the Sun'],[22,'❝','Literature','Stories That Think'],[23,'▦','Urban Future','Cities That Can Breathe'],[24,'＋','Public Health','Health Is Shared'],[25,'?','Logic','The Courage to Question'],[26,'◷','Time','Measuring the Great Rhythm'],[27,'✣','Art','Symmetry and the Imagination'],[28,'◌','Human Unity','One Earth, Many Selves'],[29,'⌁','Future Ethics','Technology with a Conscience'],[30,'✺','Integration','The NEXT HUMAN']
    ];
    var questionPool = [
      {prompt:'Who described Earth as rotating on its axis in the Aryabhatiya?',answer:'Aryabhata',choices:['Aryabhata','Varahamihira','Brahmagupta','Bhaskara II'],note:'Aryabhata described the apparent movement of the stars as an effect of Earth rotation.'},
      {prompt:'Which historic observatory in Jaipur uses giant stone instruments?',answer:'Jantar Mantar',choices:['Jantar Mantar','Ujjain Observatory','Madras Observatory','Vedh Shala'],note:'Jantar Mantar instruments measure time and celestial positions without electronics.'},
      {prompt:'What causes a lunar eclipse?',answer:'Earth shadow on the Moon',choices:['Earth shadow on the Moon','Clouds covering the Moon','The Moon shadow on Earth','The Sun moving behind Mars'],note:'A lunar eclipse occurs when Earth comes between the Sun and Moon.'},
      {prompt:'Which Indian mission made a soft landing near the Moon south polar region?',answer:'Chandrayaan-3',choices:['Chandrayaan-3','Mangalyaan','Aditya-L1','Chandrayaan-1'],note:'Chandrayaan-3 Vikram lander touched down in August 2023.'},
      {prompt:'Which star helps locate north in the Northern Hemisphere?',answer:'Polaris',choices:['Polaris','Sirius','Betelgeuse','Vega'],note:'Polaris appears close to the north celestial pole.'},
      {prompt:'In which city is the best-known Jantar Mantar with the world’s largest stone sundial?',answer:'Jaipur',choices:['Jaipur','Delhi','Ujjain','Varanasi'],note:'Jaipur’s Jantar Mantar includes the monumental Samrat Yantra.'},
      {prompt:'Which planet is often the brightest planet visible from Earth?',answer:'Venus',choices:['Venus','Mars','Jupiter','Saturn'],note:'Venus can appear exceptionally bright shortly after sunset or before sunrise.'},
      {prompt:'On which date did Chandrayaan-3 make its lunar soft landing?',answer:'23 August 2023',choices:['23 August 2023','14 July 2023','2 September 2023','6 September 2019'],note:'India marks 23 August as National Space Day in honour of the landing.'},
      {prompt:'Which instrument can measure the angle between a celestial object and the horizon?',answer:'Sextant',choices:['Sextant','Telescope','Barometer','Chronometer'],note:'A sextant measures angular separation and has long supported celestial navigation.'},
      {prompt:'Which Indian space organisation operates the Chandrayaan missions?',answer:'ISRO',choices:['ISRO','NASA','ESA','JAXA'],note:'The Indian Space Research Organisation develops and operates the Chandrayaan programme.'}
    ];
    var levelCatalog = Array.isArray(win.sasBharatUdayMobileLevels)
      ? win.sasBharatUdayMobileLevels
      : Array.isArray(window.sasBharatUdayMobileLevels)
        ? window.sasBharatUdayMobileLevels
        : [];
    var storageKey = 'sas-mobile-next-human-progress-v1';
    var progress = {};
    try { progress = JSON.parse(win.localStorage.getItem(storageKey) || '{}'); } catch (error) { progress = {}; }
    progress.completed = Array.isArray(progress.completed) ? progress.completed : [];
    progress.currentLevel = Math.min(30,Math.max(1,Number(progress.currentLevel) || (progress.completed.indexOf(1) >= 0 ? 2 : 1)));
    progress.name = typeof progress.name === 'string' ? progress.name : '';
    progress.reflections = progress.reflections && typeof progress.reflections === 'object' ? progress.reflections : {};
    progress.scores = progress.scores && typeof progress.scores === 'object' ? progress.scores : {};
    if (typeof progress.reflection === 'string' && !progress.reflections[1]) progress.reflections[1] = progress.reflection;
    if (Number.isFinite(progress.score) && !progress.scores[1]) progress.scores[1] = progress.score;
    var activeLevelNumber = progress.currentLevel;
    var questionIndex = 0;
    var selectedChoice = '';
    var answers = [];
    var attemptQuestions = [];
    var clientAttemptId = '';
    var feedbackLocked = false;
    var certificateLogoPromise = null;
    var milestoneCertificates = {
      7:{ title:'Certificate of First Light',milestone:'First Light',completion:'the first 7 levels',range:'LEVELS 1–7' },
      15:{ title:'Certificate of the Widening Mind',milestone:'Widening Mind',completion:'the first 15 levels',range:'LEVELS 1–15' },
      21:{ title:'Certificate of Living Energy',milestone:'Living Energy',completion:'the first 21 levels',range:'LEVELS 1–21' },
      30:{ title:'Certificate of the Next Human',milestone:'Next Human',displayTitle:'The Next Human Milestone',completion:'all 30 levels',range:'LEVELS 1–30' }
    };

    function fetchLogoDataUrl(path) {
      return window.fetch(path,{ cache:'force-cache' }).then(function (response) {
        if (!response.ok) throw new Error('Logo request failed');
        return response.blob();
      }).then(function (blob) {
        return new Promise(function (resolve,reject) {
          var reader = new window.FileReader();
          reader.onload = function () { resolve(String(reader.result || '')); };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      });
    }
    function loadCertificateLogoData() {
      if (!certificateLogoPromise) {
        certificateLogoPromise = fetchLogoDataUrl('/public/society-logo-transparent.png').catch(function () {
          return fetchLogoDataUrl('/public/society-logo.jpg');
        });
      }
      return certificateLogoPromise;
    }
    function getCertificateCopy(levelData) {
      var milestone = milestoneCertificates[levelData.number];
      if (milestone) {
        return {
          title:milestone.title,
          ready:'Your milestone certificate is ready.',
          body:'through curiosity, reflection and conscious learning has reached the ' + milestone.milestone + ' milestone, by successfully completing ' + milestone.completion + ' of The Next Human Challenge 2026.',
          label:milestone.range + ' COMPLETED',
          displayTitle:milestone.displayTitle || milestone.milestone + ' Milestone',
          milestone:milestone
        };
      }
      return {
        title:'Certificate of Discovery',
        ready:'Your Certificate of Discovery is ready.',
        body:'has successfully completed Level ' + String(levelData.number).padStart(2,'0') + ' — ' + levelData.title + ' and explored ' + levelData.realm + ' through culture, science and consciousness.',
        label:'LEVEL ' + String(levelData.number).padStart(2,'0') + ' · ' + levelData.realm.toUpperCase(),
        displayTitle:levelData.title,
        milestone:null
      };
    }

    function shuffled(items) {
      var copy = items.slice();
      for (var index = copy.length - 1; index > 0; index -= 1) {
        var swap = Math.floor(Math.random() * (index + 1));
        var value = copy[index]; copy[index] = copy[swap]; copy[swap] = value;
      }
      return copy;
    }
    function getLevelData(number) {
      var catalogLevel = levelCatalog.find(function (item) { return item.number === number; });
      if (catalogLevel) return catalogLevel;
      var fallback = levels[number - 1] || levels[0];
      return { number:fallback[0], symbol:fallback[1], realm:fallback[2], title:fallback[3], accent:'#f4a42c', coachFact:'Every question opens a new doorway.', innerPrompt:'Pause and carry one discovery into your day.', quote:{ text:'All life is Yoga.',author:'Sri Aurobindo',source:'The Synthesis of Yoga' }, questions:number === 1 ? questionPool : [] };
    }
    function getActiveLevel() { return getLevelData(activeLevelNumber); }
    function startAttempt() {
      var activeQuestions = getActiveLevel().questions || [];
      attemptQuestions = shuffled(activeQuestions).slice(0,5).map(function (question) {
        return { prompt: question.prompt, answer: question.answer, choices: shuffled(question.choices), note: question.note };
      });
      questionIndex = 0; selectedChoice = ''; answers = []; feedbackLocked = false;
      clientAttemptId = win.crypto && typeof win.crypto.randomUUID === 'function' ? win.crypto.randomUUID() : String(Date.now()) + '-' + String(Math.random()).slice(2);
    }

    function saveProgress() { win.localStorage.setItem(storageKey, JSON.stringify(progress)); }
    function syncProgressFromServer() {
      return win.fetch('/api/participation/member/next-human-challenge/progress',{ credentials:'same-origin',cache:'no-store' }).then(function (response) {
        if (!response.ok) throw new Error('Challenge progress is unavailable');
        return response.json();
      }).then(function (result) {
        var remote = result && result.progress ? result.progress : {};
        var remoteCompleted = Array.isArray(remote.completedLevels) ? remote.completedLevels.map(Number) : [];
        progress.completed = Array.from(new Set(progress.completed.concat(remoteCompleted))).filter(function (level) { return level >= 1 && level <= 30; }).sort(function (left,right) { return left-right; });
        progress.currentLevel = Math.min(30,Math.max(progress.currentLevel,Number(remote.currentLevel) || 1));
        progress.scores = Object.assign({},progress.scores,remote.scores || {});
        progress.reflections = Object.assign({},progress.reflections,remote.reflections || {});
        saveProgress();
        var page = activePage();
        if (page) { configureLevel(page,progress.currentLevel); refreshOverview(page); }
      }).catch(function () {});
    }
    function saveAttemptToServer(levelData,score) {
      var payload = {
        clientAttemptId:clientAttemptId,
        level:levelData.number,
        realm:levelData.realm,
        title:levelData.title,
        score:score,
        questions:attemptQuestions.map(function (question,index) { return { prompt:question.prompt,selectedAnswer:answers[index],correctAnswer:question.answer,note:question.note }; })
      };
      return win.fetch('/api/participation/member/next-human-challenge/attempts',{ method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload) }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (result) {
          if (!response.ok) throw new Error(result.error || 'Answers could not be saved');
          return result;
        });
      });
    }
    function saveReflectionToServer(level,reflection) {
      return win.fetch('/api/participation/member/next-human-challenge/levels/' + level + '/reflection',{ method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({ reflection:reflection }) }).catch(function () {});
    }
    function recordCertificateDownload(level) {
      win.fetch('/api/participation/member/next-human-challenge/certificates/' + level + '/download',{ method:'POST',credentials:'same-origin' }).catch(function () {});
    }
    function activePage() { return doc.querySelector('.sas-bum'); }
    function showStage(page, name) {
      page.querySelectorAll('[data-bu-stage]').forEach(function (stage) {
        if (stage.getAttribute('data-bu-stage') === name) stage.removeAttribute('data-bu-hidden');
        else stage.setAttribute('data-bu-hidden','');
      });
      page.querySelectorAll('.sas-bum-hero,.sas-bum-video').forEach(function (media) {
        if (name === 'overview') media.removeAttribute('data-bu-hidden');
        else media.setAttribute('data-bu-hidden','');
      });
      page.setAttribute('data-bu-active-stage',name);
      doc.scrollingElement.scrollTop = 0;
      if (name === 'overview') refreshOverview(page);
      if (name === 'certificate') refreshCertificate(page);
    }
    function configureLevel(page,number) {
      activeLevelNumber = Math.min(30,Math.max(1,Number(number) || progress.currentLevel));
      var levelData = getActiveLevel();
      page.style.setProperty('--level-accent',levelData.accent || '#f4a42c');
      page.querySelector('[data-bu-welcome-symbol]').textContent = levelData.symbol;
      page.querySelector('[data-bu-welcome-kicker]').textContent = 'LEVEL ' + String(levelData.number).padStart(2,'0') + ' · ' + levelData.realm.toUpperCase();
      page.querySelector('[data-bu-welcome-title]').textContent = levelData.title;
      page.querySelector('[data-bu-welcome-copy]').textContent = levelData.coachFact;
      var quote = levelData.quote || { text:'All life is Yoga.',author:'Sri Aurobindo',source:'The Synthesis of Yoga' };
      page.querySelector('[data-bu-quote-text]').textContent = '“' + quote.text + '”';
      page.querySelector('[data-bu-quote-author]').textContent = '— ' + quote.author + (quote.source ? ' · ' + quote.source : '');
      page.querySelector('[data-bu-inner-prompt]').textContent = levelData.innerPrompt;
      page.querySelector('[data-bu-reflection]').value = progress.reflections[levelData.number] || '';
    }
    function refreshOverview(page) {
      var next = getLevelData(progress.currentLevel);
      page.querySelector('[data-bu-completed]').textContent = String(progress.completed.length);
      page.querySelector('[data-bu-current-label]').textContent = 'YOUR NEXT DISCOVERY · LEVEL ' + String(next.number).padStart(2,'0');
      page.querySelector('[data-bu-current-title]').textContent = next.title;
      page.querySelector('[data-bu-current-copy]').textContent = next.coachFact;
      page.querySelector('[data-bu-current-action]').textContent = (progress.completed.indexOf(next.number) >= 0 ? 'View Level ' : 'Begin Level ') + String(next.number).padStart(2,'0') + ' →';
      page.querySelector('[data-bu-levels]').innerHTML = levels.map(function (level) {
        var done = progress.completed.indexOf(level[0]) >= 0;
        var current = level[0] === progress.currentLevel;
        var state = done ? 'complete' : current ? 'current' : 'locked';
        var label = done ? '✓ Completed · View certificate' : current ? 'Begin this level →' : 'Complete earlier levels';
        var disabled = !done && !current ? ' disabled' : '';
        return '<button type="button" class="sas-bum-level ' + state + '" data-bu-action="open-level" data-bu-level="' + level[0] + '"' + disabled + '><span class="sas-bum-level-number">' + String(level[0]).padStart(2,'0') + '</span><span class="sas-bum-level-symbol">' + level[1] + '</span><span class="sas-bum-level-copy"><small>' + level[2] + '</small><strong>' + level[3] + '</strong><b>' + label + '</b></span></button>';
      }).join('');
    }
    function renderQuestion(page) {
      var question = attemptQuestions[questionIndex];
      page.querySelector('[data-bu-question-count]').textContent = String(questionIndex + 1) + ' / 5';
      page.querySelector('[data-bu-question-kicker]').textContent = 'DISCOVERY QUESTION ' + String(questionIndex + 1);
      page.querySelector('[data-bu-question-prompt]').textContent = question.prompt;
      page.querySelector('[data-bu-track]').innerHTML = attemptQuestions.map(function (_, index) { return '<span class="' + (index < questionIndex ? 'done' : index === questionIndex ? 'current' : '') + '"></span>'; }).join('');
      page.querySelector('[data-bu-options]').innerHTML = question.choices.map(function (choice, index) {
        var chosen = selectedChoice === choice;
        var state = chosen ? ' selected' : '';
        if (feedbackLocked && choice === question.answer) state += ' correct';
        if (feedbackLocked && chosen && choice !== question.answer) state += ' wrong';
        return '<button type="button" class="sas-bum-option' + state + '" data-bu-action="select-option" data-bu-choice="' + choice + '"' + (feedbackLocked ? ' disabled' : '') + '><span>' + String.fromCharCode(65 + index) + '</span><b>' + choice + '</b><i>' + (feedbackLocked && choice === question.answer ? '✓' : feedbackLocked && chosen ? '×' : chosen ? '●' : '○') + '</i></button>';
      }).join('');
      var feedback = page.querySelector('[data-bu-feedback]');
      if (feedbackLocked) {
        var correct = selectedChoice === question.answer;
        feedback.className = 'sas-bum-feedback ' + (correct ? 'correct' : 'wrong');
        feedback.textContent = correct ? 'Correct. ' + question.note : 'Not quite. The correct answer is ' + question.answer + '. ' + question.note;
        feedback.removeAttribute('data-bu-hidden');
      } else {
        feedback.className = 'sas-bum-feedback';
        feedback.textContent = '';
        feedback.setAttribute('data-bu-hidden','');
      }
      var next = page.querySelector('[data-bu-next]');
      next.disabled = !feedbackLocked;
      next.textContent = questionIndex === 4 ? 'Reveal my discovery →' : 'Next question →';
    }
    function renderCoach(page) {
      var levelData = getActiveLevel();
      var score = answers.reduce(function (total, answer, index) { return total + (answer === attemptQuestions[index].answer ? 1 : 0); },0);
      var passed = score >= 3;
      progress.scores[levelData.number] = score;
      page.querySelector('[data-bu-score]').textContent = String(score);
      page.querySelector('[data-bu-score-message]').textContent = passed ? (score >= 4 ? 'Your curiosity is wide awake.' : 'Level ' + String(levelData.number).padStart(2,'0') + ' is complete.') : 'This level needs one more attempt.';
      page.querySelector('[data-bu-score-detail]').textContent = passed ? levelData.coachFact : 'You need at least 3 correct answers out of 5. Your next attempt will use a newly shuffled set.';
      page.querySelector('[data-bu-answers]').innerHTML = attemptQuestions.map(function (question,index) {
        return '<article class="sas-bum-answer"><strong>' + (answers[index] === question.answer ? '✓ ' : '↗ ') + question.answer + '</strong><p>' + question.note + '</p></article>';
      }).join('');
      var coachAction = page.querySelector('[data-bu-coach-action]');
      coachAction.setAttribute('data-bu-action',passed ? 'quote' : 'retry-level');
      coachAction.textContent = passed ? 'Proceed to finish this level →' : 'Try Level ' + String(levelData.number).padStart(2,'0') + ' again with new questions →';
      saveAttemptToServer(levelData,score).then(function () {
        page.querySelector('[data-bu-score-detail]').textContent += ' Your five answers are saved to your member account.';
      }).catch(function () {
        page.querySelector('[data-bu-score-detail]').textContent += ' Answers could not be saved yet; keep this page open and check your connection.';
      });
    }
    function refreshCertificate(page) {
      var levelData = getActiveLevel();
      var quote = levelData.quote || { text:'All life is Yoga.',author:'Sri Aurobindo' };
      var certificateCopy = getCertificateCopy(levelData);
      var certificate = page.querySelector('[data-bu-certificate]');
      certificate.style.setProperty('--level-accent',levelData.accent || '#f4a42c');
      certificate.setAttribute('data-level-symbol',levelData.symbol);
      var participantName = progress.name.trim();
      page.querySelector('[data-bu-certificate-ready]').textContent = certificateCopy.ready;
      page.querySelector('[data-bu-certificate-title]').textContent = certificateCopy.title;
      page.querySelector('[data-bu-certificate-name]').textContent = participantName || 'Type your name';
      page.querySelector('[data-bu-certificate-level]').textContent = certificateCopy.body;
      page.querySelector('[data-bu-certificate-quote]').textContent = '“' + quote.text + '”';
      page.querySelector('[data-bu-certificate-author]').textContent = '— ' + quote.author;
      page.querySelector('[data-bu-name]').value = progress.name;
      page.querySelector('[data-bu-action="download-certificate"]').disabled = !participantName;
      var nextButton = page.querySelector('[data-bu-next-level]');
      nextButton.textContent = levelData.number < 30 ? 'Go to next level →' : 'Return to my ascent';
    }
    function downloadCertificate(page) {
      var levelData = getActiveLevel();
      var quote = levelData.quote || { text:'All life is Yoga.',author:'Sri Aurobindo' };
      var certificateCopy = getCertificateCopy(levelData);
      var participant = progress.name.trim();
      if (!participant) {
        var missingNameStatus = page.querySelector('[data-bu-download-status]');
        missingNameStatus.textContent = 'Type your name before downloading the certificate.';
        missingNameStatus.removeAttribute('data-bu-hidden');
        page.querySelector('[data-bu-name]').focus();
        return;
      }
      var canvas = doc.createElement('canvas');
      canvas.width = 1080; canvas.height = 1080;
      var context = canvas.getContext('2d');
      if (!context) return;
      function renderAndSave(logo) {
        function drawWrappedText(text,x,y,maxWidth,lineHeight,maxLines) {
          var words = text.split(/\s+/); var line = ''; var lines = [];
          words.forEach(function (word) {
            var candidate = line ? line + ' ' + word : word;
            if (context.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; }
            else line = candidate;
          });
          if (line) lines.push(line);
          lines.slice(0,maxLines).forEach(function (value,index) { context.fillText(value,x,y + index * lineHeight,maxWidth); });
        }
        var gradient = context.createLinearGradient(0,0,1080,1080);
        gradient.addColorStop(0,'#061a25'); gradient.addColorStop(.58,'#0b3540'); gradient.addColorStop(1,levelData.accent || '#e65d3d');
        context.fillStyle = gradient; context.fillRect(0,0,1080,1080);
        context.globalAlpha = .13; context.fillStyle = levelData.accent || '#f4a42c';
        for (var radius = 95; radius <= 380; radius += 72) { context.beginPath(); context.arc(870,190,radius,0,Math.PI*2); context.strokeStyle = levelData.accent || '#f4a42c'; context.lineWidth = 4; context.stroke(); }
        context.font = '700 330px Georgia'; context.textAlign = 'center'; context.fillText(levelData.symbol,875,965); context.globalAlpha = 1;
        context.strokeStyle = levelData.accent || '#f4c86b'; context.lineWidth = 7; context.strokeRect(55,55,970,970);
        if (logo) {
          context.fillStyle = '#fff'; context.fillRect(465,72,150,120);
          context.drawImage(logo,480,82,120,100);
        }
        context.textAlign = 'center';
        context.fillStyle = '#f4c86b'; context.font = '700 22px Arial'; context.fillText('SRI AUROBINDO SOCIETY, LUCKNOW',540,220);
        context.fillStyle = '#fff'; context.font = '700 50px Georgia'; context.fillText(certificateCopy.title,540,300,900);
        context.fillStyle = 'rgba(255,255,255,.78)'; context.font = '27px Arial'; context.fillText('This certifies that',540,370);
        context.fillStyle = '#fff'; context.font = 'italic 700 54px Georgia'; context.fillText(participant,540,455,850);
        context.strokeStyle = levelData.accent || '#f4c86b'; context.lineWidth = 4; context.beginPath(); context.moveTo(210,480); context.lineTo(870,480); context.stroke();
        context.fillStyle = levelData.accent || '#f4c86b'; context.font = '700 27px Arial'; context.fillText(certificateCopy.label,540,550,900);
        context.fillStyle = '#fff'; context.font = '700 44px Georgia'; context.fillText(certificateCopy.displayTitle,540,615,900);
        context.fillStyle = 'rgba(255,255,255,.82)'; context.font = '25px Arial'; drawWrappedText(certificateCopy.body,540,670,900,34,4);
        context.fillStyle = '#ffedbd'; context.font = 'italic 32px Georgia'; context.fillText('“' + quote.text + '”',540,840,890);
        context.fillStyle = '#f4c86b'; context.font = '700 22px Arial'; context.fillText('— ' + quote.author,540,884);
        context.fillStyle = 'rgba(255,255,255,.68)'; context.font = '700 18px Arial'; context.fillText('THE NEXT HUMAN CHALLENGE · GOMTI NAGAR CENTRE (UC-02)',540,965);
        var dataUrl = canvas.toDataURL('image/png');
        var fileName = 'next-human-challenge-level-' + String(levelData.number).padStart(2,'0') + '-' + participant.split(' ').join('-').toLowerCase() + '.png';
        var bridge = win.SasAndroid || win.parent?.SasAndroid || win.parent?.parent?.SasAndroid;
        if (bridge && typeof bridge.saveCertificate === 'function') bridge.saveCertificate(dataUrl,fileName);
        else { var link = doc.createElement('a'); link.href = dataUrl; link.download = fileName; link.click(); }
        var status = page.querySelector('[data-bu-download-status]');
        status.textContent = 'Certificate saved as ' + fileName + '.';
        status.removeAttribute('data-bu-hidden');
      }
      loadCertificateLogoData().then(function (logoDataUrl) {
        var logo = new win.Image();
        logo.onload = function () { renderAndSave(logo); };
        logo.onerror = function () {
          var status = page.querySelector('[data-bu-download-status]');
          status.textContent = 'The Society logo could not load. Please reopen the certificate and try again.';
          status.removeAttribute('data-bu-hidden');
        };
        logo.src = logoDataUrl;
      }).catch(function () {
        var status = page.querySelector('[data-bu-download-status]');
        status.textContent = 'The Society logo could not load. Please reopen the certificate and try again.';
        status.removeAttribute('data-bu-hidden');
      });
    }
    function prepare() {
      var page = activePage();
      if (!page || page.getAttribute('data-bu-ready') === 'true') return;
      page.setAttribute('data-bu-ready','true');
      var certificateLogo = page.querySelector('[data-bu-certificate-logo]');
      if (certificateLogo) {
        certificateLogo.addEventListener('error',function () {
          if (!certificateLogo.src.endsWith('/public/society-logo.jpg')) certificateLogo.src = '/public/society-logo.jpg';
        });
        loadCertificateLogoData().then(function (logoDataUrl) { certificateLogo.src = logoDataUrl; });
      }
      var introVideo = page.querySelector('.sas-bum-video video');
      if (introVideo) {
        introVideo.muted = true;
        var videoSource = introVideo.getAttribute('data-bu-video-source');
        if (videoSource) {
          win.fetch(videoSource,{ cache:'force-cache' }).then(function (response) {
            if (!response.ok) throw new Error('Video request failed');
            return response.blob();
          }).then(function (videoBlob) {
            var objectUrl = win.URL.createObjectURL(videoBlob);
            introVideo.setAttribute('data-bu-object-url',objectUrl);
            introVideo.src = objectUrl;
            introVideo.load();
            var playback = introVideo.play();
            if (playback && typeof playback.catch === 'function') playback.catch(function () {});
          }).catch(function () {
            introVideo.src = videoSource;
            introVideo.load();
          });
        }
      }
      configureLevel(page,progress.currentLevel);
      showStage(page,'overview');
    }
    prepare();
    syncProgressFromServer();

    app.addEventListener('click',function (event) {
      prepare();
      var button = event.target.closest('[data-bu-action]');
      var page = button?.closest('.sas-bum');
      if (!button || !page) return;
      event.preventDefault();
      var action = button.getAttribute('data-bu-action');
      var notice = page.querySelector('[data-bu-notice]');
      if (action === 'overview') showStage(page,'overview');
      if (action === 'welcome') showStage(page,'welcome');
      if (action === 'start-level') {
        configureLevel(page,progress.currentLevel);
        showStage(page,'welcome');
      }
      if (action === 'enter-level') {
        startAttempt();
        if (attemptQuestions.length < 5) {
          notice.textContent = 'This level could not load its complete question set. Please reopen the challenge.';
          notice.removeAttribute('data-bu-hidden');
          showStage(page,'overview');
        } else { renderQuestion(page); showStage(page,'question'); }
      }
      if (action === 'select-option' && !feedbackLocked) { selectedChoice = button.getAttribute('data-bu-choice') || ''; feedbackLocked = true; renderQuestion(page); }
      if (action === 'next-question' && feedbackLocked) {
        answers.push(selectedChoice); selectedChoice = ''; feedbackLocked = false;
        if (questionIndex < attemptQuestions.length - 1) { questionIndex += 1; renderQuestion(page); }
        else { renderCoach(page); showStage(page,'coach'); }
      }
      if (action === 'retry-level') { startAttempt(); renderQuestion(page); showStage(page,'question'); }
      if (action === 'coach') showStage(page,'coach');
      if (action === 'quote') { page.querySelector('[data-bu-reflection]').value = progress.reflections[activeLevelNumber] || ''; showStage(page,'quote'); }
      if (action === 'complete-level') {
        progress.reflections[activeLevelNumber] = page.querySelector('[data-bu-reflection]').value.trim();
        if (progress.completed.indexOf(activeLevelNumber) < 0) progress.completed.push(activeLevelNumber);
        progress.completed.sort(function (left,right) { return left - right; });
        progress.currentLevel = Math.min(30,activeLevelNumber + 1); saveProgress(); saveReflectionToServer(activeLevelNumber,progress.reflections[activeLevelNumber]); showStage(page,'certificate');
      }
      if (action === 'toggle-levels') {
        var host = page.querySelector('[data-bu-levels]');
        var expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded',String(!expanded));
        button.textContent = expanded ? 'See all 30 levels' : 'Hide all levels';
        if (expanded) host.setAttribute('data-bu-hidden',''); else host.removeAttribute('data-bu-hidden');
      }
      if (action === 'open-level') {
        var number = Number(button.getAttribute('data-bu-level'));
        configureLevel(page,number);
        if (progress.completed.indexOf(number) >= 0) showStage(page,'certificate');
        else if (number === progress.currentLevel) showStage(page,'welcome');
      }
      if (action === 'next-level') {
        if (activeLevelNumber >= 30) showStage(page,'overview');
        else { configureLevel(page,Math.min(30,activeLevelNumber + 1)); showStage(page,'welcome'); }
      }
      if (action === 'download-certificate') { recordCertificateDownload(activeLevelNumber); downloadCertificate(page); }
    });
    app.addEventListener('input',function (event) {
      var page = event.target.closest('.sas-bum');
      if (page && event.target.matches('[data-bu-name]')) {
        progress.name = event.target.value.slice(0,60);
        saveProgress(); refreshCertificate(page);
      }
    });

    var originalBack = win.sasHandleSystemBack;
    win.sasHandleSystemBack = function () {
      var page = activePage();
      if (page) {
        var stageName = page.getAttribute('data-bu-active-stage') || 'overview';
        var host = page.querySelector('[data-bu-levels]');
        if (stageName !== 'overview') { showStage(page,'overview'); return true; }
        if (host && !host.hasAttribute('data-bu-hidden')) {
          host.setAttribute('data-bu-hidden','');
          var toggle = page.querySelector('[data-bu-action="toggle-levels"]');
          toggle.setAttribute('aria-expanded','false'); toggle.textContent = 'See all 30 levels';
          return true;
        }
      }
      if (typeof originalBack === 'function' && originalBack() === true) return true;
      return typeof win.sasReturnToDarshan === 'function' ? win.sasReturnToDarshan() === true : false;
    };
  };
})();
