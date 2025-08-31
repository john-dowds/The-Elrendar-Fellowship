/* State */
const STORAGE_KEY = 'elf/dmassist/v1';

const state = {
  turnsCount: 1,
  targets: [],
  history: []
};

/* Elements */
const els = {
  thead: document.getElementById('thead'),
  tbody: document.getElementById('tbody'),
  tfoot: document.getElementById('tfoot'),
  controls: document.getElementById('assistControls'),
  assistGrid: document.getElementById('assistGrid'),
  importInput: document.getElementById('importInput')
};

/* Guide Navigation */
function openGuide(params) {
  const url = new URL('monsterguide.html', window.location.href);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v != null && String(v).trim() !== '') url.searchParams.set(k, v);
  });
  window.location.assign(url.toString());
}

/* Utilities */
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const sum = arr => arr.reduce((a, b) => a + (Number(b) || 0), 0);
const quote = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
const escapeHtml = s =>
  (s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtSigned = n => (n > 0 ? '+' : '') + n;

/* History */
function snap() {
  const copy = JSON.stringify({ turnsCount: state.turnsCount, targets: state.targets });
  state.history.push(copy);
  if (state.history.length > 40) state.history.shift();
}
function undo() {
  const last = state.history.pop();
  if (!last) return;
  const s = JSON.parse(last);
  state.turnsCount = s.turnsCount;
  state.targets = s.targets;
  renderAll();
  save();
}

/* Persistence */
function save() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ turnsCount: state.turnsCount, targets: state.targets })
  );
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s && Array.isArray(s.targets) && Number.isFinite(s.turnsCount)) {
      state.turnsCount = Math.max(1, s.turnsCount | 0);
      state.targets = s.targets.map(t => {
        const migrated = { ...t };
        if (!migrated.level && migrated.role) migrated.level = migrated.role;
        return {
          statusEffect: 'statusEffect' in migrated ? migrated.statusEffect : 'Active',
          ...migrated,
          turns: Array.isArray(migrated.turns)
            ? migrated.turns
                .slice(0, state.turnsCount)
                .concat(Array(Math.max(0, state.turnsCount - migrated.turns.length)).fill(0))
            : Array(state.turnsCount).fill(0)
        };
      });
    }
  } catch {}
}

/* Sticky Metrics */
function updateStickyMetrics() {
  const h = (els.controls?.offsetHeight || 0) + 6;
  const root = document.querySelector('.assist-wrap');
  if (root) {
    root.style.setProperty('--assist-sticky-top', h + 'px');
    const maxh = window.innerHeight - h - 100;
    root.style.setProperty('--assist-maxh', Math.max(260, maxh) + 'px');
  }
}
window.addEventListener('resize', updateStickyMetrics);

/* Table */
const currentHP = t => clamp(t.maxHP + sum(t.turns), 0, t.maxHP);

function renderAll() {
  renderHead();
  renderBody();
  renderFoot();
  updateStickyMetrics();
}

function renderHead() {
  const turnCols = Array.from({ length: state.turnsCount }, (_, i) => `<th class="turn-col">Turn ${i + 1}</th>`).join('');
  els.thead.innerHTML = `
    <tr>
      <th class="name-cell">Name</th>
      <th class="hp-cell">Max HP</th>
      ${turnCols}
      <th>Current<br>HP</th>
      <th>Status</th>
      <th>Quick<br>Add</th>
      <th>Notes</th>
      <th></th>
    </tr>
  `;
}

