// assets/js/admin.js
import { auth, db, functions } from "./firebase-init.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";


import {
  httpsCallable
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-functions.js";

/* ─────────────────────────────────────────────────────────────
   Constants / UI options
───────────────────────────────────────────────────────────── */
const STATUS_OPTIONS = [
  "Inactive Guest",
  "Inactive Cohort",
  "Applicant",
  "Trial",
  "Rejected",
  "Active Cohort",
  "Active Ally",
  "Active Guest",
  "Left on Bad Terms",
  "Left on Good Terms",
  "Permanent Ban"
];

const PROFILE_OPTIONS = ["N/A", "Yes", "No"];

const ACTIVE_STATES = {
  ENABLED: "Enabled",
  DISABLED: "Disabled"
};

const SESSION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/* ─────────────────────────────────────────────────────────────
   DOM
───────────────────────────────────────────────────────────── */
const el = (id) => document.getElementById(id);

const tabMembership = el("tabMembership");
const tabAdminLog = el("tabAdminLog");

const panelMembership = el("panelMembership");
const panelAdminLog = el("panelAdminLog");

const adminIdentity = el("adminIdentity");
const btnExport = el("btnExport");
const btnImport = el("btnImport");
const importFile = el("importFile");


const searchBox = el("searchBox");
const statusFilter = el("statusFilter");
const membershipMsg = el("membershipMsg");

const appsHeaderRow = el("appsHeaderRow");
const appsBody = el("appsBody");

const profileOverlay = el("profileOverlay");
const profileClose = el("profileClose");
const profileTitle = el("profileTitle");
const profileSub = el("profileSub");
const profileGrid = el("profileGrid");
const profileAppType = el("profileAppType");
const profileAltMain = el("profileAltMain");
const btnSaveProfileEdits = el("btnSaveProfileEdits");
const profileEditMsg = el("profileEditMsg");

const notesList = el("notesList");
const notesInput = el("notesInput");
const btnAddNote = el("btnAddNote");
const notesMsg = el("notesMsg");
const chipsRow = el("chipsRow");

const btnNewLog = el("btnNewLog");
const logMsg = el("logMsg");
const logList = el("logList");

const logDetailEmpty = el("logDetailEmpty");
const logDetail = el("logDetail");
const logDetailTitle = el("logDetailTitle");
const logDetailMeta = el("logDetailMeta");
const logDetailActions = el("logDetailActions");

const manualEntryWrap = el("manualEntryWrap");
const manualEntryText = el("manualEntryText");
const btnSaveManualEntry = el("btnSaveManualEntry");
const btnCancelManualEntry = el("btnCancelManualEntry");

/* ─────────────────────────────────────────────────────────────
   State
───────────────────────────────────────────────────────────── */
let currentUser = null;
let isAdmin = false;
let adminDiscord = "";
let appsUnsub = null;
let logUnsub = null;

let applications = []; // {id, ...data}
let sortKey = "submittedAt";
let sortDir = "desc"; // "asc" | "desc"

let selectedApp = null; // {id, ...data}
let selectedLogSession = null; // {id, ...data}

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function fmtDate(ts) {
  try {
    if (!ts) return "";
    const d =
      ts instanceof Timestamp ? ts.toDate() :
      ts?.toDate ? ts.toDate() :
      (ts instanceof Date ? ts : new Date(ts));
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function normalize(s) {
  return String(s || "").toLowerCase().trim();
}

function setMsg(targetEl, text) {
  if (!targetEl) return;
  targetEl.textContent = text || "";
}

function setActiveTab(which) {
  const membershipOn = which === "membership";
  tabMembership.classList.toggle("active", membershipOn);
  tabAdminLog.classList.toggle("active", !membershipOn);
  panelMembership.style.display = membershipOn ? "" : "none";
  panelAdminLog.style.display = membershipOn ? "none" : "";
}

function escapeCSV(val) {
  const s = String(val ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadText(filename, text, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function appIdentity(appId) {
    const a = applications.find(x => x.id === appId);
    if (!a) return appId ? `(app: ${appId.slice(0,6)}…)` : "";
    const who = `${a.character || "Unknown"}${a.discord ? ` (${a.discord})` : ""}`;
    return who;
  }
  
  let _scrollY = 0;

function lockPageScroll() {
  _scrollY = window.scrollY || 0;
  document.body.style.position = "fixed";
  document.body.style.top = `-${_scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockPageScroll() {
  const top = document.body.style.top;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  const y = top ? Math.abs(parseInt(top, 10)) : _scrollY;
  window.scrollTo(0, y);
}

/* ─────────────────────────────────────────────────────────────
   Admin gate
───────────────────────────────────────────────────────────── */
async function checkAdmin(uid) {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists() ? snap.data() : null;
}

function redirectNotAuthorized() {
  // keep it simple; you can change destination later
  window.location.href = "index.html";
}

/* ─────────────────────────────────────────────────────────────
   Firestore listeners
───────────────────────────────────────────────────────────── */
function listenApplications() {
  if (appsUnsub) appsUnsub();

  // Keep it simple: listen to latest first, then sort/filter client-side.
  const qApps = query(collection(db, "applications"), orderBy("submittedAt", "desc"));

  appsUnsub = onSnapshot(qApps, (snap) => {
    applications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTable();
  }, (err) => {
    console.error("Applications listener error:", err);
    setMsg(membershipMsg, "Error loading applications.");
  });
}

function listenAdminLog() {
  if (logUnsub) logUnsub();

  const qLog = query(
    collection(db, "adminLogSessions"),
    orderBy("endedAt", "desc"),
    limit(200)
  );

  logUnsub = onSnapshot(qLog, (snap) => {
    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLogList(sessions);
    // If a session is selected, refresh detail
    if (selectedLogSession) {
      const found = sessions.find(s => s.id === selectedLogSession.id);
      if (found) {
        selectedLogSession = found;
        renderLogDetail(found);
      }
    }
  }, (err) => {
    console.error("Admin log listener error:", err);
    setMsg(logMsg, "Error loading admin log.");
  });
}

/* ─────────────────────────────────────────────────────────────
   Sorting / filtering
───────────────────────────────────────────────────────────── */
function getFilteredSortedApps() {
  const q = normalize(searchBox?.value);
  const statusVal = statusFilter?.value || "";

  let rows = applications.slice();

  if (statusVal) {
    rows = rows.filter(r => (r.status || "Applicant") === statusVal);
  }

  if (q) {
    rows = rows.filter(r => {
      const blob = [
        r.character,
        r.discord,
        r.name,
        r.server,
        r.title,
        r.faction,
        r.availability,
        r.history,
        r.main
      ].map(normalize).join(" ");
      return blob.includes(q);
    });
  }

  const dirMult = sortDir === "asc" ? 1 : -1;

  rows.sort((a, b) => {
    const va = a?.[sortKey];
    const vb = b?.[sortKey];

    // timestamps
    if (va instanceof Timestamp || vb instanceof Timestamp) {
      const da = va instanceof Timestamp ? va.toMillis() : (va?.toDate ? va.toDate().getTime() : 0);
      const dbm = vb instanceof Timestamp ? vb.toMillis() : (vb?.toDate ? vb.toDate().getTime() : 0);
      return (da - dbm) * dirMult;
    }

    // booleans
    if (typeof va === "boolean" || typeof vb === "boolean") {
      return ((va === vb) ? 0 : (va ? 1 : -1)) * dirMult;
    }

    // numbers
    if (typeof va === "number" && typeof vb === "number") {
      return (va - vb) * dirMult;
    }

    // strings fallback
    return String(va ?? "").localeCompare(String(vb ?? "")) * dirMult;
  });

  return rows;
}

function updateHeaderSortIndicators() {
  const ths = appsHeaderRow?.querySelectorAll("th[data-key]");
  ths?.forEach(th => {
    th.classList.remove("sort-asc", "sort-desc");
    const k = th.getAttribute("data-key");
    if (k === sortKey) th.classList.add(sortDir === "asc" ? "sort-asc" : "sort-desc");
  });
}

/* ─────────────────────────────────────────────────────────────
   Rendering: Membership table
───────────────────────────────────────────────────────────── */
function renderTable() {
  updateHeaderSortIndicators();

  const rows = getFilteredSortedApps();
  appsBody.innerHTML = "";

  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="15" class="cell-muted">No results.</td>`;
    appsBody.appendChild(tr);
    return;
  }

  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.className = "row-hover";

    // Derived defaults
    const submitted = fmtDate(r.submittedAt);
    const appType = r.appType || (r.main ? "alt" : "main");
    const status = r.status || "Applicant";
    const profile = r.profile || "N/A";
    const activeState = r.activeState || ACTIVE_STATES.DISABLED;
    const notesRollup = r.notesRollup || "";

    tr.innerHTML = `
      <td class="cell-small">${submitted}</td>
      <td class="cell-small">${appType}</td>

      <td class="sticky-col">
        <div style="display:flex; gap:10px; align-items:center;">
          <span>${r.character || ""}</span>
          <button class="admin-btn" data-action="viewProfile" style="padding:6px 10px; font-size:12px;">View</button>
        </div>
      </td>

      <td>${r.discord || ""}</td>
      <td>${r.server || ""}</td>
      <td>${r.name || ""}</td>
      <td>${r.title || ""}</td>
      <td>${r.faction || ""}</td>
      <td class="cell-notes">${r.availability || ""}</td>
      <td>${r.main || ""}</td>

      <td>${renderStatusSelect(status)}</td>
      <td>${renderProfileSelect(profile)}</td>
      <td>${renderActiveToggle(activeState)}</td>

      <td class="cell-notes" title="${notesRollup.replace(/"/g, "&quot;")}">${notesRollup || "<span class='cell-muted'>—</span>"}</td>

      <td>
        <div class="cell-actions">
          <button class="mini-x" data-action="deleteRow" title="Delete">✕</button>
        </div>
      </td>
    `;

    // wire per-row events
    tr.querySelector('[data-action="viewProfile"]')?.addEventListener("click", (e) => {
      e.stopPropagation();
      openProfile(r);
    });

    // Change handlers
    tr.querySelector('select[data-field="status"]')?.addEventListener("change", async (e) => {
      await updateAppField(r.id, "status", e.target.value, r.status || "Applicant");
    });

    tr.querySelector('select[data-field="profile"]')?.addEventListener("change", async (e) => {
      await updateAppField(r.id, "profile", e.target.value, r.profile || "N/A");
    });

    tr.querySelector('input[data-field="activeState"]')?.addEventListener("change", async (e) => {
      const enabled = !!e.target.checked;
      const to = enabled ? ACTIVE_STATES.ENABLED : ACTIVE_STATES.DISABLED;
      const from = r.activeState || ACTIVE_STATES.DISABLED;
      await setActiveState(r, enabled, from, to);
    });

    tr.querySelector('[data-action="deleteRow"]')?.addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteApplication(r);
    });

    appsBody.appendChild(tr);
  }
}

function renderStatusSelect(value) {
  const opts = STATUS_OPTIONS.map(o => `<option value="${o}" ${o === value ? "selected" : ""}>${o}</option>`).join("");
  return `<select class="cell-select" data-field="status">${opts}</select>`;
}

function renderProfileSelect(value) {
  const opts = PROFILE_OPTIONS.map(o => `<option value="${o}" ${o === value ? "selected" : ""}>${o}</option>`).join("");
  return `<select class="cell-select" data-field="profile">${opts}</select>`;
}

function renderActiveToggle(value) {
  const enabled = value === ACTIVE_STATES.ENABLED;
  return `
    <label class="toggle">
      <input type="checkbox" data-field="activeState" ${enabled ? "checked" : ""}/>
      <span class="cell-small">${enabled ? "Enabled" : "Disabled"}</span>
    </label>
  `;
}

/* ─────────────────────────────────────────────────────────────
   CSV Import (Admin-only)
   - Export your XLSX as CSV and import here
   - Dedupe key: normalize(discord) + "|" + normalize(character)
   - Default admin fields applied if missing
───────────────────────────────────────────────────────────── */

function parseCSV(text) {
    // Handles commas + quotes + newlines
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;
  
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
  
      if (ch === '"' && inQuotes && next === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes && ch === ",") {
        row.push(cur);
        cur = "";
        continue;
      }
      if (!inQuotes && ch === "\n") {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
        continue;
      }
      if (ch !== "\r") cur += ch;
    }
  
    if (cur.length || row.length) {
      row.push(cur);
      rows.push(row);
    }
  
    return rows;
  }
  
  function normHeader(h) {
    return normalize(h)
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, "")
      .trim();
  }
  
  function pick(obj, keys) {
    for (const k of keys) {
      if (obj[k] != null && String(obj[k]).trim() !== "") return String(obj[k]).trim();
    }
    return "";
  }
  
  function parseDateMaybe(s) {
    const t = String(s || "").trim();
    if (!t) return null;
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }
  
  async function importCSVFile(file) {
    if (!isAdmin) return;
  
    const text = await file.text();
    const grid = parseCSV(text);
  
    if (grid.length < 2) {
      setMsg(membershipMsg, "Import failed: CSV has no data rows.");
      return;
    }
  
    const headers = grid[0].map(normHeader);
    const dataRows = grid
      .slice(1)
      .filter(r => r.some(c => String(c || "").trim() !== ""));
  
    const objs = dataRows.map(cols => {
      const o = {};
      headers.forEach((h, idx) => { o[h] = cols[idx] ?? ""; });
      return o;
    });
  
    // Existing keys based on what’s currently loaded in the table
    const existing = new Set(
      applications.map(a => `${normalize(a.discord)}|${normalize(a.character)}`)
    );
  
    const toCreate = [];
    let duplicates = 0;
  
    for (const o of objs) {
      // Best-effort mapping (supports a bunch of common header variants)
      const character = pick(o, ["character", "character name", "ic name", "in character name", "char", "name ic"]);
      const discord = pick(o, ["discord", "discord handle", "discord username", "discord name"]);
      const server = pick(o, ["server"]);
      const oocName = pick(o, ["ooc name", "player name", "name"]);
      const title = pick(o, ["title", "rank", "role title"]);
      const faction = pick(o, ["role", "faction", "guild role", "rankrole"]);
      const availability = pick(o, ["availability", "times", "schedule"]);
      const history = pick(o, ["history", "description", "backstory", "bio"]);
      const altMain = pick(o, ["alt main", "main", "main character", "main character name"]);
  
      const statusRaw = pick(o, ["status"]);
      const profileRaw = pick(o, ["profile"]);
      const activeRaw = pick(o, ["active state", "activestate"]);
  
      const submittedRaw = pick(o, ["submitted", "submitted at", "date", "timestamp"]);
      const submittedDate = parseDateMaybe(submittedRaw);
  
      // Skip empty junk rows
      if (!character && !discord) continue;
  
      const key = `${normalize(discord)}|${normalize(character)}`;
      if (existing.has(key)) {
        duplicates++;
        continue;
      }
  
      const status = STATUS_OPTIONS.includes(statusRaw) ? statusRaw : "Applicant";
      const profile = PROFILE_OPTIONS.includes(profileRaw) ? profileRaw : "N/A";
      const activeState = (String(activeRaw).toLowerCase() === "enabled")
        ? ACTIVE_STATES.ENABLED
        : ACTIVE_STATES.DISABLED;
  
      toCreate.push({
        // application fields
        name: oocName,
        server,
        discord,
        character,
        title,
        faction,
        availability,
        history,
        main: altMain,
        appType: altMain ? "alt" : "main",
        siteRef: "import",
        submittedAt: submittedDate ? Timestamp.fromDate(submittedDate) : Timestamp.now(),
  
        // admin defaults
        status,
        profile,
        activeState,
        notesRollup: pick(o, ["notes"]) || "",
        linkedMainId: null,
        updatedAt: null,
        updatedBy: null
      });
  
      existing.add(key);
    }
  
    const preview =
      `Import preview:\n` +
      `• Rows in file: ${objs.length}\n` +
      `• New to add: ${toCreate.length}\n` +
      `• Duplicates skipped: ${duplicates}\n\n` +
      `Proceed with import?`;
  
    if (!confirm(preview)) {
      setMsg(membershipMsg, "Import cancelled.");
      return;
    }
  
    setMsg(membershipMsg, `Importing ${toCreate.length}…`);
  
    try {
      // Firestore batch limit is 500 ops; stay under to be safe
      let batch = writeBatch(db);
      let ops = 0;
      let committed = 0;
  
      for (const item of toCreate) {
        const ref = doc(collection(db, "applications"));
        batch.set(ref, item);
        ops++;
  
        if (ops >= 450) {
          await batch.commit();
          committed += ops;
          batch = writeBatch(db);
          ops = 0;
          setMsg(membershipMsg, `Importing… (${committed}/${toCreate.length})`);
        }
      }
  
      if (ops > 0) {
        await batch.commit();
        committed += ops;
      }
  
      // audit entry (counts as one session action)
      await auditAction({
        type: "IMPORT",
        appId: null,
        field: null,
        from: "",
        to: "",
        details: `Imported ${toCreate.length} application rows (skipped ${duplicates} duplicates).`
      });
  
      setMsg(membershipMsg, `Import complete: added ${toCreate.length}, skipped ${duplicates}.`);
      setTimeout(() => setMsg(membershipMsg, ""), 3500);
    } catch (err) {
      console.error("Import error:", err);
      setMsg(membershipMsg, "Import failed (see console).");
    }
  }
  
