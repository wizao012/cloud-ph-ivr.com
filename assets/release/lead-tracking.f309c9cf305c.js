(() => {
  'use strict';
  const ATTRIBUTION_KEY = 'cp_lead_attribution_v1';
  const RECEIPT_KEY = 'cp_lead_receipt_v1';
  const ATTRIBUTION_TTL = 24 * 60 * 60 * 1000;
  const RECEIPT_TTL = 30 * 60 * 1000;
  const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const clean = (value) => String(value || '').trim().slice(0, 300);
  const emptyAttribution = () => Object.fromEntries(UTM_FIELDS.map((key) => [key, '']));
  const read = (key) => {
    try { return JSON.parse(window.sessionStorage.getItem(key) || 'null'); }
    catch { return null; }
  };
  const write = (key, value) => {
    try { window.sessionStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  };
  const query = new URLSearchParams(window.location.search);
  let attribution = emptyAttribution();
  if (UTM_FIELDS.some((key) => query.has(key))) {
    // A new tagged landing replaces the campaign as a unit, avoiding mixed sources.
    UTM_FIELDS.forEach((key) => { attribution[key] = clean(query.get(key)); });
    write(ATTRIBUTION_KEY, { values: attribution, saved_at: Date.now() });
  } else {
    const previous = read(ATTRIBUTION_KEY);
    if (previous && Number.isFinite(previous.saved_at) && Date.now() - previous.saved_at >= 0 && Date.now() - previous.saved_at <= ATTRIBUTION_TTL) {
      UTM_FIELDS.forEach((key) => { attribution[key] = clean(previous.values?.[key]); });
    }
  }

  const readReceipt = () => {
    const receipt = read(RECEIPT_KEY);
    if (!receipt || receipt.accepted !== true || !/^[a-f\d-]{36}$/i.test(receipt.submission_id || '')) return null;
    const age = Date.now() - receipt.accepted_at;
    if (!Number.isFinite(age) || age < 0 || age > RECEIPT_TTL) return null;
    if (!['trial', 'consultation'].includes(receipt.inquiry_type)) return null;
    return receipt;
  };
  const saveReceipt = (payload) => {
    // No name, email, phone number or free text is persisted for analytics.
    const receipt = {
      accepted: true,
      submission_id: String(payload.submission_id),
      form_id: String(payload.form_id),
      inquiry_type: payload.inquiry_type,
      accepted_at: Date.now(),
      tracked_at: null,
      utm_source: clean(payload.utm_source),
      utm_medium: clean(payload.utm_medium),
      utm_campaign: clean(payload.utm_campaign)
    };
    return write(RECEIPT_KEY, receipt);
  };
  const claimReceipt = (id) => {
    const receipt = readReceipt();
    if (!receipt || receipt.submission_id !== id || receipt.tracked_at !== null) return false;
    receipt.tracked_at = Date.now();
    // Claim before pushing so reload, back/forward or duplicate initialization cannot count twice.
    return write(RECEIPT_KEY, receipt);
  };
  window.CPLeadTracking = Object.freeze({
    getAttribution: () => ({ ...attribution }),
    saveReceipt,
    readReceipt,
    claimReceipt
  });
})();
