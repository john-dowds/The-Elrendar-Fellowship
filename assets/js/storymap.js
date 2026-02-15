// assets/js/storymap.js V.6


const $ = (id) => document.getElementById(id);

const ui = {
  add: $("smAdd"),
  layout: $("smLayout"),
  center: $("smCenter"),
  del: $("smDelete"),
  fresh: $("smFresh"),
  search: $("smSearch"),

  // Save & Load dropdown
  saveLoadBtn: $("smSaveLoad"),
  saveLoadMenu: $("smSaveLoadMenu"),
  saveAsNew: $("smSaveAsNew"),
  saveLocal: $("smSaveLocal"),
  loadLocal: $("smLoadLocal"),
  loadList: $("smLoadList"),
  uploadJson: $("smUploadJson"),
  downloadJson: $("smDownloadJson"),
  file: $("smFile"),

  status: $("smStatus"),

  editor: $("smEditor"),
  meta: $("smMeta"),
  title: $("smTitle"),
  text: $("smText"),
  autoChip: $("smAutoChip"),
  autoBtn: $("smAuto"),
  close: $("smClose"),

  // formatting toolbar
  fmtBold: $("fmtBold"),
  fmtItalic: $("fmtItalic"),
  fmtUnderline: $("fmtUnderline"),
  fmtBullets: $("fmtBullets"),
  fmtAlignBtn: $("fmtAlignBtn"),
  fmtAlignMenu: $("fmtAlignMenu"),
  fmtFont: $("fmtFont"),
  fmtColor: $("fmtColor"),
  colorMode: $("smColorMode"),
  colorPick: $("smColorPick"),
};

let cy;
let activeId = null;
let autosaveTimer = null;

// Multi-save local storage
const LS_INDEX_KEY = "elf/storymap/index/v1";
const LS_STORY_PREFIX = "elf/storymap/story/v1/";
let currentStoryId = null;

const now = () => Date.now();

