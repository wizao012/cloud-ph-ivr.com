(() => {
  const player = document.querySelector('.player');
  const report = () => parent.postMessage({
    type: 'cp-explainer-height', width: innerWidth,
    height: Math.ceil(player.getBoundingClientRect().height)
  }, location.origin);
  new ResizeObserver(report).observe(player);
  addEventListener('load', report);
  addEventListener('resize', report);
  document.fonts.ready.then(report);
  report();
})();
