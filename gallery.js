// gallery.js — full replacement (root)
// Data lives at assets/data/gallery.json; images at assets/gallery/*

const DATA_URL = 'assets/data/gallery.json';

const grid = document.getElementById('galleryGrid');
const filters = document.getElementById('galleryFilters');

// Lightbox (reuses your splash & carousel classes from style.css)
const LB = document.getElementById('lightbox');
const MODAL = LB.querySelector('.splash-modal');
const CLOSE = LB.querySelector('.splash-close');
const TRACK = document.getElementById('lbTrack');
const DOTS  = document.getElementById('lbDots');
const BTN_PREV = LB.querySelector('.carousel-nav.prev');
const BTN_NEXT = LB.querySelector('.carousel-nav.next');
const VIEWPORT = LB.querySelector('.splash-viewport');
const TITLE = document.getElementById('lbTitle');
const CAP   = document.getElementById('lbCaption');

// State
let photos = [];
let filtered = [];
let currentAlbum = '';
let currentTag = '';

let index = 0;
let vw = 0;
let isAnimating = false;

let isDragging = false, startX = 0, baseX = 0, dragDX = 0, pointerId = null;
let wheelAcc = 0;

/* -------------------- Filters UI -------------------- */

function createChip(label, value) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-primary chip';     // smaller chip; styled in CSS
  b.textContent = label;
  b.dataset.tag = value;                // '' or 'tag:foo'
  return b;
}

function applyFilters(){
  let data = photos.slice();
  if (currentAlbum) {
    data = data.filter(p => (p.album || 'Unsorted') === currentAlbum);
  }
  if (currentTag) {
    const t = currentTag.toLowerCase();
    data = data.filter(p => (p.tags || []).map(x => x.toLowerCase()).includes(t));
  }
  renderGrid(data);
}

async function load() {
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load assets/data/gallery.json');
  photos = await res.json();

  // Build lists
  const albums = Array.from(new Set(photos.map(p => p.album || 'Unsorted'))).sort((a,b)=>a.localeCompare(b));
  const tags = Array.from(new Set(photos.flatMap(p => p.tags || []))).sort((a,b)=>a.localeCompare(b));

  // --- Album dropdown (left) ---
  const albumSelect = document.createElement('select');
  albumSelect.id = 'albumSelect';
  albumSelect.className = 'album-select';
  albumSelect.setAttribute('aria-label', 'Album');

  const optAll = document.createElement('option');
  optAll.value = '';
  optAll.textContent = 'All albums';
  albumSelect.appendChild(optAll);

  albums.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a; opt.textContent = a;
    albumSelect.appendChild(opt);
  });

  albumSelect.addEventListener('change', (e)=>{
    currentAlbum = e.target.value;
    applyFilters();
  });
  filters.appendChild(albumSelect);

  // separator
  if (tags.length) {
    const sep = document.createElement('span');
    sep.style.margin = '0 .5rem';
    sep.style.opacity = '.8';
    sep.textContent = '|';
    filters.appendChild(sep);
  }

  // --- Tag chips (right) ---
  const allTags = createChip('All tags', '');
  allTags.classList.add('is-active');
  filters.appendChild(allTags);

  tags.forEach(t => filters.appendChild(createChip('#' + t, 'tag:' + t)));

  // Tag click handling
  filters.addEventListener('click', (e) => {
    const btn = e.target.closest('button.chip[data-tag]');
    if (!btn) return;
    filters.querySelectorAll('button.chip[data-tag]').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    const raw = btn.dataset.tag;  // '' or 'tag:foo'
    currentTag = raw.startsWith('tag:') ? raw.slice(4) : '';
    applyFilters();
  });

  // Initial draw
  renderGrid(photos);
}

/* -------------------- Grid -------------------- */

function renderGrid(list) {
  filtered = list;
  grid.innerHTML = '';
  for (const p of list) {
    const fig = document.createElement('figure');
    fig.className = 'photo-tile';
    fig.style.cssText = `
      position:relative; aspect-ratio: 4/3; overflow:hidden; border:1px solid rgba(0,0,0,.45);
      border-radius:10px; background:#000;
    `;
    fig.innerHTML = `
      <img src="${p.thumb || p.src}" alt="${p.alt || p.title || ''}" loading="lazy" decoding="async"
           style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;filter:saturate(.95) brightness(.98)">
      ${p.credit ? `<figcaption style="position:absolute;right:6px;bottom:4px;font-size:.8rem;opacity:.8;">${p.credit}</figcaption>` : ''}
    `;
    fig.addEventListener('click', () => openLightbox(p.id));
    grid.appendChild(fig);
  }
}

/* -------------------- Lightbox Slides -------------------- */

