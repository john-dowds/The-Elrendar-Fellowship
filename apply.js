const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxmJ5kansRRc6S8Hq1eMjXtoxSgXN3QzIsf9iDYaTHAaz9GeN28vrYblLJf59cmOZeyNw/exec';

const form = document.getElementById('appForm');
const statusEl = document.getElementById('status');

const toggle = document.getElementById('appTypeToggle');   
const toggleLabel = document.getElementById('appTypeLabel');
const mainWrap = document.getElementById('mainNameWrap');
const mainInput = document.getElementById('mainNameInput');

function isMainSelected(){
  return toggle ? !!toggle.checked : true;
}

function syncAltFieldUI(){
  const mainSelected = isMainSelected();

  if (toggleLabel) toggleLabel.textContent = mainSelected ? 'Main' : 'Alt';

  if (!mainWrap || !mainInput) return;

  if (mainSelected) {
    mainWrap.classList.add('is-hidden');
    mainInput.value = '';
    mainInput.required = false;
  } else {
    mainWrap.classList.remove('is-hidden');
    mainInput.required = true;
  }
}

toggle?.addEventListener('change', syncAltFieldUI);
syncAltFieldUI();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Submitting…';

  const fd = new FormData(form);

  const mainSelected = isMainSelected();
  const mainName = fd.get('main')?.trim();

  const data = {
    name:         fd.get('name')?.trim(),
    server:       fd.get('server')?.trim(),
    discord:      fd.get('discord')?.trim(),
    character:    fd.get('character')?.trim(),
    title:        fd.get('title')?.trim(),
    faction:      fd.get('faction')?.trim(),
    availability: fd.get('availability')?.trim(),
    history:      fd.get('history')?.trim(),

    main:         mainSelected ? '' : (mainName || ''),

    siteRef:      location.href
  };

  if(!data.name || !data.character || !data.history){
    statusEl.textContent = 'Please complete required fields.';
    return;
  }

  if(!mainSelected && !data.main){
    statusEl.textContent = 'Please enter the name of your current main character in the guild.';
    return;
  }

  try {
    const res = await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json().catch(()=>({}));
    if (json.ok) {
      statusEl.textContent = 'Submitted — thank you!';
      form.reset();
      syncAltFieldUI();
      return;
    }
    throw new Error(json.error || 'Submit failed');

  } catch (err) {
    try {
      await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      });
      statusEl.textContent = 'Submitted. Thanks for applying; we will get back to you soon. In the meantime, you can join our discord at https://discord.gg/DpjkpE5KPD';
      form.reset();
      syncAltFieldUI();
    } catch (e2) {
      statusEl.textContent = 'Error. Could not submit.';
      console.error('Submit error:', err, e2);
    }
  }
});