function setStatus(t) {
  if (ui.status) ui.status.textContent = t;
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function uid(prefix = "n") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTitle(s) {
  return (s || "").trim();
}

function safeFileName(title) {
  return (title || "storymap")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "storymap";
}

function suggestSaveName() {
  // Prefer current story title (active node title), fallback to "Story"
  try {
    if (activeId && cy) {
      const n = cy.getElementById(activeId);
      const t = (n?.data?.("title") || "").trim();
      if (t) return t;
    }
  } catch {}
  return "Story";
}

/* ─────────────────────────────
  Popover helpers
───────────────────────────── */
const pop = {
  align: { open: false },
  save: { open: false },
  loadList: { open: false },
};

function ensureBodyPopover(el) {
  if (!el) return;
  if (el.dataset.popoverMounted === "true") return;

  // Move to body so it can't be clipped by ancestor overflow.
  document.body.appendChild(el);
  el.dataset.popoverMounted = "true";

  // Force fixed positioning at runtime
  el.style.position = "fixed";
  el.style.zIndex = "20000";
}

function placePopoverUnderButton(menuEl, btnEl, { alignRight = false, offset = 8 } = {}) {
  if (!menuEl || !btnEl) return;
  const r = btnEl.getBoundingClientRect();

  // Make visible temporarily to measure width/height
  menuEl.style.visibility = "hidden";
  menuEl.dataset.open = "true";

  // After open, compute placement
  const mw = menuEl.offsetWidth || 260;

  let top = r.bottom + offset;
  let left;

  if (alignRight) {
    left = r.right - mw;
  } else {
    left = r.left;
  }

  // Keep on screen
  const pad = 10;
  left = Math.max(pad, Math.min(left, window.innerWidth - mw - pad));
  if (top + 40 > window.innerHeight) top = Math.max(pad, r.top - offset - 260);

  menuEl.style.top = `${top}px`;
  menuEl.style.left = `${left}px`;
  menuEl.style.visibility = "visible";
}

function closeAllPopovers() {
  closeAlignMenu();
  closeSaveLoadMenu(true);
}

/* ─────────────────────────────
  Cytoscape setup + styling
───────────────────────────── */
function initCy() {
  cy = cytoscape({
    container: document.getElementById("cy"),
    elements: [],
    layout: { name: "preset" },
    wheelSensitivity: 0.18,
    minZoom: 0.2,
    maxZoom: 2.2,
    boxSelectionEnabled: false,
    autounselectify: false,
    style: [
      {
        selector: "node",
        style: {
          "shape": "round-rectangle",
          "width": 190,
          "height": 62,
          "background-color": "rgba(0,0,0,0.45)",
          "border-width": 2,
          "border-color": "rgba(252,229,205,0.35)",
          "label": "data(title)",
          "text-wrap": "wrap",
          "text-max-width": 160,
          "text-valign": "center",
          "text-halign": "center",
          "font-size": 13,
          "color": "rgba(252,229,205,0.98)",
          "padding": 10,
          "overlay-opacity": 0,
        },
      },
      {
        selector: "node[fill]",
        style: { "background-color": "data(fill)" }
      },
      {
        selector: "node[border]",
        style: { "border-color": "data(border)" }
      },
      
      {
        selector: "node.newPulse",
        style: { "border-color": "rgba(228,190,89,0.75)", "border-width": 3 },
      },
      {
        selector: "node.active",
        style: {
          "width": 230,
          "height": 78,
          "border-width": 3,
        },
      },
      {
        selector: "edge",
        style: {
          "curve-style": "bezier",
          "width": 2,
          "line-color": "rgba(228,190,89,0.35)",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "rgba(228,190,89,0.45)",
          "arrow-scale": 1.0,
          "label": "data(label)",
          "font-size": 10,
          "color": "rgba(252,229,205,0.82)",
          "text-background-color": "rgba(0,0,0,0.50)",
          "text-background-opacity": 1,
          "text-background-padding": 3,
          "text-rotation": "autorotate",
        },
      },
      {
        selector: "edge.auto",
        style: {
          "line-style": "solid",
          "line-color": "rgba(95,220,255,0.30)",
          "target-arrow-color": "rgba(95,220,255,0.38)",
        },
      },
      {
        selector: ":selected",
        style: {
          "border-color": "rgba(228,190,89,0.95)",
          "border-width": 3,
          "line-color": "rgba(228,190,89,0.55)",
          "target-arrow-color": "rgba(228,190,89,0.65)",
        },
      },
    ],
  });

  cy.on("tap", "node", (evt) => {
    const n = evt.target;
    setActiveNode(n.id(), { openEditor: true, pulse: false });
  });

  // Double-tap background to create node
  let lastTap = 0;
  cy.on("tap", (evt) => {
    if (evt.target !== cy) return;
    const t = now();
    if (t - lastTap < 280) {
      const pos = evt.position;
      const n = addNodeAt(pos.x, pos.y, "New Passage", "");
      setActiveNode(n.id(), { openEditor: true, pulse: true });
      scheduleAutosave("Created.");
    }
    lastTap = t;
  });

  cy.on("dragfree", "node", () => scheduleAutosave("Position saved."));
}

/* ─────────────────────────────
  Nodes / edges + auto-links
───────────────────────────── */
function addNodeAt(x, y, title = "New Passage", html = "") {
  const id = uid("node");
  cy.add({ group: "nodes", data: { id, title, html, created: now() }, position: { x, y } });
  const n = cy.getElementById(id);
  n.addClass("newPulse");
  setTimeout(() => n.removeClass("newPulse"), 700);
  return n;
}

function findNodeById(id) {
  if (!id) return null;
  const n = cy.getElementById(String(id));
  return n && n.length ? n : null;
}

function findNodeByTitle(title) {
  const t = normalizeTitle(title).toLowerCase();
  if (!t) return null;
  for (const n of cy.nodes()) {
    const lt = (n.data("title") || "").trim().toLowerCase();
    if (lt === t) return n;
  }
  return null;
}

function findNodeByRef(target) {
  const raw = String(target || "").trim();
  if (!raw) return null;
  return findNodeById(raw) || findNodeByTitle(raw);
}

function ensureNodeByRef(target, near = null) {
  const existing = findNodeByRef(target);
  if (existing) return existing;

  const pos = near || { x: 200 + Math.random() * 120, y: 200 + Math.random() * 120 };
  const title = normalizeTitle(target) || "Untitled";
  return addNodeAt(pos.x, pos.y, title, "");
}

function extractBracketLinks(plainText) {
  const out = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(plainText || ""))) {
    const raw = String(m[1] || "").trim();
    if (!raw) continue;

    let label = "";
    let target = raw;
    const idx = raw.indexOf("->");
    if (idx !== -1) {
      label = raw.slice(0, idx).trim();
      target = raw.slice(idx + 2).trim();
    }
    if (target) out.push({ label, target });
  }
  return out;
}

