import { ref, update, get, set, serverTimestamp } from 'firebase/database';
import { database } from './config';
import {
  IMPOSTOR_PAIRS,
  shuffleArray,
  pickImpostors,
} from '../data/impostorQuestions';

// -------- Init the game when host enters --------
export const startImpostor = async (pin, players, impostorCount) => {
  await update(ref(database, `rooms/${pin}`), {
    gameType: 'impostor',
    status: 'playing',
    startedAt: serverTimestamp(),
    game: {
      round: 0,
      totalRounds: 3,
      impostorCount,
      phase: 'instructions',
      instructionsVisible: false,
      players: players.map((p) => p.uid),
    },
  });
};

// -------- Start a new round --------
export const startImpostorRound = async (pin, round, playerIds, impostorCount) => {
  const pair = IMPOSTOR_PAIRS[(round - 1) % IMPOSTOR_PAIRS.length];
  const impostorIds = pickImpostors(playerIds, impostorCount);

  // Build per-player word assignments
  const assignments = {};
  playerIds.forEach((uid) => {
    assignments[uid] = impostorIds.includes(uid) ? pair.impostor : pair.citizen;
  });

  // Shuffle the order of players for the voting list
  const votingOrder = shuffleArray(playerIds);

  await update(ref(database, `rooms/${pin}/game`), {
    round,
    phase: 'reveal',
    citizenWord: pair.citizen,
    impostorWord: pair.impostor,
    topic: pair.topic,
    impostorIds,
    assignments,
    votingOrder,
    clues: {},
    votes: {},
    revealedAt: null,
  });
};

// -------- Submit a clue --------
export const submitClue = async (pin, uid, text) => {
  await update(ref(database, `rooms/${pin}/game/clues/${uid}`), {
    text: text.trim(),
    submittedAt: Date.now(),
  });
};

// -------- Submit a vote --------
export const submitVote = async (pin, voterId, targetId) => {
  await set(ref(database, `rooms/${pin}/game/votes/${voterId}`), targetId);
};

// -------- Host advances to the next phase --------
export const setImpostorPhase = async (pin, phase) => {
  await update(ref(database, `rooms/${pin}/game`), { phase });
};

// -------- Show results: compute winners --------
export const showImpostorResults = async (pin) => {
  const gameRef = ref(database, `rooms/${pin}/game`);
  const snap = await get(gameRef);
  const g = snap.val();
  if (!g) return;

  const votes = g.votes || {};
  const impostorIds = g.impostorIds || [];

  // Count votes per target
  const tally = {};
  Object.values(votes).forEach((targetId) => {
    tally[targetId] = (tally[targetId] || 0) + 1;
  });

  // Find the player(s) with the most votes
  let maxVotes = 0;
  let mostVoted = [];
  Object.entries(tally).forEach(([uid, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      mostVoted = [uid];
    } else if (count === maxVotes) {
      mostVoted.push(uid);
    }
  });

  // Citizens win if at least one impostor was the most voted
  const caughtImpostor = mostVoted.some((uid) => impostorIds.includes(uid));

  await update(ref(database, `rooms/${pin}/game`), {
    phase: 'results',
    voteTally: tally,
    mostVoted,
    caughtImpostor,
    revealedAt: Date.now(),
  });
};

// -------- Award points --------
export const awardImpostorRound = async (pin) => {
  const roomRef = ref(database, `rooms/${pin}`);
  const snap = await get(roomRef);
  const room = snap.val();
  if (!room?.game) return;
  const g = room.game;

  const playersRef = ref(database, `rooms/${pin}/players`);
  const playersSnap = await get(playersRef);
  const players = playersSnap.val() || {};

  const winners = g.caughtImpostor
    ? Object.keys(players).filter(
        (uid) => !g.impostorIds?.includes(uid) && !players[uid].isHost
      )
    : g.impostorIds || [];

  for (const uid of winners) {
    const cur = players[uid]?.score || 0;
    await update(ref(database, `rooms/${pin}/players/${uid}`), {
      score: cur + 150,
    });
  }

  await update(ref(database, `rooms/${pin}/game`), { pointsAwarded: true });
};

// -------- Finish the game --------
export const finishImpostor = async (pin) => {
  await update(ref(database, `rooms/${pin}`), {
    status: 'finished',
    'game/phase': 'finished',
  });
};

// -------- Instructions modal --------
export const setImpostorInstructionsVisible = async (pin, visible) => {
  await update(ref(database, `rooms/${pin}/game`), {
    instructionsVisible: visible,
  });
};