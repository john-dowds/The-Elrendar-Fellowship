/* =========================================================
   AZEROTH AT WAR
   Risk-Strategy structured game based in the Warcraft universe, developed by Ansinosth of Moon Guard. BETA MODEL.
========================================================= */

/* =============[ CONFIG / CONSTANTS ]=====================
   Game constants: travel/defense/income values, lane costs, tiles, zoom caps.
========================================================= */
const EDGE_COST     = { thin: 1, thick: 2, navy: 2, underground: 2 };
const SIZE_DEFENSE  = { small: 1, medium: 3, large: 5 };
const SIZE_INCOME   = { small: 1, medium: 3, large: 6 };
const TILE_W = 2728, TILE_H = 2048;
const MAX_INCOME_PER_TURN = 10;
const START_TURN_INCOME_MULTIPLIER = 0.5;
const FACTION_WAR_INCOME_MULTIPLIER = 0.5;   
const TURN1_MIN_RES_PLAYER = 1;         
const TURN1_MIN_RES_AI     = 1;
const MAX_TRAVEL_CAP      = 8;
const START_UNITS         = { small: 2, medium: 3, large: 4 };
const MIN_SCALE = 0.25, MAX_SCALE = 3.0;
const ENABLE_CMDCLICK_COPY = true;
const SHOW_PATCH_NOTES_ON_START = false;
const PATCH_NOTES = [
  {
    ver: "v2.0.12",
    date: "2025-10-27",
    items: [
      "FFA: each AI race now has its own wallet (independent earn/spend); previously was shared across all races as AI/Player.",
      "Drag preview now traces a predicted path (lanes + nodes); does not regard currency.",
      "Travel chip shows current only (cap removed from chip)."
    ]
  },
];


// --- Economy knobs --
const INCOME_PER_LOC = 1;                 // every land location adds at least this much
const SIZE_INCOME_SOFT = { small: 0, medium: 1, large: 2 }; // small bonus per size
const INCOME_SOFT_CAP = 30;               // full speed until here
const INCOME_SOFT_SLOPE = 0.5;            // amount above cap is reduced by this slope

const TRAVEL_BASE = 2;                    // minimum travel points
const TRAVEL_PER_LOC = 1;                 // +1 per controlled land location
const TRAVEL_SOFT_CAP = 12;               // full speed until here
const TRAVEL_SOFT_SLOPE = 0.5;            // taper beyond the soft cap
const DIFFICULTY = {
  Novice: { expandBias:.25, defendBias:.75, scoutRadius:1, maxActions:2, minReserve:2 },
  Expert: { expandBias:.50, defendBias:.50, scoutRadius:2, maxActions:4, minReserve:1 },
  Master: { expandBias:.70, defendBias:.30, scoutRadius:3, maxActions:6, minReserve:0 }
};
const RACES = {
  dark_iron:{label:"Dark Iron", crest:"assets/art/crests/dark_iron.png", start:["Shadowforge City","Blackrock Mountain","Angor Fortress", "Thorium Point"]},
  darkspear:{label:"Darkspear", crest:"assets/art/crests/darkspear.png", start:["Echo Isles","Darkspear Isles", "Valley of Trials","Sen'jin Village"]},
  draenei:{label:"Draenei", crest:"assets/art/crests/draenei.png", start:["Exodar","Vindicaar","Ammen Vale","Azure Watch"]},
  dwarves:{label:"Dwarves", crest:"assets/art/crests/dwarves.png", start:["Ironforge","Kharanos","Anvilmar","Thelsamar"]},
  forsaken:{label:"Forsaken", crest:"assets/art/crests/forsaken.png", start:["Undercity","Deathknell","Bulwark","Brill"]},
  gnomes:{label:"Gnomes", crest:"assets/art/crests/gnomes.png", start:["Gnomeregan","Mechagon","New Tinkertown","Fizzcrank's Airstrip"]},
  goblins:{label:"Goblins", crest:"assets/art/crests/goblins.png", start:["Undermine","Bilgewater Harbor","Bilgewater Port","Crapoppolis"]},
  humans:{label:"Humans", crest:"assets/art/crests/humans.png", start:["Stormwind City","Boralus","Stromgarde","Northshire"]},
  kaldorei:{label:"Kaldorei", crest:"assets/art/crests/kaldorei.png", start:["Amirdrassil","Lor'danel","Astranaar","Raynewood Retreat","Astranaar"]},
  orcs:{label:"Orcs", crest:"assets/art/crests/orcs.png", start:["Orgrimmar","Warsong Hold", "Razor Hill", "Mor'shan Rampart"]},
  pandaren:{label:"Pandaren", crest:"assets/art/crests/pandaren.png", start:["Shado Pan Monastery", "Vale of Eternal Blossoms", "Paw'don Village", "Honeydew Village"]},
  scourge:{label:"Scourge", crest:"assets/art/crests/scourge.png", start:["Icecrown Citadel","Naxxramas","Stratholme","Scourgeholme"]},
  shal_dorei:{label:"Shal’dorei", crest:"assets/art/crests/shal_dorei.png", start:["Suramar City","Tomb of Sargeras","Nar'thalas Academy","Meredil"]},
  sin_dorei:{label:"Sin’dorei", crest:"assets/art/crests/sin_dorei.png", start:["Silvermoon City","Sunwell Plateau","Magister's Terrace","Sunstrider Isle"]},
  tauren:{label:"Tauren", crest:"assets/art/crests/tauren.png", start:["Thunderbluff","Thunder Totem","The Great Gate","Bloodhoof Village"]},
  wildhammer:{label:"Wildhammer", crest:"assets/art/crests/wildhammer.png", start:["Grim Batol", "Aerie Peak","Kirthaven","Thundermar"]},
  worgen:{label:"Worgen", crest:"assets/art/crests/worgen.png", start:["Gilneas City","Tol Barad","Greymane Wall","Tempest Reach"]},
  zandalari:{label:"Zandalari", crest:"assets/art/crests/zandalari.png", start:["Dazar'alor","Isle of Thunder", "Warport Rastari", "Isle of Fangs"]}
};
const FACTIONS = {
  Alliance:{label:"Alliance", crest:"assets/art/crests/alliance.png", start:["Stormwind City","Ironforge","Shadowforge City","Gnomeregan","Amirdrassil","Exodar","Gilneas City"]},
  Horde:{label:"Horde", crest:"assets/art/crests/horde.png", start:["Orgrimmar","Thunderbluff","Undercity","Suramar City","Silvermoon City","Dazar'alor","Bilgewater Port"]}
};
const REGION_BANNERS = {
  "Ashenvale": "ashenvale.jpg","Azuremyst Isle": "azuremyst_isle.jpg","The Barrens": "the_barrens.jpg","Black Morass": "black_morass.jpg",
  "Blackrock Mountains": "blackrock_mountain.jpg","Broken Isles": "broken_isles.jpg","Dragon Isles": "dragon_isles.jpg","Durotar": "durotar.jpg",
  "The Forbidding Sea": "ocean.jpg","The Frozen Sea": "ocean.jpg","The Great Sea": "ocean.jpg","The North Sea": "ocean.jpg","The South Seas": "ocean.jpg",
  "The Veiled Seas": "ocean.jpg","Hinterlands": "hinterlands.jpg", "Isle of Dorn": "khaz_algar.jpg","Kezan": "the_south_seas.jpg","Khaz Modan": "khaz_modan.jpg",
  "Kingdom of Alterac": "alterac_valley.jpg","Kingdom of Gilneas": "gilneas.jpg","Kingdom of Lordaeron": "lordaeron.jpg","Kingdom of Kul Tiras": "kul_tiras.jpg",
  "Kingdom of Quel'Thalas": "quel'thalas.jpg","Kingdom of Stromgarde": "stromgarde.jpg","Kingdom of Stormwind": "elwynn.jpg","Mount Hyjal": "hyjal.jpg",
  "Mulgore": "mulgore.jpg","Eastern Pandaria": "pandaria.jpg","Northern Pandaria": "pandaria.jpg","Southern Pandaria": "pandaria.jpg",
  "Western Pandaria": "western_pandaria.jpg","Central Northrend": "central_northrend.jpg","Eastern Northrend": "howling_fjord.jpg","Northern Northrend": "storm_peaks.jpg",
  "Western Northrend": "western_northrend.jpg","Western Wilds": "western_wilds.jpg","Plaguelands": "plaguelands.jpg","Un'goro Crater": "ungoro.jpg",
  "Winterspring": "winterspring.jpg","Southern Deserts": "desert.jpg","Stranglethorn Vale": "stranglethorn.jpg","Zandalar": "zandalar.jpg","Zul'Aman": "zul'aman.jpg"
};

/* =============[ STATE / DOM ]============================
   Runtime state
========================================================= */
const state = {
  turn: 1, scale: 0.8, pan: { x:0, y:0 },
  worldSize: { w: TILE_W*3, h: TILE_H*3 },
  mouseWorld: { x:0, y:0 }, showCoords:false, isPanning:false,
  player: { id:'player', faction:null, race:null, resources:0, travelCap:0, travelLeft:0 },
  ai:     { id:'ai',     faction:null, race:null, resources:0, travelCap:0, travelLeft:0 },
  game:   { mode:'faction', difficulty:'Expert' },
  nodes: [], routes: [],
  popup: null, draggingToken: null
  
};
// Which AI teams act between player turns
state.aiTurnOrder = [];

