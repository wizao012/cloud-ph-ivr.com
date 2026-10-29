(() => {
  const host = document.querySelector('.ed-explainer-visual');
  const frame = host?.querySelector('.ed-explainer-frame');
  if (!host || !frame) return;
  const sizes = new Map([[720, 610], [360, 375]]);
  let logicalWidth = 720;
  const resize = () => {
    const available = host.clientWidth;
    logicalWidth = matchMedia('(max-width:768px)').matches || available < 410 ? 360 : 720;
    const height = sizes.get(logicalWidth);
    const scale = available / logicalWidth;
    frame.style.width = logicalWidth + 'px';
    frame.style.height = height + 'px';
    frame.style.transform = `scale(${scale})`;
    host.style.height = Math.ceil(height * scale) + 'px';
  };
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'cp-explainer-height') return;
    const height = Number(event.data.height);
    const width = Number(event.data.width);
    if (!Number.isFinite(height) || height < 100 || height > 2000 || ![360, 720].includes(width)) return;
    sizes.set(width, Math.ceil(height));
    if (width === logicalWidth) resize();
  });
  new ResizeObserver(resize).observe(host);
  window.addEventListener('resize', resize);
  frame.addEventListener('load', resize);
  resize();
})();