/* ─────────────────────────────────────────────────────────────
   Updates + Audit log
───────────────────────────────────────────────────────────── */
async function updateAppField(appId, field, to, from) {
  try {
    setMsg(membershipMsg, "Saving…");

    await updateDoc(doc(db, "applications", appId), {
      [field]: to,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser?.uid || null
    });

    await auditAction({
      type: "UPDATE",
      appId,
      field,
      from: String(from ?? ""),
      to: String(to ?? ""),
      details: `${field} changed`
    });

    setMsg(membershipMsg, "Saved.");
    setTimeout(() => setMsg(membershipMsg, ""), 1200);
  } catch (err) {
    console.error("updateAppField error:", err);
    setMsg(membershipMsg, "Error saving.");
  }
}

async function setActiveState(row, enabled, from, to) {
    try {
      setMsg(membershipMsg, enabled ? "Enabling login…" : "Disabling login…");
  
      // 1) Get an ID token for the signed-in admin
      const user = auth.currentUser;
      if (!user) throw new Error("not_signed_in");
  
      const token = await user.getIdToken(true);
  
      // 2) Call the CORS-safe HTTP function (admin token verified server-side)
      const resp = await fetch(
        "https://us-central1-elrendar-fellowship.cloudfunctions.net/setUserEnabledHttp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            discord: row.discord || "",
            enabled: !!enabled
          })
        }
      );
  
      const json = await resp.json().catch(() => ({}));
  
      if (!resp.ok || !json.ok) {
        const reason = json?.error || `http_${resp.status}`;
        throw new Error(reason);
      }
  
      // 3) Store display state in applications row
      await updateDoc(doc(db, "applications", row.id), {
        activeState: to,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || null
      });
  
      // 4) Audit
      await auditAction({
        type: "UPDATE",
        appId: row.id,
        field: "activeState",
        from,
        to,
        details: enabled ? "Login enabled" : "Login disabled"
      });
  
      setMsg(membershipMsg, "Saved.");
      setTimeout(() => setMsg(membershipMsg, ""), 1200);
    } catch (err) {
      console.error("setActiveState error:", err);
  
      const msg = (err && err.message) ? err.message : "unknown_error";
      setMsg(membershipMsg, `Error toggling Active State: ${msg}`);
      setTimeout(() => setMsg(membershipMsg, ""), 6000);
  
      // rollback UI (best effort)
      renderTable();
    }
  }
  

