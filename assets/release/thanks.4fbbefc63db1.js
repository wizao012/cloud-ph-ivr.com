(() => {
  'use strict';
  const receipt = window.CPLeadTracking?.readReceipt();
  const title = document.getElementById('thanks-title');
  const status = document.getElementById('thanks-status');
  const message = document.getElementById('thanks-message');
  const acknowledgedFallback = new URLSearchParams(window.location.search).get('received') === '1';
  if (!receipt && !acknowledgedFallback) {
    document.body.dataset.receiptState = 'direct';
    title.textContent = 'お問い合わせについて';
    message.textContent = 'お問い合わせは、トップページのフォームからお願いいたします。';
    return;
  }
  document.body.dataset.receiptState = 'success';
  status.textContent = '送信が完了しました';
  if (receipt?.inquiry_type === 'trial') {
    message.textContent = '30日間無料トライアルに関するお問い合わせを受け付けました。内容を確認のうえ、担当者よりご連絡いたします。';
  }
  // A receipt-less fallback can display completion but must never create an unverified lead event.
  if (!receipt || !window.CPLeadTracking.claimReceipt(receipt.submission_id)) return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'generate_lead',
      form_id: receipt.form_id,
      inquiry_type: receipt.inquiry_type,
      lead_id: receipt.submission_id,
      transaction_id: receipt.submission_id,
      utm_source: receipt.utm_source,
      utm_medium: receipt.utm_medium,
      utm_campaign: receipt.utm_campaign
    });
  } catch {
    // Analytics must not interrupt a completed inquiry or change its confirmation.
  }
})();
