/* ViCAS — page shell: smooth scroll, nav, reveals, hero scene, horn board. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- shared sound (used by rig.js too) ---------- */
  const V = (window.ViCAS = window.ViCAS || {});
  V.reduce = reduce;
  V.soundOn = true;
  let ctx = null;
  V.audio = function () {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  V.horn = function () {
    if (!V.soundOn) return;
    const a = V.audio(); if (!a) return;
    const t = a.currentTime, out = a.createGain();
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900; lp.Q.value = 3;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.16, t + 0.03);
    out.gain.setValueAtTime(0.16, t + 0.62);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    lp.connect(out); out.connect(a.destination);
    [349, 440, 351].forEach((f) => {
      const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      o.connect(lp); o.start(t); o.stop(t + 0.82);
    });
  };

  /* ---------- smooth scroll ---------- */
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  let lenis = null;
  if (hasGsap && window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: id === '#top' ? 0 : -70, duration: 1.3 });
    }));
  }
  V.lenis = lenis;

  /* ---------- nav progress + current section ---------- */
  const bar = $('[data-progress]');
  const onScroll = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const links = $$('.nav__links a');
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((l) => l.setAttribute('aria-current', l.getAttribute('href') === '#' + e.target.id ? 'true' : 'false'));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['problem', 'signal', 'try', 'why', 'tests', 'next'].forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });

  /* ---------- horn board ---------- */
  const board = $('[data-hornboard]');
  if (board) {
    const btn = $('[data-hornbtn]', board), note = $('[data-hornnote]', board);
    const items = $$('li', board);
    const glyphs = '!#%&*+=?@ABCDEFGHKMNOPRSTUVWXYZ';
    let busy = false;
    const scramble = (el, to, ms) => new Promise((res) => {
      const from = el.textContent, n = Math.max(from.length, to.length), t0 = performance.now();
      (function step(now) {
        const p = Math.min(1, (now - t0) / ms);
        let s = '';
        for (let i = 0; i < n; i++) {
          if (i / n < p) s += to[i] || '';
          else s += from[i] === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0];
        }
        el.textContent = s.trimEnd();
        p < 1 ? requestAnimationFrame(step) : (el.textContent = to, res());
      })(t0);
    });
    const press = async () => {
      V.horn();
      btn.classList.add('is-down'); setTimeout(() => btn.classList.remove('is-down'), 220);
      if (busy) return; busy = true;
      if (hasGsap && !reduce) gsap.fromTo(board, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.25)' });
      await Promise.all(items.map((li, i) => new Promise((r) => setTimeout(() => {
        li.classList.add('is-honk'); scramble(li, 'HONK!', 260).then(r);
      }, i * 60))));
      note.innerHTML = '<b>Four different emergencies, one noise.</b> The driver ahead only learns that someone is annoyed.';
      await new Promise((r) => setTimeout(r, 2200));
      await Promise.all(items.map((li, i) => new Promise((r) => setTimeout(() => {
        li.classList.remove('is-honk'); scramble(li, li.dataset.msg, 420).then(r);
      }, i * 70))));
      busy = false;
    };
    btn.addEventListener('click', press);
  }

  if (!hasGsap) return;

  /* ---------- hero scene ---------- */
  const hero = $('[data-hero]');
  const q = (s) => $(s, hero);
  const strike = q('[data-strike]'), horn = q('[data-horn]'), lightT = q('[data-lighttext]');
  const beam = q('[data-beam]'), led = q('[data-led]'), ledGlow = q('[data-ledglow]');
  const panelGlow = q('[data-panelglow]'), bubble = q('[data-bubble]'), honk = q('[data-honk]');
  const steps = $$('[data-step]', hero);
  const flick = { on: 0 };

  gsap.from('[data-line]', { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.09, delay: 0.1 });
  gsap.from('[data-in]', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.45 });
  gsap.from('[data-truck]', { y: 60, opacity: 0, duration: 1.4, ease: 'power3.out', delay: 0.2 });

  const scene = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } })
    .addLabel('s0', 0)
    .fromTo(honk, { opacity: 0, scale: 0.6, rotate: -6 }, { opacity: 1, scale: 1, rotate: 8, duration: 0.35, ease: 'back.out(3)' }, 0.05)
    .to(honk, { opacity: 0, y: -20, duration: 0.3 }, 0.6)
    .to(strike, { strokeDashoffset: 0, duration: 0.45, ease: 'power1.inOut' }, 0.45)
    .to(horn, { opacity: 0.45, duration: 0.3 }, 0.6)
    .fromTo(lightT, { opacity: 0, scale: 1.5, transformOrigin: '300px 140px' }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, 0.8)
    .addLabel('s1', 1.25)
    .to(led, { attr: { fill: '#fffbe8' }, duration: 0.1 }, 1.3)
    .to(flick, { on: 1, duration: 0.5 }, 1.3)
    .addLabel('s2', 2.1)
    .fromTo(bubble, { opacity: 0, scale: 0.6, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(2.2)' }, 2.2)
    .to({}, { duration: 0.6 });

  const setStep = (p) => {
    const t = p * scene.duration();
    const i = t < 1.25 ? 0 : t < 2.1 ? 1 : 2;
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
  };

  gsap.ticker.add(() => {
    const on = flick.on;
    if (!beam) return;
    const j = on > 0 ? 0.72 + Math.random() * 0.28 : 0;
    beam.setAttribute('opacity', (on * j).toFixed(3));
    ledGlow.setAttribute('opacity', (on * (0.6 + Math.random() * 0.4)).toFixed(3));
    panelGlow.setAttribute('opacity', (on * (0.25 + Math.random() * 0.35)).toFixed(3));
  });

  const mm = gsap.matchMedia();
  mm.add({ desk: '(min-width: 901px)', mob: '(max-width: 900px)', reduce: '(prefers-reduced-motion: reduce)' }, (c) => {
    if (c.conditions.reduce) { scene.progress(1); setStep(1); return; }
    if (c.conditions.desk) {
      scene.progress(0); setStep(0);
      const st = ScrollTrigger.create({
        trigger: hero, start: 'top top', end: '+=150%', pin: true, scrub: 0.6,
        animation: scene, onUpdate: (s) => setStep(s.progress),
      });
      return () => st.kill();
    }
    // phones: the scene plays by itself on a loop instead of being pinned
    scene.progress(0);
    const loop = gsap.timeline({ repeat: -1, repeatDelay: 1.6, delay: 1.2 })
      .add(scene.tweenFromTo(0, scene.duration(), { ease: 'none' }))
      .to({}, { duration: 2.2 })
      .add(() => { scene.progress(0); });
    return () => loop.kill();
  });

  /* ---------- reveals ---------- */
  if (!reduce) {
    $$('[data-rise]').forEach((el) => {
      gsap.from(el, { y: 44, opacity: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    // lane divider drives forward as you scroll past it
    $$('[data-lanebar]').forEach((el) => {
      gsap.fromTo(el, { '--lane': '0px' }, { '--lane': '-480px', ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // big quote word by word
    const quote = $('[data-quote] p');
    if (quote) {
      quote.innerHTML = quote.textContent.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');
      gsap.fromTo($$('.w', quote), { opacity: 0.15 }, { opacity: 1, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: quote, start: 'top 82%', end: 'bottom 55%', scrub: true } });
    }

    // milestones rise out of the road
    gsap.from('[data-stone]', { yPercent: 40, opacity: 0, duration: 0.9, ease: 'back.out(1.4)', stagger: 0.07,
      scrollTrigger: { trigger: '.stones', start: 'top 82%', once: true } });

    // receipt prints out
    const rc = $('[data-receipt]');
    if (rc) gsap.fromTo(rc, { clipPath: 'inset(0 0 100% 0)', y: -40 }, { clipPath: 'inset(0 0 -20px 0)', y: 0, ease: 'none',
      scrollTrigger: { trigger: rc, start: 'top 85%', end: 'top 30%', scrub: 0.5 } });

    // WINNER drops in letter by letter
    gsap.from('.award__word span', { yPercent: 110, rotate: () => gsap.utils.random(-14, 14), opacity: 0,
      duration: 0.9, ease: 'back.out(1.8)', stagger: 0.06,
      scrollTrigger: { trigger: '[data-award]', start: 'top 75%', once: true } });
  }

  // counters
  $$('[data-count]').forEach((el) => {
    const end = +el.dataset.count, o = { v: 0 };
    if (reduce) return;
    gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('en-IN')),
      scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