async function deleteApplication(row) {
  if (!confirm(`Delete application for "${row.character}"? This cannot be undone.`)) return;

  try {
    setMsg(membershipMsg, "Deleting…");

    // delete notes subcollection docs (simple approach)
    const notesSnap = await getDocs(collection(db, "applications", row.id, "notes"));
    for (const d of notesSnap.docs) {
      await deleteDoc(d.ref);
    }

    await deleteDoc(doc(db, "applications", row.id));

    await auditAction({
      type: "DELETE",
      appId: row.id,
      field: null,
      from: "",
      to: "",
      details: `Deleted application (${row.character || "unknown"})`
    });

    setMsg(membershipMsg, "Deleted.");
    setTimeout(() => setMsg(membershipMsg, ""), 1500);
  } catch (err) {
    console.error("deleteApplication error:", err);
    setMsg(membershipMsg, "Error deleting.");
  }
}

/* ─────────────────────────────────────────────────────────────
   Session-bucketed admin log
───────────────────────────────────────────────────────────── */
async function getOrCreateCurrentSession() {
  // Find latest session by endedAt; if within 30 minutes, reuse.
  const qLatest = query(
    collection(db, "adminLogSessions"),
    orderBy("endedAt", "desc"),
    limit(1)
  );

  const snap = await getDocs(qLatest);
  const now = Date.now();

  if (snap.docs.length) {
    const d = snap.docs[0];
    const data = d.data();
    const endedAt = data?.endedAt?.toDate ? data.endedAt.toDate().getTime() : 0;
    if (endedAt && (now - endedAt) <= SESSION_WINDOW_MS) {
      return { id: d.id, ...data };
    }
  }

  // Create new session
  const by = { uid: currentUser?.uid || "", discord: adminDiscord || "" };

  const newDoc = await addDoc(collection(db, "adminLogSessions"), {
    startedAt: serverTimestamp(),
    endedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    adminsInvolved: [by],
    summary: "",
    actions: [],
    taggedApplicationIds: []
  });

  const created = await getDoc(newDoc);
  return { id: newDoc.id, ...created.data() };
}

