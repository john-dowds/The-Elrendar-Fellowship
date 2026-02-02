console.log("[AuthUI] loaded");

import { auth, db } from "./firebase-init.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  doc, getDoc, updateDoc, serverTimestamp,
  collection, query, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";



async function isUserAdmin(uid) {
    try {
      const snap = await getDoc(doc(db, "admins", uid));
      return snap.exists();
    } catch (err) {
      // Non-admins will not have permission to read /admins — treat as "not admin"
      console.warn("[AuthUI] isUserAdmin blocked (expected for non-admin).");
      return false;
    }
  }
  
// ─────────────────────────────────────────────────────────────
// Admin NAV blip (timestamp-based): show only if a new app arrived
// since this browser last "checked" admin.
// Row-level Applicant icons are handled in admin.js and are status-driven.
// ─────────────────────────────────────────────────────────────

let _appsUnsub = null;

function setAdminBlipVisible(on){
  const blip = document.getElementById("efAdminBlip");
  if (!blip) return;
  blip.style.display = on ? "block" : "none";
}

function startLastSeenNavBlipListener(){
  if (_appsUnsub) return;

  const qLatest = query(
    collection(db, "applications"),
    orderBy("submittedAt", "desc"),
    limit(1)
  );

  _appsUnsub = onSnapshot(qLatest, (snap) => {
    if (snap.empty) { setAdminBlipVisible(false); return; }

    const latest = snap.docs[0].data()?.submittedAt;
    const latestMs = latest?.toMillis ? latest.toMillis() : 0;

    const lastSeen = parseInt(localStorage.getItem("ef_last_seen_app_ms") || "0", 10);

    setAdminBlipVisible(latestMs > lastSeen);
  }, (err) => {
    console.warn("[AuthUI] nav blip listener error:", err);
    setAdminBlipVisible(false);
  });
}

function stopLastSeenNavBlipListener(){
  if (_appsUnsub) { _appsUnsub(); _appsUnsub = null; }
  setAdminBlipVisible(false);
}
  
const EMAIL_DOMAIN = "members.elrendar";
function normalizeDiscord(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "");
}
function discordToEmail(discord) {
  const d = normalizeDiscord(discord);
  if (!d) return "";
  return `${d}@${EMAIL_DOMAIN}`;
}

