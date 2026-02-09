import { auth, functions, rtdb } from "./firebase-init.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-functions.js";
import {
  ref,
  onValue,
  set,
  update,
  off
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";
import {
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

function onceAuthReady() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub();
      resolve();
    });
  });
}

async function ensureSignedIn() {
  // DM will already be logged in via your auth-ui flow.
  // Players can be anonymous.
  await onceAuthReady();
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

export class FirebaseAdapter {
  constructor() {
    this._cCreate = httpsCallable(functions, "createEvent");
    this._cJoin = httpsCallable(functions, "joinByPin");
    this._cEnd = httpsCallable(functions, "endEvent");
  }

  // DM: create live event + pin
  async createEvent() {
    await ensureSignedIn();
    const res = await this._cCreate({});
    return res.data; // { eventId, pin }
  }

  // Player: join by pin
  async joinEvent(pin) {
    await ensureSignedIn();
    const res = await this._cJoin({ pin: String(pin || "").trim() });
    return res.data; // { eventId, playerId }
  }

  // DM: end live event
  async endEvent(eventId) {
    await ensureSignedIn();
    const res = await this._cEnd({ eventId: String(eventId || "").trim() });
    return res.data; // { ok:true }
  }

  // DM: publish monsters payload
  async publishMonsters(eventId, monstersObj) {
    await ensureSignedIn();
    const path = `liveEvents/${eventId}/monsters`;
    await set(ref(rtdb, path), monstersObj || {});
  }

  // Player: subscribe to monsters payload
  subscribeMonsters(eventId, cb) {
    const r = ref(rtdb, `liveEvents/${eventId}/monsters`);
    const handler = (snap) => cb(snap.val());
    onValue(r, handler);
    return () => off(r, "value", handler);
  }

  // Player: publish player payload
  async publishPlayer(eventId, playerId, playerObj) {
    await ensureSignedIn();
    const path = `liveEvents/${eventId}/players/${playerId}`;
    // update keeps joinedAt etc that server wrote; set would overwrite
    await update(ref(rtdb, path), {
      ...(playerObj || {}),
      id: playerId,
      uid: playerId,
      updatedAt: Date.now()
    });
  }

  // DM: subscribe to players collection
  subscribePlayers(eventId, cb) {
    const r = ref(rtdb, `liveEvents/${eventId}/players`);
    const handler = (snap) => cb(snap.val());
    onValue(r, handler);
    return () => off(r, "value", handler);
  }
}

window.FirebaseAdapter = FirebaseAdapter;