async function auditAction({ type, appId, field, from, to, details }) {
  if (!currentUser) return;

  const session = await getOrCreateCurrentSession();
  const by = { uid: currentUser.uid, discord: adminDiscord || "" };

  const action = {
    t: Timestamp.now(),
    type,
    appId: appId || null,
    field: field || null,
    from: from ?? null,
    to: to ?? null,
    by,
    details: details || null
  };

  const sessionRef = doc(db, "adminLogSessions", session.id);

  // Pull latest session doc to append safely (simple, fine for low admin concurrency)
  const fresh = await getDoc(sessionRef);
  const freshData = fresh.data() || {};

  const actions = Array.isArray(freshData.actions) ? freshData.actions.slice() : [];
  actions.push(action);

  // update admins involved
  const adminsInvolved = Array.isArray(freshData.adminsInvolved) ? freshData.adminsInvolved.slice() : [];
  if (!adminsInvolved.some(a => a?.uid === by.uid)) adminsInvolved.push(by);

  // tagged apps
  const tagged = new Set(Array.isArray(freshData.taggedApplicationIds) ? freshData.taggedApplicationIds : []);
  if (appId) tagged.add(appId);

  // summary: quick compact line
  const summary = buildSessionSummary(actions);

  await updateDoc(sessionRef, {
    endedAt: serverTimestamp(),
    adminsInvolved,
    actions,
    taggedApplicationIds: Array.from(tagged),
    summary
  });
}