function injectStyles() {
  if (document.getElementById("ef-auth-ui-styles")) return;
  const style = document.createElement("style");
  style.id = "ef-auth-ui-styles";
  style.textContent = `
    .ef-crest-btn{
      display:inline-flex; align-items:center; justify-content:center;
      width:34px; height:34px;
      border:1px solid rgba(212,175,55,.6);
      border-radius:8px;
      background: rgba(0,0,0,.35);
      cursor:pointer;
      padding:0;
    }
    .ef-crest-btn img{ width:24px; height:24px; display:block; }
    .ef-auth-backdrop{
      position:fixed; inset:0;
      background: rgba(0,0,0,.6);
      display:none;
      align-items:center; justify-content:center;
      z-index:9999;
    }
    .ef-auth-modal{
      width:min(420px, 92vw);
      background: rgba(12,12,12,.92);
      border:1px solid rgba(212,175,55,.55);
      border-radius:14px;
      box-shadow: 0 12px 40px rgba(0,0,0,.55);
      padding:16px 16px 14px;
      color:#eee;
      font-family: inherit;
    }
    .ef-auth-row{ display:flex; gap:10px; align-items:center; }
    .ef-auth-title{ font-size:16px; letter-spacing:.5px; margin:0 0 10px; }
    .ef-auth-field{ width:100%; margin:10px 0; }
    .ef-auth-label{ display:block; font-size:12px; opacity:.85; margin:0 0 6px; }
    .ef-auth-input{
      width:100%;
      padding:10px 10px;
      border-radius:10px;
      border:1px solid rgba(255,255,255,.14);
      background: rgba(0,0,0,.35);
      color:#eee;
      outline:none;
    }
    .ef-auth-actions{ display:flex; justify-content:space-between; align-items:center; margin-top:10px; }
    .ef-auth-forgot{
      font-size:12px; opacity:.85;
      background:transparent; border:none; color:#d4af37;
      cursor:pointer; padding:6px 6px;
      position:relative;
    }
    .ef-auth-tooltip{
      position:absolute;
      left:0; top:110%;
      width:280px;
      background: rgba(0,0,0,.92);
      border:1px solid rgba(212,175,55,.5);
      border-radius:10px;
      padding:10px;
      color:#eee;
      display:none;
      z-index:10000;
    }
    .ef-auth-submit{
      width:42px; height:36px;
      border-radius:10px;
      border:1px solid rgba(212,175,55,.7);
      background: rgba(212,175,55,.15);
      color:#d4af37;
      cursor:pointer;
      font-size:18px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
    }
    .ef-auth-msg{ margin-top:10px; font-size:12px; opacity:.9; min-height:16px; }
    .ef-auth-close{
      margin-left:auto;
      width:34px; height:34px;
      border-radius:10px;
      border:1px solid rgba(255,255,255,.14);
      background: rgba(0,0,0,.2);
      color:#eee;
      cursor:pointer;
    }
    .ef-auth-mini{
      font-size:12px; opacity:.85;
      border:1px solid rgba(255,255,255,.14);
      background: rgba(0,0,0,.2);
      color:#eee;
      border-radius:10px;
      padding:7px 10px;
      cursor:pointer;
      display:none;
    }
          /* Admin NAV "new apps" blip (timestamp-based) */
    #efAdminNavItem{ position: relative; }

    .ef-admin-blip{
      position:absolute;
      top: -10px;
      right: 10px;
      width: 18px;
      height: 18px;
      background: url("assets/art/icon_question.png") no-repeat center/contain;
      display:none;
      pointer-events:none;
      filter: drop-shadow(0 0 6px rgba(212,175,55,.55));
      animation: efBlipPulse 1.1s ease-in-out infinite;
      transform-origin: center;
    }
    @keyframes efBlipPulse{
      0%, 100%{ transform: scale(1); opacity:.75; }
      50%     { transform: scale(1.18); opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce){
      .ef-admin-blip{ animation:none; }
    }

  `;
  document.head.appendChild(style);
}

