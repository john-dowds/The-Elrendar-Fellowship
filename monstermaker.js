/* Monster Maker — builds a single monster JSON entry for copy/paste
   Supports BOTH UI patterns:
   1) <input list="dl_*"> + <datalist id="dl_*">
   2) <select id="mm_*"> dropdowns

   Category -> filters Subcategory suggestions AND Class options.
*/

const dataFiles = [
    'assets/data/aberrations.json',
    'assets/data/beasts.json',
    'assets/data/critters.json',
    'assets/data/demons.json',
    'assets/data/dragonkin.json',
    'assets/data/elementals.json',
    'assets/data/giants.json',
    'assets/data/humanoids.json',
    'assets/data/mechanical.json',
    'assets/data/undead.json',
    'assets/data/npcs.json'
  ];
  
  const TRAIT_THEMES = ["", "damage","aoe","roots","healing","buffs","debuffs","translocation","utility"];
  
  // ---------- DOM ----------
  const elName  = document.getElementById('mm_name');
  const elId    = document.getElementById('mm_id');
  const elClass = document.getElementById('mm_class');
  const elHP    = document.getElementById('mm_hp');
  const elCat   = document.getElementById('mm_category');
  const elSub   = document.getElementById('mm_subcategory');
  const elDesc  = document.getElementById('mm_desc');
  
  // Optional datalists (only exist if you're using <input list="...">)
  const dlCats  = document.getElementById('dl_categories');
  const dlSubs  = document.getElementById('dl_subcategories');
  const dlClass = document.getElementById('dl_classes');
  
  const selTraitTheme = document.getElementById('mm_trait_theme');
  const selTraitPick  = document.getElementById('mm_trait_pick');
  const btnAddTrait   = document.getElementById('btnAddTrait');
  const btnAddCustom  = document.getElementById('btnAddCustomTrait');
  const traitListEl   = document.getElementById('traitList');
  
  const selCampPick    = document.getElementById('mm_campaign_pick');
  const inCampTyped    = document.getElementById('mm_campaign_add');
  const btnAddCampPick = document.getElementById('btnAddCampaignPick');
  const btnAddCampType = document.getElementById('btnAddCampaignTyped');
  const btnClearCamps  = document.getElementById('btnClearCampaigns');
  const chipsEl        = document.getElementById('campaignChips');
  
  const fileImage    = document.getElementById('mm_image_file');
  const selImageMode = document.getElementById('mm_image_mode');
  const inImageValue = document.getElementById('mm_image_value');
  
  const outEl    = document.getElementById('mm_output');
  const statusEl = document.getElementById('mm_status');
  const btnReset = document.getElementById('btnReset');
  const btnGen   = document.getElementById('btnGenerate');
  const btnCopy  = document.getElementById('btnCopy');
  
  // ---------- state ----------
  let allMonstersFlat = [];          // flattened entries from all catalogs
  let existingIds = new Set();       // for duplicate warning
  
  let categoryToSubs = new Map();    // cat -> Set(subcat)
  let categoryToClasses = new Map(); // cat -> Set(class)
  let classSet = new Set();          // all known classes
  let categorySet = new Set();       // all known categories
  
  let traitsCatalog = [];            // from traits.json entries[]
  let traitsByTheme = new Map();     // theme -> list
  let campaignOptions = [];          // list of {id,label}
  
  let chosenTraits = [];             // list of {name, trait, theme, effect}
  let chosenCampaigns = [];          // list of ids
  
  // ---------- helpers ----------
  function esc(str){ return (str ?? '').toString(); }
  
  function slugifyId(raw){
    const s = (raw ?? '').toString().trim().toLowerCase();
    return s
      .replace(/['"]/g,'')
      .replace(/[^a-z0-9\s_-]/g,'')
      .replace(/[\s-]+/g,'_')
      .replace(/_+/g,'_')
      .replace(/^_+|_+$/g,'');
  }
  
  function uniqPush(arr, v){
    v = (v ?? '').toString().trim();
    if (!v) return;
    if (!arr.includes(v)) arr.push(v);
  }
  
  function setStatus(msg, kind='warn'){
    if (!statusEl) return;
    if (!msg){
      statusEl.style.display = 'none';
      statusEl.className = 'warn';
      statusEl.textContent = '';
      return;
    }
    statusEl.style.display = '';
    statusEl.className = (kind === 'ok') ? 'ok' : 'warn';
    statusEl.textContent = msg;
  }
  
  async function loadJsonSafe(url){
    try{
      const res = await fetch(url, { cache:'no-store' });
      if (!res.ok) throw new Error('HTTP '+res.status);
      const txt = await res.text();
      if (!txt.trim()) return { entries: [], categories: [] };
      return JSON.parse(txt);
    }catch(e){
      console.warn('Skipping:', url, e);
      return { entries: [], categories: [] };
    }
  }
  
  function flattenEntriesFromSource(source){
    const out = [];
    const entries = Array.isArray(source.entries) ? source.entries : [];
    for (const e of entries){
      if (!e) continue;
      out.push(e);
    }
    return out;
  }
  
  function isSelect(el){
    return el && el.tagName === 'SELECT';
  }
  function isInput(el){
    return el && el.tagName === 'INPUT';
  }
  function readValue(el){
    if (!el) return '';
    return (el.value ?? '').toString();
  }
  function writeValue(el, v){
    if (!el) return;
    el.value = v;
  }
  
  /**
   * Populate either:
   * - a <select> (dropdown), OR
   * - a <datalist> (for an <input list="...">)
   *
   * If `targetSelect` is a SELECT, it will be filled.
   * Otherwise, if `targetDatalist` exists, it will be filled.
   */
  function populateChoices({ targetSelect, targetDatalist, values, placeholder = '— Select —' }){
    const arr = [...values].filter(Boolean).sort((a,b)=>a.localeCompare(b));
  
    if (isSelect(targetSelect)){
      const current = readValue(targetSelect).trim();
  
      targetSelect.innerHTML = '';
      const ph = document.createElement('option');
      ph.value = '';
      ph.textContent = placeholder;
      ph.disabled = true;
      ph.selected = true;
      targetSelect.appendChild(ph);
  
      for (const v of arr){
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        targetSelect.appendChild(opt);
      }
  
      // Try to preserve current selection if still present
      if (current && arr.includes(current)){
        targetSelect.value = current;
      }else{
        targetSelect.value = '';
      }
      return;
    }
  
    // datalist fallback (input list)
    if (targetDatalist){
      targetDatalist.innerHTML = '';
      for (const v of arr){
        const opt = document.createElement('option');
        opt.value = v;
        targetDatalist.appendChild(opt);
      }
    }
  }
  
  // ---------- category/subcategory/class filtering ----------
  function getSelectedCategory(){
    return readValue(elCat).trim();
  }
  
  function rebuildCategoryChoices(){
    populateChoices({
      targetSelect: elCat,
      targetDatalist: dlCats,
      values: categorySet,
      placeholder: '— Select category —'
    });
  }
  
  function rebuildSubcategoryChoices(){
    const cat = getSelectedCategory();
    const set = categoryToSubs.get(cat);
  
    populateChoices({
      targetSelect: elSub,
      targetDatalist: dlSubs,
      values: set ? set : [],
      placeholder: '— Select subcategory —'
    });
  
    // If using input/datalist, we do NOT want to wipe user-typed values.
    // If using select, populateChoices already clears selection if invalid.
  }
  
  function rebuildClassChoices(){
    const cat = getSelectedCategory();
    const set = categoryToClasses.get(cat);
  
    // If category is empty or unknown, show all known classes
    const values = (!cat || !set || set.size === 0) ? classSet : set;
  
    populateChoices({
      targetSelect: elClass,
      targetDatalist: dlClass,
      values,
      placeholder: (!cat ? '— Select class —' : `— Class (in ${cat}) —`)
    });
  
    // If using input/datalist, optionally clear invalid class if category has a known set
    if (!isSelect(elClass)){
      const current = readValue(elClass).trim();
      if (cat && set && set.size && current && !set.has(current)){
        writeValue(elClass, '');
      }
    }
  }
  
  function wireCategoryFilterEvents(){
    if (!elCat) return;
  
    const handler = ()=>{
      rebuildSubcategoryChoices();
      rebuildClassChoices();
    };
  
    // Selects fire 'change' reliably; inputs use 'input'
    if (isSelect(elCat)){
      elCat.addEventListener('change', handler);
    }else{
      elCat.addEventListener('input', handler);
    }
  }
  
  // ---------- traits UI ----------
  function initTraitThemeSelect(){
    selTraitTheme.innerHTML = '';
    for (const th of TRAIT_THEMES){
      const opt = document.createElement('option');
      opt.value = th;
      opt.textContent = th ? th[0].toUpperCase()+th.slice(1) : 'All themes';
      selTraitTheme.appendChild(opt);
    }
  }
  
  function rebuildTraitPick(){
    const theme = (selTraitTheme.value || '').toLowerCase();
    let list = [];
    if (!theme){
      for (const [, arr] of traitsByTheme.entries()) list.push(...arr);
    }else{
      list = traitsByTheme.get(theme) || [];
    }
    list = list.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  
    selTraitPick.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = '— Select trait —';
    ph.disabled = true;
    ph.selected = true;
    selTraitPick.appendChild(ph);
  
    for (const t of list){
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.name} (${t.theme})`;
      opt.dataset.effect = t.effect || '';
      opt.dataset.theme = t.theme || '';
      opt.dataset.name = t.name || '';
      selTraitPick.appendChild(opt);
    }
  }
  
  function renderTraits(){
    traitListEl.innerHTML = '';
    if (!chosenTraits.length){
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'No traits yet.';
      traitListEl.appendChild(empty);
      return;
    }
  
    chosenTraits.forEach((t, idx)=>{
      const wrap = document.createElement('div');
      wrap.className = 'trait-item';
  
      const head = document.createElement('div');
      head.className = 'trait-head';
  
      const title = document.createElement('div');
      title.className = 'trait-title';
      title.textContent = t.name || 'Trait';
  
      const meta = document.createElement('div');
      meta.className = 'trait-actions';
  
      const pill = document.createElement('span');
      pill.className = 'mini';
      pill.textContent = `${t.theme || 'utility'} • ${t.trait || 'misc'}`;
  
      const del = document.createElement('button');
      del.className = 'xbtn';
      del.type = 'button';
      del.textContent = 'Remove';
      del.addEventListener('click', ()=>{
        chosenTraits.splice(idx,1);
        renderTraits();
      });
  
      meta.appendChild(pill);
      meta.appendChild(del);
  
      head.appendChild(title);
      head.appendChild(meta);
  
      const row = document.createElement('div');
      row.className = 'row-2';
  
      const f1 = document.createElement('div');
      f1.className = 'field';
      f1.innerHTML = `<label>Name</label><input type="text" value="${esc(t.name)}">`;
  
      const f2 = document.createElement('div');
      f2.className = 'field';
      f2.innerHTML = `<label>Trait Type (the "trait" field)</label><input type="text" value="${esc(t.trait)}" placeholder="e.g. crushing_attack / root / misc">`;
  
      const f3 = document.createElement('div');
      f3.className = 'field';
      f3.innerHTML = `<label>Theme</label><input type="text" value="${esc(t.theme)}" placeholder="damage / aoe / roots / ...">`;
  
      const f4 = document.createElement('div');
      f4.className = 'field';
      f4.style.gridColumn = '1 / -1';
      f4.innerHTML = `<label>Effect</label><textarea>${esc(t.effect)}</textarea>`;
  
      row.appendChild(f1);
      row.appendChild(f2);
      row.appendChild(f3);
      row.appendChild(f4);
  
      const inName = f1.querySelector('input');
      const inTraitType = f2.querySelector('input');
      const inTheme = f3.querySelector('input');
      const taEffect = f4.querySelector('textarea');
  
      inName.addEventListener('input', ()=>{ t.name = inName.value; renderTraits(); });
      inTraitType.addEventListener('input', ()=>{ t.trait = inTraitType.value; });
      inTheme.addEventListener('input', ()=>{ t.theme = inTheme.value; });
      taEffect.addEventListener('input', ()=>{ t.effect = taEffect.value; });
  
      wrap.appendChild(head);
      wrap.appendChild(row);
      traitListEl.appendChild(wrap);
    });
  }
  
  // ---------- campaigns UI ----------
  function renderCampaignChips(){
    chipsEl.innerHTML = '';
    if (!chosenCampaigns.length){
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'No campaign IDs yet.';
      chipsEl.appendChild(empty);
      return;
    }
    chosenCampaigns.forEach((id)=>{
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = id;
  
      const x = document.createElement('button');
      x.type = 'button';
      x.textContent = '×';
      x.title = 'Remove';
      x.addEventListener('click', ()=>{
        chosenCampaigns = chosenCampaigns.filter(c=>c!==id);
        renderCampaignChips();
      });
  
      chip.appendChild(x);
      chipsEl.appendChild(chip);
    });
  }
  
  // ---------- image ----------
  function updateImageFromFile(){
    const f = fileImage.files && fileImage.files[0];
    if (!f) return;
    const mode = selImageMode.value;
    const name = f.name;
    inImageValue.value = (mode === 'path') ? `assets/art/monsters/${name}` : name;
  }
  
  // ---------- output ----------
  function makeMonsterObject(){
    const name = readValue(elName).trim();
    const idInput = readValue(elId).trim();
    const id = idInput || slugifyId(name);
  
    const hp = Number(readValue(elHP));
    const hpOut = Number.isFinite(hp) && hp > 0 ? Math.round(hp) : null;
  
    const cls = readValue(elClass).trim();
    const cat = readValue(elCat).trim();
    const sub = readValue(elSub).trim();
  
    const desc = readValue(elDesc).trim();
    const img = readValue(inImageValue).trim();
  
    const obj = {
      id: id,
      name: name,
      class: cls,
      category: cat,
      subcategory: sub,
      hp: hpOut ?? 0,
      traits: chosenTraits.map(t=>({
        name: (t.name || '').trim(),
        trait: (t.trait || '').trim(),
        theme: (t.theme || '').trim(),
        effect: (t.effect || '').trim()
      })).filter(t=> t.name || t.effect || t.trait || t.theme),
      description: desc,
      campaignLinks: chosenCampaigns.slice()
    };
  
    if (img) obj.image = img;
  
    return { obj, id, hpOut };
  }
  
  function validate(){
    const name = readValue(elName).trim();
    const id = (readValue(elId).trim() || slugifyId(name)).trim();
    const hp = Number(readValue(elHP));
  
    if (!name) return { ok:false, msg:'Name is required.' };
    if (!id) return { ok:false, msg:'ID is required (or Name must be set so ID can be generated).' };
    if (!readValue(elClass).trim()) return { ok:false, msg:'Class is required.' };
    if (!readValue(elCat).trim()) return { ok:false, msg:'Category is required.' };
    if (!readValue(elSub).trim()) return { ok:false, msg:'Subcategory is required.' };
    if (!Number.isFinite(hp) || hp <= 0) return { ok:false, msg:'HP must be a positive number.' };
  
    if (existingIds.has(id)){
      return { ok:true, warn:`Heads up: ID "${id}" already exists in your catalogs. If this is a new monster, change the ID.` };
    }
  
    return { ok:true };
  }
  
  function prettyJson(obj){
    return JSON.stringify(obj, null, 2);
  }
  
  // ---------- events ----------
  if (elName && elId){
    elName.addEventListener('input', ()=>{
      if (!readValue(elId).trim()){
        elId.placeholder = slugifyId(readValue(elName).trim()) || 'my_monster_id';
      }
    });
  }
  
  wireCategoryFilterEvents();
  
  selTraitTheme.addEventListener('change', rebuildTraitPick);
  
  btnAddTrait.addEventListener('click', ()=>{
    const opt = selTraitPick.selectedOptions[0];
    if (!opt || !opt.value) return;
  
    const tname = opt.dataset.name || opt.textContent;
    const ttheme = (opt.dataset.theme || '').toLowerCase();
    const teffect= opt.dataset.effect || '';
    const traitType = opt.value; // editable later
  
    chosenTraits.push({
      name: tname,
      trait: traitType,
      theme: ttheme || 'utility',
      effect: teffect
    });
    renderTraits();
  });
  
  btnAddCustom.addEventListener('click', ()=>{
    chosenTraits.push({
      name: 'New Trait',
      trait: 'misc',
      theme: 'utility',
      effect: ''
    });
    renderTraits();
  });
  
  btnAddCampPick.addEventListener('click', ()=>{
    const v = selCampPick.value;
    if (!v) return;
    uniqPush(chosenCampaigns, v);
    renderCampaignChips();
  });
  
  btnAddCampType.addEventListener('click', ()=>{
    const v = readValue(inCampTyped).trim();
    if (!v) return;
    uniqPush(chosenCampaigns, v);
    writeValue(inCampTyped, '');
    renderCampaignChips();
  });
  
  btnClearCamps.addEventListener('click', ()=>{
    chosenCampaigns = [];
    renderCampaignChips();
  });
  
  fileImage.addEventListener('change', updateImageFromFile);
  selImageMode.addEventListener('change', updateImageFromFile);
  
  btnGen.addEventListener('click', ()=>{
    setStatus('');
    const v = validate();
    if (!v.ok){
      setStatus(v.msg, 'warn');
      btnCopy.disabled = true;
      return;
    }
  
    const { obj } = makeMonsterObject();
    const txt = prettyJson(obj);
    outEl.value = txt;
    btnCopy.disabled = !txt.trim();
  
    if (v.warn) setStatus(v.warn, 'warn');
    else setStatus('JSON generated. Ready to copy.', 'ok');
  });
  
  btnCopy.addEventListener('click', async ()=>{
    const txt = outEl.value;
    if (!txt.trim()) return;
    try{
      await navigator.clipboard.writeText(txt);
      setStatus('Copied to clipboard.', 'ok');
    }catch(e){
      outEl.focus();
      outEl.select();
      document.execCommand('copy');
      setStatus('Copied (fallback).', 'ok');
    }
  });
  
  btnReset.addEventListener('click', ()=>{
    writeValue(elName, '');
    writeValue(elId, '');
    writeValue(elClass, '');
    writeValue(elHP, '');
    writeValue(elCat, '');
    writeValue(elSub, '');
    writeValue(elDesc, '');
  
    chosenTraits = [];
    chosenCampaigns = [];
  
    if (fileImage) fileImage.value = '';
    writeValue(inImageValue, '');
  
    outEl.value = '';
    btnCopy.disabled = true;
    setStatus('');
  
    renderTraits();
    renderCampaignChips();
  
    // refresh dependent dropdowns/lists
    rebuildSubcategoryChoices();
    rebuildClassChoices();
  });
  
  // ---------- init ----------
  (async function init(){
    // Load catalogs
    const allData = await Promise.all(dataFiles.map(loadJsonSafe));
    const allEntries = allData.flatMap(flattenEntriesFromSource);
  
    allMonstersFlat = allEntries;
  
    // Build sets and maps
    for (const m of allEntries){
      if (!m) continue;
  
      if (m.id) existingIds.add(m.id);
  
      if (m.category) categorySet.add(m.category);
      if (m.class) classSet.add(m.class);
  
      if (m.category && m.subcategory){
        if (!categoryToSubs.has(m.category)) categoryToSubs.set(m.category, new Set());
        categoryToSubs.get(m.category).add(m.subcategory);
      }
  
      if (m.category && m.class){
        if (!categoryToClasses.has(m.category)) categoryToClasses.set(m.category, new Set());
        categoryToClasses.get(m.category).add(m.class);
      }
    }
  
    // Populate category + class choices (select OR datalist)
    rebuildCategoryChoices();
    rebuildClassChoices();
    rebuildSubcategoryChoices();
  
    // traits.json
    const traitsData = await loadJsonSafe('assets/data/traits.json');
    traitsCatalog = Array.isArray(traitsData.entries) ? traitsData.entries : [];
  
    traitsByTheme.clear();
    for (const t of traitsCatalog){
      const theme = (t.theme || 'utility').toLowerCase();
      if (!traitsByTheme.has(theme)) traitsByTheme.set(theme, []);
      traitsByTheme.get(theme).push({
        id: t.id,
        name: t.name || t.id,
        theme: theme,
        effect: t.effect || ''
      });
    }
  
    // Trait theme select + picker
    initTraitThemeSelect();
    rebuildTraitPick();
  
    // history.json for campaign IDs
    let hist = { sections: [] };
    try{
      const r = await fetch('assets/data/history.json', { cache:'no-store' });
      if (r.ok) hist = await r.json();
    }catch(e){
      console.warn('history.json not available:', e);
    }
  
    campaignOptions = [];
    for (const sec of (hist.sections || [])){
      if (sec.id){
        campaignOptions.push({ id: sec.id, label: `${sec.title || sec.id} (section)` });
      }
      for (const ent of (sec.entries || [])){
        if (ent && ent.id){
          campaignOptions.push({ id: ent.id, label: `${ent.title || ent.id}` });
        }
      }
    }
    campaignOptions.sort((a,b)=>a.label.localeCompare(b.label));
  
    selCampPick.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = '';
    ph.textContent = '— Select history ID —';
    ph.disabled = true;
    ph.selected = true;
    selCampPick.appendChild(ph);
  
    for (const o of campaignOptions){
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.label;
      selCampPick.appendChild(opt);
    }
  
    // First renders
    renderTraits();
    renderCampaignChips();
  
    setStatus('Loaded catalogs. Choose a category to filter available classes.', 'ok');
  })();
  