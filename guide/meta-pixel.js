(() => {
  'use strict';

  const pixelId = '931880797549354';
  const receiptKey = 'guide.meta.lead';

  function initializePixel() {
    if (!window.fbq) {
      const fbq = function () {
        if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
        else fbq.queue.push(arguments);
      };
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      window.fbq = window._fbq = fbq;

      const sdk = document.createElement('script');
      sdk.async = true;
      sdk.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.append(sdk);
    }

    window.fbq('set', 'autoConfig', false, pixelId);
    window.fbq('init', pixelId);
  }

  function trackLead(eventId) {
    window.fbq('trackSingle', pixelId, 'Lead', {}, { eventID: eventId });
  }

  if (document.body.dataset.page === 'thanks') {
    let eventId;
    try {
      eventId = sessionStorage.getItem(receiptKey);
      if (!eventId) return;
      sessionStorage.removeItem(receiptKey);
    } catch {
      return;
    }

    // Consume the receipt before loading the SDK so reloading cannot repeat it.
    initializePixel();
    trackLead(eventId);
    return;
  }

  window.recordGuideLead = eventId => {
    try {
      sessionStorage.setItem(receiptKey, eventId);
    } catch {
      trackLead(eventId);
    }
  };
  initializePixel();
})();