function buildSessionSummary(actions) {
  const counts = { UPDATE: 0, NOTE: 0, DELETE: 0, MANUAL_ENTRY: 0, LINK_OVERRIDE: 0 };
  for (const a of actions) {
    if (counts[a.type] != null) counts[a.type] += 1;
  }
  const parts = [];
  if (counts.UPDATE) parts.push(`${counts.UPDATE} updates`);
  if (counts.NOTE) parts.push(`${counts.NOTE} notes`);
  if (counts.DELETE) parts.push(`${counts.DELETE} deletes`);
  if (counts.MANUAL_ENTRY) parts.push(`${counts.MANUAL_ENTRY} manual`);
  if (counts.LINK_OVERRIDE) parts.push(`${counts.LINK_OVERRIDE} links`);
  return parts.length ? parts.join(" • ") : "Activity";
}

/* ─────────────────────────────────────────────────────────────
   Profile overlay + notes
───────────────────────────────────────────────────────────── */
function openProfile(appRow) {
  selectedApp = appRow;

    // Populate editable fields
    const derivedType = appRow.appType || (appRow.main ? "alt" : "main");
    if (profileAppType) profileAppType.value = derivedType;
    if (profileAltMain) profileAltMain.value = appRow.main || "";
    if (profileEditMsg) profileEditMsg.textContent = "";
  
  profileTitle.textContent = appRow.character || "Profile";
  const subBits = [];
  if (appRow.title) subBits.push(appRow.title);
  if (appRow.faction) subBits.push(appRow.faction);
  profileSub.textContent = subBits.join(" • ");

  // Build info grid
  profileGrid.innerHTML = "";

  addProfileBox("OOC Name", appRow.name);
  addProfileBox("Discord", appRow.discord);
  addProfileBox("Server", appRow.server);
  addProfileBox("Type", appRow.appType || (appRow.main ? "alt" : "main"));
  addProfileBox("Alt Main", appRow.main || "—");
  addProfileBox("Availability", appRow.availability || "—");
  addProfileBox("History / Description", appRow.history || "—", true);

  // notes + chips
  notesInput.value = "";
  notesList.innerHTML = "";
  chipsRow.innerHTML = "";
  setMsg(notesMsg, "");

lockPageScroll();

  profileOverlay.style.display = "block";
  profileOverlay.setAttribute("aria-hidden", "false");

  loadNotes(appRow.id);
  loadChipsForApp(appRow.id);
}

