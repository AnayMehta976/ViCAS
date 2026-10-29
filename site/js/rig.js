/* ViCAS — the keypad demo.
   Voice mode follows sender/sender.ino: keys 1-4 play a recorded message through the LED.
   Data mode follows lifi_sender.ino / lifi_receiver.ino: idle = light ON, start bit OFF,
   8 data bits LSB first, stop bit ON, one extra gap bit. */
(function () {
  'use strict';
  const rig = document.querySelector('[data-rig]');
  if (!rig) return;
  const V = window.ViCAS || {};
  const $ = (s) => rig.querySelector(s);
  const $$ = (s) => Array.from(rig.querySelectorAll(s));

  const MESSAGES = { 1: 'Your trunk is open.', 2: 'There is a medical emergency.', 3: 'Your fuel is low.', 4: 'Someone is in danger.' };
  const BIT_VIS = 200;              // ms per bit on screen (the Arduino uses 10 ms)
  const LABELS = ['Start', 'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'Stop', 'Gap'];

  const led = $('[data-rig-led]'), pad = $('[data-pad]'), legend = $$('[data-legend] li');
  const beamCv = $('[data-beam-canvas]'), scopeCv = $('[data-scope]'), scopeLabel = $('[data-scope-label]');
  const cellsBox = $('[data-cells]'), rxPanel = $('[data-rx-panel]'), spk = $('[data-rx-spk]');
  const lcdA = $('[data-lcd-a]'), lcdB = $('[data-lcd-b]'), readout = $('[data-readout]');
  const soundBtn = $('[data-sound]');

  let mode = 'voice';
  let job = null;                    // the transmission in progress
  let L = 0;                          // light level 0..1 right now
  let rx = 0;                         // what the panel sees (smoothed)
  const hist = new Float32Array(360); // scope history
  let histI = 0;

  /* ---------- cells for the data frame ---------- */
  const cells = LABELS.map((lab, i) => {
    const d = document.createElement('div');
    d.className = 'cell' + (i === 0 ? ' is-start' : i >= 9 ? ' is-stop' : '');
    d.innerHTML = `<b>·</b><small>${lab}</small>`;
    cellsBox.appendChild(d);
    return d;
  });
  const frameOf = (ch) => {
    const c = ch.charCodeAt(0), bits = [0];
    for (let i = 0; i < 8; i++) bits.push((c >> i) & 1);
    return bits.concat([1, 1]);
  };

  /* ---------- canvases ---------- */
  function fit(cv) {
    const dpr = Math.min(2, devicePixelRatio || 1), r = cv.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, W: r.width, H: r.height };
  }
  let B = fit(beamCv), S = fit(scopeCv);
  addEventListener('resize', () => { B = fit(beamCv); S = fit(scopeCv); });

  const bitsInFlight = [];           // little squares travelling across in data mode
  const photons = Array.from({ length: 50 }, () => ({ x: Math.random(), y: Math.random() - 0.5, v: 0.4 + Math.random() * 0.6 }));

  function drawBeam(dt) {
    const { g, W, H } = B;
    g.clearRect(0, 0, W, H);
    const x0 = 18, x1 = W - 18, cy = H / 2;
    // the gap: dashed road edge
    g.strokeStyle = 'rgba(243,238,226,.12)'; g.setLineDash([10, 10]); g.lineWidth = 2;
    g.beginPath(); g.moveTo(x0, H - 14); g.lineTo(x1, H - 14); g.stroke(); g.setLineDash([]);
    // label the gap while it's dark
    const a = Math.max(0, L);
    if (a < 0.05 && !bitsInFlight.length) {
      g.fillStyle = 'rgba(168,163,151,.55)'; g.font = '500 11px "JetBrains Mono", monospace';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('THE GAP BETWEEN THE CARS · LIGHT OFF', W / 2, cy);
    }
    // cone
    if (a > 0.01) {
      const grad = g.createLinearGradient(x0, 0, x1, 0);
      grad.addColorStop(0, `rgba(255,251,232,${0.85 * a})`);
      grad.addColorStop(1, `rgba(255,243,194,${0.22 * a})`);
      g.fillStyle = grad;
      g.beginPath(); g.moveTo(x0, cy - 6); g.lineTo(x1, cy - H * 0.36); g.lineTo(x1, cy + H * 0.36); g.lineTo(x0, cy + 6); g.closePath(); g.fill();
      g.fillStyle = '#fffbe8';
      photons.forEach((p) => {
        p.x += p.v * dt * 0.9; if (p.x > 1) { p.x = 0; p.y = Math.random() - 0.5; }
        const x = x0 + (x1 - x0) * p.x, spread = 6 + (H * 0.36 - 6) * p.x;
        g.globalAlpha = a * 0.8; g.fillRect(x, cy + p.y * spread * 1.8, 2, 2);
      });
      g.globalAlpha = 1;
    }
    // bits travelling (data mode)
    for (let i = bitsInFlight.length - 1; i >= 0; i--) {
      const b = bitsInFlight[i];
      b.p += dt / 0.55;
      if (b.p >= 1) { bitsInFlight.splice(i, 1); continue; }
      const x = x0 + (x1 - x0) * b.p, s = 12 + 8 * b.p;
      g.fillStyle = b.v ? '#ffc21a' : '#131312';
      g.strokeStyle = b.v ? '#ffc21a' : '#6d6a5e'; g.lineWidth = 2;
      g.beginPath(); g.roundRect ? g.roundRect(x - s / 2, cy - s / 2, s, s, 3) : g.rect(x - s / 2, cy - s / 2, s, s); g.fill(); g.stroke();
      g.fillStyle = b.v ? '#131312' : '#a8a397'; g.font = `400 ${Math.round(s * 0.7)}px Bungee, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b.v, x, cy + 1);
    }
    // end caps
    g.fillStyle = '#2b2a26'; g.fillRect(4, cy - 14, 10, 28);
    g.fillStyle = '#183a7a'; g.fillRect(W - 14, cy - H * 0.38, 10, H * 0.76);
  }

  function drawScope() {
    const { g, W, H } = S;
    g.clearRect(0, 0, W, H);
    g.strokeStyle = 'rgba(243,238,226,.07)'; g.lineWidth = 1;
    for (let x = 0; x < W; x += W / 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y <= H; y += H / 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.strokeStyle = '#ffc21a'; g.lineWidth = 2; g.lineJoin = 'round';
    g.shadowColor = 'rgba(255,194,26,.5)'; g.shadowBlur = 6;
    g.beginPath();
    const n = hist.length;
    for (let i = 0; i < n; i++) {
      const v = hist[(histI + i) % n];
      const x = (i / (n - 1)) * W, y = H - 6 - v * (H - 12);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke(); g.shadowBlur = 0;
  }
  const push = (v) => { hist[histI] = v; histI = (histI + 1) % hist.length; };

  /* ---------- sound ---------- */
  function blip(bit) {
    if (!V.soundOn || !V.audio) return;
    const a = V.audio(); if (!a) return;
    const t = a.currentTime, o = a.createOscillator(), gn = a.createGain();
    o.type = 'square'; o.frequency.value = bit ? 1320 : 660;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.035, t + 0.005);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(gn); gn.connect(a.destination); o.start(t); o.stop(t + 0.07);
  }
  function speak(text, onStart, onEnd, onWord) {
    const ss = window.speechSynthesis;
    if (!V.soundOn || !ss || !window.SpeechSynthesisUtterance) return false;
    ss.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN'; u.rate = 0.98; u.pitch = 1;
    const vs = ss.getVoices();
    const pick = vs.find((v) => /en-IN/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang));
    if (pick) u.voice = pick;
    u.onstart = onStart; u.onend = onEnd; u.onerror = onEnd; u.onboundary = onWord;
    ss.speak(u);
    return true;
  }
  if (window.speechSynthesis) speechSynthesis.getVoices();

  /* ---------- UI helpers ---------- */
  function setLcd(a, b) { lcdA.textContent = a; lcdB.innerHTML = b || '&nbsp;'; }
  function say(html) { readout.innerHTML = html; }
  function pressAnim(btn) { btn.classList.add('is-down'); setTimeout(() => btn.classList.remove('is-down'), 140); }
  function shake(btn) { btn.classList.remove('is-shake'); void btn.offsetWidth; btn.classList.add('is-shake'); }
  function stop() {
    if (job) { job.cancelled = true; clearTimeout(job.timer); }
    job = null;
    if (window.speechSynthesis) speechSynthesis.cancel();
    spk.classList.remove('is-on');
    legend.forEach((l) => l.classList.remove('is-on'));
    cells.forEach((c) => c.classList.remove('is-now'));
  }
  function idle() {
    if (mode === 'data') {
      L = 1; scopeLabel.textContent = 'idle · light on';
      setLcd('Li-Fi receiver ready.', 'Light is on: line idle');
    } else {
      L = 0; scopeLabel.textContent = 'idle';
      setLcd('Waiting for light…');
    }
  }

  /* ---------- voice mode ---------- */
  function sendVoice(key, btn) {
    const msg = MESSAGES[key];
    if (!msg) {
      shake(btn);
      if (/[5-9]/.test(key)) say(`Key ${key} is a free slot. On the device you'd record a message and save it to the SD card as <b>${key}.WAV</b>.`);
      else say(`In voice mode only the number keys play recordings. Switch to <b>Data</b> to send key <b>${key}</b> as a Li&#8209;Fi frame.`);
      return;
    }
    stop();
    const j = (job = { cancelled: false, env: 0, word: 0, t0: performance.now(), dur: 900 + msg.length * 62, started: false, ended: false });
    legend[+key - 1] && legend[+key - 1].classList.add('is-on');
    say(`Sending <b>${key}.WAV</b>: “${msg}”`);
    setLcd(`▶ Playing ${key}.WAV`, '');
    scopeLabel.textContent = 'analog · voice';
    spk.classList.add('is-on');
    const end = () => {
      if (j.cancelled || j.ended) return;
      j.ended = true; job = null;
      spk.classList.remove('is-on'); legend.forEach((l) => l.classList.remove('is-on'));
      setLcd(`Played ${key}.WAV`, `“${msg}”`);
      say(`The car ahead heard: <b>“${msg}”</b> Press another key.`);
      L = 0; scopeLabel.textContent = 'idle';
    };
    // never finish faster than the message would take to say, even if the browser's voice fails
    const finish = () => setTimeout(end, Math.max(0, j.t0 + j.dur * 0.9 - performance.now()));
    const spoken = speak(msg, () => { j.started = true; j.t0 = performance.now(); },
      finish, () => { j.word = performance.now(); });
    // the LCD fills in word by word, like the message arriving
    const words = msg.split(' ');
    words.forEach((w, i) => setTimeout(() => {
      if (!j.cancelled && !j.ended) setLcd(`▶ Playing ${key}.WAV`, `“${words.slice(0, i + 1).join(' ')}${i === words.length - 1 ? '”' : ''}`);
    }, 150 + (j.dur / words.length) * i));
    if (!spoken) { j.started = true; j.timer = setTimeout(end, j.dur); }
    else j.timer = setTimeout(end, 9000);       // safety net if the browser never reports the end
  }

  /* ---------- data mode ---------- */
  function sendData(key) {
    stop();
    const bits = frameOf(key), j = (job = { cancelled: false });
    const code = key.charCodeAt(0);
    cells.forEach((c) => { c.classList.remove('is-1'); c.querySelector('b').textContent = '·'; });
    say(`Sending key <b>${key}</b>: ASCII ${code}, <b>0x${code.toString(16).toUpperCase()}</b>, bits ${code.toString(2).padStart(8, '0')} sent least significant first.`);
    scopeLabel.textContent = 'digital · 1 frame';
    let i = 0, got = 0, got_bits = '';
    setLcd('Receiving…', 'bits: ');
    const step = () => {
      if (j.cancelled) return;
      cells.forEach((c) => c.classList.remove('is-now'));
      if (i >= bits.length) {
        job = null; L = 1;
        const ch = String.fromCharCode(got);
        const m = MESSAGES[ch];
        setLcd(`Received: '${ch}'  0x${got.toString(16).toUpperCase()}`, m ? `→ ${m}` : `→ key ${ch}`);
        say(`Frame decoded: <b>'${ch}'</b>. On a screen in the car ahead, that key ${m ? `shows “${m}”` : 'could stand for any preset message'}. The real link does this in 110 ms.`);
        scopeLabel.textContent = 'idle · light on';
        return;
      }
      const b = bits[i], c = cells[i];
      c.classList.add('is-now'); c.querySelector('b').textContent = b; c.classList.toggle('is-1', !!b);
      L = b; bitsInFlight.push({ v: b, p: 0 }); blip(b);
      // the receiver samples each data bit in the middle of its period
      if (i >= 1 && i <= 8) {
        const k = i;
        setTimeout(() => {
          if (j.cancelled) return;
          if (b) got |= 1 << (k - 1);
          got_bits += b;
          setLcd('Receiving…', `bits: ${got_bits}<span style="opacity:.4">${'_'.repeat(8 - got_bits.length)}</span>`);
        }, BIT_VIS / 2);
      }
      i++;
      j.timer = setTimeout(step, BIT_VIS);
    };
    step();
  }

  function send(key, btn) {
    if (!btn) btn = pad.querySelector(`[data-key="${CSS.escape(key)}"]`);
    if (!btn) return;
    pressAnim(btn);
    if (V.audio && V.soundOn) V.audio();
    mode === 'voice' ? sendVoice(key, btn) : sendData(key);
  }

  pad.addEventListener('click', (e) => {
    const b = e.target.closest('[data-key]'); if (b) send(b.dataset.key, b);
  });

  // keyboard, only while the demo is on screen
  let inView = false;
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; loopOn(e.isIntersecting); }, { threshold: 0.25 }).observe(rig);
  addEventListener('keydown', (e) => {
    if (!inView || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName)) return;
    const k = e.key.length === 1 ? e.key.toUpperCase() : '';
    if (/^[0-9ABCD*#]$/.test(k)) { e.preventDefault(); send(k); }
  });

  // mode switch
  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    if (mode === b.dataset.mode) return;
    stop();
    mode = b.dataset.mode;
    $$('[data-mode]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    rig.classList.toggle('is-data', mode === 'data');
    cells.forEach((c) => { c.classList.remove('is-1'); c.querySelector('b').textContent = '·'; });
    idle();
    say(mode === 'data'
      ? 'Data mode: the light stays on while idle. Press any key to send it as an 11-bit frame.'
      : 'Voice mode: press 1 to send “Your trunk is open.”');
  }));

  soundBtn.addEventListener('click', () => {
    V.soundOn = !V.soundOn;
    soundBtn.setAttribute('aria-pressed', String(V.soundOn));
    if (!V.soundOn && window.speechSynthesis) speechSynthesis.cancel();
  });

  /* ---------- frame loop ---------- */
  let running = false, last = 0;
  function loopOn(on) { if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(tick); } if (!on) running = false; }
  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // in voice mode, the light follows a speech-like envelope while a message plays
    if (mode === 'voice' && job && !job.ended) {
      const t = (now - job.t0) / 1000;
      const wordKick = Math.max(0, 1 - (now - (job.word || 0)) / 260);
      const syl = 0.5 + 0.5 * Math.sin(t * 15.7) * Math.sin(t * 4.3 + 0.6);
      const env = Math.min(1, 0.25 + 0.6 * syl + 0.3 * wordKick);
      for (let k = 0; k < 3; k++) {
        const w = 0.5 + 0.5 * env * Math.sin((t + k / 180) * 150 + Math.sin(t * 9) * 2) * (0.7 + 0.3 * Math.random());
        push(w);
      }
      L = 0.35 + 0.65 * env * (0.75 + 0.25 * Math.random());
    } else {
      push(L);
    }
    rx += (L - rx) * Math.min(1, dt * 30);
    led.classList.toggle('is-on', L > 0.02);
    led.style.setProperty('--lv', L.toFixed(3));
    rxPanel.style.setProperty('--rx', rx.toFixed(3));
    drawBeam(dt); drawScope();
    requestAnimationFrame(tick);
  }

  idle();
})();
