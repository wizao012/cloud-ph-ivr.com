(() => {
  const dialog = document.querySelector('#sample-dialog');
  const links = document.querySelectorAll('[data-preview]');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const title = dialog.querySelector('#sample-dialog-title');
  const content = dialog.querySelector('.dialog-content');
  const close = dialog.querySelector('.dialog-close');
  let trigger;

  for (const link of links) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const preview = document.querySelector(link.dataset.preview);
      if (!preview) return;
      event.preventDefault();
      trigger = link;
      title.textContent = preview.dataset.title;
      dialog.dataset.layout = preview.id;
      content.replaceChildren(preview.content.cloneNode(true));
      dialog.showModal();
    });
  }

  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (dialog.returnValue !== 'download') trigger?.focus({ preventScroll: true });
    dialog.returnValue = '';
  });
  dialog.querySelector('.dialog-download').addEventListener('click', event => {
    event.preventDefault();
    dialog.close('download');
    document.querySelector('#download').scrollIntoView({ block: 'start' });
    document.querySelector('#form-title').focus({ preventScroll: true });
  });
})();