const viewport = document.getElementById('viewport');
const world    = document.getElementById('world');
const edgeSVG  = document.getElementById('edgeLayer');
const nodeLayer= document.getElementById('nodeLayer');
const btnEndTurn = document.getElementById('btnEndTurn');
const btnToggleCoords = document.getElementById('btnToggleCoords');
const turnChip = document.getElementById('turnChip');
const resChip  = document.getElementById('resChip');
const moveChip = document.getElementById('moveChip');

/* =============[ UTILS ]==================================
   Helpers for number formatting, lookups, color/badge, and coords.
========================================================= */
function fmt(n){ return new Intl.NumberFormat().format(n); }
function clamp(v,min,max){ return Math.min(max, Math.max(min,v)); }
function trim(v){ return (v==null ? '' : String(v).trim()); }
function nodeByName(name){ return state.nodes.find(n => n.name === name); }
function neighborsOf(name){
  const out = [];
  for (const r of state.routes){
    const arr = r.route;
    for (let i = 0; i < arr.length; i++){
      if (arr[i] !== name) continue;
      const prev = (i > 0) ? arr[i - 1] : null;
      const next = (i < arr.length - 1) ? arr[i + 1] : null;
      if (prev) out.push({ name: prev, thickness: r.thickness });
      if (next) out.push({ name: next, thickness: r.thickness });
    }
  }
  const seen = new Set();
  return out.filter(n => {
    const key = `${n.name}|${n.thickness}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function nodePos(n){
  return { x: n.x, y: n.y };
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function renderPatchNotesHTML(){
  if (!Array.isArray(PATCH_NOTES) || PATCH_NOTES.length === 0) {
    return `<div class="empty">No patch notes defined.</div>`;
  }
  let out = '';
  for (const entry of PATCH_NOTES){
    const ver  = escapeHtml(entry.ver || '');
    const date = escapeHtml(entry.date || '');
    const items = Array.isArray(entry.items) ? entry.items : [];
    out += `
      <div class="pn-entry">
        <div class="pn-head">
          <span class="pn-ver">${ver}</span>
          <span class="pn-date">${date}</span>
        </div>
        <ul class="pn-list">
          ${items.map(it => `<li>${escapeHtml(it)}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  return out;
}

function openPatchNotesPopup(){
  // If already open, just bring focus
  const existing = document.getElementById('patchNotesPopup');
  if (existing) { existing.focus(); return; }

  // Build HTML from PATCH_NOTES
  const html = renderPatchNotesHTML(); // helper below

  const pop = document.createElement('div');
  pop.className = 'popup fixed-right';
  pop.id = 'patchNotesPopup';
  pop.innerHTML = `
    <div class="title">Patch Notes <span class="chip">From Code</span></div>
    <div class="pn-wrapper">
      ${html}
    </div>
    <div class="row" style="justify-content:flex-end; gap:8px; margin-top:8px">
      <button class="btn" id="btnPatchNotesClose">Close</button>
    </div>
  `;
  document.body.appendChild(pop);

  pop.querySelector('#btnPatchNotesClose').addEventListener('click', closePatchNotesPopup);
  pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePatchNotesPopup(); });
}
function closePatchNotesPopup(){
  const p = document.getElementById('patchNotesPopup');
  if (p) p.remove();
}

function buildPathDFromNodes(nodeNames){
  if (!nodeNames || nodeNames.length < 2) return '';
  const first = nodeByName(nodeNames[0]); if (!first) return '';
  let d = `M ${first.x} ${first.y}`;
  for (let i = 1; i < nodeNames.length; i++){
    const n = nodeByName(nodeNames[i]);
    if (!n) continue;
    d += ` L ${n.x} ${n.y}`;
  }
  return d;
}

// optional: highlight nodes along the planned path
function setPreviewNodeGlow(nodeNames, on){
  if (!Array.isArray(nodeNames)) return;
  nodeNames.forEach(nm => {
    const el = document.querySelector(`[data-node="${nm}"]`);
    if (!el) return;
    if (on) el.classList.add('preview-route');
    else el.classList.remove('preview-route');
  });
}

// Shadow/blur strength (land: units + baseDefense; water = 0)
function defenseShadowFor(n){
  if (String(n.type||'').toLowerCase() === 'water') return { blur: 0, spread: 0, alpha: 0 };
  const defenders = (n.units || 0) + (n.baseDefense || 0);
  const blur   = Math.min(28, 2 + defenders * 0.9);   // px of blur
  const spread = Math.min(10, Math.floor(defenders/3)); // px of spread
  const alpha  = Math.min(0.55, 0.30 + defenders * 0.02); // opacity up to ~0.55
  return { blur, spread, alpha };
}
function pathBlockedByUncapturedCapturable(pathNames){
  if (!Array.isArray(pathNames) || pathNames.length < 3) return false; // no midpoints to block
  for (let i = 1; i < pathNames.length - 1; i++){
    const mid = nodeByName(pathNames[i]);
    if (!mid) continue;
    // Skip "Capturable (No Value)"
    if (isNoValue(mid)) continue;

    const own = String(mid.ownerType || '').toLowerCase();
    const ctl = String(mid.controller || 'none').toLowerCase();

    // Only block for ownerType=Capturable AND still unclaimed
    if (own === 'capturable' && (ctl === 'none' || ctl === 'neutral')) {
      return true;
    }
  }
  return false;
}

function dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }
function isWater(n){ return (String(n.type).toLowerCase()==='water'); }
function isNoValue(n){ return (n.ownerType === 'Capturable (No Value)'); }
function isNeutralOwner(n){ return (String(n.ownerType).toLowerCase()==='neutral'); }
function beginPlayerTurn(){
  const isT1   = (state.turn === 1);
  const t1Mult = isT1 ? (typeof START_TURN_INCOME_MULTIPLIER !== 'undefined' ? START_TURN_INCOME_MULTIPLIER : 1) : 1;
  const modeMult = (state.game && state.game.mode === 'faction') ? FACTION_WAR_INCOME_MULTIPLIER : 1;

  // Who gets paid this turn?
  const aiTeams = (state.game?.mode === 'faction')
    ? ['ai']                                      // single enemy side in FW
    : (state.aiTurnOrder || []);                  // each ai_<race> in FFA

  // 1) Player income
  const pInc = Math.floor(incomeFor('player') * t1Mult * modeMult);
  addResources('player', pInc);
  if (isT1 && typeof TURN1_MIN_RES_PLAYER !== 'undefined' && resourcesOf('player') < TURN1_MIN_RES_PLAYER) {
    setResources('player', TURN1_MIN_RES_PLAYER);
  }

  // 2) AI(teams) income
  aiTeams.forEach(teamId => {
    const inc = Math.floor(incomeFor(teamId) * t1Mult * modeMult);
    addResources(teamId, inc);
    if (isT1 && typeof TURN1_MIN_RES_AI !== 'undefined' && resourcesOf(teamId) < TURN1_MIN_RES_AI) {
      setResources(teamId, TURN1_MIN_RES_AI);
    }
  });

  // Travel caps: AI teams compute on their turn
  state.player.travelCap  = travelCapFor('player');
  state.player.travelLeft = state.player.travelCap;

  GameLog.turnHeader(state.turn);
  refreshHUD();
}


// ==== Team economy helpers (player, 'ai', or 'ai_<race>') ====
state.raceWallets = state.raceWallets || {};  // { [raceKey]: number }

function resourcesOf(teamId){
  if (teamId === 'player') return state.player.resources|0;
  if (teamId === 'ai')     return state.ai.resources|0; 
  if (typeof teamId === 'string' && teamId.startsWith('ai_')){
    const rk = teamId.slice(3);
    return state.raceWallets[rk] | 0;
  }
  return 0;
}
function setResources(teamId, value){
  if (teamId === 'player'){ state.player.resources = value; return; }
  if (teamId === 'ai'){     state.ai.resources     = value; return; }
  if (teamId && teamId.startsWith('ai_')){
    const rk = teamId.slice(3);
    state.raceWallets[rk] = value;
  }
}
function addResources(teamId, delta){
  setResources(teamId, Math.max(0, (resourcesOf(teamId)|0) + (delta|0)));
}
function spendResources(teamId, delta){
  const cur = resourcesOf(teamId);
  if (cur < delta) return false;
  setResources(teamId, cur - delta);
  return true;
}

// Pretty name for a team id: 'player', 'ai', or 'ai_<race>'
function teamDisplayName(teamId){
  if (teamId === 'player') return 'Player';
  if (teamId === 'ai')     return (state.ai?.faction || 'AI');  // e.g. "Horde" in FW, else "AI"
  if (typeof teamId === 'string' && teamId.startsWith('ai_')) {
    const rk = teamId.slice(3);
    return (RACES[rk]?.label || 'AI');                          // e.g. "Orcs", "Shal’dorei"
  }
  return 'AI';
}

function ensureCoordBox(){
  if (document.getElementById('debugBox')) return;
  const box = document.createElement('div');
  box.id = 'debugBox';
  box.style.cssText = `position:absolute;left:8px;top:8px;z-index:50;padding:6px 8px;border-radius:8px;background:rgba(0,0,0,.55);color:#eee;font:12px/1.2 monospace;box-shadow:0 2px 8px rgba(0,0,0,.35);`;
  box.innerHTML = `<div>coords: <span id="dbgXY">—</span></div><div>scale: <span id="dbgScale">—</span></div>`;
  world.appendChild(box);
}
function updateCoordDisplay(){
  const xy=document.getElementById('dbgXY'), sc=document.getElementById('dbgScale'); if(!xy||!sc) return;
  const pt=state.mouseWorld || {x:0,y:0};
  xy.textContent = `${Math.round(pt.x)}, ${Math.round(pt.y)}`;
  sc.textContent = state.scale.toFixed(2);
}

function colorClassForNode(n){
  if (String(n.type||'').toLowerCase() === 'water') return 'clr-water';
  if (n.controller === 'player') return 'clr-alliance';
  if (n.controller === 'ai')     return 'clr-horde';
  const owner = String(n.ownerType || '').trim().toLowerCase();
  if (owner === 'neutral') return 'clr-neutral';
  return 'clr-unclaimed';
}
function applyPinColorInline(pinEl, n){
  const isW   = String(n.type || '').toLowerCase() === 'water';
  const owner = String(n.ownerType || '').toLowerCase();
  const ctrl  = String(n.controller || '');
  const isAI  = (ctrl === 'ai') || ctrl.startsWith('ai_');

  // In FFA, Scourge race as its own team color; consider for FW.
  const isFFA        = state.game?.mode !== 'faction';
  const isScourgeTag = String(n.race || '').toLowerCase() === 'scourge';
  const isHeld       = (ctrl !== 'none' && ctrl !== 'neutral');
  const isScourgeTeam = isFFA && isScourgeTag && isHeld;
  let bg  = '#8a8f98',  brd = '#5a5e65';
  let haloRGB = '0,0,0'; 

  if (isW) {
    bg = '#7ec8ff'; brd = '#2d6ea4';
    haloRGB = '0,0,0';
  } else if (isScourgeTeam) {
    // Scourge purple (darker)
    bg = '#6a2ca0'; brd = '#3d1b5c';
    haloRGB = '106,44,160';
  } else if (ctrl === 'player') {
    bg = '#1871e8'; brd = '#0e3f8f';
    haloRGB = '24,113,232';
  } else if (isAI) {
    bg = '#b11226'; brd = '#6b0b16';
    haloRGB = '177,18,38';
  } else if (owner === 'neutral') {
    bg = '#2aa84a'; brd = '#17692e';
    haloRGB = '42,168,74';
  }

  pinEl.style.background  = bg;
  pinEl.style.borderColor = brd;

  // ---- strength-scaled blur/halo around the node ----
  let blur = 0, spread = 0, alpha = 0;
  if (!isW) {
    const defenders = (n.units || 0) + (n.baseDefense || 0);
    blur   = Math.min(28, 2 + defenders * 0.9);       // px
    spread = Math.min(10, Math.floor(defenders / 3));  // px
    alpha  = Math.min(0.55, 0.30 + defenders * 0.02);  // opacity
  }

  pinEl.style.boxShadow =
    `0 1px 4px #000c, inset 0 0 0 2px #0008` +
    (alpha > 0 ? `, 0 0 ${blur}px ${spread}px rgba(${haloRGB}, ${alpha})` : '');
}


function badgeValue(n){
  const u = (n.units || 0);
  const t = String(n.type || '').toLowerCase();
  if (t === 'water') return u;                 // water: just units
  if (isNeutralOwner(n)) return u + totalParked(n);   // neutral: garrison + parked
  return u + (n.baseDefense || 0);             // land owned: units + defense
}

function travelCapFor(controllerId){
  const locs = state.nodes.filter(n => !isWater(n) && n.controller === controllerId).length;
  const linear = TRAVEL_BASE + Math.floor(locs * TRAVEL_PER_LOC);

  if (linear <= TRAVEL_SOFT_CAP) return linear;
  return TRAVEL_SOFT_CAP + Math.floor((linear - TRAVEL_SOFT_CAP) * TRAVEL_SOFT_SLOPE);
}

// --- Battle Log ---
const GameLog = {
  el: null,
  queue: [],

  init(){
    this.el = document.getElementById('logScroll');
    if (!this.el) {
      console.warn('[log] #logScroll not found; will retry on first write');
      return;
    }
    if (this.queue.length) {
      this.queue.forEach(({cls, txt}) => this._append(cls, txt));
      this.queue = [];
    }
  },

  // public API
  turnHeader(turn){ this._write('log-turn',  `Turn ${turn}`); },
  event(text){      this._write('log-entry', text); },
  tip(text){        this._write('log-entry log-tip', text); },

  // internals
  _write(cls, txt){
    if (!this.el) { this.el = document.getElementById('logScroll'); }
    if (!this.el) {
      this.queue.push({cls, txt});
      return;
    }
    this._append(cls, txt);
  },

  _append(cls, txt){
    const p = document.createElement('div');
    p.className = cls;
    p.textContent = txt;
    this.el.appendChild(p);
    this.el.scrollTop = this.el.scrollHeight;
  }
};


// Close the fixed-left popup with ESC
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePopup();
  }
});

// --- Neutral parking helpers ---
function ensureParking(n){
  if (!n.parking || typeof n.parking !== 'object') n.parking = {};
  return n.parking;
}
function availableUnitsAt(n, mover){
  if (isNeutralOwner(n)) {
    const p = ensureParking(n);
    return p[mover] | 0;
  }
  if (n.controller === mover) return (n.units || 0);
  return 0;
}
function deductUnitsAt(n, count, mover){
  if (isNeutralOwner(n)) {
    const p = ensureParking(n);
    p[mover] = Math.max(0, (p[mover] | 0) - count);
  } else if (n.controller === mover) {
    n.units = Math.max(0, (n.units || 0) - count);
  }
}


// Total bodies on a neutral node (for badge not box)
function totalParked(n){
  ensureParking(n);
  return (n.parking.player || 0) + (n.parking.ai || 0);
}

/* =============[ PATHFINDING ]============================
   Dijkstra (lexicographic: route cost → hops → length).
========================================================= */
function lexiLess(a, b){
  if (!Array.isArray(a)) return false;
  if (!Array.isArray(b)) return true;

  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++){
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return a.length < b.length;
}
function pathfind(fromName, toName){
  const names = state.nodes.map(n=>n.name), Q=new Set(names);
  const D={},Hop={},Len={},Prev={};
  for(const nm of names){ D[nm]=Hop[nm]=Len[nm]=Infinity; }
  D[fromName]=Hop[fromName]=Len[fromName]=0;

  while(Q.size){
    let u=null,best=[Infinity,Infinity,Infinity];
    for(const nm of Q){ const cand=[D[nm],Hop[nm],Len[nm]]; if(lexiLess(cand,best)){best=cand; u=nm;} }
    if(u===null) break; Q.delete(u); if(u===toName) break;
    const uNode=nodeByName(u);

    for(const nb of neighborsOf(u)){
      if(!Q.has(nb.name)) continue;
      const w=EDGE_COST[nb.thickness] ?? 1, vNode=nodeByName(nb.name);
      const alt=[D[u]+w, Hop[u]+1, Len[u]+dist(uNode,vNode)];
      const cur=[D[nb.name],Hop[nb.name],Len[nb.name]];
      if(lexiLess(alt,cur)){ D[nb.name]=alt[0]; Hop[nb.name]=alt[1]; Len[nb.name]=alt[2]; Prev[nb.name]=u; }
    }
  }

  if(D[toName]===Infinity) return {cost:Infinity,hops:Infinity,length:Infinity,path:[],segs:[]};

  const path=[], segs=[];
  let cur=toName; while(cur){ path.push(cur); if(cur===fromName) break; cur=Prev[cur]; } path.reverse();
  for(let i=0;i<path.length-1;i++){
    const a=path[i], b=path[i+1]; let t='thin';
    for(const r of state.routes){ const idx=r.route.indexOf(a); if(idx>-1 && (r.route[idx+1]===b||r.route[idx-1]===b)){ t=r.thickness; break; } }
    segs.push({a,b,thickness:t});
  }
  return {cost:D[toName],hops:Hop[toName],length:Len[toName],path,segs};
}

// Runs one AI action (with animation) per team in state.aiTurnOrder,
// then calls `done()` to hand control back to the player.
// Runs one AI team after another, waiting for each team to finish its own action chain.
// When all teams are done, calls `done()` to hand control back to player.
function runAiRound(index, done){
  const order = state.aiTurnOrder || [];
  if (!order.length || index >= order.length) {
    if (typeof done === 'function') done();
    return;
  }
  const teamId = order[index];
  doAiTurnAnimated(teamId, () => runAiRound(index + 1, done));
}


// Team-aware path traversal (can't pass through other teams except the final target)
function isPathTraversableForTeam(path, teamId){
  for (let i = 1; i < path.length - 1; i++){
    const mid = nodeByName(path[i]);
    const c = String(mid.controller || '');
    if (c && c !== 'none' && c !== 'neutral' && c !== teamId && !(teamId === 'ai' && c === 'ai')) {
      return false;
    }
  }
  return true;
}

/** One animated AI action for a given teamId ('ai' for FW, 'ai_<race>' for FFA). */
function doAiTurnAnimated(teamId, onDone){
  const teamLabel = (teamId === 'ai') ? 'AI' : teamId.replace(/^ai_/, 'AI ');
  const diff = DIFFICULTY[state.game.difficulty] || DIFFICULTY.Expert;
  const maxActions  = diff.maxActions || 3;
  const minReserve  = Math.max(0, diff.minReserve || 0);

  const resBefore = resourcesOf(teamId);

  // Per-team travel budget (soft-curve based on that team’s land holdings)
  let travelLeft = travelCapFor(teamId);

  // Nodes owned by this team
  function myTeamNodes(){
    return state.nodes.filter(n => !isWater(n) && n.controller === teamId);
  }

  function pickRichest(){
    const mine = myTeamNodes();
    if (!mine.length) return null;
    return mine.slice().sort((a,b) => (b.units + b.baseDefense) - (a.units + a.baseDefense))[0];
  }

  function computeBest(richest){
    if (!richest) return null;

    const frontier = new Set();
    const nbrs = neighborsOf(richest.name).map(n => n.name);
    for (const a of [richest.name, ...nbrs]) {
      frontier.add(a);
      for (const nn of neighborsOf(a)) frontier.add(nn.name);
    }

    const candidates = [...frontier]
      .map(nm => nodeByName(nm))
      .filter(n => n && n.name !== richest.name && !isWater(n))
      .filter(n => {
        if (isNeutralOwner(n)) return false;   // ignore neutral parking as attack target
        if (n.controller === 'none' || n.controller === 'neutral') return true;
        // Attack anyone not me:
        return n.controller !== teamId && (n.units + n.baseDefense) < (richest.units - 1);
      });

    let best = null;
    for (const cand of candidates) {
      const p = pathfind(richest.name, cand.name);
      if (!p.path.length) continue;
      if (!isPathTraversableForTeam(p.path, teamId)) continue;
      const score = [p.cost, p.hops, p.length];
      if (!best || lexiLess(score, (best.score || [Infinity,Infinity,Infinity]))) {
        best = { target: cand, path: p.path, cost: p.cost, score };
      }
    }
    return best;
  }

  const summary = [];
  let actions = 0;
  let _iterations = 0;

  function finish(){
    console.groupCollapsed(`[${teamLabel}] Turn ${state.turn} summary`);
    summary.forEach(m => console.log('•', m));
    console.log(`• Resources: ${resBefore} → ${resourcesOf(teamId)}`);
    summary.forEach(m => GameLog.event(`${teamDisplayName(teamId)} ${m}`));
    console.groupEnd();
    if (onDone) onDone();
  }

  const step = () => {
    if (++_iterations > 1000) {
      console.warn('[AI]', teamLabel, 'aborted chain after 1000 iterations');
      return finish();
    }

    if (actions >= maxActions || travelLeft <= 0) return finish();

    const richest = pickRichest();
    if (!richest) {
      summary.push('No controlled locations.');
      return requestAnimationFrame(step);
    }

    const best = computeBest(richest);

    if (!best) {
      if (resourcesOf(teamId) >= 1 && Math.random() < 0.6) {
        richest.units++; spendResources(teamId, 1);
        summary.push(`Trained +1 at ${richest.name} (units now ${richest.units})`);
        return requestAnimationFrame(step);
      } else if (resourcesOf(teamId) >= 5) {
        richest.baseDefense++; spendResources(teamId, 5);
        summary.push(`Built +1 defense at ${richest.name} (baseDefense now ${richest.baseDefense})`);
        return requestAnimationFrame(step);
      }
      summary.push('No viable attacks; insufficient resources.');
      return finish();
    }

    if (pathBlockedByUncapturedCapturable(best.path)) {
      summary.push('No valid path (blocked by enemy).');
      return finish();
    }

    if (best.cost > travelLeft) {
      summary.push(`Could not reach ${best.target.name} (cost ${best.cost} > cap ${travelLeft}).`);
      return finish();
    }

    const canSend = Math.max(0, richest.units - minReserve);
    const send = Math.max(1, Math.floor(canSend / 2));
    if (send <= 0 || richest.units < send) {
      summary.push(`Insufficient units to move from ${richest.name}.`);
      return finish();
    }

    const tgt = nodeByName(best.target.name);
    const wasCtl   = tgt.controller || 'none';
    const wasPower = (tgt.units || 0) + (tgt.baseDefense || 0);

    richest.units -= send;

    animateArmyMove(best.path, send, () => {
      resolveArrival(tgt, send, teamId); 

      const nowCtl   = tgt.controller || 'none';
      const nowUnits = tgt.units || 0;

      let outcome = 'engaged';
      if (nowCtl === teamId && wasCtl !== teamId) outcome = 'captured';
      else if (nowCtl !== teamId && nowUnits < wasPower) outcome = 'weakened defenders';
      else if (nowCtl !== teamId && nowUnits >= wasPower) outcome = 'repelled';

      summary.push(`Moved ${send} from ${richest.name} → ${tgt.name} (cost ${best.cost}): ${outcome}. Now ${tgt.name} = controller ${nowCtl}, units ${nowUnits}.`);

      travelLeft -= best.cost;
      actions += 1;
      rerender();
      requestAnimationFrame(step);
    });
  };
  step();
}




/* =============[ RENDERING ]==============================
   Layout, edges, and nodes.
========================================================= */
function layoutWorld(){
  world.style.width=state.worldSize.w+'px'; world.style.height=state.worldSize.h+'px';
  world.style.transform=`translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.scale})`;
  edgeSVG.setAttribute('width', state.worldSize.w); edgeSVG.setAttribute('height', state.worldSize.h);
  const sc=document.getElementById('dbgScale'); if(sc) sc.textContent=state.scale.toFixed(2);
}
function renderEdges(){
  edgeSVG.innerHTML=''; let skipped=0;
  for(const r of state.routes){
    if(!r.route || r.route.length<2) continue;
    const pts=[]; for(const nm of r.route){ const n=nodeByName(nm); if(!n){skipped++; continue;} pts.push(`${n.x},${n.y}`); }
    if(pts.length>=2){
      const poly=document.createElementNS('http://www.w3.org/2000/svg','polyline');
      poly.setAttribute('points', pts.join(' ')); poly.setAttribute('fill','none');
      poly.setAttribute('stroke-linecap','round'); poly.setAttribute('stroke-linejoin','round');
      poly.classList.add('edge', r.thickness || 'thin'); edgeSVG.appendChild(poly);
    }
  }
  if(skipped>0) console.warn(`[edges] skipped ${skipped} route points`);
}
function renderNodes(){
  nodeLayer.innerHTML='';
  for(const n of state.nodes){
    const wrap=document.createElement('div');
    wrap.className='node'; wrap.style.left=n.x+'px'; wrap.style.top=n.y+'px'; wrap.style.transform='translate(-50%, -50%)';
    wrap.dataset.name=n.name;

    const pin=document.createElement('div');
    const colorClass=colorClassForNode(n);
    if(isWater(n)){ pin.className=`pin ocean ring ${colorClass}`; pin.title=`${n.name} (water)`; }
    else{ const size=n.size||'small'; pin.className=`pin land ${size} ring ${colorClass}`; pin.title=`${n.name} (${size})`; }
    applyPinColorInline(pin, n);

    const lbl=document.createElement('div');
    lbl.className='label'+(isWater(n)?' ocean':''); lbl.textContent=n.name; lbl.style.pointerEvents='none';
    const s=String(n.size||'small').toLowerCase();
    lbl.style.display = (n.nameVisible===false) ? 'none' : (s==='large' ? 'block' : 'none');

    let badge=null;
    if(!isWater(n) || (isWater(n) && (n.units||0)>0)){
      badge=document.createElement('div');
      badge.className='units-badge';
      badge.textContent=String(badgeValue(n));
    }

    wrap.appendChild(pin); wrap.appendChild(lbl); if(badge) wrap.appendChild(badge);

    if(n.nameVisible!==false && s!=='large'){
      wrap.addEventListener('mouseenter',()=>{lbl.style.display='block';});
      wrap.addEventListener('mouseleave',()=>{lbl.style.display='none';});
    }
    wrap.addEventListener('click', ()=>openPopupFor(n.name));
    wrap.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      updateDragPreviewOver(n);   
    });
        wrap.addEventListener('drop', e=>{
      e.preventDefault(); state.isPanning=false; if(state.draggingToken){ tryDropArmyOn(n.name); }
    });

    nodeLayer.appendChild(wrap);
  }
}
function rerender(){ layoutWorld(); renderEdges(); renderNodes(); refreshHUD(); }
// Ensure a single SVG line exists for drag preview STILL IN TEST MODE
function ensureDragPreviewLine(){
  if (!state.svg) state.svg = document.querySelector('svg'); 
  let line = document.getElementById('dragPreviewLine');
  if (!line && state.svg){
    line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('id','dragPreviewLine');
    line.setAttribute('stroke', '#ffd36b');        // ← visible stroke
    line.setAttribute('stroke-width', '3');        // ← a bit thicker
    line.setAttribute('stroke-dasharray', '6 6');  // ← optional dashed look
    line.style.display = 'none';
    state.svg.appendChild(line);
  }
  return line;
}

