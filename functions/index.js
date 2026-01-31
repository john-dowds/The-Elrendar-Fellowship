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
// ----------------------------
exports.onApplicationCreate = onDocumentCreated(
  { region: REGION, document: "applications/{appId}" },
  async (event) => {
    const data = event.data?.data();
    if (!data || !data.discord) return;

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