function upsertEdge(fromId, toId, label = "", opts = {}) {
  if (!fromId || !toId || fromId === toId) return null;

  const autoFrom = opts.autoFrom || "";
  const isAuto = Boolean(opts.isAuto);

  const existing = cy.edges().filter((e) => (
    e.data("source") === fromId &&
    e.data("target") === toId &&
    String(e.data("label") || "") === String(label || "") &&
    String(e.data("autoFrom") || "") === String(autoFrom || "")
  ));

  if (existing.length) return existing[0];

  const e = cy.add({
    group: "edges",
    data: { id: uid("edge"), source: fromId, target: toId, label: label || "", autoFrom, created: now() },
  });

  if (isAuto) e.addClass("auto");
  return e;
}

function getEditorPlainText() {
  return (ui.text?.innerText || "").replace(/\u00A0/g, " ");
}

function syncAutoEdgesForNode(nodeId) {
  const n = cy.getElementById(nodeId);
  if (!n || !n.length) return;
  if (!ui.autoBtn || ui.autoBtn.dataset.on !== "true") return;

  const plain = getEditorPlainText();
  const links = extractBracketLinks(plain);

  const resolved = links.map((lk) => {
    const hit = findNodeByRef(lk.target);
    return {
      label: lk.label || "",
      targetRaw: lk.target,
      targetId: hit ? hit.id() : null,
      targetTitleKey: normalizeTitle(lk.target).toLowerCase(),
    };
  });

  const want = new Set(
    resolved.map((r) => `${r.targetId || `title:${r.targetTitleKey}`}|${(r.label || "").toLowerCase()}`)
  );

  const oldAuto = cy.edges().filter((e) => e.data("source") === nodeId && e.data("autoFrom") === nodeId);
  oldAuto.forEach((e) => {
    const to = String(e.data("target") || "");
    const lbl = String(e.data("label") || "").toLowerCase();
    const targetNode = cy.getElementById(to);
    const titleKey = (targetNode?.data("title") || "").trim().toLowerCase();
    const key = `${to || `title:${titleKey}`}|${lbl}`;
    if (!want.has(key)) e.remove();
  });

  const base = n.position();
  resolved.forEach((r, i) => {
    let targetNode = r.targetId ? cy.getElementById(r.targetId) : null;
    if (!targetNode || !targetNode.length) {
      targetNode = ensureNodeByRef(r.targetRaw, { x: base.x + 320, y: base.y + i * 110 });
    }
    upsertEdge(nodeId, targetNode.id(), r.label, { isAuto: true, autoFrom: nodeId });
  });
}

/* ─────────────────────────────
  Active node handling + editor
───────────────────────────── */
function setActiveNode(id, { openEditor = true, pulse = false } = {}) {
  activeId = id;

  cy.nodes().removeClass("active");
  const n = cy.getElementById(id);

  if (!n || !n.length) {
    closeEditor();
    return;
  }

  n.addClass("active");
  n.select();

  if (pulse) {
    n.addClass("newPulse");
    setTimeout(() => n.removeClass("newPulse"), 700);
  }

  if (ui.meta) ui.meta.textContent = `ID: ${id}`;
  if (ui.title) ui.title.value = n.data("title") || "";

  const html = n.data("html") || "";
  const legacyText = n.data("text") || "";
  if (ui.text) ui.text.innerHTML = html || (legacyText ? escapeToHtml(legacyText) : "");

  if (openEditor) openEditorAtNode();

  if (ui.colorMode && ui.colorPick) {
    const fill = n.data("fill") || "";
    const border = n.data("border") || "";
  
    // Prefer showing whichever is set (fill first), otherwise none
    if (fill) {
      ui.colorMode.value = "fill";
      ui.colorPick.value = fill;
    } else if (border) {
      ui.colorMode.value = "border";
      ui.colorPick.value = border;
    } else {
      ui.colorMode.value = "fill";
      ui.colorPick.value = "";
    }
  }
  
}

