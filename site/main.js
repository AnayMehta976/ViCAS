// ViCAS site — the keypad, the frame, the accordion, the tabs, and once-only reveals.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- reveal once (never leaves content hidden) ---------- */
  const targets = document.querySelectorAll('[data-reveal], [data-stagger], [data-chapter]');
  const show = (el) => el.classList.add('is-in');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    targets.forEach((el) => io.observe(el));
    addEventListener('load', () => setTimeout(() => targets.forEach((el) => {
      const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) show(el);
    }), 2500));
  } else targets.forEach(show);
  // stagger siblings that reveal together
  document.querySelectorAll('.tiles, .about__text, .how__intro, .tests__head').forEach((g) =>
    g.querySelectorAll('[data-reveal]').forEach((el, i) => el.style.setProperty('--d', `${i * 80}ms`)));

  /* ---------- accordion ---------- */
  const acc = document.querySelector('[data-acc]');
  if (acc) {
    const panels = [...acc.querySelectorAll('.acc__panel')];
    const open = (p) => panels.forEach((q) => {
      const on = q === p;
      q.classList.toggle('is-open', on);
      q.querySelector('.acc__btn').setAttribute('aria-expanded', String(on));
    });
    panels.forEach((p) => p.querySelector('.acc__btn').addEventListener('click', () => open(p)));
  }

  /* ---------- tabs (arrow keys move between them) ---------- */
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (t) => tabs.forEach((x) => {
    const on = x === t;
    x.setAttribute('aria-selected', String(on));
    x.tabIndex = on ? 0 : -1;
    document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
  });
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const n = tabs[(i + d + tabs.length) % tabs.length]; select(n); n.focus();
    });
  });

  /* ---------- the keypad: the live thing ---------- */
  const MESSAGES = {
    '1': 'Your trunk is open.',
    '2': 'There is a medical emergency.',
    '3': 'Your fuel is low.',
    '4': 'Someone is in danger.',
  };
  const BIT_MS = 10;            // the real bit time in lifi_sender.ino
  const SLOW = reduce ? 0 : 9;  // shown nine times slower so the eye can follow
  const led = document.querySelector('[data-led]');
  const readout = document.querySelector('[data-readout]');
  const frameEl = document.querySelector('[data-frame]');
  const frameText = document.querySelector('[data-frame-text]');
  const muteBtn = document.querySelector('[data-mute]');
  let muted = false, busy = 0;

  // start bit (light OFF), eight data bits least significant first, stop bit and gap (light ON)
  const frameFor = (ch) => {
    const code = ch.charCodeAt(0);
    const bits = [{ name: 'Start', v: 0 }];
    for (let i = 0; i < 8; i++) bits.push({ name: `Data bit ${i}`, v: (code >> i) & 1 });
    bits.push({ name: 'Stop', v: 1 }, { name: 'Gap', v: 1 });
    return { code, bits };
  };
  const binary = (code) => code.toString(2).padStart(8, '0');

  const drawFrame = (ch) => {
    if (!frameEl) return [];
    const { code, bits } = frameFor(ch);
    frameEl.replaceChildren(...bits.map((b) => {
      const row = document.createElement('div');
      row.className = 'frame__bit'; row.dataset.v = b.v;
      row.innerHTML = `<span>${b.name}</span><span>${b.v ? 'Light on' : 'Light off'}</span>`;
      return row;
    }));
    if (frameText) frameText.textContent = `Key ${ch} is the byte ${binary(code)}. It leaves the LED as eleven flashes, least significant bit first after a dark start bit, and arrives in ${11 * BIT_MS} ms. The receiving Arduino prints it.`;
    return [...frameEl.children];
  };

  const speak = (text) => {
    if (muted || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = speechSynthesis.getVoices().find((x) => /en-IN/i.test(x.lang)) || speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    u.rate = 1; u.pitch = 1;
    speechSynthesis.speak(u);
  };

  const flash = async (rows, run) => {
    const step = BIT_MS * SLOW;
    for (let i = 0; i < rows.length; i++) {
      if (run !== busy) return;
      rows.forEach((r, j) => r.classList.toggle('is-now', j === i));
      led && led.classList.toggle('is-lit', rows[i].dataset.v === '1');
      if (step) await new Promise((r) => setTimeout(r, step));
    }
    rows.forEach((r) => r.classList.remove('is-now'));
    led && led.classList.add('is-lit');
  };

  const press = (key, btn) => {
    document.querySelectorAll('.key[aria-pressed]').forEach((k) => k.removeAttribute('aria-pressed'));
    btn && btn.setAttribute('aria-pressed', 'true');
    const msg = MESSAGES[key];
    let line, say;
    if (msg) { line = `Key ${key} sent: “${msg}”`; say = msg; }
    else if (/[5-9]/.test(key)) { line = `Key ${key} plays a message you record yourself, saved on the SD card as ${key}.WAV.`; say = `Custom message ${key}.`; }
    else { line = `Key ${key} has no message. The sender ignores it, but in digital mode it still travels as data.`; say = ''; }
    if (readout) readout.textContent = line;
    const rows = drawFrame(key);
    const run = ++busy;
    flash(rows, run);
    if (say) speak(say);
  };

  document.querySelectorAll('.key').forEach((k) => {
    k.addEventListener('click', () => press(k.dataset.key, k));
  });
  // typing a key on a physical keyboard while the keypad has focus presses it too
  const pad = document.querySelector('.keys');
  pad && pad.addEventListener('keydown', (e) => {
    const k = pad.querySelector(`.key[data-key="${CSS.escape(e.key.toUpperCase())}"]`);
    if (k && e.key.length === 1) { e.preventDefault(); k.focus(); k.classList.add('is-down'); setTimeout(() => k.classList.remove('is-down'), 140); press(k.dataset.key, k); }
  });

  if (muteBtn) {
    if (!('speechSynthesis' in window)) muteBtn.hidden = true;
    muteBtn.addEventListener('click', () => {
      muted = !muted;
      muteBtn.setAttribute('aria-pressed', String(muted));
      muteBtn.textContent = muted ? 'Sound off' : 'Sound on';
      if (muted && 'speechSynthesis' in window) speechSynthesis.cancel();
    });
  }

  drawFrame('1');
  led && led.classList.add('is-lit'); // idle = light ON
})();
