const admin = require("firebase-admin");
admin.initializeApp();

const { onCall, HttpsError } = require("firebase-functions/v2/https");

exports.setUserEnabled = onCall({ region: "us-central1" }, async (request) => {
  // ...
});const { onDocumentCreated } = require("firebase-functions/v2/firestore");

const REGION = "us-central1";
const TEMP_PASSWORD = "HighHome101";
const EMAIL_DOMAIN = "members.elrendar";

function normalizeDiscord(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "");
}
function discordToEmail(discord) {
  const d = normalizeDiscord(discord);
  if (!d) throw new HttpsError("invalid-argument", "Discord is required.");
  return `${d}@${EMAIL_DOMAIN}`;
}

async function assertIsAdmin(request) {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "You must be signed in.");
  const uid = auth.uid;
  const adminDoc = await admin.firestore().collection("admins").doc(uid).get();
  if (!adminDoc.exists) throw new HttpsError("permission-denied", "Admins only.");
  return { uid, adminProfile: adminDoc.data() };
}


exports.setUserEnabled = onCall({ region: REGION }, async (request) => {
  await assertIsAdmin(request);

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
    } else {
      throw err;
    }
  }

  await admin.auth().updateUser(userRecord.uid, {
    disabled: !enabled
  });

  return { ok: true, email, uid: userRecord.uid, enabled };
});

exports.onApplicationCreate = onDocumentCreated(
  { region: REGION, document: "applications/{appId}" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const discord = data.discord;
    if (!discord) return;

    const email = `${normalizeDiscord(discord)}@${EMAIL_DOMAIN}`;

    try {
      await admin.auth().getUserByEmail(email);
      return;
    } catch (err) {
      if (err.code !== "auth/user-not-found") {
        console.error("onApplicationCreate: getUserByEmail error", err);
        return;
      }
    }

    try {
      await admin.auth().createUser({
        email,
        password: TEMP_PASSWORD,
        disabled: true
      });
    } catch (err) {
      console.error("onApplicationCreate: createUser error", err);
    }
    const { onRequest } = require("firebase-functions/v2/https");

function setCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

exports.setUserEnabledHttp = onRequest({ region: REGION }, async (req, res) => {
  setCors(res);

  // Preflight
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    // Verify Firebase ID token from Authorization header
    const authHeader = req.get("Authorization") || "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      res.status(401).json({ ok: false, error: "missing_auth" });
      return;
    }

    const decoded = await admin.auth().verifyIdToken(match[1]);
    const uid = decoded.uid;

    // Admin check (same as assertIsAdmin)
    const adminDoc = await admin.firestore().collection("admins").doc(uid).get();
    if (!adminDoc.exists) {
      res.status(403).json({ ok: false, error: "admins_only" });
      return;
    }

    const discord = req.body?.discord;
    const enabled = !!req.body?.enabled;

    if (!discord) {
      res.status(400).json({ ok: false, error: "discord_required" });
      return;
    }

    const email = `${normalizeDiscord(discord)}@${EMAIL_DOMAIN}`;

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
      } else {
        throw err;
      }
    }

    await admin.auth().updateUser(userRecord.uid, { disabled: !enabled });

    res.json({ ok: true, email, uid: userRecord.uid, enabled });
  } catch (err) {
    console.error("setUserEnabledHttp error:", err);
    res.status(500).json({ ok: false, error: "internal" });
  }
});

  }
  
);