function ensureDragPreviewPath(){
  if (!state.svg) state.svg = document.querySelector('svg');
  let p = document.getElementById('dragPreviewPath');
  if (!p && state.svg){
    p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('id', 'dragPreviewPath');
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', '#ffd36b');
    p.setAttribute('stroke-width', '3');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    p.setAttribute('stroke-dasharray', '7 6');
    p.style.display = 'none';
    state.svg.appendChild(p);
  }
  return p;
}

// Attach dragover/drop handlers to freshly rendered pins and the map surface
function attachDragPreviewHandlers(){
  // During drag, highlight hovered pin and update preview line to it
  document.querySelectorAll('.pin').forEach(pin => {
    pin.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dst = nodeByName(pin.dataset.name);
      if (dst) updateDragPreviewOver(dst);
    });

    pin.addEventListener('dragleave', () => {
      // no-op: keep the last preview position until a new target or drop
    });

    pin.addEventListener('drop', (e) => {
      e.preventDefault();
      const dst = nodeByName(pin.dataset.name);
      // (previous iteration drop > tryMove/tryDropArmyOn logic goes here)
      endDragPreview(); // ensure cleanup after a drop, success or fail
    });
  });

  const mapEl = document.getElementById('map') || document.querySelector('#mapCanvas') || document.querySelector('svg');
  if (mapEl){
    mapEl.addEventListener('dragover', (e) => {
      // convert clientX/Y to map coords
      const pt = (typeof clientToMap === 'function') ? clientToMap(e.clientX, e.clientY) : null;
      if (pt) updateDragPreviewOver(pt);
    });
    mapEl.addEventListener('drop', () => endDragPreview());
  }
}