function escapeToHtml(t) {
  return String(t)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function openEditorAtNode() {
  if (!ui.editor) return;
  ui.editor.dataset.open = "true";
  setTimeout(() => ui.text?.focus(), 0);
}

function closeEditor() {
  if (!ui.editor) return;
  ui.editor.dataset.open = "false";
}

/* ─────────────────────────────
  Serialization
───────────────────────────── */
function serializeProject() {
  const nodes = cy.nodes().map((n) => ({
    id: n.id(),
    title: n.data("title") || "",
    html: n.data("html") || "",
    fill: n.data("fill") || "",
    border: n.data("border") || "",
    x: n.position("x"),
    y: n.position("y"),
    created: n.data("created") || 0,
  }));
  

  const edges = cy.edges().map((e) => ({
    id: e.id(),
    from: e.data("source"),
    to: e.data("target"),
    label: e.data("label") || "",
    autoFrom: e.data("autoFrom") || "",
    created: e.data("created") || 0,
  }));

  return { meta: { version: 3, updated: now(), storyId: currentStoryId || null }, nodes, edges };
}

function loadProject(data, opts = {}) {
  const { keepStoryId = false } = opts;

  cy.elements().remove();

  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const edges = Array.isArray(data?.edges) ? data.edges : [];

  nodes.forEach((n) => {
    cy.add({
      group: "nodes",
      data: {
        id: n.id || uid("node"),
        title: n.title || "Untitled",
        html: n.html || "",
        text: n.text || "",
        fill: n.fill || "",
        border: n.border || "",
        created: n.created || now(),
      },
      position: { x: Number(n.x ?? 220), y: Number(n.y ?? 160) },
    });
  });

  edges.forEach((e) => {
    if (!e.from || !e.to) return;
    const edge = cy.add({
      group: "edges",
      data: {
        id: e.id || uid("edge"),
        source: e.from,
        target: e.to,
        label: e.label || "",
        autoFrom: e.autoFrom || "",
        created: e.created || now(),
      },
    });
    if (e.autoFrom) edge.addClass("auto");
  });

  if (!keepStoryId) currentStoryId = data?.meta?.storyId || null;

  if (cy.nodes().length === 0) {
    startFresh();
  } else {
    cy.fit(cy.elements(), 40);
    setActiveNode(cy.nodes()[0].id(), { openEditor: true, pulse: false });
  }

  scheduleAutosave("Loaded.");
}

/* ─────────────────────────────
  Local multi-save storage
───────────────────────────── */
function readIndex() {
  const raw = localStorage.getItem(LS_INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(list) {
  localStorage.setItem(LS_INDEX_KEY, JSON.stringify(list));
}

function storyKey(id) {
  return `${LS_STORY_PREFIX}${id}`;
}

function getProjectTitle(payload) {
  const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  if (activeId) {
    const n = nodes.find((x) => x?.id === activeId);
    if (n?.title) return String(n.title);
  }
  if (nodes[0]?.title) return String(nodes[0].title);
  return "storymap";
}

function refreshLoadList() {
  if (!ui.loadList) return;

  const index = readIndex();
  ui.loadList.innerHTML = "";

  if (!index.length) {
    const empty = document.createElement("div");
    empty.className = "sm-ddnote";
    empty.textContent = "No local saves yet.";
    ui.loadList.appendChild(empty);
    return;
  }

  index.forEach((item) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.alignItems = "center";
    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "sm-dditem";
    loadBtn.style.flex = "1 1 auto";

    const title = item?.title ? String(item.title) : "(Untitled)";
    const stamp = item?.updated ? new Date(item.updated).toLocaleString() : "";
    loadBtn.textContent = stamp ? `${title} — ${stamp}` : title;

    loadBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const raw = localStorage.getItem(storyKey(item.id));
      if (!raw) {
        setStatus("Load failed: missing local save.");
        return;
      }

      try {
        const data = JSON.parse(raw);
        currentStoryId = item.id;
        loadProject(data, { keepStoryId: true });
        setStatus("Loaded local save.");
        closeSaveLoadMenu(true);
      } catch {
        setStatus("Load failed: invalid local save.");
      }
    });

    // DELETE button 
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "sm-dditem";
    delBtn.style.flex = "0 0 auto";
    delBtn.style.width = "92px";
    delBtn.style.textAlign = "center";
    delBtn.textContent = "Delete";
    delBtn.style.borderColor = "rgba(255,140,140,0.25)";
    delBtn.style.background = "rgba(120,25,25,0.55)";

    delBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const confirmText = `Delete local save "${title}"?\n\nThis cannot be undone.`;
      if (!window.confirm(confirmText)) return;

      deleteLocalSave(item.id);
      setStatus(`Deleted: ${title}`);
    });

    row.appendChild(loadBtn);
    row.appendChild(delBtn);
    ui.loadList.appendChild(row);
  });
}


