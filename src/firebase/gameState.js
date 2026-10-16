import { ref, update, get, serverTimestamp } from 'firebase/database';
import { database } from './config';

// Starts a Negative Roulette game in a room
export const startNegativeRoulette = async (pin, totalRounds = 10) => {
  await update(ref(database, `rooms/${pin}`), {
    gameType: 'negative-roulette',
    status: 'playing',
    startedAt: serverTimestamp(),
    game: {
      round: 0,
      totalRounds,
      phase: 'idle', // idle | spinning | answering | results | finished
      currentPhrase: '',
      correctAnswer: '',
      hint: '',
      roundStartTime: 0,
      timeLeft: 30,
      answers: {},
    },
  });
};

// Called by the host when the wheel lands on a phrase
export const setRoundPhrase = async (pin, round, question) => {
  await update(ref(database, `rooms/${pin}/game`), {
    round,
    phase: 'answering',
    currentPhrase: question.phrase,
    correctAnswer: question.correctAnswer,
    hint: question.hint,
    roundStartTime: Date.now(),
    timeLeft: 30,
    answers: {},
  });
};

// A player submits an answer
export const submitAnswer = async (pin, uid, name, text, isCorrect) => {
  const answerRef = ref(database, `rooms/${pin}/game/answers/${uid}`);
  const snap = await get(answerRef);

  // Ignore if the player already answered this round
  if (snap.exists()) return false;

  const elapsed = (Date.now() - (await getRoundStartTime(pin))) / 1000;

  await update(ref(database, `rooms/${pin}/game/answers/${uid}`), {
    name,
    text,
    correct: isCorrect,
    submittedAt: serverTimestamp(),
    elapsed: Math.round(elapsed * 10) / 10,
  });

  return true;
};

// Helper: get the current round's start time
const getRoundStartTime = async (pin) => {
  const snap = await get(ref(database, `rooms/${pin}/game/roundStartTime`));
  return snap.val() || Date.now();
};

// Move the game to results phase
export const showRoundResults = async (pin) => {
  await update(ref(database, `rooms/${pin}/game`), {
    phase: 'results',
  });
};

// Finish the game
export const finishGame = async (pin) => {
  await update(ref(database, `rooms/${pin}`), {
    status: 'finished',
    'game/phase': 'finished',
  });
};

// Add points to a player
export const addPoints = async (pin, uid, points) => {
  const playerRef = ref(database, `rooms/${pin}/players/${uid}/score`);
  const snap = await get(playerRef);
  const current = snap.val() || 0;
  await update(ref(database, `rooms/${pin}/players/${uid}`), {
    score: current + points,
  });
};

// Sets the target phrase that the wheel must land on, before it spins.
// Both the host and the players will animate the wheel to this phrase.
export const setTargetPhrase = async (pin, phrase, round) => {
  await update(ref(database, `rooms/${pin}/game`), {
    targetPhrase: phrase,
    round,
    phase: 'spinning',
    answers: {},
  });
};

// Called by the host when the wheel animation finishes on their screen.
// This locks the current phrase in place so players can start answering.
export const lockAnsweringPhase = async (pin, question) => {
  await update(ref(database, `rooms/${pin}/game`), {
    phase: 'answering',
    currentPhrase: question.phrase,
    correctAnswer: question.correctAnswer,
    hint: question.hint,
    roundStartTime: Date.now(),
    timeLeft: 30,
  });
};

// Shows or hides the instruction modal for everyone in the room
export const setInstructionsVisible = async (pin, visible) => {
  await update(ref(database, `rooms/${pin}/game`), {
    instructionsVisible: visible,
  });
};

// Resets the room back to lobby state.
// Called by the host when they leave the game early.
export const resetRoomToLobby = async (pin) => {
  await update(ref(database, `rooms/${pin}`), {
    gameType: 'lobby',
    status: 'waiting',
    game: null,
  });
};