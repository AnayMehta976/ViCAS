/* ViCAS — the test bench. Side view of the LED and panel, at the distances and
   in the conditions from the project file. Every run played the message. */
(function () {
  'use strict';
  const sec = document.querySelector('[data-tests]');
  if (!sec) return;
  const cv = sec.querySelector('[data-bench]');
  const condBtns = Array.from(sec.querySelectorAll('[data-c]'));
  const distBtns = Array.from(sec.querySelectorAll('[data-d]'));
  const tbody = sec.querySelector('[data-grid] tbody');
  const reduce = !!(window.ViCAS && window.ViCAS.reduce);
  const CONDS = [['clear', 'Clear air'], ['fog', 'Fog'], ['rain', 'Rain'], ['mud', 'Mud']];
  const DISTS = [0, 2, 5, 7, 10];

  let cond = 'clear', dist = 10, shown = 10, g, W, H, running = false, filled = false;

  // results grid
  const cellAt = {};
  CONDS.forEach(([k, label]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<th scope="row">${label}</th>` + DISTS.map((d) => `<td data-k="${k}-${d}" aria-label="${label}, ${d} feet: message played"></td>`).join('');
    tbody.appendChild(tr);
    DISTS.forEach((d) => (cellAt[`${k}-${d}`] = tr.querySelector(`[data-k="${k}-${d}"]`)));
  });
  const all = Object.values(cellAt);
  function markNow() { all.forEach((c) => c.classList.remove('is-now')); cellAt[`${cond}-${dist}`].classList.add('is-now'); }
  function fill() {
    if (filled) return; filled = true;
    all.forEach((c, i) => setTimeout(() => c.classList.add('is-pass'), reduce ? 0 : 60 * i));
    setTimeout(markNow, reduce ? 0 : 60 * all.length + 100);
    const n = sec.querySelector('[data-count-to]');
    if (n && window.gsap && !reduce) { const o = { v: 0 }; gsap.to(o, { v: 20, duration: 1.3, ease: 'power2.out', onUpdate: () => (n.textContent = Math.round(o.v)) }); }
  }

  function fit() {
    const dpr = Math.min(2, devicePixelRatio || 1), r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); W = r.width; H = r.height;
  }

  // fixed random shapes so fog, rain and mud don't jump around between frames
  const rnd = (n) => { const s = Math.sin(n * 91.7) * 47453.3; return s - Math.floor(s); };
  const fogBlobs = Array.from({ length: 16 }, (_, i) => ({ x: rnd(i), y: 0.2 + rnd(i + 30) * 0.5, r: 40 + rnd(i + 60) * 70, v: 8 + rnd(i + 90) * 16 }));
  const drops = Array.from({ length: 110 }, (_, i) => ({ x: rnd(i + 5), y: rnd(i + 8), v: 0.8 + rnd(i + 11) * 0.6 }));
  const splats = Array.from({ length: 9 }, (_, i) => ({ x: rnd(i + 200), y: rnd(i + 300), r: 3 + rnd(i + 400) * 7 }));

  function draw(now) {
    if (!running) return;
    const t = now / 1000;
    shown += (dist - shown) * 0.12;
    g.clearRect(0, 0, W, H);
    const benchY = H * 0.74, ledX = Math.max(44, W * 0.08), headY = benchY - H * 0.36;
    const span = W - ledX - 110;
    const px = ledX + 34 + span * (shown / 10);
    // wall + bench
    g.fillStyle = '#1c1b18'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#5a4630'; g.fillRect(0, benchY, W, H - benchY);
    g.fillStyle = '#6b543a'; g.fillRect(0, benchY, W, 6);
    for (let x = 0; x < W; x += 34) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, benchY + 10, 1, H); }
    // LED stand
    g.fillStyle = '#3a3a36'; g.fillRect(ledX - 4, headY, 8, benchY - headY);
    g.fillStyle = '#2b2a26'; g.fillRect(ledX - 16, headY - 14, 30, 28);
    g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(ledX + 14, headY, 7, 0, 7); g.fill();
    // beam
    const fl = reduce ? 1 : 0.86 + Math.random() * 0.14;
    const reach = px - ledX - 14, spread = 10 + reach * 0.16;
    const gr = g.createLinearGradient(ledX + 14, 0, px, 0);
    const dim = cond === 'fog' ? 0.62 : cond === 'rain' ? 0.82 : 1;
    gr.addColorStop(0, `rgba(255,251,232,${0.85 * fl})`); gr.addColorStop(1, `rgba(255,243,194,${0.3 * fl * dim})`);
    g.fillStyle = gr; g.beginPath();
    g.moveTo(ledX + 14, headY - 5); g.lineTo(px, headY - spread); g.lineTo(px, headY + spread); g.lineTo(ledX + 14, headY + 5); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,240,180,.25)'; g.beginPath(); g.arc(ledX + 14, headY, 22, 0, 7); g.fill();
    // panel stand
    const pH = Math.max(48, H * 0.22);
    g.fillStyle = '#3a3a36'; g.fillRect(px + 6, headY, 6, benchY - headY);
    g.fillStyle = '#0d0d0c'; g.fillRect(px - 2, headY - pH / 2 - 3, 14, pH + 6);
    g.fillStyle = '#183a7a'; g.fillRect(px, headY - pH / 2, 10, pH);
    g.fillStyle = `rgba(255,246,207,${0.35 * fl * dim})`; g.fillRect(px, headY - pH / 2, 10, pH);
    if (cond === 'mud') {
      g.fillStyle = '#6b4423';
      splats.forEach((s) => { g.beginPath(); g.ellipse(px + 5 + (s.x - 0.5) * 8, headY - pH / 2 + s.y * pH, s.r * 0.5, s.r, 0, 0, 7); g.fill(); });
    }
    // speaker with rings: the message played
    const sx = px + 46, sy = benchY - 22;
    g.fillStyle = '#131312'; g.fillRect(sx - 14, sy - 14, 28, 36);
    g.fillStyle = '#3a3a36'; g.beginPath(); g.arc(sx, sy + 4, 9, 0, 7); g.fill();
    g.strokeStyle = '#ffc21a'; g.lineWidth = 3; g.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      const p = reduce ? 0.5 : ((t * 1.4 + k * 0.5) % 1);
      g.globalAlpha = 1 - p; g.beginPath(); g.arc(sx, sy + 4, 16 + p * 22, -0.9, 0.9); g.stroke();
    }
    g.globalAlpha = 1;
    // conditions in the air
    if (cond === 'fog') {
      fogBlobs.forEach((b) => {
        const x = ((b.x * (W + 200) + (reduce ? 0 : t * b.v)) % (W + 200)) - 100, y = H * b.y;
        const r = g.createRadialGradient(x, y, 0, x, y, b.r);
        r.addColorStop(0, 'rgba(220,220,214,.2)'); r.addColorStop(1, 'rgba(220,220,214,0)');
        g.fillStyle = r; g.beginPath(); g.arc(x, y, b.r, 0, 7); g.fill();
      });
    } else if (cond === 'rain') {
      g.strokeStyle = 'rgba(160,190,230,.55)'; g.lineWidth = 1.5;
      drops.forEach((d) => {
        const y = ((d.y + (reduce ? 0 : t * d.v)) % 1) * benchY, x = d.x * W;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 12); g.stroke();
      });
    }
    // dimension line
    const dy = benchY + (H - benchY) * 0.55;
    g.strokeStyle = '#ffc21a'; g.fillStyle = '#ffc21a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(ledX + 14, dy); g.lineTo(px + 5, dy); g.stroke();
    [ledX + 14, px + 5].forEach((x) => { g.beginPath(); g.moveTo(x, dy - 7); g.lineTo(x, dy + 7); g.stroke(); });
    const label = `${Math.round(shown * 10) / 10 === dist ? dist : shown.toFixed(1)} ft`;
    g.font = '400 14px Bungee, sans-serif'; g.textAlign = 'center';
    const mx = Math.max(ledX + 40, (ledX + 14 + px + 5) / 2);
    g.fillStyle = '#5a4630'; g.fillRect(mx - 34, dy - 10, 68, 20);
    g.fillStyle = '#ffc21a'; g.fillText(label, mx, dy + 5);
    // labels
    g.font = '500 11px "JetBrains Mono", monospace'; g.fillStyle = '#a8a397'; g.textAlign = 'left';
    g.fillText('LED', ledX - 16, headY - 22);
    g.textAlign = 'center'; g.fillText('PANEL', px + 5, headY - pH / 2 - 10);
    g.fillStyle = '#ffc21a'; g.fillText('PLAYED ✓', Math.min(W - 40, sx), sy - 26);
    requestAnimationFrame(draw);
  }

  function pick(btns, attr, val) { btns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset[attr] === String(val)))); }
  condBtns.forEach((b) => b.addEventListener('click', () => { cond = b.dataset.c; pick(condBtns, 'c', cond); if (filled) markNow(); }));
  distBtns.forEach((b) => b.addEventListener('click', () => { dist = +b.dataset.d; pick(distBtns, 'd', dist); if (filled) markNow(); }));
  [condBtns, distBtns].forEach((set) => set.forEach((b, i) => b.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return; e.preventDefault(); const n = set[(i + d + set.length) % set.length]; n.focus(); n.click();
  })));

  fit(); addEventListener('resize', fit);
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { fill(); if (!running) { running = true; requestAnimationFrame(draw); } }
    else running = false;
  }, { threshold: 0.2 }).observe(cv);
})();
