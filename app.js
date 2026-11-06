/* Renders the portfolio from window.SITE (see site.js). No dependencies. */
(function () {
  'use strict';
  var S = window.SITE, I = S.identity, C = S.contact, P = S.preferences || {};
  var root = document.documentElement;
  root.classList.add('js');

  /* ---------- tiny DOM helper (text is always set as text, never HTML) ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v == null) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    function add(c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) { c.forEach(add); return; }
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    for (var i = 2; i < arguments.length; i++) add(arguments[i]);
    return el;
  }
  function ext(href, text, cls, label) {
    return h('a', { href: href, class: cls, target: '_blank', rel: 'noopener noreferrer', 'aria-label': label }, text);
  }

  /* ---------- metadata from config ---------- */
  var title = I.fullName + ' | ' + I.profession;
  document.title = title;
  function setMeta(sel, val) { var m = document.querySelector(sel); if (m) m.setAttribute('content', val); }
  setMeta('meta[name="description"]', I.intro);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', I.intro);
  if (S.websiteUrl) document.head.appendChild(h('link', { rel: 'canonical', href: S.websiteUrl }));
  document.getElementById('wm-initials').textContent = I.initials;

  /* ---------- sections ---------- */
  var main = document.getElementById('main');
  main.textContent = '';
  var navItems = [];

  function section(id, label, inner) {
    navItems.push({ id: id, label: label });
    return h('section', { id: id, 'aria-labelledby': id + '-h' }, h('div', { class: 'wrap' }, inner));
  }

  // Hero
  var hero = h('section', { class: 'hero', id: 'top', 'aria-label': 'Introduction' },
    heroArt(),
    I.portrait ? h('figure', { class: 'portrait' },
      h('img', { src: I.portrait, alt: I.portraitAlt || I.fullName, width: 900, height: 870, decoding: 'async', fetchpriority: 'high' })) : null,
    h('div', { class: 'wrap' },
      h('span', { class: 'hello', text: 'Hi, I’m' }),
      h('h1', { class: 'name', 'aria-label': I.fullName },
        h('span', { 'aria-hidden': 'true', text: I.firstName }),
        h('span', { 'aria-hidden': 'true', text: I.lastName })),
      h('p', { class: 'role' }, I.profession,
        I.roleLine2 ? h('small', { text: I.roleLine2 }) : null,
        I.location ? h('small', { text: 'Based in ' + I.location }) : null),
      h('p', { class: 'headline', text: I.headline }),
      h('p', { class: 'intro', text: I.intro }),
      h('div', { class: 'cta-row' },
        h('a', { class: 'btn primary', href: '#work', text: 'View Work' }),
        h('a', { class: 'btn', href: '#contact', text: 'Contact' }),
        P.showDownloadResume && I.resume ? h('a', { class: 'btn', href: I.resume, download: true, text: 'Download Resume' }) : null),
      P.showMetrics && S.metrics && S.metrics.length
        ? h('div', { class: 'metrics' }, S.metrics.map(function (m) {
            return h('div', { class: 'metric' }, h('b', { text: m.value }), h('span', { text: m.label }));
          }))
        : null));
  main.appendChild(hero);

  // Marquee ticker (decorative; hidden from screen readers)
  if (S.marquee && S.marquee.length) {
    var run = function () { return S.marquee.map(function (t) { return h('span', { text: t }); }); };
    main.appendChild(h('div', { class: 'marquee', 'aria-hidden': 'true' },
      h('div', { class: 'marquee-track' }, run(), run(), run(), run())));
  }

  // What I do
  if (S.services && S.services.length) {
    main.appendChild(section('services', 'Services', [
      h('span', { class: 'eyebrow', text: 'What I do' }),
      h('h2', { class: 'h2 reveal', id: 'services-h' }, 'Where I can ', h('em', { text: 'help' })),
      h('div', { class: 'svc-grid' }, S.services.map(function (s, i) {
        return h('article', { class: 'svc reveal' },
          h('span', { class: 'svc-n', 'aria-hidden': 'true', text: (i + 1 < 10 ? '0' : '') + (i + 1) }),
          h('h3', { text: s.title }), h('p', { text: s.text }));
      }))
    ]));
  }

  // Work (with category filter + search)
  if (S.projects && S.projects.length) {
    var grid = h('div', { class: 'grid', id: 'project-grid' });
    var empty = h('p', { class: 'empty', hidden: true, text: 'No projects match that search. Try another keyword or category.' });
    var cats = ['All'];
    S.projects.forEach(function (p) { if (cats.indexOf(p.category) < 0) cats.push(p.category); });
    var activeCat = 'All', query = '';
    var search = h('input', { type: 'search', id: 'project-search', placeholder: 'Search projects or tools…', 'aria-label': 'Search projects' });
    var count = h('p', { class: 'sr', role: 'status', 'aria-live': 'polite' });
    var filterBar = h('div', { class: 'filters', role: 'group', 'aria-label': 'Filter projects by category' });
    var chipEls = cats.map(function (c) {
      var b = h('button', { type: 'button', class: 'filter', 'aria-pressed': c === 'All' ? 'true' : 'false', text: c });
      b.addEventListener('click', function () { activeCat = c; renderProjects(); });
      filterBar.appendChild(b);
      return b;
    });
    function renderProjects() {
      var q = query.trim().toLowerCase();
      var list = S.projects.filter(function (p) {
        var inCat = activeCat === 'All' || p.category === activeCat;
        var hay = (p.title + ' ' + p.subtitle + ' ' + p.summary + ' ' + p.category + ' ' + p.tools.join(' ')).toLowerCase();
        return inCat && (!q || hay.indexOf(q) >= 0);
      });
      grid.textContent = '';
      list.forEach(function (p) {
        var card = projectCard(p, S.projects.indexOf(p));
        card.classList.add('in');
        grid.appendChild(card);
      });
      empty.hidden = list.length > 0;
      chipEls.forEach(function (b) { b.setAttribute('aria-pressed', b.textContent === activeCat ? 'true' : 'false'); });
      count.textContent = list.length + (list.length === 1 ? ' project shown' : ' projects shown');
    }
    search.addEventListener('input', function () { query = search.value; renderProjects(); });
    main.appendChild(section('work', 'Work', [
      h('span', { class: 'eyebrow', text: 'Selected work' }),
      h('h2', { class: 'h2 reveal', id: 'work-h' }, 'Things I’ve ', h('em', { text: 'built' })),
      h('div', { class: 'toolbar' }, filterBar, search),
      count, grid, empty
    ]));
    renderProjects();
  }

  // How I build
  if (S.process && S.process.length) {
    main.appendChild(section('process', 'Process', [
      h('span', { class: 'eyebrow', text: 'Process' }),
      h('h2', { class: 'h2 reveal', id: 'process-h' }, 'How I ', h('em', { text: 'build' })),
      h('ol', { class: 'steps' }, S.process.map(function (s) {
        return h('li', { class: 'step reveal' },
          h('span', { class: 'step-n', 'aria-hidden': 'true', text: s.step }),
          h('div', null, h('h3', { text: s.title }), h('p', { text: s.text })));
      }))
    ]));
  }

  // About + skills
  main.appendChild(section('about', 'About', [
    h('span', { class: 'eyebrow', text: 'About' }),
    h('h2', { class: 'h2 reveal', id: 'about-h' }, 'Data, models, ', h('em', { text: 'product' })),
    h('div', { class: 'about-grid' },
      h('div', { class: 'about-copy reveal' }, I.about.map(function (t) { return h('p', { text: t }); })),
      h('div', { class: 'skills reveal' }, S.skills.map(function (g) {
        return h('div', { class: 'skill-group' },
          h('h3', { text: g.group }),
          h('ul', { class: 'chips', 'aria-label': g.group }, g.items.map(function (s) { return h('li', { class: 'chip', text: s }); })));
      })))
  ]));

  // Experience + education + achievements
  if (P.showExperience && S.experience && S.experience.length) {
    var blocks = [
      h('span', { class: 'eyebrow', text: 'Experience' }),
      h('h2', { class: 'h2 reveal', id: 'experience-h' }, 'Where I’ve ', h('em', { text: 'worked' })),
      h('div', { class: 'xp-grid' },
        h('div', { class: 'timeline reveal' }, S.experience.map(function (x, i) {
          return h('details', { class: 'xp', open: true },
            h('summary', null,
              h('span', { class: 'role-t', text: x.role }),
              h('span', { class: 'dates', text: x.dates }),
              h('span', { class: 'org', text: x.org })),
            h('ul', null, x.points.map(function (p) { return h('li', { text: p }); })));
        })),
        h('div', { class: 'two' },
          P.showEducation && S.education && S.education.length
            ? h('div', { class: 'list-block reveal' }, h('h3', { text: 'Education' }),
                S.education.map(function (e) {
                  return h('div', { class: 'edu' }, h('b', { text: e.title }),
                    h('span', { text: e.place }), h('span', { text: e.dates + (e.note ? ' · ' + e.note : '') }));
                }))
            : null,
          S.achievements && S.achievements.length
            ? h('div', { class: 'list-block reveal' }, h('h3', { text: 'Achievements & leadership' }),
                h('ul', { class: 'ach' }, S.achievements.map(function (a) { return h('li', { text: a }); })))
            : null))
    ];
    main.appendChild(section('experience', 'Experience', blocks));
  }

  // Closing call-to-action band
  var mailHref = 'mailto:' + C.email;
  main.appendChild(h('section', { class: 'band', 'aria-label': 'Call to action' },
    h('div', { class: 'wrap' },
      h('p', { class: 'band-t reveal' }, 'Have an AI idea? ', h('em', { text: 'Let’s build it.' })),
      h('a', { class: 'btn primary magnetic', href: '#contact', text: 'Start a conversation' }))));

  // Contact
  main.appendChild(section('contact', 'Contact', [
    h('span', { class: 'eyebrow', text: 'Contact' }),
    h('h2', { class: 'h2 reveal', id: 'contact-h' }, 'Let’s ', h('em', { text: 'talk' })),
    h('div', { class: 'contact-grid' },
      h('div', { class: 'reveal' },
        h('p', { class: 'lead', text: 'Open to internships, collaborations and conversations about AI and ML projects.' + (I.location ? ' Based in ' + I.location + '.' : '') }),
        h('a', { class: 'big-mail', href: mailHref, text: C.email }),
        h('div', { class: 'socials' },
          C.github ? ext(C.github, 'GitHub', 'btn', 'GitHub profile (opens in a new tab)') : null,
          C.linkedin ? ext(C.linkedin, 'LinkedIn', 'btn', 'LinkedIn profile (opens in a new tab)') : null)),
      P.showContactForm ? contactForm() : null)
  ]));

  // Nav (only sections that exist) + CTA
  var menu = document.getElementById('menu');
  navItems.forEach(function (n) {
    if (n.id === 'contact') return;
    menu.appendChild(h('li', null, h('a', { href: '#' + n.id, 'data-id': n.id, text: n.label })));
  });
  menu.appendChild(h('li', null, h('a', { class: 'cta', href: '#contact', 'data-id': 'contact', text: 'Contact' })));
  var animBtn = h('button', { type: 'button', class: 'anim-toggle', 'aria-pressed': 'true', 'aria-label': 'Page animations' }, h('span', { class: 'dot', 'aria-hidden': 'true' }), h('span', { class: 'anim-l', text: 'Animations: On' }));
  menu.appendChild(h('li', null, animBtn));

  // Footer
  var foot = document.getElementById('footer');
  foot.appendChild(h('div', { class: 'wrap' },
    h('span', { text: '© ' + new Date().getFullYear() + ' ' + I.fullName }),
    h('ul', null,
      C.github ? h('li', null, ext(C.github, 'GitHub')) : null,
      C.linkedin ? h('li', null, ext(C.linkedin, 'LinkedIn')) : null,
      h('li', null, h('a', { href: mailHref, text: 'Email' })),
      h('li', null, h('a', { href: '#top', text: 'Back to top ↑' })))));

  /* ---------- components ---------- */
  function heroArt() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'hero-art');
    svg.setAttribute('viewBox', '0 0 600 600');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var g = '';
    [90, 170, 250, 290].forEach(function (r, i) {
      g += '<circle cx="300" cy="300" r="' + r + '" fill="none" stroke="' + (i === 3 ? '#e32b3c' : '#2e2e2e') + '" stroke-width="' + (i === 3 ? 1.5 : 1) + '"' + (i === 2 ? ' stroke-dasharray="3 7"' : '') + '/>';
    });
    // a small "network" of nodes
    var pts = [[300, 10], [545, 175], [470, 470], [140, 520], [60, 210], [300, 300], [400, 150], [190, 380]];
    var edges = [[5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 6], [5, 7], [6, 1], [7, 3]];
    edges.forEach(function (e) {
      g += '<line x1="' + pts[e[0]][0] + '" y1="' + pts[e[0]][1] + '" x2="' + pts[e[1]][0] + '" y2="' + pts[e[1]][1] + '" stroke="#2e2e2e"/>';
    });
    pts.forEach(function (p, i) {
      g += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === 5 ? 9 : 5) + '" fill="' + (i === 5 ? '#e32b3c' : '#f2efeb') + '"/>';
    });
    svg.innerHTML = g;
    return svg;
  }

  function projectCard(p, i) {
    var hue = [8, 215, 150, 280][i % 4];
    var num = (i + 1 < 10 ? '0' : '') + (i + 1);
    var btn = h('button', { class: 'btn primary', type: 'button', 'aria-haspopup': 'dialog', 'aria-label': 'View details: ' + p.title, text: 'View details' });
    btn.addEventListener('click', function () { openProject(p, btn); });
    return h('article', { class: 'card reveal' },
      h('div', { class: 'card-art', style: '--hue:' + hue, 'aria-hidden': 'true' },
        h('span', { class: 'num', text: num }),
        h('div', { class: 'stack' }, p.tools.slice(0, 3).map(function (t) { return h('span', { class: 'chip', text: t }); }))),
      h('div', { class: 'card-body' },
        h('span', { class: 'tag', text: p.category }),
        h('h3', { text: p.title }),
        h('p', { text: p.summary }),
        h('div', { class: 'card-actions' }, btn,
          p.githubUrl ? ext(p.githubUrl, 'GitHub ↗', 'btn', 'GitHub repository for ' + p.title + ' (opens in a new tab)') : null)));
  }

  /* ---------- project dialog ---------- */
  var dlg = document.getElementById('project-dialog');
  var lastTrigger = null;
  function openProject(p, trigger) {
    lastTrigger = trigger;
    dlg.textContent = '';
    var close = h('button', { class: 'pd-close', type: 'button', 'aria-label': 'Close dialog', text: '✕' });
    close.addEventListener('click', function () { dlg.close(); });
    dlg.appendChild(h('div', { class: 'pd' }, close,
      h('span', { class: 'tag', text: p.category }),
      h('h2', { id: 'pd-title', text: p.title }),
      p.subtitle ? h('p', { class: 'sub', text: p.subtitle }) : null,
      h('ul', { class: 'points' }, p.highlights.map(function (t) { return h('li', { text: t }); })),
      h('h3', { text: 'Tech stack' }),
      h('ul', { class: 'chips', 'aria-label': 'Tech stack' }, p.tools.map(function (t) { return h('li', { class: 'chip', text: t }); })),
      p.githubUrl ? ext(p.githubUrl, 'View on GitHub ↗', 'btn primary', 'View ' + p.title + ' on GitHub (opens in a new tab)') : null));
    dlg.showModal();
    close.focus();
  }
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () {
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  });

  /* ---------- contact form (mailto — nothing is sent from the site itself) ---------- */
  function contactForm() {
    var status = h('p', { id: 'form-status', role: 'status', 'aria-live': 'polite' });
    var f = h('form', { class: 'reveal', novalidate: true, 'aria-label': 'Email draft form' },
      h('label', null, 'Your name', h('input', { name: 'name', type: 'text', autocomplete: 'name', required: true })),
      h('label', null, 'Your email', h('input', { name: 'email', type: 'email', autocomplete: 'email', required: true })),
      h('label', null, 'Message', h('textarea', { name: 'message', required: true })),
      h('button', { class: 'btn primary', type: 'submit', text: 'Draft email' }),
      h('p', { class: 'form-note', text: 'This opens your email app with a pre-filled draft. Nothing is sent until you press send there.' }),
      status);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(f), name = (d.get('name') || '').trim(), mail = (d.get('email') || '').trim(), msg = (d.get('message') || '').trim();
      if (!name || !/^\S+@\S+\.\S+$/.test(mail) || !msg) {
        status.textContent = 'Please fill in your name, a valid email and a message.';
        return;
      }
      status.textContent = 'Opening your email app…';
      window.location.href = 'mailto:' + C.email + '?subject=' + encodeURIComponent('Portfolio enquiry from ' + name) +
        '&body=' + encodeURIComponent(msg + '\n\n— ' + name + ' (' + mail + ')');
    });
    return f;
  }

  /* ---------- mobile menu ---------- */
  var mb = document.getElementById('menu-btn');
  function setMenu(open) { menu.classList.toggle('open', open); mb.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  mb.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); mb.focus(); }
  });

  /* ---------- active section + scroll progress ---------- */
  var links = {};
  menu.querySelectorAll('a[data-id]').forEach(function (a) { links[a.getAttribute('data-id')] = a; });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].removeAttribute('aria-current'); });
        var a = links[en.target.id];
        if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    main.querySelectorAll('section[id]').forEach(function (s) { io.observe(s); });
  }
  var bar = document.getElementById('progress'), ticking = false;
  function updateBar() {
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0) + ')';
    ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(updateBar); } }, { passive: true });
  updateBar();

  /* ---------- reveal on scroll ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); ro.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }
  /* ---------- animations on/off (remembered; defaults to off if the OS asks for reduced motion) ---------- */
  var KEY = 'uc-portfolio-animations';
  var animOn = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  try { var saved = localStorage.getItem(KEY); if (saved === 'on' || saved === 'off') animOn = saved === 'on'; } catch (e) { /* storage blocked */ }
  function applyAnim() {
    root.setAttribute('data-anim', animOn ? 'on' : 'off');
    animBtn.setAttribute('aria-pressed', animOn ? 'true' : 'false');
    animBtn.querySelector('.anim-l').textContent = 'Animations: ' + (animOn ? 'On' : 'Off');
    if (!animOn) document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }
  animBtn.addEventListener('click', function () {
    animOn = !animOn;
    try { localStorage.setItem(KEY, animOn ? 'on' : 'off'); } catch (e) { /* ignore */ }
    applyAnim();
  });
  applyAnim();

  /* ---------- hero parallax + magnetic buttons (fine pointers only, never required) ---------- */
  var fine = window.matchMedia && matchMedia('(pointer:fine)').matches;
  var art = document.querySelector('.hero-art');
  if (art) {
    addEventListener('scroll', function () {
      if (!animOn || scrollY > innerHeight) return;
      art.style.transform = 'translateY(calc(-50% + ' + (scrollY * 0.18) + 'px))';
    }, { passive: true });
  }
  if (fine) {
    document.querySelectorAll('.magnetic, .hero .btn.primary').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        if (!animOn) return;
        var r = el.getBoundingClientRect();
        el.style.translate = ((e.clientX - r.left - r.width / 2) * 0.18) + 'px ' + ((e.clientY - r.top - r.height / 2) * 0.28) + 'px';
      });
      el.addEventListener('pointerleave', function () { el.style.translate = ''; });
    });
  }

  // The Motion effect snapshots the page; settle every reveal first so nothing is left invisible.
  document.addEventListener('swarm-motion:before-collect', function () {
    root.classList.add('no-trans');
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    if (art) art.style.transform = '';
    void document.body.offsetHeight;
    root.classList.remove('no-trans');
  });
})();
