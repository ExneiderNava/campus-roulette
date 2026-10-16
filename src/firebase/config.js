import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// ⚠️ Reemplaza esto con TU firebaseConfig del paso 1C
const firebaseConfig = {
  apiKey: "AIzaSyBQgYjgBL_0TwfMwq3NzxvW6dUCkc-H1yw",
  authDomain: "campuslands-arcade.firebaseapp.com",
  databaseURL: "https://campuslands-arcade-default-rtdb.firebaseio.com",
  projectId: "campuslands-arcade",
  storageBucket: "campuslands-arcade.firebasestorage.app",
  messagingSenderId: "975478564235",
  appId: "1:975478564235:web:3e97a8888056f92a057b8e"
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);
export const auth = getAuth(app);
export default app;