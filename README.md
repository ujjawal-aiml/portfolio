# Ujjawal Chaurasia — Portfolio

A static, dependency-free portfolio. No build step: open `index.html` through any static host
(or locally: `python3 -m http.server` in this folder, then visit http://localhost:8000).

## Where to edit
- **`site.js`** — all content (name, intro, projects, skills, experience, education, links, metrics).
  Empty strings / arrays hide the related section. Set `websiteUrl` to your domain once deployed
  (adds the canonical tag).
- `styles.css` — design tokens are at the top (`:root`): colours, fonts, spacing.
- `assets/resume.pdf` — the "Download Resume" file (it contains your phone number).

## The Motion button
`swarm-motion.js` adds a **Motion** button at the top centre. Click it: the page blanks and a swarm of
named cursors rebuilds it live (drawn boxes, typed text). **Stop** or **Esc** returns to the live page.
It also finishes by itself and restores your scroll position.

Options on the `<script>` tag in `index.html`:
- `data-label="Motion"` — button text
- `data-speed="2"` — fixed speed (default: adapts so a run takes ~30–45s on any page length)
- `data-cursors="7"` — number of cursors
- `data-manual` — don't auto-add the button; call `SwarmMotion.mount()` / `.start()` / `.stop()` yourself

To use it on another site: copy `swarm-motion.js` and add
`<script src="swarm-motion.js" defer></script>`. It has no dependencies and respects
`prefers-reduced-motion`.

If your page reveals content on scroll, listen for the `swarm-motion:before-collect` event and make
everything visible (see the bottom of `app.js`).
