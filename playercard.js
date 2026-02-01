/* Player Quick Card (offline template)
   - Local state save/load
   - Local “Profiles” save/load (placeholder for future auth-backed profiles)
   - Dice roller: d6 + (class roll bonus + perk roll bonus + toggled buffs)
   - Stance brackets display (same as Systems Quick Card)
   - Enemy feed placeholder reads from localStorage (future: DM Assist session pipe)
*/

(() => {
    const LS_CARD_KEY     = 'elf/playercard/v1';
    const LS_PROFILES_KEY = 'elf/playerprofiles/v1';
    const LS_ENEMIES_KEY  = 'elf/playercard/enemies/v1';
  
    const el = {
      // Card
      name: document.getElementById('pcName'),
      cls: document.getElementById('pcClass'),
      clsNote: document.getElementById('pcClassNote'),
      perk1: document.getElementById('pcPerk1'),
      perk2: document.getElementById('pcPerk2'),
      perk3: document.getElementById('pcPerk3'),
      perk1Desc: document.getElementById('pcPerk1Desc'),
      perk2Desc: document.getElementById('pcPerk2Desc'),
      perk3Desc: document.getElementById('pcPerk3Desc'),
      stance: document.getElementById('pcStance'),
      stanceRow: document.getElementById('pcStanceRow'),
      hpMinus: document.getElementById('pcHPMinus'),
      hpPlus: document.getElementById('pcHPPlus'),
      hpVal: document.getElementById('pcHPVal'),
      state: document.getElementById('pcStateChip'),
      saveCard: document.getElementById('pcSaveCard'),
      resetCard: document.getElementById('pcResetCard'),
      savedMsg: document.getElementById('pcSavedMsg'),
  
      // Dice
      rollBtn: document.getElementById('pcRollBtn'),
      rollType: document.getElementById('pcRollType'),
      rollNum: document.getElementById('pcRollNum'),
      rollBreak: document.getElementById('pcRollBreak'),
      rollToggles: document.getElementById('pcRollToggles'),
      toggleList: document.getElementById('pcToggleList'),
  
      // Profiles
      profileSelect: document.getElementById('pcProfileSelect'),
      saveProfile: document.getElementById('pcSaveProfile'),
      deleteProfile: document.getElementById('pcDeleteProfile'),
      profileMsg: document.getElementById('pcProfileMsg'),
  
      // Portrait
      portraitImg: document.getElementById('pcPortraitImg'),
      portraitPh: document.getElementById('pcPortraitPlaceholder'),
    };
  
    /* Data (mirrors the Systems Quick Card) */
    const CLASS_NOTES = {
      magi: 'Mages & Healers — +2 dmg/heal on hits • +3 Combat & Perception',
      assassin: 'Assassins & Rangers — +3 Combat • +2 Environment & Perception',
      aggressive: 'Aggressive Fighters — +2 dmg on hits • +3 Combat & Grapple',
      thief: 'Thief & Mercenary — +2 dmg on hits • +3 Charisma & Perception'
    };
  
    // Roll bonuses by class + roll type (used by the d6 roller)
    const CLASS_ROLL_BONUS = {
      magi:      { combat: 3, perception: 3, environment: 0, grapple: 0, charisma: 0 },
      assassin:  { combat: 3, perception: 2, environment: 2, grapple: 0, charisma: 0 },
      aggressive:{ combat: 3, perception: 0, environment: 0, grapple: 3, charisma: 0 },
      thief:     { combat: 0, perception: 3, environment: 0, grapple: 0, charisma: 3 },
    };
  
    // Perk descriptions
    const PERKS = {
      'Bulwark Bearer':'Reduce incoming damage by 2.',
      'Bladesworn Resolve':'Your hits deal +2 damage.',
      'Skirmisher’s Step':'Once per event, ignore or dodge one incoming hit, or disengage freely from combat.',
      'Keen Senses':'When investigating, gain +3 to your Perception rolls.',
      'Second Wind':'When you’d hit 0 HP, pop to 5 HP instead.',
      'Battlefield Medic':'At your discretion, you may split your output—dealing both damage and healing instead of just one or the other.',
      'Rally Banner':'Allies within earshot gain +3 morale to their roll for this round.',
      'Iron Will':'Ignore Fear or Charm once; act normally.',
      'Arcane Wisdom':'When sensing for magical effects or power, gain +3 to your Perception roll.',
      'Mass Shield':'Protect the entirety of your party (if grouped), preventing all damage taken this round.',
      'Scholar':'Gain additional information when investigating, regardless of whether you succeed in your roll or not.',
      'Pathfinder':'Gain +3 on either Environment or Perception each round (pick when you roll).',
      'Mounted Momentum':'If you engaged the target first (instead of them coming at you), your hit deals +1 damage this turn.',
      'Determination':'After failing two rolls consecutively, gain +3 to your next roll (and it escalates). (Manual toggle here.)',
      'Even Stronger Determination':'After suffering five failures in a row, your next turn takes the form of a natural 20. (Manual toggle here.)',
      'Silver Tongue':'When attempting to persuade or deceive, gain +3 to your roll.',
      'Shadow Veil':'Turn one incoming hit against you into a miss.',
      'Battle Rhythm':'After you score a hit, your next hit this encounter gains +1 damage.',
      'Blood Lust':'After dealing a killing blow, gain +2 to your roll next turn. (Manual toggle here.)'
    };
  
    // Perk roll modifiers (automatic by roll type)
    const PERK_ROLL_BONUS = {
      'Keen Senses':              { perception: 3 },
      'Arcane Wisdom':            { perception: 3 },
      'Pathfinder':               { perception: 3, environment: 3 }, // applies to whichever roll type is selected
      'Silver Tongue':            { charisma: 3 },
    };
  
    // Perk-based toggles (manual “buffs” that appear only if you selected the perk)
    const PERK_TOGGLES = {
      'Rally Banner': { label: 'Rally Banner (+3 this roll)', bonus: 3, types: ['combat','perception','environment','grapple','charisma'] },
      'Determination': { label: 'Determination (+3 this roll)', bonus: 3, types: ['combat','perception','environment','grapple','charisma'] },
      'Even Stronger Determination': { label: 'Even Stronger Determination (+14 this roll)', bonus: 14, types: ['combat','perception','environment','grapple','charisma'] },
      'Blood Lust': { label: 'Blood Lust (+2 this roll)', bonus: 2, types: ['combat'] },
    };
  
    const STANCES = {
      Aggressive: ['−6 HP','−4 HP','−2 HP','+3 dmg','+4 dmg','+6 dmg'],
      Balanced:   ['−4 HP','−2 HP','Draw','+1 dmg','+2 dmg','+4 dmg'],
      Defensive:  ['−3 HP','−1 HP','Draw','Disarm/Deflect','+1 dmg','+2 dmg'],
      Focused:    ['−5 HP','−3 HP<br>+1 next roll*','−1 HP<br>+1 dmg','+2 dmg<br>+1 next roll*','+3 dmg<br>Expose**','+5 dmg']
    };
  
    const STATES = ['Active','Rooted','Stunned','Slowed','Possessed','Retreated','Channeling','Unconscious','Flying','Shielded','Cursed'];
  
    /* Helpers */
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
    const safeJson = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };
  
    function statusClass(effect){
      const key = (effect || 'Active').toLowerCase();
      return ({
        active:'status-active', rooted:'status-rooted', stunned:'status-stunned', slowed:'status-slowed',
        possessed:'status-possessed', retreated:'status-retreated', channeling:'status-channeling',
        unconscious:'status-unconscious', flying:'status-flying', shielded:'status-shielded', cursed:'status-cursed'
      }[key] || 'status-active');
    }
  
    function setHP(v){
      const n = clamp(Math.round(Number(v) || 0), 0, 999);
      el.hpVal.textContent = String(n);
    }
  
    function cycleState(){
      const cur = (el.state.textContent || 'Active').trim();
      const i = STATES.indexOf(cur);
      const next = STATES[(i >= 0 ? i + 1 : 1) % STATES.length];
      el.state.textContent = next;
      el.state.className = 'status-chip ' + statusClass(next);
    }
  
    function renderStance(){
      const key = el.stance.value || 'Balanced';
      const vals = STANCES[key] || [];
      el.stanceRow.innerHTML = vals.map(v => `<td>${v}</td>`).join('');
    }
  
    function buildPerkOptions(){
      const names = [''].concat(Object.keys(PERKS));
      const html = names.map(n => {
        if (!n) return `<option value="">— Select —</option>`;
        return `<option value="${escapeHtmlAttr(n)}">${escapeHtml(n)}</option>`;
      }).join('');
      el.perk1.innerHTML = html;
      el.perk2.innerHTML = html;
      el.perk3.innerHTML = html;
    }
  
    function applyPerkDesc(sel, out){
      const name = (sel.value || '').trim();
      out.textContent = PERKS[name] || '';
    }
  
    function escapeHtml(s){
      return (s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
    function escapeHtmlAttr(s){
      return (s ?? '').replace(/"/g,'&quot;');
    }
  
    /* Dice roller logic */
    function getSelectedPerks(){
      return [el.perk1.value, el.perk2.value, el.perk3.value].map(s => (s||'').trim()).filter(Boolean);
    }
  
    function renderRollToggles(){
      const perks = getSelectedPerks();
      const rollType = el.rollType.value;
  
      // Build toggles only for perks present AND that apply to this roll type
      const toggles = [];
      for (const p of perks){
        const t = PERK_TOGGLES[p];
        if (!t) continue;
        if (t.types && !t.types.includes(rollType)) continue;
        toggles.push({ key: p, ...t });
      }
  
      el.toggleList.innerHTML = '';
      if (!toggles.length){
        el.rollToggles.hidden = true;
        return;
      }
  
      toggles.forEach(t => {
        const id = `pcToggle_${t.key.replace(/\W+/g,'_')}`;
        const row = document.createElement('label');
        row.className = 'pc-toggle-item';
        row.innerHTML = `
          <input type="checkbox" id="${id}" data-bonus="${Number(t.bonus)||0}">
          <span>${escapeHtml(t.label)}</span>
        `;
        el.toggleList.appendChild(row);
      });
  
      el.rollToggles.hidden = false;
    }
  
    function computeRollMods(){
      const rollType = el.rollType.value;
  
      // Class bonus
      const cls = el.cls.value || '';
      const clsMod = (CLASS_ROLL_BONUS[cls] && Number(CLASS_ROLL_BONUS[cls][rollType])) || 0;
  
      // Perk automatic bonuses by roll type
      const perks = getSelectedPerks();
      let perkAuto = 0;
      perks.forEach(p => {
        const map = PERK_ROLL_BONUS[p];
        if (!map) return;
        const v = Number(map[rollType] || 0);
        perkAuto += v;
      });
  
      // Manual toggles
      let toggles = 0;
      el.toggleList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (cb.checked) toggles += Number(cb.dataset.bonus || 0);
      });
  
      return { clsMod, perkAuto, toggles, total: clsMod + perkAuto + toggles };
    }
  
    function rollDice(){
        const base = 1 + Math.floor(Math.random() * 20);
        const mods = computeRollMods();
      const total = base + mods.total;
  
      el.rollNum.textContent = String(total);
  
      const parts = [
        `d20: ${base}`,
        (mods.clsMod ? `Class: +${mods.clsMod}` : null),
        (mods.perkAuto ? `Perks: +${mods.perkAuto}` : null),
        (mods.toggles ? `Buffs: +${mods.toggles}` : null),
      ].filter(Boolean);
  
      el.rollBreak.textContent = `${parts.join('  •  ')}  =  ${total}`;
  
      // Save last roll into card state
      const data = loadCard();
      data.lastRoll = { r: total, base, mods, at: Date.now(), type: el.rollType.value };
      persistCard(data);
    }
  
    /* Profiles (local placeholder) */
    function loadProfiles(){
      const raw = localStorage.getItem(LS_PROFILES_KEY);
      const arr = safeJson(raw, []);
      return Array.isArray(arr) ? arr : [];
    }
  
    function saveProfiles(arr){
      localStorage.setItem(LS_PROFILES_KEY, JSON.stringify(arr || []));
    }
  
    function renderProfileSelect(){
      const profiles = loadProfiles();
      const options = [`<option value="">— Select —</option>`]
        .concat(profiles.map(p => `<option value="${escapeHtmlAttr(p.id)}">${escapeHtml(p.name || 'Unnamed')}</option>`));
      el.profileSelect.innerHTML = options.join('');
    }
  
    function setPortrait(url){
      const u = (url || '').trim();
      if (!u){
        el.portraitImg.style.display = 'none';
        el.portraitImg.src = '';
        el.portraitImg.alt = '';
        el.portraitPh.style.display = 'block';
        return;
      }
      el.portraitImg.src = u;
      el.portraitImg.alt = 'Character portrait';
      el.portraitImg.style.display = 'block';
      el.portraitPh.style.display = 'none';
    }
  
    function newId(){
      return Math.random().toString(36).slice(2,10);
    }
  
    function applyProfile(p){
      if (!p) return;
      el.name.value = p.name || '';
      el.cls.value = p.cls || '';
      el.perk1.value = p.perk1 || '';
      el.perk2.value = p.perk2 || '';
      el.perk3.value = p.perk3 || '';
      el.stance.value = p.stance || 'Balanced';
      setHP(p.hp ?? 15);
  
      const st = p.state || 'Active';
      el.state.textContent = st;
      el.state.className = 'status-chip ' + statusClass(st);
  
      setPortrait(p.portraitUrl || '');
      el.clsNote.textContent = CLASS_NOTES[el.cls.value] || '';
      applyPerkDesc(el.perk1, el.perk1Desc);
      applyPerkDesc(el.perk2, el.perk2Desc);
      applyPerkDesc(el.perk3, el.perk3Desc);
      renderStance();
      renderRollToggles();
  
      // Save into card state so page reload keeps it
      saveCard('Imported profile.');
    }
  
    /* Card persistence */
    function loadCard(){
      const raw = localStorage.getItem(LS_CARD_KEY);
      const d = safeJson(raw, {});
      return (d && typeof d === 'object') ? d : {};
    }
  
    function persistCard(d){
      localStorage.setItem(LS_CARD_KEY, JSON.stringify(d || {}));
    }
  
    function snapshotCard(){
      return {
        name: el.name.value || '',
        cls: el.cls.value || '',
        perk1: el.perk1.value || '',
        perk2: el.perk2.value || '',
        perk3: el.perk3.value || '',
        stance: el.stance.value || 'Balanced',
        hp: Number(el.hpVal.textContent) || 15,
        state: (el.state.textContent || 'Active').trim(),
        rollType: el.rollType.value || 'combat',
        portraitUrl: el.portraitImg.style.display === 'block' ? (el.portraitImg.src || '') : '',
      };
    }
  
    function saveCard(msg){
      const data = loadCard();
      const snap = snapshotCard();
      Object.assign(data, snap);
      persistCard(data);
  
      el.savedMsg.textContent = msg || 'Saved.';
      setTimeout(() => (el.savedMsg.textContent = ''), 1200);
    }
  
    function resetCard(){
      if (!confirm('Reset this Player Card? This clears your saved local state (not your profiles).')) return;
      localStorage.removeItem(LS_CARD_KEY);
  
      // reset UI
      el.name.value = '';
      el.cls.value = '';
      el.perk1.value = '';
      el.perk2.value = '';
      el.perk3.value = '';
      el.stance.value = 'Balanced';
      el.rollType.value = 'combat';
      setHP(15);
      el.state.textContent = 'Active';
      el.state.className = 'status-chip ' + statusClass('Active');
      el.clsNote.textContent = '';
      el.rollNum.textContent = '—';
      el.rollBreak.textContent = 'Click the die to roll.';
      setPortrait('');
      applyPerkDesc(el.perk1, el.perk1Desc);
      applyPerkDesc(el.perk2, el.perk2Desc);
      applyPerkDesc(el.perk3, el.perk3Desc);
      renderStance();
      renderRollToggles();
    }
  
    /* Enemy feed placeholder */
    function renderEnemiesFromLocal(){
      const raw = localStorage.getItem(LS_ENEMIES_KEY);
      const data = safeJson(raw, null);
  
      // Expected shape (later DM Assist can publish this):
      // { slots: { "1": {name,hp,maxHP,state,abilities[]}, ... "6": {...}, "boss": {...} } }
      const slots = (data && data.slots) ? data.slots : {};
  
      document.querySelectorAll('.pc-enemy-card').forEach(card => {
        const key = card.getAttribute('data-slot');
        const s = slots[key] || null;
  
        const nameEl = card.querySelector('.pc-enemy-name');
        const hpEl   = card.querySelector('.pc-enemy-hp');
        const stEl   = card.querySelector('.pc-enemy-state');
        const ul     = card.querySelector('.pc-enemy-abilities');
  
        nameEl.textContent = s?.name ? String(s.name) : '—';
        hpEl.textContent   = (s && (s.hp != null || s.maxHP != null))
          ? `${Number(s.hp ?? 0)}/${Number(s.maxHP ?? 0)}`
          : '—';
        stEl.textContent   = s?.state ? String(s.state) : '—';
  
        ul.innerHTML = '';
        const abilities = Array.isArray(s?.abilities) ? s.abilities : [];
        abilities.slice(0, 4).forEach(a => {
          const li = document.createElement('li');
          li.textContent = String(a);
          ul.appendChild(li);
        });
      });
    }
  
    /* Boot */
    function boot(){
      buildPerkOptions();
  
      // First render
      renderProfileSelect();
      renderStance();
      renderEnemiesFromLocal();
  
      // Load saved card state
      const d = loadCard();
  
      el.name.value = d.name || '';
      el.cls.value = d.cls || '';
      el.perk1.value = d.perk1 || '';
      el.perk2.value = d.perk2 || '';
      el.perk3.value = d.perk3 || '';
      el.stance.value = d.stance || 'Balanced';
      el.rollType.value = d.rollType || 'combat';
      setHP(d.hp ?? 15);
  
      const st = d.state || 'Active';
      el.state.textContent = st;
      el.state.className = 'status-chip ' + statusClass(st);
  
      el.clsNote.textContent = CLASS_NOTES[el.cls.value] || '';
      applyPerkDesc(el.perk1, el.perk1Desc);
      applyPerkDesc(el.perk2, el.perk2Desc);
      applyPerkDesc(el.perk3, el.perk3Desc);
      renderStance();
  
      setPortrait(d.portraitUrl || '');
  
      // Restore last roll if present
      if (d.lastRoll && typeof d.lastRoll === 'object'){
        el.rollNum.textContent = String(d.lastRoll.r ?? '—');
        el.rollBreak.textContent = `Last: ${d.lastRoll.type || ''} • ${new Date(d.lastRoll.at || Date.now()).toLocaleTimeString()}`;
      }
  
      renderRollToggles();
  
      /* Events */
      el.cls.addEventListener('change', () => {
        el.clsNote.textContent = CLASS_NOTES[el.cls.value] || '';
        renderRollToggles();
      });
  
      [el.perk1, el.perk2, el.perk3].forEach((sel, idx) => {
        sel.addEventListener('change', () => {
          if (idx === 0) applyPerkDesc(el.perk1, el.perk1Desc);
          if (idx === 1) applyPerkDesc(el.perk2, el.perk2Desc);
          if (idx === 2) applyPerkDesc(el.perk3, el.perk3Desc);
          renderRollToggles();
        });
      });
  
      el.stance.addEventListener('change', () => {
        renderStance();
      });
  
      el.rollType.addEventListener('change', () => {
        renderRollToggles();
      });
  
      el.rollBtn.addEventListener('click', rollDice);
      el.toggleList.addEventListener('change', () => {
        // no-op; included to ensure computeRollMods sees checkboxes; user triggers roll anyway
      });
  
      el.hpMinus.addEventListener('click', () => setHP(Number(el.hpVal.textContent) - 1));
      el.hpPlus.addEventListener('click', () => setHP(Number(el.hpVal.textContent) + 1));
      el.state.addEventListener('click', cycleState);
  
      el.saveCard.addEventListener('click', () => saveCard('Saved.'));
      el.resetCard.addEventListener('click', resetCard);
  
      // Profiles
      el.profileSelect.addEventListener('change', () => {
        const id = el.profileSelect.value || '';
        if (!id) return;
        const profiles = loadProfiles();
        const p = profiles.find(x => x.id === id);
        applyProfile(p);
        el.profileMsg.textContent = p ? `Imported: ${p.name || 'Profile'}` : '';
        setTimeout(()=> (el.profileMsg.textContent=''), 1400);
      });
  
      el.saveProfile.addEventListener('click', () => {
        const nm = (el.name.value || '').trim();
        const label = nm || prompt('Profile name:', 'New Profile');
        if (!label) return;
  
        const profiles = loadProfiles();
        const snap = snapshotCard();
        const id = newId();
  
        profiles.push({
          id,
          name: label,
          ...snap,
          portraitUrl: snap.portraitUrl || '' // optional
        });
  
        saveProfiles(profiles);
        renderProfileSelect();
        el.profileSelect.value = id;
  
        el.profileMsg.textContent = 'Saved profile.';
        setTimeout(()=> (el.profileMsg.textContent=''), 1400);
      });
  
      el.deleteProfile.addEventListener('click', () => {
        const id = el.profileSelect.value || '';
        if (!id) return;
        if (!confirm('Delete this saved profile?')) return;
        const profiles = loadProfiles().filter(p => p.id !== id);
        saveProfiles(profiles);
        renderProfileSelect();
        el.profileMsg.textContent = 'Deleted profile.';
        setTimeout(()=> (el.profileMsg.textContent=''), 1400);
      });
  
      // If enemies are updated by something else (later: DM Assist), refresh on focus
      window.addEventListener('focus', renderEnemiesFromLocal);
    }
  
    boot();
  })();
  