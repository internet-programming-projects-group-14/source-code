// firebase.js or firebase.mjs
import admin from "firebase-admin";
import { serviceAccount } from "./index.mjs";


if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