function buildSlides() {
  TRACK.innerHTML = '';
  DOTS.innerHTML = '';

  filtered.forEach((p, i) => {
    const slide = document.createElement('section');
    slide.className = 'splash-slide';
    slide.innerHTML = `
      <img class="splash-bg" src="${p.src}" alt="${p.alt || p.title || ''}">
    `;
    TRACK.appendChild(slide);

    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'carousel-dot';
    d.setAttribute('aria-label', `Go to image ${i+1}`);
    d.addEventListener('click', () => show(i));
    DOTS.appendChild(d);
  });
}

function measure(){
  // Compute slide width from viewport or modal
  vw = VIEWPORT.clientWidth || MODAL.clientWidth || 0;
  // Snap transform to current index
  TRACK.style.transform = `translate3d(${-index * vw}px,0,0)`;
}

// Ensure we have a usable width before sliding
function ensureMeasure(){
  if (!vw || vw <= 0) measure();
}

function updateUI() {
  const p = filtered[index];
  TITLE.textContent = p.title || '';
  CAP.innerHTML = p.caption || '';
  DOTS.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('is-active', i === index));
}

function show(n) {
  ensureMeasure();
  index = Math.max(0, Math.min(filtered.length - 1, n));
  TRACK.style.transform = `translate3d(${-index * vw}px,0,0)`;
  updateUI();
}

function step(dir) {
  ensureMeasure();
  if (isAnimating) return;
  isAnimating = true;
  const next = Math.max(0, Math.min(filtered.length - 1, index + dir));
  index = next;
  TRACK.style.transition = ''; // use CSS transition from .splash-track
  TRACK.style.transform = `translate3d(${-index * vw}px,0,0)`;
  setTimeout(() => { isAnimating = false; }, 250);
  updateUI();
}

function openLightbox(photoId) {
  // Pick starting slide
  const i = filtered.findIndex(p => p.id === photoId);
  index = i >= 0 ? i : 0;

  // Build slides & dots
  buildSlides();

  // Make the lightbox visible BEFORE measuring (fixes 0-width bug)
  LB.hidden = false;
  MODAL.setAttribute('aria-labelledby', 'lbTitle');

  // Initial UI text (safe even before measure)
  updateUI();

  // Measure & snap once laid out
  requestAnimationFrame(() => {
    measure();
    show(index); // ensures transform is correct and dots/title/caption are in sync
  });
}

function closeLightbox() {
  LB.hidden = true;
  TRACK.innerHTML = '';
  DOTS.innerHTML = '';
}

/* -------------------- Interactions -------------------- */

function prewire() {
  // arrows / keys
  BTN_PREV.addEventListener('click', () => step(-1));
  BTN_NEXT.addEventListener('click', () => step(1));
  document.addEventListener('keydown', (e) => {
    if (LB.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  // pointer drag
  VIEWPORT.addEventListener('pointerdown', e => {
    if (LB.hidden) return;
    isDragging = true; startX = e.clientX; dragDX = 0; baseX = -index * vw;
    VIEWPORT.setPointerCapture(e.pointerId); pointerId = e.pointerId;
    TRACK.style.transition = 'none';
  });
  VIEWPORT.addEventListener('pointermove', e => {
    if (!isDragging) return;
    dragDX = e.clientX - startX;
    TRACK.style.transform = `translate3d(${baseX + dragDX}px,0,0)`;
  });
  function finishDrag() {
    if (!isDragging) return;
    isDragging = false;
    if (pointerId) { try { VIEWPORT.releasePointerCapture(pointerId); } catch {} pointerId = null; }
    TRACK.style.transition = '';
    const THRESH = 60;
    if (Math.abs(dragDX) > THRESH) step(dragDX < 0 ? 1 : -1);
    else show(index); // snap back
    dragDX = 0;
  }
  VIEWPORT.addEventListener('pointerup', finishDrag);
  VIEWPORT.addEventListener('pointercancel', finishDrag);

  // trackpad / wheel
  VIEWPORT.addEventListener('wheel', (e) => {
    if (LB.hidden) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 1) return;
    e.preventDefault();
    const THRESH = 50;
    wheelAcc += delta;
    if (Math.abs(wheelAcc) > THRESH) {
      step(wheelAcc > 0 ? 1 : -1);
      wheelAcc = 0;
    }
  }, { passive: false });

  // close controls
  CLOSE.addEventListener('click', closeLightbox);
  LB.addEventListener('click', (e) => { if (e.target === LB) closeLightbox(); });

  // resize
  window.addEventListener('resize', () => { if (!LB.hidden) { measure(); show(index); } });
}

/* -------------------- Boot -------------------- */

prewire();
load().catch(err => console.error('Failed to load assets/data/gallery.json', err));
