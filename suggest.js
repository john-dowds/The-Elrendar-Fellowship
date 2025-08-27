const SUGGEST_APP_URL = 'https://script.google.com/macros/s/AKfycbw2OshDvR-WZFLF8Qyxjww9dT4jqUBT6USnzfmLgPOVOxYEKpTeSCo_QqbhKU1AiktKFg/exec';

// ====== DOM ======
const form        = document.getElementById('suggestForm');
const statusEl    = document.getElementById('status');

const addTraitBtn = document.getElementById('addTrait');
const traitsWrap  = document.getElementById('traitsWrap');
const traitExamples = document.getElementById('traitExamples');

const categorySelect     = document.getElementById('categorySelect');
const subcategorySelect  = document.getElementById('subcategorySelect');
const subcategoryNewWrap = document.getElementById('subcategoryNewWrap');
const subcategoryNew     = document.getElementById('subcategoryNew');

const campSelect = document.getElementById('campaignLinks');

// ====== Constants ======
const CATEGORY_LIST = [
  'NPCs','Factions','Aberrations','Beasts','Critters','Demons','Dragonkin',
  'Elementals','Giants','Humanoids','Mechanical','Undead'
];

const DATA_FILES = [
  'assets/data/npcs.json',
  'assets/data/factions.json',
  'assets/data/aberrations.json',
  'assets/data/beasts.json',
  'assets/data/critters.json',
  'assets/data/demons.json',
  'assets/data/dragonkin.json',
  'assets/data/elementals.json',
  'assets/data/giants.json',
  'assets/data/humanoids.json',
  'assets/data/mechanical.json',
  'assets/data/undead.json'
];

const TRAIT_EXAMPLES = [
  { name:'Fire Blast',   effect:'Burns enemy target heavily.' },
  { name:'Shadow Bolt',  effect:'Deals shadow damage; chance to apply Weakened.' },
  { name:'Enrage',       effect:'Gains damage this round; loses defense.' },
  { name:'Summon Adds',  effect:'Calls minor allies to the field.' },
  { name:'Zealotry',     effect:'Immune to fear this round.' },
  { name:'Ground Slam',  effect:'Staggers foes; push back 1 space.' }
];

// ====== Utilities ======
async function loadJsonSafe(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text.trim()) return { entries: [], categories: [] };
    return JSON.parse(text);
  } catch (e) {
    console.warn('Skipping data file:', url, e);
    return { entries: [], categories: [] };
  }
}
function* iterEntries(source) {
  if (Array.isArray(source.categories)) {
    for (const c of source.categories) {
      for (const s of (c.subcategories || [])) {
        for (const e of (s.entries || [])) yield e;
      }
    }
  } else {
    for (const e of (source.entries || [])) yield e;
  }
}
function renderChips(container, values, onClick) {
  container.innerHTML = '';
  for (const v of values) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = v.name || v.label || v.value || v;
    btn.addEventListener('click', () => onClick(v.value ? v.value : v));
    container.appendChild(btn);
  }
}
function addTraitRow(name='', effect='') {
  const row = document.createElement('div');
  row.className = 'trait-row';
  row.style.display = 'contents';
  row.innerHTML = `
    <div class="field">
      <label>Trait Name</label>
      <input name="traitName" value="${(name || '').replace(/"/g,'&quot;')}" placeholder="Trait name" />
    </div>
    <div class="field">
      <label>Effect</label>
      <input name="traitEffect" value="${(effect || '').replace(/"/g,'&quot;')}" placeholder="What it does…" />
    </div>
  `;
  traitsWrap.appendChild(row);
}

// ====== Init: categories, subcategories, traits, campaigns ======
(function initCategories(){
  categorySelect.innerHTML = '<option value="" disabled selected>Select a category…</option>';
  for (const c of CATEGORY_LIST) {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    categorySelect.appendChild(opt);
  }
})();