function saveStoryToLocal(storyId, payload) {
  localStorage.setItem(storyKey(storyId), JSON.stringify(payload));

  // Prefer explicit save name if present, otherwise derive from content
  const explicit = (payload?.meta?.saveName || "").trim();
  const title = explicit || getProjectTitle(payload);

  const updated = payload?.meta?.updated || now();

  const index = readIndex();
  const existingIdx = index.findIndex((x) => x && x.id === storyId);
  const item = { id: storyId, title, updated };

  if (existingIdx >= 0) index[existingIdx] = item;
  else index.unshift(item);

  index.sort((a, b) => Number(b.updated || 0) - Number(a.updated || 0));
  writeIndex(index);

  refreshLoadList();
}

function deleteLocalSave(storyId) {
  localStorage.removeItem(storyKey(storyId));
  const index = readIndex().filter((x) => x?.id !== storyId);
  writeIndex(index);
  // If just deleted the currently loaded story, reset the canvas
  if (currentStoryId === storyId) {
    currentStoryId = null;
    startFresh();
  }

  refreshLoadList();
}

/* ─────────────────────────────
  Save / load / upload / download
───────────────────────────── */
function saveAsNew() {
  const payload = serializeProject();

  const suggested = suggestSaveName();
  const name = window.prompt("Name this save:", suggested);

  // If user cancels, do nothing
  if (name === null) {
    setStatus("Save cancelled.");
    return;
  }

  const saveName = String(name).trim() || suggested;

  const id = uid("story");
  currentStoryId = id;

  payload.meta.storyId = id;
  payload.meta.saveName = saveName;
  payload.meta.updated = now();

  saveStoryToLocal(id, payload);
  setStatus(`Saved as new: ${saveName}`);
}


function saveLocal() {
  const payload = serializeProject();
  if (!currentStoryId) {
    const id = uid("story");
    currentStoryId = id;
    payload.meta.storyId = id;
  }
  payload.meta.updated = now();
  saveStoryToLocal(currentStoryId, payload);
  setStatus("Saved locally.");
}

function downloadJSON() {
  const payload = serializeProject();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  const t = activeId ? cy.getElementById(activeId).data("title") : (currentStoryId ? "story" : "storymap");
  a.download = `${safeFileName(t)}.json`;

  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus("Downloaded JSON.");
}

function importJSONFile(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const parsed = JSON.parse(String(r.result || ""));
      currentStoryId = parsed?.meta?.storyId || null;
      loadProject(parsed, { keepStoryId: true });
      setStatus("Uploaded JSON.");
    } catch {
      setStatus("Upload failed: invalid JSON.");
    }
  };
  r.readAsText(file);
}

