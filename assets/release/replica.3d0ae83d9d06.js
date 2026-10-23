(() => {
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 768px)');
  const scrollTo = (target) => target?.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
  const menuButton = qs('.js-menu-btn');
  const menu = qs('.js-sp-menu');
  const closeMenu = () => {
    menu?.classList.remove('is-open');
    menuButton?.classList.remove('is-menu-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  };
  menuButton?.setAttribute('aria-label', 'メニュー');
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.addEventListener('click', () => {
    const open = menuButton.classList.toggle('is-menu-open');
    menu?.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  });

  qsa('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (link.matches('.js-trial-popupBtn, .js-download-popupBtn, .js-self-popupBtn')) return;
      const id = link.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      event.preventDefault();
      closeMenu();
      scrollTo(target);
      history.replaceState(null, '', '#' + id);
    });
  });

  let activePopup = null;
  let popupTrigger = null;
  const closePopup = () => {
    if (!activePopup) return;
    activePopup.style.display = 'none';
    activePopup.classList.remove('is-form-open');
    activePopup.setAttribute('aria-hidden', 'true');
    activePopup = null;
    document.body.classList.remove('preview-modal-open');
    popupTrigger?.focus({ preventScroll: true });
  };
  ['trial', 'download', 'self'].forEach((name) => {
    const popup = qs('.js-' + name + '-popup');
    if (!popup) return;
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-label', name === 'trial' ? '無料トライアル' : name === 'download' ? '資料ダウンロード' : 'セルフプラン');
    popup.setAttribute('aria-hidden', 'true');
    qsa('.js-' + name + '-popupBtn').forEach((trigger) => trigger.addEventListener('click', (event) => {
      event.preventDefault();
      closePopup();
      closeMenu();
      activePopup = popup;
      popupTrigger = trigger;
      popup.style.display = 'block';
      popup.classList.add('is-form-open');
      popup.setAttribute('aria-hidden', 'false');
      document.body.classList.add('preview-modal-open');
      qs('input:not([type="hidden"]), button', popup)?.focus({ preventScroll: true });
    }));
    qsa('.js-' + name + '-bg, .pop_close__btn', popup).forEach((closer) => {
      closer.addEventListener('click', closePopup);
      if (closer.matches('.pop_close__btn')) {
        closer.setAttribute('role', 'button');
        closer.setAttribute('aria-label', '閉じる');
        closer.tabIndex = 0;
        closer.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); closePopup(); }
        });
      }
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { closePopup(); closeMenu(); }
    if (event.key !== 'Tab' || !activePopup) return;
    const controls = qsa('a[href], button:not([disabled]), input:not([type="hidden"]), textarea, select, [tabindex="0"]', activePopup).filter((e) => e.getClientRects().length);
    if (!controls.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  qsa('.p-customers__list').forEach((list) => {
    [...list.children].forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      list.appendChild(clone);
    });
  });
  const slides = qsa('.visual .slide .pho');
  let current = 0;
  const showSlide = (index) => {
    slides.forEach((slide, i) => slide.setAttribute('aria-hidden', i === index ? 'false' : 'true'));
    current = index;
  };
  showSlide(0);
  if (slides.length > 1) window.setInterval(() => {
    if (document.hidden || reduceMotion.matches || activePopup) return;
    showSlide((current + 1) % slides.length);
  }, 4400);

  const questions = qsa('.js-faq-accord .c-faq__question');
  const syncFaq = () => questions.forEach((question) => {
    question.tabIndex = mobile.matches ? 0 : -1;
    if (mobile.matches) question.setAttribute('role', 'button'); else question.removeAttribute('role');
    question.setAttribute('aria-expanded', String(!mobile.matches || question.parentElement.classList.contains('is-open')));
  });
  const toggleFaq = (question) => {
    if (!mobile.matches) return;
    const block = question.parentElement;
    const open = block.classList.toggle('is-open');
    block.classList.toggle('is-close', !open);
    syncFaq();
  };
  questions.forEach((question) => {
    question.addEventListener('click', () => toggleFaq(question));
    question.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleFaq(question); }
    });
  });
  mobile.addEventListener('change', syncFaq);
  syncFaq();

  qsa('.js-voice-btn').forEach((button) => button.addEventListener('click', () => {
    const currentAudio = qs('audio', button);
    qsa('.js-voice-btn audio').forEach((audio) => {
      if (audio !== currentAudio) { audio.pause(); audio.currentTime = 0; }
    });
    if (!currentAudio) return;
    if (currentAudio.paused) currentAudio.play().catch(() => {}); else currentAudio.pause();
  }));

})();