// Begin preview from a source node (called on dragstart)
function beginDragPreview(srcNode){
  state.dragPreview = state.dragPreview || {};
  state.dragPreview.src = srcNode?.name || srcNode; // store source node name
  state.dragPreview.teamId = 'player';               // or derive dynamically if needed
  const p = ensureDragPreviewPath();
  p.style.display = 'none';
  p.setAttribute('d','');
}



// Update preview to the current hovered node/point
function updateDragPreviewOver(targetNode){
  const p = ensureDragPreviewPath();
  if (!state.dragPreview || !state.dragPreview.src || !targetNode){
    // nothing to show
    p.style.display = 'none';
    p.setAttribute('d', '');
    return;
  }

  const srcName = state.dragPreview.src;
  const dstName = targetNode.name || targetNode;  // accept node or name
  const teamId  = state.dragPreview.teamId || 'player';

  // If you have a team-aware pathfind, use it; otherwise filter with isPathTraversableForTeam
  const pf = pathfind(srcName, dstName); // expected to return { path: [nodeNames], cost, hops, length }

  // Check for path validity & traversability for this team
  if (!pf || !Array.isArray(pf.path) || pf.path.length < 2 || (typeof isPathTraversableForTeam === 'function' && !isPathTraversableForTeam(pf.path, teamId))) {
    // Hide preview if we can’t reach
    p.style.display = 'none';
    p.setAttribute('d','');
    setPreviewNodeGlow(state.dragPreview._lastNodes, false);
    state.dragPreview._lastNodes = null;
    return;
  }

  // Build a multi-segment path through each hop
  const d = buildPathDFromNodes(pf.path);
  if (!d){
    p.style.display = 'none';
    p.setAttribute('d','');
    setPreviewNodeGlow(state.dragPreview._lastNodes, false);
    state.dragPreview._lastNodes = null;
    return;
  }

  // Draw it
  p.setAttribute('d', d);
  p.style.display = '';

  // Optional: glow the nodes on the candidate path
  setPreviewNodeGlow(state.dragPreview._lastNodes, false);   // clear previous glow
  setPreviewNodeGlow(pf.path, true);                         // add new glow
  state.dragPreview._lastNodes = pf.path;
}