function closeProfile() {
    unlockPageScroll();
  profileOverlay.style.display = "none";
  profileOverlay.setAttribute("aria-hidden", "true");
  profileOverlay.style.position = "";
  profileOverlay.style.top = "";
  profileOverlay.style.left = "";
  profileOverlay.style.width = "";
  profileOverlay.style.height = "";
  profileOverlay.style.zIndex = "";

  selectedApp = null;
}

function addProfileBox(title, content, spanTwo = false) {
    const div = document.createElement("div");
    div.className = "profile-box" + (spanTwo ? " span-2" : "");
    div.innerHTML = `<h4>${title}</h4><p>${content ? String(content) : "—"}</p>`;
    profileGrid.appendChild(div);
  }
  
  async function saveProfileEdits() {
    if (!selectedApp) return;
  
    const type = profileAppType?.value || "main";
    const altMain = (profileAltMain?.value || "").trim();
  
    // If admin sets type=main, wipe alt main.
    const newMain = (type === "alt") ? altMain : "";
  
    try {
      if (profileEditMsg) profileEditMsg.textContent = "Saving…";
  
      await updateDoc(doc(db, "applications", selectedApp.id), {
        appType: type,
        main: newMain,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || null
      });
  
      // Refresh local selectedApp so later note/audit uses correct info
      selectedApp = { ...selectedApp, appType: type, main: newMain };
  
      // Audit with identity (we’ll improve audit below)
      await auditAction({
        type: "UPDATE",
        appId: selectedApp.id,
        field: "appType/main",
        from: "",
        to: `${type}${type === "alt" ? ` (main=${newMain || "—"})` : ""}`,
        details: "Profile corrected (type/main)"
      });
  
      if (profileEditMsg) profileEditMsg.textContent = "Saved.";
      setTimeout(() => { if (profileEditMsg) profileEditMsg.textContent = ""; }, 1500);
    } catch (err) {
      console.error("saveProfileEdits error:", err);
      if (profileEditMsg) profileEditMsg.textContent = "Error saving.";
    }
  }
  
async function loadNotes(appId) {
  try {
    const snap = await getDocs(
      query(collection(db, "applications", appId, "notes"), orderBy("createdAt", "desc"), limit(100))
    );

    const notes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderNotes(notes);
  } catch (err) {
    console.error("loadNotes error:", err);
    setMsg(notesMsg, "Error loading notes.");
  }
}

function renderNotes(notes) {
  notesList.innerHTML = "";
  if (!notes.length) {
    notesList.innerHTML = `<div class="cell-muted">No notes yet.</div>`;
    return;
  }

  for (const n of notes) {
    const meta = `${fmtDate(n.createdAt)} • ${n.createdByDiscord || "Admin"}`;
    const div = document.createElement("div");
    div.className = "note-item";
    div.innerHTML = `
      <div class="note-meta">${meta}</div>
      <div class="note-text">${escapeHtml(n.text || "")}</div>
    `;
    notesList.appendChild(div);
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function addNote() {
  if (!selectedApp) return;
  const text = String(notesInput.value || "").trim();
  if (!text) return;

  try {
    setMsg(notesMsg, "Saving note…");

    const by = { uid: currentUser.uid, discord: adminDiscord || "" };
    const session = await getOrCreateCurrentSession();

    await addDoc(collection(db, "applications", selectedApp.id, "notes"), {
      text,
      createdAt: serverTimestamp(),
      createdByUid: by.uid,
      createdByDiscord: by.discord,
      sessionId: session.id
    });

    // Update notesRollup (simple preview)
    const roll = text.length > 120 ? (text.slice(0, 120) + "…") : text;

    await updateDoc(doc(db, "applications", selectedApp.id), {
      notesRollup: roll,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid
    });

    await auditAction({
        type: "NOTE",
        appId: selectedApp.id,
        field: "notes",
        from: "",
        to: roll,
        details: text
      });
      

    notesInput.value = "";
    setMsg(notesMsg, "Note added.");
    setTimeout(() => setMsg(notesMsg, ""), 1200);

    await loadNotes(selectedApp.id);
  } catch (err) {
    console.error("addNote error:", err);
    setMsg(notesMsg, "Error saving note.");
  }
}

async function loadChipsForApp(appId) {
  // Chips are sessions that tagged this appId.
  try {
    const qChips = query(
      collection(db, "adminLogSessions"),
      where("taggedApplicationIds", "array-contains", appId),
      orderBy("endedAt", "desc"),
      limit(20)
    );

    const snap = await getDocs(qChips);
    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderChips(sessions);
  } catch (err) {
    // If you don't have an index for this, Firestore may complain; safe to ignore for now.
    console.warn("loadChipsForApp warning:", err?.message || err);
  }
}

function renderChips(sessions) {
  chipsRow.innerHTML = "";
  if (!sessions.length) {
    chipsRow.innerHTML = `<span class="cell-muted">No admin log tags yet.</span>`;
    return;
  }

  sessions.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.type = "button";
    btn.textContent = s.summary || "Log Entry";
    btn.addEventListener("click", () => {
      setActiveTab("adminlog");
      // select in log list
      selectLogSession(s.id);
    });
    chipsRow.appendChild(btn);
  });
}

