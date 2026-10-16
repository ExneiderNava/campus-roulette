import { ref, update, set, get, serverTimestamp } from 'firebase/database';
import { database } from './config';
import { BUG_HUNTER_QUESTIONS } from '../data/bugHunterQuestions';

const ROUND_DURATION = 30;

// -------- Init the game --------
export const startBugHunter = async (pin) => {
  await update(ref(database, `rooms/${pin}`), {
    gameType: 'bug-hunter',
    status: 'playing',
    startedAt: serverTimestamp(),
    game: {
      round: 0,
      totalRounds: BUG_HUNTER_QUESTIONS.length,
      phase: 'idle', // idle | answering | results | finished
      instructionsVisible: false,
      currentQuestion: null,
      roundStartTime: 0,
      timeLeft: ROUND_DURATION,
      answers: {},
      roundPointsAwarded: false,
    },
  });
};

// -------- Start a specific round --------
export const startBugHunterRound = async (pin, round) => {
  const q = BUG_HUNTER_QUESTIONS[(round - 1) % BUG_HUNTER_QUESTIONS.length];
  await update(ref(database, `rooms/${pin}/game`), {
    round,
    phase: 'answering',
    currentQuestion: {
      buggy: q.buggy,
      correct: q.correct,
      hint: q.hint,
    },
    roundStartTime: Date.now(),
    timeLeft: ROUND_DURATION,
    answers: {},
    roundPointsAwarded: false,
  });
};

// -------- Player submits an answer --------
export const submitBugAnswer = async (pin, uid, name, text, isCorrect) => {
  const answerRef = ref(database, `rooms/${pin}/game/answers/${uid}`);
  const snap = await get(answerRef);
  if (snap.exists()) return false;

  const startSnap = await get(ref(database, `rooms/${pin}/game/roundStartTime`));
  const startTime = startSnap.val() || Date.now();
  const elapsed = Math.round(((Date.now() - startTime) / 1000) * 10) / 10;

  await set(answerRef, {
    name,
    text: text.trim(),
    correct: isCorrect,
    submittedAt: serverTimestamp(),
    elapsed,
  });

  return true;
};

// -------- Show results --------
export const showBugHunterResults = async (pin) => {
  await update(ref(database, `rooms/${pin}/game`), { phase: 'results' });
};

// -------- Award points for the round --------
export const awardBugHunterRound = async (pin) => {
  const roomRef = ref(database, `rooms/${pin}`);
  const snap = await get(roomRef);
  const room = snap.val();
  if (!room?.game) return false;
  if (room.game.roundPointsAwarded) return false;

  const answers = room.game.answers || {};
  const playersSnap = await get(ref(database, `rooms/${pin}/players`));
  const players = playersSnap.val() || {};

  const correct = Object.entries(answers)
    .filter(([, a]) => a.correct)
    .map(([uid, a]) => ({ uid, elapsed: a.elapsed }))
    .sort((a, b) => a.elapsed - b.elapsed);

  const pointsByRank = [150, 100, 50];
  for (let i = 0; i < correct.length; i++) {
    const { uid } = correct[i];
    const points = i < pointsByRank.length ? pointsByRank[i] : 25;
    const cur = players[uid]?.score || 0;
    await update(ref(database, `rooms/${pin}/players/${uid}`), {
      score: cur + points,
    });
  }

  await update(ref(database, `rooms/${pin}/game`), {
    roundPointsAwarded: true,
  });
  return true;
};

// -------- Finish the game --------
export const finishBugHunter = async (pin) => {
  await update(ref(database, `rooms/${pin}`), {
    status: 'finished',
    'game/phase': 'finished',
  });
};

// -------- Instructions --------
export const setBugHunterInstructionsVisible = async (pin, visible) => {
  await update(ref(database, `rooms/${pin}/game`), {
    instructionsVisible: visible,
  });
};