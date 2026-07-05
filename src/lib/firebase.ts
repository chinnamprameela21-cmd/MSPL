// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, remove, update, push, onValue, query, orderByChild, equalTo, child } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAwG5oVB0KGf16jD7zTBuLpwH01Ju6oTvE",
  authDomain: "mspl-attendance.firebaseapp.com",
  databaseURL: "https://mspl-attendance-default-rtdb.firebaseio.com",
  projectId: "mspl-attendance",
  storageBucket: "mspl-attendance.firebasestorage.app",
  messagingSenderId: "796741291694",
  appId: "1:796741291694:web:202f12e35622068f80273f",
  measurementId: "G-YC8N1WC6MS"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const storage = getStorage(app);

export { 
  app, 
  database, 
  auth,  // ← This is what HrPortal needs
  analytics,  // ← Google Analytics
  ref, 
  set, 
  get, 
  remove, 
  update, 
  push, 
  onValue, 
  query, 
  orderByChild, 
  equalTo,
  child
};
export { storage, storageRef, uploadBytes, getDownloadURL, deleteObject };