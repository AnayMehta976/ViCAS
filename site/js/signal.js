/* ViCAS — "Voice in. Light across. Voice out."
   One continuous signal is drawn under the six stages. Under each stage it takes
   the shape it really has at that point in the circuit. */
(function () {
  'use strict';
  const sec = document.querySelector('[data-signal]');
  if (!sec) return;
  const V = window.ViCAS || {};
  const track = sec.querySelector('[data-signal-track]');
  const pin = sec.querySelector('[data-signal-pin]');
  const canvas = sec.querySelector('[data-signal-canvas]');
  const stages = Array.from(sec.querySelectorAll('[data-stage]'));
  const NAMES = ['KEY PRESS', '8-BIT SAMPLES', 'PWM PULSES · PIN 9', 'LIGHT', 'PANEL VOLTAGE', 'AMPLIFIED SOUND'];
  const COL = ['#f3eee2', '#7fa6ff', '#ffc21a', '#fff6cf', '#7fa6ff', '#ffc21a'];
  const reduce = !!V.reduce;

  /* a speech-like signal: syllable envelope × a few harmonics */
  function speech(u) {
    const env = Math.pow(Math.max(0, Math.sin(u * 0.5)), 0.7) * (0.62 + 0.38 * Math.sin(u * 0.17 + 1.1));
    const car = Math.sin(u * 5.3) * 0.62 + Math.sin(u * 8.9 + 1.3) * 0.28 + Math.sin(u * 14.1 + 0.4) * 0.14;
    return env * car;                        // roughly -1..1
  }
  function envOf(u) { return Math.pow(Math.max(0, Math.sin(u * 0.5)), 0.7) * (0.62 + 0.38 * Math.sin(u * 0.17 + 1.1)); }
  function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

  /* draw one stage's form between screen x0..x1. c(x) maps screen x to signal coordinate. */
  function drawForm(g, j, x0, x1, H, c, alpha, t) {
    if (alpha <= 0.01 || x1 <= x0) return;
    const mid = H * 0.56, amp = H * 0.3;
    g.save(); g.globalAlpha = alpha;
    g.strokeStyle = COL[j]; g.fillStyle = COL[j]; g.lineJoin = 'round';
    if (j === 0) {
      // a key press: the line sits low and jumps high while the key is held
      g.lineWidth = 2.5; g.beginPath();
      for (let x = x0; x <= x1; x += 2) {
        const u = c(x), ph = ((u % 26) + 26) % 26;
        const y = ph > 18 && ph < 22 ? mid - amp * 0.85 : mid + amp * 0.35;
        x === x0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    } else if (j === 1) {
      // sample-and-hold, quantised: the stepped look of 8-bit audio
      g.lineWidth = 2.2; g.beginPath();
      let first = true, lastY = 0;
      for (let x = x0; x <= x1; x += 1) {
        const u = c(x), us = Math.floor(u / 0.42) * 0.42;
        const y = mid - Math.round(speech(us) * 7) / 7 * amp;
        if (first) { g.moveTo(x, y); first = false; } else { g.lineTo(x, lastY); g.lineTo(x, y); }
        lastY = y;
      }
      g.stroke();
    } else if (j === 2) {
      // PWM: fixed-period pulses whose width follows the loudness
      g.lineWidth = 1.8; g.beginPath();
      const P = 1.5;
      const hi = mid - amp * 0.8, lo = mid + amp * 0.8;
      let first = true, lastY = lo;
      for (let x = x0; x <= x1; x += 1) {
        const u = c(x), k = Math.floor(u / P), f = u / P - k;
        const duty = 0.5 + 0.48 * speech(k * P);
        const y = f < duty ? hi : lo;
        if (first) { g.moveTo(x, y); first = false; } else { if (y !== lastY) g.lineTo(x, lastY); g.lineTo(x, y); }
        lastY = y;
      }
      g.stroke();
    } else if (j === 3) {
      // light: brightness across the gap, with photons riding it
      for (let x = x0; x <= x1; x += 3) {
        const u = c(x), b = 0.5 + 0.5 * speech(u);
        const grad = g.createLinearGradient(0, mid - amp, 0, mid + amp);
        grad.addColorStop(0, 'rgba(255,246,207,0)');
        grad.addColorStop(0.5, `rgba(255,246,207,${(0.15 + 0.75 * b).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(255,246,207,0)');
        g.fillStyle = grad; g.fillRect(x, mid - amp * (0.4 + 0.6 * b), 3, amp * 2 * (0.4 + 0.6 * b));
      }
      g.fillStyle = '#fffbe8';
      for (let i = 0; i < 70; i++) {
        const px = x0 + (((hash(i) * 4000 + t * (240 + hash(i + 9) * 260)) % 4000) / 4000) * (x1 - x0);
        const py = mid + (hash(i + 3) - 0.5) * amp * 1.4;
        g.globalAlpha = alpha * (0.4 + 0.6 * hash(i + 5));
        g.fillRect(px, py, 2, 2);
      }
    } else if (j === 4) {
      // panel voltage: the voice again, smaller, a little noisy
      g.lineWidth = 2; g.beginPath();
      for (let x = x0; x <= x1; x += 1.5) {
        const u = c(x), y = mid - (speech(u) * 0.6 + (hash(Math.floor(u * 9 + t * 40)) - 0.5) * 0.09) * amp;
        x === x0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    } else {
      // amplified: full size, filled
      g.lineWidth = 3; g.beginPath();
      for (let x = x0; x <= x1; x += 1.5) {
        const y = mid - speech(c(x)) * amp * 1.05;
        x === x0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
      g.globalAlpha = alpha * 0.18; g.beginPath(); g.moveTo(x0, mid);
      for (let x = x0; x <= x1; x += 3) g.lineTo(x, mid - envOf(c(x)) * amp * 1.05);
      for (let x = x1; x >= x0; x -= 3) g.lineTo(x, mid + envOf(c(x)) * amp * 1.05);
      g.closePath(); g.fill();
    }
    g.restore();
  }

  function sizeCanvas(cv) {
    const dpr = Math.min(2, devicePixelRatio || 1), r = cv.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, W: r.width, H: r.height };
  }

  function grid(g, W, H) {
    g.save(); g.strokeStyle = 'rgba(243,238,226,.06)'; g.lineWidth = 1;
    for (let y = H / 6; y < H; y += H / 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.setLineDash([4, 6]); g.strokeStyle = 'rgba(243,238,226,.14)';
    g.beginPath(); g.moveTo(0, H * 0.56); g.lineTo(W, H * 0.56); g.stroke();
    g.restore();
  }

  /* ---------- desktop: pinned horizontal track with one continuous scope ---------- */
  const desk = matchMedia('(min-width: 821px)');
  let cv = null, spans = [], tx = 0, active = -1, running = false;
  const SCALE = 1 / 12;                        // signal units per pixel

  function measure() {
    if (!canvas) return;
    cv = sizeCanvas(canvas);
    spans = stages.map((s) => ({ a: s.offsetLeft - track.offsetLeft, w: s.offsetWidth }));
  }

  // which stage a track coordinate falls in, as a continuous index
  function kOf(tc) {
    if (tc <= spans[0].a) return 0.0001;
    for (let i = 0; i < spans.length; i++) {
      const s = spans[i];
      if (tc < s.a + s.w) return i + (tc - s.a) / s.w;
    }
    return spans.length - 0.0001;
  }

  function frame(now) {
    if (!running) return;
    const t = now / 1000;
    const { g, W, H } = cv;
    tx = track.getBoundingClientRect().left;
    g.clearRect(0, 0, W, H);
    grid(g, W, H);
    const flow = reduce ? 0 : t * 9;
    const c = (x) => (x - tx) * SCALE - flow;     // signal coordinate under screen x
    const N = stages.length;
    // stage weights per 12px chunk, so neighbouring forms cross-fade at the seams
    const CH = 12;
    for (let x = 0; x < W; x += CH) {
      const k = kOf(x - tx + CH / 2);
      for (let j = 0; j < N; j++) {
        const d = Math.abs(k - (j + 0.5));
        const w = d < 0.42 ? 1 : d > 0.58 ? 0 : 1 - (d - 0.42) / 0.16;
        if (w > 0) drawForm(g, j, x, Math.min(W, x + CH + 1), H, c, w, t);
      }
    }
    // stage names at the start of each region
    g.save(); g.font = '500 11px "JetBrains Mono", monospace'; g.textBaseline = 'top';
    spans.forEach((s, j) => {
      const sx = s.a + tx;
      if (sx > W || sx + s.w < 0) return;
      g.fillStyle = COL[j]; g.globalAlpha = 0.85;
      g.fillText(NAMES[j], Math.max(12, sx + 2), 12);
      g.globalAlpha = 0.25; g.fillRect(sx - 1, 0, 1, H);
    });
    g.restore();
    requestAnimationFrame(frame);
  }

  function setActive(i) {
    if (i === active) return; active = i;
    stages.forEach((s, k) => s.classList.toggle('is-on', k === i));
  }

  if (window.gsap && window.ScrollTrigger) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 821px)', () => {
      measure();
      const dist = () => Math.max(0, track.scrollWidth - innerWidth + 40);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.5,
          invalidateOnRefresh: true,
          onRefresh: measure,
          onUpdate: () => {
            tx = track.getBoundingClientRect().left;
            const centre = innerWidth * 0.62 - tx;
            setActive(Math.min(stages.length - 1, Math.floor(kOf(centre))));
          },
          onToggle: (st) => { if (st.isActive && !running) { running = true; requestAnimationFrame(frame); } },
        },
      });
      tx = track.getBoundingClientRect().left;
      setActive(0);
      const vis = new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
        if (!e.isIntersecting) running = false;
      });
      vis.observe(pin);
      const onR = () => measure();
      addEventListener('resize', onR);
      return () => { tween.scrollTrigger && tween.scrollTrigger.kill(); tween.kill(); vis.disconnect(); running = false; removeEventListener('resize', onR); gsap.set(track, { clearProps: 'x' }); };
    });

    /* ---------- phones: each stage gets its own little scope ---------- */
    mm.add('(max-width: 820px)', () => {
      const made = stages.map((s, j) => {
        const c = document.createElement('canvas');
        c.className = 'stage__wave'; c.setAttribute('aria-hidden', 'true');
        s.querySelector('.stage__text').appendChild(c);
        return { c, j, on: false, sz: null };
      });
      const vis = new IntersectionObserver((es) => es.forEach((e) => {
        const m = made.find((x) => x.c === e.target); if (m) m.on = e.isIntersecting;
      }));
      made.forEach((m) => { vis.observe(m.c); m.sz = sizeCanvas(m.c); });
      let alive = true;
      (function loop(now) {
        if (!alive) return;
        const t = now / 1000;
        made.forEach((m) => {
          if (!m.on) return;
          const { g, W, H } = m.sz;
          g.clearRect(0, 0, W, H); grid(g, W, H);
          drawForm(g, m.j, 0, W, H, (x) => x * SCALE * 1.2 - (reduce ? 0 : t * 9), 1, t);
        });
        requestAnimationFrame(loop);
      })(performance.now());
      const onR = () => made.forEach((m) => (m.sz = sizeCanvas(m.c)));
      addEventListener('resize', onR);
      return () => { alive = false; vis.disconnect(); made.forEach((m) => m.c.remove()); removeEventListener('resize', onR); };
    });
  }
})();
