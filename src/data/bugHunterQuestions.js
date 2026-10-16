// Each question shows a sentence with a mistake. Players must write the fix.
// Based on the PDF's Exercise 4: "Identify the error and fix it."

export const BUG_HUNTER_QUESTIONS = [
  {
    buggy: 'The Lead told me to no touch the production server.',
    correct: 'not to touch',
    hint: 'Replace "to no touch" with the correct negative infinitive.',
  },
  {
    buggy: 'We would like to not use this software anymore.',
    correct: 'not to use',
    hint: 'Remember: "not" comes before "to".',
  },
  {
    buggy: "I asked them don't to send the newsletter yet.",
    correct: 'not to send',
    hint: 'Use "not to" + verb, never "don\'t to".',
  },
  {
    buggy: 'He told the user no to click the link.',
    correct: 'not to click',
    hint: 'The correct negative infinitive is "not to click".',
  },
  {
    buggy: 'Would you like no to join the meeting?',
    correct: 'not to join',
    hint: 'Use "not to join", not "no to join".',
  },
  {
    buggy: 'She told the team to not share the API key.',
    correct: 'not to share',
    hint: 'The structure is "not to + verb".',
  },
  {
    buggy: 'HR asked the staff to no install unauthorized apps.',
    correct: 'not to install',
    hint: 'Place "not" before "to", not after.',
  },
  {
    buggy: 'The admin told us to not use public Wi-Fi.',
    correct: 'not to use',
    hint: 'Correct order: not + to + verb.',
  },
];

// Normalize a string for comparison (lowercase, collapse spaces, strip punctuation)
const normalize = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]+$/g, '');

// Check if the player's answer matches the expected correction
export const validateBugFix = (userAnswer, correctAnswer) => {
  if (!userAnswer) return false;
  return normalize(userAnswer) === normalize(correctAnswer);
};