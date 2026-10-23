(() => {
  'use strict';

  const WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/12525485/41snd0t/';
  const REQUEST_TIMEOUT_MS = 20000;
  const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const TEXT_FIELDS = ['company', 'name', 'name02', 'tel', 'email', 'inquiry'];

  const createSubmissionId = () => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };

  document.querySelectorAll('form[data-lead-form]').forEach((form) => {
    const inputFields = [...form.querySelectorAll('input:not([type="hidden"]), textarea, select')];
    const invalidRows = [...form.querySelectorAll('.js-entry-btn:not(.is-entry)')];
    const validRows = [...form.querySelectorAll('.js-entry-btn.is-entry')];
    const submitButtons = [...form.querySelectorAll('button[type="submit"]')];
    const originalLabels = submitButtons.map((button) => button.textContent.trim());
    let state = 'idle';
    let submission = null;

    const feedbackHost = form.querySelector('.p-form__inner, .c-form__inner') || form;
    const status = document.createElement('p');
    status.className = 'cp-lead-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('tabindex', '-1');
    status.hidden = true;
    feedbackHost.appendChild(status);
    const error = document.createElement('p');
    error.className = 'cp-lead-error';
    error.setAttribute('role', 'alert');
    error.setAttribute('tabindex', '-1');
    error.hidden = true;
    feedbackHost.appendChild(error);

    const validateFields = () => {
      inputFields.forEach((field) => {
        field.setCustomValidity('');
        if (field.type === 'radio' || field.type === 'checkbox') return;
        const value = field.value.trim();
        if (field.required && !value) {
          field.setCustomValidity('この項目を入力してください。');
        } else if (field.name === 'tel' && value) {
          const normalized = value.normalize('NFKC');
          const digitCount = normalized.replace(/\D/g, '').length;
          if (!/^[+\d\s()\-]+$/.test(normalized) || digitCount < 8 || digitCount > 15) {
            field.setCustomValidity('電話番号を数字とハイフンで入力してください。');
          }
        }
      });
      return form.checkValidity();
    };

    const refresh = () => {
      const valid = validateFields();
      const locked = state === 'pending' || state === 'success';
      invalidRows.forEach((row) => {
        row.style.display = !valid && !locked ? '' : 'none';
        row.querySelectorAll('button').forEach((button) => { button.disabled = true; });
      });
      validRows.forEach((row) => { row.style.display = valid || locked ? '' : 'none'; });
      submitButtons.forEach((button, index) => {
        button.disabled = !valid || locked;
        const label = state === 'pending' ? '送信中…' : state === 'success' ? '送信済み' : originalLabels[index];
        const span = button.querySelector('span');
        if (span) span.textContent = label; else button.textContent = label;
      });
      form.setAttribute('aria-busy', state === 'pending' ? 'true' : 'false');
    };

    const getPayload = () => {
      const data = new FormData(form);
      const payload = {};
      TEXT_FIELDS.forEach((key) => { payload[key] = String(data.get(key) || '').trim(); });
      payload.inquiry_type = form.dataset.leadForm === 'trial' || data.get('inquiry_type') === 'trial'
        ? 'trial' : 'consultation';
      payload.form_id = form.id;
      payload.page_url = window.location.origin + window.location.pathname;
      const attribution = window.CPLeadTracking?.getAttribution() || {};
      const query = new URLSearchParams(window.location.search);
      UTM_FIELDS.forEach((key) => {
        payload[key] = String(attribution[key] ?? query.get(key) ?? '').trim().slice(0, 300);
      });
      return payload;
    };

    const handleEdit = () => {
      if (state === 'pending' || state === 'success') return;
      submission = null;
      if (state === 'error') {
        state = 'idle';
        error.hidden = true;
        error.textContent = '';
      }
      refresh();
    };
    form.addEventListener('input', handleEdit);
    form.addEventListener('change', handleEdit);
    inputFields.forEach((field) => field.addEventListener('blur', () => {
      if (field.type !== 'radio' && field.type !== 'checkbox') field.value = field.value.trim();
      refresh();
    }));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (state === 'pending' || state === 'success') return;
      inputFields.forEach((field) => {
        if (field.type !== 'radio' && field.type !== 'checkbox') field.value = field.value.trim();
      });
      if (!validateFields()) {
        form.reportValidity();
        refresh();
        return;
      }

      const payload = getPayload();
      const signature = JSON.stringify(payload);
      if (!submission || submission.signature !== signature) {
        submission = {
          signature,
          id: createSubmissionId(),
          submittedAt: new Date().toISOString()
        };
      }
      payload.submission_id = submission.id;
      payload.submitted_at = submission.submittedAt;
      state = 'pending';
      error.hidden = true;
      error.textContent = '';
      status.hidden = false;
      status.classList.remove('is-success');
      status.textContent = '送信しています。このまましばらくお待ちください。';
      // Lock editable fields after collecting the payload so an in-flight request
      // and the visible confirmation cannot refer to different contact details.
      inputFields.forEach((field) => { field.disabled = true; });
      refresh();
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        // Let the browser choose the form-encoded Content-Type. Custom headers
        // would trigger an unnecessary cross-origin preflight on the catch hook.
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          credentials: 'omit',
          body: new URLSearchParams(payload),
          signal: controller.signal
        });
        if (!response.ok) throw new Error('Webhook delivery failed');
        state = 'success';
        status.classList.add('is-success');
        status.textContent = payload.inquiry_type === 'trial'
          ? '30日間無料トライアルに関するお問い合わせを受け付けました。担当者よりご連絡いたします。'
          : 'お問い合わせを受け付けました。担当者よりご連絡いたします。';
        refresh();
        status.focus({ preventScroll: true });
        let receiptSaved = false;
        try { receiptSaved = window.CPLeadTracking?.saveReceipt(payload) === true; }
        catch { /* Confirmation still works when browser storage is unavailable. */ }
        // Only a confirmed webhook receipt can start the thank-you transition.
        const thanksUrl = new URL('thanks.html', window.location.href);
        thanksUrl.search = receiptSaved ? '' : '?received=1';
        thanksUrl.hash = '';
        window.location.assign(thanksUrl.href);
      } catch (requestError) {
        state = 'error';
        inputFields.forEach((field) => { field.disabled = false; });
        status.hidden = true;
        status.textContent = '';
        error.hidden = false;
        error.textContent = requestError.name === 'AbortError'
          ? '送信結果を確認できませんでした。入力内容は保持されています。通信環境をご確認のうえ、もう一度送信してください。'
          : '送信できませんでした。入力内容は保持されています。時間をおいて、もう一度送信してください。';
        refresh();
        error.focus({ preventScroll: true });
      } finally {
        window.clearTimeout(timeout);
      }
    });
    refresh();
  });
})();