function injectModal() {
  if (document.getElementById("efAuthBackdrop")) return;

  const backdrop = document.createElement("div");
    // Password change modal (hidden by default)
    const pw = document.createElement("div");
    pw.id = "efPwBackdrop";
    pw.className = "ef-auth-backdrop";
    pw.style.display = "none";
    pw.innerHTML = `
      <div class="ef-auth-modal" role="dialog" aria-modal="true" aria-label="Set new password">
        <div class="ef-auth-row">
          <h3 class="ef-auth-title">Set New Password</h3>
          <button class="ef-auth-close" id="efPwClose" title="Close">✕</button>
        </div>
  
        <div class="ef-auth-field">
          <label class="ef-auth-label" for="efPw1">New Password</label>
          <input class="ef-auth-input" id="efPw1" type="password" autocomplete="new-password" />
        </div>
  
        <div class="ef-auth-field">
          <label class="ef-auth-label" for="efPw2">Confirm Password</label>
          <input class="ef-auth-input" id="efPw2" type="password" autocomplete="new-password" />
        </div>
  
        <div class="ef-auth-actions">
          <span style="font-size:12px;opacity:.85;">Required on first login.</span>
          <button class="ef-auth-submit" id="efPwSave" type="button" title="Save">➜</button>
        </div>
  
        <div class="ef-auth-msg" id="efPwMsg"></div>
      </div>
    `;
    document.body.appendChild(pw);
  
    const pwClose = pw.querySelector("#efPwClose");
    pwClose?.addEventListener("click", () => (pw.style.display = "none"));
  
    pw.addEventListener("click", (e) => {
      if (e.target === pw) pw.style.display = "none";
    });
  
    pw.querySelector("#efPwSave")?.addEventListener("click", async () => {
        const p1 = pw.querySelector("#efPw1")?.value || "";
        const p2 = pw.querySelector("#efPw2")?.value || "";
        const msg = pw.querySelector("#efPwMsg");
      
        if (p1.length < 8) {
          msg.textContent = "Use at least 8 characters.";
          return;
        }
        if (p1 !== p2) {
          msg.textContent = "Passwords do not match.";
          return;
        }
      
        try {
          msg.textContent = "Saving…";
      
          // 1️⃣ Update Firebase Auth password
          await updatePassword(auth.currentUser, p1);
      
          // 2️⃣ Mark password as initialized (THIS is the fix)
          await updateDoc(doc(db, "userAuth", auth.currentUser.uid), {
            mustChangePassword: false,
            updatedAt: serverTimestamp()
          });
      
          msg.textContent = "Password updated.";
          setTimeout(() => {
            pw.style.display = "none";
          }, 600);
      
        } catch (err) {
          console.error(err);
          msg.textContent = "Could not update password. Try logging in again.";
        }
      });
      
  
  backdrop.className = "ef-auth-backdrop";
  backdrop.id = "efAuthBackdrop";
  backdrop.innerHTML = `
    <div class="ef-auth-modal" role="dialog" aria-modal="true" aria-label="Admin Login">
      <div class="ef-auth-row">
        <h3 class="ef-auth-title">Login</h3>
        <button class="ef-auth-close" id="efAuthClose" title="Close">✕</button>
      </div>

      <div class="ef-auth-field">
        <label class="ef-auth-label" for="efDiscord">Discord</label>
        <input class="ef-auth-input" id="efDiscord" type="text" autocomplete="username" placeholder="your_discord" />
      </div>

      <div class="ef-auth-field">
        <label class="ef-auth-label" for="efPassword">Password</label>
        <input class="ef-auth-input" id="efPassword" type="password" autocomplete="current-password" placeholder="••••••••" />
      </div>

      <div class="ef-auth-actions">
        <button class="ef-auth-forgot" id="efForgot" type="button">
          Forgot password?
          <span class="ef-auth-tooltip" id="efTooltip">
            Reach out to @Silvertongue_scribe on Discord to reset your password if you're an active member.
          </span>
        </button>

        <div style="display:flex; gap:10px; align-items:center;">
          <button class="ef-auth-mini" id="efLogout" type="button" title="Logout">Logout</button>
          <button class="ef-auth-submit" id="efLoginSubmit" type="button" title="Login">➜</button>
        </div>
      </div>

      <div class="ef-auth-msg" id="efAuthMsg"></div>
    </div>
  `;

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });

  document.body.appendChild(backdrop);

  const closeBtn = document.getElementById("efAuthClose");
  closeBtn?.addEventListener("click", closeModal);

  const forgotBtn = document.getElementById("efForgot");
  const tooltip = document.getElementById("efTooltip");
  forgotBtn?.addEventListener("click", () => {
    tooltip.style.display = tooltip.style.display === "block" ? "none" : "block";
  });

  const submitBtn = document.getElementById("efLoginSubmit");
  submitBtn?.addEventListener("click", doLogin);

  const logoutBtn = document.getElementById("efLogout");
  logoutBtn?.addEventListener("click", async () => {
    await signOut(auth);
    setMsg("Logged out.");
  });

  // Enter-to-submit
  document.getElementById("efPassword")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
}