(async function initSubcategories(){
  const sets = await Promise.all(DATA_FILES.map(loadJsonSafe));
  const subs = new Set();
  for (const set of sets) {
    for (const e of iterEntries(set)) {
      if (e.subcategory) subs.add(e.subcategory);
      if (Array.isArray(e.alsoAppearsIn)) {
        for (const p of e.alsoAppearsIn) {
          if (p && p.subcategory) subs.add(p.subcategory);
        }
      }
    }
  }
  const list = Array.from(subs).filter(Boolean).sort((a,b)=>a.localeCompare(b));
  subcategorySelect.innerHTML = '<option value="" selected>—</option>';
  for (const s of list) {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    subcategorySelect.appendChild(opt);
  }
  const addOpt = document.createElement('option');
  addOpt.value = '__ADD_NEW__';
  addOpt.textContent = 'Add New…';
  subcategorySelect.appendChild(addOpt);
})();

subcategorySelect.addEventListener('change', () => {
  const addNew = subcategorySelect.value === '__ADD_NEW__';
  subcategoryNewWrap.classList.toggle('hidden', !addNew);
  subcategoryNew.required = addNew;
  if (addNew) subcategoryNew.focus();
});

// Trait example chips
renderChips(traitExamples, TRAIT_EXAMPLES, t => addTraitRow(t.name, t.effect));
addTraitBtn.addEventListener('click', () => addTraitRow('', ''));

(async function initCampaigns(){
  try {
    const res = await fetch('assets/data/history.json', { cache: 'no-store' });
    const hist = await res.json();
    const sections = (hist.sections || []).slice().sort((a,b) => (b.order ?? 0) - (a.order ?? 0));
    for (const s of sections) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.title || s.id} (${s.id})`;
      campSelect.appendChild(opt);
    }
  } catch (e) {
    console.warn('Could not load history.json for campaign links', e);
  }
})();

// ====== Submit ======
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Submitting…';

  const fd = new FormData(form);

  const traits = [];
  traitsWrap.querySelectorAll('.trait-row').forEach(row => {
    const name = row.querySelector('input[name="traitName"]')?.value?.trim();
    const effect = row.querySelector('input[name="traitEffect"]')?.value?.trim();
    if (name && effect) traits.push({ name, effect });
  });

  const rawSub = subcategorySelect.value;
  const subResolved = rawSub === '__ADD_NEW__'
    ? (fd.get('subcategoryNew')?.trim() || '')
    : rawSub;

  const selectedCampaigns = Array.from(campSelect.selectedOptions).map(o => o.value);

  const data = {
    type:        'monster_suggestion',
    id:          fd.get('id')?.trim(),
    name:        fd.get('name')?.trim(),
    class:       fd.get('class')?.trim(),
    category:    categorySelect.value || '',
    subcategory: subResolved,
    hp:          fd.get('hp') ? Number(fd.get('hp')) : null,
    description: fd.get('description')?.trim(),
    campaignLinks: selectedCampaigns,
    traits,
    traitsText:  traits.map(t => `${t.name}: ${t.effect}`).join(' | '),
    siteRef:     location.href,
    submittedAt: new Date().toISOString(),
    userAgent:   navigator.userAgent
  };

  // Validation
  if (!data.id || !data.name || !data.category || !data.description) {
    statusEl.textContent = 'Please complete ID, Name, Category, and Description.';
    return;
  }
  if (rawSub === '__ADD_NEW__' && !data.subcategory) {
    statusEl.textContent = 'Please enter a new subcategory name.';
    return;
  }

  try {
    await fetch(SUGGEST_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    });

    statusEl.textContent = 'Suggestion submitted — thank you!';
    form.reset();
    subcategoryNewWrap.classList.add('hidden');
    subcategoryNew.required = false;
    traitsWrap.querySelectorAll('.trait-row').forEach((row, i) => { if (i) row.remove(); });

  } catch (err) {
    statusEl.textContent = 'Error. Could not submit.';
    console.error('Submit error:', err);
  }
});
