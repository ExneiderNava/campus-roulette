// Each question is a complete sentence that teams must build in order.
// Words come scrambled and teams place them left to right.

export const BATTLE_CITY_QUESTIONS = [
  {
    targetSentence: 'I told him not to delete the logs',
    words: ['I', 'told', 'him', 'not', 'to', 'delete', 'the', 'logs'],
  },
  {
    targetSentence: 'The admin asked me not to use public Wi-Fi',
    words: ['The', 'admin', 'asked', 'me', 'not', 'to', 'use', 'public', 'Wi-Fi'],
  },
  {
    targetSentence: 'She told the team not to share the API key',
    words: ['She', 'told', 'the', 'team', 'not', 'to', 'share', 'the', 'API', 'key'],
  },
  {
    targetSentence: 'They asked us not to restart the server now',
    words: ['They', 'asked', 'us', 'not', 'to', 'restart', 'the', 'server', 'now'],
  },
  {
    targetSentence: 'HR told the staff not to install unauthorized apps',
    words: ['HR', 'told', 'the', 'staff', 'not', 'to', 'install', 'unauthorized', 'apps'],
  },
];

// Fisher-Yates shuffle (returns a new array)
export const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Assigns teams randomly, splitting players 50/50 (or as close as possible)
export const assignTeams = (players) => {
  const shuffled = shuffleArray(players);
  const half = Math.ceil(shuffled.length / 2);
  return {
    red: shuffled.slice(0, half).map((p) => p.uid),
    blue: shuffled.slice(half).map((p) => p.uid),
  };
};

// Picks a random pilot from a team's members
export const pickPilot = (memberIds) => {
  if (memberIds.length === 0) return null;
  return memberIds[Math.floor(Math.random() * memberIds.length)];
};

// Generates random positions for each word on the field
// Field is a normalized 0-1 space; the frontend maps it to actual pixels.
export const generateWordPositions = (words) => {
  const positions = {};
  const cols = 4;
  const rows = Math.ceil(words.length / cols);
  words.forEach((word, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions[word] = {
      x: 0.15 + (col / Math.max(1, cols - 1)) * 0.7,
      y: 0.3 + (row / Math.max(1, rows - 1 || 1)) * 0.5,
    };
  });
  return positions;
};