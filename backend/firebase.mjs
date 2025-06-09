// firebase.js or firebase.mjs
import admin from "firebase-admin";
import serviceAccount from "./private-key-firebase.json" assert { type: "json" };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