/* ─────────────────────────────
  Autosave + editor sync
───────────────────────────── */
function scheduleAutosave(note = "") {
  if (note) setStatus(note);
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    if (currentStoryId) saveLocal();
  }, 350);
}

const onEditorInput = debounce(() => {
  if (!activeId) return;
  const n = cy.getElementById(activeId);
  if (!n || !n.length) return;

  const newTitle = normalizeTitle(ui.title?.value) || "Untitled";
  n.data("title", newTitle);
  n.data("html", ui.text?.innerHTML || "");

  syncAutoEdgesForNode(activeId);
  scheduleAutosave("Updated.");
}, 180);

function applyNodeColor(mode, value) {
  if (!activeId) return;
  const n = cy.getElementById(activeId);
  if (!n || !n.length) return;

  if (mode === "fill") {
    if (!value) n.removeData("fill");
    else n.data("fill", value);
  } else {
    if (!value) n.removeData("border");
    else n.data("border", value);
  }

  scheduleAutosave("Color updated.");
}

/* ─────────────────────────────
  Layout + search + delete + fresh
───────────────────────────── */
function runAutoLayout() {
  cy.layout({
    name: "breadthfirst",
    directed: true,
    padding: 60,
    spacingFactor: 1.15,
    animate: true,
    animationDuration: 280,
  }).run();
  scheduleAutosave("Auto-layout complete.");
}

function centerView() {
  cy.fit(cy.elements(), 40);
  setStatus("Centered.");
}

function searchAndFocus(q) {
  const needle = (q || "").trim().toLowerCase();
  if (!needle) return;

  const nodes = cy.nodes().filter((n) => (n.data("title") || "").toLowerCase().includes(needle));
  if (!nodes.length) { setStatus("No matches."); return; }

  const n = nodes[0];
  cy.animate({ center: { eles: n }, duration: 220 });
  setActiveNode(n.id(), { openEditor: true, pulse: false });
  setStatus(`Found: ${n.data("title")}`);
}

function deleteActive() {
  if (!activeId) return;
  const n = cy.getElementById(activeId);
  if (!n || !n.length) return;

  n.remove();
  activeId = null;
  closeEditor();
  scheduleAutosave("Deleted.");

  const any = cy.nodes()[0];
  if (any) setActiveNode(any.id(), { openEditor: true, pulse: false });
}

function startFresh() {
  cy.elements().remove();
  activeId = null;
  currentStoryId = null;

  const start = addNodeAt(240, 160, "Start", "Your story begins here.<br><br>Try: [[Next Scene]]");
  setActiveNode(start.id(), { openEditor: true, pulse: true });
  syncAutoEdgesForNode(start.id());
  cy.fit(cy.elements(), 40);

  setStatus("Fresh canvas. (Local saves preserved.)");
}

/* ─────────────────────────────
  Rich formatting actions
───────────────────────────── */
function fmt(cmd, val = null) {
  ui.text?.focus();
  try {
    document.execCommand(cmd, false, val);
  } catch {
  }
  onEditorInput();
}

// Reliable alignment fallback
function applyAlignFallback(align) {
  if (!ui.text) return;
  ui.text.style.textAlign = align;
  onEditorInput();
}

function applyAlignment(which) {
  ui.text?.focus();

  // Try execCommand first
  let cmd = null;
  if (which === "left") cmd = "justifyLeft";
  if (which === "center") cmd = "justifyCenter";
  if (which === "right") cmd = "justifyRight";
  if (which === "justify") cmd = "justifyFull";

  let ok = false;
  try {
    ok = document.execCommand(cmd, false, null);
  } catch {
    ok = false;
  }

  // If browser refuses, do a predictable fallback
  if (!ok) {
    const cssAlign = (which === "justify") ? "justify" : which;
    applyAlignFallback(cssAlign);
  } else {
    onEditorInput();
  }
}