/* ─────────────────────────────────────────────────────────────
   Admin log UI
───────────────────────────────────────────────────────────── */
function renderLogList(sessions) {
  logList.innerHTML = "";

  if (!sessions.length) {
    logList.innerHTML = `<div class="cell-muted">No log entries yet.</div>`;
    return;
  }

  for (const s of sessions) {
    const div = document.createElement("div");
    div.className = "log-item" + (selectedLogSession?.id === s.id ? " active" : "");
    const title = s.summary || "Activity";
    const sub = `${fmtDate(s.startedAt)} → ${fmtDate(s.endedAt)}`;
    div.innerHTML = `
      <h4 class="log-item-title">${escapeHtml(title)}</h4>
      <p class="log-item-sub">${escapeHtml(sub)}</p>
    `;
    div.addEventListener("click", () => {
      selectedLogSession = s;
      renderLogList(sessions);
      renderLogDetail(s);
    });
    logList.appendChild(div);
  }
}

function renderLogDetail(session) {
  logDetailEmpty.style.display = "none";
  logDetail.style.display = "block";

  logDetailTitle.textContent = session.summary || "Activity";
  const admins = (session.adminsInvolved || []).map(a => a.discord || a.uid).join(", ");
  logDetailMeta.textContent = `${fmtDate(session.startedAt)} → ${fmtDate(session.endedAt)} • ${admins || "—"}`;

  // Render actions
  const actions = Array.isArray(session.actions) ? session.actions : [];
  if (!actions.length) {
    logDetailActions.innerHTML = `<div class="cell-muted">No actions recorded.</div>`;
  } else {
    logDetailActions.innerHTML = actions
      .slice()
      .reverse()
      .map(a => {
        const t = fmtDate(a.t);
        const by = a.by?.discord || "Admin";
        const line = formatActionLine(a);
        return `<div class="note-item"><div class="note-meta">${escapeHtml(t)} • ${escapeHtml(by)}</div><div class="note-text">${escapeHtml(line)}</div></div>`;
      })
      .join("");
  }

  manualEntryWrap.style.display = "none";
  manualEntryText.value = "";
}

function formatActionLine(a) {
    const who = a.appId ? appIdentity(a.appId) : "";
    const prefix = who ? `${who} — ` : "";
  
    if (a.type === "DELETE") return prefix + (a.details || "Deleted entry");
  
    if (a.type === "NOTE") {
      // include actual note content (truncate a bit so log stays readable)
      const noteText = String(a.details || "").trim();
      return prefix + (noteText ? `Note added: ${noteText}` : "Note added");
    }
  
    if (a.type === "MANUAL_ENTRY") return (a.details || "Manual entry");
  
    if (a.type === "UPDATE") {
      const f = a.field || "field";
      return prefix + `${f}: "${a.from ?? ""}" → "${a.to ?? ""}"`;
    }
  
    return prefix + (a.details || a.type || "Action");
  }
  

async function selectLogSession(sessionId) {
  // Force open from current snapshots: we can just rely on listener and find it
  // Quick fetch if needed:
  try {
    const snap = await getDoc(doc(db, "adminLogSessions", sessionId));
    if (snap.exists()) {
      selectedLogSession = { id: snap.id, ...snap.data() };
      renderLogDetail(selectedLogSession);
      // highlight list entry will happen on next snapshot update
    }
  } catch (err) {
    console.error("selectLogSession error:", err);
  }
}

/* Manual admin log entry (simple v1) */
async function startManualEntry() {
  if (!isAdmin) return;
  manualEntryWrap.style.display = "block";
  logDetailEmpty.style.display = "none";
  logDetail.style.display = "block";
  logDetailTitle.textContent = "Manual Entry";
  logDetailMeta.textContent = "";
  logDetailActions.innerHTML = "";
  manualEntryText.focus();
}

