// Sentences taken from the IT English PDF (Negative Infinitives module)
// The "phrase" is what the wheel shows. The player must turn it into a negative.

export const NEGATIVE_ROULETTE_QUESTIONS = [
  {
    phrase: 'Delete the logs',
    correctAnswer: 'not to delete the logs',
    hint: 'I told him ______.',
  },
  {
    phrase: 'Use public Wi-Fi',
    correctAnswer: 'not to use public Wi-Fi',
    hint: 'The admin asked me ______.',
  },
  {
    phrase: 'Share the API key',
    correctAnswer: 'not to share the API key',
    hint: 'She told the team ______.',
  },
  {
    phrase: 'Restart the server now',
    correctAnswer: 'not to restart the server now',
    hint: 'They asked us ______.',
  },
  {
    phrase: 'Install unauthorized apps',
    correctAnswer: 'not to install unauthorized apps',
    hint: 'HR told the staff ______.',
  },
  {
    phrase: 'Store data in plain text',
    correctAnswer: 'not to store data in plain text',
    hint: 'The CTO asked us ______.',
  },
  {
    phrase: 'Write passwords on paper',
    correctAnswer: 'not to write passwords on paper',
    hint: 'Security told everyone ______.',
  },
  {
    phrase: 'Use the old firewall',
    correctAnswer: 'not to use the old firewall',
    hint: 'We would like ______ anymore.',
  },
  {
    phrase: 'Deploy on a Friday',
    correctAnswer: 'not to deploy on a Friday',
    hint: 'The Lead asked me ______.',
  },
  {
    phrase: 'Push code yet',
    correctAnswer: 'not to push code yet',
    hint: 'I asked the team ______.',
  },
];

// Validates a player's answer (case-insensitive, tolerant of extra spaces)
export const validateAnswer = (userAnswer, correctAnswer) => {
  if (!userAnswer) return false;
  const normalize = (s) =>
    s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')       // collapse multiple spaces
      .replace(/[.,!?;:]+$/g, ''); // strip trailing punctuation

  return normalize(userAnswer) === normalize(correctAnswer);
};