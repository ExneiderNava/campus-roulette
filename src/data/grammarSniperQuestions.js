// Multiple-choice questions. Players pick the correct structure.
// Based on the PDF's Exercise 3: "Choose the correct grammatical structure."

export const GRAMMAR_SNIPER_QUESTIONS = [
  {
    prompt: 'I asked him ___ reboot the router.',
    options: ['to not', 'not to', 'not too'],
    correctIndex: 1,
    hint: 'not + to + verb',
  },
  {
    prompt: 'She would like ___ disturbed during the sprint.',
    options: ['not to be', 'to not be', 'no to be'],
    correctIndex: 0,
    hint: 'would like + not + to + verb',
  },
  {
    prompt: 'They told me ___ the VPN link.',
    options: ['not sharing', 'not to share', 'to not share'],
    correctIndex: 1,
    hint: 'told + person + not to + verb',
  },
  {
    prompt: 'Who asked you ___ the firmware?',
    options: ['not to update', 'to not update', 'no to update'],
    correctIndex: 0,
    hint: 'ask + person + not to + verb',
  },
  {
    prompt: 'I would like ___ too much on cloud hosting.',
    options: ['not to spend', 'no to spend', 'to not spend'],
    correctIndex: 0,
    hint: 'would like + not + to + verb',
  },
  {
    prompt: 'The admin asked us ___ public Wi-Fi.',
    options: ['to not use', 'not to use', 'not using'],
    correctIndex: 1,
    hint: 'ask + person + not to + verb',
  },
  {
    prompt: 'Security told the team ___ passwords on paper.',
    options: ['not to write', 'to not write', 'no writing'],
    correctIndex: 0,
    hint: 'tell + person + not to + verb',
  },
  {
    prompt: 'We would like ___ the old firewall anymore.',
    options: ['not to use', 'no to use', 'to not use'],
    correctIndex: 0,
    hint: 'would like + not + to + verb',
  },
];

// Validates whether a chosen index is correct
export const isCorrectChoice = (question, index) =>
  question && index === question.correctIndex;