// Cleanup at end of drag
function endDragPreview(){
  const p = ensureDragPreviewPath();
  p.style.display = 'none';
  p.setAttribute('d','');
  if (state.dragPreview && state.dragPreview._lastNodes){
    setPreviewNodeGlow(state.dragPreview._lastNodes, false);
  }
  state.dragPreview = null;
}


// Add/remove pulse class on candidate nodes
function markCandidateNodes(on, srcNode){
  document.querySelectorAll('.pin').forEach(el => el.classList.remove('candidate'));
  if (!on) return;
  // If you have a function listing legal destinations, use it:
  // const cands = legalDestinationsFrom(srcNode);
  // For now, consider all nodes as candidates except the source itself:
  const allPins = Array.from(document.querySelectorAll('.pin'));
  allPins.forEach(pin => {
    const name = pin.dataset.name;
    if (!name || name === srcNode.name) return;
    pin.classList.add('candidate');
  });
}

/* =============[ POPUP / ACTIONS ]========================
   Fixed-left popup for Train/Build + army tray.
========================================================= */
function onTrain(name){
  const n = nodeByName(name);
  if (!n) return;
  if (isWater(n)) { alert('Cannot train at water locations.'); return; }
  if (isNeutralOwner(n)) { alert('Cannot train at neutral (no-value) locations.'); return; }
  if ((state.player.resources|0) < 1) { alert('Not enough resources (need 1).'); return; }

  n.units = (n.units|0) + 1;
  state.player.resources -= 1;

  GameLog.event(`Player trained +1 at ${n.name} (units now ${n.units}).`);
  rerender();
  openPopupFor(n.name);
}

// Build: +1 baseDefense for 5 resources (land only; no-value/neutral "parking" can't build)
function onBuild(name){
  const n = nodeByName(name);
  if (!n) return;
  if (isWater(n)) { alert('Cannot build at water locations.'); return; }
  if (isNeutralOwner(n)) { alert('Cannot build at neutral (no-value) locations.'); return; }
  if ((state.player.resources|0) < 5) { alert('Not enough resources (need 5).'); return; }

  n.baseDefense = (n.baseDefense|0) + 1;
  state.player.resources -= 5;

  GameLog.event(`Player built +1 defense at ${n.name} (baseDefense now ${n.baseDefense}).`);
  rerender();
  openPopupFor(n.name);
}

function refreshArmyTray(trayEl, node){
  if (!trayEl || !node) return;
  trayEl.innerHTML = '';

  const avail = Math.max(0, availableUnitsAt(node, 'player'));
  if (avail <= 0){
    const msg = document.createElement('div');
    msg.style.opacity = .8;
    msg.textContent = 'No units available here.';
    trayEl.appendChild(msg);
    return;
  }

  const BASE = [1, 3, 5, 10, 25];
  const sizes = [...new Set(BASE.filter(s => s < avail).concat(avail))].sort((a,b)=>a-b);

  const makeChip = (label, amount, isAll=false) => {
    const chip = document.createElement('div');
    chip.className = 'chip-unit';
    chip.textContent = label;
    chip.title = isAll ? `Drag to move all ${amount} units` : `Drag to move ${amount} unit${amount>1?'s':''}`;
    chip.draggable = true;
    chip.addEventListener('dragstart', (e) => {
      state.draggingToken = { sourceName: node.name, units: amount };
      e.dataTransfer.setData('text/plain', `${node.name}|${amount}`);
      e.dataTransfer.effectAllowed = 'move';
      beginDragPreview(node); 
    });
    chip.addEventListener('dragend', () => {
      state.draggingToken = null;
      endDragPreview(); 
    });
    return chip;
  };

  sizes.forEach(sz => {
    trayEl.appendChild(makeChip(sz === avail ? `×All (${sz})` : `×${sz}`, sz, sz === avail));
  });

  // --- Custom number input ---
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:6px;';
  wrap.innerHTML = `
    <input id="customArmyCount" type="number" min="1" max="${avail}" value="1" style="width:64px;padding:4px 6px;">
    <button class="btn" id="btnMakeChip" style="padding:4px 8px;">Make</button>
    <span style="font-size:12px;opacity:.7;">Avail: ${avail}</span>
  `;
  trayEl.appendChild(wrap);

  wrap.querySelector('#btnMakeChip').addEventListener('click', () => {
    const val = parseInt(wrap.querySelector('#customArmyCount').value, 10);
    const n = Number.isFinite(val) ? Math.max(1, Math.min(avail, val)) : 1;
    const custom = makeChip(`×${n}`, n);
    custom.style.outline = '1px dashed rgba(0,0,0,.25)';
    trayEl.insertBefore(custom, wrap);
  });

  // Travel hint
  const hint = document.createElement('div');
  hint.style.cssText = 'width:100%; font-size:12px; opacity:.75; margin-top:4px;';
  hint.textContent = `Travel left: ${state.player.travelLeft}`;
  trayEl.appendChild(hint);
}



function openPopupFor(name) {
  const n = state.nodes.find(o => o.name === name);
  if (!n) return;

  // remove any existing popup
  const old = document.querySelector('.popup.fixed-left');
  if (old) old.remove();
  const isW = (n.type === 'water');
  const sizeBadge = (n.size || 'small');
  const visibleBadge = n.nameVisible ? 'visible' : 'hidden';
  const defenseVal = Number.isFinite(n.baseDefense) ? n.baseDefense : 1;

  // create container
  const pop = document.createElement('div');
  pop.className = 'popup fixed-left'; // width controlled in CSS

  // figure out which banner to show (per-location > per-region > none)
  const bannerFile = n.banner || (n.region ? REGION_BANNERS?.[n.region] : null);
  const bannerHTML = bannerFile
    ? `<div class="popup-banner">
         <img src="assets/art/banners/${bannerFile}" alt="${n.region || 'Region'} banner">
       </div>`
    : '';

  // content
  pop.innerHTML = `
    ${bannerHTML}
    <div class="title">${n.name} <span class="chip">${sizeBadge}</span></div>

    <div class="row"><label>Region</label><div class="value-box">${n.region || '—'}</div></div>
    <div class="row"><label>OwnerType</label><div class="value-box">${n.ownerType || 'Neutral'}</div></div>
    <div class="row"><label>Race</label><div class="value-box">${n.race || '—'}</div></div>
    <div class="row"><label>Controller</label><div class="value-box">${(n.controller || 'none').toUpperCase()}</div></div>
    <div class="row"><label>Label</label><div class="value-box">${visibleBadge}</div></div>
    <div class="row"><label>Defense</label><div class="value-box">${defenseVal}</div></div>
    <div class="row"><label>Units</label><div class="value-box">${n.units || 0}</div></div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="loc">Location</button>
      <button class="tab-btn" data-tab="army">Army</button>
    </div>

    <div class="tab-panel active" id="tab-loc">
      <div class="row">
        <button class="btn" id="btnTrain">Train (+1 unit)</button>
        <span class="chip">Cost: 1 res</span>
      </div>
      <div class="row">
        <button class="btn" id="btnBuild">Build (+1 defense)</button>
        <span class="chip">Cost: 5 res</span>
      </div>
      ${isW ? `<div style="margin-top:6px;font-size:12px;opacity:.75">Water nodes can’t Train/Build and generate no income.</div>` : ``}
    </div>

    <div class="tab-panel" id="tab-army">
      <div style="margin:2px 0 6px 0;font-weight:700">Army Tray (drag to ANY node):</div>
      <div class="army-tray" id="armyTray"></div>
      <div style="margin-top:6px;font-size:12px;color:#533">Tip: drag a token onto any settlement pin.</div>
    </div>
  `;

  document.body.appendChild(pop);

  // Tabs wiring
  pop.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      pop.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      pop.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const which = btn.dataset.tab;
      pop.querySelector(`#tab-${which}`).classList.add('active');
    });
  });

  // Button wiring; these are placeholders that match prior IDs
  const trainBtn = pop.querySelector('#btnTrain');
  const buildBtn = pop.querySelector('#btnBuild');
  if (trainBtn) trainBtn.addEventListener('click', () => onTrain && onTrain(n.name));
  if (buildBtn) buildBtn.addEventListener('click', () => onBuild && onBuild(n.name));
  if (typeof refreshArmyTray === 'function') refreshArmyTray(pop.querySelector('#armyTray'), n);

  // ensure popup stays within viewport
  requestAnimationFrame(() => {
    const r = pop.getBoundingClientRect();
    if (r.bottom > innerHeight) pop.style.top = Math.max(8, innerHeight - r.height - 8) + 'px';
  });
}