/* ─────────────────────────────
  Menu open/close with fixed popovers
───────────────────────────── */
function closeAlignMenu() {
  pop.align.open = false;
  if (ui.fmtAlignMenu) ui.fmtAlignMenu.dataset.open = "false";
  ui.fmtAlignBtn?.setAttribute("aria-expanded", "false");
}

function toggleAlignMenu() {
  ensureBodyPopover(ui.fmtAlignMenu);

  pop.align.open = !pop.align.open;
  ui.fmtAlignMenu.dataset.open = pop.align.open ? "true" : "false";
  ui.fmtAlignBtn?.setAttribute("aria-expanded", pop.align.open ? "true" : "false");

  if (pop.align.open) {
    placePopoverUnderButton(ui.fmtAlignMenu, ui.fmtAlignBtn, { alignRight: false, offset: 8 });
  }
}

function closeSaveLoadMenu(force = false) {
  pop.save.open = false;
  pop.loadList.open = false;

  if (ui.saveLoadMenu) ui.saveLoadMenu.dataset.open = "false";
  if (ui.loadList) ui.loadList.dataset.open = "false";

  ui.saveLoadBtn?.setAttribute("aria-expanded", "false");
  ui.loadLocal?.setAttribute("aria-expanded", "false");

  if (force) {
    // nothing else
  }
}

function toggleSaveLoadMenu() {
  ensureBodyPopover(ui.saveLoadMenu);

  pop.save.open = !pop.save.open;
  ui.saveLoadMenu.dataset.open = pop.save.open ? "true" : "false";
  ui.saveLoadBtn?.setAttribute("aria-expanded", pop.save.open ? "true" : "false");

  if (pop.save.open) {
    refreshLoadList();
    placePopoverUnderButton(ui.saveLoadMenu, ui.saveLoadBtn, { alignRight: true, offset: 8 });
  } else {
    pop.loadList.open = false;
    if (ui.loadList) ui.loadList.dataset.open = "false";
  }
}

function toggleLoadList() {
  pop.loadList.open = !pop.loadList.open;
  ui.loadList.dataset.open = pop.loadList.open ? "true" : "false";
  ui.loadLocal?.setAttribute("aria-expanded", pop.loadList.open ? "true" : "false");
  if (pop.loadList.open) refreshLoadList();
}

