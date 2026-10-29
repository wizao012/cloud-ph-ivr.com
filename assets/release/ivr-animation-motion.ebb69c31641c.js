(() => {
  const film = document.querySelector('.film');
  const player = document.querySelector('.player');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const textTarget = film.querySelector('.typed-copy');
  const caret = film.querySelector('.typing-caret');
  const toggle = document.querySelector('.play-toggle');
  const seek = document.querySelector('.seek-bar');
  const stepButtons = [...document.querySelectorAll('[data-seek]')];
  const phrases = {
    receive: ['お電話', 'ありがとうございます。'],
    question: ['ご用件を', 'お選びください。'],
    transfer: ['それでは、', '担当者へ', 'おつなぎします。']
  };
  const duration = 17000;
  const reviewTimes = [4100, 9500, 14500];
  let elapsed = reduced.matches ? 9500 : 0;
  let previous = null, raf = null, paused = false, inView = true;
  let lastTextKey = '', lastState = '', lastTime = -1;
  const paths = [...film.querySelectorAll('.routes>svg')].map(svg => ({
    svg, input: svg.querySelector('[data-path="in"]'), output: svg.querySelector('[data-path="out"]'),
    incomingDot: svg.querySelector('.incoming-dot'), token: svg.querySelector('.transfer-token')
  }));
  paths.forEach(path => {
    path.inputLength = path.input.getTotalLength();
    path.outputLength = path.output.getTotalLength();
    path.input.style.strokeDasharray = path.inputLength;
    path.output.style.strokeDasharray = path.outputLength;
  });
  const bound = value => Math.max(0, Math.min(1, value));
  const drawText = (key, localTime, full = false) => {
    const parts = phrases[key] || [];
    const length = parts.join('').length;
    const count = full ? length : Math.min(length, Math.max(0, Math.floor((localTime - 120) / 65)));
    const textKey = `${key}/${count}`;
    if (lastTextKey !== textKey) {
      let left = count;
      const fragment = document.createDocumentFragment();
      parts.forEach(part => {
        const span = document.createElement('span');
        span.className = 'phrase'; span.textContent = part.slice(0, Math.max(0, left));
        left -= part.length; fragment.append(span);
      });
      fragment.append(caret);
      textTarget.replaceChildren(fragment);
      lastTextKey = textKey;
    }
    film.classList.toggle('is-typing', count < length && count > 0);
    film.classList.toggle('is-speaking', count < length || (key === 'receive' && localTime < 2300));
  };
  const render = () => {
    const time = elapsed % duration;
    const phase = time < 5100 ? 1 : time < 10100 ? 2 : 3;
    const scene = time < 1500 ? 'ring' : time < 5100 ? 'receive' : time < 8800 ? 'question' : time < 10100 ? 'select' : time < 13200 ? 'transfer' : 'connected';
    if (scene !== lastState) {
      film.dataset.scene = scene; film.dataset.phase = String(phase);
      film.classList.toggle('has-answered', time >= 1500);
      film.classList.toggle('choices-visible', time >= 6200);
      film.classList.toggle('is-selected', time >= 8800);
      film.classList.toggle('is-transferring', time >= 10100);
      film.classList.toggle('phone-ringing', time >= 12700);
      film.classList.toggle('is-connected', time >= 13200);
      film.querySelectorAll('[data-title]').forEach(title => title.classList.toggle('is-current', Number(title.dataset.title) === phase));
      stepButtons.forEach((button, index) => {
        button.setAttribute('aria-pressed', String(index + 1 === phase));
        button.classList.toggle('is-complete', index + 1 < phase);
      });
      film.querySelector('.voice-state').textContent = phase === 1 ? '受付中' : phase === 2 ? 'ご用件の選択' : 'おつなぎ中';
      lastState = scene;
    }
    // Choice reveals also happen within a scene; keep them tied to the same clock.
    film.classList.toggle('choices-visible', time >= 6200);
    film.classList.toggle('phone-ringing', time >= 12700);
    film.querySelectorAll('.choice').forEach((choice, index) => choice.classList.toggle('is-visible', time >= 6200 + index * 260));
    const key = phase === 1 ? 'receive' : phase === 2 ? 'question' : 'transfer';
    const start = phase === 1 ? 1500 : phase === 2 ? 5100 : 10100;
    drawText(time < 1500 ? '' : key, time - start, reduced.matches);
    const incoming = bound((time - 700) / 1000);
    const outgoing = bound((time - 11300) / 1500);
    paths.forEach(path => {
      path.input.style.strokeDashoffset = path.inputLength * (1 - incoming);
      path.output.style.strokeDashoffset = path.outputLength * (1 - outgoing);
      const inputPoint = path.input.getPointAtLength(path.inputLength * incoming);
      const outputPoint = path.output.getPointAtLength(path.outputLength * outgoing);
      path.incomingDot.setAttribute('transform', `translate(${inputPoint.x} ${inputPoint.y})`);
      path.incomingDot.style.opacity = time >= 700 && time < 1700 ? '1' : '0';
      path.token.setAttribute('transform', `translate(${outputPoint.x} ${outputPoint.y})`);
      path.token.style.opacity = time >= 11300 && time < 12900 ? '1' : '0';
    });
    film.querySelector('.call-state').textContent = time >= 13200 ? '通話中' : time >= 12700 ? '着信中' : '着信待ち';
    const seconds = Math.floor(time / 1000);
    if (seconds !== lastTime) {
      document.querySelector('.time').textContent = `0:${String(seconds).padStart(2, '0')} / 0:17`;
      lastTime = seconds;
    }
    seek.value = String(time);
    seek.setAttribute('aria-valuetext', `${(time / 1000).toFixed(1)}秒、${['音声で受付', '用件を選択', '担当へ接続'][phase - 1]}`);
  };
  const canPlay = () => !paused && !reduced.matches && !document.hidden && inView;
  const tick = now => {
    raf = null;
    if (!canPlay()) { previous = null; return; }
    if (previous !== null) elapsed += Math.min(now - previous, 100);
    previous = now; render(); raf = requestAnimationFrame(tick);
  };
  const sync = () => {
    player.classList.toggle('is-paused', !canPlay());
    player.classList.toggle('is-reduced', reduced.matches);
    toggle.disabled = reduced.matches;
    toggle.setAttribute('aria-label', paused ? 'アニメーションを再生' : 'アニメーションを一時停止');
    toggle.querySelector('.toggle-copy').textContent = paused ? '再生' : '一時停止';
    if (raf !== null) cancelAnimationFrame(raf);
    previous = null;
    raf = canPlay() ? requestAnimationFrame(tick) : null;
  };
  toggle.addEventListener('click', () => { paused = !paused; sync(); });
  document.querySelector('.replay').addEventListener('click', () => {
    elapsed = reduced.matches ? 9500 : 0; paused = false; lastState = ''; lastTextKey = ''; render(); sync();
  });
  stepButtons.forEach((button, index) => button.addEventListener('click', () => {
    elapsed = reviewTimes[index]; paused = true; render(); sync();
  }));
  seek.addEventListener('input', () => { elapsed = Math.min(16999, Number(seek.value)); paused = true; render(); sync(); });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => {
    if (reduced.matches) elapsed = 9500;
    render(); sync();
  });
  new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }, { threshold: .12 }).observe(film);
  render(); sync();
})();
