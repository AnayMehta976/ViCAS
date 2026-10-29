/* ViCAS — "Why not just use radio?" A top-down road. Pick a wave, see who receives it. */
(function () {
  'use strict';
  const sec = document.querySelector('[data-why]');
  if (!sec) return;
  const cv = sec.querySelector('[data-why-canvas]');
  const tabs = Array.from(sec.querySelectorAll('[data-wave]'));
  const card = sec.querySelector('[data-verdict]');
  const tag = sec.querySelector('[data-verdict-tag]'), title = sec.querySelector('[data-verdict-title]');
  const text = sec.querySelector('[data-verdict-text]'), facts = sec.querySelector('[data-verdict-facts]');
  const reduce = !!(window.ViCAS && window.ViCAS.reduce);

  const W8 = {
    radio: { t: 'Radio', tag: 'Everyone hears it',
      p: 'Radio spreads out in every direction and passes through walls, so every vehicle around you picks it up. Its bandwidth is low, other waves interfere with it, and some bands need a government licence.',
      f: [['Who receives it', 'Every vehicle nearby'], ['Licence', 'Some bands'], ['Security', 'Poor']] },
    micro: { t: 'Microwave', tag: 'Too costly',
      p: 'Microwaves can be aimed and they carry far. But the equipment is expensive, bulky and power-hungry: too much to bolt onto every car on the road.',
      f: [['Who receives it', 'The car ahead'], ['Licence', 'Some bands'], ['Cost to run', 'High']] },
    ir: { t: 'Infrared', tag: 'Too short',
      p: 'Infrared is cheap and line-of-sight, like a TV remote. But it fades out over a short distance and anything in the way blocks it. It doesn’t reach the car ahead reliably.',
      f: [['Who receives it', 'Nobody, at this distance'], ['Licence', 'None'], ['Cost to run', 'Very low']] },
    uv: { t: 'Ultraviolet', tag: 'Unsafe',
      p: 'Ultraviolet is invisible and hard to intercept, but it harms people with long exposure. That rules out shining it at traffic all day.',
      f: [['Who receives it', 'The car ahead'], ['Licence', 'Some types'], ['Risk', 'Harmful to people']] },
    laser: { t: 'Laser', tag: 'Unsafe',
      p: 'A laser is a tight, powerful beam. It can burn, harm eyes and damage the panel it lands on, and good ones are expensive.',
      f: [['Who receives it', 'The car ahead'], ['Licence', 'Some types'], ['Risk', 'Burns, eyes, the panel']] },
    vis: { t: 'Visible light', tag: 'ViCAS uses this', good: true,
      p: 'Visible light goes where it’s pointed, so only the vehicle in front receives the message. It needs no licence, is very cheap to run and is hard to intercept, and every vehicle already carries lights.',
      f: [['Who receives it', 'Only the car ahead'], ['Licence', 'None'], ['Cost to run', 'Very low']] },
  };

  let wave = 'radio', g, W, H, t0 = performance.now(), running = false;
  function fit() {
    const dpr = Math.min(2, devicePixelRatio || 1), r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); W = r.width; H = r.height;
  }

  function layout() {
    const roadW = Math.min(W * 0.78, 440), lane = roadW / 3, L0 = (W - roadW) / 2;
    const lx = (i) => L0 + lane * (i + 0.5);
    const cw = Math.min(46, lane * 0.46), ch = cw * 1.85;
    return {
      roadW, L0, lane, cw, ch,
      you: { x: lx(1), y: H - ch * 0.75 - 26 },
      ahead: { x: lx(1), y: H * 0.42, id: 'ahead' },
      others: [
        { x: lx(1), y: H * 0.1, id: 'far' },
        { x: lx(0), y: H * 0.24, id: 'o1' }, { x: lx(0), y: H * 0.7, id: 'o2' },
        { x: lx(2), y: H * 0.56, id: 'o3' }, { x: lx(2), y: H * 0.14, id: 'o4' }, { x: lx(2), y: H * 0.9, id: 'o5' },
      ],
    };
  }

  function car(x, y, w, h, body, state) {
    g.save(); g.translate(x, y);
    if (state) {
      g.fillStyle = state === 'ok' ? 'rgba(255,194,26,.22)' : state === 'hurt' ? 'rgba(232,52,45,.3)' : 'rgba(232,52,45,.22)';
      g.beginPath(); g.ellipse(0, 0, w * 1.05, h * 0.72, 0, 0, Math.PI * 2); g.fill();
    }
    const r = w * 0.28;
    g.fillStyle = body;
    rr(-w / 2, -h / 2, w, h, r); g.fill();
    g.fillStyle = 'rgba(0,0,0,.35)'; rr(-w * 0.36, -h * 0.3, w * 0.72, h * 0.22, 4); g.fill();
    g.fillStyle = 'rgba(0,0,0,.28)'; rr(-w * 0.36, h * 0.14, w * 0.72, h * 0.16, 4); g.fill();
    g.fillStyle = '#e8342d'; g.fillRect(-w * 0.42, h / 2 - 5, w * 0.22, 4); g.fillRect(w * 0.2, h / 2 - 5, w * 0.22, 4);
    if (state) {
      g.strokeStyle = state === 'ok' ? '#ffc21a' : '#e8342d'; g.lineWidth = 2.5;
      rr(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, r + 3); g.stroke();
      g.fillStyle = state === 'ok' ? '#ffc21a' : '#e8342d';
      g.beginPath(); g.arc(w / 2 + 2, -h / 2 - 2, 10, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#131312'; g.font = '400 12px Bungee, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(state === 'ok' ? '✓' : '!', w / 2 + 2, -h / 2 - 1);
    }
    g.restore();
  }
  function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  function cone(x, y, tx, ty, spread, c0, c1) {
    const ang = Math.atan2(ty - y, tx - x), len = Math.hypot(tx - x, ty - y);
    g.save(); g.translate(x, y); g.rotate(ang);
    const gr = g.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, -4); g.lineTo(len, -spread); g.lineTo(len, spread); g.lineTo(0, 4); g.closePath(); g.fill();
    g.restore();
  }

  function draw(now) {
    if (!running) return;
    const t = (now - t0) / 1000;
    const Lo = layout();
    g.clearRect(0, 0, W, H);
    // verge
    g.fillStyle = '#1a1a18'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#232320';
    for (let i = 0; i < 14; i++) {
      const y = ((i * 97 + (reduce ? 0 : t * 60)) % (H + 40)) - 20;
      g.beginPath(); g.arc(Lo.L0 - 22 - (i % 3) * 10, y, 9, 0, 7); g.fill();
      g.beginPath(); g.arc(Lo.L0 + Lo.roadW + 22 + (i % 2) * 12, (y + 50) % (H + 40) - 20, 10, 0, 7); g.fill();
    }
    // road
    g.fillStyle = '#262624'; g.fillRect(Lo.L0, 0, Lo.roadW, H);
    g.fillStyle = '#f3eee2'; g.fillRect(Lo.L0, 0, 4, H); g.fillRect(Lo.L0 + Lo.roadW - 4, 0, 4, H);
    g.fillStyle = 'rgba(243,238,226,.55)';
    const off = reduce ? 0 : (t * 120) % 60;
    for (let k = 1; k < 3; k++) for (let y = -60 + off; y < H; y += 60) g.fillRect(Lo.L0 + Lo.lane * k - 2, y, 4, 30);

    const you = Lo.you, ahead = Lo.ahead, all = [ahead].concat(Lo.others);
    const hit = {};
    const yFront = you.y - Lo.ch / 2, aheadBack = ahead.y + Lo.ch / 2;

    if (wave === 'radio') {
      for (let k = 0; k < 4; k++) {
        const r = ((t * 220 + k * 160) % 640);
        g.strokeStyle = `rgba(232,52,45,${Math.max(0, 0.7 - r / 700)})`; g.lineWidth = 3;
        g.beginPath(); g.arc(you.x, you.y, r, 0, Math.PI * 2); g.stroke();
      }
      all.forEach((c) => (hit[c.id] = 'bad'));
    } else if (wave === 'micro') {
      cone(you.x, yFront, ahead.x, aheadBack, Lo.cw * 0.5, 'rgba(232,140,60,.55)', 'rgba(232,140,60,.25)');
      hit.ahead = 'bad';
    } else if (wave === 'ir') {
      const reach = yFront - (yFront - aheadBack) * 0.45;
      cone(you.x, yFront, you.x, reach, 22, 'rgba(232,52,45,.5)', 'rgba(232,52,45,0)');
    } else if (wave === 'uv') {
      cone(you.x, yFront, ahead.x, aheadBack, Lo.cw * 0.8, 'rgba(160,110,255,.6)', 'rgba(160,110,255,.2)');
      hit.ahead = 'hurt';
    } else if (wave === 'laser') {
      g.strokeStyle = '#ff2a20'; g.lineWidth = 2.5; g.shadowColor = '#ff2a20'; g.shadowBlur = 12;
      g.beginPath(); g.moveTo(you.x, yFront); g.lineTo(ahead.x, aheadBack); g.stroke(); g.shadowBlur = 0;
      for (let i = 0; i < 8; i++) {
        const a = t * 9 + i, rr2 = 4 + ((t * 40 + i * 7) % 14);
        g.fillStyle = 'rgba(255,200,80,.85)'; g.fillRect(ahead.x + Math.cos(a) * rr2, aheadBack + Math.sin(a) * rr2 * 0.6, 2, 2);
      }
      hit.ahead = 'hurt';
    } else {
      const fl = reduce ? 1 : 0.85 + Math.random() * 0.15;
      cone(you.x, yFront, ahead.x, aheadBack, Lo.cw * 0.75, `rgba(255,251,232,${0.8 * fl})`, `rgba(255,243,194,${0.32 * fl})`);
      hit.ahead = 'ok';
    }

    const paint = ['#4a4a45', '#3b4a5c', '#5a4a3e', '#3e5248', '#4d3e52', '#55524a', '#3b4a5c'];
    all.forEach((c, i) => car(c.x, c.y, Lo.cw, Lo.ch, paint[i], hit[c.id] || null));
    car(you.x, you.y, Lo.cw, Lo.ch, '#ffc21a', null);
    // panel on the back of the car ahead
    g.fillStyle = wave === 'vis' ? '#fff6cf' : '#2156c8';
    g.fillRect(ahead.x - Lo.cw * 0.3, aheadBack - 3, Lo.cw * 0.6, 5);
    if (wave === 'micro') { g.fillStyle = '#8a8478'; g.fillRect(you.x - Lo.cw * 0.42, you.y - Lo.ch * 0.18, Lo.cw * 0.84, Lo.ch * 0.36); g.fillStyle = '#131312'; g.font = '400 10px Bungee, sans-serif'; g.textAlign = 'center'; g.fillText('₹₹₹', you.x, you.y + 4); }
    requestAnimationFrame(draw);
  }

  function select(key) {
    wave = key;
    const d = W8[key];
    tabs.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.wave === key)));
    tag.textContent = d.tag; title.textContent = d.t; text.textContent = d.p;
    facts.innerHTML = d.f.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
    card.classList.toggle('is-good', !!d.good);
    if (window.gsap && !reduce) gsap.fromTo(card, { y: 10, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' });
  }
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => select(b.dataset.wave));
    b.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return; e.preventDefault();
      const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); select(n.dataset.wave);
    });
  });

  fit(); select('radio');
  addEventListener('resize', fit);
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; requestAnimationFrame(draw); }
    if (!e.isIntersecting) running = false;
  }).observe(cv);
})();
