// functions/index.js

const admin = require("firebase-admin");
admin.initializeApp();

const {
  onCall,
  onRequest,
  HttpsError
} = require("firebase-functions/v2/https");

const {
  onDocumentCreated
} = require("firebase-functions/v2/firestore");

const REGION = "us-central1";
const EMAIL_DOMAIN = "members.elrendar";
const TEMP_PASSWORD = "HighHome101";

// ----------------------------
// Helpers
// ----------------------------
function normalizeDiscord(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "");
}

function discordToEmail(discord) {
  const d = normalizeDiscord(discord);
  if (!d) throw new Error("Invalid Discord");
  return `${d}@${EMAIL_DOMAIN}`;
}

async function assertIsAdminFromRequest(req) {
  const authHeader = req.get("Authorization") || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) throw new Error("missing_auth");

  const decoded = await admin.auth().verifyIdToken(match[1]);
  const uid = decoded.uid;

  const adminDoc = await admin.firestore().collection("admins").doc(uid).get();
  if (!adminDoc.exists) throw new Error("admins_only");

  return uid;
}

// ----------------------------
// Callable: legacy admin enable (kept for safety / internal use)
// ----------------------------
exports.setUserEnabled = onCall({ region: REGION }, async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "Login required.");

  const adminDoc = await admin.firestore().collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Admins only.");
  }

  const discord = request.data?.discord;
  const enabled = !!request.data?.enabled;
  const email = discordToEmail(discord);

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      userRecord = await admin.auth().createUser({
        email,
        password: TEMP_PASSWORD,
        disabled: !enabled
      });

      await admin.firestore().collection("userAuth").doc(userRecord.uid).set({
        mustChangePassword: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      throw err;
    }
  }

  await admin.auth().updateUser(userRecord.uid, {
    disabled: !enabled
  });

  return { ok: true };
});

// ----------------------------
// Firestore Trigger: Application submitted
// Policy A: ONLY create Auth/userAuth for MAIN applications
// ----------------------------
exports.onApplicationCreate = onDocumentCreated(
  { region: REGION, document: "applications/{appId}" },
  async (event) => {
    const data = event.data?.data();
    if (!data || !data.discord) return;

    // Policy A: skip alts entirely
    // Prefer explicit appType, fallback to "main" field presence
    const appType = String(data.appType || (data.main ? "alt" : "main")).toLowerCase();
    if (appType === "alt") return;

    const email = discordToEmail(data.discord);

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      return; // user already exists
    } catch (err) {
      if (err.code !== "auth/user-not-found") {
        console.error("Lookup error:", err);
        return;
      }
    }

    try {
      userRecord = await admin.auth().createUser({
        email,
        password: TEMP_PASSWORD,
        disabled: true
      });

      await admin.firestore().collection("userAuth").doc(userRecord.uid).set({
        mustChangePassword: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error("Create user error:", err);
    }
  }
);

// ----------------------------
// HTTP CORS-safe Admin Endpoint
// ----------------------------
exports.setUserEnabledHttp = onRequest(
  { region: REGION, cors: true },
  async (req, res) => {
    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      await assertIsAdminFromRequest(req);

      const discord = req.body?.discord;
      const enabled = !!req.body?.enabled;
      const email = discordToEmail(discord);

      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
      } catch (err) {
        if (err.code === "auth/user-not-found") {
          userRecord = await admin.auth().createUser({
            email,
            password: TEMP_PASSWORD,
            disabled: !enabled
          });

          await admin.firestore().collection("userAuth").doc(userRecord.uid).set({
            mustChangePassword: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          throw err;
        }
      }

      await admin.auth().updateUser(userRecord.uid, {
        disabled: !enabled
      });

      res.json({
        ok: true,
        uid: userRecord.uid,
        enabled
      });

    } catch (err) {
      console.error("setUserEnabledHttp error:", err);
      res.status(500).json({ ok: false, error: err.message || "internal" });
    }
  }
);

// ============================================================
// DM Assist — Realtime Database Session Functions
// ============================================================

// small helpers
function rid(len = 12) {
  return Math.random().toString(36).slice(2, 2 + len);
}

function randDigits(n = 5) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
}

