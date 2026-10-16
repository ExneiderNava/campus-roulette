import {
  ref,
  set,
  get,
  update,
  onValue,
  off,
  remove,
  serverTimestamp,
} from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { database, auth } from './config';

// Generates a 6-char PIN (no confusing letters)
const generatePin = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
};

// Ensures the user has an anonymous session
export const ensureAuth = async () => {
  if (!auth.currentUser) {
    const cred = await signInAnonymously(auth);
    return cred.user;
  }
  return auth.currentUser;
};

// Creates a new room (host only)
export const createRoom = async (hostName = 'Host', gameType = 'lobby') => {
  const user = await ensureAuth();
  const pin = generatePin();

  const roomRef = ref(database, `rooms/${pin}`);
  await set(roomRef, {
    hostId: user.uid,
    hostName,
    gameType,
    status: 'waiting', // waiting | playing | finished
    currentQuestion: 0,
    createdAt: serverTimestamp(),
    players: {
      [user.uid]: {
        name: hostName,
        score: 0,
        isHost: true,
        joinedAt: serverTimestamp(),
      },
    },
  });

  return { pin, uid: user.uid };
};

// Checks if a room exists
export const roomExists = async (pin) => {
  const snap = await get(ref(database, `rooms/${pin}`));
  return snap.exists();
};

// Joins a player to the room
export const joinRoom = async (pin, playerName) => {
  const user = await ensureAuth();
  const roomRef = ref(database, `rooms/${pin}`);

  const snap = await get(roomRef);
  if (!snap.exists()) {
    throw new Error('Room not found');
  }

  await update(ref(database, `rooms/${pin}/players/${user.uid}`), {
    name: playerName,
    score: 0,
    isHost: false,
    joinedAt: serverTimestamp(),
  });

  return { pin, uid: user.uid };
};

// Listens to changes in a room (players, status, etc.)
export const subscribeToRoom = (pin, callback) => {
  const roomRef = ref(database, `rooms/${pin}`);
  const unsubscribe = onValue(roomRef, (snap) => {
    callback(snap.val());
  });
  return () => off(roomRef, 'value', unsubscribe);
};

// Updates room state (host only)
export const updateRoom = async (pin, updates) => {
  await update(ref(database, `rooms/${pin}`), updates);
};

// Leaves a room
export const leaveRoom = async (pin, uid) => {
  await remove(ref(database, `rooms/${pin}/players/${uid}`));
};

// Updates a player's score
export const updatePlayerScore = async (pin, uid, score) => {
  await update(ref(database, `rooms/${pin}/players/${uid}`), { score });
};