/* ─────────────────────────────
  Boot + wire UI
───────────────────────────── */
function boot() {
  initCy();

  // Load latest local save if present, else fresh
  const index = readIndex();
  if (index.length) {
    const latest = index[0];
    const raw = localStorage.getItem(storyKey(latest.id));
    if (raw) {
      try {
        const data = JSON.parse(raw);
        currentStoryId = latest.id;
        loadProject(data, { keepStoryId: true });
        setStatus("Loaded latest local save.");
      } catch {
        startFresh();
      }
    } else {
      startFresh();
    }
  } else {
    startFresh();
  }

  // Toolbar actions
  ui.add?.addEventListener("click", () => {
    const base = activeId ? cy.getElementById(activeId).position() : { x: 240, y: 160 };
    const n = addNodeAt(base.x + 320, base.y + 40, "New Passage", "");
    setActiveNode(n.id(), { openEditor: true, pulse: true });
    scheduleAutosave("Created.");
  });

  ui.layout?.addEventListener("click", runAutoLayout);
  ui.center?.addEventListener("click", centerView);
  ui.del?.addEventListener("click", deleteActive);
  ui.fresh?.addEventListener("click", startFresh);

  ui.search?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchAndFocus(ui.search.value);
  });

  ui.close?.addEventListener("click", () => {
    closeEditor();
    setStatus("Editor closed.");
  });
  ui.colorPick?.addEventListener("change", () => {
    applyNodeColor(ui.colorMode?.value || "fill", ui.colorPick.value);
  });
  
  ui.colorMode?.addEventListener("change", () => {
    if (!activeId) return;
    const n = cy.getElementById(activeId);
    if (!n || !n.length) return;
  
    const mode = ui.colorMode.value;
    ui.colorPick.value = mode === "fill" ? (n.data("fill") || "") : (n.data("border") || "");
  });
  
  
  // Editor sync
  ui.title?.addEventListener("input", onEditorInput);
  ui.text?.addEventListener("input", onEditorInput);
  ui.text?.addEventListener("paste", () => setTimeout(onEditorInput, 0));

  // Auto toggle
  ui.autoBtn?.addEventListener("click", () => {
    const on = ui.autoBtn.dataset.on === "true" ? "false" : "true";
    ui.autoBtn.dataset.on = on;
    if (ui.autoChip) ui.autoChip.textContent = `Auto-links: ${on === "true" ? "ON" : "OFF"}`;
    setStatus(on === "true" ? "Auto-links enabled." : "Auto-links disabled.");
    if (on === "true" && activeId) {
      syncAutoEdgesForNode(activeId);
      scheduleAutosave("Auto-links synced.");
    }
  });

  // Save & Load menu wiring (fixed v5 popover)
  ui.saveLoadBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSaveLoadMenu();
  });

  ui.saveAsNew?.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    saveAsNew();
    closeSaveLoadMenu(true);
  });

  ui.saveLocal?.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    saveLocal();
    closeSaveLoadMenu(true);
  });

  ui.loadLocal?.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    toggleLoadList();
  });

  ui.downloadJson?.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    downloadJSON();
    closeSaveLoadMenu(true);
  });

  ui.uploadJson?.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    ui.file?.click();
  });

  ui.file?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importJSONFile(file);
    ui.file.value = "";
    closeSaveLoadMenu(true);
  });

  // Formatting toolbar
  ui.fmtBold?.addEventListener("click", () => { ui.text?.focus(); document.execCommand("bold"); onEditorInput(); });
  ui.fmtItalic?.addEventListener("click", () => { ui.text?.focus(); document.execCommand("italic"); onEditorInput(); });
  ui.fmtUnderline?.addEventListener("click", () => { ui.text?.focus(); document.execCommand("underline"); onEditorInput(); });
  ui.fmtBullets?.addEventListener("click", () => { ui.text?.focus(); document.execCommand("insertUnorderedList"); onEditorInput(); });

  // Align menu (fixed v5 popover)
  ui.fmtAlignBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleAlignMenu();
  });

  ui.fmtAlignMenu?.querySelectorAll("[data-align]")?.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const v = btn.dataset.align;
      applyAlignment(v);
      closeAlignMenu();
    });
  });

  ui.fmtColor?.addEventListener("input", (e) => {
    ui.text?.focus();
    try { document.execCommand("foreColor", false, e.target.value); } catch {}
    onEditorInput();
  });

  ui.fmtFont?.addEventListener("change", (e) => {
    const font = e.target.value;
    if (!font) return;
    // execCommand fontName is flaky; apply to whole editor container for predictability
    ui.text.style.fontFamily = font;
    onEditorInput();
  });

  // Close menus when clicking elsewhere
  document.addEventListener("click", () => closeAllPopovers());

  // Prevent internal clicks from closing immediately
  ui.fmtAlignMenu?.addEventListener("click", (e) => e.stopPropagation());
  ui.saveLoadMenu?.addEventListener("click", (e) => e.stopPropagation());

  // Keep popovers aligned on resize/scroll
  window.addEventListener("resize", () => {
    if (ui.saveLoadMenu?.dataset.open === "true") placePopoverUnderButton(ui.saveLoadMenu, ui.saveLoadBtn, { alignRight: true });
    if (ui.fmtAlignMenu?.dataset.open === "true") placePopoverUnderButton(ui.fmtAlignMenu, ui.fmtAlignBtn, { alignRight: false });
  });

  window.addEventListener("scroll", () => {
    if (ui.saveLoadMenu?.dataset.open === "true") placePopoverUnderButton(ui.saveLoadMenu, ui.saveLoadBtn, { alignRight: true });
    if (ui.fmtAlignMenu?.dataset.open === "true") placePopoverUnderButton(ui.fmtAlignMenu, ui.fmtAlignBtn, { alignRight: false });
  }, { passive: true });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllPopovers();
      if (ui.editor?.dataset.open === "true") closeEditor();
    }
  });
}

boot();
