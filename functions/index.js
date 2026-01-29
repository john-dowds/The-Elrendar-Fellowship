const admin = require("firebase-admin");
admin.initializeApp();

// Gen 2 callable
const { onCall, HttpsError } = require("firebase-functions/v2/https");

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
  return `${d}@members.elrendar`;
}

async function assertIsAdmin(request) {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "You must be signed in.");

  const uid = auth.uid;
  const db = admin.firestore();
  const adminDoc = await db.collection("admins").doc(uid).get();
  if (!adminDoc.exists) throw new HttpsError("permission-denied", "Admins only.");

  return { uid, adminProfile: adminDoc.data() };
}

exports.setUserEnabled = onCall(
  { region: "us-central1" },
  async (request) => {
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
          disabled: !enabled,
        });
      } else {
        throw err;
      }
    }

    await admin.auth().updateUser(userRecord.uid, { disabled: !enabled });

    return { ok: true, email, uid: userRecord.uid, enabled };
  }
);
