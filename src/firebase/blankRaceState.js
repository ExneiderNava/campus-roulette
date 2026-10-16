import { ref, update, set, get, serverTimestamp } from 'firebase/database';
import { database } from './config';
import { BLANK_RACE_QUESTIONS } from '../data/blankRaceQuestions';

const ROUND_DURATION = 45;

// -------- Init the game --------
export const startBlankRace = async (pin) => {
  await update(ref(database, `rooms/${pin}`), {
    gameType: 'blank-race',
    status: 'playing',
    startedAt: serverTimestamp(),
    game: {
      round: 0,
      totalRounds: BLANK_RACE_QUESTIONS.length,
      phase: 'idle',
      instructionsVisible: false,
      currentQuestion: null,
      roundStartTime: 0,
      timeLeft: ROUND_DURATION,
      answers: {},
      roundPointsAwarded: false,
    },
  });
};

// -------- Start a round --------
export const startBlankRaceRound = async (pin, round) => {
  const q = BLANK_RACE_QUESTIONS[(round - 1) % BLANK_RACE_QUESTIONS.length];
  await update(ref(database, `rooms/${pin}/game`), {
    round,
    phase: 'answering',
    currentQuestion: {
      template: q.template,
      blanks: q.blanks,
      hint: q.hint,
    },
    roundStartTime: Date.now(),
    timeLeft: ROUND_DURATION,
    answers: {},
    roundPointsAwarded: false,
  });
};

// -------- Player submits all blanks --------
export const submitBlankAnswer = async (pin, uid, name, values, isCorrect) => {
  const answerRef = ref(database, `rooms/${pin}/game/answers/${uid}`);
  const snap = await get(answerRef);
  if (snap.exists()) return false;

  const startSnap = await get(
    ref(database, `rooms/${pin}/game/roundStartTime`)
  );
  const startTime = startSnap.val() || Date.now();
  const elapsed = Math.round(((Date.now() - startTime) / 1000) * 10) / 10;

  await set(answerRef, {
    name,
    values,
    correct: isCorrect,
    submittedAt: serverTimestamp(),
    elapsed,
  });

  return true;
};

// -------- Show results --------
export const showBlankRaceResults = async (pin) => {
  await update(ref(database, `rooms/${pin}/game`), { phase: 'results' });
};

// -------- Award points --------
export const awardBlankRaceRound = async (pin) => {
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

// -------- Finish --------
export const finishBlankRace = async (pin) => {
  await update(ref(database, `rooms/${pin}`), {
    status: 'finished',
    'game/phase': 'finished',
  });
};

// -------- Instructions --------
export const setBlankRaceInstructionsVisible = async (pin, visible) => {
  await update(ref(database, `rooms/${pin}/game`), {
    instructionsVisible: visible,
  });
};