function renderBody() {
  els.tbody.innerHTML = '';
  const frag = document.createDocumentFragment();

  for (const t of state.targets) {
    const tr = document.createElement('tr');

    const race = [t.category, t.subcategory].filter(Boolean).join(' • ');
    const traitLines = (t.traitsText || '')
      .split(/\r?\n|;|,/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 2);

    const nameTd = document.createElement('td');
    nameTd.className = 'name-cell';
    nameTd.innerHTML = `
      <div class="name-stack">
        <div class="name-line">${escapeHtml(t.name || t.baseName || 'Monster')}</div>
        ${t.class ? `<div class="inline-text"><span class="badge" data-class="${escapeHtml(t.class)}">Class: ${escapeHtml(t.class)}</span></div>` : ''}
        ${(t.category || t.subcategory) ? `<div class="inline-text"><span class="badge" data-race-cat="${escapeHtml(t.category || '')}" data-race-sub="${escapeHtml(t.subcategory || '')}">Race: ${escapeHtml(race)}</span></div>` : ''}
        ${t.level ? `<div class="inline-text"><span class="badge">Level: ${escapeHtml(t.level)}</span></div>` : ''}
        ${traitLines[0] ? `<div class="badges"><span class="badge" data-trait="${escapeHtml(traitLines[0])}">${escapeHtml(traitLines[0])}</span></div>` : ''}
        ${traitLines[1] ? `<div class="badges"><span class="badge" data-trait="${escapeHtml(traitLines[1])}">${escapeHtml(traitLines[1])}</span></div>` : ''}
      </div>
    `;
    tr.appendChild(nameTd);

    const max = document.createElement('td');
    max.className = 'hp-cell';
    max.innerHTML = `<input type="number" step="1" min="1" class="turn-edit" value="${Number(t.maxHP) || 1}" data-id="${t.id}" data-k="maxHP">`;
    tr.appendChild(max);

    for (let i = 0; i < state.turnsCount; i++) {
      const td = document.createElement('td');
      td.className = 'turn-cell';
      td.innerHTML = `
        <div class="turn-stack">
          <button class="nudge-btn" data-id="${t.id}" data-turn="${i}" data-delta="+1">+1</button>
          <input type="number" step="1" class="turn-edit" value="${Number(t.turns[i]) || 0}" data-id="${t.id}" data-k="turn" data-turn="${i}" placeholder="0">
          <button class="nudge-btn" data-id="${t.id}" data-turn="${i}" data-delta="-1">-1</button>
        </div>
      `;
      tr.appendChild(td);
    }

    const cur = document.createElement('td');
    cur.className = 'current-hp';
    cur.textContent = currentHP(t);
    tr.appendChild(cur);

    const st = document.createElement('td');
    const effect = t.statusEffect || 'Active';
    st.innerHTML = `<span role="button" class="status-chip ${statusClass(effect)}" data-id="${t.id}" data-act="status">${escapeHtml(effect)}</span>`;
    tr.appendChild(st);

    const quick = document.createElement('td');
    quick.className = 'quickbar';
    [['-1', -1], ['-5', -5], ['-10', -10], ['+5', 5]].forEach(([label, delta]) => {
      const b = document.createElement('button');
      b.className = 'mini';
      b.textContent = label;
      b.addEventListener('click', () => {
        snap();
        const idx = state.targets.findIndex(x => x.id === t.id);
        if (idx > -1) {
          state.targets[idx].turns[state.turnsCount - 1] =
            (Number(state.targets[idx].turns[state.turnsCount - 1]) || 0) + delta;
        }
        renderAll();
        save();
      });
      quick.appendChild(b);
    });
    tr.appendChild(quick);

    const notes = document.createElement('td');
    notes.innerHTML = `<input type="text" class="turn-edit" value="${escapeHtml(t.notes || '')}" data-id="${t.id}" data-k="notes" placeholder="Optional notes…">`;
    tr.appendChild(notes);

    const actions = document.createElement('td');
    actions.innerHTML = `
      <button class="mini" title="Duplicate" data-act="dup" data-id="${t.id}">⧉</button>
      <button class="mini" title="Remove" data-act="del" data-id="${t.id}">✕</button>
      <button class="mini" title="Open in Guide" data-act="info" data-id="${t.id}">⋯</button>
    `;
    tr.appendChild(actions);

    frag.appendChild(tr);
  }

  els.tbody.appendChild(frag);

  els.tbody.querySelectorAll('input.turn-edit').forEach(inp => inp.addEventListener('change', onEditCell));
  els.tbody.querySelectorAll('button.mini').forEach(btn => {
    const act = btn.dataset.act;
    if (act) btn.addEventListener('click', onRowAction);
  });
  els.tbody.querySelectorAll('.nudge-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const ti = Number(btn.dataset.turn) || 0;
      const delta = btn.dataset.delta === '+1' ? 1 : -1;
      snap();
      const idx = state.targets.findIndex(t => t.id === id);
      if (idx > -1) {
        state.targets[idx].turns[ti] = (Number(state.targets[idx].turns[ti]) || 0) + delta;
      }
      renderAll();
      save();
    });
  });
}

function renderFoot() {
  const tr = document.createElement('tr');
  tr.className = 'tfoot-row';
  const totals = perTurnTotals();
  tr.innerHTML = [
    `<td><strong>Totals</strong></td>`,
    `<td></td>`,
    ...totals.map(t => `<td title="Damage / Healing">${fmtSigned(t.dmg)} / ${fmtSigned(t.heal)}</td>`),
    `<td></td><td></td><td></td><td></td><td></td>`
  ].join('');
  els.tfoot.innerHTML = '';
  els.tfoot.appendChild(tr);
}

function perTurnTotals() {
  const out = [];
  for (let i = 0; i < state.turnsCount; i++) {
    let dmg = 0,
      heal = 0;
    for (const t of state.targets) {
      const v = Number(t.turns[i]) || 0;
      if (v < 0) dmg += v;
      else heal += v;
    }
    out.push({ dmg, heal });
  }
  return out;
}

