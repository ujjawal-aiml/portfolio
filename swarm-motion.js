/*!
 * swarm-motion.js
 *
 * Drop-in "Motion" button. Click it and the page wipes to a blank canvas, then a swarm of
 * multiplayer-style cursors rebuilds it live: drag-drawn boxes, typed text, sweeping images.
 * Click "Stop" (or press Esc) at any time to return to the live page.
 *
 * Original implementation, inspired by the idea behind Joel Califa's "Swarm".
 * No third-party code is included. Zero dependencies.
 *
 * Usage:   <script src="swarm-motion.js" defer></script>
 * Options (data-* attributes on the script tag):
 *   data-label="Motion"   button text
 *   data-speed="1"        1, 2, 3 ... build speed multiplier
 *   data-cursors="7"      number of cursors (default 7 desktop / 4 mobile)
 *   data-manual           don't auto-add the button; call SwarmMotion.mount() yourself
 * API: window.SwarmMotion = { mount, start, stop, toggle }
 */
(function () {
  'use strict';
  if (window.SwarmMotion) return;

  var scriptEl = document.currentScript;
  var ds = (scriptEl && scriptEl.dataset) || {};
  var OPT = {
    label: ds.label || 'Motion',
    speed: Math.max(0.25, Math.min(6, parseFloat(ds.speed) || 1)),
    fixedSpeed: ds.speed !== undefined,   // otherwise speed adapts to page size (~30-45s per run)
    cursors: parseInt(ds.cursors, 10) || 0,
    maxTasks: 450,
    manual: ds.manual !== undefined
  };

  var NAMES = ['Ada', 'Linus', 'Grace', 'Alan', 'Margaret', 'Tim', 'Hedy', 'Dennis', 'Radia', 'Ken'];
  var COLORS = ['#f24822', '#0d99ff', '#14ae5c', '#9747ff', '#e8a900', '#ff6bb5', '#00a8a0', '#ff8a1f', '#7a5cff', '#e5484d'];
  var BLUE = '#0d99ff';
  var SKIP = { script: 1, style: 1, noscript: 1, template: 1, link: 1, meta: 1, br: 1, wbr: 1, head: 1, title: 1 };
  var MEDIA = { img: 1, svg: 1, video: 1, canvas: 1, picture: 1, iframe: 1, object: 1, embed: 1 };
  var CONTROL = { input: 1, select: 1, textarea: 1, progress: 1, meter: 1 };
  var KEEP = { svg: 1, video: 1, canvas: 1, picture: 1, iframe: 1, object: 1, embed: 1, select: 1, textarea: 1 };
  var FONT = '600 11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

  var PAGE_CSS =
    'html[data-sw-on] body *{pointer-events:none!important}' +
    'html[data-sw-on] body *:not([data-sw-shown]){visibility:hidden!important}' +
    'html[data-sw-on] body [data-sw-shown]{visibility:visible!important}' +
    'html[data-sw-on] body [data-sw-keep] *{visibility:inherit!important}';

  var UI_CSS =
    '.veil{position:fixed;inset:0;opacity:0;pointer-events:none;transition:opacity .35s ease}' +
    'canvas{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none}' +
    '.btn{pointer-events:auto;position:fixed;top:max(14px,env(safe-area-inset-top));left:50%;' +
    'transform:translateX(-50%);display:inline-flex;align-items:center;gap:8px;padding:9px 16px 9px 13px;' +
    'border:0;border-radius:999px;background:#111;color:#fff;' +
    'font:600 13px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.01em;cursor:pointer;' +
    'box-shadow:0 1px 2px rgba(0,0,0,.2),0 6px 20px rgba(0,0,0,.22);transition:background .2s,transform .15s}' +
    '.btn:hover{transform:translateX(-50%) translateY(-1px)}' +
    '.btn:active{transform:translateX(-50%) scale(.97)}' +
    '.btn:focus-visible{outline:2px solid #0d99ff;outline-offset:3px}' +
    '.btn[aria-pressed=true]{background:#0d99ff}' +
    '@media (prefers-reduced-motion:reduce){.veil,.btn{transition:none}}';

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function alphaOf(c) {
    if (!c || c === 'transparent') return 0;
    var m = /^rgba?\(([^)]+)\)/.exec(c);
    if (!m) return 1;
    var p = m[1].split(/[\s,\/]+/).filter(Boolean);
    if (p.length < 4) return 1;
    var a = parseFloat(p[3]);
    return /%/.test(p[3]) ? a / 100 : a;
  }
  function boxy(cs) {
    if (alphaOf(cs.backgroundColor) > 0.02) return true;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    if (cs.boxShadow && cs.boxShadow !== 'none') return true;
    var sides = ['Top', 'Right', 'Bottom', 'Left'];
    for (var i = 0; i < 4; i++) {
      var s = sides[i];
      if (parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none' &&
        alphaOf(cs['border' + s + 'Color']) > 0.02) return true;
    }
    return false;
  }
  function ownTextLen(el) {
    var n = 0;
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) n += c.nodeValue.trim().length;
    }
    return n;
  }

  /* ---------- state ---------- */
  var host, root, veil, canvas, ctx, btn, lbl, dpr = 1, W = 0, H = 0;
  var S = {};
  var tasks = [], orphans = [], cursors = [], touched = [], anims = [];
  var mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  var userScrollUntil = 0;
  var running = false, exiting = false, raf = 0, startTimer = 0;

  function mark(el, attr) {
    if (!el.hasAttribute(attr)) { el.setAttribute(attr, ''); touched.push([el, attr]); }
  }

  /* ---------- snapshot the live DOM into build tasks ---------- */
  function collect() {
    var out = [], orph = [], sy = window.pageYOffset;
    function attach(el, parent) { (parent ? parent.inline : orph).push(el); }
    function walk(el, parent) {
      for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
        var tag = c.localName;
        if (SKIP[tag] || c === host) continue;
        var cs = getComputedStyle(c);
        if (cs.display === 'none' || parseFloat(cs.opacity) < 0.01) continue;
        if (KEEP[tag]) mark(c, 'data-sw-keep');
        var isMedia = !!MEDIA[tag], isCtl = !!CONTROL[tag];

        if (out.length >= OPT.maxTasks) {      // overflow: reveal together with the parent
          attach(c, parent);
          if (!isMedia && !isCtl) walk(c, parent);
          continue;
        }

        var r = c.getBoundingClientRect();
        var kind = null, hasBox = false, chars = 0;
        if (cs.visibility !== 'hidden' && r.width >= 0.5 && r.height >= 0.5 && Math.max(r.width, r.height) >= 3) {
          if (isMedia || isCtl) kind = 'media';
          else {
            chars = ownTextLen(c);
            hasBox = boxy(cs);
            if (chars) kind = 'text'; else if (hasBox) kind = 'rect';
            if (kind === 'text' && !hasBox && cs.display === 'inline' && parent) {
              parent.inline.push(c);            // inline <b>, <a>, <em> ride along with their parent text
              walk(c, parent);
              continue;
            }
          }
        }
        var task = null;
        if (kind) {
          task = {
            el: c, kind: kind, hasBox: hasBox, chars: chars, parent: parent, inline: [],
            claimed: false, done: false, phase: 'pending', p: 0, typeP: 0, lines: null,
            op: parseFloat(cs.opacity), clipSaved: c.style.clipPath,
            top: r.top + (cs.position === 'fixed' ? 0 : sy), left: r.left, idx: out.length
          };
          out.push(task);
        }
        if (!isMedia && !isCtl) walk(c, task || parent);
      }
    }
    walk(document.body, null);
    out.sort(function (a, b) {
      return (Math.round(a.top / 20) - Math.round(b.top / 20)) || (a.left - b.left) || (a.idx - b.idx);
    });
    return { tasks: out, orphans: orph };
  }

  function liveRect(tk) {
    var r = tk.el.getBoundingClientRect();
    return {
      w: r.width, h: r.height,
      cl: clamp(r.left, 0, W), ct: clamp(r.top, 0, H), cr: clamp(r.right, 0, W), cb: clamp(r.bottom, 0, H),
      l: r.left, t: r.top
    };
  }

  /* ---------- text typing geometry ---------- */
  function measureText(el) {
    var er = el.getBoundingClientRect(), lines = [];
    try {
      var rg = document.createRange();
      rg.selectNodeContents(el);
      var rs = rg.getClientRects();
      for (var i = 0; i < rs.length; i++) {
        var q = rs[i];
        if (q.width < 0.5 || q.height < 0.5) continue;
        var hit = null;
        for (var j = 0; j < lines.length; j++) {
          if (Math.abs(lines[j].top - q.top) < q.height * 0.5) { hit = lines[j]; break; }
        }
        if (hit) {
          hit.left = Math.min(hit.left, q.left); hit.right = Math.max(hit.right, q.right);
          hit.top = Math.min(hit.top, q.top); hit.bottom = Math.max(hit.bottom, q.bottom);
        } else lines.push({ left: q.left, right: q.right, top: q.top, bottom: q.bottom });
      }
    } catch (e) { /* fall through to single line */ }
    if (!lines.length) lines.push({ left: er.left, right: er.right, top: er.top, bottom: er.bottom });
    lines.sort(function (a, b) { return a.top - b.top; });
    if (lines.length > 40) {                       // group very long text so typing stays brisk
      var g = Math.ceil(lines.length / 40), grouped = [];
      for (var k = 0; k < lines.length; k += g) {
        var seg = lines.slice(k, k + g), m = { left: 1e9, right: -1e9, top: 1e9, bottom: -1e9 };
        seg.forEach(function (s) {
          m.left = Math.min(m.left, s.left); m.right = Math.max(m.right, s.right);
          m.top = Math.min(m.top, s.top); m.bottom = Math.max(m.bottom, s.bottom);
        });
        grouped.push(m);
      }
      lines = grouped;
    }
    var w = Math.max(er.width, 1), h = Math.max(er.height, 1);
    return lines.map(function (l) {
      return {
        t: clamp((l.top - er.top) / h, 0, 1), b: clamp((l.bottom - er.top) / h, 0, 1),
        l: clamp((l.left - er.left) / w, 0, 1), r: clamp((l.right - er.left) / w, 0, 1)
      };
    });
  }
  function typeGeom(lines, p) {
    var n = lines.length, f = clamp(p, 0, 0.99999) * n, L = Math.min(n - 1, Math.floor(f)), fr = f - L, ln = lines[L];
    return { a: ln.t * 100, b: ln.b * 100, x: (ln.l + (ln.r - ln.l) * fr) * 100 };
  }
  function typePoly(lines, p) {
    var g = typeGeom(lines, p);
    return 'polygon(0 0,100% 0,100% ' + g.a + '%,' + g.x + '% ' + g.a + '%,' + g.x + '% ' + g.b + '%,0 ' + g.b + '%)';
  }

  /* ---------- revealing ---------- */
  function show(tk) {
    mark(tk.el, 'data-sw-shown');
    for (var i = 0; i < tk.inline.length; i++) mark(tk.inline[i], 'data-sw-shown');
  }
  function fadeIn(tk, instant) {
    var d = (instant ? 180 : (tk.kind === 'media' ? 480 : 340)) / (S.speed || 1);
    try {
      var kf = (tk.kind === 'media' && !instant)
        ? [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }]
        : [{ opacity: 0 }, { opacity: isNaN(tk.op) ? 1 : tk.op }];
      anims.push(tk.el.animate(kf, { duration: d, easing: 'ease-out' }));
    } catch (e) { /* WAAPI unavailable: element simply appears */ }
  }
  function markDone(tk) { if (!tk.done) { tk.done = true; S.remaining--; S.lastProgress = S.t; } }
  function instantReveal(tk) {
    if (tk.claimed) return;
    tk.claimed = true;
    show(tk); fadeIn(tk, true);
    tk.phase = 'done';
    markDone(tk);
  }

  /* ---------- scanning for work ---------- */
  function scan() {
    var out = [], docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    var noScroll = (docH - H) < 2;
    while (S.first < tasks.length && tasks[S.first].claimed) S.first++;
    S.scrollTask = null;
    for (var j = S.first; j < tasks.length && out.length < 16; j++) {
      var tk = tasks[j];
      if (tk.claimed) continue;
      var blocked = tk.parent && !tk.parent.done;
      if (blocked) continue;
      var r = tk.el.getBoundingClientRect();
      if (r.right <= 4 || r.left >= W - 4) { instantReveal(tk); continue; }      // can never be on screen
      var inView = r.bottom > 4 && r.top < H - 4;
      if (inView) out.push(tk);
      else if (noScroll) instantReveal(tk);
      else if (!S.scrollTask) S.scrollTask = tk;
    }
    return out;
  }

  function anyBusy() {
    for (var i = 0; i < cursors.length; i++) if (cursors[i].busy) return true;
    return false;
  }

  function scrollControl(h) {
    if (anyBusy() || S.claimable.length || !S.scrollTask) return;
    if (performance.now() < userScrollUntil) return;
    var tk = S.scrollTask, r = tk.el.getBoundingClientRect();
    if (r.bottom > 4 && r.top < H - 4) { S.nextScan = 0; return; }
    var docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    var maxY = Math.max(0, docH - H), cur = window.pageYOffset;
    var desired = clamp(cur + r.top - H * 0.2, 0, maxY), dy = desired - cur;
    if (Math.abs(dy) < 1.5) { instantReveal(tk); S.scrollTask = null; return; }   // unreachable by scrolling
    var sp = clamp(Math.abs(dy) * 3, 160, 1500);
    var mv = Math.min(Math.abs(dy), sp * h) * (dy < 0 ? -1 : 1);
    window.scrollTo({ top: cur + mv, behavior: 'instant' });
    S.lastProgress = S.t;
  }

  /* ---------- cursors ---------- */
  function makeCursors() {
    var n = OPT.cursors || (innerWidth < 700 ? 4 : 7);
    cursors = [];
    for (var i = 0; i < n; i++) {
      var e = Math.floor(Math.random() * 4), x, y;
      if (e === 0) { x = Math.random() * W; y = -30; }
      else if (e === 1) { x = W + 30; y = Math.random() * H; }
      else if (e === 2) { x = Math.random() * W; y = H + 30; }
      else { x = -30; y = Math.random() * H; }
      cursors.push({
        i: i, name: NAMES[i % NAMES.length], color: COLORS[i % COLORS.length],
        x: x, y: y, vx: 0, vy: 0, tx: x, ty: y, k: 16,
        state: 'idle', stateT: 0, task: null, pulse: 0, ibeam: false, busy: false, dd: 0.3, td: 0.5,
        a: Math.random() * 6.283, w: (1 + i * 0.13) * (i % 2 ? -1 : 1), R: 70 + i * 22,
        startAt: S.introEnd + i * 0.14, hx: W / 2, hy: H / 2
      });
    }
  }

  function claim(c, tk) {
    tk.claimed = true; tk.phase = 'travel'; tk.p = 0;
    c.task = tk; c.state = 'travel'; c.stateT = 0; c.busy = true;
    var r = liveRect(tk);
    c.dd = clamp(0.22 + ((r.cr - r.cl) + (r.cb - r.ct)) / 1500, 0.22, 0.7);
    S.active.push(tk);
    S.lastProgress = S.t;
  }
  function claimNext(c) {
    while (S.claimable.length) {
      var tk = S.claimable.shift();
      if (tk.claimed || (tk.parent && !tk.parent.done)) continue;
      claim(c, tk);
      return true;
    }
    return false;
  }
  function complete(c) {
    var tk = c.task;
    S.active = S.active.filter(function (t) { return t !== tk; });
    c.hx = c.x; c.hy = c.y; c.task = null; c.state = 'idle'; c.busy = false; c.pulse = 1; c.nextTry = S.t + 0.05;
    S.lastProgress = S.t;
  }

  function updateCursor(c, h) {
    var t = S.t, n = cursors.length;
    c.ibeam = false;
    c.pulse = Math.max(0, c.pulse - h * 4);

    if (S.phase === 'intro') {
      c.k = 16; c.a += c.w * h;
      c.tx = W / 2 + Math.cos(c.a) * c.R;
      c.ty = H / 2 + Math.sin(c.a) * c.R * 0.7;
    } else if (S.phase === 'finale') {
      c.k = 26;
      var ang = c.i * (6.283 / n) + t * 0.9, rad = 28 + (c.i % 3) * 14 + Math.sin(t * 2 + c.i) * 6;
      c.tx = mouse.x + Math.cos(ang) * rad; c.ty = mouse.y + Math.sin(ang) * rad;
    } else {
      switch (c.state) {
        case 'idle':
          if (t >= c.startAt && t >= (c.nextTry || 0)) { if (!claimNext(c)) c.nextTry = t + 0.08; }
          if (c.state === 'idle') {
            c.k = 14;
            c.tx = clamp(c.hx + Math.cos(t * 0.9 + c.i * 1.7) * 34, 10, W - 10);
            c.ty = clamp(c.hy + Math.sin(t * 1.1 + c.i * 2.3) * 24, 10, H - 10);
          }
          break;
        case 'travel': {
          var r = liveRect(c.task);
          c.k = 48; c.tx = r.cl; c.ty = r.ct; c.stateT += h;
          var d = Math.hypot(c.tx - c.x, c.ty - c.y);
          if ((d < 20 && c.stateT > 0.1) || c.stateT > 1.1) {
            c.state = 'press'; c.stateT = 0; c.pulse = 1; c.task.phase = 'drag'; c.task.p = 0;
          }
          break;
        }
        case 'press': {
          var rp = liveRect(c.task);
          c.k = 60; c.tx = rp.cl; c.ty = rp.ct; c.stateT += h;
          if (c.stateT > 0.08) { c.state = 'drag'; c.stateT = 0; }
          break;
        }
        case 'drag': {
          var rd = liveRect(c.task);
          c.stateT += h;
          var p = ease(c.stateT / c.dd);
          c.task.p = p; c.k = 130;
          c.tx = rd.cl + (rd.cr - rd.cl) * p; c.ty = rd.ct + (rd.cb - rd.ct) * p;
          if (c.stateT >= c.dd) { c.state = 'release'; c.stateT = 0; c.task.p = 1; c.task.phase = 'placed'; c.pulse = 1; }
          break;
        }
        case 'release': {
          var rr = liveRect(c.task);
          c.k = 100; c.tx = rr.cr; c.ty = rr.cb; c.stateT += h;
          if (c.stateT > 0.08) beginReveal(c);
          break;
        }
        case 'type': {
          var tk = c.task, p2 = clamp(c.stateT / c.td, 0, 1);
          c.ibeam = true; c.k = 140; c.stateT += h;
          tk.typeP = p2;
          var g = typeGeom(tk.lines, p2), er = tk.el.getBoundingClientRect();
          c.tx = clamp(er.left + g.x / 100 * er.width, 0, W);
          c.ty = clamp(er.top + (g.a + g.b) / 200 * er.height, 0, H);
          if (p2 >= 1) {
            tk.el.style.clipPath = tk.clipSaved; tk.phase = 'done';
            complete(c);
          }
          break;
        }
      }
    }
    var cc = 2 * Math.sqrt(c.k) * 0.82;
    c.vx += ((c.tx - c.x) * c.k - c.vx * cc) * h;
    c.vy += ((c.ty - c.y) * c.k - c.vy * cc) * h;
    c.x += c.vx * h; c.y += c.vy * h;
  }

  function beginReveal(c) {
    var tk = c.task;
    if (tk.kind === 'text') {
      tk.lines = measureText(tk.el);
      tk.phase = 'typing'; tk.typeP = 0;
      tk.el.style.clipPath = typePoly(tk.lines, 0);
      show(tk);
      markDone(tk);
      c.state = 'type'; c.stateT = 0;
      c.td = clamp(0.28 + tk.chars * 0.012, 0.35, 1.7);
    } else {
      show(tk); fadeIn(tk, false);
      tk.phase = 'done';
      markDone(tk);
      complete(c);
    }
  }

  /* ---------- simulation ---------- */
  function forceAll() {
    tasks.forEach(function (tk) {
      if (!tk.claimed) instantReveal(tk);
      else if (!tk.done) { show(tk); tk.el.style.clipPath = tk.clipSaved; tk.phase = 'done'; markDone(tk); }
    });
    cursors.forEach(function (c) { c.state = 'idle'; c.busy = false; c.task = null; });
    S.active = [];
  }

  function beginFinale() {
    S.phase = 'finale'; S.finaleEnd = S.t + 2.2;
    orphans.forEach(function (el) { mark(el, 'data-sw-shown'); });
    cursors.forEach(function (c) { c.pulse = 1; });
  }

  function step(h) {
    S.t += h;
    if (S.phase === 'intro' && S.t >= S.introEnd) S.phase = 'build';
    if (S.phase === 'build') {
      if (S.t >= S.nextScan) { S.nextScan = S.t + 0.1; S.claimable = scan(); }
      scrollControl(h);
      if (S.t - S.lastProgress > 3.5 && !anyBusy()) {          // nothing is moving: unstick
        for (var i = 0; i < tasks.length; i++) if (!tasks[i].claimed) { instantReveal(tasks[i]); break; }
        S.lastProgress = S.t;
      }
      if (S.t > 150) forceAll();
      if (S.remaining <= 0 && !anyBusy()) beginFinale();
    } else if (S.phase === 'finale' && S.t >= S.finaleEnd) {
      S.phase = 'out';
      stop();
      return;
    }
    for (var k = 0; k < cursors.length; k++) updateCursor(cursors[k], h);
  }

  /* ---------- drawing ---------- */
  function pill(x, y, w, h, r, fill) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.fillStyle = fill; ctx.fill();
  }
  function drawBox(x0, y0, x1, y1, handles, label) {
    var w = x1 - x0, h = y1 - y0;
    if (w < 0.5 && h < 0.5) return;
    ctx.fillStyle = 'rgba(120,120,128,0.14)'; ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = BLUE; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, w, h);
    if (handles) {
      [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].forEach(function (p) {
        ctx.fillStyle = '#fff'; ctx.fillRect(p[0] - 3, p[1] - 3, 6, 6);
        ctx.strokeRect(p[0] - 2.5, p[1] - 2.5, 5, 5);
      });
    }
    if (label) {
      ctx.font = FONT;
      var tw = ctx.measureText(label).width + 12;
      var bx = clamp(x1 - tw / 2, 4, W - tw - 4), by = clamp(y1 + 10, 4, H - 24);
      pill(bx, by, tw, 18, 4, BLUE);
      ctx.fillStyle = '#fff'; ctx.fillText(label, bx + 6, by + 13);
    }
  }
  function drawTask(tk) {
    var r = liveRect(tk);
    if (r.cr <= r.cl && r.cb <= r.ct) return;
    if (tk.phase === 'drag') {
      var p = tk.p;
      drawBox(r.cl, r.ct, r.cl + (r.cr - r.cl) * p, r.ct + (r.cb - r.ct) * p, true,
        Math.round(r.w * p) + ' \u00d7 ' + Math.round(r.h * p));
    } else if (tk.phase === 'placed') {
      drawBox(r.cl, r.ct, r.cr, r.cb, true, Math.round(r.w) + ' \u00d7 ' + Math.round(r.h));
    } else if (tk.phase === 'typing') {
      ctx.strokeStyle = BLUE; ctx.lineWidth = 1;
      ctx.strokeRect(r.cl + 0.5, r.ct + 0.5, r.cr - r.cl, r.cb - r.ct);
    }
  }
  function drawCursor(c) {
    var x = c.x, y = c.y;
    if (c.pulse > 0) {
      ctx.beginPath(); ctx.arc(x, y, 4 + (1 - c.pulse) * 16, 0, 6.283);
      ctx.strokeStyle = c.color; ctx.globalAlpha = c.pulse * 0.7; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.translate(x, y);
    if (c.ibeam) {
      ctx.strokeStyle = c.color; ctx.lineWidth = 1.6; ctx.beginPath();
      ctx.moveTo(-3, -9); ctx.lineTo(3, -9); ctx.moveTo(0, -9); ctx.lineTo(0, 9); ctx.moveTo(-3, 9); ctx.lineTo(3, 9);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, 16); ctx.lineTo(4.2, 12.2); ctx.lineTo(7.2, 19);
      ctx.lineTo(9.6, 17.9); ctx.lineTo(6.7, 11.3); ctx.lineTo(12, 11.3); ctx.closePath();
      ctx.fillStyle = c.color; ctx.fill();
      ctx.lineWidth = 1.3; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; ctx.stroke();
    }
    ctx.font = FONT;
    var tw = ctx.measureText(c.name).width + 12, ly = c.ibeam ? 8 : 20;
    pill(12, ly, tw, 18, 9, c.color);
    ctx.fillStyle = '#fff'; ctx.fillText(c.name, 18, ly + 13);
    ctx.restore();
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < S.active.length; i++) {
      var tk = S.active[i];
      if (tk.phase === 'typing' && tk.lines) tk.el.style.clipPath = tk.typeP >= 1 ? tk.clipSaved : typePoly(tk.lines, tk.typeP);
      drawTask(tk);
    }
    for (var j = 0; j < cursors.length; j++) drawCursor(cursors[j]);
  }

  function frame(now) {
    if (!running || exiting) return;
    var dt = Math.min((now - S.last) / 1000, 0.05);
    S.last = now;
    var sdt = dt * S.speed;
    while (sdt > 1e-6 && !exiting) { var h = Math.min(sdt, 0.02); step(h); sdt -= h; }
    if (exiting) return;
    draw();
    raf = requestAnimationFrame(frame);
  }

  /* ---------- lifecycle ---------- */
  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }

  function setBtn(on) {
    lbl.textContent = on ? 'Stop' : OPT.label;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function pageBg() {
    var c = getComputedStyle(document.body).backgroundColor;
    if (alphaOf(c) < 0.05) c = getComputedStyle(document.documentElement).backgroundColor;
    return alphaOf(c) < 0.05 ? '#ffffff' : c;
  }

  function cleanup() {
    document.documentElement.removeAttribute('data-sw-on');
    anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* noop */ } });
    anims = [];
    tasks.forEach(function (tk) { tk.el.style.clipPath = tk.clipSaved; });
    touched.forEach(function (p) { p[0].removeAttribute(p[1]); });
    touched = []; tasks = []; orphans = []; cursors = [];
    S.active = [];
  }

  function finishExit() {
    running = false; exiting = false;
    setBtn(false);
  }

  function quickFade() {                       // reduced-motion / nothing-to-build path
    veil.style.background = pageBg(); veil.style.opacity = 1;
    setTimeout(function () {
      veil.style.opacity = 0;
      setTimeout(finishExit, 380);
    }, 380);
  }

  function start() {
    if (running) return;
    mount();
    running = true; exiting = false;
    setBtn(true);
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    S = {
      t: 0, phase: 'wait', introEnd: 1.5, savedY: window.pageYOffset, bg: pageBg(),
      remaining: 0, first: 0, claimable: [], nextScan: 0, scrollTask: null, active: [], lastProgress: 0, last: 0
    };
    if (reduced) { quickFade(); return; }
    resize();
    // Lets the host page settle reveal-on-scroll states before the DOM is snapshotted.
    try { document.dispatchEvent(new CustomEvent('swarm-motion:before-collect')); } catch (e) { /* noop */ }
    var snap = collect();
    tasks = snap.tasks; orphans = snap.orphans;
    S.remaining = tasks.length;
    S.speed = OPT.fixedSpeed ? OPT.speed : clamp(tasks.length / 45, 1, 3.5);
    if (!tasks.length) { cleanup(); quickFade(); return; }
    veil.style.background = S.bg; veil.style.opacity = 1;
    startTimer = setTimeout(begin, 380);
  }

  function begin() {
    if (!running || exiting) return;
    document.documentElement.setAttribute('data-sw-on', '');
    resize();
    makeCursors();
    S.phase = 'intro';
    veil.style.opacity = 0;
    S.last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (!running || exiting) return;
    exiting = true;
    clearTimeout(startTimer);
    cancelAnimationFrame(raf);
    veil.style.background = S.bg || '#fff';
    veil.style.opacity = 1;
    setTimeout(function () {
      cleanup();
      window.scrollTo({ top: S.savedY || 0, behavior: 'instant' });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      veil.style.opacity = 0;
      setTimeout(finishExit, 380);
    }, 380);
  }

  function toggle() { if (running) stop(); else start(); }

  function mount() {
    if (host) return;
    var st = document.createElement('style');
    st.id = 'swarm-motion-page-style';
    st.textContent = PAGE_CSS;
    document.head.appendChild(st);

    host = document.createElement('div');
    host.id = 'swarm-motion-host';
    host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<style>' + UI_CSS + '</style><div class="veil"></div><canvas></canvas>' +
      '<button class="btn" type="button" aria-pressed="false">' +
      '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">' +
      '<path d="M2.5 1.5v11l3-2.6 2 4.4 2.1-1-2-4.3h4z" fill="currentColor"/></svg>' +
      '<span class="lbl"></span></button>';
    document.documentElement.appendChild(host);
    veil = root.querySelector('.veil');
    canvas = root.querySelector('canvas');
    ctx = canvas.getContext('2d');
    btn = root.querySelector('.btn');
    lbl = root.querySelector('.lbl');
    lbl.textContent = OPT.label;
    btn.addEventListener('click', toggle);
    resize();

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    var bump = function () { userScrollUntil = performance.now() + 600; };
    window.addEventListener('wheel', bump, { passive: true });
    window.addEventListener('touchmove', bump, { passive: true });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && running) stop();
    });
  }

  window.SwarmMotion = { mount: mount, start: start, stop: stop, toggle: toggle };

  if (!OPT.manual) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
  }
})();
