const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxPU0hudGsSZlT2VbbCUJtqei9PCPCEQ2G4M-IkCW1aiing_lssBDzZWD766EJVqI3eJw/exec';

const form = document.getElementById('appForm');
const statusEl = document.getElementById('status');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Submitting…';

  const fd = new FormData(form);
  const data = {
    name:        fd.get('name')?.trim(),
    server:       fd.get('server')?.trim(),
    discord:     fd.get('discord')?.trim(),
    character:   fd.get('character')?.trim(),
    title:       fd.get('title')?.trim(),
    faction:     fd.get('faction')?.trim(),
    availability:fd.get('availability')?.trim(),
    history:     fd.get('history')?.trim(),
    siteRef:     location.href
  };

  // Basic required fields
  if(!data.name || !data.character || !data.history){
    statusEl.textContent = 'Please complete required fields.';
    return;
  }

  try {
    // Primary attempt with CORS + JSON (best UX)
    const res = await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    // Some GAS deployments don’t return CORS headers consistently.
    // If that happens, the catch below will run.
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json().catch(()=>({}));
    if (json.ok) {
      statusEl.textContent = 'Submitted — thank you!';
      form.reset();
      return;
    }
    throw new Error(json.error || 'Submit failed');

  } catch (err) {
    // Fallback: force the POST with no-cors (we can’t read the response)
    try {
      await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      });
      statusEl.textContent = 'Submitted. Thanks for applying; we will get back to you soon.';
      form.reset();
    } catch (e2) {
      statusEl.textContent = 'Error. Could not submit.';
      console.error('Submit error:', err, e2);
    }
  }
});