function closePopup(){ const p=document.querySelector('.popup.fixed-left')||world.querySelector('.popup'); if(p) p.remove(); state.popup=null; }

/* =============[ MOVEMENT / COMBAT ]======================
   Drag tokens to move; animated path; resolve simple combat.
========================================================= */
function tryDropArmyOn(targetName){
  const token=state.draggingToken; if(!token) return;
  const src=nodeByName(token.sourceName), dst=nodeByName(targetName); if(!src||!dst||src.name===dst.name) return;

  const found = pathfind(src.name, dst.name);
  let { path, cost } = found;
  
  if (!path.length || !isPathTraversable(path, 'player')) {
    alert('No valid path (blocked by enemy).'); state.isPanning = false; return;
  }
  
  // if the cheapest route crosses an uncaptured Capturable, reject the move
  if (pathBlockedByUncapturedCapturable(path)) {
    alert('No valid path (blocked by enemy).'); state.isPanning = false; return;
  }
  
  if (cost > state.player.travelLeft) {
    alert(`Need ${cost} travel points; have ${state.player.travelLeft}.`);
    state.isPanning = false; 
    return;
  }
  
  
  // Check availability at source (owned vs neutral parking)
  const have = availableUnitsAt(src, 'player');
  if (have < token.units) {
    alert('Not enough units in source.');
    state.isPanning = false;
    return;
  }
  
  state.isPanning = false;
  // Deduct from the correct pile at source
  deductUnitsAt(src, token.units, 'player');
  
  animateArmyMove(path, token.units, () => {
    resolveArrival(dst, token.units, 'player');
    state.player.travelLeft -= cost;

    const from = src.name, to = dst.name;
const captured = (dst.controller === 'player');
GameLog.event(`Player moved ${token.units} from ${from} to ${to}${captured ? ` and captured ${to}` : ''}.`);


    rerender();
  });
  state.draggingToken = null;
  
}
function isPathTraversable(path, mover){
  const enemy=(mover==='player')?'ai':'player';
  for(let i=1;i<path.length-1;i++){ const mid=nodeByName(path[i]); if(mid.controller===enemy) return false; }
  return true;
}
function animateArmyMove(pathNames, units, onDone){
  const pts=pathNames.map(nm=>({x:nodeByName(nm).x, y:nodeByName(nm).y}));
  const ns='http://www.w3.org/2000/svg', ghost=document.createElementNS(ns,'circle');
  ghost.setAttribute('r','8'); ghost.setAttribute('fill','#e6d0a0'); ghost.setAttribute('stroke','#000'); ghost.setAttribute('stroke-width','2');
  edgeSVG.appendChild(ghost);
  let seg=0,t=0; const speed=0.006;
  function step(){
    const a=pts[seg], b=pts[seg+1];
    if(!a||!b){ edgeSVG.removeChild(ghost); onDone&&onDone(); return; }
    t+=speed; if(t>=1){ t=0; seg++; requestAnimationFrame(step); return; }
    const x=a.x+(b.x-a.x)*t, y=a.y+(b.y-a.y)*t; ghost.setAttribute('cx',x); ghost.setAttribute('cy',y);
    requestAnimationFrame(step);
  }
  step();
}
function resolveArrival(dst, units, attacker='player'){
  // Water: capture/fight logic
  if (isWater(dst)){
    const defC = dst.controller || 'none';
    const defU = dst.units || 0;
    if (defC === attacker || (defC === 'none' && defU === 0)) { dst.controller = attacker; dst.units = (defU || 0) + units; return; }
    if (units > defU)     { dst.controller = attacker; dst.units = units - defU; }
    else if (units < defU){ dst.controller = defC;     dst.units = defU - units; }
    else { const win = Math.random() < 0.5; dst.controller = win ? attacker : defC; dst.units = 0; }
    return;
  }

// Neutral: non-capturable parking lot
if (isNeutralOwner(dst)){
  const p = ensureParking(dst);
  p[attacker] = (p[attacker] || 0) + units;  // park by team id
  return;
}


  // Land (capturable)
  const defenders = (dst.baseDefense || 0) + (dst.units || 0);

  // Reinforce if already ours
  if (dst.controller === attacker) { dst.units = (dst.units || 0) + units; return; }

  // Empty target with no defenders > capture
  if ((dst.controller === 'none' || dst.controller === 'neutral') && defenders === 0) {
    dst.controller = attacker; dst.units = units; return;
  }

  // Combat resolution
  if (units > defenders) {
    dst.controller = attacker; dst.units = units - defenders;
  } else if (units < defenders) {
    let rem = defenders - units;
    const bd = dst.baseDefense || 0;
    dst.units = Math.max(0, rem - bd);
  } else {
    const win = Math.random() < 0.5;
    if (win) { dst.controller = attacker; dst.units = 0; }
    else     { dst.units = Math.max(0, defenders - units); }
  }
}


/* =============[ TURN / HUD / AI ]========================
   Player turn budget; simple one-shot AI turn; HUD refresh.
========================================================= */
function incomeFor(id){
  const locs = state.nodes.filter(n => !isWater(n) && n.controller === id);
  let raw = locs.length * INCOME_PER_LOC;

  for (const n of locs) {
    raw += SIZE_INCOME_SOFT[n.size || 'small'] || 0;
  }

  if (raw <= INCOME_SOFT_CAP) return raw;
  return INCOME_SOFT_CAP + Math.floor((raw - INCOME_SOFT_CAP) * INCOME_SOFT_SLOPE);
}
function refreshHUD(){
  const locs=state.nodes.filter(n=>!isWater(n) && n.controller==='player').length;
  if(state.player.travelLeft>state.player.travelCap) state.player.travelLeft=state.player.travelCap;
  moveChip.textContent = `Travel Pts: ${state.player.travelLeft}`;
  turnChip.textContent = `Turn ${state.turn}`;
  resChip.textContent  = `Resources (You): ${fmt(state.player.resources)}`;
}

// Run each AI team in sequence (animated). When all finish, call `done()`.
function runAiRound(index, done){
  // Fall back to a single 'ai' team if the list isn't built
  const order = (Array.isArray(state.aiTurnOrder) && state.aiTurnOrder.length)
    ? state.aiTurnOrder
    : ['ai'];

  if (index >= order.length){
    if (typeof done === 'function') done();
    return;
  }

  const teamId = order[index];
  doAiTurnAnimated(teamId, () => runAiRound(index + 1, done));
}

function endPlayerTurn(){
  console.log('[turn] ending', state.turn);
  closePopup();

  // Run every AI team once, then return to  player
  runAiRound(0, () => {
    state.turn += 1;
    beginPlayerTurn();
    rerender();
  });
}

btnEndTurn.addEventListener('click', endPlayerTurn);

const btnNewGame = document.getElementById('btnNewGame');
if (btnNewGame) {
  btnNewGame.addEventListener('click', () => {

    window.location.reload(); 
  });
}
const btnPatchNotes = document.getElementById('btnPatchNotes');
if (btnPatchNotes) btnPatchNotes.addEventListener('click', openPatchNotesPopup);


