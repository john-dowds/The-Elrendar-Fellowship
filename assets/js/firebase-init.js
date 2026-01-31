// assets/js/firebase-init.js
// Firebase modular SDK via CDN

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-functions.js";

const firebaseConfig = {
    apiKey: "AIzaSyBuh70Dl0RiHtxIfAGI2yfbMIHD_di6LGA",
    authDomain: "elrendar-fellowship.firebaseapp.com",
    projectId: "elrendar-fellowship",
    storageBucket: "elrendar-fellowship.firebasestorage.app",
    messagingSenderId: "300802961252",
    appId: "1:300802961252:web:c683ed87cc6b4ed096d471"
  };

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");




