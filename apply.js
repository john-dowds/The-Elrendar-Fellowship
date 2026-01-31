// apply.js (Firestore submission)
// Replaces the old Google Apps Script submission entirely.

import { db } from "./assets/js/firebase-init.js";
import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const form = document.getElementById("appForm");
const statusEl = document.getElementById("status");

const toggle = document.getElementById("appTypeToggle");
const toggleLabel = document.getElementById("appTypeLabel");
const mainWrap = document.getElementById("mainNameWrap");
const mainInput = document.getElementById("mainNameInput");

function isMainSelected() {
  return toggle ? !!toggle.checked : true;
}

function syncAltFieldUI() {
  const mainSelected = isMainSelected();

  if (toggleLabel) toggleLabel.textContent = mainSelected ? "Main" : "Alt";

  if (!mainWrap || !mainInput) return;

  if (mainSelected) {
    mainWrap.classList.add("is-hidden");
    mainInput.value = "";
    mainInput.required = false;
  } else {
    mainWrap.classList.remove("is-hidden");
    mainInput.required = true;
  }
}

toggle?.addEventListener("change", syncAltFieldUI);
syncAltFieldUI();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "Submitting…";

  const fd = new FormData(form);

  const mainSelected = isMainSelected();
  const mainName = fd.get("main")?.trim();

  const data = {
    // Original form fields
    name: fd.get("name")?.trim() || "",
    server: fd.get("server")?.trim() || "",
    discord: fd.get("discord")?.trim() || "",
    character: fd.get("character")?.trim() || "",
    title: fd.get("title")?.trim() || "",
    faction: fd.get("faction")?.trim() || "",
    availability: fd.get("availability")?.trim() || "",
    history: fd.get("history")?.trim() || "",

    // Alt linking field (blank for mains)
    main: mainSelected ? "" : (mainName || ""),

    // Metadata
    siteRef: location.href,
    appType: mainSelected ? "main" : "alt",
    submittedAt: serverTimestamp(),

    // Admin-side defaults
    status: "Applicant",
    profile: "N/A",
    activeState: "Disabled",
    notesRollup: "",
    linkedMainId: null,
    updatedAt: null,
    updatedBy: null
  };

  // Keep your original required checks
  if (!data.name || !data.character || !data.history) {
    statusEl.textContent = "Please complete required fields.";
    return;
  }

  if (!mainSelected && !data.main) {
    statusEl.textContent =
      "Please enter the name of your current main character in the guild.";
    return;
  }

  try {
    await addDoc(collection(db, "applications"), data);
    statusEl.textContent = "Submitted — thank you!";
    form.reset();
    syncAltFieldUI();
  } catch (err) {
    console.error("Firestore submit error:", err);
    statusEl.textContent = "Error. Could not submit.";
  }
});