function doAiTurn(){
  // DEBUG SUMMARY (legacy single-AI-side turn)
  const summary = [];
  const resBefore = state.ai.resources;
  const aiWho = (state.ai?.faction || 'AI'); // e.g., "Horde" in FW; otherwise "AI"

  // 1) Choose source (strongest AI-controlled land node)
  const aiNodes = state.nodes.filter(n => !isWater(n) && n.controller === 'ai');
  if (aiNodes.length === 0) {
    console.groupCollapsed(`[AI] Turn ${state.turn} summary`);
    console.log('• No AI locations on the map.');
    // mirror once
    GameLog.event(`${aiWho} has no controlled locations.`);
    console.groupEnd();
    return;
  }

  const richest = aiNodes
    .slice()
    .sort((a,b) => (b.units + b.baseDefense) - (a.units + a.baseDefense))[0];

  // 2) Build frontier (neighbors of richest and their neighbors)
  const frontier = new Set();
  const nbrs = neighborsOf(richest.name).map(n => n.name);
  for (const a of [richest.name, ...nbrs]) {
    frontier.add(a);
    for (const nn of neighborsOf(a)) frontier.add(nn.name);
  }

  // 3) Select candidates (same rules as before)
  const candidates = [...frontier]
    .map(nm => nodeByName(nm))
    .filter(n => n && n.name !== richest.name && !isWater(n))
    .filter(n => {
      if (isNeutralOwner(n)) return false;                               // FW: neutrals not an attack target
      if (n.controller === 'none' || n.controller === 'neutral') return true;
      if (n.controller === 'player') return (n.units + n.baseDefense) < (richest.units - 1);
      return false;
    });

  // 4) Score best by path cost > hops > length
  let best = null;
  for (const cand of candidates) {
    const p = pathfind(richest.name, cand.name);
    if (!p.path.length) continue;
    if (!isPathTraversable(p.path, 'ai')) continue;

    const score = [p.cost, p.hops, p.length];
    if (!best || lexiLess(score, (best.score || [Infinity,Infinity,Infinity]))) {
      best = { target: cand, path: p.path, cost: p.cost, score };
    }
  }

  // 5) If nothing viable, do a small train/build and log it
  if (!best) {
    if (state.ai.resources >= 1 && Math.random() < 0.6) {
      richest.units++; state.ai.resources--;
      summary.push(`trained +1 at ${richest.name} (units now ${richest.units})`);
    } else if (state.ai.resources >= 5) {
      richest.baseDefense++; state.ai.resources -= 5;
      summary.push(`built +1 defense at ${richest.name} (baseDefense now ${richest.baseDefense})`);
    } else {
      summary.push('found no viable attacks; insufficient resources to train/build.');
    }
    // Print summary for this AI turn
    console.groupCollapsed(`[AI] Turn ${state.turn} summary`);
    console.log(`• Source considered: ${richest.name}`);
    console.log(`• Resources: ${resBefore} → ${state.ai.resources}`);
    // mirror once
    summary.forEach(m => GameLog.event(`${aiWho} ${m}`));
    console.groupEnd();
    return;
  }

  // 6) Check travel budget (legacy formula)
  const aiLocs = state.nodes.filter(n => !isWater(n) && n.controller === 'ai').length;
  const travelCap = Math.min(MAX_TRAVEL_CAP, Math.max(2, aiLocs * 2));
  if (best.cost > travelCap) {
    summary.push(`could not reach ${best.target.name} (cost ${best.cost} > cap ${travelCap}).`);
    console.groupCollapsed(`[AI] Turn ${state.turn} summary`);
    console.log(`• Source considered: ${richest.name}`);
    console.log(`• Resources: ${resBefore} → ${state.ai.resources}`);
    // mirror once
    summary.forEach(m => GameLog.event(`${aiWho} ${m}`));
    console.groupEnd();
    return;
  }

  // 7) Send half the stack (>=1), resolve, and log outcome
  const send = Math.max(1, Math.floor(richest.units / 2));
  if (send <= 0 || richest.units < send) {
    summary.push(`did not move from ${richest.name} (insufficient units).`);
    console.groupCollapsed(`[AI] Turn ${state.turn} summary`);
    console.log(`• Source considered: ${richest.name}`);
    console.log(`• Resources: ${resBefore} → ${state.ai.resources}`);
    // mirror once
    summary.forEach(m => GameLog.event(`${aiWho} ${m}`));
    console.groupEnd();
    return;
  }

  const tgt = nodeByName(best.target.name);
  const wasCtl   = tgt.controller || 'none';
  const wasPower = (tgt.units || 0) + (tgt.baseDefense || 0);

  richest.units -= send;
  resolveArrival(tgt, send, 'ai');

  const nowCtl   = tgt.controller || 'none';
  const nowUnits = tgt.units || 0;

  // Robust outcome (FW uses "ai", but in other contexts controller may vary)
  const wasAI = String(wasCtl||'').startsWith('ai') || wasCtl === 'ai';
  const nowAI = String(nowCtl||'').startsWith('ai') || nowCtl === 'ai';

  let outcome = 'engaged';
  if (nowAI && !wasAI)                           outcome = 'captured';
  else if (!nowAI && nowUnits < wasPower)        outcome = 'weakened defenders';
  else if (!nowAI && nowUnits >= wasPower)       outcome = 'repelled';

  summary.push(`moved ${send} from ${richest.name} → ${tgt.name} (cost ${best.cost}): ${outcome}. Now ${tgt.name} = controller ${nowCtl}, units ${nowUnits}.`);

  // 8) Print summary for this AI turn
  console.groupCollapsed(`[AI] Turn ${state.turn} summary`);
  summary.forEach(m => console.log('•', m));
  console.log(`• Resources: ${resBefore} → ${state.ai.resources}`);
  // mirror exactly once (no duplicate)
  summary.forEach(m => GameLog.event(`${aiWho} ${m}`));
  console.groupEnd();
}




