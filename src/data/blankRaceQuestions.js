// Each question has a sentence with blanks. Players must fill in each blank.
// Based on the PDF's Exercise 5: "Fill in the blanks."

export const BLANK_RACE_QUESTIONS = [
  {
    template: 'The CEO ___ us ___ waste any of the budget.',
    blanks: ['asked', 'not to'],
    hint: 'Use "ask + person + not to + verb"',
  },
  {
    template: 'The DevOps lead ___ me ___ commit code without a review.',
    blanks: ['told', 'not to'],
    hint: 'Use "tell + person + not to + verb"',
  },
  {
    template: 'Personally, I ___ have to work on weekends ever again.',
    blanks: ['would like not to'],
    hint: 'would like + not + to + verb',
  },
  {
    template: 'She ___ the team ___ share the API key.',
    blanks: ['told', 'not to'],
    hint: 'tell + person + not to + verb',
  },
  {
    template: 'Security ___ everyone ___ write passwords on paper.',
    blanks: ['told', 'not to'],
    hint: 'tell + person + not to + verb',
  },
  {
    template: 'The admin ___ us ___ use public Wi-Fi.',
    blanks: ['asked', 'not to'],
    hint: 'ask + person + not to + verb',
  },
  {
    template: 'We ___ use the old firewall anymore.',
    blanks: ['would like not to'],
    hint: 'would like + not + to + verb',
  },
  {
    template: 'HR ___ the staff ___ install unauthorized apps.',
    blanks: ['told', 'not to'],
    hint: 'tell + person + not to + verb',
  },
];

// Normalize for comparison
const normalize = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]+$/g, '');

// Validate a single blank
export const validateBlank = (userAnswer, correctAnswer) => {
  if (!userAnswer) return false;
  return normalize(userAnswer) === normalize(correctAnswer);
};

// Validate the entire submission: all blanks must be correct
export const validateAllBlanks = (userAnswers, correctBlanks) => {
  if (!userAnswers || userAnswers.length !== correctBlanks.length) return false;
  return userAnswers.every((ua, i) => validateBlank(ua, correctBlanks[i]));
};