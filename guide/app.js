(() => {
  'use strict';

  const FORM_TYPE = 'guide_download';
  const FORM_ID = 'phone-guide-download';
  const POLICY_URL = 'https://012grp.co.jp/policy';
  const DOWNLOAD_URL = 'https://cloud-ph-ivr.com/guide/downloads/phone-workplace-guide.pdf';
  const REQUEST_TIMEOUT_MS = 20000;
  const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const META_SOURCES = ['meta', 'facebook', 'fb', 'instagram', 'ig', 'messenger', 'threads', 'an'];
  const FIELD_RULES = [
    ['company', '会社名をご入力ください。'],
    ['family-name', '姓をご入力ください。'],
    ['given-name', '名をご入力ください。'],
    ['email', 'メールアドレスをご入力ください。'],
    ['phone', '電話番号をご入力ください。'],
    ['consent', 'プライバシーポリシーへの同意が必要です。']
  ];

  function getAttribution() {
    const query = new URLSearchParams(window.location.search);
    const utm = {};
    for (const field of UTM_FIELDS) {
      utm[field] = (query.get(field) || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 300);
    }

    const source = utm.utm_source.toLowerCase();
    if (source) return { ...utm, lead_source: META_SOURCES.includes(source) ? 'meta' : 'other' };

    // Meta sometimes appends a click ID even if campaign UTMs are absent.
    if (query.get('fbclid')) return { ...utm, lead_source: 'meta' };
    if (document.referrer) {
      const referrer = new URL(document.referrer);
      const isMeta = ['facebook.com', 'instagram.com', 'messenger.com', 'threads.net', 'threads.com', 'fb.com']
        .some(domain => referrer.hostname === domain || referrer.hostname.endsWith('.' + domain));
      if (isMeta) return { ...utm, lead_source: 'meta' };
      if (referrer.origin !== window.location.origin) return { ...utm, lead_source: 'other' };
    }
    return { ...utm, lead_source: 'direct' };
  }

  function createSubmissionId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  const form = document.getElementById('download-form');
  if (!form) return;
  const endpoint = new URL(form.action);
  if (endpoint.origin !== 'https://hooks.zapier.com' || !endpoint.pathname.startsWith('/hooks/catch/')) return;

  const button = document.getElementById('download-submit');
  const status = document.getElementById('form-status');
  const initialLabel = button.textContent;
  const inputs = Array.from(form.querySelectorAll('input'));
  const attribution = getAttribution();
  let submitting = false;
  let submission = null;

  function setError(id, text) {
    const field = document.getElementById(id);
    const message = document.getElementById(id + '-error');
    message.textContent = text;
    if (text) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', message.id);
    } else {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    }
  }

  function validate() {
    let firstInvalid = null;
    for (const [id, missingMessage] of FIELD_RULES) {
      const input = document.getElementById(id);
      let error = '';
      if (input.type === 'checkbox') {
        if (!input.checked) error = missingMessage;
      } else {
        input.value = input.value.trim();
        if (!input.value) error = missingMessage;
        else if (input.value.length > input.maxLength) error = '入力内容が長すぎます。';
        else if (input.type === 'email' && (input.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value))) {
          error = 'メールアドレスの形式をご確認ください。';
        } else if (input.type === 'tel') {
          input.value = input.value.normalize('NFKC');
          const digitCount = input.value.replace(/\D/g, '').length;
          if (!/^\+?[\d\s().-]+$/.test(input.value) || digitCount < 8 || digitCount > 15) {
            error = '電話番号を数字とハイフンなどで入力してください。';
          }
        }
      }
      setError(id, error);
      if (error && !firstInvalid) firstInvalid = input;
    }
    return firstInvalid;
  }

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  }

  function setSubmitting(value) {
    submitting = value;
    button.disabled = value;
    for (const input of inputs) input.disabled = value;
    form.setAttribute('aria-busy', String(value));
    button.textContent = value ? '送信しています…' : initialLabel;
  }

  function makePayload() {
    const fields = new FormData(form);
    const sourceLabel = { meta: 'Meta', other: 'その他', direct: '直接・流入元不明' }[attribution.lead_source];
    return {
      company: fields.get('company'),
      name: fields.get('name'),
      name02: fields.get('name02'),
      email: fields.get('email'),
      tel: fields.get('tel'),
      inquiry: '',
      inquiry_type: FORM_TYPE,
      form_type_label: '資料DLフォーム',
      form_id: FORM_ID,
      lead_source_label: sourceLabel,
      page_url: window.location.origin + window.location.pathname,
      download_url: DOWNLOAD_URL,
      privacy_consent: String(fields.has('consent')),
      marketing_opt_in: String(fields.has('marketing_opt_in')),
      consent_policy_url: POLICY_URL,
      ...attribution
    };
  }

  function clearFieldError(event) {
    const id = event.target.id;
    if (FIELD_RULES.some(([fieldId]) => fieldId === id)) setError(id, '');
  }
  form.addEventListener('input', clearFieldError);
  form.addEventListener('change', clearFieldError);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    setStatus('');

    const invalid = validate();
    if (invalid) {
      setStatus('入力内容をご確認ください。', true);
      invalid.focus();
      return;
    }
    if (document.getElementById('website').value) {
      setStatus('送信できませんでした。入力内容をご確認ください。', true);
      return;
    }

    const payload = makePayload();
    const signature = JSON.stringify(payload);
    if (submission?.signature !== signature) {
      submission = { signature, id: createSubmissionId(), at: new Date().toISOString() };
    }
    payload.submission_id = submission.id;
    payload.submitted_at = submission.at;

    setSubmitting(true);
    setStatus('送信しています。このままお待ちください。');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      // Match the existing site’s URL-encoded Catch Hook request.
      const response = await fetch(endpoint.href, {
        method: 'POST',
        credentials: 'omit',
        body: new URLSearchParams(payload),
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Webhook delivery failed');

      form.reset();
      window.location.assign('thanks.html');
    } catch (error) {
      setStatus(
        error.name === 'AbortError'
          ? '送信結果を確認できませんでした。時間をおいてもう一度お試しください。'
          : '送信できませんでした。時間をおいてもう一度お試しください。',
        true
      );
      setSubmitting(false);
      status.focus({ preventScroll: true });
    } finally {
      window.clearTimeout(timeout);
    }
  });

  button.disabled = false;
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    setSubmitting(false);
    setStatus('');
  });
})();
