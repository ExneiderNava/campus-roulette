import { ref, update, get, serverTimestamp } from 'firebase/database';
import { database } from './config';
import {
  BATTLE_CITY_QUESTIONS,
  shuffleArray,
  assignTeams,
  pickPilot,
  generateWordPositions,
} from '../data/battleCityQuestions';

// -------- Init the game when host enters --------
export const startBattleCity = async (pin, players) => {
  const teams = assignTeams(players);
  const redPilot = pickPilot(teams.red);
  const bluePilot = pickPilot(teams.blue);

  await update(ref(database, `rooms/${pin}`), {
    gameType: 'battle-city',
    status: 'playing',
    startedAt: serverTimestamp(),
    game: {
      round: 0,
      totalRounds: BATTLE_CITY_QUESTIONS.length,
      phase: 'instructions',
      teams: {
        red: {
          members: teams.red,
          score: 0,
          pilotId: redPilot,
          placed: [],
          carrying: null,
          x: 0.25,
          y: 0.85,
          completedAt: null,
        },
        blue: {
          members: teams.blue,
          score: 0,
          pilotId: bluePilot,
          placed: [],
          carrying: null,
          x: 0.75,
          y: 0.85,
          completedAt: null,
        },
      },
      votes: { red: {}, blue: {} },
    },
  });
};

// -------- Start a new round --------
export const startBattleCityRound = async (pin, round) => {
  const q = BATTLE_CITY_QUESTIONS[(round - 1) % BATTLE_CITY_QUESTIONS.length];
  const scrambled = shuffleArray(q.words);
  const positions = generateWordPositions(scrambled);

  await update(ref(database, `rooms/${pin}/game`), {
    round,
    phase: 'playing',
    targetSentence: q.targetSentence,
    words: q.words,
    scrambled,
    wordPositions: positions,
    'teams/red/placed': [],
    'teams/red/carrying': null,
    'teams/red/x': 0.25,
    'teams/red/y': 0.85,
    'teams/red/completedAt': null,
    'teams/blue/placed': [],
    'teams/blue/carrying': null,
    'teams/blue/x': 0.75,
    'teams/blue/y': 0.85,
    'teams/blue/completedAt': null,
    votes: { red: {}, blue: {} },
  });
};

// -------- Pilot moves their car --------
export const movePilot = async (pin, team, x, y) => {
  await update(ref(database, `rooms/${pin}/game/teams/${team}`), { x, y });
};

// -------- Pilot picks up a word (if not carrying one) --------
export const pickUpWord = async (pin, team, word) => {
  await update(ref(database, `rooms/${pin}/game/teams/${team}`), {
    carrying: word,
  });
};

// -------- Pilot drops the carried word onto the next empty slot --------
// Returns true if the placement was correct, false if it was wrong
export const dropWord = async (pin, team, correctSequence) => {
  const teamRef = ref(database, `rooms/${pin}/game/teams/${team}`);
  const snap = await get(teamRef);
  const t = snap.val();
  if (!t || !t.carrying) return false;

  const nextIndex = t.placed?.length || 0;
  const expected = correctSequence[nextIndex];
  const correct = t.carrying === expected;

  if (correct) {
    await update(teamRef, {
      placed: [...(t.placed || []), t.carrying],
      carrying: null,
    });
    return true;
  } else {
    // Wrong: drop it back, lose the carried word
    await update(teamRef, { carrying: null });
    return false;
  }
};

// -------- Team member votes for a word --------
export const voteForWord = async (pin, team, uid, word) => {
  await update(ref(database, `rooms/${pin}/game/votes/${team}/${uid}`), word);
};

// -------- Mark a team as finished --------
export const markTeamComplete = async (pin, team) => {
  await update(ref(database, `rooms/${pin}/game/teams/${team}`), {
    completedAt: Date.now(),
  });
};

// -------- End the round (host calls once both teams are done or timeout) --------
export const endBattleCityRound = async (pin, winningTeam) => {
  if (winningTeam) {
    const teamRef = ref(database, `rooms/${pin}/game/teams/${winningTeam}`);
    const snap = await get(teamRef);
    const t = snap.val();
    await update(teamRef, { score: (t?.score || 0) + 100 });

    // +50 to each member
    const playersSnap = await get(ref(database, `rooms/${pin}/players`));
    const players = playersSnap.val() || {};
    for (const uid of t?.members || []) {
      const cur = players[uid]?.score || 0;
      await update(ref(database, `rooms/${pin}/players/${uid}`), {
        score: cur + 50,
      });
    }
  }
  await update(ref(database, `rooms/${pin}/game`), { phase: 'round-results' });
};

// -------- Finish the entire game --------
export const finishBattleCity = async (pin) => {
  await update(ref(database, `rooms/${pin}`), {
    status: 'finished',
    'game/phase': 'finished',
  });
};

// -------- Instructions modal --------
export const setBattleCityInstructionsVisible = async (pin, visible) => {
  await update(ref(database, `rooms/${pin}/game`), {
    instructionsVisible: visible,
  });
};