/* Events */
function onEditCell(ev) {
  const el = ev.currentTarget;
  const id = el.dataset.id;
  const k = el.dataset.k;
  snap();
  const idx = state.targets.findIndex(t => t.id === id);
  if (idx === -1) return;
  if (k === 'maxHP') state.targets[idx].maxHP = Math.max(1, Math.round(Number(el.value) || 1));
  else if (k === 'notes') state.targets[idx].notes = el.value || '';
  else if (k === 'turn') {
    const ti = Number(el.dataset.turn) || 0;
    state.targets[idx].turns[ti] = Math.round(Number(el.value) || 0);
  }
  renderAll();
  save();
}

function onRowAction(ev) {
  const id = ev.currentTarget.dataset.id;
  const act = ev.currentTarget.dataset.act;
  const idx = state.targets.findIndex(t => t.id === id);
  if (idx === -1) return;
  if (act === 'dup') {
    snap();
    const copy = JSON.parse(JSON.stringify(state.targets[idx]));
    copy.id = uid();
    copy.name = (copy.name || copy.baseName || 'Monster') + ' (Copy)';
    state.targets.splice(idx + 1, 0, copy);
    renderAll();
    save();
  } else if (act === 'del') {
    snap();
    state.targets.splice(idx, 1);
    renderAll();
    save();
  } else if (act === 'info') {
    const t = state.targets[idx];
    openGuide({ tab: 'monsters', cat: t.category || '', sub: t.subcategory || '' });
  }
}

/* Chip Delegation */
els.tbody.addEventListener('click', ev => {
  const traitChip = ev.target.closest('.badge[data-trait]');
  const raceChip = ev.target.closest('.badge[data-race-cat]');
  const classChip = ev.target.closest('.badge[data-class]');
  if (traitChip) {
    const traitText = traitChip.getAttribute('data-trait') || '';
    openGuide({ tab: 'traits', trait: traitText });
  } else if (raceChip) {
    openGuide({
      tab: 'monsters',
      cat: raceChip.getAttribute('data-race-cat') || '',
      sub: raceChip.getAttribute('data-race-sub') || ''
    });
  } else if (classChip) {
    openGuide({ tab: 'monsters', class: classChip.getAttribute('data-class') || '' });
  }
});

/* Status Cycling */
els.tbody.addEventListener('click', ev => {
  const chip = ev.target.closest('.status-chip[data-act="status"]');
  if (!chip) return;
  const id = chip.getAttribute('data-id');
  const t = state.targets.find(x => x.id === id);
  if (!t) return;
  const STATUS_STATES = [
    'Active',
    'Rooted',
    'Stunned',
    'Slowed',
    'Possessed',
    'Retreated',
    'Channeling',
    'Unconscious',
    'Flying',
    'Shielded',
    'Cursed'
  ];
  const i = STATUS_STATES.indexOf(t.statusEffect || 'Active');
  t.statusEffect = STATUS_STATES[(i >= 0 ? i + 1 : 1) % STATUS_STATES.length];
  renderAll();
  save();
});

/* Toolbar */
document.getElementById('newTurnBtn').addEventListener('click', () => {
  snap();
  state.turnsCount += 1;
  for (const t of state.targets) t.turns.push(0);
  renderAll();
  save();
});
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Reset this DM Assist session? This clears the table and turns.')) return;
  localStorage.removeItem(STORAGE_KEY);
  state.turnsCount = 1;
  state.targets = [];
  state.history = [];
  renderAll();
});
document.getElementById('exportJsonBtn').addEventListener('click', () => {
  const blob = new Blob(
    [JSON.stringify({ turns: state.turnsCount, targets: state.targets }, null, 2)],
    { type: 'application/json' }
  );
  downloadBlob(blob, `dm_assist_${today()}.json`);
});
document.getElementById('exportCsvBtn').addEventListener('click', () => {
  const csv = toCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `dm_assist_${today()}.csv`);
});
document.getElementById('importInput').addEventListener('change', onImportFile);

/* Import */
async function onImportFile(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  try {
    if (file.name.toLowerCase().endsWith('.xlsx')) importFromXlsx(await file.arrayBuffer());
    else if (file.name.toLowerCase().endsWith('.csv')) importFromCsv(await file.text());
    else alert('Unsupported file type. Please select an .xlsx or .csv file.');
  } catch (e) {
    console.error(e);
    alert('Import failed. Check the file format.');
  } finally {
    ev.target.value = '';
  }
}

