(() => {
  'use strict';
  // Fixed B design for the LP; proposal selection and URL fragments stay untouched.
  const hero = document.querySelector('#cp-character-hero');
  const theatre = hero?.querySelector('.paper-theatre');
  if (!theatre) return;
  const track = theatre.querySelector('.paper-track');
  const stepButtons = [...theatre.querySelectorAll('[data-step]')];
  const pauseButton = theatre.querySelector('.pause-button');
  const replayButton = theatre.querySelector('.replay-button');
  if (!track || !pauseButton || !replayButton || stepButtons.length !== 3) return;
  const sourceFor = id => document.querySelector(id)?.src;
  const characterSource = sourceFor('#cloud-character-source');
  const idleSource = sourceFor('#cloud-idle-source');
  const handsetSource = sourceFor('#cloud-handset-source');
  const restingHandsetSource = sourceFor('#cloud-handset-rest-source');
  if (![characterSource, idleSource, handsetSource, restingHandsetSource].every(Boolean)) return;
  const fallbackSlide = track.firstElementChild?.cloneNode(true);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const interval = 6400;
  const design = 'b';
  let current = 0;
  let paused = reducedMotion.matches;
  let activeSlide;
  let slideTimer;
  let typingTimer;
  let wrapTimer;
  let sceneElapsed = 0;
  let sceneStarted = 0;
  let clockRunning = false;
  const greetingStartsAt = 2700;
  const titles = ['不在時も、音声で受付。', '用件に合わせて振り分け。', '担当者のスマホへ転送。'];
  const guidance = ['お電話ありがとうございます。', 'ご用件の番号を押してください。', '担当者へおつなぎします。'];
  const guidancePhrases = [
    ['お電話', 'ありがとうございます。'],
    ['ご用件の番号を', '押してください。'],
    ['担当者へ', 'おつなぎします。']
  ];
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const speech = text => `<div class="cm-speech"><p data-typing="${text}"><span class="cm-sr-text">${text}</span><span class="typed-text" aria-hidden="true">${text}</span><i class="typing-caret" aria-hidden="true"></i></p></div>`;
  const mascot = () => '<figure class="cm-mascot-wrap"><img class="cloud-mascot" width="768" height="768" alt="電話に応答する雲のキャラクター"></figure>';
  const routes = () => '<div class="cm-routes"><ul class="cm-route-list"><li><b>1</b><span>お問い合わせ</span></li><li class="cm-selected"><b>2</b><span>ご契約中の方</span></li><li><b>3</b><span>その他の用件</span></li></ul></div>';
  const phone = () => `<div class="cm-mobile"><div class="cm-call-disc">${icon('handset')}</div><strong>担当者の<br>スマホへ</strong></div>`;
  const path = '<span class="cm-transfer-path" aria-hidden="true"></span>';
  const reception = () => `<div class="cm-stage cm-reception cm-pickup-reception">${speech(guidance[0])}<div class="pickup-scene" role="img" aria-label="固定電話が鳴り、受話器が持ち上がって音声応答を開始します。"><span class="pickup-reach-arm" aria-hidden="true"></span><div class="pickup-cloud"><img class="pickup-idle" width="768" height="768" alt=""></div><div class="pickup-receiver"><img class="pickup-receiver-bare" width="667" height="800" alt=""><img class="pickup-receiver-image" width="667" height="800" alt=""></div><div class="pickup-desk" aria-hidden="true"><i class="pickup-cradle-left"></i><i class="pickup-cradle-right"></i><span class="pickup-desk-display"></span><span class="pickup-desk-keys">${'<i></i>'.repeat(6)}</span></div><span class="pickup-ring pickup-ring-left" aria-hidden="true"></span><span class="pickup-ring pickup-ring-right" aria-hidden="true"></span></div></div>`;

  function contentFor(step) {
    if (step === 0) return reception();
    return `<div class="cm-simple-scene cm-simple-${step === 1 ? 'routing' : 'transfer'}">${speech(guidance[step])}<div class="cm-simple-diagram">${mascot()}${step === 1 ? routes() : path + phone()}</div></div>`;
  }

  function stopTimers() {
    clearTimeout(slideTimer);
    clearTimeout(typingTimer);
    clearTimeout(wrapTimer);
  }

  function elapsedTime() {
    return sceneElapsed + (clockRunning ? performance.now() - sceneStarted : 0);
  }

  function freezeClock() {
    sceneElapsed = elapsedTime();
    clockRunning = false;
  }

  function startClock() {
    sceneStarted = performance.now();
    clockRunning = !paused && !reducedMotion.matches && !document.hidden;
  }

  function writeTyped(line, count) {
    const phrases = guidancePhrases[guidance.indexOf(line.dataset.typing)];
    const target = line.querySelector('.typed-text');
    if (!target.querySelector('.cm-phrase')) {
      target.replaceChildren(...phrases.map(() => {
        const phrase = document.createElement('span');
        phrase.className = 'cm-phrase';
        return phrase;
      }));
    }
    let remaining = count;
    [...target.children].forEach((part, index) => {
      part.textContent = phrases[index].slice(0, Math.max(0, remaining));
      remaining -= phrases[index].length;
    });
  }

  // The final slide is a clone of step 1. Always return it to the real step 1,
  // including when the user pauses during the transition or hides the tab.
  function normalizeWrap() {
    if (activeSlide !== track.children[3]) return;
    const typed = activeSlide.querySelector('.typed-text').textContent;
    const wasTyping = activeSlide.querySelector('[data-typing]').classList.contains('is-typing');
    activeSlide.classList.remove('is-active');
    activeSlide.setAttribute('aria-hidden', 'true');
    activeSlide = track.firstElementChild;
    activeSlide.style.setProperty('--receipt-delay', `${-elapsedTime()}ms`);
    activeSlide.classList.add('is-active', 'is-wrap-return');
    activeSlide.setAttribute('aria-hidden', 'false');
    writeTyped(activeSlide.querySelector('[data-typing]'), typed.length);
    activeSlide.querySelector('[data-typing]').classList.toggle('is-typing', wasTyping);
    track.style.transition = 'none';
    track.style.transform = 'translateX(0%)';
  }

  function typeCurrent(resume = false) {
    clearTimeout(typingTimer);
    const line = activeSlide.querySelector('[data-typing]');
    const text = line.dataset.typing;
    const target = line.querySelector('.typed-text');
    if (paused || reducedMotion.matches) {
      writeTyped(line, text.length);
      line.classList.remove('is-typing');
      return;
    }
    let cursor = resume ? target.textContent.length : 0;
    writeTyped(line, cursor);
    line.classList.toggle('is-typing', cursor < text.length);
    function tick() {
      if (paused || document.hidden) return;
      writeTyped(line, ++cursor);
      if (cursor < text.length) typingTimer = setTimeout(tick, 65);
      else line.classList.remove('is-typing');
    }
    const delay = current === 0
      ? Math.max(0, greetingStartsAt - elapsedTime())
      : resume ? 65 : 320;
    if (cursor < text.length) typingTimer = setTimeout(tick, delay);
  }

  function schedule() {
    clearTimeout(slideTimer);
    if (!paused && !reducedMotion.matches && !document.hidden) {
      slideTimer = setTimeout(() => activate((current + 1) % 3, true, current === 2), Math.max(0, interval - elapsedTime()));
    }
  }

  function activate(index, animate = true, wrap = false) {
    stopTimers();
    current = index;
    const position = wrap && !reducedMotion.matches ? 3 : index;
    track.style.transition = !animate || reducedMotion.matches ? 'none' : '';
    track.style.transform = `translateX(-${position * 100}%)`;
    [...track.children].forEach((slide, i) => {
      slide.classList.remove('is-wrap-return', 'is-active', 'is-static-receipt');
      slide.style.setProperty('--receipt-delay', '0ms');
      slide.setAttribute('aria-hidden', 'true');
    });
    // Flush the previous animation before replaying the same reception scene.
    void track.offsetWidth;
    activeSlide = track.children[position];
    activeSlide.classList.add('is-active');
    activeSlide.classList.toggle('is-static-receipt', current === 0 && (paused || reducedMotion.matches));
    activeSlide.setAttribute('aria-hidden', 'false');
    sceneElapsed = 0;
    startClock();
    stepButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === current)));
    typeCurrent();
    if (position === 3) {
      wrapTimer = setTimeout(() => {
        normalizeWrap();
        typeCurrent(true);
      }, 680);
    }
    schedule();
  }

  function build() {
    stopTimers();
    // Prepare the entire animation before replacing the server-rendered first scene.
    // A missing or failed script therefore leaves a complete, readable diagram.
    const template = document.createElement('template');
    template.innerHTML = titles.map((title, i) => `<article class="paper-slide${i === 0 ? ' is-reception' : ''}" aria-hidden="true"><div class="scene-heading"><h2>${title}</h2></div><div class="scene-content">${contentFor(i)}</div></article>`).join('');
    const slides = template.content;
    slides.append(slides.firstElementChild.cloneNode(true));
    slides.querySelectorAll('.cloud-mascot').forEach(image => { image.src = characterSource; });
    slides.querySelectorAll('.pickup-idle').forEach(image => { image.src = idleSource; });
    slides.querySelectorAll('.pickup-receiver-bare').forEach(image => { image.src = restingHandsetSource; });
    slides.querySelectorAll('.pickup-receiver-image').forEach(image => { image.src = handsetSource; });
    track.replaceChildren(slides);
    theatre.dataset.design = design;
    activate(0, false);
  }

  function updatePause() {
    theatre.classList.toggle('is-paused', paused);
    theatre.classList.toggle('is-hidden', document.hidden);
    pauseButton.textContent = paused ? '再生する' : '一時停止';
    pauseButton.setAttribute('aria-label', paused ? 'アニメーションを再生' : 'アニメーションを一時停止');
    pauseButton.disabled = reducedMotion.matches;
  }

  try {
    updatePause();
    build();
  } catch {
    stopTimers();
    if (fallbackSlide) track.replaceChildren(fallbackSlide);
    track.style.transition = 'none';
    track.style.transform = 'translateX(0%)';
    [...stepButtons, pauseButton, replayButton].forEach(button => { button.disabled = true; });
    return;
  }

  stepButtons.forEach(button => button.addEventListener('click', () => activate(Number(button.dataset.step), !paused)));
  pauseButton.addEventListener('click', () => {
    freezeClock();
    stopTimers();
    paused = !paused;
    updatePause();
    normalizeWrap();
    if (!paused) {
      if (activeSlide.classList.contains('is-static-receipt')) {
        activate(0, false);
        return;
      }
      startClock();
      typeCurrent(true);
      schedule();
    }
  });
  replayButton.addEventListener('click', () => {
    paused = reducedMotion.matches;
    updatePause();
    activate(0);
  });
  document.addEventListener('visibilitychange', () => {
    freezeClock();
    stopTimers();
    theatre.classList.toggle('is-hidden', document.hidden);
    normalizeWrap();
    if (!document.hidden && !paused) {
      startClock();
      typeCurrent(true);
      schedule();
    }
  });
  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    updatePause();
    activate(current, false);
  });
  theatre.classList.add('is-ready');
  [...stepButtons, replayButton].forEach(button => { button.disabled = false; });
})();
