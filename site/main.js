// ViCAS — a night road. Smooth scroll, pinned scenes, and a keypad whose message really travels as light.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = window.gsap, ST = window.ScrollTrigger;
  const motion = !!(G && ST) && !reduce;
  const root = document.documentElement;
  if (motion) { root.classList.add('js-motion'); G.registerPlugin(ST); }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
  const fit = (c) => {
    const r = c.getBoundingClientRect(), d = DPR();
    const W = Math.max(1, Math.round(r.width * d)), H = Math.max(1, Math.round(r.height * d));
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const ctx = c.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
    return { ctx, w: r.width, h: r.height };
  };
  // run a draw loop only while its element is on screen
  const loop = (el, draw) => {
    let on = false, raf = 0;
    const tick = (t) => { draw(t); if (on) raf = requestAnimationFrame(tick); };
    if (reduce || !('IntersectionObserver' in window)) { draw(0); addEventListener('resize', () => draw(0)); return { kick: () => draw(performance.now()) }; }
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on) { on = true; raf = requestAnimationFrame(tick); }
      else if (!e.isIntersecting) { on = false; cancelAnimationFrame(raf); }
    }, { rootMargin: '100px' }).observe(el);
    return { kick: () => { if (!on) draw(performance.now()); } };
  };
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ================= smooth scroll ================= */
  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ST.update);
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const t = id === '#top' ? document.body : $(id);
    if (!t) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(id === '#top' ? 0 : t, { duration: 1.4 });
    else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    if (t !== document.body) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
  }));

  /* ================= nav ================= */
  const nav = $('[data-nav]'), bar = $('[data-progress]');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const y = window.scrollY;
    nav.classList.toggle('is-solid', y > 40);
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ================= split headings into words ================= */
  const split = (el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.textContent = part; w.append(i); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return $$('.w > span', el);
  };

  /* ================= HERO: the road, the beam, the car ahead ================= */
  const hero = $('[data-hero]'), road = $('[data-road]'), car = $('[data-car]'), panel = $('[data-panel]');
  const copy = $('[data-hero-copy]'), hud = $('.hero__hud');
  const heroState = { speed: 1, p: 0 };
  {
    const city = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: rand(.6, 1.8), c: Math.random() < .25 ? '#ffb22e' : (Math.random() < .5 ? '#9fdcff' : '#f3f8ff'), ph: rand(0, 6.28) }));
    const bits = [];
    let last = 0, dist = 0, spawn = 0, hitT = 0;
    const draw = (t) => {
      const { ctx, w, h } = fit(road);
      const dt = Math.min(50, t - (last || t)); last = t;
      dist += dt * 0.00042 * heroState.speed;
      const hr = hero.getBoundingClientRect();
      const pr = panel.getBoundingClientRect();
      const px = pr.left + pr.width / 2 - hr.left, py = pr.top + pr.height / 2 - hr.top;
      const cr = car.getBoundingClientRect();
      const vx = cr.left + cr.width / 2 - hr.left;
      const vy = Math.max(h * 0.32, cr.top - hr.top + cr.height * 0.12);
      // sky
      ctx.fillStyle = '#04060c'; ctx.fillRect(0, 0, w, h);
      let g = ctx.createRadialGradient(vx, vy, 0, vx, vy, w * 0.7);
      g.addColorStop(0, 'rgba(60,110,180,.22)'); g.addColorStop(.4, 'rgba(30,50,90,.08)'); g.addColorStop(1, 'rgba(4,6,12,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // distant city
      city.forEach((s) => {
        const a = .35 + .35 * Math.sin(t * 0.002 + s.ph);
        ctx.globalAlpha = a; ctx.fillStyle = s.c;
        ctx.fillRect(s.x * w, vy - 6 - s.y * h * 0.14, s.r, s.r);
      });
      ctx.globalAlpha = 1;
      // ground below the horizon, and the horizon line
      g = ctx.createLinearGradient(0, vy, 0, h);
      g.addColorStop(0, '#060912'); g.addColorStop(1, '#03050a');
      ctx.fillStyle = g; ctx.fillRect(0, vy, w, h - vy);
      g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(92,225,255,0)'); g.addColorStop(vx / w, 'rgba(159,220,255,.45)'); g.addColorStop(1, 'rgba(92,225,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, vy - 1, w, 1.5);
      // road
      const bx = w * 0.5 + (vx - w * 0.5) * 0.35;
      const half = w * 0.95;
      g = ctx.createLinearGradient(0, vy, 0, h);
      g.addColorStop(0, '#070a12'); g.addColorStop(1, '#111827');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(vx - 6, vy); ctx.lineTo(vx + 6, vy); ctx.lineTo(bx + half, h); ctx.lineTo(bx - half, h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(159,220,255,.18)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(vx - 6, vy); ctx.lineTo(bx - half, h); ctx.moveTo(vx + 6, vy); ctx.lineTo(bx + half, h); ctx.stroke();
      const lerp = (a, b, k) => a + (b - a) * k;
      // lane dashes + roadside lamps rushing towards us
      const N = 14;
      for (let i = 0; i < N; i++) {
        const u = ((i / N) + dist) % 1;
        const n = Math.pow(u, 2.4), n2 = Math.pow(Math.min(1, u + 0.035), 2.4);
        const y1 = lerp(vy, h, n), y2 = lerp(vy, h, n2);
        const x1 = lerp(vx, bx, n), x2 = lerp(vx, bx, n2);
        ctx.strokeStyle = `rgba(255,178,46,${0.15 + n * 0.75})`;
        ctx.lineWidth = 1 + n * 9;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        // side lamps
        [-1, 1].forEach((sd) => {
          const lx = lerp(vx, bx + sd * half * 1.25, n), ly = lerp(vy, h * 0.15, n) - n * 40;
          const r = 1 + n * 26;
          const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 3);
          lg.addColorStop(0, `rgba(255,214,150,${0.7 * Math.min(1, n * 3)})`); lg.addColorStop(1, 'rgba(255,178,46,0)');
          ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, r * 3, 0, 6.29); ctx.fill();
        });
      }
      // our LED: the beam from below the screen to the solar panel
      const ox = w < 900 ? w * 0.5 : lerp(w * 0.5, px, .55), oy = h + 20;
      const flick = .82 + .18 * Math.sin(t * 0.05) * Math.sin(t * 0.013);
      const spread = 60 + 70 * (1 - heroState.p);
      g = ctx.createLinearGradient(ox, oy, px, py);
      g.addColorStop(0, `rgba(243,248,255,${.34 * flick})`); g.addColorStop(1, `rgba(159,220,255,${.12 * flick})`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(ox - spread, oy); ctx.lineTo(ox + spread, oy); ctx.lineTo(px + 46, py); ctx.lineTo(px - 46, py); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(243,248,255,${.55 * flick})`; ctx.lineWidth = 2; ctx.shadowColor = '#5ce1ff'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(px, py); ctx.stroke();
      // bits riding the beam
      spawn -= dt;
      if (spawn <= 0) { bits.push({ k: 0, v: Math.random() < .5 ? 1 : 0, o: rand(-.5, .5) }); spawn = rand(60, 140); }
      ctx.font = '700 13px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i]; b.k += dt * 0.0011;
        if (b.k >= 1) { bits.splice(i, 1); hitT = t; continue; }
        const e = b.k * b.k;
        const x = lerp(ox + b.o * spread, px + b.o * 30, e), y = lerp(oy, py, e);
        const s = 1.6 - e;
        ctx.globalAlpha = Math.min(1, b.k * 6);
        ctx.fillStyle = b.v ? '#f3f8ff' : '#5ce1ff';
        ctx.font = `700 ${Math.round(11 + 9 * s)}px "JetBrains Mono", monospace`;
        ctx.fillText(String(b.v), x, y);
      }
      ctx.restore(); ctx.globalAlpha = 1;
      car.classList.toggle('is-hit', t - hitT < 70);
    };
    loop(hero, draw);
  }

  if (motion) {
    G.set(car, { xPercent: -50 });
    const mm = G.matchMedia();
    mm.add('(min-width: 901px)', () => { G.set(copy, { yPercent: -46 }); return () => G.set(copy, { yPercent: 0 }); });
    // arrival
    G.from('[data-hero-line]', { yPercent: 115, duration: 1.3, ease: 'power4.out', stagger: .12, delay: .15, onComplete: () => $('.hero__title').classList.add('is-in') });
    G.from('[data-hero-in]', { opacity: 0, y: 26, duration: 1, ease: 'power3.out', stagger: .1, delay: .45 });
    G.from(car, { scale: .55, opacity: 0, duration: 1.8, ease: 'power3.out', delay: .1 });
    // scroll: drive up to the car ahead
    G.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: '+=120%', scrub: 1, pin: true, onUpdate: (s) => { heroState.p = s.progress; heroState.speed = 1 + s.progress * 4; } },
    })
      .to(copy, { y: -160, opacity: 0, ease: 'none', duration: .6 }, 0)
      .to(hud, { opacity: 0, ease: 'none', duration: .3 }, 0)
      .to(car, { scale: 1.75, y: () => -innerHeight * 0.06, ease: 'power1.in', duration: 1 }, 0);
  }

  /* ================= problem: what a horn can't say ================= */
  {
    const words = $$('[data-word]');
    if (motion && words.length) {
      let i = 0, timer = 0;
      words[0].classList.add('is-on');
      const next = () => {
        words[i].classList.remove('is-on'); words[i].classList.add('is-off');
        const prev = words[i];
        setTimeout(() => prev.classList.remove('is-off'), 600);
        i = (i + 1) % words.length;
        words[i].classList.add('is-on');
      };
      ST.create({ trigger: '[data-cant]', start: 'top bottom', end: 'bottom top',
        onToggle: (s) => { clearInterval(timer); if (s.isActive) timer = setInterval(next, 1900); } });
      const mm = G.matchMedia();
      mm.add('(min-width: 901px)', () => {
        $$('[data-parallax]').forEach((el) => G.to(el, { y: +el.dataset.parallax, ease: 'none',
          scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
      });
    }
  }

  /* ================= how it works: follow the signal ================= */
  if (motion) {
    const track = $('[data-how-track]'), wire = $('[data-wire]'), stages = $$('[data-stage]');
    const mm = G.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const light = (p) => {
        const wr = wire.parentElement;
        const tip = wr.offsetLeft + wr.offsetWidth * p;
        stages.forEach((s) => s.classList.toggle('is-live', tip >= s.offsetLeft - 4));
      };
      G.timeline({ scrollTrigger: { trigger: '[data-how-pin]', start: 'top top', end: () => '+=' + Math.max(dist(), innerHeight * 1.2), pin: true, scrub: 1, invalidateOnRefresh: true, onUpdate: (s) => light(s.progress) } })
        .to(track, { x: () => -dist(), ease: 'none' }, 0)
        .to(wire, { scaleX: 1, ease: 'none' }, 0);
      light(0);
      return () => stages.forEach((s) => s.classList.remove('is-live'));
    });
    mm.add('(max-width: 900px)', () => {
      G.to(wire, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: track, start: 'top 70%', end: 'bottom 70%', scrub: true } });
      stages.forEach((s) => ST.create({ trigger: s, start: 'top 70%', toggleClass: 'is-live' }));
    });
  } else $$('[data-stage]').forEach((s) => s.classList.add('is-live'));

  /* ================= the keypad ================= */
  const MESSAGES = { '1': 'Your trunk is open.', '2': 'There is a medical emergency.', '3': 'Your fuel is low.', '4': 'Someone is in danger.' };
  const BIT_MS = 10;                // the real bit time in lifi_sender.ino
  const SLOW = reduce ? 0 : 12;     // shown twelve times slower so the eye can follow
  const frameFor = (ch) => {
    const code = ch.charCodeAt(0);
    const bits = [{ n: 'Start', v: 0 }];
    for (let i = 0; i < 8; i++) bits.push({ n: `D${i}`, v: (code >> i) & 1 });
    bits.push({ n: 'Stop', v: 1 }, { n: 'Gap', v: 1 });
    return { code, bits };
  };

  const ledEl = $('[data-led]'), readout = $('[data-readout]'), muteBtn = $('[data-mute]');
  const rx = $('[data-rx]'), speaker = $('[data-speaker]'), beamC = $('[data-beam]'), scopeC = $('[data-scope]');
  const rig = $('.lab__rig');
  let muted = false, run = 0;
  const lab = { lit: true, key: '1', frame: frameFor('1'), cursor: -1, pulses: [], sending: false };

  // the beam between the keypad's LED and the receiving panel
  const beamLoop = loop(beamC, (t) => {
    const { ctx, w, h } = fit(beamC);
    ctx.clearRect(0, 0, w, h);
    const vertical = getComputedStyle(rig).gridTemplateColumns.split(' ').length === 1;
    const A = vertical ? { x: w / 2, y: 0 } : { x: 0, y: h / 2 };
    const B = vertical ? { x: w / 2, y: h } : { x: w, y: h / 2 };
    const sp = vertical ? 26 : 34;
    if (lab.lit) {
      const g = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
      g.addColorStop(0, 'rgba(243,248,255,.55)'); g.addColorStop(1, 'rgba(159,220,255,.18)');
      ctx.fillStyle = g; ctx.beginPath();
      if (vertical) { ctx.moveTo(A.x - 10, A.y); ctx.lineTo(A.x + 10, A.y); ctx.lineTo(B.x + sp * 2, B.y); ctx.lineTo(B.x - sp * 2, B.y); }
      else { ctx.moveTo(A.x, A.y - 10); ctx.lineTo(A.x, A.y + 10); ctx.lineTo(B.x, B.y + sp * 2); ctx.lineTo(B.x, B.y - sp * 2); }
      ctx.closePath(); ctx.fill();
    }
    // idle shimmer: the audio carrier flickering faster than the eye
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (lab.lit) {
      for (let i = 0; i < 26; i++) {
        const k = ((t * 0.00035) + i / 26) % 1;
        const j = Math.sin(i * 12.9 + t * 0.004) * sp * k * 1.2;
        const x = vertical ? A.x + j : A.x + (B.x - A.x) * k, y = vertical ? A.y + (B.y - A.y) * k : A.y + j;
        ctx.fillStyle = `rgba(159,220,255,${.5 - k * .35})`;
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }
    // data pulses
    let arrived = false;
    ctx.font = '700 16px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lab.pulses = lab.pulses.filter((p) => {
      p.k = Math.min(1, (t - p.t0) / 420);
      if (p.k >= 1) { arrived = arrived || p.v === 1; return false; }
      const x = A.x + (B.x - A.x) * p.k, y = A.y + (B.y - A.y) * p.k;
      ctx.shadowColor = p.v ? '#9fdcff' : 'transparent'; ctx.shadowBlur = 16;
      ctx.fillStyle = p.v ? '#f3f8ff' : 'rgba(255,61,72,.9)';
      ctx.fillText(p.v ? '1' : '0', x, y);
      return true;
    });
    ctx.restore();
    if (arrived) { rx.classList.add('is-hit'); setTimeout(() => rx.classList.remove('is-hit'), 90); }
  });

  // oscilloscope trace of the frame
  const drawScope = () => {
    const { ctx, w, h } = fit(scopeC);
    ctx.clearRect(0, 0, w, h);
    const bits = lab.frame.bits, n = bits.length + 2; // idle before and after
    const cw = w / n, hi = h * 0.28, lo = h * 0.72;
    ctx.strokeStyle = 'rgba(92,225,255,.08)'; ctx.lineWidth = 1;
    for (let i = 1; i < n; i++) { ctx.beginPath(); ctx.moveTo(i * cw, 8); ctx.lineTo(i * cw, h - 18); ctx.stroke(); }
    const levels = [1, ...bits.map((b) => b.v), 1];
    const upto = lab.cursor < 0 ? n : lab.cursor + 2;
    const path = (end) => {
      ctx.beginPath();
      let y0 = levels[0] ? hi : lo; ctx.moveTo(0, y0);
      for (let i = 0; i < end; i++) {
        const y = levels[i] ? hi : lo;
        if (y !== y0) ctx.lineTo(i * cw, y);
        ctx.lineTo((i + 1) * cw, y); y0 = y;
      }
      ctx.stroke();
    };
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(159,220,255,.18)'; path(n);
    ctx.save(); ctx.strokeStyle = '#5ce1ff'; ctx.lineWidth = 2.5; ctx.shadowColor = '#5ce1ff'; ctx.shadowBlur = 12; path(upto); ctx.restore();
    ctx.fillStyle = '#a3b0c7'; ctx.font = '600 10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    ['', 'S', '0', '1', '2', '3', '4', '5', '6', '7', 'P', 'G', ''].forEach((l, i) => l && ctx.fillText(l, (i + .5) * cw, h - 5));
    ctx.textAlign = 'left'; ctx.fillText('LIGHT ON', 6, hi - 8); ctx.fillText('OFF', 6, lo + 14);
  };

  // frame scene: big LED and the eleven cells (rebuilt for the last key pressed)
  const bitsOl = $('[data-bits]'), frameLed = $('[data-frame-led]');
  const buildBits = () => {
    const { code, bits } = lab.frame;
    bitsOl.replaceChildren(...bits.map((b) => {
      const li = document.createElement('li'); li.className = 'bit'; li.dataset.v = b.v;
      li.innerHTML = `<span class="bit__cell">${b.v}</span><span class="bit__lbl">${b.n}</span>`;
      li.setAttribute('aria-label', `${b.n}: light ${b.v ? 'on' : 'off'}`);
      return li;
    }));
    $('[data-frame-key]').textContent = `Key ${lab.key}`;
    $('[data-frame-hex]').textContent = '0x' + code.toString(16).toUpperCase().padStart(2, '0');
    $('[data-frame-bin]').textContent = code.toString(2).padStart(8, '0');
    setFrameStep(frameStep);
  };
  let frameStep = motion ? -1 : 10;
  const setFrameStep = (i) => {
    frameStep = i;
    $$('.bit', bitsOl).forEach((b, j) => { b.classList.toggle('is-done', j <= i); b.classList.toggle('is-now', j === i); });
    const v = i < 0 ? 1 : lab.frame.bits[Math.min(i, 10)].v;
    frameLed.classList.toggle('is-lit', motion ? !!v : true);
  };

  const speak = (text, done) => {
    if (muted || !text || !('speechSynthesis' in window)) { setTimeout(done, text ? 1600 : 300); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const vs = speechSynthesis.getVoices();
    const v = vs.find((x) => /en-IN/i.test(x.lang)) || vs.find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    let finished = false; const fin = () => { if (!finished) { finished = true; done(); } };
    u.onend = fin; u.onerror = fin; setTimeout(fin, 6000);
    speechSynthesis.speak(u);
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const press = async (key, btn) => {
    $$('.key[aria-pressed]').forEach((k) => k.removeAttribute('aria-pressed'));
    btn && btn.setAttribute('aria-pressed', 'true');
    const msg = MESSAGES[key];
    let line, say;
    if (msg) { line = `Key ${key} sent: “${msg}”`; say = msg; }
    else if (/[5-9]/.test(key)) { line = `Key ${key} plays your own recording, saved on the SD card as ${key}.WAV.`; say = `Custom message ${key}.`; }
    else { line = `Key ${key} has no message, but in digital mode it still crosses as data.`; say = ''; }
    readout.textContent = line;
    lab.key = key; lab.frame = frameFor(key); buildBits();
    const me = ++run;
    const step = BIT_MS * SLOW;
    for (let i = 0; i < lab.frame.bits.length; i++) {
      if (me !== run) return;
      const b = lab.frame.bits[i];
      lab.cursor = i; lab.lit = !!b.v; ledEl.classList.toggle('is-lit', lab.lit);
      lab.pulses.push({ t0: performance.now(), v: b.v });
      drawScope(); beamLoop.kick();
      if (step) await sleep(step);
    }
    lab.cursor = -1; lab.lit = true; ledEl.classList.add('is-lit'); drawScope();
    if (step) await sleep(420);
    if (me !== run) return;
    if (say) speaker.classList.add('is-talking');
    speak(say, () => { if (me === run) speaker.classList.remove('is-talking'); });
  };
  $$('.key').forEach((k) => k.addEventListener('click', () => press(k.dataset.key, k)));
  const pad = $('.keys');
  pad.addEventListener('keydown', (e) => {
    if (e.key.length !== 1) return;
    const k = pad.querySelector(`.key[data-key="${CSS.escape(e.key.toUpperCase())}"]`);
    if (k) { e.preventDefault(); k.focus(); k.classList.add('is-down'); setTimeout(() => k.classList.remove('is-down'), 140); press(k.dataset.key, k); }
  });
  if (!('speechSynthesis' in window)) muteBtn.hidden = true;
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.setAttribute('aria-pressed', String(muted));
    muteBtn.textContent = muted ? 'Sound off' : 'Sound on';
    if (muted && 'speechSynthesis' in window) speechSynthesis.cancel();
  });
  ledEl.classList.add('is-lit');
  buildBits(); drawScope();
  addEventListener('resize', drawScope);

  if (motion) {
    ST.create({ trigger: '[data-frame-pin]', start: 'top top', end: '+=160%', pin: true, scrub: true,
      onUpdate: (s) => { const i = Math.min(10, Math.floor(s.progress * 12.4) - 1); if (i !== frameStep) setFrameStep(i); } });
  }

  /* ================= why light: sweep the spectrum ================= */
  {
    const verdicts = $$('[data-verdict]'), pointer = $('[data-pointer]'), bands = $$('.band');
    verdicts[3].classList.add('is-win');
    const posOf = (i) => `${(i + .5) * 20}%`;
    if (motion) {
      const order = [0, 1, 2, 4, 3];
      G.set(pointer, { left: posOf(0) });
      const tl = G.timeline({ scrollTrigger: { trigger: '[data-why-pin]', start: 'top top', end: '+=260%', pin: true, scrub: 1,
        onUpdate: (s) => { const k = Math.min(4, Math.floor(s.progress * 5)); bands.forEach((b, j) => b.style.opacity = j === order[k] ? 1 : .35); } } });
      order.forEach((vi, k) => {
        const at = k * 1;
        tl.to(pointer, { left: posOf(vi), duration: .4, ease: 'power2.inOut' }, at);
        if (k === 0) G.set(verdicts[vi], { autoAlpha: 1 });
        else tl.fromTo(verdicts[vi], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: .35, ease: 'power2.out', immediateRender: false }, at + .2);
        if (k < order.length - 1) tl.to(verdicts[vi], { autoAlpha: 0, y: -40, duration: .3, ease: 'power2.in' }, at + .85);
      });
      tl.to({}, { duration: .4 });
    } else pointer.style.left = posOf(3);
  }

  /* ================= weather lab ================= */
  {
    const cv = $('[data-weather]'), range = $('[data-range]'), distEl = $('[data-dist]'), result = $('[data-result]');
    const FEET = [0, 2, 5, 7, 10];
    const NAMES = { clear: 'clear air', fog: 'fog (steam in the beam)', rain: 'rain (water sprayed into the beam)', mud: 'mud (paint over part of the panel)' };
    let cond = 'clear', feet = 5, shownX = null;
    const fog = Array.from({ length: 34 }, () => ({ x: Math.random(), y: Math.random(), r: rand(30, 90), s: rand(.00002, .00006), a: rand(.05, .14) }));
    const rain = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), l: rand(10, 22), s: rand(.0009, .0016) }));
    const mud = Array.from({ length: 9 }, () => ({ x: rand(.05, .95), y: rand(.05, .95), r: rand(.12, .3) }));
    const pulses = [];
    let last = 0, spawn = 0;
    const draw = (t) => {
      const { ctx, w, h } = fit(cv);
      const dt = Math.min(50, t - (last || t)); last = t;
      ctx.fillStyle = '#05080f'; ctx.fillRect(0, 0, w, h);
      const ledX = 54, cy = h * 0.46;
      const targetX = 120 + (feet / 10) * (w - 210);
      shownX = shownX == null ? targetX : shownX + (targetX - shownX) * Math.min(1, dt * 0.012);
      const pX = shownX, pW = 22, pH = Math.min(120, h * 0.5);
      // ruler
      ctx.strokeStyle = '#223049'; ctx.lineWidth = 1; ctx.fillStyle = '#a3b0c7'; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      ctx.beginPath(); ctx.moveTo(ledX, h - 26); ctx.lineTo(w - 70, h - 26); ctx.stroke();
      FEET.forEach((f) => { const x = 120 + (f / 10) * (w - 210); ctx.beginPath(); ctx.moveTo(x, h - 31); ctx.lineTo(x, h - 21); ctx.stroke(); ctx.fillText(w < 520 ? String(f) : `${f} ft`, x, h - 8); });
      // beam
      const fade = cond === 'fog' ? .7 : 1;
      const g = ctx.createLinearGradient(ledX, 0, pX, 0);
      g.addColorStop(0, `rgba(243,248,255,${.6 * fade})`); g.addColorStop(1, `rgba(159,220,255,${.22 * fade})`);
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(ledX, cy - 8); ctx.lineTo(pX, cy - pH * .45); ctx.lineTo(pX, cy + pH * .45); ctx.lineTo(ledX, cy + 8); ctx.closePath(); ctx.fill();
      // pulses
      spawn -= dt; if (spawn <= 0) { pulses.push({ k: 0 }); spawn = 140; }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]; p.k += dt / Math.max(240, (pX - ledX) * 2.2);
        if (p.k >= 1) { pulses.splice(i, 1); continue; }
        const x = ledX + (pX - ledX) * p.k;
        ctx.fillStyle = 'rgba(243,248,255,.9)'; ctx.shadowColor = '#5ce1ff'; ctx.shadowBlur = 14;
        ctx.fillRect(x - 3, cy - 3, 6, 6);
      }
      ctx.restore();
      // weather
      if (cond === 'fog') {
        fog.forEach((f) => {
          f.x = (f.x + f.s * dt) % 1.2;
          const x = (f.x - .1) * w, y = f.y * h;
          const fg = ctx.createRadialGradient(x, y, 0, x, y, f.r);
          fg.addColorStop(0, `rgba(200,215,235,${f.a})`); fg.addColorStop(1, 'rgba(200,215,235,0)');
          ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(x, y, f.r, 0, 6.29); ctx.fill();
        });
      } else if (cond === 'rain') {
        ctx.strokeStyle = 'rgba(159,220,255,.45)'; ctx.lineWidth = 1.2; ctx.beginPath();
        rain.forEach((r) => {
          r.y = (r.y + r.s * dt) % 1.1;
          const x = r.x * w + r.y * 30, y = (r.y - .05) * h;
          ctx.moveTo(x, y); ctx.lineTo(x - 4, y + r.l);
        });
        ctx.stroke();
      }
      // LED
      ctx.save(); ctx.shadowColor = '#9fdcff'; ctx.shadowBlur = 30; ctx.fillStyle = '#f3f8ff';
      ctx.beginPath(); ctx.arc(ledX - 6, cy, 14, -Math.PI / 2, Math.PI / 2); ctx.lineTo(ledX - 24, cy + 14); ctx.lineTo(ledX - 24, cy - 14); ctx.closePath(); ctx.fill(); ctx.restore();
      // panel
      ctx.fillStyle = '#0d1d3c'; ctx.strokeStyle = 'rgba(92,225,255,.7)'; ctx.lineWidth = 1.5;
      ctx.fillRect(pX, cy - pH / 2, pW, pH); ctx.strokeRect(pX, cy - pH / 2, pW, pH);
      ctx.strokeStyle = '#3d6fb3'; ctx.beginPath();
      for (let i = 1; i < 4; i++) { ctx.moveTo(pX, cy - pH / 2 + i * pH / 4); ctx.lineTo(pX + pW, cy - pH / 2 + i * pH / 4); }
      ctx.stroke();
      if (cond === 'mud') {
        ctx.fillStyle = 'rgba(120,78,40,.92)';
        mud.forEach((m) => { ctx.beginPath(); ctx.arc(pX + m.x * pW, cy - pH / 2 + m.y * pH, m.r * pW * 1.1, 0, 6.29); ctx.fill(); });
      }
      ctx.fillStyle = '#a3b0c7'; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
      ctx.fillText('LED', 18, cy - 26); ctx.textAlign = 'center'; ctx.fillText('PANEL', pX + pW / 2, cy - pH / 2 - 10);
      // received indicator
      ctx.save(); ctx.fillStyle = '#4dff9a'; ctx.shadowColor = '#4dff9a'; ctx.shadowBlur = 12 + 6 * Math.sin(t * 0.01);
      ctx.beginPath(); ctx.arc(pX + pW / 2, cy + pH / 2 + 16, 5, 0, 6.29); ctx.fill(); ctx.restore();
    };
    const wl = loop(cv, draw);
    const update = () => {
      feet = FEET[+range.value];
      distEl.textContent = `${feet} ft`;
      range.setAttribute('aria-valuetext', `${feet} feet`);
      result.innerHTML = `<span class="ok">Message played</span> at ${feet} ft in ${NAMES[cond]}.`;
      wl.kick();
    };
    range.addEventListener('input', update);
    const tabs = $$('[data-cond]');
    const pick = (b) => { tabs.forEach((x) => { const on = x === b; x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; }); cond = b.dataset.cond; update(); };
    tabs.forEach((b, i) => {
      b.tabIndex = i === 0 ? 0 : -1;
      b.addEventListener('click', () => pick(b));
      b.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
        e.preventDefault(); const n = tabs[(i + d + tabs.length) % tabs.length]; pick(n); n.focus();
      });
    });
    update();
  }

  /* ================= winner ================= */
  {
    const letters = $$('[data-win-letter]');
    const sweep = () => letters.forEach((l, i) => setTimeout(() => { l.classList.add('is-flash'); setTimeout(() => l.classList.remove('is-flash'), 260); }, i * 90));
    if (motion) {
      G.from(letters, { yPercent: 120, rotate: 6, duration: 1.1, ease: 'power4.out', stagger: .07,
        scrollTrigger: { trigger: '[data-win]', start: 'top 75%' }, onComplete: () => { sweep(); setInterval(sweep, 3200); } });
      G.from('.win__kicker', { opacity: 0, y: 20, duration: .8, scrollTrigger: { trigger: '[data-win]', start: 'top 80%' } });
      G.fromTo('.win__beam', { scaleX: .3, opacity: 0 }, { scaleX: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '[data-win]', start: 'top 90%', end: 'center 50%', scrub: true } });
    }
  }

  /* ================= cost ================= */
  if (motion) {
    const num = $('[data-count]'), total = +num.dataset.count, o = { v: 0 };
    num.textContent = '0';
    G.to(o, { v: total, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: num, start: 'top 85%' },
      onUpdate: () => { num.textContent = Math.round(o.v).toLocaleString('en-IN'); } });
    G.from('[data-bom] i', { scaleX: 0, duration: 1.2, ease: 'power3.out', stagger: .08, scrollTrigger: { trigger: '[data-bom]', start: 'top 80%' } });
    G.from('[data-bom] li', { y: 24, opacity: 0, duration: .8, ease: 'power3.out', stagger: .06, scrollTrigger: { trigger: '[data-bom]', start: 'top 85%' } });
  }

  /* ================= headings + reveals (after pins, so positions include pin spacing) ================= */
  if (motion) {
    $$('.h2').forEach((h) => {
      const words = split(h);
      G.from(words, { yPercent: 110, duration: 1, ease: 'power4.out', stagger: .045, scrollTrigger: { trigger: h, start: 'top 88%' }, onComplete: () => h.classList.add('is-in') });
    });
    ST.batch('[data-rise]', { start: 'top 92%', onEnter: (b) => G.to(b, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', stagger: .1, overwrite: true }) });
    G.from('.foot__word', { yPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.foot__word', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    addEventListener('load', () => ST.refresh());
    // never leave content hidden if a trigger misfires
    setTimeout(() => $$('[data-rise]').forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && getComputedStyle(el).opacity === '0') G.to(el, { opacity: 1, y: 0 }); }), 4000);
  }
})();