function normalizePin(pin) {
  return String(pin || "").trim();
}

function isValidPin(pin) {
  return /^\d{5}$/.test(pin);
}

async function assertCallableAdmin(request) {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "Login required.");

  const adminDoc = await admin.firestore().collection("admins").doc(auth.uid).get();
  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Admins only.");
  }

  return auth.uid;
}

// ------------------------------------------------------------
// Callable: createEvent (DM creates session + PIN)
// ------------------------------------------------------------
exports.createEvent = onCall({ region: REGION }, async (request) => {
  const dmUid = await assertCallableAdmin(request);
  const db = admin.database();

  const eventId = `evt_${rid(14)}`;

  // generate unique 5-digit PIN
  let pin = randDigits(5);
  for (let i = 0; i < 25; i++) {
    const snap = await db.ref(`pins/${pin}`).get();
    if (!snap.exists()) break;
    pin = randDigits(5);
  }

  // map PIN -> event
  await db.ref(`pins/${pin}`).set({
    eventId,
    createdAt: Date.now()
  });

  // initialize event
  await db.ref(`liveEvents/${eventId}/meta`).set({
    eventId,
    pin,
    dmUid,
    createdAt: Date.now(),
    active: true,
    endedAt: null
  });

  await db.ref(`liveEvents/${eventId}/monsters`).set({});
  await db.ref(`liveEvents/${eventId}/players`).set({});

  return { eventId, pin };
});

// ------------------------------------------------------------
// Callable: joinByPin (player joins DM session)
// ------------------------------------------------------------
exports.joinByPin = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Login required.");
  }

  const pin = normalizePin(request.data?.pin);
  if (!isValidPin(pin)) {
    throw new HttpsError("invalid-argument", "PIN must be 5 digits.");
  }

  const db = admin.database();
  const pinSnap = await db.ref(`pins/${pin}`).get();
  if (!pinSnap.exists()) {
    throw new HttpsError("not-found", "No active event for that PIN.");
  }

  const eventId = pinSnap.val().eventId;
  const metaSnap = await db.ref(`liveEvents/${eventId}/meta`).get();
  const meta = metaSnap.val();

  if (!meta || !meta.active || meta.endedAt) {
    throw new HttpsError("failed-precondition", "That event has ended.");
  }

  const uid = request.auth.uid;

  await db.ref(`liveEvents/${eventId}/players/${uid}`).update({
    id: uid,
    uid,
    joinedAt: admin.database.ServerValue.TIMESTAMP,
    updatedAt: admin.database.ServerValue.TIMESTAMP,
    name: "Player",
    hp: 15
  });

  return { eventId, playerId: uid };
});

// ------------------------------------------------------------
// Callable: endEvent (DM ends session)
// ------------------------------------------------------------
exports.endEvent = onCall({ region: REGION }, async (request) => {
  const dmUid = await assertCallableAdmin(request);
  const eventId = String(request.data?.eventId || "").trim();
  if (!eventId) {
    throw new HttpsError("invalid-argument", "eventId required.");
  }

  const db = admin.database();
  const metaRef = db.ref(`liveEvents/${eventId}/meta`);
  const metaSnap = await metaRef.get();

  if (!metaSnap.exists()) {
    throw new HttpsError("not-found", "Event not found.");
  }

  const meta = metaSnap.val();
  if (meta.dmUid !== dmUid) {
    throw new HttpsError("permission-denied", "Only the DM may end this event.");
  }

  // invalidate PIN
  if (meta.pin) {
    await db.ref(`pins/${meta.pin}`).remove();
  }

  await metaRef.update({
    active: false,
    endedAt: Date.now()
  });

  return { ok: true };
});