function injectCrestButton() {
  const nav = document.querySelector("nav");
  const ul =
    nav?.querySelector("ul") ||
    document.querySelector("header nav ul") ||
    document.querySelector("nav ul");

  if (!ul) return;
  if (document.getElementById("efCrestLoginBtn")) return;
  // Add Admin nav link at far right (hidden until admin confirmed)
if (!document.getElementById("efAdminNavItem")) {
    const li = document.createElement("li");
    li.id = "efAdminNavItem";
    li.style.marginLeft = "auto";
    li.style.display = "none";
    li.innerHTML = `
    <a href="admin.html" class="nav-link" id="efAdminNavLink">Admin</a>
    <span id="efAdminBlip" class="ef-admin-blip" aria-hidden="true"></span>
  `;
      ul.appendChild(li);
  }
  

  const li = document.createElement("li");
  li.style.display = "flex";
  li.style.alignItems = "center";
  li.style.marginRight = "10px";

  li.innerHTML = `
    <button class="ef-crest-btn" id="efCrestLoginBtn" type="button" title="Admin Login">
      <img src="assets/art/crest2.png" alt="Crest" />
    </button>
  `;

  // Insert before first item (left of Home)
  ul.insertBefore(li, ul.firstChild);

  document.getElementById("efCrestLoginBtn")?.addEventListener("click", openModal);
}

function openModal() {
  const bd = document.getElementById("efAuthBackdrop");
  if (!bd) return;
  bd.style.display = "flex";
  setMsg("");
  // focus
  setTimeout(() => document.getElementById("efDiscord")?.focus(), 50);
}
function closeModal() {
  const bd = document.getElementById("efAuthBackdrop");
  if (!bd) return;
  bd.style.display = "none";
  const tip = document.getElementById("efTooltip");
  if (tip) tip.style.display = "none";
}
function setMsg(text) {
  const el = document.getElementById("efAuthMsg");
  if (el) el.textContent = text || "";
}

async function doLogin() {
    const discord = document.getElementById("efDiscord")?.value || "";
    const pass = document.getElementById("efPassword")?.value || "";
    const email = discordToEmail(discord);
  
    if (!email || !pass) {
      setMsg("Enter your Discord and password.");
      return;
    }
  
    try {
      setMsg("Signing in...");
      await signInWithEmailAndPassword(auth, email, pass);
  
      const user = auth.currentUser;
      if (!user) {
        setMsg("Login failed. Try again.");
        return;
      }
  
      // 🔐 CHECK PASSWORD STATE (this is the key change)
      const snap = await getDoc(doc(db, "userAuth", user.uid));
      const mustChange = snap.exists() && snap.data()?.mustChangePassword === true;
  
      if (mustChange) {
        closeModal();
        const pwBackdrop = document.getElementById("efPwBackdrop");
        if (pwBackdrop) {
          pwBackdrop.style.display = "flex";
          setTimeout(() => document.getElementById("efPw1")?.focus(), 50);
        }
        return;
      }
  
      // Admin redirect
      if (await isUserAdmin(user.uid)) {
        window.location.href = "admin.html";
        return;
      }
  
      setMsg("Signed in.");
      closeModal();
  
    } catch (e) {
      console.error(e);
      const code = e?.code || "";
  
      if (code === "auth/user-disabled") {
        setMsg("This account is disabled.");
      } else if (code === "auth/wrong-password") {
        setMsg("Wrong password.");
      } else if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        setMsg("No account found for that Discord (or wrong password).");
      } else if (code === "auth/too-many-requests") {
        setMsg("Too many attempts. Try again later.");
      } else {
        setMsg("Login failed.");
      }
    }
  }
  
  
  

// Update modal UI if signed in
function wireAuthState() {
    onAuthStateChanged(auth, async (user) => {
        const logoutBtn = document.getElementById("efLogout");
        if (logoutBtn) logoutBtn.style.display = user ? "inline-flex" : "none";
      
        const navLogout = document.getElementById("efNavLogout");
        if (navLogout) navLogout.style.display = user ? "inline-flex" : "none";
      
        const adminNav = document.getElementById("efAdminNavItem");
        if (!adminNav) return;
      
        if (!user) {
          adminNav.style.display = "none";
          stopLastSeenNavBlipListener();
          return;
        }
        
      
        // Only show admin link if user is in Firestore admins/{uid}
        const ok = await isUserAdmin(user.uid);
        adminNav.style.display = ok ? "list-item" : "none";
        if (ok) startLastSeenNavBlipListener();
else stopLastSeenNavBlipListener();

              });
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("[AuthUI] DOM ready");
  injectStyles();
  injectModal();
  injectCrestButton();
  wireAuthState();
});
