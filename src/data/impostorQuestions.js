// Each entry is a pair: what citizens see vs what impostors see.
// Both are similar enough to be plausible but different enough to be suspicious.

export const IMPOSTOR_PAIRS = [
  {
    citizen: 'not to delete the logs',
    impostor: 'not to remove the logs',
    topic: 'Data protection',
  },
  {
    citizen: 'not to use public Wi-Fi',
    impostor: 'not to use public networks',
    topic: 'Network security',
  },
  {
    citizen: 'not to share the API key',
    impostor: 'not to share the access token',
    topic: 'Credentials',
  },
  {
    citizen: 'not to restart the server now',
    impostor: 'not to reboot the server now',
    topic: 'Infrastructure',
  },
  {
    citizen: 'not to install unauthorized apps',
    impostor: 'not to install untrusted software',
    topic: 'Endpoint security',
  },
  {
    citizen: 'not to store data in plain text',
    impostor: 'not to save data in plain text',
    topic: 'Data storage',
  },
  {
    citizen: 'not to write passwords on paper',
    impostor: 'not to write credentials on paper',
    topic: 'Password policy',
  },
  {
    citizen: 'not to use the old firewall',
    impostor: 'not to use the legacy firewall',
    topic: 'Perimeter security',
  },
  {
    citizen: 'not to deploy on a Friday',
    impostor: 'not to release on a Friday',
    topic: 'DevOps',
  },
  {
    citizen: 'not to push code yet',
    impostor: 'not to merge code yet',
    topic: 'Version control',
  },
];

// Shuffle utility
export const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Pick N random impostor IDs from the list of player IDs
export const pickImpostors = (playerIds, count) => {
  const shuffled = shuffleArray(playerIds);
  return shuffled.slice(0, Math.min(count, Math.max(1, playerIds.length - 2)));
};

// Validates a clue (non-empty, max 60 chars)
export const validateClue = (text) => {
  if (!text) return false;
  const t = text.trim();
  return t.length >= 2 && t.length <= 60;
};