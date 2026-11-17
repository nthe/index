(() => {
  const root = document.documentElement;
  let theme = 'light';
  try { if (localStorage.getItem('nthe-theme') === 'dark') theme = 'dark'; } catch (_) {}
  root.dataset.theme = theme;
  const home = new URL('../', document.currentScript.src).href;
  const tracker = document.createElement('script');
  tracker.async = true;
  tracker.src = 'https://umami.ttdev.xyz/script.js';
  tracker.dataset.websiteId = 'db465713-3cda-47fb-aff7-ca21d3ea764f';
  document.head.append(tracker);

  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div');
    bar.className = 'site-theme-bar';
    const brand = document.createElement('a');
    brand.className = 'site-brand';
    brand.href = home;
    brand.textContent = '>_ nthe';
    const button = document.createElement('button');
    button.className = 'theme-switch';
    button.type = 'button';
    const update = () => {
      const dark = root.dataset.theme === 'dark';
      const label = `Switch to ${dark ? 'light' : 'dark'} mode`;
      button.setAttribute('aria-label', label);
      button.title = label;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.7');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', dark
        ? 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'
        : 'M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z');
      svg.append(path);
      button.replaceChildren(svg);
    };
    button.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('nthe-theme', root.dataset.theme); } catch (_) {}
      update();
    });
    update();
    bar.append(brand, button);
    document.body.prepend(bar);
  });
})();