function importFromCsv(text) {
  const lines = text.split(/\r?\n/).filter(x => x.trim().length);
  if (!lines.length) return;
  const headers = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const idx = h => headers.indexOf(h);
  const ixName = idx('name'),
    ixHP = idx('hp'),
    ixCount = idx('count'),
    ixTraits = idx('traits'),
    ixClass = idx('class'),
    ixCat = idx('category'),
    ixSub = idx('subcategory');
  const ixLevel =
    idx('level') >= 0
      ? idx('level')
      : idx('role') >= 0
      ? idx('role')
      : idx('rank') >= 0
      ? idx('rank')
      : idx('tier') >= 0
      ? idx('tier')
      : idx('threat') >= 0
      ? idx('threat')
      : -1;

  snap();
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const name = cols[ixName] || `Target ${i}`;
    const maxHP = Math.max(1, Math.round(Number(cols[ixHP]) || 1));
    const count = Math.max(1, Math.round(Number(cols[ixCount]) || 1));
    const traitsText = cols[ixTraits] || '';
    const klass = cols[ixClass] || '';
    const cat = cols[ixCat] || '';
    const sub = cols[ixSub] || '';
    const level = ixLevel >= 0 ? cols[ixLevel] || '' : '';

    replicateTargets({
      baseName: '',
      name,
      maxHP,
      count,
      traitsText,
      class: klass,
      category: cat,
      subcategory: sub,
      level
    });
  }
  renderAll();
  save();
}

function importFromXlsx(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheets = wb.SheetNames || [];
  if (!sheets.length) {
    alert('No sheets found in workbook.');
    return;
  }
  snap();
  for (const title of sheets) {
    const ws = wb.Sheets[title];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (!rows || !rows.length) continue;
    const map = new Map();
    let traitsStart = -1;
    for (let r = 0; r < rows.length; r++) {
      const [k, v] = rows[r];
      if ((k || '').toString().trim().toLowerCase() === 'traits') {
        traitsStart = r + 1;
        break;
      }
      if (k !== undefined && v !== undefined && String(k).trim().length) {
        map.set(String(k).trim(), String(v).trim());
      }
    }
    const traitsLines = [];
    if (traitsStart >= 0) {
      for (let r = traitsStart; r < rows.length; r++) {
        const [line] = rows[r];
        if (line === undefined || String(line).trim() === '') continue;
        traitsLines.push(String(line));
      }
    }
    const count = Math.max(1, Math.round(Number(map.get('Count')) || 1));
    const maxHP = Math.max(1, Math.round(Number(map.get('HP')) || 1));
    const baseName = String(map.get('Base Monster') || title || 'Monster');
    const custom = String(map.get('Name (Optional)') || '').trim();
    const klass = String(map.get('Class') || '').trim();
    const category = String(map.get('Category') || '').trim();
    const subcategory = String(map.get('Subcategory') || '').trim();
    const rawLevel = map.get('Level') ?? map.get('Role') ?? '';
    const level = String(rawLevel).trim();
    const name = custom || baseName;
    const traitsText = traitsLines.join('\n');

    replicateTargets({ baseName, name, maxHP, count, traitsText, class: klass, category, subcategory, level });
  }
  renderAll();
  save();
}

function replicateTargets({ baseName, name, maxHP, count, traitsText, class: klass, category, subcategory, level }) {
  for (let i = 0; i < count; i++) {
    state.targets.push({
      id: uid(),
      baseName: baseName || '',
      name: count > 1 ? `${name} #${i + 1}` : name,
      maxHP: maxHP || 1,
      turns: Array(state.turnsCount).fill(0),
      traitsText: traitsText || '',
      class: klass || '',
      category: category || '',
      subcategory: subcategory || '',
      level: level || '',
      notes: '',
      statusEffect: 'Active'
    });
  }
}

/* Export */
function toCSV() {
  const head = [
    'Name',
    'MaxHP',
    ...Array.from({ length: state.turnsCount }, (_, i) => `Turn${i + 1}`),
    'CurrentHP',
    'StatusEffect',
    'Notes'
  ];
  const rows = [head.join(',')];
  for (const t of state.targets) {
    const arr = [
      quote(t.name || t.baseName || 'Monster'),
      t.maxHP,
      ...t.turns.map(n => Number(n) || 0),
      currentHP(t),
      quote(t.statusEffect || 'Active'),
      quote(t.notes || '')
    ];
    rows.push(arr.join(','));
  }
  return rows.join('\n');
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim());
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* Status Helper */
function statusClass(effect) {
  const key = (effect || 'Active').toLowerCase();
  return (
    {
      active: 'status-active',
      rooted: 'status-rooted',
      stunned: 'status-stunned',
      slowed: 'status-slowed',
      possessed: 'status-possessed',
      retreated: 'status-retreated',
      channeling: 'status-channeling',
      unconscious: 'status-unconscious',
      flying: 'status-flying',
      shielded: 'status-shielded',
      cursed: 'status-cursed'
    }[key] || 'status-active'
  );
}

/* Boot */
load();
renderAll();
updateStickyMetrics();
