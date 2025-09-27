/* Data location */
const DATA_URL = 'assets/data/gallery.json';

/* Grid + filters */
const grid = document.getElementById('galleryGrid');
const filters = document.getElementById('galleryFilters');

/* Lightbox */
const GLB = document.getElementById('glb');
const MODAL = GLB.querySelector('.glb__modal');
const IMG = document.getElementById('glbImg');
const TITLE = document.getElementById('glbTitle');
const CAP = document.getElementById('glbCap');
const BTN_CLOSE = GLB.querySelector('.glb__close');
const BTN_PREV = GLB.querySelector('.glb__prev');
const BTN_NEXT = GLB.querySelector('.glb__next');

let photos = [];
let filtered = [];
let currentAlbum = '';
let currentTag = '';

let index = 0;

/* =============== Filters UI =============== */

function createChip(label, value) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-primary chip';
  b.textContent = label;
  b.dataset.tag = value;
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

  const albums = Array.from(new Set(photos.map(p => p.album || 'Unsorted'))).sort((a,b)=>a.localeCompare(b));
  const tags = Array.from(new Set(photos.flatMap(p => p.tags || []))).sort((a,b)=>a.localeCompare(b));

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

  if (tags.length) {
    const sep = document.createElement('span');
    sep.style.margin = '0 .5rem';
    sep.style.opacity = '.8';
    sep.textContent = '|';
    filters.appendChild(sep);
  }

  const allTags = createChip('All tags', '');
  allTags.classList.add('is-active');
  filters.appendChild(allTags);

  tags.forEach(t => filters.appendChild(createChip('#' + t, 'tag:' + t)));

  filters.addEventListener('click', (e) => {
    const btn = e.target.closest('button.chip[data-tag]');
    if (!btn) return;
    filters.querySelectorAll('button.chip[data-tag]').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    const raw = btn.dataset.tag;
    currentTag = raw.startsWith('tag:') ? raw.slice(4) : '';
    applyFilters();
  });

  renderGrid(photos);
}

/* =============== Grid =============== */

function renderGrid(list) {
  filtered = list;
  grid.innerHTML = '';

  for (const p of list) {
    const fig = document.createElement('figure');
    fig.className = 'photo-tile';

    fig.innerHTML = `
      <img src="${p.thumb || p.src}" alt="${p.alt || p.title || ''}" loading="lazy" decoding="async">
    `;

    fig.addEventListener('click', () => openLightboxById(p.id));
    fig.style.position = 'relative';

    grid.appendChild(fig);
  }
}


/* =============== Lightbox =============== */

function openLightboxById(photoId){
  const i = filtered.findIndex(p => p.id === photoId);
  index = i >= 0 ? i : 0;
  GLB.hidden = false;
  document.documentElement.style.overflow = 'hidden'; 
  show(index);
}

function closeLightbox(){
  GLB.hidden = true;
  document.documentElement.style.overflow = '';
}

function show(n){
  index = Math.max(0, Math.min(filtered.length - 1, n));
  const p = filtered[index];

  TITLE.textContent = p.title || '';
  CAP.innerHTML = p.caption || '';

  IMG.style.opacity = '0';
  IMG.onload = () => {
    fitModalToImage();
    requestAnimationFrame(() => { IMG.style.opacity = '1'; });
  };
  IMG.onerror = () => {
    IMG.removeAttribute('src');
    CAP.innerHTML = (p.caption || '') + '<br><em>Image failed to load.</em>';
  };
  IMG.src = p.src;
  IMG.alt = p.alt || p.title || '';
}

function fitModalToImage(){
  const maxW = Math.min(window.innerWidth * 0.92, 1200);
  const capH = GLB.querySelector('.glb__caption').offsetHeight + 8; 
  const maxH = Math.max(320, Math.min(window.innerHeight * 0.92 - capH, 1000));

  const natW = IMG.naturalWidth || IMG.width;
  const natH = IMG.naturalHeight || IMG.height;
  if (!natW || !natH) return;

  const scale = Math.min(maxW / natW, maxH / natH, 1);
  const w = Math.max(320, Math.floor(natW * scale));
  const h = Math.max(200, Math.floor(natH * scale));

  IMG.style.maxWidth = w + 'px';
  IMG.style.maxHeight = h + 'px';

  MODAL.style.width = w + 'px';
}

/* =============== Interactions =============== */

function prewire(){
  BTN_CLOSE.addEventListener('click', closeLightbox);
  GLB.addEventListener('click', (e)=>{ if (e.target === GLB || e.target.classList.contains('glb__backdrop')) closeLightbox(); });

  BTN_PREV.addEventListener('click', ()=> show(index - 1));
  BTN_NEXT.addEventListener('click', ()=> show(index + 1));

  document.addEventListener('keydown', (e)=>{
    if (GLB.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });

  window.addEventListener('resize', ()=>{
    if (!GLB.hidden && IMG.complete) fitModalToImage();
  });
}

/* =============== Boot =============== */

prewire();
load().catch(err => console.error('Failed to load assets/data/gallery.json', err));