async function saveManualEntry() {
  const text = String(manualEntryText.value || "").trim();
  if (!text) return;

  try {
    setMsg(logMsg, "Saving…");

    const session = await getOrCreateCurrentSession();
    await auditAction({
      type: "MANUAL_ENTRY",
      appId: null,
      field: null,
      from: "",
      to: "",
      details: text
    });

    setMsg(logMsg, "Saved.");
    setTimeout(() => setMsg(logMsg, ""), 1200);
    manualEntryWrap.style.display = "none";
    manualEntryText.value = "";
  } catch (err) {
    console.error("saveManualEntry error:", err);
    setMsg(logMsg, "Error saving.");
  }
}

/* ─────────────────────────────────────────────────────────────
   Export backup
───────────────────────────────────────────────────────────── */
async function exportBackup() {
  if (!isAdmin) return;

  try {
    setMsg(membershipMsg, "Exporting…");

    // Applications
    const appsSnap = await getDocs(query(collection(db, "applications"), orderBy("submittedAt", "desc"), limit(5000)));
    const apps = appsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Admin log sessions
    const logSnap = await getDocs(query(collection(db, "adminLogSessions"), orderBy("endedAt", "desc"), limit(2000)));
    const logs = logSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // JSON downloads
    downloadText("applications.json", JSON.stringify(apps, null, 2), "application/json");
    downloadText("adminLogSessions.json", JSON.stringify(logs, null, 2), "application/json");

    // CSV for apps
    const cols = [
      "submittedAt", "appType", "character", "discord", "server", "name", "title", "faction",
      "availability", "main", "status", "profile", "activeState", "notesRollup", "id"
    ];

    const csvLines = [];
    csvLines.push(cols.join(","));

    for (const a of apps) {
      const row = cols.map(c => {
        let v = a[c];
        if (v instanceof Timestamp) v = fmtDate(v);
        if (v && typeof v === "object" && v.toDate) v = fmtDate(v);
        return escapeCSV(v);
      });
      csvLines.push(row.join(","));
    }

    downloadText("applications.csv", csvLines.join("\n"), "text/csv");

    setMsg(membershipMsg, "Exported.");
    setTimeout(() => setMsg(membershipMsg, ""), 1500);
  } catch (err) {
    console.error("exportBackup error:", err);
    setMsg(membershipMsg, "Export error.");
  }
}

/* ─────────────────────────────────────────────────────────────
   Wire events
───────────────────────────────────────────────────────────── */
function wireEvents() {
  tabMembership?.addEventListener("click", () => setActiveTab("membership"));
  tabAdminLog?.addEventListener("click", () => setActiveTab("adminlog"));

  btnExport?.addEventListener("click", exportBackup);
  btnSaveProfileEdits?.addEventListener("click", saveProfileEdits);

    // Import CSV
    btnImport?.addEventListener("click", () => {
        if (!isAdmin) return;
        importFile.value = "";
        importFile.click();
      });
    
      importFile?.addEventListener("change", async () => {
        const file = importFile.files?.[0];
        if (!file) return;
        await importCSVFile(file);
      });
    
  searchBox?.addEventListener("input", () => renderTable());
  statusFilter?.addEventListener("change", () => renderTable());

  // header sort
  appsHeaderRow?.querySelectorAll("th[data-key]")?.forEach(th => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-key");
      if (!key || key === "actions") return;
      if (sortKey === key) sortDir = (sortDir === "asc") ? "desc" : "asc";
      else { sortKey = key; sortDir = "asc"; }
      renderTable();
    });
  });

  profileOverlay?.addEventListener("click", (e) => {
    if (e.target === profileOverlay) closeProfile();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && profileOverlay?.style.display === "block") closeProfile();
  });

  profileClose?.addEventListener("click", closeProfile);
  btnAddNote?.addEventListener("click", addNote);

  btnNewLog?.addEventListener("click", startManualEntry);
  btnSaveManualEntry?.addEventListener("click", saveManualEntry);
  btnCancelManualEntry?.addEventListener("click", () => {
    manualEntryWrap.style.display = "none";
    manualEntryText.value = "";
  });
}

/* ─────────────────────────────────────────────────────────────
   Init
───────────────────────────────────────────────────────────── */
wireEvents();
setActiveTab("membership");

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (!user) {
    adminIdentity.textContent = "Not signed in";
    redirectNotAuthorized();
    return;
  }

  adminIdentity.textContent = "Checking admin…";

  try {
    const adminData = await checkAdmin(user.uid);
    if (!adminData) {
      isAdmin = false;
      adminIdentity.textContent = "Not authorized";
      redirectNotAuthorized();
      return;
    }

    isAdmin = true;
    adminDiscord = adminData.discord || "";
    adminIdentity.textContent = `Admin: ${adminDiscord || user.email || user.uid}`;

    // start listeners
    listenApplications();
    listenAdminLog();
  } catch (err) {
    console.error("Admin gate error:", err);
    adminIdentity.textContent = "Not authorized";
    redirectNotAuthorized();
  }
});
