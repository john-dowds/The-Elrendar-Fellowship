/* =========================================================
   Elrendar World Map (Leaflet + DeepZoom)
   ========================================================= */
   (() => {
    'use strict';
  
    /* ===================== Config ===================== */
  
    const MAPS = [
      { id: 'easternkingdoms_map', name: 'Eastern Kingdoms', dzi: 'assets/worldmap/elrendar_map.dzi', enabled: true },
      { id: 'kalimdor_map', name: 'Kalimdor', dzi: '', enabled: false },
      { id: 'brokenisles_map', name: 'Broken Isles', dzi: '', enabled: false },
      { id: 'dragonisles_map', name: 'Dragon Isles', dzi: '', enabled: false },
      { id: 'outland_map', name: 'Outland', dzi: '', enabled: false },
      { id: 'draenor_map', name: 'Draenor', dzi: '', enabled: false },
      { id: 'shadowlands_map', name: 'Shadowlands', dzi: '', enabled: false },
      { id: 'khazalgar_map', name: 'Khaz Algar', dzi: '', enabled: false },
      { id: 'northrend_map', name: 'Northrend', dzi: '', enabled: false },
      { id: 'kultiras_map', name: 'Kul Tiras', dzi: '', enabled: false },
      { id: 'zandalar_map', name: 'Zandalar', dzi: '', enabled: false },
      { id: 'pandaria_map', name: 'Pandaria', dzi: '', enabled: false },
      { id: 'argus_map', name: 'Argus', dzi: '', enabled: false }
    ];
  
    // All icon keys referenced in data (history/map.icon, threats.json, etc.)
    const ICONS = {
      // grouped marker
      star: 'assets/art/portrait_icon_star.png',
  
      // history types
      campaign: 'assets/art/icon_story.png',
      event:    'assets/art/icon_event.png',
      lore:     'assets/art/icon_lore.png',
      story:    'assets/art/icon_paper.png',
      pve:      'assets/art/icon_pve.png',
  
      // images
      images:   'assets/art/icon_camera.png',
  
      // help/debug
      help:     'assets/art/icon_help.png',
      debug:    'assets/art/icon_question.png',
  
      // persistent (always-on) - stored in threats.json
      home:     'assets/art/icon_home.png',
      hearth:   'assets/art/icon_hearth.png',
      tower:    'assets/art/icon_tower.png',
  
      // current (toggle category) - stored in threats.json
      shipred:      'assets/art/icon_shipred.png',
      shipblue:     'assets/art/icon_shipblue.png',
      airship:      'assets/art/icon_airship.png',
      legionship:   'assets/art/icon_legionship.png',
      legionportal: 'assets/art/icon_legionportal.png',
      skull:        'assets/art/portrait_icon_skull.png',
      book:         'assets/art/portrait_icon_book.png',
      vendor:       'assets/art/portrait_icon_vendor.png',
      tavern:       'assets/art/portrait_icon_tavern.png',
      herb:         'assets/art/portrait_icon_herb.png',
      grave:        'assets/art/portrait_icon_grave.png',
      blacksmith:   'assets/art/portrait_icon_blacksmith.png',
  
      fallback: 'assets/art/icon_question.png'
    };
  
    // Filter categories (Persistent is always on and not user-toggleable)
    const FILTER_KEYS = ['campaign','current','event','lore','story','pve','images'];
    const DEFAULT_ON_FILTERS = ['campaign','current','event','lore','story','pve','images'];
  
    // Clustering rules (in FULL-RES IMAGE PIXELS)
    const BASE_CLUSTER_RADIUS_PX = 20;
    const CLUSTER_RADIUS_MAX_MULT = 6;
    const STAR_SHOW_MIN_ITEMS = 2;
  
    const HISTORY_URL  = 'assets/data/history.json';
    const GALLERY_URL  = 'assets/data/gallery.json';
    const THREATS_URL  = 'assets/data/threats.json';
  
    // Zoom padding: allow one extra zoom beyond deepest native tiles, but scale the last tiles (no black)
    const MAX_ZOOM_OUT_PAD = 0;
    const MAX_ZOOM_IN_PAD  = 1;
  
    /* Priority for marker icon selection + zIndexOffset */
    const PRIORITY = [
      'hearth',
      'persistent',
      'star',
      'campaign',
      'current',
      'event',
      'lore',
      'story',
      'pve',
      'images'
    ];
    const PRIORITY_INDEX = Object.fromEntries(PRIORITY.map((k,i)=>[k,i]));
  
    /* ===================== DOM ===================== */
  
    const elMap       = document.getElementById('map');
    const elCoord     = document.getElementById('coordHUD');
    const elCoordTxt  = document.getElementById('coordText');
    const elToast     = document.getElementById('toast');
    const elMapSelect = document.getElementById('mapSelect');
  
    /* ===================== State ===================== */
  
    let map;
    let dzLayer = null;
    let currentDZI = null;      // {width,height,tileSize,overlap,format}
    let currentBounds = null;   // L.LatLngBounds
    let activeMapId = MAPS[0].id;
  
    // keyboard state for coordinate HUD
    let ctrlDown = false;
    let altDown  = false;
    const IS_MAC = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
    let lastMouseLatLng = null;
  
    // filters
    const filtersOn = Object.fromEntries(FILTER_KEYS.map(k => [k, DEFAULT_ON_FILTERS.includes(k)]));
  
    // data
    let historyItems = [];   // normalized
    let galleryItems = [];   // normalized
    let threatItems  = [];   // normalized (persistent + current)
  
    // marker layer (ALL markers live here)
    const clusterLayer = L.layerGroup();
  
    // Debug grid overlay
    let debugOn = false;
    const debugLayer = L.layerGroup();
    const debugTileIndex = new Map();
  
    // Carousel state (popup buttons call these)
    const carouselData = Object.create(null);
    let carouselSeq = 1;
  
    /* ===================== Helpers ===================== */
  
    function toast(msg) {
      if (!elToast) return;
      elToast.textContent = msg;
      elToast.classList.add('show');
      window.clearTimeout(toast._t);
      toast._t = window.setTimeout(() => elToast.classList.remove('show'), 1600);
    }
  
    function safeHTML(html) {
      return String(html || '').replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    }
  
    function escapeHTML(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    function escapeAttr(s){ return escapeHTML(s).replace(/"/g, '&quot;'); }
  
    function clampInt(n, lo, hi) {
      n = Math.round(Number(n) || 0);
      if (n < lo) return lo;
      if (n > hi) return hi;
      return n;
    }
  
    function makeIcon(url) {
      return L.icon({
        iconUrl: url,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -30]
      });
    }
  
    function normalizeIconKey(k) {
      k = String(k || '').trim().toLowerCase();
      if (!k) return null;
  
      // allow common synonyms
      if (k === 'image' || k === 'camera') return 'images';
      if (k === 'threat' || k === 'threats') return 'skull';
      if (k === 'persistent') return 'tower';
  
      // accept keys as-is if present
      return ICONS[k] ? k : null;
    }
  
    function normalizeHistoryType(k) {
      k = String(k || '').trim().toLowerCase();
      if (k === 'images' || k === 'image' || k === 'camera') return 'images';
      if (k === 'campaign' || k === 'pve' || k === 'event' || k === 'lore' || k === 'story') return k;
      return null;
    }
  
    function parseTitleType(title) {
      const m = String(title || '').match(/^\s*([A-Za-z ]+?)\s*:\s*/);
      const t = (m ? m[1] : '').trim().toLowerCase();
      return normalizeHistoryType(t);
    }
  
    function categoryPriority(cat) {
      return PRIORITY_INDEX[String(cat)] ?? 999;
    }
  
    function pickTopItem(items) {
      // items should already be visible-filtered
      return items.slice().sort((a,b)=>{
        const pa = categoryPriority(a.priorityKey);
        const pb = categoryPriority(b.priorityKey);
        if (pa !== pb) return pa - pb;
        return String(a.title||'').localeCompare(String(b.title||''));
      })[0] || null;
    }
  
    function latLngToPixel(latlng) {
      if (!latlng || !currentDZI || !currentBounds) return { x: 0, y: 0 };
      const west = currentBounds.getWest();
      const east = currentBounds.getEast();
      const north = currentBounds.getNorth();
      const south = currentBounds.getSouth();
      const bw = (east - west) || 1;
      const bh = (south - north) || 1;
      const nx = (latlng.lng - west) / bw;
      const ny = (latlng.lat - north) / bh;
      const x = Math.round(nx * currentDZI.width);
      const y = Math.round(ny * currentDZI.height);
      return { x: clampInt(x, 0, currentDZI.width), y: clampInt(y, 0, currentDZI.height) };
    }
  
    function pixelToLatLng(x, y) {
      if (!currentDZI || !currentBounds) return null;
      const west = currentBounds.getWest();
      const east = currentBounds.getEast();
      const north = currentBounds.getNorth();
      const south = currentBounds.getSouth();
      const bw = (east - west) || 1;
      const bh = (south - north) || 1;
      const nx = (x / currentDZI.width);
      const ny = (y / currentDZI.height);
      const lng = west + (nx * bw);
      const lat = north + (ny * bh);
      return L.latLng(lat, lng);
    }
  
    async function fetchText(url) {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
      return await res.text();
    }
    async function fetchJSON(url) {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
      return await res.json();
    }
  
    function parseDZI(xmlText) {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'application/xml');
      const img = xml.querySelector('Image');
      const size = xml.querySelector('Size');
      if (!img || !size) throw new Error('Invalid DZI: missing Image/Size');
      const tileSize = parseInt(img.getAttribute('TileSize') || '256', 10);
      const overlap  = parseInt(img.getAttribute('Overlap')  || '0', 10);
      const format   = img.getAttribute('Format') || 'jpg';
      const width    = parseInt(size.getAttribute('Width')  || '0', 10);
      const height   = parseInt(size.getAttribute('Height') || '0', 10);
      if (!width || !height) throw new Error('Invalid DZI: width/height not found');
      return { tileSize, overlap, format, width, height };
    }
  
    /* ===================== Map Setup ===================== */
  
    function setUpMapSelect() {
      MAPS.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        opt.disabled = !m.enabled;
        elMapSelect.appendChild(opt);
      });
  
      const params = new URLSearchParams(location.search);
      const requested = params.get('map');
      if (requested && MAPS.some(m => m.id === requested)) {
        activeMapId = requested;
        elMapSelect.value = requested;
      } else {
        elMapSelect.value = activeMapId;
      }
  
      elMapSelect.addEventListener('change', async () => {
        const id = elMapSelect.value;
        const cfg = MAPS.find(m => m.id === id);
        if (!cfg || !cfg.enabled) {
          toast('Map not available yet.');
          elMapSelect.value = activeMapId;
          return;
        }
        activeMapId = id;
        await loadMapTiles(cfg);
        rerenderClusters();
        toast(`${cfg.name} loaded`);
      });
    }
  
    async function loadMapTiles(cfg) {
      if (dzLayer) {
        dzLayer.removeFrom(map);
        dzLayer = null;
      }
  
      const xml = await fetchText(cfg.dzi);
      const dzi = parseDZI(xml);
      currentDZI = dzi;
  
      const filesBase = cfg.dzi.replace(/\.dzi$/i, '_files/');
  
      dzLayer = L.tileLayer.deepzoom(filesBase, {
        width: dzi.width,
        height: dzi.height,
        tileSize: dzi.tileSize,
        overlap: dzi.overlap,
        format: dzi.format
      });
  
      dzLayer.addTo(map);
      currentBounds = dzLayer.options.bounds;
      map.fitBounds(currentBounds);
  
      // zoom clamping
      const fittedZoom = map.getZoom();
      map.setMinZoom(Math.max(fittedZoom - MAX_ZOOM_OUT_PAD, map.getMinZoom() ?? -Infinity));
  
      const nativeMax = (dzLayer && Number.isFinite(dzLayer.options?.maxZoom)) ? dzLayer.options.maxZoom : null;
      if (Number.isFinite(nativeMax)) {
        dzLayer.options.maxNativeZoom = nativeMax;
        dzLayer.options.maxZoom = nativeMax + MAX_ZOOM_IN_PAD;
        map.setMaxZoom(nativeMax + MAX_ZOOM_IN_PAD);
      }
  
      // debug overlay rebinding
      if (debugOn) {
        bindDebugToLayer();
        refreshDebug();
      }
  
      // Optional centering from query: ?x= &y= &z=
      const params = new URLSearchParams(location.search);
      const x = parseFloat(params.get('x') || '');
      const y = parseFloat(params.get('y') || '');
      const z = parseInt(params.get('z') || '', 10);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        const target = pixelToLatLng(x, y);
        if (target) {
          if (Number.isFinite(z)) map.setView(target, z);
          else map.setView(target, map.getZoom());
        }
      }
    }
  
    function initLeaflet() {
      try {
        elMap.setAttribute('tabindex', '0');
        elMap.addEventListener('click', () => elMap.focus(), { passive: true });
      } catch {}
  
      map = L.map(elMap, {
        crs: L.CRS.Simple,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true
      }).setView([0, 0], 0);
  
      clusterLayer.addTo(map);
    }
  
    /* ===================== Data Loading ===================== */
  
    function flattenHistory(hist) {
      const out = [];
      const sections = Array.isArray(hist?.sections) ? hist.sections : [];
      for (const sec of sections) {
        out.push({
          id: sec.id,
          focusId: sec.id, // history.html sets article.id = s.id
          title: sec.title,
          subtitle: sec.subtitle,
          date: sec.date,
          summary_html: sec.summary_html,
          map: sec.map || null
        });
  
        const entries = Array.isArray(sec.entries) ? sec.entries : [];
        for (const e of entries) {
          out.push({
            id: e.id,
            focusId: `${sec.id}--${e.id}`, // history.html sets child.id = `${parent}--${child}`
            parentId: sec.id,
            title: e.title,
            subtitle: e.subtitle,
            date: e.date,
            summary_html: e.summary_html,
            map: e.map || null
          });
        }
      }
      return out;
    }
  
    function mapPointsOf(rawMap){
      if (!rawMap) return [];
      if (Array.isArray(rawMap)) return rawMap.filter(Boolean);
      if (typeof rawMap === 'object') return [rawMap];
      return [];
    }
    
    // Turn one logical entry into N renderable pin-items (one per point).
    function expandByMapPoints(item){
      const pts = mapPointsOf(item.map);
      if (!pts.length) return [item];
    
      // Each point can optionally override icon/category if you want.
      return pts.map((pt, idx) => ({
        ...item,
        // Unique instance id so carousels can include multiple points cleanly if needed
        _pinId: `${item.kind}:${item.id || item.focusId || 'item'}:${idx}`,
        map: pt,
        // allow per-point icon override:
        iconKey: normalizeIconKey(pt.icon) ? pt.icon : item.iconKey,
        // category: pt.category ? pt.category : item.category,
      }));
    }
    async function loadData() {
      // History
      try {
        const hist = await fetchJSON(HISTORY_URL);
        const flat = flattenHistory(hist);
        historyItems = flat.map(item => {
          const typeFromMap = normalizeHistoryType(item.map?.icon);
          const type = typeFromMap || parseTitleType(item.title);
  
          return {
            kind: 'history',
            id: item.id,
            focusId: item.focusId,
            title: item.title,
            subtitle: item.subtitle,
            date: item.date,
            summary_html: item.summary_html,
            category: type, // campaign/event/lore/story/pve
            iconKey: type,  // matches ICONS keys
            map: item.map || null,
            priorityKey: type // for icon pick
          };
        }).filter(x => !!x.category);
      } catch (e) {
        console.error(e);
        toast('Could not load history.json');
        historyItems = [];
      }
  
      // Gallery
      try {
        const gal = await fetchJSON(GALLERY_URL);
        galleryItems = (Array.isArray(gal) ? gal : []).map(it => ({
          kind: 'gallery',
          id: it.id,
          focusId: it.id,
          title: it.title,
          caption: it.caption,
          src: it.src,
          thumb: it.thumb,
          album: it.album,
          tags: it.tags,
          category: 'images',
          iconKey: 'images',
          map: it.map || null,
          priorityKey: 'images'
        }));
      } catch (e) {
        console.error(e);
        toast('Could not load gallery.json');
        galleryItems = [];
      }
  
      // Threats (Persistent + Current)
      try {
        const thr = await fetchJSON(THREATS_URL);
        const list = Array.isArray(thr) ? thr : [];
  
        const PERSISTENT_ICON_KEYS = new Set(['home','hearth','tower']);
        const CURRENT_ICON_KEYS = new Set(['shipred','shipblue','airship','legionship','legionportal','skull']);
  
        threatItems = list.map(it => {
          const rawIcon = normalizeIconKey(it.map?.icon || it.icon || it.type || it.tag);
          const iconKey = rawIcon || 'skull';
          const isPersistent = PERSISTENT_ICON_KEYS.has(iconKey);
          const isCurrent = CURRENT_ICON_KEYS.has(iconKey) || !isPersistent;
  
          const cat = isPersistent ? 'persistent' : 'current';
  
          return {
            kind: 'threat',
            id: it.id,
            focusId: it.id,
            title: it.title || (isPersistent ? 'Persistent' : 'Current'),
            summary_html: it.summary_html || it.summary || it.description || '',
            severity: it.severity,
            category: cat, // persistent | current
            iconKey,       // one of the icon keys above
            map: it.map || null,
            priorityKey: isPersistent ? (iconKey === 'hearth' ? 'hearth' : 'persistent') : 'current'
          };
        });
      } catch (e) {
        console.warn('Could not load threats.json (optional)', e);
        threatItems = [];
      }
      // Support multi-point map entries (map can be object OR array of objects)
historyItems = historyItems.flatMap(expandByMapPoints);
galleryItems = galleryItems.flatMap(expandByMapPoints);
threatItems  = threatItems.flatMap(expandByMapPoints);
    }
  
    function allItems() {
      return ([]).concat(historyItems, galleryItems, threatItems);
    }

    
  
    /* ===================== Clustering + Popups ===================== */
  
    function isVisibleByFilter(item) {
      if (!item || !item.map) return false;
      if (item.map.id !== activeMapId) return false;
      const x = Number(item.map.x), y = Number(item.map.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  
      if (item.category === 'persistent') return true;
      if (item.category === 'current') return !!filtersOn.current;
      if (item.category === 'campaign') return !!filtersOn.campaign;
      if (item.category === 'event') return !!filtersOn.event;
      if (item.category === 'lore') return !!filtersOn.lore;
      if (item.category === 'story') return !!filtersOn.story;
      if (item.category === 'pve') return !!filtersOn.pve;
      if (item.category === 'images') return !!filtersOn.images;
  
      return false;
    }
  
    function clusterRadiusForZoom() {
      // dynamic: zoomed out clusters more; zoomed in clusters less.
      const z = map.getZoom();
      const nativeMax = (dzLayer && Number.isFinite(dzLayer.options?.maxNativeZoom)) ? dzLayer.options.maxNativeZoom
      : (dzLayer && Number.isFinite(dzLayer.options?.maxZoom)) ? dzLayer.options.maxZoom
      : 0;
  
      const dz = Math.max(0, nativeMax - z);
      const mult = Math.min(CLUSTER_RADIUS_MAX_MULT, 1 + (dz * 0.85)); // grows as you zoom out
                   
      // Never drop below the base 20px
      return Math.max(BASE_CLUSTER_RADIUS_PX, BASE_CLUSTER_RADIUS_PX * mult);
    }
  
    function shouldShowStar(clusterVisibleCount) {
      if (clusterVisibleCount < STAR_SHOW_MIN_ITEMS) return false;
  
      const z = map.getZoom();
      const nativeMax = (dzLayer && Number.isFinite(dzLayer.options?.maxNativeZoom)) ? dzLayer.options.maxNativeZoom
      : (dzLayer && Number.isFinite(dzLayer.options?.maxZoom)) ? dzLayer.options.maxZoom
      : 0;
  
      // show star when notably zoomed out
      return z <= (nativeMax - 3);
    }
  
    function clusterItems(items, radiusPx) {
      // items are already visible-filtered and on this map
      if (radiusPx <= 0) {
        // no clustering: one per item
        return items.map(it => ({
          cx: Number(it.map.x),
          cy: Number(it.map.y),
          items: [it]
        }));
      }
  
      const cellSize = Math.max(1, radiusPx * 2);
      const grid = new Map();
  
      function cellKey(x, y) {
        const cx = Math.floor(x / cellSize);
        const cy = Math.floor(y / cellSize);
        return `${cx},${cy}`;
      }
  
      // bucket items into cells
      for (const it of items) {
        const x = Number(it.map.x), y = Number(it.map.y);
        const key = cellKey(x, y);
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(it);
      }
  
      const visited = new Set();
      const clusters = [];
  
      function dist2(ax, ay, bx, by) {
        const dx = ax - bx;
        const dy = ay - by;
        return dx*dx + dy*dy;
      }
  
      // iterate over all items
      for (const it of items) {
        if (visited.has(it)) continue;
        const x0 = Number(it.map.x), y0 = Number(it.map.y);
  
        const ck = cellKey(x0, y0);
        const [ccx, ccy] = ck.split(',').map(Number);
  
        const members = [];
        // search neighbor cells (3x3)
        for (let gx = ccx - 1; gx <= ccx + 1; gx++) {
          for (let gy = ccy - 1; gy <= ccy + 1; gy++) {
            const key = `${gx},${gy}`;
            const bucket = grid.get(key);
            if (!bucket) continue;
            for (const cand of bucket) {
              if (visited.has(cand)) continue;
              const x1 = Number(cand.map.x), y1 = Number(cand.map.y);
              if (dist2(x0, y0, x1, y1) <= radiusPx*radiusPx) {
                visited.add(cand);
                members.push(cand);
              }
            }
          }
        }
  
        if (!members.length) {
          visited.add(it);
          members.push(it);
        }
  
        const cx = members.reduce((s,a)=>s+Number(a.map.x),0)/members.length;
        const cy = members.reduce((s,a)=>s+Number(a.map.y),0)/members.length;
  
        clusters.push({ cx, cy, items: members });
      }
  
      return clusters;
    }
  
    function buildPopupHTML(carouselId) {
      // skeleton; content filled on open/slide
      return `
        <div class="wm-pop" data-carousel="${carouselId}">
          <div class="wm-pop__title" id="${carouselId}-title"></div>
          <div id="${carouselId}-meta"></div>
          <div id="${carouselId}-body"></div>
          <div class="wm-pop__actions" id="${carouselId}-actions"></div>
  
          <div class="wm-carousel">
            <button class="wm-carousel-btn" type="button" onclick="WMCarousel.prev('${carouselId}')">◀</button>
            <span class="wm-carousel-count" id="${carouselId}-count">1/1</span>
            <button class="wm-carousel-btn" type="button" onclick="WMCarousel.next('${carouselId}')">▶</button>
          </div>
        </div>
      `;
    }
  
    function slideIconHTML(iconKey) {
      const url = ICONS[iconKey] || ICONS.fallback;
      return `<img class="wm-slide-ico" src="${url}" alt="">`;
    }
  
    function renderSlide(item) {
      const iconKey = normalizeIconKey(item.iconKey) || normalizeIconKey(item.category) || 'fallback';
  
      if (item.kind === 'gallery') {
        const title = item.title || 'Gallery Photo';
        const imgSrc = item.src || item.thumb || '';
        return {
          titleHTML: `${slideIconHTML(iconKey)}<span>${escapeHTML(title)}</span>`,
          metaHTML: item.album ? `<div class="wm-pop__meta">${escapeHTML(item.album)}</div>` : '',
          bodyHTML: `
            ${imgSrc ? `<img class="wm-pop__img" src="${imgSrc}" alt="${escapeAttr(title)}">` : ''}
            ${item.caption ? `<div class="wm-pop__body">${safeHTML(item.caption)}</div>` : ''}
          `,
          actionsHTML: item.id ? `<a class="wm-btn" href="gallery.html?focus=${encodeURIComponent(item.id)}">Open Gallery</a>` : ''
        };
      }
  
      if (item.kind === 'threat') {
        const title = item.title || (item.category === 'persistent' ? 'Persistent' : 'Current');
        const sev = Number.isFinite(item.severity) ? `Severity ${item.severity}` : '';
        return {
          titleHTML: `${slideIconHTML(iconKey)}<span>${escapeHTML(title)}</span>`,
          metaHTML: sev ? `<div class="wm-pop__meta">${escapeHTML(sev)}</div>` : '',
          bodyHTML: item.summary_html ? `<div class="wm-pop__body">${safeHTML(item.summary_html)}</div>` : '',
          actionsHTML: ''
        };
      }
  
      // history
      const title = item.title || '';
      const meta = item.date ? `${escapeHTML(item.date)}${item.subtitle ? ` — ${escapeHTML(item.subtitle)}` : ''}` : '';
      const focus = item.focusId || item.id || '';
      return {
        titleHTML: `${slideIconHTML(iconKey)}<span>${escapeHTML(title)}</span>`,
        metaHTML: meta ? `<div class="wm-pop__meta">${meta}</div>` : '',
        bodyHTML: `<div class="wm-pop__body">${safeHTML(item.summary_html)}</div>`,
        actionsHTML: focus ? `<a class="wm-btn" href="history.html?focus=${encodeURIComponent(focus)}">Open History</a>` : ''
      };
    }
  
    // Expose carousel controller
    window.WMCarousel = {
      prev(id) {
        const c = carouselData[id];
        if (!c) return;
        c.idx = (c.idx - 1 + c.items.length) % c.items.length;
        this.render(id);
      },
      next(id) {
        const c = carouselData[id];
        if (!c) return;
        c.idx = (c.idx + 1) % c.items.length;
        this.render(id);
      },
      render(id) {
        const c = carouselData[id];
        if (!c) return;
  
        const item = c.items[c.idx];
        const t = document.getElementById(id + '-title');
        const m = document.getElementById(id + '-meta');
        const b = document.getElementById(id + '-body');
        const a = document.getElementById(id + '-actions');
        const cnt = document.getElementById(id + '-count');
  
        if (!t || !b || !cnt) return;
  
        const slide = renderSlide(item);
  
        t.innerHTML = slide.titleHTML || '';
        if (m) m.innerHTML = slide.metaHTML || '';
        b.innerHTML = slide.bodyHTML || '';
        if (a) a.innerHTML = slide.actionsHTML || '';
        cnt.textContent = `${c.idx + 1}/${c.items.length}`;
      }
    };
  
    function tooltipTextForCluster(items) {
      if (!items.length) return '';
      if (items.length === 1) return items[0].title || '';
      const top = pickTopItem(items);
      return `${items.length} items • ${top?.title || 'Location'}`;
    }
  
    function zIndexForKey(priorityKey) {
      const base = 1000;
      const idx = categoryPriority(priorityKey);
      // smaller idx = more important; put on top with larger zIndexOffset
      return base + (PRIORITY.length - idx) * 20;
    }
  
    function clearClusters() {
      clusterLayer.clearLayers();
      // clear carousel state
      Object.keys(carouselData).forEach(k => delete carouselData[k]);
      carouselSeq = 1;
    }
  
    function rerenderClusters() {
      clearClusters();
  
      const radius = clusterRadiusForZoom();
      const visible = allItems().filter(isVisibleByFilter);
  
      // cluster in full-res pixel space
      const clusters = clusterItems(visible, radius);
  
      for (const cl of clusters) {
        const items = cl.items.slice();
  
        // sort for stable carousel order (by priority, then title)
        items.sort((a,b)=>{
          const pa = categoryPriority(a.priorityKey);
          const pb = categoryPriority(b.priorityKey);
          if (pa !== pb) return pa - pb;
          return String(a.title||'').localeCompare(String(b.title||''));
        });
  
        const visibleCount = items.length;
        if (!visibleCount) continue;
  
        const star = shouldShowStar(visibleCount);
        const topItem = pickTopItem(items);
  
        const iconKey = star ? 'star' : (normalizeIconKey(topItem.iconKey) || normalizeIconKey(topItem.category) || 'fallback');
        const iconUrl = ICONS[iconKey] || ICONS.fallback;
  
        const latlng = pixelToLatLng(cl.cx, cl.cy);
        if (!latlng) continue;
  
        const carouselId = `wmcar_${carouselSeq++}`;
        carouselData[carouselId] = { items, idx: 0 };
  
        const marker = L.marker(latlng, {
          icon: makeIcon(iconUrl),
          title: topItem?.title || '',
          zIndexOffset: zIndexForKey(star ? 'star' : topItem.priorityKey)
        });
  
        marker.bindPopup(buildPopupHTML(carouselId), { maxWidth: 570, minWidth: 450 });
        marker.bindTooltip(tooltipTextForCluster(items), { direction:'top', sticky:true, opacity:0.95, offset:[0,-24] });
  
        marker.on('popupopen', () => window.WMCarousel.render(carouselId));
  
        clusterLayer.addLayer(marker);
      }
    }
  
    /* ===================== Toolbar ===================== */
  
    function applyButtonState(btn, on){
      if (!btn) return;
      btn.classList.toggle('is-on', !!on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  
    function wireToolbar() {
      // filter toggles
      const buttons = document.querySelectorAll('[data-toggle-filter]');
      buttons.forEach(btn => {
        const key = btn.getAttribute('data-toggle-filter');
        if (!key || !(key in filtersOn)) return;
  
        applyButtonState(btn, !!filtersOn[key]);
  
        btn.addEventListener('click', () => {
          filtersOn[key] = !filtersOn[key];
          applyButtonState(btn, !!filtersOn[key]);
          rerenderClusters();
        });
      });
  
      // Help
      const helpBtn = document.getElementById('btnHelp');
      if (helpBtn) {
        helpBtn.addEventListener('click', () => {
          const legend = document.getElementById('legendPanel');
          if (!legend) return;
          legend.classList.toggle('show');
        });
      }
  
      // Debug grid
      const dbgBtn = document.getElementById('btnDebugGrid');
      if (dbgBtn) dbgBtn.addEventListener('click', () => toggleDebugGrid());
    }
  
    /* ===================== Coordinates HUD ===================== */
  
    function wireCoordinateHUD() {
      const setHUD = (on) => { if (elCoord) elCoord.classList.toggle('show', !!on); };
  
      const isCoordModeEvent = (oe) => {
        if (!oe) return (IS_MAC ? altDown : ctrlDown);
        const ctrl = !!oe.ctrlKey || ctrlDown;
        const alt  = !!oe.altKey  || altDown;
        return IS_MAC ? (alt || ctrl) : ctrl;
      };
  
      const updateHUDText = (latlng) => {
        if (!elCoordTxt) return;
        if (!latlng) {
          elCoordTxt.textContent = `${activeMapId}  •  move cursor for x,y`;
          return;
        }
        const p = latLngToPixel(latlng);
        elCoordTxt.textContent = `${activeMapId}  •  x:${p.x}  y:${p.y}`;
      };
  
      const copySnippetAt = async (latlng) => {
        if (!latlng) return;
        const p = latLngToPixel(latlng);
        const snippet = `"map": { "id": "${activeMapId}", "x": ${p.x}, "y": ${p.y} }`;
        try {
          await navigator.clipboard.writeText(snippet);
          toast('Copied coordinate snippet');
        } catch {
          window.prompt('Copy this coordinate snippet:', snippet);
        }
      };
  
      document.addEventListener('keydown', (e) => {
        ctrlDown = !!e.ctrlKey;
        altDown  = !!e.altKey;
        setHUD(IS_MAC ? (altDown || ctrlDown) : ctrlDown);
        updateHUDText(lastMouseLatLng);
      });
  
      document.addEventListener('keyup', (e) => {
        ctrlDown = !!e.ctrlKey;
        altDown  = !!e.altKey;
        setHUD(IS_MAC ? (altDown || ctrlDown) : ctrlDown);
      });
  
      window.addEventListener('blur', () => {
        ctrlDown = false;
        altDown = false;
        setHUD(false);
      });
  
      elMap.addEventListener('contextmenu', (ev) => {
        if (isCoordModeEvent(ev)) ev.preventDefault();
      });
  
      map.on('mousemove', (e) => {
        lastMouseLatLng = e.latlng;
        const oe = e.originalEvent || null;
        const isMode = isCoordModeEvent(oe);
        setHUD(isMode);
        if (!isMode) return;
        updateHUDText(e.latlng);
      });
  
      map.on('click', async (e) => {
        const oe = e.originalEvent || null;
        if (!isCoordModeEvent(oe) || !e.latlng) return;
        if (oe && oe.ctrlKey && IS_MAC) return; // let contextmenu handler handle it
        await copySnippetAt(e.latlng);
      });
  
      map.on('contextmenu', async (e) => {
        const oe = e.originalEvent || null;
        if (!isCoordModeEvent(oe) || !e.latlng) return;
        if (oe) oe.preventDefault?.();
        await copySnippetAt(e.latlng);
      });
    }
  
    /* ===================== Debug Grid ===================== */
  
    function tileKey(coords, format = 'jpg') {
      return `${coords.z}/${coords.x}_${coords.y}.${format}`;
    }
  
    function clearDebug() {
      debugLayer.clearLayers();
      debugTileIndex.clear();
    }
  
    function onTileLoad(ev) {
      if (!debugOn || !dzLayer) return;
      const coords = ev.coords;
      const key = tileKey(coords, (dzLayer.options?.format || 'jpg'));
      if (debugTileIndex.has(key)) return;
  
      const bounds = dzLayer._tileCoordsToBounds(coords);
  
      const rect = L.rectangle(bounds, {
        weight: 1,
        color: '#ffffff',
        opacity: 0.35,
        fillOpacity: 0
      });
  
      const nw = bounds.getNorthWest();
      const label = L.marker(nw, {
        interactive: false,
        icon: L.divIcon({
          className: 'wm-debug-label',
          html: `<div class="wm-debug-label-inner">${key}</div>`
        })
      });
  
      rect.addTo(debugLayer);
      label.addTo(debugLayer);
      debugTileIndex.set(key, { rect, label });
    }
  
    function onTileUnload(ev) {
      if (!dzLayer) return;
      const coords = ev.coords;
      const key = tileKey(coords, (dzLayer.options?.format || 'jpg'));
      const entry = debugTileIndex.get(key);
      if (!entry) return;
      debugLayer.removeLayer(entry.rect);
      debugLayer.removeLayer(entry.label);
      debugTileIndex.delete(key);
    }
  
    function bindDebugToLayer() {
      if (!dzLayer) return;
      dzLayer.off('tileload', onTileLoad);
      dzLayer.off('tileunload', onTileUnload);
      dzLayer.on('tileload', onTileLoad);
      dzLayer.on('tileunload', onTileUnload);
    }
  
    function refreshDebug() {
      if (!debugOn) return;
      clearDebug();
      if (dzLayer) dzLayer.redraw();
    }
  
    function toggleDebugGrid() {
      debugOn = !debugOn;
      const btn = document.getElementById('btnDebugGrid');
      if (debugOn) {
        debugLayer.addTo(map);
        btn?.classList.add('is-on');
        bindDebugToLayer();
        refreshDebug();
        toast('Debug grid on');
      } else {
        btn?.classList.remove('is-on');
        clearDebug();
        map.removeLayer(debugLayer);
        toast('Debug grid off');
      }
    }
  
    /* ===================== Boot ===================== */
  
    async function boot() {
      setUpMapSelect();
      initLeaflet();
  
      const cfg = MAPS.find(m => m.id === activeMapId) || MAPS[0];
      await loadMapTiles(cfg);
  
      await loadData();
      rerenderClusters();
  
      wireToolbar();
      wireCoordinateHUD();
  
      map.on('zoomend', () => rerenderClusters());
    }
  
    boot().catch(err => {
      console.error(err);
      toast('World map failed to load');
    });
  
  })();
  
