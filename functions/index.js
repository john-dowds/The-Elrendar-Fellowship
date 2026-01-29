const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

function normalizeDiscord(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "");
}

function discordToEmail(discord) {
  const d = normalizeDiscord(discord);
  if (!d) throw new functions.https.HttpsError("invalid-argument", "Discord is required.");
  return `${d}@members.elrendar`;
}

async function assertIsAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be signed in.");
  }
  const uid = context.auth.uid;
  const db = admin.firestore();
  const adminDoc = await db.collection("admins").doc(uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }
  return { uid, adminProfile: adminDoc.data() };
}

exports.setUserEnabled = functions.https.onCall(async (data, context) => {
  await assertIsAdmin(context);

  const discord = data?.discord;
  const enabled = !!data?.enabled;
  const email = discordToEmail(discord);

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      userRecord = await admin.auth().createUser({
        email,
        disabled: !enabled
      });
    } else {
      throw err;
    }
  }

  await admin.auth().updateUser(userRecord.uid, {
    disabled: !enabled
  });

  return {
    ok: true,
    email,
    uid: userRecord.uid,
    enabled
  };
});