/* =============[ INPUT / CAMERA / COPY ]==================
   Panning, zooming, and Cmd/Ctrl-click coordinate copy.
========================================================= */
(function initPanZoom(){
  let last={x:0,y:0};
  viewport.addEventListener('mousedown', e=>{
    if(e.button!==0) return;
    if(state.draggingToken){ state.isPanning=false; return; }
    state.isPanning=true; last.x=e.clientX; last.y=e.clientY;
  });
  window.addEventListener('mouseup', ()=>{ state.isPanning=false; });
  window.addEventListener('mousemove', (e)=>{
    const r=viewport.getBoundingClientRect();
    state.mouseWorld={ x:(e.clientX-r.left-state.pan.x)/state.scale, y:(e.clientY-r.top-state.pan.y)/state.scale };
    updateCoordDisplay();
    if(!state.isPanning) return;
    state.pan.x += e.clientX-last.x; state.pan.y += e.clientY-last.y; last.x=e.clientX; last.y=e.clientY; layoutWorld();
  });
  bindWheelZoom(viewport); bindWheelZoom(world);
  viewport.addEventListener('dblclick', e=>{
    e.preventDefault(); const f=e.shiftKey?(1/1.5):1.5; const ns=clamp(state.scale*f, MIN_SCALE, MAX_SCALE); zoomAtPoint(ns, e.clientX, e.clientY);
  });
  document.addEventListener('click', async (e)=>{
    if(!ENABLE_CMDCLICK_COPY) return;
    if(!(e.metaKey||e.ctrlKey)) return;
    const tag=(e.target.tagName||'').toLowerCase(); if(/(input|textarea|select|button|a)/.test(tag)) return;
    const r=viewport.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) return;
    e.preventDefault();
    const pt=worldPointFromEvent(e); const text=formatCoordsForCopy(pt);
    try{ await copyTextToClipboard(text); }catch(_){}
  }, true);
})();
function bindWheelZoom(el){
  if(!el) return;
  el.addEventListener('wheel', (e)=>{
    e.preventDefault();
    const unit=(e.deltaMode===1)?16:1, dy=e.deltaY*unit;
    const step=(e.ctrlKey||e.metaKey)?0.20:0.10, dir=(dy<0)?1:-1;
    const ns=clamp(state.scale*(1+step*dir), MIN_SCALE, MAX_SCALE);
    zoomAtPoint(ns, e.clientX, e.clientY);
  }, {passive:false});
}
function worldPointFromEvent(e){ const r=viewport.getBoundingClientRect(); return {x:(e.clientX-r.left-state.pan.x)/state.scale, y:(e.clientY-r.top-state.pan.y)/state.scale}; }
function formatCoordsForCopy(pt){ return `"x": ${Math.round(pt.x)}, "y": ${Math.round(pt.y)},`; }
function copyTextToClipboard(text){
  if(navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
  const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(_){}
  document.body.removeChild(ta); return Promise.resolve();
}
function zoomAtPoint(newScale, sx, sy){
  const r=viewport.getBoundingClientRect();
  const before={ x:(sx-r.left-state.pan.x)/state.scale, y:(sy-r.top-state.pan.y)/state.scale };
  state.scale=newScale;
  const after={ x:(sx-r.left-state.pan.x)/state.scale, y:(sy-r.top-state.pan.y)/state.scale };
  state.pan.x += (after.x-before.x)*state.scale; state.pan.y += (after.y-before.y)*state.scale;
  layoutWorld();
}
function projectToMap(x, y){
  return { x, y };
}
function clientToMap(cx, cy){
  const r = viewport.getBoundingClientRect();
  return {
    x: (cx - r.left - state.pan.x) / state.scale,
    y: (cy - r.top  - state.pan.y) / state.scale
  };
}


/* =============[ DATA LOADING ]===========================
   Fetch locations & lanes from assets/data; sanitize routes.
========================================================= */
async function loadData(){
  async function getJSON(url){ const res=await fetch(url); if(!res.ok) throw new Error(`${url} -> HTTP ${res.status}`); return res.json(); }
  let locations=[], lanes=[];
  try{ locations=await getJSON('assets/data/locations.json'); console.log('[data] locations:', locations.length); }
  catch(e){ console.error('[data] locations.json failed', e); }
  try{ lanes=await getJSON('assets/data/lanes.json'); console.log('[data] lanes:', lanes.length); }
  catch(e){ console.error('[data] lanes.json failed', e); }

  state.nodes = Array.isArray(locations) ? locations.map(raw=>({
    name: trim(raw.name), x:Number(raw.x), y:Number(raw.y),
    size: raw.size||'small', baseDefense:(raw.baseDefense ?? SIZE_DEFENSE[raw.size||'small']),
    units:(raw.units ?? 0), region: raw.region||null,
    type:(trim(raw.type).toLowerCase()==='water') ? 'water' : 'land',
    nameVisible:(raw.nameVisible===false) ? false : true,
    ownerType: raw.ownerType || 'Neutral',
    controller: raw.controller || 'none',
    race: raw.race || null,
    banner: raw.banner || null  

  })) : [];

  state.routes = Array.isArray(lanes) ? lanes.map(r=>({
    route: Array.isArray(r.route) ? r.route.map(trim).filter(Boolean) : [],
    thickness: r.thickness || 'thin'
  })) : [];

  const set=new Set(state.nodes.map(n=>n.name)); let dropped=0;
  state.routes.forEach(r=>{ const b=r.route.length; r.route=r.route.filter(nm=>set.has(nm)); dropped+=(b-r.route.length); if(r.route.length<2) r.route=[]; });
  console.log(`[data] nodes=${state.nodes.length}, routes=${state.routes.length}, droppedPoints=${dropped}`);
}

/* =============[ START FLOW (MODAL/FACTION) ]=============
   Faction War or quick FFA claim by tag.
========================================================= */
function seedUnits(n){ const s=String(n.size||'small').toLowerCase(); if((n.units|0)===0) n.units=START_UNITS[s]??2; }

function startFactionWar(faction){
  const norm=s=>String(s||'').trim().toLowerCase();
  const playerF=faction, enemyF=(faction==='Alliance')?'Horde':'Alliance';
  state.player.faction=playerF; state.ai.faction=enemyF;

  const pStart=new Set((FACTIONS[playerF]?.start||[])), eStart=new Set((FACTIONS[enemyF]?.start||[]));
  for(const n of state.nodes) n.controller='none';
  for(const n of state.nodes){ if(pStart.has(n.name)){ n.controller='player'; seedUnits(n);} }
  for(const n of state.nodes){ if(eStart.has(n.name)){ n.controller='ai';     seedUnits(n);} }
  for(const n of state.nodes){
    if(n.controller!=='none') continue;
    const own=norm(n.ownerType);
    if(own===norm(playerF)){ n.controller='player'; seedUnits(n); }
    else if(own===norm(enemyF)){ n.controller='ai'; seedUnits(n); }
  }

  const pc=state.nodes.filter(n=>n.controller==='player').length;
  const ac=state.nodes.filter(n=>n.controller==='ai').length;
  const nc=state.nodes.filter(n=>n.controller==='none').length;
  console.log(`[startFactionWar] ${playerF}: player=${pc} ai=${ac} none=${nc}`);
state.aiTurnOrder = ['ai'];

}

function startFreeForAll(raceKey){
  state.player.race = raceKey;

  // Identify all race keys present on the board
  const allRaces = new Set(state.nodes.filter(n => n.race).map(n => n.race));
  const aiRaces  = [...allRaces].filter(k => k !== raceKey);

  // Reset controllers; assign per-team control:
  state.nodes.forEach(n => {
    if (n.race === raceKey) {
      n.controller = 'player'; seedUnits(n);
    } else if (n.race && aiRaces.includes(n.race)) {
      n.controller = `ai_${n.race}`; seedUnits(n);     // <<< per-race controller
    } else {
      n.controller = 'none';
    }
  });

  // Build visible teams list (player + each AI race actually present)
  state.teams = [{ id:'player', label:RACES[raceKey].label, crest:RACES[raceKey].crest, type:'race', race:raceKey }];

  state.aiTurnOrder = [];
  state.raceWallets = state.raceWallets || {};
  aiRaces.forEach(rk => {
    // Only add AI team if it actually controls at least one node:
    if (state.nodes.some(n => n.controller === `ai_${rk}`)) {
      state.teams.push({ id:`ai_${rk}`, label:RACES[rk].label, crest:RACES[rk].crest, type:'race', race:rk });
      if (!state.raceWallets[rk]) state.raceWallets[rk] = 0;   // initialize wallet
      state.aiTurnOrder.push(`ai_${rk}`);                       // each race acts on its own turn
    }
  });
}


// Centers the camera on a node by name (no scale change)
function focusOnLocationByName(name){
  const n = nodeByName(name);
  if (!n) return;
  const vp = viewport.getBoundingClientRect();
  const cx = n.x - (vp.width  / (2 * state.scale));
  const cy = n.y - (vp.height / (2 * state.scale));
  state.pan.x = -cx * state.scale;
  state.pan.y = -cy * state.scale;
  layoutWorld();
}


function showStartModal(){
  const mask=document.getElementById('startModal'); if(!mask){ showFactionChooser(); return; }
  const startBtn=document.getElementById('startBtn'), modeHint=document.getElementById('modeHint'), diffHint=document.getElementById('diffHint');
  const pickFaction=document.getElementById('pickFaction'), pickRace=document.getElementById('pickRace'), raceGrid=document.getElementById('raceGrid');
  mask.style.display='flex'; mask.style.pointerEvents='auto'; mask.style.opacity='1';

  let pickedMode='faction', pickedDiff='Expert', pickedFaction=null, pickedRaceKey=null;

  if(raceGrid && raceGrid.children.length===0){
    Object.entries(RACES).forEach(([key,info])=>{
      const card=document.createElement('div'); card.className='race-card'; card.dataset.key=key;
      card.innerHTML=`<img src="${info.crest}" alt=""><div style="font-size:12px">${info.label}</div>`;
      card.onclick=()=>{ raceGrid.querySelectorAll('.race-card').forEach(x=>x.classList.remove('selected')); card.classList.add('selected'); pickedRaceKey=key; validate(); };
      raceGrid.appendChild(card);
    });
  }
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
    pickedMode=b.dataset.mode; modeHint.textContent=(pickedMode==='faction')?'Faction War: Alliance vs Horde':'Free For All: choose a race — all others are AI';
    if(pickedMode==='faction'){ pickFaction.classList.remove('hidden'); pickRace.classList.add('hidden'); }
    else { pickFaction.classList.add('hidden'); pickRace.classList.remove('hidden'); }
    validate();
  });
  document.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>{
    pickedDiff=b.dataset.diff; diffHint.textContent=(pickedDiff==='Novice')?'defensive, cautious':(pickedDiff==='Master')?'aggressive blitz strategies':'balanced offense/defense'; validate();
  });
  pickFaction.querySelectorAll('[data-faction]').forEach(b=>b.onclick=()=>{ pickedFaction=b.dataset.faction; validate(); });

  function validate(){ startBtn.disabled=(pickedMode==='faction')?!pickedFaction:!pickedRaceKey; }

  startBtn.onclick=()=>{
    startBtn.disabled=true;
    state.game.mode=pickedMode; state.game.difficulty=pickedDiff;
    if(pickedMode==='faction') startFactionWar(pickedFaction); else startFreeForAll(pickedRaceKey);

    const first=(pickedMode==='faction')?(pickedFaction==='Alliance'?'Stormwind City':'Orgrimmar'):(RACES[pickedRaceKey]?.start?.[0]);
    if(first) focusOnLocationByName(first);

    mask.style.pointerEvents='none'; mask.style.opacity='0'; mask.style.display='none';
    // Faction War: single AI side
if (state.game.mode === 'faction') {
  state.aiTurnOrder = ['ai'];
}

    beginPlayerTurn(); rerender();
  };
}

function showFactionChooser(){
  const overlay=document.createElement('div');
  overlay.style.cssText=`position:fixed; inset:0; z-index:100; display:flex; align-items:center; justify-content:center; background:linear-gradient(#000c,#000c), radial-gradient(800px 600px at 50% 40%, #2a241d, #0f0e11);`;
  const panel=document.createElement('div');
  panel.style.cssText=`width:520px; padding:18px; border-radius:16px; background:#1a1410; color:#f0e6d2; border:2px solid #9c7b3c; box-shadow:0 12px 30px #000d; font-family:"EB Garamond", Georgia, serif;`;
  panel.innerHTML=`<div style="font-size:22px;font-weight:800;color:#c8aa6e;margin-bottom:10px;">Choose Your Faction</div>
    <div style="opacity:.9;margin-bottom:12px;">This sets your starting bases and your opponent’s.</div>
    <div style="display:flex;gap:12px;">
      <button id="chooseAlliance" class="btn" style="flex:1;">Alliance</button>
      <button id="chooseHorde"    class="btn" style="flex:1;">Horde</button>
    </div>`;
  overlay.appendChild(panel); document.body.appendChild(overlay);
  const pick=(f)=>{ startFactionWar(f); document.body.removeChild(overlay); beginPlayerTurn(); rerender(); };
  panel.querySelector('#chooseAlliance').addEventListener('click', ()=>pick('Alliance'));
  panel.querySelector('#chooseHorde').addEventListener('click',    ()=>pick('Horde'));
}

/* =============[ INIT ]===================================
   Load > first paint > start chooser (modal if present).
========================================================= */
async function init(){
  document.querySelectorAll('.tile')?.forEach((el,i)=>{
    const row=Math.floor(i/3)+1, col=(i%3)+1;
    el.classList?.remove('fallback'); el.style.backgroundImage=`url(assets/tiles/${row}-${col}.jpg)`;
    el.style.width=TILE_W+'px'; el.style.height=TILE_H+'px';
    el.style.left=((col-1)*TILE_W)+'px'; el.style.top=((row-1)*TILE_H)+'px';
  });
  GameLog.init();
  ensureCoordBox();
  await loadData();
  rerender();

  if (document.getElementById('startModal')) showStartModal();
  else showFactionChooser();
}
init();
